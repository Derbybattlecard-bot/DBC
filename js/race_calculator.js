// js/race_calculator.js

// --- 対象馬のチェック用ヘルパー関数 ---
function isEligibleForAbility(horse) {
  return !!(horse.isPlayer || horse.isCpu);
}

// 確率オブジェクトに基づく重み付け抽選
function weightedRandomSelect(probObj) {
  if (!probObj) return "ミドルペース";
  const keys = Object.keys(probObj);
  const rand = Math.random();
  let cumulative = 0;
  for (const key of keys) {
    cumulative += probObj[key];
    if (rand <= cumulative) {
      return key;
    }
  }
  return keys[keys.length - 1] || "ミドルペース";
}

// race_master.json の pace_decision_master に基づいてペースを判定
function determinePace(horses, raceMaster, trackCondition) {
  const paceMaster = raceMaster?.pace_decision_master;
  if (!paceMaster) return "ミドルペース";

  // 馬場判定（重・不良 / 良・稍重）
  const isHeavy = (trackCondition === "重" || trackCondition === "不良");
  const condMaster = isHeavy ? paceMaster.heavy_or_bad : paceMaster.good_or_slightly_heavy;
  if (!condMaster) return "ミドルペース";

  // 逃げ馬（脚質または作戦が逃げ系）の頭数をカウント
  const leadHorses = horses.filter(h => {
    const style = h.style || h.running_style || "";
    const tactic = h.tactic || "";
    return style === "逃げ" || tactic.includes("逃げ") || tactic === "ハナにこだわる";
  });

  const leadCount = leadHorses.length;
  let probObj = null;

  if (leadCount === 0) {
    probObj = { "スローペース": 0.5, "ミドルペース": 0.5 };
  } else if (leadCount === 1) {
    const leadStrat = leadHorses[0].tactic || "平均ラップ逃げ";
    const map = condMaster["1_horse"]?.by_strategy;
    probObj = map ? (map[leadStrat] || map["平均ラップ逃げ"]) : null;
  } else if (leadCount === 2) {
    const leadStrat = leadHorses[0].tactic || "平均ラップ逃げ";
    const map = condMaster["2_horses"]?.by_lead_horse_strategy;
    probObj = map ? (map[leadStrat] || map["other"]) : null;
  } else if (leadCount === 3) {
    probObj = condMaster["3_horses"]?.probabilities;
  } else if (leadCount === 4) {
    probObj = condMaster["4_horses"]?.probabilities;
  } else {
    probObj = condMaster["5_or_more_horses"]?.probabilities;
  }

  return weightedRandomSelect(probObj);
}

// Phase 1: 競馬場・馬場・距離などの条件に基づく基礎パラメータ増減
function applyPhase1Abilities(horse, raceInfo, trackCondition) {
  if (!isEligibleForAbility(horse)) return;
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

      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }
  });
}

// Phase 2: 位置取りスコア等へのボーナス
function applyPhase2Abilities(horse, positionPoint) {
  if (!isEligibleForAbility(horse)) return positionPoint;
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
  if (!isEligibleForAbility(horse)) return 0;
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
    applyPhase1Abilities(copy, raceInfo, trackCondition);
    return copy;
  });

  // 1. 位置取りポイント算定 ＆ 位置順位確定
  resultList.forEach((h) => {
    let basePos = Math.floor(Math.random() * 30) + 50;
    h.positionPoint = applyPhase2Abilities(h, basePos);
  });

  const posSorted = [...resultList].sort((a, b) => b.positionPoint - a.positionPoint);
  posSorted.forEach((h, rank) => {
    const target = resultList.find(item => item.index === h.index);
    if (target) target.positionRank = rank + 1;
  });

  // 2. レースマスター（pace_decision_master）からペースを抽選
  const selectedPace = determinePace(resultList, raceMaster, trackCondition);

  // 3. レースマスター（branches_by_pace）から対応する展開を抽選
  let availableBranches = raceMaster?.branches_by_pace?.[selectedPace];
  if (!availableBranches || availableBranches.length === 0) {
    availableBranches = [{
      name: "総合力勝負",
      key_stats: ["potential", "speed", "stamina"]
    }];
  }
  const selectedBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];

  // 4. スコア計算
  const fieldSize = resultList.length || 16;
  resultList.forEach((h) => {
    let statScore = 0;

    // 特殊計算（「波乱の展開」などの formula 指定がある場合）
    if (selectedBranch.formula) {
      const pot = h.potential || 50;
      let targetVal = 50;
      if (selectedBranch.target_pool && selectedBranch.target_pool.length > 0) {
        const randomKey = selectedBranch.target_pool[Math.floor(Math.random() * selectedBranch.target_pool.length)];
        targetVal = (h[randomKey] || 50) + (h[`strat_${randomKey}`] || 0);
      }
      statScore = 30 - pot + targetVal;
    } 
    // key_stats に基づく基本能力加算
    else if (selectedBranch.key_stats && selectedBranch.key_stats.length > 0) {
      selectedBranch.key_stats.forEach(key => {
        statScore += (h[key] || 50) + (h[`strat_${key}`] || 0);
      });
    } else {
      statScore = (h.speed || 50) + (h.stamina || 50);
    }

    // 脚質ボーナス判定
    if (selectedBranch.style_bonus) {
      const style = h.style || h.running_style || "";
      const tactic = h.tactic || "";
      const bonus = selectedBranch.style_bonus[style] || selectedBranch.style_bonus[tactic] || 0;
      statScore += bonus;
    }

    // 位置順位ダイレクトボーナス判定
    if (selectedBranch.position_bonus_type === "direct_asc") {
      statScore += h.positionRank;
    } else if (selectedBranch.position_bonus_type === "direct_desc") {
      statScore += (fieldSize + 1 - h.positionRank);
    }

    // Phase 4 アビリティ適用
    let extraScore = applyPhase4Abilities(h, selectedPace, selectedBranch.name);

    let levelBonus = (h.level || 1) * 2;
    let randomBonus = Math.random() * 10;

    h.posScore = h.positionPoint;
    h.branchScore = extraScore;
    h.levelScore = levelBonus;
    h.randScore = randomBonus;

    h.finalScore = statScore + h.positionPoint + extraScore + levelBonus + randomBonus;
  });

  // 5. 最終スコア順にソート
  resultList.sort((a, b) => b.finalScore - a.finalScore);

  return {
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch
  };
}
