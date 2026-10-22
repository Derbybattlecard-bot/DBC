/**
 * /js/mob.js
 * モブ馬・CPU馬に関連する外部処理モジュール
 */

const OVERSEAS_REGIONS = new Set([
  "英国", "香港", "首国", "米国", "愛国", "仏国",
  "豪洲", "豪州", "独国", "伊国", "加国", "沙国", "新国", "星港", "星国"
]);

function isForeignHorse(h) {
  if (!h) return false;
  const reg = String(h.region || "").trim();
  if (!reg || reg === "日本" || reg === "地方") return false;
  
  if (OVERSEAS_REGIONS.has(reg)) return true;
  if (/^[\u4E00-\u9FFF]{2}$/.test(reg)) return true;

  return false;
}

export function determineStrategy(horseId, style, gateNum, strategyMaster, isCpuRival = false) {
  const idStr = String(horseId || "");
  const digits = idStr.replace(/\D/g, "");
  const key1 = digits.length > 0 ? parseInt(digits.slice(-1), 10) : Math.floor(Math.random() * 10);

  const parsedGate = parseInt(gateNum, 10);
  const validGateNum = (!isNaN(parsedGate) && parsedGate >= 1 && parsedGate <= 16) ? parsedGate : 1;
  const key2 = validGateNum % 10;

  const A = (key1 + key2) % 4;
  const B = (key1 * key2) % 5;
  let strategyLevel = B + 1;

  if (isCpuRival && strategyLevel > 3) {
    strategyLevel = 3;
  }

  // ★特殊仕様: 脚質「逃追」の場合は馬番の奇数/偶数で決定
  // 奇数番: 「ハイラップ逃げ」 / 偶数番: 「限界まで脚をためる」
  if (style === "逃追") {
    const selectedTactic = (validGateNum % 2 !== 0) ? "ハイラップ逃げ" : "限界まで脚をためる";
    return { tactic: selectedTactic, level: strategyLevel };
  }

  const stratList = Array.isArray(strategyMaster) ? strategyMaster : Object.values(strategyMaster || {});
  let styleStrategies = stratList.filter(s => s.category === style || s.style === style);

  if (styleStrategies.length === 0) {
    styleStrategies = stratList.length > 0 ? stratList : [{ name: "おまかせ" }];
  }

  const selectedStrategyIndex = A % styleStrategies.length;
  const targetStrategy = styleStrategies[selectedStrategyIndex] || {};
  const selectedStrategyName = targetStrategy.name || targetStrategy.strategy_name || targetStrategy.tactic || "おまかせ";

  return { tactic: selectedStrategyName, level: strategyLevel };
}

export function drawTrackCondition() {
  const rand = Math.random() * 100;
  if (rand < 75) return '良';
  if (rand < 93) return '稍重';
  if (rand < 98) return '重';
  return '不良';
}

export function generateTrackConditions(series) {
  const isSingleDay = series?.is_single_day || series?.is_same_day || series?.single_day || 
                      (series?.series_name && (series.series_name.includes("ドバイ") || series.series_name.includes("香港")));

  if (isSingleDay) {
    const unifiedCondition = drawTrackCondition();
    return Array(5).fill(unifiedCondition);
  } else {
    return Array.from({ length: 5 }, () => drawTrackCondition());
  }
}

function getHorsePotential(horse, surface) {
  if (!horse) return 0;
  const isTurf = !surface || surface.includes('芝');
  const isDirt = surface && (surface.includes('ダート') || surface.includes('ダ'));

  if (isTurf) {
    if (horse.turf_potential !== undefined && horse.turf_potential !== null) return Number(horse.turf_potential);
    if (horse.aptitude && horse.aptitude.turf_potential !== undefined) return Number(horse.aptitude.turf_potential);
    return 0;
  } else if (isDirt) {
    if (horse.dirt_potential !== undefined && horse.dirt_potential !== null) return Number(horse.dirt_potential);
    if (horse.aptitude && horse.aptitude.dirt_potential !== undefined) return Number(horse.aptitude.dirt_potential);
    return 0;
  }
  return 0;
}

function isValidSurface(horse, surface) {
  if (!horse) return false;
  return getHorsePotential(horse, surface) > 0;
}

function isValidSex(horseSex, sexLimit) {
  if (!sexLimit || sexLimit === "制限なし" || sexLimit === "なし") return true;
  const sex = String(horseSex || "牡馬").trim();
  const isMare = sex.includes("牝");
  const isStallion = sex.includes("牡");
  const isGelding = sex.includes("セン") || sex.includes("せん");

  const limitStr = String(sexLimit);

  if (limitStr.includes("牝")) {
    if (limitStr.includes("牡") || limitStr.includes("制限なし")) return isMare || isStallion || isGelding;
    return isMare;
  }
  if (limitStr.includes("牡")) {
    return isStallion || isGelding;
  }
  return true;
}

function getHorseDistanceString(horse) {
  if (!horse) return '';
  const minD = horse.min_distance ?? horse.aptitude?.min_distance;
  const maxD = horse.max_distance ?? horse.aptitude?.max_distance;

  if (minD !== undefined && maxD !== undefined && minD !== null && maxD !== null && minD !== '' && maxD !== '') {
    return minD === maxD ? `${minD}` : `${minD}-${maxD}`;
  }
  if (horse.distance) return String(horse.distance);
  return '';
}

function isValidDistance(horse, raceDistance, isShortDistanceRelaxed = false) {
  if (!horse) return false;
  const target = parseInt(raceDistance, 10);
  if (isNaN(target)) return true;
  
  let minD = horse.min_distance ?? horse.aptitude?.min_distance;
  let maxD = horse.max_distance ?? horse.aptitude?.max_distance;

  if (isShortDistanceRelaxed && target <= 1200) {
    if (minD !== undefined && minD !== null) minD = Math.min(Number(minD), 1600);
    if (maxD !== undefined && maxD !== null) maxD = Math.max(Number(maxD), 1600);
  }

  if (minD !== undefined && maxD !== undefined && minD !== null && maxD !== null && minD !== '' && maxD !== '') {
    return target >= Number(minD) && target <= Number(maxD);
  }

  const distStr = getHorseDistanceString(horse);
  if (!distStr) return true;

  if (distStr.includes('-')) {
    const [minStr, maxStr] = distStr.split('-');
    let minV = parseInt(minStr, 10);
    let maxV = parseInt(maxStr, 10);
    if (isShortDistanceRelaxed && target <= 1200) maxV = Math.max(maxV, 1600);
    return target >= minV && target <= maxV;
  } else {
    let dVal = parseInt(distStr, 10);
    if (isShortDistanceRelaxed && target <= 1200) return target >= Math.min(dVal, 1600) && target <= Math.max(dVal, 1600);
    return dVal === target;
  }
}

function isFrom1992OrLater(horse) {
  if (!horse) return false;
  const gen = horse.generation || horse.year || horse.birth_year || horse.era;
  if (!gen) return true;

  const genNum = parseInt(gen, 10);
  if (isNaN(genNum)) return true;

  if (genNum >= 1992) return true;
  if (genNum >= 92 && genNum < 100) return true;
  return false;
}

/**
 * CPU戦用モブ馬抽選関数（保険として15頭抽選し、被りを除外して14頭を確定）
 */
export function generateMobEntries(races, currentSeries, globalUserData, selectedEntries, HORSES_MASTER) {
  const limits = currentSeries?.potential_limit || { max_total_potential: 95 };
  const maxTotalPt = limits.max_total_potential || 95;
  const centerX = Math.round(maxTotalPt / 5);

  const allHorses = Object.values(HORSES_MASTER || {});

  const allDeckHorseIds = new Set();
  if (globalUserData && Array.isArray(globalUserData.decks)) {
    globalUserData.decks.forEach(deck => {
      if (deck && Array.isArray(deck.horse_ids)) {
        deck.horse_ids.forEach(id => {
          if (id !== null && id !== undefined && id !== '') {
            allDeckHorseIds.add(String(id).padStart(4, '0'));
          }
        });
      }
    });
  }

  const excludedHorseIds = new Set([
    ...allDeckHorseIds,
    ...(selectedEntries || []).filter(Boolean).map(id => String(id).padStart(4, '0'))
  ]);

  const racesMobIds = {};

  races.forEach((race, rIdx) => {
    const raceSexLimit = race.sex || currentSeries?.sex || "制限なし";
    const raceDistance = Number(race.distance || 2000);
    
    const trackName = race.track || "";
    const raceName = race.race_name || "";

    const isHongKong = trackName.includes("香港") || trackName.includes("沙田") || raceName.includes("香港");
    const isOverseas = isHongKong || ["ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム", "メイダン", "デルマー", "サンタアニタ", "チャーチルダウンズ", "ベルモントパーク"].some(t => trackName.includes(t));
    const isJapanCup = raceName.includes("ジャパンカップ");
    const isShortDist = raceDistance <= 1200;

    const raceUsedIds = new Set([...excludedHorseIds]);

    const potTargetCounts = {
      [centerX]: 3,
      [centerX - 1]: 4,
      [centerX + 1]: 2,
      [centerX - 2]: 4,
      [centerX + 2]: 1
    };

    const selectedMobs = [];

    Object.keys(potTargetCounts).forEach(potStr => {
      const targetPot = Number(potStr);
      const neededCount = potTargetCounts[targetPot];
      let gathered = [];

      const getCandidates = (filterFn, relaxDist = false) => {
        return allHorses.filter(h => {
          const hId = String(h.horse_id).padStart(4, '0');
          if (raceUsedIds.has(hId)) return false;
          if (getHorsePotential(h, race.surface) !== targetPot) return false;
          if (!isValidSex(h.sex || "牡馬", raceSexLimit)) return false;
          if (!isValidSurface(h, race.surface)) return false;
          if (!isValidDistance(h, raceDistance, relaxDist)) return false;

          if (!isOverseas && !isJapanCup) {
            if (isForeignHorse(h)) return false;
          }

          return filterFn(h);
        });
      };

      if (isHongKong && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => h.region === "香港", isShortDist);
      } else if (isOverseas && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => isForeignHorse(h), isShortDist);
      } else if (isJapanCup && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => isForeignHorse(h), isShortDist);
      } else if ((isOverseas || isJapanCup) && (targetPot === centerX - 1 || targetPot === centerX - 2)) {
        gathered = getCandidates(h => !isForeignHorse(h) || (Array.isArray(h.ability) && h.ability.includes("国境突破")), isShortDist);
      }

      if (gathered.length < neededCount) {
        const normalPool = getCandidates(h => isFrom1992OrLater(h), isShortDist);
        normalPool.sort(() => Math.random() - 0.5);
        for (const h of normalPool) {
          if (gathered.length >= neededCount) break;
          const hId = String(h.horse_id).padStart(4, '0');
          if (!gathered.some(g => String(g.horse_id).padStart(4, '0') === hId)) {
            gathered.push(h);
          }
        }
      }

      if (gathered.length < neededCount) {
        const relaxPool = getCandidates(h => true, true);
        relaxPool.sort(() => Math.random() - 0.5);
        for (const h of relaxPool) {
          if (gathered.length >= neededCount) break;
          const hId = String(h.horse_id).padStart(4, '0');
          if (!gathered.some(g => String(g.horse_id).padStart(4, '0') === hId)) {
            gathered.push(h);
          }
        }
      }

      gathered.slice(0, neededCount).forEach(mob => {
        const mId = String(mob.horse_id).padStart(4, '0');
        if (!selectedMobs.includes(mId)) {
          selectedMobs.push(mId);
          raceUsedIds.add(mId);
        }
      });
    });

    // ★合計16頭立て（プレイヤー1 + CPU1 + モブ14）にするため、モブは14頭確定
    while (selectedMobs.length < 15) {
      const fallback = allHorses.find(h => {
        const hId = String(h.horse_id).padStart(4, '0');
        if (raceUsedIds.has(hId)) return false;
        if (!isValidSurface(h, race.surface)) return false;
        if (!isValidSex(h.sex || "牡馬", raceSexLimit)) return false;
        if (!isOverseas && !isJapanCup && isForeignHorse(h)) return false;
        return true;
      });
      if (fallback) {
        const mId = String(fallback.horse_id).padStart(4, '0');
        selectedMobs.push(mId);
        raceUsedIds.add(mId);
      } else {
        selectedMobs.push("0000");
      }
    }

    racesMobIds[rIdx] = selectedMobs.slice(0, 14);
  });

  return racesMobIds;
}

/**
 * オンライン対戦用モブ馬抽選関数
 */
export function generateOnlineMobEntries(races, excludedIdsSet, HORSES_MASTER) {
  const allHorses = Object.values(HORSES_MASTER || {});
  const validFallbackHorseId = allHorses[0] ? String(allHorses[0].horse_id).padStart(4, '0') : "0001";
  const mobIds = {};

  races.forEach((race, rIdx) => {
    const surface = race.surface || "芝";
    const sexLimit = race.sex || "制限なし";
    const distance = Number(race.distance || 2000);
    const trackName = race.track || "";
    const raceName = race.race_name || "";

    const isOverseas = ["香港", "沙田", "ロンシャン", "パリロンシャン", "サンクルー", "アスコット", "ニューマーケット", "エプソム", "メイダン", "デルマー", "サンタアニタ", "チャーチルダウンズ", "ベルモントパーク"].some(t => trackName.includes(t)) || raceName.includes("香港");
    const isJapanCup = raceName.includes("ジャパンカップ");

    const raceUsedIds = new Set(excludedIdsSet);

    const mobPool = allHorses.filter(h => {
      const hId = String(h.horse_id).padStart(4, '0');
      if (raceUsedIds.has(hId)) return false;
      if (getHorsePotential(h, surface) <= 0) return false;
      if (!isValidSex(h.sex, sexLimit)) return false;
      if (!isValidDistance(h, distance)) return false;
      
      if (!isOverseas && !isJapanCup && isForeignHorse(h)) return false;

      return true;
    }).sort(() => Math.random() - 0.5);

    const selected = mobPool.slice(0, 15).map(m => String(m.horse_id).padStart(4, '0'));
    
    while (selected.length < 15) {
      const fallback = allHorses.find(h => {
        const hId = String(h.horse_id).padStart(4, '0');
        if (raceUsedIds.has(hId)) return false;
        if (!isValidSurface(h, surface)) return false;
        if (!isValidSex(h.sex, sexLimit)) return false;
        if (!isOverseas && !isJapanCup && isForeignHorse(h)) return false;
        return true;
      });
      if (fallback) {
        const mId = String(fallback.horse_id).padStart(4, '0');
        selected.push(mId);
        raceUsedIds.add(mId);
      } else {
        selected.push(validFallbackHorseId);
        break;
      }
    }
    
    mobIds[rIdx] = selected.slice(0, 14);
  });

  return mobIds;
}
