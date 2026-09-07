// ============================================================================
// js/race_calculator.js
// 競馬シミュレーション・計算エンジン ＆ 実況生成統合モジュール
// ============================================================================

/**
 * 牡馬混合G1レースリスト (パターンA: 男勝り判定用)
 */
const MIXED_G1_RACES = [
  "皐月賞", "日本ダービー", "東京優駿", "菊花賞", 
  "天皇賞（春）", "天皇賞(春)", "天皇賞（秋）", "天皇賞(秋)", 
  "宝塚記念", "ジャパンカップ", "ジャパンC", "有馬記念",
  "大阪杯", "安田記念", "マイルチャンピオンシップ", "マイルCS", 
  "スプリンターズステークス", "スプリンターズS", 
  "フェブラリーステークス", "フェブラリーS", 
  "チャンピオンズカップ", "チャンピオンズC", 
  "NHKマイルカップ", "NHKマイルC", 
  "朝日杯フューチュリティステークス", "朝日杯FS", 
  "ホープフルステークス", "ホープフルS"
];

// 海外競馬場フルリスト
const OVERSEAS_TRACKS = [
  "沙田", "香港", "クランジ", "メイダン",
  "ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム",
  "デルマー", "サンシャイン", "チャーチルダウンズ", "サンタアニタ", "ベルモントパーク", "アーリントンパーク"
];

/**
 * 内部関数: 実況テキストの生成
 */
function generateRaceCommentary(raceData) {
  const { results, pace, branch, posSorted } = raceData;

  const player = results.find(h => h.isPlayer);
  const cpu = results.find(h => h.isCpu);

  // フェーズ 1: スタート〜序盤
  const phase1Text = "各馬一斉にきれいなスタートを切りました！綺麗な飛び出しです。";

  // フェーズ 2: 隊列形成（4番手・5番手をコール）
  let phase2Text = "";
  if (posSorted && posSorted.length >= 5) {
    const pos1 = posSorted[0]?.name || "1番手";
    const pos2 = posSorted[1]?.name || "2番手";
    const pos3 = posSorted[2]?.name || "3番手";
    const pos4 = posSorted[3]?.name || "4番手";
    const pos5 = posSorted[4]?.name || "5番手";

    phase2Text = `果敢にハナを切るのは${pos1}！直後に${pos2}、${pos3}が続いていきます。さらに${pos4}、${pos5}も先団を形成して前を伺います！`;
  } else {
    phase2Text = "各馬隊列を整えながら、1コーナーへと向かっていきます。";
  }

  // フェーズ 3: 中盤〜展開分岐（自馬・ライバルの位置比較）
  let phase3Text = `ペースは${pace}で流れています。レースは展開分岐「${branch?.name || "勝負所"}」へ！ `;

  if (player && cpu) {
    const pRank = player.positionRank;
    const cRank = cpu.positionRank;

    if (pRank < cRank) {
      phase3Text += `あなたの${player.name}は絶好の手応えで${pRank}番手をキープ！追うライバル${cpu.name}は後方${cRank}番手から前を狙う！`;
    } else if (pRank > cRank) {
      phase3Text += `ライバル${cpu.name}が${cRank}番手でレースを引っ張る！あなたの${player.name}は${pRank}番手からじっくりと機会を伺う！`;
    } else {
      phase3Text += `あなたの${player.name}とライバル${cpu.name}、${pRank}番手付近でぴたりと並んで第4コーナーを回ってきます！`;
    }
  } else if (player) {
    phase3Text += `あなたの${player.name}は現在${player.positionRank}番手の位置！手応え十分で直線を迎えます！`;
  }

  // フェーズ 4 / ゴール: 決着（1〜3着コール）
  let finishText = "";
  if (results && results.length >= 3) {
    const rank1 = results[0].name;
    const rank2 = results[1].name;
    const rank3 = results[2].name;

    finishText = `大混戦のゴール前！制したのは${rank1}！${rank1}見事に1着でゴールイン！2着には${rank2}、3着は${rank3}が入りました！`;
  } else if (results && results.length > 0) {
    finishText = `先頭でゴールを駆け抜けたのは${results[0].name}！`;
  }

  return {
    phase1: phase1Text,
    phase2: phase2Text,
    phase3: phase3Text,
    finish: finishText
  };
}

/**
 * アビリティ発動対象馬かどうか判定するヘルパー
 */
function isEligibleForAbility(horse) {
  return !!(horse.isPlayer || horse.isCpu);
}

/**
 * 全パラメータ増減用の箱（calc_〜）へ一括でバフを適用
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
    if (rand <= cumulative) return key;
  }
  return keys[keys.length - 1] || "ミドルペース";
}

/**
 * 出走馬の「逃げ」頭数と馬場状態からレースペースを判定
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
 * アビリティの条件（condition）に合致するか判定
 */
function evalAbilityCondition(condition, horse, raceInfo, trackCondition, allHorses = []) {
  const gate = horse.gate_number || 0;
  const track = raceInfo?.track || "";
  const dist = raceInfo?.distance || 0;
  const isFemale = ["牝", "牝馬"].includes(horse.sex);
  const isEscape = (horse.style || horse.tactic || "").includes("逃げ");

  switch (condition) {
    case "gate_odd": return gate % 2 === 1;
    case "gate_even": return gate % 2 === 0;
    case "gate_1": return gate === 1;
    case "gate_8": return gate === 8 || gate === 16;
    case "track_nakayama": return track === "中山";
    case "track_tokyo": return track === "東京";
    case "track_kyoto": return track === "京都";
    case "track_hanshin": return track === "阪神";
    case "track_niigata": return track === "新潟";
    case "track_chukyo": return track === "中京";
    case "track_kokura": return track === "小倉";
    case "track_sapporo": return track === "札幌";
    case "track_hakodate": return track === "函館";
    case "track_local": return ["大井","川崎","船橋","浦和","盛岡","園田","高知","笠松","門別"].includes(track);
    case "track_fukushima_escape": return track === "福島" && isEscape;
    case "track_fukushima_not_escape": return track === "福島" && !isEscape;
    case "track_overseas_hongkong":
    case "track_overseas_asia": return ["沙田", "香港", "クランジ"].includes(track);
    case "track_overseas_dubai": return track === "メイダン";
    case "track_overseas_europe": return ["ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム"].includes(track);
    case "track_overseas_usa": return ["デルマー", "サンシャイン", "チャーチルダウンズ", "サンタアニタ", "ベルモントパーク", "アーリントンパーク"].includes(track);
    case "track_overseas_all":
    case "is_overseas": return OVERSEAS_TRACKS.includes(track);
    case "prob_33": return OVERSEAS_TRACKS.includes(track) && Math.random() < (1 / 3);
    case "is_local_exchange_series": return !!(raceInfo?.is_local_exchange || raceInfo?.series_type === "地方交流");
    case "dist_1200": return dist === 1200;
    case "dist_1600": return dist === 1600;
    case "dist_3200": return dist === 3200;
    case "ground_yielding": return trackCondition === "稍重";
    case "ground_heavy_bad": return trackCondition === "重" || trackCondition === "不良";
    case "is_female_in_mixed_g1": return isFemale && MIXED_G1_RACES.includes(raceInfo?.race_name);
    case "pot_highest": {
      const myPot = horse.calc_potential ?? horse.potential ?? 0;
      return allHorses.every(other => (other.calc_potential ?? other.potential ?? 0) <= myPot);
    }
    case "always": return true;
    default: return false;
  }
}

function getAbilityMasterData(abilityName, abilityMasterData) {
  if (!abilityMasterData) return null;
  return Object.values(abilityMasterData).find(master => master.name === abilityName || master.name.includes(abilityName));
}

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

function applyPhase1Abilities(horse, raceInfo, trackCondition, allHorses, abilityMasterData) {
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
    if (turfPot >= 14 && dirtPot > turfPot) {
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

  horse.ability.forEach(abilityName => {
    if (abilityName === "荒ぶる魂") {
      const rand = Math.random();
      let buff = 0;
      if (rand < 0.25) buff = 2;
      else if (rand < (0.25 + (1 / 3))) buff = -1;
      
      if (buff !== 0) {
        applyAllStatsBuff(horse, buff);
        if (!horse.activated_abilities.includes(abilityName)) horse.activated_abilities.push(abilityName);
      }
      return;
    }

    const master = getAbilityMasterData(abilityName, abilityMasterData);
    if (!master || !master.effects) return;

    master.effects.forEach(effect => {
      if (effect.phase !== "phase1") return;

      if (evalAbilityCondition(effect.condition, horse, raceInfo, trackCondition, allHorses)) {
        if (effect.effect_type === "param_all") {
          applyAllStatsBuff(horse, effect.value);
        } else if (effect.effect_type === "param_speed") {
          horse.calc_speed += effect.value;
        }

        if (!horse.activated_abilities.includes(abilityName)) {
          horse.activated_abilities.push(abilityName);
        }
      }
    });
  });
}

function applyPhase2Abilities(horse, positionPoint, abilityMasterData) {
  if (!isEligibleForAbility(horse)) return positionPoint;
  if (!horse.ability || !Array.isArray(horse.ability)) return positionPoint;

  horse.activated_abilities = horse.activated_abilities || [];
  let newPoint = positionPoint;

  horse.ability.forEach(abilityName => {
    const master = getAbilityMasterData(abilityName, abilityMasterData);
    if (!master || !master.effects) return;

    master.effects.forEach(effect => {
      if (effect.phase === "phase2" && effect.effect_type === "position_point") {
        newPoint += effect.value;
        if (!horse.activated_abilities.includes(abilityName)) {
          horse.activated_abilities.push(abilityName);
        }
      }
    });
  });

  return newPoint;
}

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

function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0;
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  horse.ability.forEach(abilityName => {
    let triggered = false;

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

    const isMakuri = /まくり|マクリ|捲り/.test(abilityName);
    if ((abilityName === "電光石火" || isMakuri) && branchName.includes("前残り")) {
      extraScore += 10;
      triggered = true;
    }

    if (abilityName === "レコードホルダー" && (branchName.includes("レコード決着") || branchName.includes("スピード勝負"))) {
      extraScore += 5;
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

function applyRankSwapAbilities(resultList) {
  const player = resultList.find(h => h.isPlayer);
  const cpu = resultList.find(h => h.isCpu);

  const playerHasAbility = player?.ability?.some(a => a === "名脇役" || a === "ジェントルマン");
  const cpuHasAbility = cpu?.ability?.some(a => a === "名脇役" || a === "ジェントルマン");

  if (playerHasAbility && cpuHasAbility) return;

  resultList.forEach(horse => {
    if (!isEligibleForAbility(horse) || !horse.ability) return;

    const hasNameWakiyaku = horse.ability.includes("名脇役");
    const hasGentleman = horse.ability.includes("ジェントルマン");

    if (!hasNameWakiyaku && !hasGentleman) return;

    const currentRank = resultList.findIndex(h => h.index === horse.index) + 1;
    let targetRank = null;

    if (currentRank >= 4 && currentRank <= 6) {
      targetRank = 3;
    } else if (currentRank >= 7 && currentRank <= 10) {
      targetRank = 4;
    }

    if (targetRank && targetRank < currentRank) {
      const targetIdx = targetRank - 1;
      const currentIdx = currentRank - 1;

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
export function runRaceLogic(horses, raceMaster, trackCondition = "良", raceInfo = null, abilityMasterData = null) {
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

  processMarkStrategy(resultList);

  resultList.forEach(copy => {
    applyPhase1Abilities(copy, raceInfo, trackCondition, resultList, abilityMasterData);
  });

  // STEP 1: 位置取り計算
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
    h.positionPoint = applyPhase2Abilities(h, basePos, abilityMasterData);
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

  // STEP 2: ペース判定および展開分岐
  const selectedPace = determinePace(resultList, raceMaster, trackCondition);

  let availableBranches = raceMaster?.branches_by_pace?.[selectedPace];
  if (!availableBranches || availableBranches.length === 0) {
    availableBranches = [{
      name: "総合力勝負",
      key_stats: ["potential", "speed", "stamina"]
    }];
  }
  const selectedBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];

  // STEP 3: スコア算出
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

  // STEP 4: 着順ソート ＆ 特殊アビリティ入れ替え
  resultList.sort((a, b) => b.finalScore - a.finalScore);
  applyRankSwapAbilities(resultList);

  // STEP 5: 実況テキスト生成
  const commentaryData = generateRaceCommentary({
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch,
    posSorted: posSorted
  });

  return {
    results: resultList,
    pace: selectedPace,
    branch: selectedBranch,
    commentary: commentaryData
  };
}
