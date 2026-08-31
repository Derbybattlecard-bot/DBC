// js/race_calculator.js

// 1. レース専用「ステータス箱」の生成
function createRaceHorseInstance(horse, raceInfo) {
  const instance = JSON.parse(JSON.stringify(horse));
  const isTurf = raceInfo?.surface === '芝';
  
  // 馬場適性に応じたポテンシャル値
  instance.current_potential = isTurf 
    ? (horse.turf_potential || horse.potential) 
    : (horse.dirt_potential || horse.potential);

  // 作戦・レベル補正の計算
  const levelVal = horse.level || 1;
  const matchedStrat = horse.stratObj;
  
  instance.strat_speed = (matchedStrat ? matchedStrat.speed : 3) + levelVal;
  instance.strat_stamina = (matchedStrat ? matchedStrat.stamina : 3) + levelVal;
  instance.strat_sharp = (matchedStrat ? matchedStrat.sharp : 3) + levelVal;
  instance.strat_jizoku = (matchedStrat ? matchedStrat.jizoku : 3) + levelVal;
  instance.strat_guts = (matchedStrat ? matchedStrat.guts : 3) + levelVal;

  return instance;
}

// 2. 位置取り計算（HTMLから移植）
function calculatePositions(horses) {
  horses.forEach(h => {
    let basePos = 1;
    if (h.strategy === '逃げ') basePos = 90;
    else if (h.strategy === '先行') basePos = 70;
    else if (h.strategy === '差し') basePos = 40;
    else if (h.strategy === '追込') basePos = 15;

    const rand = Math.floor(Math.random() * 10) - 5;
    h.positionPt = Math.max(1, basePos + rand);
  });
}

// 3. ペース決定（HTMLから移植）
function determineRacePace(horses, raceMasterData, trackCondition) {
  const nigeCount = horses.filter(h => h.strategy === '逃げ').length;
  const senkoCount = horses.filter(h => h.strategy === '先行').length;

  if (nigeCount >= 3 || (nigeCount >= 2 && senkoCount >= 4)) {
    return 'ハイペース';
  } else if (nigeCount === 0 && senkoCount <= 2) {
    return 'スローペース';
  }
  return 'ミドルペース';
}

// 4. 着順スコア計算（HTMLから移植）
function calculateScoresAndSort(horses, pace, raceMasterData) {
  horses.forEach(h => {
    let score = h.current_potential * 1.5;

    // パラメータ補正
    score += h.strat_speed * 2.0;
    score += h.strat_stamina * 1.5;
    score += h.strat_sharp * 1.2;
    score += h.strat_jizoku * 1.2;
    score += h.strat_guts * 1.0;

    // ペース補正
    if (pace === 'ハイペース') {
      if (h.strategy === '差し' || h.strategy === '追込') score += 5;
      if (h.strategy === '逃げ') score -= 5;
    } else if (pace === 'スローペース') {
      if (h.strategy === '逃げ' || h.strategy === '先行') score += 5;
      if (h.strategy === '追込') score -= 5;
    }

    // 乱数要素（展開・運）
    score += (Math.random() * 10 - 5);

    h.finalScore = Math.round(score * 10) / 10;
  });

  // スコア順にソートして着順付与
  horses.sort((a, b) => b.finalScore - a.finalScore);
  horses.forEach((h, index) => {
    h.rank = index + 1;
  });

  return horses;
}

// 5. 外部から呼び出すメイン関数
export function runRaceLogic(activeHorses, raceMasterData, trackCondition, raceInfo) {
  // ① 計算専用の箱を作成
  const raceHorses = activeHorses.map(h => createRaceHorseInstance(h, raceInfo));

  // ② 位置取り・ペース・着順を順次計算
  calculatePositions(raceHorses);
  const currentPace = determineRacePace(raceHorses, raceMasterData, trackCondition);
  const calculatedResults = calculateScoresAndSort(raceHorses, currentPace, raceMasterData);

  return {
    results: calculatedResults,
    pace: currentPace
  };
}
