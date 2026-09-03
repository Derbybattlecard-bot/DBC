// js/race_calculator.js

// 1. ステータス箱の生成（計算専用コピー）
function createRaceHorseInstance(horse, raceInfo) {
  const instance = JSON.parse(JSON.stringify(horse));
  const isTurf = raceInfo?.surface === '芝';
  instance.current_potential = isTurf 
    ? (horse.turf_potential || horse.potential) 
    : (horse.dirt_potential || horse.potential);

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
      detailParts.push(`(30-ポテンシャル:${potVal})`);
      detailParts.push(`${randStatKey}:${totalStat}`);
    } 
    // --- B. 標準・キー能力算定 ---
    else if (selectedBranch.key_stats) {
      selectedBranch.key_stats.forEach(key => {
        // 位置ポイント判定
        if (key === "position" || key === "position_x2") {
          let posScore = h.positionScore; // 基本: 先頭=16pt 〜 最後方=1pt

          // 位置補正タイプの処理
          if (selectedBranch.position_bonus_type === "direct_asc") {
            // ダイレクト昇順（先頭=1pt, 5番手=5pt, 16番手=16pt）
            posScore = h.positionRank;
          } else if (selectedBranch.position_bonus_type === "direct_desc") {
            // ダイレクト降順（先頭=16pt ...）
            posScore = 17 - h.positionRank;
          } else {
            // 従来互換
            if (selectedBranch.name.includes("前崩れ")) posScore = 17 - h.positionScore;
            else if (selectedBranch.name.includes("前残り")) posScore = h.positionScore;
          }

          const multiplier = (key === "position_x2") ? 2 : 1;
          posAddPt = posScore * multiplier;

          paramScore += posAddPt;
          detailParts.push(`位置:${posAddPt}`);
        } 
        else if (key === "potential" || key === "current_potential") {
          const val = h.current_potential || h.potential || 0;
          paramScore += val;
          detailParts.push(`ポテンシャル:${val}`);
        } 
        else if (key === "guts_x2") {
          const horseGuts = h.guts || 0;
          const stratGuts = h.strat_guts || 0;
          const gutsTotal = horseGuts + (stratGuts * 2);

          paramScore += gutsTotal;
          detailParts.push(`根性(馬:${horseGuts}+作x2:${stratGuts * 2})`);
        } 
        else {
          const horseStat = h[key] || 0;
          const stratStat = h[`strat_${key}`] || 0;
          const totalStat = horseStat + stratStat;

          paramScore += totalStat;
          detailParts.push(`${key}(馬:${horseStat}+作:${stratStat})`);
        }
      });
    }

    // --- C. 脚質ボーナス (style_bonus) 加算 ---
    if (selectedBranch.style_bonus) {
      const currentStyle = h.style || h.running_style || h.tactic || "";
      if (selectedBranch.style_bonus[currentStyle]) {
        styleBonusPt = selectedBranch.style_bonus[currentStyle];
        paramScore += styleBonusPt;
        detailParts.push(`脚質[${currentStyle}]:+${styleBonusPt}`);
      }
    }

    const levelScore = (h.level || 1) * 2;
    const randScore = Math.random() * 5;

    h.random_diff = randScore;
    h.finalScore = paramScore + randScore + levelScore;

    const statDetailStr = detailParts.join("+");
    if (posAddPt > 0) {
      h.detailText = `位置:${posAddPt} + 展開:${paramScore - posAddPt}[${statDetailStr}] + Lv:${levelScore} + 乱:${randScore.toFixed(1)}`;
    } else {
      h.detailText = `展開:${paramScore}[${statDetailStr}] + Lv:${levelScore} + 乱:${randScore.toFixed(1)}`;
    }
  });

  // タイブレーク処理
  const tieKeys = raceMasterData.tie_breakers || ['speed', 'stamina', 'guts'];
  horses.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.1) return b.finalScore - a.finalScore;
    
    for (let tieKey of tieKeys) {
      let key = tieKey.replace(/^[0-9]+\.\s*/, '').replace(/\s*\([a-z_]+\)/, '').trim();
      if (tieKey.includes('(guts)')) key = 'guts';
      else if (tieKey.includes('(potential)')) key = 'potential';
      else if (tieKey.includes('(tactic_level)')) key = 'level';
      else if (tieKey.includes('(sharp)')) key = 'sharp';
      else if (tieKey.includes('(jizoku)')) key = 'jizoku';
      else if (tieKey.includes('(speed)')) key = 'speed';
      else if (tieKey.includes('(stamina)')) key = 'stamina';

      if (a[key] !== undefined && b[key] !== undefined && a[key] !== b[key]) {
        return typeof a[key] === "number" ? b[key] - a[key] : String(b[key]).localeCompare(String(a[key]));
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
