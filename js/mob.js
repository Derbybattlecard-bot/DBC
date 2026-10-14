/**
 * /js/mob.js
 * モブ馬・CPU馬に関連する外部処理モジュール
 */

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
  const sex = horseSex || "牡馬";
  const isMare = sex.includes("牝");
  const isStallion = sex.includes("牡");

  if (sexLimit.includes("牝")) {
    if (sexLimit.includes("牡")) return isMare || isStallion;
    return isMare;
  }
  if (sexLimit.includes("牡")) return isStallion;
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
 * CPU戦用モブ馬抽選関数（既存維持）
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
            if (h.region && h.region !== "日本") return false;
          }

          return filterFn(h);
        });
      };

      if (isHongKong && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => h.region === "香港", isShortDist);
      } else if (isOverseas && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => h.region && h.region !== "日本", isShortDist);
      } else if (isJapanCup && (targetPot === centerX + 2 || targetPot === centerX + 1)) {
        gathered = getCandidates(h => h.region && h.region !== "日本", isShortDist);
      } else if ((isOverseas || isJapanCup) && (targetPot === centerX - 1 || targetPot === centerX - 2)) {
        gathered = getCandidates(h => !h.region || h.region === "日本" || (Array.isArray(h.ability) && h.ability.includes("国境突破")), isShortDist);
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

    while (selectedMobs.length < 14) {
      const fallback = allHorses.find(h => {
        const hId = String(h.horse_id).padStart(4, '0');
        if (raceUsedIds.has(hId)) return false;
        if (!isValidSurface(h, race.surface)) return false;
        if (!isOverseas && !isJapanCup && h.region && h.region !== "日本") return false;
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

    racesMobIds[rIdx] = selectedMobs;
  });

  return racesMobIds;
}

/**
 * オンライン対戦用モブ馬抽選関数（両プレイヤーのデック全頭数などを渡して完全に除外して抽選）
 */
export function generateOnlineMobEntries(races, excludedIdsSet, HORSES_MASTER) {
  const allHorses = Object.values(HORSES_MASTER || {});
  const validFallbackHorseId = allHorses[0] ? String(allHorses[0].horse_id).padStart(4, '0') : "0001";
  const mobIds = {};

  races.forEach((race, rIdx) => {
    const surface = race.surface || "芝";
    const sexLimit = race.sex || "制限なし";
    const distance = Number(race.distance || 2000);

    const raceUsedIds = new Set(excludedIdsSet);

    const mobPool = allHorses.filter(h => {
      const hId = String(h.horse_id).padStart(4, '0');
      if (raceUsedIds.has(hId)) return false;
      if (getHorsePotential(h, surface) <= 0) return false;
      if (!isValidSex(h.sex, sexLimit)) return false;
      if (!isValidDistance(h, distance)) return false;
      return true;
    }).sort(() => Math.random() - 0.5);

    const selected = mobPool.slice(0, 14).map(m => String(m.horse_id).padStart(4, '0'));
    
    while (selected.length < 14) {
      selected.push(validFallbackHorseId);
    }
    mobIds[rIdx] = selected;
  });

  return mobIds;
}
