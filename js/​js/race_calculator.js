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

// 2. HTMLから引っ越す計算関数群（そのまま貼り付け）
function calculatePositions(horses) {
  // HTMLにあった calculatePositions の中身
}

function determineRacePace(horses, raceMasterData, trackCondition) {
  // HTMLにあった determineRacePace の中身
}

function calculateScoresAndSort(horses, pace, raceMasterData) {
  // HTMLにあった calculateScoresAndSort の中身
}

// 3. HTMLから呼び出すメイン関数（★exportをつける）
export function runRaceLogic(activeHorses, raceMasterData, trackCondition, raceInfo) {
  // ステータス箱の生成
  const raceHorses = activeHorses.map(h => createRaceHorseInstance(h, raceInfo));

  // 計算の実行
  calculatePositions(raceHorses);
  const currentPace = determineRacePace(raceHorses, raceMasterData, trackCondition);
  const calculatedResults = calculateScoresAndSort(raceHorses, currentPace, raceMasterData);

  return {
    results: calculatedResults,
    pace: currentPace
  };
}
