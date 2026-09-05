// js/race_calculator.js

// --- 対象馬のチェック用ヘルパー関数 ---
function isEligibleForAbility(horse) {
  // 自分の馬(isPlayer) または CPU馬(isCpu) のみ対象（モブ馬は除外）
  return !!(horse.isPlayer || horse.isCpu);
}

// Phase 1: 競馬場・馬場・距離などの条件に基づく基礎パラメータ増減
function applyPhase1Abilities(horse, raceInfo, trackCondition) {
  if (!isEligibleForAbility(horse)) return; // モブ馬はスキップ
  if (!horse.ability || !Array.isArray(horse.ability)) return;

  horse.activated_abilities = horse.activated_abilities || [];

  horse.ability.forEach(abilityName => {
    let buff = 0;

    // 【競馬場・コース系】
    if (abilityName === "中山マイスター" && raceInfo?.track === "中山") buff = 1;
    if (abilityName === "府中の鬼" && raceInfo?.track === "東京") buff = 1;
    if (abilityName === "淀の千両役者" && raceInfo?.track === "京都") buff = 1;
    if (abilityName === "仁川の猛者" && raceInfo?.track === "阪神") buff = 1;
    if (abilityName === "越後の大吟醸" && raceInfo?.track === "新潟") buff = 1;
    if (abilityName === "尾張の芸達者" && raceInfo?.track === "中京") buff = 1;
    if (abilityName === "小倉の舞台荒らし" && raceInfo?.track === "小倉") buff = 1;
    if (abilityName === "小倉百戦錬磨" && raceInfo?.track === "小倉") buff = 1;
    if (abilityName === "札幌の看板役者" && raceInfo?.track === "札幌") buff = 1;
    if (abilityName === "函館ひと芝居" && raceInfo?.track === "函館") buff = 1;
    if (abilityName === "地方無双" && ["大井","川崎","船橋","浦和","盛岡","園田","高知","笠松","門別"].includes(raceInfo?.track)) buff = 1;

    // 【距離系】
    if (abilityName === "スピードスター" && raceInfo?.distance === 1200) buff = 1;
    if (abilityName === "オイラはマイラー" && raceInfo?.distance === 1600) buff = 1;
    if (abilityName === "体力オバケ" && raceInfo?.distance === 3200) buff = 1;

    // 【馬場状態系】
    if (abilityName === "道悪帝王") {
      if (trackCondition === "稍重") buff = 1;
      else if (trackCondition === "重" || trackCondition === "不良") buff = 2;
    }

    // 【枠・馬番系】
    if (abilityName === "最内一閃" && horse.gate_number === 1) buff = 2;
    if (abilityName === "大外大歓迎" && horse.gate_number === 8) buff = 2; 

    // バフ適用
    if (buff !== 0) {
      horse.speed = (horse.speed || 0) + buff;
      horse.stamina = (horse.stamina || 0) + buff;
      horse.sharp = (horse.sharp || 0) + buff;
      horse.jizoku = (horse.jizoku || 0) + buff;
      horse.guts = (horse.guts || 0) + buff;
      horse.current_potential = (horse.current_potential || 0) + buff;
      
      horse.ability_buff = (horse.ability_buff || 0) + buff;

      // 発動したアビリティ名を記憶
      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }
  });
}

// Phase 2: 位置取りスコア等へのボーナス
function applyPhase2Abilities(horse, positionPoint) {
  if (!isEligibleForAbility(horse)) return positionPoint; // モブ馬はスキップ
  if (!horse.ability || !Array.isArray(horse.ability)) return positionPoint;
  
  horse.activated_abilities = horse.activated_abilities || [];
  let newPoint = positionPoint;

  horse.ability.forEach(abilityName => {
    if (abilityName === "ロケットスタート") {
      newPoint += 20;
      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }
  });
  return newPoint;
}

// Phase 4: 最終スコアへの展開依存ボーナス
function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0; // モブ馬はスキップ
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  horse.ability.forEach(abilityName => {
    let triggered = false;
    if ((abilityName === "電光石火" || abilityName === "衝撃の捲り" || abilityName === "異次元の捲り" || abilityName === "怒涛の捲り") && branchName.includes("前残り")) {
      extraScore += 10;
      triggered = true;
    }
    if ((abilityName === "王道" || abilityName === "絶対王者") && pace.includes("乱ペース")) {
      extraScore += 10;
      triggered = true;
    }

    if (triggered && !horse.activated_abilities.includes(abilityName)) {
      horse.activated_abilities.push(abilityName);
    }
  });
  return extraScore;
}

// --- メイン計算エクスポート関数 ---
export function runRaceLogic(horses, raceMaster, trackCondition = "良", raceInfo = null) {
  const resultList = horses.map((h, i) => {
    const copy = { ...h, index: i, activated_abilities: [] };
    // Phase 1 アビリティ適用
    applyPhase1Abilities(copy, raceInfo, trackCondition);
    return copy;
  });

  // 1. ペース・展開判定
  const paceOptions = ["ハイペース", "ミドルペース", "スローペース", "超ハイペース"];
  const selectedPace = paceOptions[Math.floor(Math.random() * paceOptions.length)];

  const branchOptions = [
    { name: "前残り展開", formula: "スピード ＋ 瞬発", key_stats: ["speed", "sharp"] },
    { name: "差し・追込決着", formula: "瞬発 ＋ 持続", key_stats: ["sharp", "jizoku"] },
    { name: "底力勝負", formula: "スタミナ ＋ 根性", key_stats: ["stamina", "guts"] },
    { name: "総合力勝負", formula: "ポテンシャル ＋ スピード ＋ スタミナ", key_stats: ["potential", "speed", "stamina"] }
  ];
  const selectedBranch = branchOptions[Math.floor(Math.random() * branchOptions.length)];

  // 2. スコア計算
  resultList.forEach((h) => {
    // 位置取りポイント算定
    let basePos = Math.floor(Math.random() * 30) + 50;
    let posPt = applyPhase2Abilities(h, basePos);
    h.positionPoint = posPt;

    // ステータス加算
    let statScore = 0;
    if (selectedBranch.key_stats) {
      selectedBranch.key_stats.forEach(key => {
        statScore += (h[key] || 50) + (h[`strat_${key}`] || 0);
      });
    } else {
      statScore = (h.speed || 50) + (h.stamina || 50);
    }

    // Phase 4 アビリティ適用
    let extraScore = applyPhase4Abilities(h, selectedPace, selectedBranch.name);

    let levelBonus = (h.level || 1) * 2;
    let randomBonus = Math.random() * 10;

    h.posScore = posPt;
    h.branchScore = extraScore;
    h.levelScore = levelBonus;
    h.randScore = randomBonus;

    h.finalScore = statScore + posPt + extraScore + levelBonus + randomBonus;
  });

  // 位置取り順位付け
  const posSorted = [...resultList].sort((a, b) => b.positionPoint - a.positionPoint);
  posSorted.forEach((h, rank) => {
    const target = resultList.find(item => item.index === h.index);
    if (target) target.positionRank = rank + 1;
  });

  // 最終スコア順にソート
  resultList.sort((a, b) => b.finalScore - a.finalScore);

  return {
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch
  };
}
