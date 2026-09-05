// js/race_calculator.js

// --- 新規追加: アビリティ処理関数 ---
// Phase 1: 競馬場・馬場・距離などの条件に基づく基礎パラメータ増減
function applyPhase1Abilities(horse, raceInfo, trackCondition) {
  if (!horse.ability || !Array.isArray(horse.ability)) return;

  horse.ability.forEach(abilityName => {
    let buff = 0;

    // 【競馬場・コース系】
    if (abilityName === "中山マイスター" && raceInfo?.track === "中山") buff = 100;
    if (abilityName === "府中の鬼" && raceInfo?.track === "東京") buff = 51;
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

    // 【枠・馬番系】（gate_number を使用。データが無ければスルー）
    if (abilityName === "最内一閃" && horse.gate_number === 1) buff = 2;
    if (abilityName === "大外大歓迎" && horse.gate_number === 8) buff = 2; 

    // バフ適用（既存の基本5ステータス＋ポテンシャルにのみ加算。新規パラメータは絶対に追加しない！）
    if (buff !== 0) {
      horse.speed = (horse.speed || 0) + buff;
      horse.stamina = (horse.stamina || 0) + buff;
      horse.sharp = (horse.sharp || 0) + buff;
      horse.jizoku = (horse.jizoku || 0) + buff;
      horse.guts = (horse.guts || 0) + buff;
      horse.current_potential = (horse.current_potential || 0) + buff;
      
      // ログ・表示用のバフ記録（純粋なスコア確認用）
      horse.ability_buff = (horse.ability_buff || 0) + buff;
    }
  });
}

// Phase 2: 位置取りスコア等へのボーナス
function applyPhase2Abilities(horse, positionPoint) {
  if (!horse.ability || !Array.isArray(horse.ability)) return positionPoint;
  
  let newPoint = positionPoint;
  horse.ability.forEach(abilityName => {
    if (abilityName === "ロケットスタート") {
      newPoint += 20; // 大きく前に行く
    }
  });
  return newPoint;
}

// Phase 4: 最終スコアへの展開依存ボーナス
function applyPhase4Abilities(horse, pace, branchName) {
  if (!horse.ability || !Array.isArray(horse.ability)) return 0;

  let extraScore = 0;
  horse.ability.forEach(abilityName => {
    // 展開「前残り」の場合のバフ（スコア加算で表現）
    if ((abilityName === "電光石火" || abilityName === "衝撃の捲り" || abilityName === "異次元の捲り" || abilityName === "怒涛の捲り") && branchName.includes("前残り")) {
      extraScore += 10;
    }
    // 乱ペース時に最終スコア加算
    if ((abilityName === "王道" || abilityName === "絶対王者") && pace.includes("乱ペース")) {
      extraScore += 10;
    }
  });
  return extraScore;
}
// ----------------------------------------

// 1. ステータス箱の生成（計算専用コピー）
function createRaceHorseInstance(horse, raceInfo, trackCondition) {
  const instance = JSON.parse(JSON.stringify(horse));
  const isTurf = raceInfo?.surface === '芝';

  // 芝・ダートそれぞれのポテンシャル取得
  const turfPot = horse.turf_potential || horse.potential || 0;
  const dirtPot = horse.dirt_potential || horse.potential || 0;

  instance.current_potential = isTurf ? turfPot : dirtPot;

  // ダート出走時、ダートのポテンシャルが芝より高い場合のみ差分を加算
  if (!isTurf) {
    const potDiff = dirtPot - turfPot;
    if (potDiff > 0) {
      instance.speed = (instance.speed || 0) + potDiff;
      instance.stamina = (instance.stamina || 0) + potDiff;
      instance.sharp = (instance.sharp || 0) + potDiff;
      instance.jizoku = (instance.jizoku || 0) + potDiff;
      instance.guts = (instance.guts || 0) + potDiff;
    }
  }

  // --- 新規追加: アビリティ適用 (Phase 1) ---
  applyPhase1Abilities(instance, raceInfo, trackCondition);

  const levelVal = horse.level || 1;
  const matchedStrat = horse.stratObj;
  
  // 作戦によるステータス加算値（作SPD, 作STM など）
  instance.strat_speed = (matchedStrat ? matchedStrat.speed : 3) + levelVal;
  instance.strat_stamina = (matchedStrat ? matchedStrat.stamina : 3) + levelVal;
  instance.strat_sharp = (matchedStrat ? matchedStrat.sharp : 3) + levelVal;
  instance.strat_jizoku = (matchedStrat ? matchedStrat.jizoku : 3) + levelVal;
  instance.strat_guts = (matchedStrat ? matchedStrat.guts : 3) + levelVal;

  return instance;
}

// 2. 位置取り・隊列計算（1番手〜16番手判定）
function calculatePositions(horses) {
  horses.forEach((h, i) => {
    h.index = i;
    const style = h.style || h.running_style || "自在";

    let basePos = 0;
    if (style === "逃げ") basePos = 90;
    else if (style === "先行") basePos = 70;
    else if (style === "差し") basePos = 40;
    else if (style === "追込") basePos = 20;
    else basePos = 50;

    const randomVal = Math.floor(Math.random() * 15);
    let positionPoint = basePos + (h.strat_speed || 0) + randomVal;

    // --- 新規追加: アビリティ適用 (Phase 2) ---
    h.positionPoint = applyPhase2Abilities(h, positionPoint);
  });

  const sorted = [...horses].sort((a, b) => b.positionPoint - a.positionPoint);
  sorted.forEach((h, rank) => {
    h.positionRank = rank + 1; // 1番手〜16番手
    h.positionScore = 16 - rank; // 先頭=16pt 〜 最後方=1pt
  });
}

// 3. ペース判定
function determineRacePace(horses, raceMasterData, trackCondition) {
  const isTough = (trackCondition === "重" || trackCondition === "不良");
  const master = isTough 
    ? raceMasterData.pace_decision_master.heavy_or_bad
    : raceMasterData.pace_decision_master.good_or_slightly_heavy;

  const escapeHorses = horses.filter(h => {
    return (h.tactic === "逃げ" || h.style === "逃げ" || h.running_style === "逃げ");
  });

  const escapeCount = escapeHorses.length;
  let table = null;

  if (escapeCount <= 1) {
    const stratName = escapeCount === 1 ? escapeHorses[0].strat_name : "マイペース逃げ";
    table = master["1_horse"].by_strategy[stratName] || master["1_horse"].by_strategy["平均ラップ逃げ"];
  } else if (escapeCount === 2) {
    const stratName = escapeHorses[0].strat_name;
    table = master["2_horses"].by_lead_horse_strategy[stratName] || master["2_horses"].by_lead_horse_strategy["other"];
  } else if (escapeCount === 3) {
    table = master["3_horses"].probabilities;
  } else if (escapeCount === 4) {
    table = master["4_horses"].probabilities;
  } else {
    table = master["5_or_more_horses"].probabilities;
  }

  let rand = Math.random();
  let cumulative = 0;
  for (const [pace, prob] of Object.entries(table)) {
    cumulative += prob;
    if (rand <= cumulative) return pace;
  }
  return "ミドルペース";
}

// 4. スコア計算および着順確定
function calculateScoresAndSort(horses, pace, raceMasterData) {
  const branches = raceMasterData.branches_by_pace[pace];
  const selectedBranch = branches[Math.floor(Math.random() * branches.length)];

  horses.forEach(h => {
    let paramScore = 0;
    let posAddPt = 0;
    let styleBonusPt = 0;
    const detailParts = [];

    // --- A. 特殊計算式（波乱の展開など） ---
    if (selectedBranch.formula === "30 - potential + random_stat_1") {
      const targetPool = selectedBranch.target_pool;
      const randStatKey = targetPool[Math.floor(Math.random() * targetPool.length)];
      const potVal = h.current_potential || h.potential || 50;
      const basePotScore = 30 - potVal;

      const horseStat = h[randStatKey] || 0;
      const stratStat = h[`strat_${randStatKey}`] || 0;
      const totalStat = horseStat + stratStat;

      paramScore = basePotScore + totalStat;
      detailParts.push(`(30-ポテ:${potVal})`);
      
      let statNameJa = randStatKey;
      if (randStatKey === 'speed') statNameJa = 'SPD';
      else if (randStatKey === 'stamina') statNameJa = 'STM';
      else if (randStatKey === 'sharp') statNameJa = '瞬発';
      else if (randStatKey === 'jizoku') statNameJa = '持続';
      else if (randStatKey === 'guts') statNameJa = '根性';
      
      detailParts.push(`${statNameJa}:${totalStat}`);
    } 
    // --- B. 標準・キー能力算定 ---
    else if (selectedBranch.key_stats) {
      selectedBranch.key_stats.forEach(key => {
        if (key === "potential" || key === "current_potential") {
          const val = h.current_potential || h.potential || 0;
          paramScore += val;
          detailParts.push(`ポテ:${val}`);
        } else {
          const horseStat = h[key] || 0;
          const stratStat = h[`strat_${key}`] || 0;
          const totalStat = horseStat + stratStat;

          paramScore += totalStat;
          
          let statNameJa = key;
          if (key === 'speed') statNameJa = 'SPD';
          else if (key === 'stamina') statNameJa = 'STM';
          else if (key === 'sharp') statNameJa = '瞬発';
          else if (key === 'jizoku') statNameJa = '持続';
          else if (key === 'guts') statNameJa = '根性';
          
          detailParts.push(`${statNameJa}:${totalStat}`);
        }
      });
    }

    // 力比べの展開時の全馬ベースアップ補正（+70pt）
    if (selectedBranch.name === "力比べの展開") {
      paramScore += 70;
      detailParts.push("力比べ:70");
    }

    // --- C. 位置ボーナス処理 ---
    if (selectedBranch.position_bonus_type) {
      if (selectedBranch.position_bonus_type === "direct_asc") {
        posAddPt = h.positionRank; 
      } else if (selectedBranch.position_bonus_type === "direct_desc") {
        posAddPt = 17 - h.positionRank; 
      }
      paramScore += posAddPt;
    }

    // --- D. 脚質ボーナス (style_bonus) 加算 ---
    if (selectedBranch.style_bonus) {
      // 作戦オブジェクトの脚質のみを参照（馬本来の脚質への流出を防ぐ）
      const currentStyle = h.stratObj?.style || h.stratObj?.running_style || h.tactic_style || "";
      
      if (selectedBranch.style_bonus[currentStyle]) {
        styleBonusPt = selectedBranch.style_bonus[currentStyle];
        paramScore += styleBonusPt;
      }
    }

    // --- 新規追加: アビリティ適用 (Phase 4 展開依存のスコア加算) ---
    const abilityBonusPt = applyPhase4Abilities(h, pace, selectedBranch.name);
    paramScore += abilityBonusPt;
    if (abilityBonusPt > 0) {
      detailParts.push(`アビリティ:+${abilityBonusPt}`);
    }

    const levelScore = (h.level || 1) * 2;
    const randScore = Math.random() * 5;

    h.random_diff = randScore;
    h.finalScore = paramScore + randScore + levelScore;

    // --- 詳細テキストの見やすいフォーマット化 ---
    const statDetailStr = detailParts.join("+");
    let scoreBreakdown = `展開:${paramScore - posAddPt - styleBonusPt - abilityBonusPt}[${statDetailStr}]`;
    if (posAddPt > 0) scoreBreakdown = `位置:+${posAddPt} | ${scoreBreakdown}`;
    if (styleBonusPt > 0) scoreBreakdown = `${scoreBreakdown} | 脚質:+${styleBonusPt}`;
    if (h.ability_buff > 0) scoreBreakdown = `${scoreBreakdown} | 基礎バフ:+${h.ability_buff}`; // Phase 1のバフ量も表示
    
    h.detailText = `${scoreBreakdown} | Lv:+${levelScore} | 乱:+${randScore.toFixed(1)}`;
  });

  // タイブレーク処理
  const tieKeys = raceMasterData.tie_breakers || [];
  horses.sort((a, b) => {
    if (Math.abs(b.finalScore - a.finalScore) > 0.0001) return b.finalScore - a.finalScore;
    
    for (let tieKey of tieKeys) {
      let key = null;
      if (tieKey.includes('guts')) key = 'guts';
      else if (tieKey.includes('potential')) key = 'potential';
      else if (tieKey.includes('tactic_level')) key = 'level';
      else if (tieKey.includes('sharp')) key = 'sharp';
      else if (tieKey.includes('jizoku')) key = 'jizoku';
      else if (tieKey.includes('speed')) key = 'speed';
      else if (tieKey.includes('stamina')) key = 'stamina';
      // 意図しない「パワー」などの架空パラメータは削除しました
      else if (tieKey.includes('乱数差')) key = 'random_diff';
      else if (tieKey.includes('ID')) key = 'horse_id';
      else if (tieKey.includes('五十音')) key = 'name';

      if (key && a[key] !== undefined && b[key] !== undefined && a[key] !== b[key]) {
         if (typeof a[key] === "number") {
             return b[key] - a[key];
         } else {
             return String(a[key]).localeCompare(String(b[key]));
         }
      }
    }
    return 0;
  });

  return {
    results: horses,
    branch: selectedBranch
  };
}

// 5. メイン実行関数
export function runRaceLogic(activeHorses, raceMasterData, trackCondition, raceInfo) {
  // アビリティ処理のために trackCondition と raceInfo の両方を渡すよう変更
  const raceHorses = activeHorses.map(h => createRaceHorseInstance(h, raceInfo, trackCondition));

  calculatePositions(raceHorses);
  const currentPace = determineRacePace(raceHorses, raceMasterData, trackCondition);
  const calculationData = calculateScoresAndSort(raceHorses, currentPace, raceMasterData);

  return {
    results: calculationData.results,
    pace: currentPace,
    branch: calculationData.branch
  };
}
