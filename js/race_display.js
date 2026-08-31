// js/race_display.js

// 1. X座標補正
function calculateActualX(posPercent, dir) {
  return (dir === "right_to_left") ? (100 - posPercent) : posPercent;
}

// 2. 馬アイコンの移動アニメーション
export function setPhasePositions(positionsArray, durationSec = 3.0, timing = "linear", currentDir = "left_to_right") {
  const trackContainer = document.getElementById('track-container');
  if (!trackContainer) return;
  const trackWidth = trackContainer.clientWidth - 70;
  
  positionsArray.forEach((pos, i) => {
    const el = document.getElementById(`horse-icon-${i}`);
    const emojiEl = document.getElementById(`emoji-${i}`);
    if (el) {
      el.style.transition = `left ${durationSec}s ${timing}`;
      const actualPos = calculateActualX(pos, currentDir);
      el.style.left = (10 + (trackWidth * (actualPos / 100))) + "px";

      if (emojiEl) {
        if (currentDir === "right_to_left") {
          emojiEl.classList.add("flipped");
        } else {
          emojiEl.classList.remove("flipped");
        }
      }
    }
  });
}

// 3. レーン描画
export function renderLanes(activeHorses) {
  const lanes = document.getElementById('lanes');
  if (!lanes) return;
  lanes.innerHTML = "";
  activeHorses.forEach((h, i) => {
    const nameClass = h.isPlayer ? "p1-name" : (h.isCpu ? "p2-name" : "");
    const name3 = (h.name || '').replace(/[^\u30A0-\u30FF]/g, '').substring(0, 3) || (h.name || '').substring(0, 3);
    lanes.innerHTML += `
      <div class="horse-lane">
        <div class="horse-icon" id="horse-icon-${i}" style="left: 10px;">
          <span class="horse-emoji" id="emoji-${i}">🏇</span><span class="${nameClass}">${name3}</span>
        </div>
      </div>`;
  });
}

// 4. 実況・テロップ制御
export function updateLog(text) { 
  const el = document.getElementById('log-content');
  if (el) el.innerHTML = text; 
}

export function showTelop(text, durationMs = 1500) {
  const telop = document.getElementById('race-telop');
  if (!telop) return;
  telop.innerHTML = text; 
  telop.classList.add('show');
  setTimeout(() => { hideTelop(); }, durationMs);
}

export function hideTelop() { 
  const telop = document.getElementById('race-telop');
  if (telop) telop.classList.remove('show'); 
}

// 5. ゴールライン配置
export function setupGoalLine(trackConfig) {
  const gl = document.getElementById('goal-line');
  const gf = document.getElementById('goal-flag');
  if (!gl || !gf) return;

  gl.style.display = "block";
  gf.style.display = "block";
  
  if (trackConfig.goal_position === "right") {
    gl.style.left = "calc(100% - 60px)";
    gf.style.left = "calc(100% - 40px)";
  } else {
    gl.style.left = "40px";
    gf.style.left = "20px";
  }
}

// 6. メイン演出シーケンス
export function runRaceAnimation(activeHorses, calculatedResults, pace, branch, trackConfig, onComplete) {
  const p1_3_dir = trackConfig.phase1_3_dir;
  const p4_dir = trackConfig.phase4_dir;

  let leaders = activeHorses.filter(h => h.positionRank <= 3).sort((a, b) => a.positionRank - b.positionRank);
  let leaderNames = leaders.map(h => h.name).join("、");
  updateLog(`<strong>【スタート】</strong> ゲートが開いた！ ${leaderNames} あたりが先頭争いだ！`);

  // Phase 1
  let p1Pos = getPosPointsMap(activeHorses, 35, 8);
  setPhasePositions(p1Pos, 4.0, "linear", p1_3_dir); 

  setTimeout(() => {
    let msg = (pace.includes("ハイ")) ? "縦長の隊列になりました。" : "淡々とレースは流れていきます。";
    updateLog(`<strong>【向正面】</strong> ${msg} 各馬ポジションが決まりました。`);
    
    // Phase 2
    let p2Pos = getPosPointsMap(activeHorses, 65, 20);
    setPhasePositions(p2Pos, 4.3, "linear", p1_3_dir); 
  }, 4000); 

  setTimeout(() => {
    updateLog(`<strong>【3コーナーから直線へ】</strong> ペースは『${pace}』！ 勝負どころの最終コーナー！`);
    showTelop(`【ペース】 ${pace}`, 3000);
    
    // Phase 3
    let p3Pos = getPosPointsMap(activeHorses, 88, 35);
    setPhasePositions(p3Pos, 4.3, "linear", p1_3_dir); 
  }, 8300); 

  setTimeout(() => {
    const wipe = document.getElementById('wipe-overlay');
    if (wipe) {
      wipe.style.transition = "left 0.6s cubic-bezier(0.8, 0, 0.2, 1)";
      wipe.style.left = "0";
    }

    setTimeout(() => {
      setupGoalLine(trackConfig);

      // Phase 4 スタート位置
      let p4StartPos = new Array(activeHorses.length);
      activeHorses.forEach((h) => {
        p4StartPos[h.index] = (p4_dir === "left_to_right") ? (10 + Math.random() * 15) : (75 + Math.random() * 15);
      });
      setPhasePositions(p4StartPos, 0, "linear", p4_dir);
    }, 800);

    setTimeout(() => {
      if (wipe) wipe.style.left = "100%"; 

      setTimeout(() => {
        let winner = calculatedResults[0];
        let finalPositions = new Array(activeHorses.length);
        
        calculatedResults.forEach((item, rank) => {
          finalPositions[item.index] = (p4_dir === "left_to_right") ? (95 - (rank * 4.5)) : (5 + (rank * 4.5));
        });
        
        setPhasePositions(finalPositions, 10.0, "linear", p4_dir); 
        
        setTimeout(() => {
          updateLog(`<strong>【最後の直線】</strong> このレースは『${branch.name}』！ 激しい叩き合いだ！`);
          showTelop(`【展開】 ${branch.name}`, 3500);
        }, 1500);
        
        setTimeout(() => {
          updateLog(`<strong>【ゴールイン！】</strong> <br><span style="color:#ffff00;"><b>1着フィニッシュは ${winner.name} ！！</b></span>`);
        }, 7500); 
        
        setTimeout(() => {
          hideTelop();
          if (onComplete) onComplete();
        }, 10500); 
      }, 100);
    }, 1500);
  }, 12600); 
}

// 補助：位置Ptからの比率計算
function getPosPointsMap(horses, leadPos, trailPos) {
  const positions = new Array(horses.length);
  const sorted = [...horses].sort((a, b) => b.positionPoint - a.positionPoint);
  const maxPt = sorted[0].positionPoint;
  const minPt = sorted[sorted.length - 1].positionPoint;
  let range = maxPt - minPt || 1;

  sorted.forEach((h) => {
    const ratio = (h.positionPoint - minPt) / range;
    positions[h.index] = trailPos + ratio * (leadPos - trailPos);
  });
  return positions;
}
