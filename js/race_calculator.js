// ============================================================================
// js/race_calculator.js
// 競馬シミュレーション・計算エンジン ＆ 実況生成統合モジュール
// ============================================================================

// 中央の牝馬出走可能な混合G1レース定義（全15レース）
const JRA_MIXED_G1_RACES = [
  "フェブラリーステークス",
  "高松宮記念",
  "大阪杯",
  "皐月賞",
  "天皇賞（春）",
  "NHKマイルカップ",
  "日本ダービー",
  "安田記念",
  "宝塚記念",
  "スプリンターズステークス",
  "菊花賞",
  "天皇賞（秋）",
  "マイルチャンピオンシップ",
  "ジャパンカップ",
  "有馬記念"
];

// 海外競馬場フルリスト
const OVERSEAS_TRACKS = [
  "沙田", "香港", "クランジ", "メイダン",
  "ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム",
  "デルマー", "サンシャイン", "チャーチルダウンズ", "サンタアニタ", "ベルモントパーク", "アーリントンパーク"
];

/**
 * 馬の本来の脚質（8種類）とレースペースに応じたボーナスPtを取得
 */
function getHorseStylePaceBonus(horseStyleInput, racePace) {
  const horseStyle = String(horseStyleInput || "").trim();
  const pace = String(racePace || "").trim();

  if (horseStyle === "大逃") {
    if (pace === "超ハイペース") return 2;
    if (pace === "ハイペース") return 1;
  } else if (horseStyle === "逃げ" || horseStyle === "逃") {
    if (pace === "スローペース") return 2;
  } else if (horseStyle === "先行") {
    if (pace === "スローペース") return 1;
    if (pace === "ミドルペース") return 2;
  } else if (horseStyle === "好位") {
    if (pace === "スローペース") return 1;
    if (pace === "ミドルペース") return 2;
    if (pace === "乱ペース" || pace.includes("波乱")) return 1;
  } else if (horseStyle === "差し") {
    if (pace === "ミドルペース" || pace === "ハイペース" || pace === "超ハイペース") return 1;
  } else if (horseStyle === "追込") {
    if (pace === "超ハイペース") return 2;
    if (pace === "ハイペース") return 1;
  } else if (horseStyle === "自在") {
    if (pace === "ハイペース" || pace === "ミドルペース" || pace === "スローペース") return 1;
  } else if (horseStyle === "逃追") {
    if (pace === "ハイペース" || pace === "超ハイペース") return 1;
  }

  return 0;
}

/**
 * 作戦の脚質（4種類: 逃げ/先行/差し/追込）とレースペースに応じたボーナスPtを取得
 */
function getTacticPaceBonus(tacticStyleInput, racePace) {
  const tacticStyle = String(tacticStyleInput || "").trim();
  const pace = String(racePace || "").trim();

  if (tacticStyle === "逃げ") {
    if (pace === "スローペース") return 2;
  } else if (tacticStyle === "先行") {
    if (pace === "ミドルペース") return 2;
    if (pace === "スローペース") return 1;
  } else if (tacticStyle === "差し") {
    if (pace === "ミドルペース" || pace === "ハイペース" || pace === "超ハイペース") return 1;
  } else if (tacticStyle === "追込") {
    if (pace === "超ハイペース") return 2;
    if (pace === "ハイペース") return 1;
  }

  return 0;
}

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

  // フェーズ 3: 中盤〜第4コーナー
  let phase3Text = `ペースは${pace}で流れています。`;

  if (player && cpu) {
    const pRank = player.positionRank;
    const cRank = cpu.positionRank;

    if (pRank < cRank) {
      phase3Text += `${player.name}は絶好の手応えで${pRank}番手をキープ！追う${cpu.name}は後方${cRank}番手から前を狙う！`;
    } else if (pRank > cRank) {
      phase3Text += `${cpu.name}が${cRank}番手でレースを引っ算する！${player.name}は${pRank}番手からじっくりと機会を伺う！`;
    } else {
      phase3Text += `${player.name}と${cpu.name}、${pRank}番手付近でぴたりと並んで第4コーナーを回ってきます！`;
    }
  } else if (player) {
    phase3Text += `${player.name}は現在${player.positionRank}番手の位置！手応え十分で直線を迎えます！`;
  }

  // フェーズ 4 / 直線〜ゴール: 展開発表 ＆ 決着
  let finishText = `さあ各馬直線に向いた！レースの展開は「${branch?.name || "勝負所"}」！ `;

  if (results && results.length >= 3) {
    const rank1 = results[0].name;
    const rank2 = results[1].name;
    const rank3 = results[2].name;

    finishText += `大混戦のゴール前！制したのは${rank1}！${rank1}が見事に1着でゴールイン！2着には${rank2}、3着は${rank3}が入りました！`;
  } else if (results && results.length > 0) {
    finishText += `先頭でゴールを駆け抜けたのは${results[0].name}！`;
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
  return !!(horse && (horse.isPlayer || horse.isCpu));
}

/**
 * アビリティマスターデータを取得するヘルパー関数
 */
function getAbilityMasterData(abilityName, abilityMasterData) {
  if (!abilityMasterData) return null;

  if (Array.isArray(abilityMasterData)) {
    return abilityMasterData.find(a => a.name === abilityName || a.ability_name === abilityName) || null;
  }

  if (abilityMasterData[abilityName]) {
    return abilityMasterData[abilityName];
  }

  return Object.values(abilityMasterData).find(
    a => a && (a.name === abilityName || a.ability_name === abilityName)
  ) || null;
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
    let tactic = "";
    if (typeof h.tactic === "object" && h.tactic !== null) {
      tactic = h.tactic.style || h.tactic.name || "";
    } else {
      tactic = String(h.tactic || "");
    }
    return style === "逃げ" || style === "大逃" || tactic.includes("逃げ") || tactic === "ハナにこだわる";
  });

  const leadCount = leadHorses.length;
  let probObj = null;

  if (leadCount === 0) {
    probObj = { "スローペース": 0.5, "ミドルペース": 0.5 };
  } else if (leadCount === 1) {
    const leadStrat = (typeof leadHorses[0].tactic === "string" ? leadHorses[0].tactic : leadHorses[0].tactic?.name) || "平均ラップ逃げ";
    const map = condMaster["1_horse"]?.by_strategy;
    probObj = map ? (map[leadStrat] || map["平均ラップ逃げ"]) : null;
  } else if (leadCount === 2) {
    const leadStrat = (typeof leadHorses[0].tactic === "string" ? leadHorses[0].tactic : leadHorses[0].tactic?.name) || "平均ラップ逃げ";
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
function evalAbilityCondition(condition, horse, raceInfo, trackCondition, allHorses = [], racePace = "") {
  if (!condition) return false;

  const gate = Number(horse.gate_number || 0);
  const track = String(raceInfo?.track || "");
  const dist = Number(raceInfo?.distance || 0);
  const isFemale = ["牝", "牝馬"].includes(horse.sex);
  
  let tacticStr = "";
  if (typeof horse.tactic === "object" && horse.tactic !== null) {
    tacticStr = horse.tactic.style || horse.tactic.name || "";
  } else {
    tacticStr = String(horse.tactic || "");
  }
  const isEscape = (horse.style || tacticStr).includes("逃げ") || (horse.style || "") === "大逃";

  if (condition.startsWith("track_")) {
    const venue = condition.replace("track_", "");

    if (venue === "fukushima_escape") return track.includes("福島") && isEscape;
    if (venue === "fukushima_not_escape") return track.includes("福島") && !isEscape;
    if (venue === "local") return ["大井","川崎","船橋","浦和","盛岡","園田","高知","笠松","門別"].some(t => track.includes(t));
    if (venue === "overseas_hongkong" || venue === "overseas_asia") return ["沙田", "香港", "クランジ"].some(t => track.includes(t));
    if (venue === "overseas_dubai") return track.includes("メイダン");
    if (venue === "overseas_europe") return ["ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム"].some(t => track.includes(t));
    if (venue === "overseas_usa") return ["デルマー", "サンシャイン", "チャーチルダウンズ", "サンタアニタ", "ベルモントパーク", "アーリントンパーク"].some(t => track.includes(t));
    if (venue === "overseas_all") return OVERSEAS_TRACKS.some(t => track.includes(t));

    const trackNameMap = {
      nakayama: "中山", tokyo: "東京", kyoto: "京都", hanshin: "阪神",
      niigata: "新潟", chukyo: "中京", kokura: "小倉", sapporo: "札幌",
      hakodate: "函館", fukushima: "福島"
    };

    const targetTrack = trackNameMap[venue] || venue;
    return track.includes(targetTrack);
  }

  if (condition.startsWith("dist_") || ["speed_star", "oira_miler", "stamina_monster"].includes(condition)) {
    if (condition === "dist_1200" || condition === "dist_lte_1200" || condition === "speed_star") {
      return dist > 0 && dist <= 1200;
    }
    if (condition === "dist_1600" || condition === "oira_miler") {
      return dist === 1600;
    }
    if (condition === "dist_3000" || condition === "dist_3200" || condition === "dist_gte_3000" || condition === "stamina_monster") {
      return dist >= 3000;
    }
    const targetDist = Number(condition.replace("dist_", ""));
    if (!isNaN(targetDist) && targetDist > 0) {
      return dist === targetDist;
    }
  }

  switch (condition) {
    case "race_start":
    case "always": 
      return true;

    case "single_escape": {
      const leadHorses = allHorses.filter(h => {
        const style = h.style || h.running_style || "";
        let t = typeof h.tactic === "object" ? (h.tactic.style || h.tactic.name || "") : String(h.tactic || "");
        return style === "逃げ" || style === "大逃" || t.includes("逃げ") || t === "ハナにこだわる";
      });

      if (leadHorses.length !== 1) return false;

      const soleLead = leadHorses[0];
      const isTheSoleLeadHorse = (horse.index !== undefined && soleLead.index !== undefined)
        ? horse.index === soleLead.index
        : (horse.horse_id === soleLead.horse_id || horse.name === soleLead.name);

      if (!isTheSoleLeadHorse) return false;

      if (horse.positionRank !== undefined && horse.positionRank !== 1) {
        return false;
      }

      return true;
    }

    case "pace_front_remain": 
      return true;

    case "gate_odd": 
      return gate % 2 === 1;

    case "gate_even": 
      return gate % 2 === 0;

    case "gate_1":
    case "inside_slot": 
      return gate === 1 || gate === 2;

    case "gate_8":
    case "outside_slot": {
      const totalField = allHorses.length || 16;
      return gate >= totalField - 1;
    }

    case "ground_yielding": 
      return trackCondition === "稍重";

    case "ground_heavy_bad": 
      return trackCondition === "重" || trackCondition === "不良";

    case "is_overseas": 
      return OVERSEAS_TRACKS.some(t => track.includes(t));

    case "prob_33": 
      return OVERSEAS_TRACKS.some(t => track.includes(t)) && Math.random() < (1 / 3);

    case "is_local_exchange_series": 
      return !!(raceInfo?.is_local_exchange || raceInfo?.series_type?.includes("地方交流"));

    case "vs_male_domestic_g1":  
    case "is_female_in_mixed_g1": {
      if (!isFemale || !raceInfo?.race_name) return false;
      const isMixedG1 = JRA_MIXED_G1_RACES.some(g1Name => raceInfo.race_name.includes(g1Name));
      if (!isMixedG1) return false;
      return allHorses.some(other => (other.isPlayer || other.isCpu) && other.horse_id !== horse.horse_id && ["牡", "牡馬"].includes(other.sex));
    }

    case "streak_2_or_more": 
      return (horse.ally_win_streak || 0) >= 2;

    case "prev_ally_race_loss": {
      const raceNum = raceInfo?.race_number || raceInfo?.race_index || 1;
      return (raceNum >= 2) && !!horse.prev_ally_race_lost;
    }

    case "pace_high": 
      return racePace.includes("ハイ");

    case "pace_super_high": 
      return racePace.includes("超ハイ");

    case "pace_chaos": 
      return racePace.includes("乱") || racePace.includes("波乱");

    case "pot_highest": {
      const myPot = horse.calc_potential ?? horse.potential ?? 0;
      return allHorses.every(other => (other.calc_potential ?? other.potential ?? 0) <= myPot);
    }

    default: 
      return false;
  }
}

function processMarkStrategy(resultList) {
  const player = resultList.find(h => h.isPlayer);
  const cpu = resultList.find(h => h.isCpu);

  resultList.forEach(horse => {
    if (!isEligibleForAbility(horse) || !Array.isArray(horse.ability)) return;
    if (!horse.ability.includes("マーク屋")) return;

    let currentTactic = typeof horse.tactic === "object" ? (horse.tactic.style || horse.tactic.name || "") : String(horse.tactic || "");
    if (currentTactic.includes("先行マーク") || currentTactic === "マーク") {
      const opponent = horse.isPlayer ? cpu : player;
      if (opponent && opponent.tactic) {
        horse.tactic = opponent.tactic;
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

  horse.phase1_abilities = horse.phase1_abilities || [];
  horse.activated_abilities = horse.activated_abilities || [];

  const isTurf = raceInfo?.surface === '芝' || raceInfo?.surface !== 'ダート';

  const master = (typeof HORSES_MASTER !== 'undefined' ? HORSES_MASTER[horse.horse_id] : {}) || {};
  const turfPot = horse.turf_potential ?? master.turf_potential ?? horse.potential ?? 0;
  const dirtPot = horse.dirt_potential ?? master.dirt_potential ?? horse.potential ?? 0;

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
      horse.calc_potential = dirtPot;
    }
  }

  if (!isEligibleForAbility(horse)) return;
  if (!horse.ability || !Array.isArray(horse.ability)) return;

  horse.ability.forEach(abilityName => {
    // 荒ぶる魂・気分屋（同一効果）
    if (abilityName === "荒ぶる魂" || abilityName === "気分屋") {
      horse.popup_messages = horse.popup_messages || {};
      const rand = Math.random();
      let buff = 0;
      if (rand < 0.25) {
        buff = 2;
        horse.popup_messages[abilityName] = `${abilityName}覚醒！圧倒的なパワー！`;
      } else {
        buff = -1;
        horse.popup_messages[abilityName] = "気性を制御できず暴走気味…！";
      }
      
      applyAllStatsBuff(horse, buff);
      return;
    }
    
    if (abilityName === "レコードホルダー") return;

    if (abilityName === "ゲートバカラ") {
      horse.popup_messages = horse.popup_messages || {};
      const gate = horse.gate_number || 0;
      const isEven = (gate % 2 === 0);
      const buffVal = isEven ? 1 : -1;

      horse.popup_messages["ゲートバカラ"] = isEven ? "絶好の偶数枠ゲット！" : "奇数枠…少し出遅れる懸念！";

      applyAllStatsBuff(horse, buffVal);
      if (!horse.phase1_abilities.includes(abilityName)) horse.phase1_abilities.push(abilityName);
      if (!horse.activated_abilities.includes(abilityName)) horse.activated_abilities.push(abilityName);
      return;
    }

    const masterAbility = getAbilityMasterData(abilityName, abilityMasterData);
    if (!masterAbility || !masterAbility.effects) return;

    masterAbility.effects.forEach(effect => {
      if (effect.phase !== "phase1") return;

      if (evalAbilityCondition(effect.condition, horse, raceInfo, trackCondition, allHorses)) {
        if (effect.effect_type === "param_all") {
          applyAllStatsBuff(horse, effect.value);
        } else if (effect.effect_type === "param_speed") {
          horse.calc_speed += effect.value;
        }

        if (effect.popup_name) {
          horse.popup_messages = horse.popup_messages || {};
          horse.popup_messages[abilityName] = effect.popup_name;
        }

        if (!horse.phase1_abilities.includes(abilityName)) {
          horse.phase1_abilities.push(abilityName);
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

function applyPhase3Abilities(resultList, raceInfo, trackCondition, racePace) {
  if (resultList.length === 0) return;

  const firstHorse = resultList.find(h => h.positionRank === 1);

  if (!firstHorse || !isEligibleForAbility(firstHorse)) return;
  if (!firstHorse.ability || !Array.isArray(firstHorse.ability)) return;

  firstHorse.activated_abilities = firstHorse.activated_abilities || [];
}

/**
 * Phase 4: 直線〜展開による強力発動系アビリティのバフ計算
 * (大逃亡、王道、絶対王者、電光石火、まくり系、レコードホルダー等)
 * バフ値は「対象馬のポテンシャル - 10」を総加点へ直接加算する
 */
function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0;
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.phase4_abilities = horse.phase4_abilities || [];
  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  // 動的なバフ値計算: (ポテンシャル - 10)
  const currentPot = horse.calc_potential ?? horse.potential ?? 14;
  const dynamicBuff = currentPot - 10;

  horse.ability.forEach(abilityName => {
    let triggered = false;

    if (abilityName === "大逃亡") {
      if (branchName.includes("前崩れ")) {
        extraScore += dynamicBuff;
        triggered = true;
      }
    }

    if (abilityName === "王道" || abilityName === "絶対王者") {
      if (branchName.includes("波乱")) {
        extraScore += dynamicBuff;
        triggered = true;
      }
    }

    const isMakuri = /まくり|マクリ|捲り/.test(abilityName);
    if ((abilityName === "電光石火" || isMakuri) && branchName.includes("前残り")) {
      extraScore += dynamicBuff;
      triggered = true;
    }

    if (abilityName === "レコードホルダー" && (branchName.includes("レコード決着") || branchName.includes("スピード勝負"))) {
      extraScore += dynamicBuff;
      triggered = true;
      horse.straight_popup_trigger = true;
      horse.commentary_trigger = "レコードホルダー";
    }

    if (abilityName === "荒ぶる魂" || abilityName === "気分屋") {
      triggered = true;
      horse.straight_popup_trigger = true;
    }

    if (triggered) {
      if (!horse.phase4_abilities.includes(abilityName)) {
        horse.phase4_abilities.push(abilityName);
      }
      if (!horse.activated_abilities.includes(abilityName)) {
        horse.activated_abilities.push(abilityName);
      }
    }
  });
  return extraScore;
}

function applyRankSwapAbilities(resultList) {
  const player = resultList.find(h => h.isPlayer);
  const cpu = resultList.find(h => h.isCpu);

  const playerHasAbility = Array.isArray(player?.ability) && player.ability.some(a => a === "名脇役" || a === "シルバーコレクター");
  const cpuHasAbility = Array.isArray(cpu?.ability) && cpu.ability.some(a => a === "名脇役" || a === "シルバーコレクター");

  if (playerHasAbility && cpuHasAbility) return;

  const listCopy = [...resultList];

  listCopy.forEach(horse => {
    if (!isEligibleForAbility(horse) || !Array.isArray(horse.ability)) return;

    const hasNameWakiyaku = horse.ability.includes("名脇役");
    const hasSilverCollector = horse.ability.includes("シルバーコレクター");

    if (!hasNameWakiyaku && !hasSilverCollector) return;

    const currentRank = resultList.findIndex(h => h.index === horse.index) + 1;
    let targetRank = null;

    if (currentRank >= 4 && currentRank <= 6) {
      targetRank = 3;
    } else if (currentRank >= 7 && currentRank <= 10) {
      targetRank = 5;
    }

    if (targetRank && targetRank < currentRank) {
      const targetIdx = targetRank - 1;
      const currentIdx = resultList.findIndex(h => h.index === horse.index);

      const temp = resultList[targetIdx];
      resultList[targetIdx] = resultList[currentIdx];
      resultList[currentIdx] = temp;

      if (!horse.activated_abilities) horse.activated_abilities = [];
      const activeName = hasNameWakiyaku ? "名脇役" : "シルバーコレクター";
      if (!horse.activated_abilities.includes(activeName)) {
        horse.activated_abilities.push(activeName);
      }

      horse.rank_swap_trigger = activeName;
    }
  });
}

// ============================================================================
// メイン処理エクスポート関数: runRaceLogic
// ============================================================================
export function runRaceLogic(horses, raceMaster, trackCondition = "良", raceInfo = null, abilityMasterData = null) {
  const resultList = horses.map((h, i) => {
    const copy = JSON.parse(JSON.stringify(h));
    copy.index = i;
    copy.phase1_abilities = [];
    copy.phase4_abilities = [];
    copy.activated_abilities = [];

    // ★ 作戦(tactic)オブジェクトから strat_* パラメータを自動補填
    if (typeof copy.tactic === "object" && copy.tactic !== null) {
      const tac = copy.tactic;
      ['speed', 'stamina', 'sharp', 'jizoku', 'guts'].forEach(key => {
        if (copy[`strat_${key}`] === undefined || copy[`strat_${key}`] === null) {
          copy[`strat_${key}`] = tac[`strat_${key}`] ?? tac[key] ?? 0;
        }
      });
    }

    return copy;
  });

  processMarkStrategy(resultList);

  // STEP 0: ペース事前判定（Phase1アビリティ判定用）
  const selectedPace = determinePace(resultList, raceMaster, trackCondition);

  resultList.forEach(copy => {
    applyPhase1Abilities(copy, raceInfo, trackCondition, resultList, abilityMasterData);
  });

  // STEP 1: 位置取り計算（脚質・作戦によるポジショニング決め）
  resultList.forEach((h) => {
    let tacticCategory = "";

    if (typeof h.tactic === "object" && h.tactic !== null) {
      tacticCategory = h.tactic.style || h.tactic.category || "";
    } else {
      const tacticStr = String(h.tactic_style || h.target_style || h.tactic || "");
      if (tacticStr.includes("逃げ") || tacticStr.includes("ハナ")) {
        tacticCategory = "逃げ";
      } else if (tacticStr.includes("先行") || tacticStr.includes("4角") || tacticStr.includes("好位")) {
        tacticCategory = "先行";
      } else if (tacticStr.includes("差し") || tacticStr.includes("スパート") || tacticStr.includes("マーク")) {
        tacticCategory = "差し";
      } else if (tacticStr.includes("追込") || tacticStr.includes("まくり") || tacticStr.includes("死んだふり")) {
        tacticCategory = "追込";
      }
    }

    let tacticStylePt = 40;
    if (tacticCategory === "逃げ") {
      tacticStylePt = 90;
    } else if (tacticCategory === "先行") {
      tacticStylePt = 70;
    } else if (tacticCategory === "差し") {
      tacticStylePt = 40;
    } else if (tacticCategory === "追込") {
      tacticStylePt = 20;
    }

    const horseStyle = String(h.style || h.running_style || h.horse_style || "");
    let styleCalcPt = 0;

    if (horseStyle === "大逃") {
      styleCalcPt = tacticStylePt + 50;
    } else if (horseStyle.includes("逃げ") || horseStyle === "逃") {
      styleCalcPt = tacticStylePt + 40;
    } else if (horseStyle.includes("先行") || horseStyle.includes("好位")) {
      styleCalcPt = tacticStylePt + 30;
    } else if (horseStyle.includes("差し")) {
      styleCalcPt = tacticStylePt + 20;
    } else if (horseStyle.includes("追込")) {
      styleCalcPt = tacticStylePt + 10;
    } else if (horseStyle.includes("自在") || horseStyle.includes("逃追")) {
      styleCalcPt = tacticStylePt + 15;
    } else {
      styleCalcPt = tacticStylePt + 20;
    }

    const horseSpeed = h.calc_speed || 0;
    const randomVal = Math.floor(Math.random() * 5);

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

  applyPhase3Abilities(resultList, raceInfo, trackCondition, selectedPace);

  // STEP 2: 展開分岐選択
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
    let styleBonusPt = 0;      // 作戦脚質ボーナスPt
    let horseStyleBonusPt = 0; // 馬脚質ボーナスPt
    let posAddPt = 0;
    let formulaFormulaDetail = "";

    const horseBasePot = h.potential || 0;
    
    const isChikaraKurabe = selectedBranch.name === "力比べ" || selectedBranch.name.includes("力比べ");
    const potMultiplier = isChikaraKurabe ? 3 : 1;

    const basePotVal = h.calc_potential ?? horseBasePot;
    const stratPotBase = (h.level || 1) * 2;

    const totalPot = (basePotVal * potMultiplier) + (stratPotBase * potMultiplier);

    if (selectedBranch.formula) {
      let targetVal = 0;
      let targetStatName = "パラメータ";

      const targetPool = (selectedBranch.target_pool && selectedBranch.target_pool.length > 0)
        ? selectedBranch.target_pool
        : ['speed', 'stamina', 'sharp', 'jizoku', 'guts'];

      const randomKey = targetPool[Math.floor(Math.random() * targetPool.length)];
      const keyName = `calc_${randomKey}`;
      targetVal = h[keyName] ?? h[randomKey] ?? 0;
      
      const statNameMap = {
        speed: 'SPD',
        stamina: 'STM',
        sharp: '瞬発',
        jizoku: '持続',
        guts: '根性'
      };
      targetStatName = statNameMap[randomKey] || randomKey;

      statScore = (30 - basePotVal) + stratPotBase + targetVal;
      formulaFormulaDetail = `30 - 馬ポテ:${basePotVal} + 作戦Lv:${stratPotBase} + ${targetStatName}:${targetVal}`;
    } else if (selectedBranch.key_stats && selectedBranch.key_stats.length > 0) {
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

    // 1. 作戦の脚質（4種類）カテゴリ判定
    let currentTacticStyle = "";
    if (typeof h.tactic === "object" && h.tactic !== null) {
      currentTacticStyle = h.tactic.style || h.tactic.category || "";
    } else {
      const tStr = String(h.tactic_style || h.target_style || h.tactic || "");
      if (tStr.includes("逃げ")) currentTacticStyle = "逃げ";
      else if (tStr.includes("先行")) currentTacticStyle = "先行";
      else if (tStr.includes("差し")) currentTacticStyle = "差し";
      else if (tStr.includes("追込")) currentTacticStyle = "追込";
    }

    // 作戦の脚質ボーナス計算
    styleBonusPt = getTacticPaceBonus(currentTacticStyle, selectedPace);

    // 2. 馬本来の脚質（8種類）を取得
    const rawHorseStyle = h.style || h.running_style || h.horse_style || "";

    // 馬本来の脚質ボーナス計算
    horseStyleBonusPt = getHorseStylePaceBonus(rawHorseStyle, selectedPace);

    // 画面表示用プロパティを安全に格納
    h.original_horse_style = rawHorseStyle;
    h.display_tactic_name = (typeof h.tactic === "object" && h.tactic !== null) ? (h.tactic.name || h.tactic.style || "") : String(h.tactic || "");

    // 前残り・前崩れ（位置取りによる加減算）
    if (selectedBranch.position_bonus_type === "direct_asc") {
      posAddPt = h.positionRank;
    } else if (selectedBranch.position_bonus_type === "direct_desc") {
      posAddPt = fieldSize + 1 - h.positionRank;
    }

    let extraScore = applyPhase4Abilities(h, selectedPace, selectedBranch.name);
    let randomBonus = Math.random() * 1;

    // 展開加算合計
    const totalDevelopmentAdd = styleBonusPt + horseStyleBonusPt + posAddPt + extraScore;

    h.posScore = h.positionPoint;
    h.branchScore = extraScore;
    h.randScore = randomBonus;
    h.styleBonusPt = styleBonusPt;
    h.horseStyleBonusPt = horseStyleBonusPt;
    h.posAddPt = posAddPt;

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
          const potValDisplay = basePotVal * potMultiplier;
          const stratValDisplay = stratPotBase * potMultiplier;
          const multText = isChikaraKurabe ? "(×3)" : "";
          statDetails.push(`${statNameJa}${multText}:${totalPot}(${potValDisplay}+${stratValDisplay})`);
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
    if (styleBonusPt > 0) devDetails.push(`作戦脚質+${styleBonusPt}`);
    if (horseStyleBonusPt > 0) devDetails.push(`馬脚質+${horseStyleBonusPt}`);
    if (posAddPt > 0) devDetails.push(`位置+${posAddPt}`);
    if (extraScore > 0) devDetails.push(`展開アビ+${extraScore}`);

    const devDetailStr = devDetails.length > 0 ? ` (${devDetails.join(", ")})` : "";
    detailPartsList.push(`【展開加算】+${totalDevelopmentAdd}pt${devDetailStr}`);

    if (h.ability_buff && h.ability_buff !== 0) {
      const activeList = (h.activated_abilities && h.activated_abilities.length > 0) 
        ? ` (${h.activated_abilities.join(", ")})` 
        : "";
      const signStr = h.ability_buff > 0 ? `+${h.ability_buff}` : `${h.ability_buff}`;
      detailPartsList.push(`【アビリティ】${signStr}pt${activeList}`);
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
