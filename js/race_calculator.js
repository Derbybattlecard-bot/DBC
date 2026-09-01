// 1. ステータス箱の生成（計算専用コピー）
function createRaceHorseInstance(horse, raceInfo) {
  const instance = JSON.parse(JSON.stringify(horse));
  const isTurf = raceInfo?.surface === '芝';
  instance.current_potential = isTurf 
    ? (horse.turf_potential || horse.potential) 
    : (horse.dirt_potential || horse.potential);

  const levelVal = horse.level || 1;
  const matchedStrat = horse.stratObj;
  
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

  const isFrontCollapse = selectedBranch.name.includes("前崩れ");
  const isFrontHold = selectedBranch.name.includes("前残り");

  horses.forEach(h => {
    let paramScore = 0;
    let posAddPt = 0;
    const detailParts = []; // ステータス内訳記録用

    if (selectedBranch.formula === "30 - potential + random_stat_1") {
      const targetPool = selectedBranch.target_pool;
      const randStatKey = targetPool[Math.floor(Math.random() * targetPool.length)];
      const potVal = h.current_potential || h.potential || 50;
      const basePotScore = 30 - potVal;
      const statVal = h[randStatKey] || h[`strat_${randStatKey}`] || 0;
      
      paramScore = basePotScore + statVal;
      detailParts.push(`(30-ポテンシャル:${potVal})`);
      detailParts.push(`${randStatKey}:${statVal}`);
    } else {
      selectedBranch.key_stats.forEach(key => {
        if (key === "position_x2") {
          let posScore = h.positionScore;
          if (isFrontCollapse) posScore = 17 - h.positionScore;
          else if (isFrontHold) posScore = h.positionScore;

          posAddPt = posScore * 2;
          paramScore += posAddPt;
        } else if (key === "potential" || key === "current_potential") {
          const val = h.current_potential || h.potential || 0;
          paramScore += val;
          detailParts.push(`ポテンシャル:${val}`);
        } else if (key === "guts_x2") {
          const val = (h.strat_guts || h.guts || 0) * 2;
          paramScore += val;
          detailParts.push(`根性x2:${val}`);
        } else {
          // speed, stamina, sharp, jizoku, guts など
          const val = h[`strat_${key}`] !== undefined ? h[`strat_${key}`] : (h[key] || 0);
          paramScore += val;
          detailParts.push(`${key}:${val}`);
        }
      });
    }

    const levelScore = (h.level || 1) * 2;
    const randScore = Math.random() * 10;

    h.random_diff = randScore;
    h.finalScore = paramScore + randScore + levelScore;

    // 内訳表示テキストの構築
    const statDetailStr = detailParts.join("+");
    if (posAddPt > 0) {
      h.detailText = `位置:${posAddPt} + 展開:${paramScore - posAddPt}[${statDetailStr}] + Lv:${levelScore} + 乱:${randScore.toFixed(1)}`;
    } else {
      h.detailText = `展開:${paramScore}[${statDetailStr}] + Lv:${levelScore} + 乱:${randScore.toFixed(1)}`;
    }
  });

  const tieKeys = raceMasterData.tie_breakers || ['speed', 'stamina', 'guts'];
  horses.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.1) return b.finalScore - a.finalScore;
    for (let key of tieKeys) {
      if (a[key] !== b[key]) {
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

// 5. HTMLから呼び出すメイン関数
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
