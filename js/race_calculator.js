ほ// js/race_calculator.js

// 1. ステータス箱の生成（計算専用コピー）
function createRaceHorseInstance(horse, raceInfo) {
  const instance = JSON.parse(JSON.stringify(horse));
  const isTurf = raceInfo?.surface === '芝';

  // 芝・ダートそれぞれのポテンシャル取得
  const turfPot = horse.turf_potential || horse.potential || 0;
  const dirtPot = horse.dirt_potential || horse.potential || 0;

  instance.current_potential = isTurf ? turfPot : dirtPot;

   // ダート出走時、ダートのポテンシャルが芝より高い場合のみ差分を加算
  if (!isTurf) {
    const potDiff = dirtPot - turfPot;
    if (potDiff > 0) {
      instance.speed = (instance.speed || 0) + potDiff;
      instance.stamina = (instance.stamina || 0) + potDiff;
      instance.sharp = (instance.sharp || 0) + potDiff;
      instance.jizoku = (instance.jizoku || 0) + potDiff;
      instance.guts = (instance.guts || 0) + potDiff;
    }
  }


  const levelVal = horse.level || 1;
  const matchedStrat = horse.stratObj;
  
  // 作戦によるステータス加算値（作SPD, 作STM など）
  instance.strat_speed = (matchedStrat ? matchedStrat.speed : 3) + levelVal;
  instance.strat_stamina = (matchedStrat ? matchedStrat.stamina : 3) + levelVal;
  instance.strat_sharp = (matchedStrat ? matchedStrat.sharp : 3) + levelVal;
  instance.strat_jizoku = (matchedStrat ? matchedStrat.jizoku : 3) + levelVal;
  instance.strat_guts = (matchedStrat ? matchedStrat.guts : 3) + levelVal;

  return instance;
}


// 2. 位置取り・隊列計算（1番手〜16番手判定）
function calculatePositions(horses) {
  horses.forEach((h, i) => {
    h.index = i;
    const style = h.style || h.running_style || "自在";

    let basePos = 0;
    if (style === "逃げ") basePos = 90;
    else if (style === "先行") basePos = 70;
    else if (style === "差し") basePos = 40;
    else if (style === "追込") basePos = 20;
    else basePos = 50;

    const randomVal = Math.floor(Math.random() * 15);
    h.positionPoint = basePos + (h.strat_speed || 0) + randomVal;
  });

  const sorted = [...horses].sort((a, b) => b.positionPoint - a.positionPoint);
  sorted.forEach((h, rank) => {
    h.positionRank = rank + 1; // 1番手〜16番手
    h.positionScore = 16 - rank; // 先頭=16pt 〜 最後方=1pt
  });
}

// 3. ペース判定
function determineRacePace(horses, raceMasterData, trackCondition) {
  const isTough = (trackCondition === "重" || trackCondition === "不良");
  const master = isTough 
    ? raceMasterData.pace_decision_master.heavy_or_bad
    : raceMasterData.pace_decision_master.good_or_slightly_heavy;

  const escapeHorses = horses.filter(h => {
    return (h.tactic === "逃げ" || h.style === "逃げ" || h.running_style === "逃げ");
  });

  const escapeCount = escapeHorses.length;
  let table = null;

  if (escapeCount <= 1) {
    const stratName = escapeCount === 1 ? escapeHorses[0].strat_name : "マイペース逃げ";
    table = master["1_horse"].by_strategy[stratName] || master["1_horse"].by_strategy["平均ラップ逃げ"];
  } else if (escapeCount === 2) {
    const stratName = escapeHorses[0].strat_name;
    table = master["2_horses"].by_lead_horse_strategy[stratName] || master["2_horses"].by_lead_horse_strategy["other"];
  } else if (escapeCount === 3) {
    table = master["3_horses"].probabilities;
  } else if (escapeCount === 4) {
    table = master["4_horses"].probabilities;
  } else {
    table = master["5_or_more_horses"].probabilities;
  }

  let rand = Math.random();
  let cumulative = 0;
  for (const [pace, prob] of Object.entries(table)) {
    cumulative += prob;
    if (rand <= cumulative) return pace;
  }
  return "ミドルペース";
}

// 4. スコア計算および着順確定
function calculateScoresAndSort(horses, pace, raceMasterData) {
  const branches = raceMasterData.branches_by_pace[pace];
  const selectedBranch = branches[Math.floor(Math.random() * branches.length)];

  horses.forEach(h => {
    let paramScore = 0;
    let posAddPt = 0;
    let styleBonusPt = 0;
    const detailParts = [];

    // --- A. 特殊計算式（波乱の展開など） ---
    if (selectedBranch.formula === "30 - potential + random_stat_1") {
      const targetPool = selectedBranch.target_pool;
      const randStatKey = targetPool[Math.floor(Math.random() * targetPool.length)];
      const potVal = h.current_potential || h.potential || 50;
      const basePotScore = 30 - potVal;

      const horseStat = h[randStatKey] || 0;
      const stratStat = h[`strat_${randStatKey}`] || 0;
      const totalStat = horseStat + stratStat;

      paramScore = basePotScore + totalStat;
      detailParts.push(`(30-ポテ:${potVal})`);
      
      let statNameJa = randStatKey;
      if (randStatKey === 'speed') statNameJa = 'SPD';
      else if (randStatKey === 'stamina') statNameJa = 'STM';
      else if (randStatKey === 'sharp') statNameJa = '瞬発';
      else if (randStatKey === 'jizoku') statNameJa = '持続';
      else if (randStatKey === 'guts') statNameJa = '根性';
      
      detailParts.push(`${statNameJa}:${totalStat}`);
    } 
       // --- B. 標準・キー能力算定 ---
    else if (selectedBranch.key_stats) {
      selectedBranch.key_stats.forEach(key => {
        if (key === "potential" || key === "current_potential") {
          const val = h.current_potential || h.potential || 0;
          paramScore += val;
          detailParts.push(`ポテ:${val}`);
        } else {
          const horseStat = h[key] || 0;
          const stratStat = h[`strat_${key}`] || 0;
          const totalStat = horseStat + stratStat;

          paramScore += totalStat;
          
          let statNameJa = key;
          if (key === 'speed') statNameJa = 'SPD';
          else if (key === 'stamina') statNameJa = 'STM';
          else if (key === 'sharp') statNameJa = '瞬発';
          else if (key === 'jizoku') statNameJa = '持続';
          else if (key === 'guts') statNameJa = '根性';
          
          detailParts.push(`${statNameJa}:${totalStat}`);
        }
      });
    }

    // ★【追加】力比べの展開時の全馬ベースアップ補正（+70pt）
    if (selectedBranch.name === "力比べの展開") {
      paramScore += 70;
      detailParts.push("力比べ:70");
    }

    // --- C. 位置ボーナス処理（マスター仕様変更に対応） ---


    // --- C. 位置ボーナス処理（マスター仕様変更に対応） ---
    if (selectedBranch.position_bonus_type) {
      if (selectedBranch.position_bonus_type === "direct_asc") {
        // ダイレクト昇順（先頭=1pt, 16番手=16pt -> 差し・追込有利）
        posAddPt = h.positionRank; 
      } else if (selectedBranch.position_bonus_type === "direct_desc") {
        // ダイレクト降順（先頭=16pt, 16番手=1pt -> 逃げ・先行有利）
        posAddPt = 17 - h.positionRank; 
      }
      paramScore += posAddPt;
    }

// --- D. 脚質ボーナス (style_bonus) 加算 ---
if (selectedBranch.style_bonus) {
  // 作戦オブジェクトの脚質(stratObj.style)、または馬に設定された作戦脚質を参照
  const currentStyle = h.stratObj?.style || h.running_style || h.style || "";
  
  if (selectedBranch.style_bonus[currentStyle]) {
    styleBonusPt = selectedBranch.style_bonus[currentStyle];
    paramScore += styleBonusPt;
  }
}


    const levelScore = (h.level || 1) * 2;
    const randScore = Math.random() * 5;

    h.random_diff = randScore;
    h.finalScore = paramScore + randScore + levelScore;

    // --- 詳細テキストの見やすいフォーマット化 ---
    const statDetailStr = detailParts.join("+");
    let scoreBreakdown = `展開:${paramScore - posAddPt - styleBonusPt}[${statDetailStr}]`;
    if (posAddPt > 0) scoreBreakdown = `位置:+${posAddPt} | ${scoreBreakdown}`;
    if (styleBonusPt > 0) scoreBreakdown = `${scoreBreakdown} | 脚質:+${styleBonusPt}`;
    
    h.detailText = `${scoreBreakdown} | Lv:+${levelScore} | 乱:+${randScore.toFixed(1)}`;
  });

  // タイブレーク処理（新規マスター項目の完全対応）
  const tieKeys = raceMasterData.tie_breakers || [];
  horses.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.0001) return b.finalScore - a.finalScore;
    
    for (let tieKey of tieKeys) {
      let key = null;
      if (tieKey.includes('guts')) key = 'guts';
      else if (tieKey.includes('potential')) key = 'potential';
      else if (tieKey.includes('tactic_level')) key = 'level';
      else if (tieKey.includes('sharp')) key = 'sharp';
      else if (tieKey.includes('jizoku')) key = 'jizoku';
      else if (tieKey.includes('speed')) key = 'speed';
      else if (tieKey.includes('stamina')) key = 'stamina';
      else if (tieKey.includes('パワー')) key = 'power';
      else if (tieKey.includes('乱数差')) key = 'random_diff';
      else if (tieKey.includes('ID')) key = 'horse_id';
      else if (tieKey.includes('五十音')) key = 'name';

      if (key && a[key] !== undefined && b[key] !== undefined && a[key] !== b[key]) {
         if (typeof a[key] === "number") {
             return b[key] - a[key]; // 数値は降順（大きい方が勝ち）
         } else {
             // 文字列（ID, 五十音）は昇順（若い・あ行が勝ち）
             return String(a[key]).localeCompare(String(b[key]));
         }
      }
    }
    return 0;
  });

  return {
    results: horses,
    branch: selectedBranch
  };
}

// 5. メイン実行関数
export function runRaceLogic(activeHorses, raceMasterData, trackCondition, raceInfo) {
  const raceHorses = activeHorses.map(h => createRaceHorseInstance(h, raceInfo));

  calculatePositions(raceHorses);
  const currentPace = determineRacePace(raceHorses, raceMasterData, trackCondition);
  const calculationData = calculateScoresAndSort(raceHorses, currentPace, raceMasterData);

  return {
    results: calculationData.results,
    pace: currentPace,
    branch: calculationData.branch
  };
}
