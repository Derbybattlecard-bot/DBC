// js/race_calculator.js

// --- 対象馬のチェック用ヘルパー関数 ---
function isEligibleForAbility(horse) {
  return !!(horse.isPlayer || horse.isCpu);
}

// 全ステータス（スピード、スタミナ、瞬発、持続、根性、ポテンシャル）にバフを適用する共通関数
function applyAllStatsBuff(horse, buffValue) {
  horse.speed = (horse.speed || 0) + buffValue;
  horse.stamina = (horse.stamina || 0) + buffValue;
  horse.sharp = (horse.sharp || 0) + buffValue;
  horse.jizoku = (horse.jizoku || 0) + buffValue;
  horse.guts = (horse.guts || 0) + buffValue;
  horse.current_potential = (horse.current_potential || 0) + buffValue;
  horse.ability_buff = (horse.ability_buff || 0) + buffValue;
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

// Phase 1: 競馬場・馬場・距離・枠順などの条件に基づく基礎パラメータ増減および芝ダート初期化
function applyPhase1Abilities(horse, raceInfo, trackCondition) {
  if (!isEligibleForAbility(horse)) return;

  // 1. 芝・ダートポテンシャル判定と補正
  const isTurf = raceInfo?.surface !== "ダート";
  const turfPot = horse.turf_potential ?? horse.potential ?? 0;
  const dirtPot = horse.dirt_potential ?? horse.potential ?? 0;
  horse.current_potential = isTurf ? turfPot : dirtPot;

  if (!isTurf && dirtPot > turfPot) {
    const potDiff = dirtPot - turfPot;
    applyAllStatsBuff(horse, potDiff);
  }

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
    if (abilityName === "アメリカンドリーム") buff = 1; // （旧：プライドビギン）

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
    if (abilityName === "大外大歓迎" && (horse.gate_number === 8 || horse.gate_number === 16)) buff = 2;
    if (abilityName === "ゲートパカ") {
      if (horse.gate_number % 2 === 1) buff = -1; // 奇数枠はマイナス1
      else if (horse.gate_number % 2 === 0) buff = 1; // 偶数枠はプラス1
    }

    // バフ適用
    if (buff !== 0) {
      applyAllStatsBuff(horse, buff);
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

// Phase 3: 位置順位確定後の位置判定・単騎/大逃げ等条件アビリティの適用
function applyPhase3Abilities(resultList, leadCount) {
  if (resultList.length === 0) return;

  const firstHorse = resultList.find(h => h.positionRank === 1);
  const secondHorse = resultList.find(h => h.positionRank === 2);

  if (!firstHorse || !isEligibleForAbility(firstHorse)) return;
  if (!firstHorse.ability || !Array.isArray(firstHorse.ability)) return;

  firstHorse.activated_abilities = firstHorse.activated_abilities || [];

  firstHorse.ability.forEach(abilityName => {
    // ロケットスタート（先頭逃げ時の全パラ+1）
    if (abilityName === "ロケットスタート") {
      applyAllStatsBuff(firstHorse, 1);
    }

    // 大逃亡（2番手に位置取りPtで20差以上つけて先頭時、全パラ+2）
    if (abilityName === "大逃亡") {
      const secondPt = secondHorse ? secondHorse.positionPoint : 0;
      if ((firstHorse.positionPoint - secondPt) >= 20) {
        applyAllStatsBuff(firstHorse, 2);
        if (!firstHorse.activated_abilities.includes(abilityName)) {
          firstHorse.activated_abilities.push(abilityName);
        }
      }
    }

    // 1人旅（単騎で逃げられた時に全パラ+2）
    if (abilityName === "1人旅" || abilityName === "一人旅") {
      if (leadCount === 1) {
        applyAllStatsBuff(firstHorse, 2);
        if (!firstHorse.activated_abilities.includes(abilityName)) {
          firstHorse.activated_abilities.push(abilityName);
        }
      }
    }
  });
}

// Phase 4: 最終スコアへの展開依存ボーナス
function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0;
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  horse.ability.forEach(abilityName => {
    let triggered = false;
    // まくり系・電光石火（前残り展開で+10）
    if ((abilityName === "電光石火" || abilityName === "衝撃のまくり" || abilityName === "異次元のまくり" || abilityName === "怒涛のまくり") && branchName.includes("前残り")) {
      extraScore += 10;
      triggered = true;
    }
    // 王道・絶対王者（乱ペースで+10）
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
  // 逃げ馬の頭数を事前カウント（Phase 3の1人旅判定用）
  const leadCount = horses.filter(h => {
    const style = h.style || h.running_style || "";
    const tactic = h.tactic || "";
    return style === "逃げ" || tactic.includes("逃げ") || tactic === "ハナにこだわる";
  }).length;

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

  // 1.5 位置順位・先頭条件アビリティ（ロケットスタート追加・大逃亡・1人旅）の適用
  applyPhase3Abilities(resultList, leadCount);

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

  // 4. スコア計算＆内訳テキスト（detailText）生成
  const fieldSize = resultList.length || 16;
  resultList.forEach((h) => {
    let statScore = 0;
    let detailParts = [];
    let styleBonusPt = 0;
    let posAddPt = 0;

    // --- A. 能力値計算 ---
    if (selectedBranch.formula) {
      const pot = h.current_potential || h.potential || 50;
      let targetVal = 50;
      if (selectedBranch.target_pool && selectedBranch.target_pool.length > 0) {
        const randomKey = selectedBranch.target_pool[Math.floor(Math.random() * selectedBranch.target_pool.length)];
        targetVal = (h[randomKey] || 50) + (h[`strat_${randomKey}`] || 0);
      }
      statScore = 30 - pot + targetVal;
      detailParts.push(`特殊算定:${statScore}`);
    } 
    else if (selectedBranch.key_stats && selectedBranch.key_stats.length > 0) {
      selectedBranch.key_stats.forEach(key => {
        const horseStat = (key === "potential" || key === "current_potential") 
          ? (h.current_potential || h.potential || 50) 
          : (h[key] || 50);
        const stratStat = h[`strat_${key}`] || 0;
        const totalStat = horseStat + stratStat;
        
        statScore += totalStat;

        // ステータス表示名マッピング
        let statNameJa = key;
        if (key === 'speed') statNameJa = 'SPD';
        else if (key === 'stamina') statNameJa = 'STM';
        else if (key === 'sharp') statNameJa = '瞬発';
        else if (key === 'jizoku') statNameJa = '持続';
        else if (key === 'guts') statNameJa = '根性';
        else if (key === 'potential' || key === 'current_potential') statNameJa = 'ポテ';

        detailParts.push(`${statNameJa}:${totalStat}(馬${horseStat}+作${stratStat})`);
      });
    } else {
      const spd = h.speed || 50;
      const stm = h.stamina || 50;
      statScore = spd + stm;
      detailParts.push(`SPD+STM:${statScore}`);
    }

    // --- B. 脚質ボーナス判定 ---
    if (selectedBranch.style_bonus) {
      const style = h.style || h.running_style || "";
      const tactic = h.tactic || "";
      styleBonusPt = selectedBranch.style_bonus[style] || selectedBranch.style_bonus[tactic] || 0;
      statScore += styleBonusPt;
    }

    // --- C. 位置順位ダイレクトボーナス判定 ---
    if (selectedBranch.position_bonus_type === "direct_asc") {
      posAddPt = h.positionRank;
      statScore += posAddPt;
    } else if (selectedBranch.position_bonus_type === "direct_desc") {
      posAddPt = fieldSize + 1 - h.positionRank;
      statScore += posAddPt;
    }

    // --- D. Phase 4 アビリティ適用 ---
    let extraScore = applyPhase4Abilities(h, selectedPace, selectedBranch.name);

    let levelBonus = (h.level || 1) * 2;
    let randomBonus = Math.random() * 10;

    h.posScore = h.positionPoint;
    h.branchScore = extraScore;
    h.levelScore = levelBonus;
    h.randScore = randomBonus;

    // 最終スコア算出
    h.finalScore = statScore + h.positionPoint + extraScore + levelBonus + randomBonus;

    // --- E. 内訳テキスト（detailText）構築 ---
    const baseParamScore = statScore - posAddPt - styleBonusPt;
    const statDetailStr = detailParts.join(" + ");

    let detailPartsList = [];
    if (detailParts.length > 0) {
      detailPartsList.push(`【能力算定】${statDetailStr} = ${baseParamScore}pt`);
    } else {
      detailPartsList.push(`【能力算定】${baseParamScore}pt`);
    }

    if (styleBonusPt > 0) {
      detailPartsList.push(`【脚質ボーナス】+${styleBonusPt}pt`);
    }
    if (posAddPt > 0) {
      detailPartsList.push(`【展開位置ボーナス】+${posAddPt}pt`);
    }
    if (h.positionPoint > 0) {
      detailPartsList.push(`【位置取りPt】+${h.positionPoint}pt`);
    }
    if (extraScore > 0) {
      detailPartsList.push(`【展開アビリティ】+${extraScore}pt`);
    }
    if (h.ability_buff && h.ability_buff > 0) {
      detailPartsList.push(`【基礎バフ】+${h.ability_buff}pt`);
    }

    detailPartsList.push(`【Lv補正】+${levelBonus}pt`);
    detailPartsList.push(`【乱数】+${randomBonus.toFixed(1)}`);

    // オブジェクトに内訳文字列を持たせる
    h.detailText = detailPartsList.join(" ｜ ");
  });

  // 5. 最終スコア順にソート
  resultList.sort((a, b) => b.finalScore - a.finalScore);

  return {
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch
  };
}
