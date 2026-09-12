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
      phase3Text += `${player.name}は絶好の手応えで${pRank}番手をキープ！追う${cpu.name}は後方${cRank}番手から前を狙う！`;
    } else if (pRank > cRank) {
      phase3Text += `${cpu.name}が${cRank}番手でレースを引っ張る！${player.name}は${pRank}番手からじっくりと機会を伺う！`;
    } else {
      phase3Text += `${player.name}と${cpu.name}、${pRank}番手付近でぴたりと並んで第4コーナーを回ってきます！`;
    }
  } else if (player) {
    phase3Text += `${player.name}は現在${player.positionRank}番手の位置！手応え十分で直線を迎えます！`;
  }

  // フェーズ 4 / ゴール: 決着（1〜3着コール）
  let finishText = "";
  if (results && results.length >= 3) {
    const rank1 = results[0].name;
    const rank2 = results[1].name;
    const rank3 = results[2].name;

    finishText = `大混戦のゴール前！制したのは${rank1}！${rank1}が見事に1着でゴールイン！2着には${rank2}、3着は${rank3}が入りました！`;
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
function evalAbilityCondition(condition, horse, raceInfo, trackCondition, allHorses = [], racePace = "") {
  if (!condition) return false;

  // 1. 型の安全確保 (数値化・文字列化)
  const gate = Number(horse.gate_number || 0);
  const track = String(raceInfo?.track || "");
  const dist = Number(raceInfo?.distance || 0);
  const isFemale = ["牝", "牝馬"].includes(horse.sex);
  const isEscape = (horse.style || horse.tactic || "").includes("逃げ");

  // --------------------------------------------------------------------------
  // A. 競馬場判定の動的処理 (例: "track_中山", "track_nakayama", "track_local")
  // --------------------------------------------------------------------------
  if (condition.startsWith("track_")) {
    const venue = condition.replace("track_", "");

    // 競馬場の特殊・グループ判定
    if (venue === "fukushima_escape") return track.includes("福島") && isEscape;
    if (venue === "fukushima_not_escape") return track.includes("福島") && !isEscape;
    if (venue === "local") return ["大井","川崎","船橋","浦和","盛岡","園田","高知","笠松","門別"].some(t => track.includes(t));
    if (venue === "overseas_hongkong" || venue === "overseas_asia") return ["沙田", "香港", "クランジ"].some(t => track.includes(t));
    if (venue === "overseas_dubai") return track.includes("メイダン");
    if (venue === "overseas_europe") return ["ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム"].some(t => track.includes(t));
    if (venue === "overseas_usa") return ["デルマー", "サンシャイン", "チャーチルダウンズ", "サンタアニタ", "ベルモントパーク", "アーリントンパーク"].some(t => track.includes(t));
    if (venue === "overseas_all") return OVERSEAS_TRACKS.some(t => track.includes(t));

    // ローマ字名から日本語への変換マップ（マスター表記揺れ吸収用）
    const trackNameMap = {
      nakayama: "中山", tokyo: "東京", kyoto: "京都", hanshin: "阪神",
      niigata: "新潟", chukyo: "中京", kokura: "小倉", sapporo: "札幌",
      hakodate: "函館", fukushima: "福島"
    };

    const targetTrack = trackNameMap[venue] || venue;
    return track.includes(targetTrack);
  }

  // --------------------------------------------------------------------------
  // B. 距離判定の動的・共通処理 (例: "dist_1600", "dist_1200", "speed_star")
  // --------------------------------------------------------------------------
  if (condition.startsWith("dist_") || ["speed_star", "oira_miler", "stamina_monster"].includes(condition)) {
    // 1200m以下 (スピードスター等)
    if (condition === "dist_1200" || condition === "dist_lte_1200" || condition === "speed_star") {
      return dist > 0 && dist <= 1200;
    }
    // 1600mぴったり (オイラはマイラー等)
    if (condition === "dist_1600" || condition === "oira_miler") {
      return dist === 1600;
    }
    // 3000m以上 (体力オバケ等)
    if (condition === "dist_3000" || condition === "dist_3200" || condition === "dist_gte_3000" || condition === "stamina_monster") {
      return dist >= 3000;
    }
    // 数値直接指定 (例: "dist_2000" -> 2000m判定)
    const targetDist = Number(condition.replace("dist_", ""));
    if (!isNaN(targetDist) && targetDist > 0) {
      return dist === targetDist;
    }
  }

  // --------------------------------------------------------------------------
  // C. その他の個別特殊条件
  // --------------------------------------------------------------------------
  switch (condition) {
    case "race_start":
    case "always": 
      return true;

    case "single_escape": {
      // レース内の「逃げ」馬を抽出
      const leadHorses = allHorses.filter(h => {
        const style = h.style || h.running_style || "";
        const tactic = h.tactic || "";
        return style === "逃げ" || tactic.includes("逃げ") || tactic === "ハナにこだわる";
      });

      // ① 逃げ馬が1頭のみ（単騎）でない場合は不成立
      if (leadHorses.length !== 1) return false;

      // ② 該当する馬が唯一の逃げ馬であるかチェック
      const soleLead = leadHorses[0];
      const isTheSoleLeadHorse = (horse.index !== undefined && soleLead.index !== undefined)
        ? horse.index === soleLead.index
        : (horse.horse_id === soleLead.horse_id || horse.name === soleLead.name);

      if (!isTheSoleLeadHorse) return false;

      // ③ 位置取り判定が済んでいる場合、先頭（1番手）でなければ不成立
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
    case "outside_slot": 
      return gate === 15 || gate === 16;

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
      const opponent = allHorses.find(other => (other.isPlayer || other.isCpu) && other.horse_id !== horse.horse_id);
      return opponent ? ["牡", "牡馬"].includes(opponent.sex) : false;
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

  // レースの馬場判定（芝かダートか）
  const isTurf = raceInfo?.surface === '芝' || raceInfo?.surface !== 'ダート';

  // コースに応じた基礎ポテンシャルを取得
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

  horse.activated_abilities = horse.activated_abilities || [];

  horse.ability.forEach(abilityName => {

    // 荒ぶる魂 仕様
    if (abilityName === "荒ぶる魂") {
      horse.popup_messages = horse.popup_messages || {};
      const rand = Math.random();
      let buff = 0;
      if (rand < 0.25) {
        buff = 2;
        horse.popup_messages["荒ぶる魂"] = "荒ぶる魂発動";
      } else {
        buff = -1;
        horse.popup_messages["荒ぶる魂"] = "荒ぶる魂不発";
      }
      
      applyAllStatsBuff(horse, buff);
      if (!horse.activated_abilities.includes(abilityName)) horse.activated_abilities.push(abilityName);
      return;
    }

    // ゲートバカラ 仕様
    if (abilityName === "ゲートバカラ") {
      horse.popup_messages = horse.popup_messages || {};
      const gate = horse.gate_number || 0;
      const isEven = (gate % 2 === 0);
      const buffVal = isEven ? 1 : -1;

      horse.popup_messages["ゲートバカラ"] = isEven ? "ゲートバカラ(UP)" : "ゲートバカラ(DOWN)";

      applyAllStatsBuff(horse, buffVal);
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

  firstHorse.ability.forEach(abilityName => {
    
  });
}

function applyPhase4Abilities(horse, pace, branchName) {
  if (!isEligibleForAbility(horse)) return 0;
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  horse.activated_abilities = horse.activated_abilities || [];
  let extraScore = 0;

  horse.ability.forEach(abilityName => {
    let triggered = false;

    // 大逃亡: 前崩れ発生時に+10
    if (abilityName === "大逃亡") {
      if (branchName.includes("前崩れ")) {
        extraScore += 10;
        triggered = true;
      }
    }

    if (abilityName === "王道" || abilityName === "絶対王者") {
      if (branchName.includes("波乱")) {
        extraScore += 10;
        triggered = true;
      }
    }

    // まくり系 (衝撃のまくり、異次元のまくり、怒涛のまくり等) / 電光石火: 前残りの時に+10
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

  const playerHasAbility = Array.isArray(player?.ability) && player.ability.some(a => a === "名脇役" || a === "ジェントルマン");
  const cpuHasAbility = Array.isArray(cpu?.ability) && cpu.ability.some(a => a === "名脇役" || a === "ジェントルマン");

  if (playerHasAbility && cpuHasAbility) return;

  resultList.forEach(horse => {
    if (!isEligibleForAbility(horse) || !Array.isArray(horse.ability)) return;

    const hasNameWakiyaku = horse.ability.includes("名脇役");
    const hasGentleman = horse.ability.includes("ジェントルマン");

    if (!hasNameWakiyaku && !hasGentleman) return;

    const currentRank = resultList.findIndex(h => h.index === horse.index) + 1;
    let targetRank = null;

    if (currentRank >= 4 && currentRank <= 6) {
      targetRank = 3;
    } else if (currentRank >= 7 && currentRank <= 10) {
      targetRank = 5;
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

      horse.rank_swap_trigger = activeName;
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

  // STEP 0: ペース事前判定（Phase1アビリティ判定用）
  const selectedPace = determinePace(resultList, raceMaster, trackCondition);

  resultList.forEach(copy => {
    applyPhase1Abilities(copy, raceInfo, trackCondition, resultList, abilityMasterData);
  });

   // STEP 1: 位置取り計算
  resultList.forEach((h) => {
    // ------------------------------------------------------------------------
    // A. 作戦の脚質判定（4種類のみ: 逃げ / 先行 / 差し / 追込）
    // ------------------------------------------------------------------------
    let tacticCategory = "";

    // 作戦がオブジェクトで渡された場合は master の style を直接参照
    if (typeof h.tactic === "object" && h.tactic !== null) {
      tacticCategory = h.tactic.style || "";
    } else {
      // 文字列の場合は作戦マスターの 4 種類へ厳密に分類
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

    // 作戦脚質による基礎ポイント（4種類固定）
    let tacticStylePt = 40; // デフォルト（差し）
    if (tacticCategory === "逃げ") {
      tacticStylePt = 90;
    } else if (tacticCategory === "先行") {
      tacticStylePt = 70;
    } else if (tacticCategory === "差し") {
      tacticStylePt = 40;
    } else if (tacticCategory === "追込") {
      tacticStylePt = 20;
    }

    // ------------------------------------------------------------------------
    // B. 馬の元脚質判定（細分化脚質: 大逃 / 好位 / 自在 / 逃追 など）
    // ------------------------------------------------------------------------
    const horseStyle = String(h.style || h.running_style || h.horse_style || "");
    let styleCalcPt = 0;

    // 「大逃」と「逃げ」を完全区別。馬独自の「好位」も先行加算（+30pt）に割り当て
    if (horseStyle.includes("自在") || horseStyle.includes("逃追")) {
      styleCalcPt = tacticStylePt * 2;
    } else if (horseStyle.includes("大逃")) {
      styleCalcPt = tacticStylePt + 50;
    } else if (horseStyle.includes("逃げ") || horseStyle === "逃") {
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

    // ------------------------------------------------------------------------
    // C. 位置取りポイント算出
    // ------------------------------------------------------------------------
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
    let styleBonusPt = 0;
    let posAddPt = 0;
    let formulaFormulaDetail = "";

    const stratPot = (h.level || 1) * 2;
    const horseBasePot = h.potential || 0;
    
    // 「力比べ」判定時の計算倍率設定
    const isChikaraKurabe = selectedBranch.name === "力比べ" || selectedBranch.name.includes("力比べ");
    const potMultiplier = isChikaraKurabe ? 3 : 1;

    const basePotVal = h.calc_potential ?? horseBasePot;
    const stratPotBase = (h.level || 1) * 2;

    // ポテンシャル（×3） ＋ 作戦レベル（×3）
    const totalPot = (basePotVal * potMultiplier) + (stratPotBase * potMultiplier);

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
      formulaFormulaDetail = `30 - ポテ:${totalPot}(${basePotVal * potMultiplier}+${stratPotBase * potMultiplier}) + ${targetStatName}:${targetVal}`;
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

        // STEP 3 内の脚質ボーナス計算部分
    let currentTacticStyle = "";
    if (typeof h.tactic === "object" && h.tactic !== null) {
      currentTacticStyle = h.tactic.style || "";
    } else {
      const tStr = String(h.tactic_style || h.target_style || h.tactic || "");
      if (tStr.includes("逃げ")) currentTacticStyle = "逃げ";
      else if (tStr.includes("先行")) currentTacticStyle = "先行";
      else if (tStr.includes("差し")) currentTacticStyle = "差し";
      else if (tStr.includes("追込")) currentTacticStyle = "追込";
    }

    if (selectedBranch.style_bonus) {
      Object.keys(selectedBranch.style_bonus).forEach(bonusStyle => {
        if (currentTacticStyle.includes(bonusStyle)) {
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
    let randomBonus = Math.random() * 1;

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
    if (styleBonusPt > 0) devDetails.push(`脚質ボーナス+${styleBonusPt}`);
    if (posAddPt > 0) devDetails.push(`位置+${posAddPt}`);
    if (extraScore > 0) devDetails.push(`展開アビ+${extraScore}`);

    const devDetailStr = devDetails.length > 0 ? ` (${devDetails.join(", ")})` : "";
    detailPartsList.push(`【展開加算】+${totalDevelopmentAdd}pt${devDetailStr}`);

    if (h.ability_buff && h.ability_buff !== 0) {
      const activeList = (h.activated_abilities && h.activated_abilities.length > 0) 
        ? ` (${h.activated_abilities.join(", ")})` 
        : "";
      const signStr = h.ability_buff > 0 ? `+${h.ability_buff}` : `${h.ability_buff}`;
      detailPartsList.push(`【環境バフ】${signStr}pt${activeList}`);
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
