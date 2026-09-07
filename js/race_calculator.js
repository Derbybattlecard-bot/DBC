// ============================================================================
// js/race_calculator.js
// 競馬シミュレーション・計算エンジンモジュール (特殊アビリティ内蔵版)
// ============================================================================

/**
 * アビリティ発動対象馬かどうか判定するヘルパー
 */
function isEligibleForAbility(horse) {
  return !!(horse.isPlayer || horse.isCpu);
}

/**
 * 全パラメータ増減用の箱（calc_〜）へ一括でバフ（加算/減算）を適用する
 */
function applyAllStatsBuff(horse, buffValue) {
  horse.calc_speed += buffValue;
  horse.calc_stamina += buffValue;
  horse.calc_sharp += buffValue;
  horse.calc_jizoku += buffValue;
  horse.calc_guts += buffValue;
  horse.calc_potential += buffValue;
  horse.ability_buff += buffValue;
}

/**
 * 確率設定オブジェクトに基づく重み付けランダム抽選
 */
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

/**
 * 出走馬の「逃げ」頭数と馬場状態からレースペースを判定する
 */
function determinePace(horses, raceMaster, trackCondition) {
  const paceMaster = raceMaster?.pace_decision_master;
  if (!paceMaster) return "ミドルペース";

  const isHeavy = (trackCondition === "重" || trackCondition === "不良");
  const condMaster = isHeavy ? paceMaster.heavy_or_bad : paceMaster.good_or_slightly_heavy;
  if (!condMaster) return "ミドルペース";

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

/**
 * 【特殊アビリティ】「マーク屋」の作戦コピー処理
 */
function processMarkStrategy(resultList) {
  const player = resultList.find(h => h.isPlayer);
  const cpu = resultList.find(h => h.isCpu);

  resultList.forEach(horse => {
    if (!isEligibleForAbility(horse) || !horse.ability) return;
    if (!horse.ability.includes("マーク屋")) return;

    const currentTactic = horse.tactic || "";
    if (currentTactic.includes("先行マーク") || currentTactic === "マーク") {
      const opponent = horse.isPlayer ? cpu : player;
      if (opponent && opponent.tactic) {
        horse.tactic = opponent.tactic;
        horse.style = opponent.tactic;
        if (!horse.activated_abilities) horse.activated_abilities = [];
        if (!horse.activated_abilities.includes("マーク屋")) {
          horse.activated_abilities.push("マーク屋");
        }
      }
    }
  });
}

/**
 * 【Phase 1】基礎能力値の展開 ＆ 環境補正・各種特殊アビリティ適用
 */
function applyPhase1Abilities(horse, raceInfo, trackCondition) {
  horse.calc_speed = horse.speed || 0;
  horse.calc_stamina = horse.stamina || 0;
  horse.calc_sharp = horse.sharp || 0;
  horse.calc_jizoku = horse.jizoku || 0;
  horse.calc_guts = horse.guts || 0;
  horse.ability_buff = 0;

  const isTurf = raceInfo?.surface !== "ダート";
  const turfPot = horse.turf_potential ?? horse.potential ?? 0;
  const dirtPot = horse.dirt_potential ?? horse.potential ?? 0;

  if (isTurf) {
    horse.calc_potential = turfPot;
  } else {
    if (dirtPot > turfPot) {
      const potDiff = dirtPot - turfPot;
      horse.calc_potential = dirtPot;
      horse.calc_speed += potDiff;
      horse.calc_stamina += potDiff;
      horse.calc_sharp += potDiff;
      horse.calc_jizoku += potDiff;
      horse.calc_guts += potDiff;
    } else {
      horse.calc_potential = turfPot;
    }
  }

  if (!isEligibleForAbility(horse)) return;
  if (!horse.ability || !Array.isArray(horse.ability)) return;

  horse.activated_abilities = horse.activated_abilities || [];
  const overseasTracks = ["沙田", "メイダン", "ロンシャン", "パリロンシャン", "デルマー", "サンシャイン", "チャーチルダウンズ", "アスコット"];

  horse.ability.forEach(abilityName => {
    let buff = 0;

    // --- レコードホルダー (常時スピード +3) ---
    if (abilityName === "レコードホルダー") {
      horse.calc_speed += 3;
      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }

    // --- 荒ぶる魂 ---
    if (abilityName === "荒ぶる魂") {
      const rand = Math.random();
      if (rand < 0.25) { // 1/4の確率で +2
        buff = 2;
      } else if (rand < (0.25 + (1 / 3))) { // 1/3の確率で -1
        buff = -1;
      }
    }

    // --- 連勝街道 ---
    if (abilityName === "連勝街道") {
      const currentRound = raceInfo?.series_round || 1;
      const history = horse.series_history || [];
      if (currentRound === 3 && history[0] === 1 && history[1] === 1) buff = 1;
      if (currentRound === 4 && history[1] === 1 && history[2] === 1) buff = 1;
      if (currentRound === 5 && history[2] === 1 && history[3] === 1) buff = 1;
    }

    // --- 青天の霹靂 ---
    if (abilityName === "青天の霹靂") {
      const currentRound = raceInfo?.series_round || 1;
      const history = horse.series_history || [];
      if (currentRound >= 2 && history.length >= (currentRound - 1)) {
        const lastRank = history[currentRound - 2];
        if (lastRank > 1) buff = 1; // 前戦負けた時に発動
      }
    }

    // --- 国内競馬場 ---
    if (abilityName === "中山マイスター" && raceInfo?.track === "中山") buff = 1;
    if (abilityName === "府中の鬼" && raceInfo?.track === "東京") buff = 1;
    if (abilityName === "淀の千両役者" && raceInfo?.track === "京都") buff = 1;
    if (abilityName === "仁川の猛者" && raceInfo?.track === "阪神") buff = 1;
    if (abilityName === "越後の大吟醸" && raceInfo?.track === "新潟") buff = 1;
    if (abilityName === "尾張の芸達者" && raceInfo?.track === "中京") buff = 1;
    if (abilityName === "小倉の舞台荒らし" || abilityName === "小倉百戦錬磨") {
      if (raceInfo?.track === "小倉") buff = 1;
    }
    if (abilityName === "札幌の看板役者" && raceInfo?.track === "札幌") buff = 1;
    if (abilityName === "函館ひと芝居" && raceInfo?.track === "函館") buff = 1;
    if (abilityName === "地方無双" && ["大井","川崎","船橋","浦和","盛岡","園田","高知","笠松","門別"].includes(raceInfo?.track)) buff = 1;

    // --- 海外・環境 ---
    if (abilityName === "本領の香港" && (raceInfo?.track === "沙田" || raceInfo?.track === "香港")) buff = 2;
    if (abilityName === "メイダンの名誉" && raceInfo?.track === "メイダン") buff = 2;
    if (abilityName === "凱旋へのプレリュード" && (raceInfo?.track === "ロンシャン" || raceInfo?.track === "パリロンシャン")) buff = 2;
    if (abilityName === "アメリカンドリーム") buff = 1;
    if (abilityName === "国境突破" && overseasTracks.includes(raceInfo?.track)) buff = 1;

    // --- 距離・馬場 ---
    if (abilityName === "スピードスター" && raceInfo?.distance === 1200) buff = 1;
    if (abilityName === "オイラはマイラー" && raceInfo?.distance === 1600) buff = 1;
    if (abilityName === "体力オバケ" && raceInfo?.distance === 3200) buff = 1;
    if (abilityName === "道悪帝王") {
      if (trackCondition === "稍重") buff = 1;
      else if (trackCondition === "重" || trackCondition === "不良") buff = 2;
    }

    // --- 枠順 ---
    if (abilityName === "最内一閃" && horse.gate_number === 1) buff = 2;
    if (abilityName === "大外大歓迎" && (horse.gate_number === 8 || horse.gate_number === 16)) buff = 2;
    if (abilityName === "ゲートバカラ" || abilityName === "ゲートパカ") {
      if (horse.gate_number % 2 === 1) buff = -1;
      else if (horse.gate_number % 2 === 0) buff = 1;
    }

    if (buff !== 0) {
      applyAllStatsBuff(horse, buff);
      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }
  });
}

/**
 * 【Phase 2】位置取り計算時のスタートダッシュ等適用
 */
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

/**
 * 【Phase 3】位置順位確定後の展開条件アビリティ適用
 */
function applyPhase3Abilities(resultList, leadCount) {
  if (resultList.length === 0) return;

  const firstHorse = resultList.find(h => h.positionRank === 1);
  const secondHorse = resultList.find(h => h.positionRank === 2);

  if (!firstHorse || !isEligibleForAbility(firstHorse)) return;
  if (!firstHorse.ability || !Array.isArray(firstHorse.ability)) return;

  firstHorse.activated_abilities = firstHorse.activated_abilities || [];

  firstHorse.ability.forEach(abilityName => {
    if (abilityName === "ロケットスタート") {
      applyAllStatsBuff(firstHorse, 1);
    }

    if (abilityName === "大逃亡") {
      const secondPt = secondHorse ? secondHorse.positionPoint : 0;
      if ((firstHorse.positionPoint - secondPt) >= 20) {
        applyAllStatsBuff(firstHorse, 2);
        if (!firstHorse.activated_abilities.includes(abilityName)) {
          firstHorse.activated_abilities.push(abilityName);
        }
      }
    }

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

/**
 * 【Phase 4】ペース・展開依存のアビリティ判定
 */
function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0;
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  horse.ability.forEach(abilityName => {
    let triggered = false;

    // --- 大逃亡 ---
    if (abilityName === "大逃亡") {
      if (pace.includes("ハイ") || pace.includes("超ハイ")) {
        applyAllStatsBuff(horse, 1);
        triggered = true;
      }
      if (branchName.includes("前崩れ")) {
        extraScore += 10;
        triggered = true;
      }
    }

    // --- 王道 / 絶対王者 ---
    if (abilityName === "王道" || abilityName === "絶対王者") {
      if (pace.includes("乱ペース")) {
        applyAllStatsBuff(horse, 1);
        triggered = true;
      }
      if (branchName.includes("波乱")) {
        extraScore += 10;
        triggered = true;
      }
    }

    // --- まくり系 ---
    const isMakuri = /まくり|マクリ|捲り/.test(abilityName);
    if ((abilityName === "電光石火" || isMakuri) && branchName.includes("前残り")) {
      extraScore += 10;
      triggered = true;
    }

    // --- レコードホルダー ---
    if (abilityName === "レコードホルダー" && (branchName.includes("レコード決着") || branchName.includes("スピード勝負"))) {
      extraScore += 5; // +5 に変更
      triggered = true;
      horse.straight_popup_trigger = true;
      horse.commentary_trigger = "レコードホルダー";
    }

    if (triggered && !horse.activated_abilities.includes(abilityName)) {
      horse.activated_abilities.push(abilityName);
    }
  });
  return extraScore;
}

/**
 * 【特殊アビリティ】「名脇役」「ジェントルマン」の確定着順入替え処理
 */
function applyRankSwapAbilities(resultList) {
  const player = resultList.find(h => h.isPlayer);
  const cpu = resultList.find(h => h.isCpu);

  // 対戦馬同士が共に名脇役・ジェントルマンを保持している場合は発動なし
  const playerHasAbility = player?.ability?.some(a => a === "名脇役" || a === "ジェントルマン");
  const cpuHasAbility = cpu?.ability?.some(a => a === "名脇役" || a === "ジェントルマン");

  if (playerHasAbility && cpuHasAbility) return;

  resultList.forEach(horse => {
    if (!isEligibleForAbility(horse) || !horse.ability) return;

    const hasNameWakiyaku = horse.ability.includes("名脇役");
    const hasGentleman = horse.ability.includes("ジェントルマン");

    if (!hasNameWakiyaku && !hasGentleman) return;

    const currentRank = resultList.findIndex(h => h.index === horse.index) + 1; // 1-based着順
    let targetRank = null;

    if (currentRank >= 4 && currentRank <= 6) {
      targetRank = 3; // 3着と入替え
    } else if (currentRank >= 7 && currentRank <= 10) {
      targetRank = 4; // 4着と入替え
    }

    if (targetRank && targetRank < currentRank) {
      const targetIdx = targetRank - 1;
      const currentIdx = currentRank - 1;

      // 着順配列の入れ替え実行
      const temp = resultList[targetIdx];
      resultList[targetIdx] = resultList[currentIdx];
      resultList[currentIdx] = temp;

      if (!horse.activated_abilities) horse.activated_abilities = [];
      const activeName = hasNameWakiyaku ? "名脇役" : "ジェントルマン";
      if (!horse.activated_abilities.includes(activeName)) {
        horse.activated_abilities.push(activeName);
      }
    }
  });
}

// ============================================================================
// メイン処理エクスポート関数: runRaceLogic
// ============================================================================
export function runRaceLogic(horses, raceMaster, trackCondition = "良", raceInfo = null) {
  const leadCount = horses.filter(h => {
    const style = h.style || h.running_style || "";
    const tactic = h.tactic || "";
    return style === "逃げ" || tactic.includes("逃げ") || tactic === "ハナにこだわる";
  }).length;

  const resultList = horses.map((h, i) => {
    const copy = JSON.parse(JSON.stringify(h));
    copy.index = i;
    copy.activated_abilities = [];
    return copy;
  });

  // --- マーク屋の作戦コピー適用 ---
  processMarkStrategy(resultList);

  // --- Phase 1 アビリティ適用 ---
  resultList.forEach(copy => {
    applyPhase1Abilities(copy, raceInfo, trackCondition);
  });

  // --------------------------------------------------------------------------
  // STEP 1: 位置取りポイント計算と隊列順位判定
  // --------------------------------------------------------------------------
  resultList.forEach((h) => {
    const tacticStyle = h.style || h.tactic_style || h.target_style || h.tactic || "";
    let tacticStylePt = 40;
    if (tacticStyle.includes("逃げ")) tacticStylePt = 90;
    else if (tacticStyle.includes("先行")) tacticStylePt = 70;
    else if (tacticStyle.includes("差し")) tacticStylePt = 40;
    else if (tacticStyle.includes("追込")) tacticStylePt = 20;

    const horseStyle = h.running_style || h.horse_style || "";
    let styleCalcPt = 0;

    if (horseStyle.includes("自在") || horseStyle.includes("逃追")) {
      styleCalcPt = tacticStylePt * 2;
    } else if (horseStyle.includes("大逃")) {
      styleCalcPt = tacticStylePt + 50;
    } else if (horseStyle.includes("逃げ")) {
      styleCalcPt = tacticStylePt + 40;
    } else if (horseStyle.includes("先行") || horseStyle.includes("好位")) {
      styleCalcPt = tacticStylePt + 30;
    } else if (horseStyle.includes("差し")) {
      styleCalcPt = tacticStylePt + 20;
    } else if (horseStyle.includes("追込")) {
      styleCalcPt = tacticStylePt + 10;
    } else {
      styleCalcPt = tacticStylePt + 20;
    }

    const horseSpeed = h.calc_speed || 0;
    const randomVal = Math.floor(Math.random() * 6);

    let basePos = styleCalcPt + horseSpeed + randomVal;
    h.positionPoint = applyPhase2Abilities(h, basePos);
  });

  const posSorted = [...resultList].sort((a, b) => {
    if (b.positionPoint !== a.positionPoint) {
      return b.positionPoint - a.positionPoint;
    }
    const gateA = a.gate_number || a.horse_number || 99;
    const gateB = b.gate_number || b.horse_number || 99;
    return gateA - gateB;
  });

  posSorted.forEach((h, rank) => {
    const target = resultList.find(item => item.index === h.index);
    if (target) target.positionRank = rank + 1;
  });

  applyPhase3Abilities(resultList, leadCount);

  // --------------------------------------------------------------------------
  // STEP 2: ペース判定および展開分岐決定
  // --------------------------------------------------------------------------
  const selectedPace = determinePace(resultList, raceMaster, trackCondition);

  let availableBranches = raceMaster?.branches_by_pace?.[selectedPace];
  if (!availableBranches || availableBranches.length === 0) {
    availableBranches = [{
      name: "総合力勝負",
      key_stats: ["potential", "speed", "stamina"]
    }];
  }
  const selectedBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];

  // --------------------------------------------------------------------------
  // STEP 3: 各馬のスコア算出
  // --------------------------------------------------------------------------
  const fieldSize = resultList.length || 16;
  resultList.forEach((h) => {
    let statScore = 0;
    let styleBonusPt = 0;
    let posAddPt = 0;
    let formulaFormulaDetail = "";

    const stratPot = (h.level || 1) * 2;
    const horseBasePot = h.potential || 0;
    const totalPot = (h.calc_potential ?? horseBasePot) + stratPot;

    if (selectedBranch.formula) {
      let targetVal = 50;
      let targetStatName = "標準値";

      if (selectedBranch.target_pool && selectedBranch.target_pool.length > 0) {
        const randomKey = selectedBranch.target_pool[Math.floor(Math.random() * selectedBranch.target_pool.length)];
        const keyName = `calc_${randomKey}`;
        targetVal = h[keyName] ?? h[randomKey] ?? 0;
        
        if (randomKey === 'speed') targetStatName = 'SPD';
        else if (randomKey === 'stamina') targetStatName = 'STM';
        else if (randomKey === 'sharp') targetStatName = '瞬発';
        else if (randomKey === 'jizoku') targetStatName = '持続';
        else if (randomKey === 'guts') targetStatName = '根性';
      }

      statScore = 30 - totalPot + targetVal;
      formulaFormulaDetail = `30 - ポテ:${totalPot}(${horseBasePot}+${stratPot}) + ${targetStatName}:${targetVal}`;
    } 
    else if (selectedBranch.key_stats && selectedBranch.key_stats.length > 0) {
      selectedBranch.key_stats.forEach(key => {
        if (key === 'potential' || key === 'current_potential') {
          statScore += totalPot;
        } else {
          const calcKey = `calc_${key}`;
          const horseBase = h[calcKey] ?? h[key] ?? 0;
          const stratVal = h[`strat_${key}`] ?? 0;
          statScore += (horseBase + stratVal);
        }
      });
    } else {
      const spdBase = h.calc_speed || 0;
      const spdStrat = h.strat_speed || 0;
      const stmBase = h.calc_stamina || 0;
      const stmStrat = h.strat_stamina || 0;
      statScore = (spdBase + spdStrat) + (stmBase + stmStrat);
    }

    const tacticStyle = h.style || h.tactic_style || h.target_style || h.tactic || "";
    
    if (selectedBranch.style_bonus) {
      Object.keys(selectedBranch.style_bonus).forEach(bonusStyle => {
        if (tacticStyle.includes(bonusStyle)) {
          styleBonusPt = selectedBranch.style_bonus[bonusStyle] || 0;
        }
      });
    }

    if (selectedBranch.position_bonus_type === "direct_asc") {
      posAddPt = h.positionRank;
    } else if (selectedBranch.position_bonus_type === "direct_desc") {
      posAddPt = fieldSize + 1 - h.positionRank;
    }

    let extraScore = applyPhase4Abilities(h, selectedPace, selectedBranch.name);
    let randomBonus = Math.random() * 5;

    const totalDevelopmentAdd = styleBonusPt + posAddPt + extraScore;

    h.posScore = h.positionPoint;
    h.branchScore = extraScore;
    h.randScore = randomBonus;

    h.finalScore = statScore + totalDevelopmentAdd + randomBonus;
    
    let detailPartsList = [];

    if (selectedBranch.formula) {
      detailPartsList.push(`【能力算定】${formulaFormulaDetail} = ${statScore}pt`);
    } else if (selectedBranch.key_stats && selectedBranch.key_stats.length > 0) {
      let statDetails = [];
      selectedBranch.key_stats.forEach(key => {
        let statNameJa = key;
        if (key === 'speed') statNameJa = 'SPD';
        else if (key === 'stamina') statNameJa = 'STM';
        else if (key === 'sharp') statNameJa = '瞬発';
        else if (key === 'jizoku') statNameJa = '持続';
        else if (key === 'guts') statNameJa = '根性';
        else if (key === 'potential' || key === 'current_potential') statNameJa = 'ポテ';

        if (key === 'potential' || key === 'current_potential') {
          statDetails.push(`${statNameJa}:${totalPot}(${horseBasePot}+${stratPot})`);
        } else {
          const calcKey = `calc_${key}`;
          const horseBase = h[calcKey] ?? h[key] ?? 0;
          const stratVal = h[`strat_${key}`] ?? 0;
          const totalVal = horseBase + stratVal;
          statDetails.push(`${statNameJa}:${totalVal}(${horseBase}+${stratVal})`);
        }
      });
      detailPartsList.push(`【能力算定】${statDetails.join(" + ")} = ${statScore}pt`);
    } else {
      const spdBase = h.calc_speed || 0;
      const spdStrat = h.strat_speed || 0;
      const stmBase = h.calc_stamina || 0;
      const stmStrat = h.strat_stamina || 0;

      detailPartsList.push(`【能力算定】SPD:${spdBase + spdStrat}(${spdBase}+${spdStrat}) + STM:${stmBase + stmStrat}(${stmBase}+${stmStrat}) = ${statScore}pt`);
    }

    let devDetails = [];
    if (styleBonusPt > 0) devDetails.push(`脚質ボーナス+${styleBonusPt}`);
    if (posAddPt > 0) devDetails.push(`位置+${posAddPt}`);
    if (extraScore > 0) devDetails.push(`展開アビ+${extraScore}`);

    const devDetailStr = devDetails.length > 0 ? ` (${devDetails.join(", ")})` : "";
    detailPartsList.push(`【展開加算】+${totalDevelopmentAdd}pt${devDetailStr}`);

    if (h.ability_buff && h.ability_buff > 0) {
      const activeList = (h.activated_abilities && h.activated_abilities.length > 0) 
        ? ` (${h.activated_abilities.join(", ")})` 
        : "";
      detailPartsList.push(`【環境バフ】+${h.ability_buff}pt${activeList}`);
    }

    detailPartsList.push(`【乱数】+${randomBonus.toFixed(1)}`);

    h.detailText = detailPartsList.join(" ｜ ");
  });

  // --------------------------------------------------------------------------
  // STEP 4: 着順ソート ＆ 名脇役・ジェントルマンの入れ替え適用
  // --------------------------------------------------------------------------
  resultList.sort((a, b) => b.finalScore - a.finalScore);

  // 着順の確定後に入れ替えアビリティを適用
  applyRankSwapAbilities(resultList);

  return {
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch
  };
}
