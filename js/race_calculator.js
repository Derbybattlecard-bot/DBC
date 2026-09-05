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
