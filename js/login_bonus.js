import { cardRenderer } from './card_renderer.js';

// 仕様書準拠のレアリティ定義（全17種類）
export const RARITY_CONFIG = {
  'SER': { name: 'シークレットレア', rank: 'SSS', bg: 'linear-gradient(45deg, #2c3e50, #000000, #8a2be2)', shadow: '0 0 30px rgba(138, 43, 226, 0.9)' },
  'MTR': { name: 'マジェスティックレア', rank: 'SSS', bg: 'linear-gradient(45deg, #8b0000, #4a0000, #ffd700)', shadow: '0 0 30px rgba(255, 215, 0, 0.9)' },
  'INF': { name: 'インフィニティレア', rank: 'SS', bg: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)', shadow: '0 0 30px rgba(0, 255, 255, 0.9)' },
  'ABR': { name: 'アブソリュートレア', rank: 'SS', bg: 'linear-gradient(45deg, #4b0082, #000080, #00ffff)', shadow: '0 0 30px rgba(0, 255, 255, 0.8)' },
  'DGR': { name: 'ドラゴンレア', rank: 'S', bg: 'linear-gradient(45deg, #8b0000, #ff4500, #ffd700)', shadow: '0 0 25px rgba(255, 69, 0, 0.9)' },
  'MIR': { name: 'ミリオネアレア', rank: 'S', bg: 'linear-gradient(45deg, #006400, #2e8b57, #ffd700)', shadow: '0 0 25px rgba(50, 205, 50, 0.9)' },
  'ULR': { name: 'アルティメットレア', rank: 'S', bg: 'linear-gradient(45deg, #ffd700, #ff4500, #ff0055)', shadow: '0 0 25px rgba(255, 215, 0, 0.9)' },
  'LGR': { name: 'レジェンダリーレア', rank: 'A', bg: 'linear-gradient(45deg, #b8860b, #ffd700, #8b0000)', shadow: '0 0 25px rgba(218, 165, 32, 0.8)' },
  'CLR': { name: 'クラシカルレア', rank: 'A', bg: 'linear-gradient(45deg, #d2691e, #ff8c00, #ffd700)', shadow: '0 0 25px rgba(210, 105, 30, 0.8)' },
  'TRR': { name: 'トラディショナルレア', rank: 'A', bg: 'linear-gradient(45deg, #4b0082, #8a2be2, #d4af37)', shadow: '0 0 25px rgba(138, 43, 226, 0.8)' },
  'RER': { name: 'レトロレア', rank: 'B', bg: 'linear-gradient(45deg, #708090, #c0c0c0, #4682b4)', shadow: '0 0 18px rgba(192, 192, 192, 0.7)' },
  'ANR': { name: 'アンティークレア', rank: 'B', bg: 'linear-gradient(45deg, #2e8b57, #3cb371, #8fbc8f)', shadow: '0 0 18px rgba(46, 139, 87, 0.7)' },
  'VIR': { name: 'ビンテージレア', rank: 'B', bg: 'linear-gradient(45deg, #1e90ff, #00bfff, #87cefa)', shadow: '0 0 18px rgba(30, 144, 255, 0.7)' },
  'PRR': { name: 'プレミアレア', rank: 'B', bg: 'linear-gradient(45deg, #9370db, #ba55d3, #ee82ee)', shadow: '0 0 18px rgba(186, 85, 211, 0.7)' },
  'FRR': { name: 'フロンティアレア', rank: 'B', bg: 'linear-gradient(45deg, #8b4513, #cd853f, #d2691e)', shadow: '0 0 18px rgba(205, 133, 63, 0.7)' },
  'SPR': { name: 'スペシャルレア', rank: 'C', bg: 'linear-gradient(45deg, #32cd32, #00ff7f, #98fb98)', shadow: '0 0 15px rgba(50, 205, 50, 0.6)' },
  'NOR': { name: 'ノーマル', rank: 'NOR', bg: 'linear-gradient(45deg, #555555, #888888, #aaaaaa)', shadow: '0 0 12px rgba(136, 136, 136, 0.5)' }
};

// 通常時の確率テーブル (合計 100%)
// Bランク5種類（RER, ANR, VIR, PRR, FRR）を各1.6%（計8.0%）で均等割り
const NORMAL_PROBABILITY_TABLE = [
  { code: 'SER', prob: 0.005 },
  { code: 'MTR', prob: 0.005 },
  { code: 'INF', prob: 0.005 },
  { code: 'ABR', prob: 0.005 },
  { code: 'DGR', prob: 0.005 },
  { code: 'MIR', prob: 0.005 },
  { code: 'ULR', prob: 0.010 },
  { code: 'LGR', prob: 0.010 },
  { code: 'CLR', prob: 0.010 },
  { code: 'TRR', prob: 0.010 },
  { code: 'RER', prob: 0.016 },
  { code: 'ANR', prob: 0.016 },
  { code: 'VIR', prob: 0.016 },
  { code: 'PRR', prob: 0.016 },
  { code: 'FRR', prob: 0.016 },
  { code: 'SPR', prob: 0.030 },
  { code: 'NOR', prob: 0.820 }
];

// ポイント別許可対象ランクプール
const POINT_RANK_POOLS = {
  2:  ['B', 'C'],
  3:  ['A', 'B', 'C'],
  4:  ['S', 'A', 'B', 'C'],
  5:  ['SS', 'S', 'A', 'B', 'C'],
  6:  ['SSS', 'SS', 'S', 'A', 'B', 'C'],
  7:  ['SSS', 'SS', 'S', 'A', 'B'],
  8:  ['SSS', 'SS', 'S', 'A'],
  9:  ['SSS', 'SS', 'S'],
  10: ['SSS', 'SS'],
  12: ['SSS']
};

function injectCutInStyles() {
  if (document.getElementById('login-cutin-style')) return;
  const style = document.createElement('style');
  style.id = 'login-cutin-style';
  style.textContent = `
    .cutin-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex; 
      justify-content: center; 
      align-items: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
      box-sizing: border-box;
    }
    .cutin-backdrop.active {
      opacity: 1; pointer-events: auto;
    }

    .dynamic-banners {
      position: absolute;
      top: 8vh;
      left: 0; width: 100%;
      display: flex;
      flex-direction: column;
      z-index: 20;
      transition: opacity 0.3s ease;
      overflow-x: hidden;
    }

    .banner-row {
      width: 100%;
      height: 0;
      transition: height 0.25s ease-out;
    }
    .banner-row.open {
      height: 64px;
    }

    .slot-banner {
      width: 100%; height: 52px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; letter-spacing: 1px; font-weight: 900;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.15, 0.85, 0.35, 1.2);
    }
    .slot-banner.in { transform: translateX(0); }

    .bg-ability { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e5128 20%, #4e9f3d 80%, rgba(0,0,0,0) 100%); color: #d8f3dc; font-size: 1.15rem; }
    .bg-surface-turf { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e7e34 20%, #28a745 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .bg-surface-dirt { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #5c2e0b 20%, #8b4513 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .bg-dist { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #2a9d8f 20%, #e9c46a 80%, rgba(0,0,0,0) 100%); color: #112233; }
    .bg-gen { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #0d3b66 20%, #0077b6 80%, rgba(0,0,0,0) 100%); color: #70d6ff; }
    .bg-name { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #7209b7 20%, #f72585 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.8); }
    .bg-rare { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #b8860b 20%, #ffd700 80%, rgba(0,0,0,0) 100%); color: #3a2500; text-shadow: 0 0 8px rgba(255,255,255,0.6); }

    .cutin-card-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 90%;
      max-width: 320px;
      transform: translateY(-4vh) scale(0.5);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.3s ease;
      z-index: 10;
    }
    .cutin-card-box.in { 
      transform: translateY(-4vh) scale(1); 
      opacity: 1; 
    }

    .card-render-inner {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.8);
      background: #ffffff;
      overflow: hidden;
    }

    .rare-banner-slot {
      position: relative;
      width: 108%;
      height: 52px;
      z-index: 30;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// 馬IDから西暦4桁を取得
export function getGenerationYear(horseOrId) {
  if (!horseOrId) return '----';
  let idStr = typeof horseOrId === 'object' ? String(horseOrId.horse_id || horseOrId.id || '') : String(horseOrId || '');
  if (idStr.length >= 2) {
    const genYY = idStr.substring(0, 2);
    const yyNum = parseInt(genYY, 10);
    if (!isNaN(yyNum)) {
      const century = yyNum >= 50 ? '19' : '20';
      return `${century}${genYY}`;
    }
  }
  let horse = typeof horseOrId === 'object' ? horseOrId : cardRenderer.getHorse(horseOrId);
  const year = horse?.generation_year || horse?.birth_year || horse?.generation || horse?.gen_year;
  return year ? String(year) : '----';
}

// 世代表記を返す関数
export function parseGeneration(horseOrId) {
  let idStr = typeof horseOrId === 'object' ? String(horseOrId.horse_id || horseOrId.id || '') : String(horseOrId || '');
  if (idStr.length >= 2) {
    const genYY = idStr.substring(0, 2);
    if (!isNaN(parseInt(genYY, 10))) return `${genYY}世代`;
  }
  const yearStr = getGenerationYear(horseOrId);
  if (yearStr.length >= 4) return `${yearStr.slice(-2)}世代`;
  return '----世代';
}

export function getGenYearLastDigit(horseOrId) {
  let idStr = typeof horseOrId === 'object' ? String(horseOrId.horse_id || horseOrId.id || '') : String(horseOrId || '');
  return idStr.length >= 2 ? idStr.substring(1, 2) : '0';
}

/**
 * 馬のポテンシャル配列（芝とダート両方のポテンシャル数値）を取得する
 * @param {Object} horse 
 * @returns {Array<number>} 14〜21等のポテンシャル数値のリスト（0は除外）
 */
export function getHorsePotentials(horse) {
  if (!horse) return [];
  const turf = Number(horse.turf_potential ?? horse.turf ?? 0);
  const dirt = Number(horse.dirt_potential ?? horse.dirt ?? 0);
  const pots = [];
  if (turf >= 14) pots.includes(turf) || pots.push(turf);
  if (dirt >= 14) pots.includes(dirt) || pots.push(dirt);
  if (pots.length === 0) {
    const single = Number(horse.potential ?? 0);
    if (single > 0) pots.push(single);
  }
  return pots;
}

// 芝・ダート適性
function getSurfaceAptitudes(horse) {
  const turf = Number(horse.turf_potential ?? horse.turf ?? horse.aptitude?.turf ?? 0);
  const dirt = Number(horse.dirt_potential ?? horse.dirt ?? horse.aptitude?.dirt ?? 0);
  const results = [];
  if (turf >= 14) results.push({ text: `🌱 芝適性`, bgClass: 'bg-surface-turf' });
  if (dirt >= 14) results.push({ text: `🏜️ ダート適性`, bgClass: 'bg-surface-dirt' });
  if (results.length === 0) {
    if (dirt > turf) results.push({ text: `🏜️ ダート適性 (${dirt})`, bgClass: 'bg-surface-dirt' });
    else results.push({ text: `🌱 芝適性 (${turf})`, bgClass: 'bg-surface-turf' });
  }
  return results;
}

function getDistanceAptitudeText(horse) {
  const minDist = horse.min_distance || horse.distance_min || horse.aptitude?.min || 1600;
  const maxDist = horse.max_distance || horse.distance_max || horse.aptitude?.max || 2400;
  return `${minDist}m-${maxDist}m`;
}

/**
 * 獲得カードリスト（最大3枚）からスロット一致判定を行い、ポイントとリーチテキストを算出
 * @param {Array} cards - 当日引き当てたカードの配列（2枚または3枚）
 * @returns {Object} { points, reachText, reachTypes, isFever }
 */
export function evaluateSlotMatch(cards) {
  if (!Array.isArray(cards) || cards.length < 2) {
    return { points: 0, reachText: '', reachTypes: [], isFever: false };
  }

  const hasThree = cards.length >= 3;
  let matches = { gen: false, category: false, style: false, potential: false };

  if (hasThree) {
    const genDigit0 = getGenYearLastDigit(cards[0]);
    const cat0 = (cards[0].rarity || 'NOR').toUpperCase();
    const style0 = cards[0].style || '';
    const pots0 = getHorsePotentials(cards[0]);

    matches.gen = cards.every(c => getGenYearLastDigit(c) === genDigit0);
    matches.category = cards.every(c => (c.rarity || 'NOR').toUpperCase() === cat0);
    matches.style = cards.every(c => (c.style || '') === style0);
    matches.potential = pots0.some(p => cards.every(c => getHorsePotentials(c).includes(p)));
  } else {
    const gen0 = getGenYearLastDigit(cards[0]);
    const gen1 = getGenYearLastDigit(cards[1]);
    matches.gen = (gen0 === gen1);

    const cat0 = (cards[0].rarity || 'NOR').toUpperCase();
    const cat1 = (cards[1].rarity || 'NOR').toUpperCase();
    matches.category = (cat0 === cat1);

    const style0 = cards[0].style || '';
    const style1 = cards[1].style || '';
    matches.style = (style0 !== '' && style0 === style1);

    const pots0 = getHorsePotentials(cards[0]);
    const pots1 = getHorsePotentials(cards[1]);
    matches.potential = pots0.some(p => pots1.includes(p));
  }

  let totalPoints = 0;
  let reachLabels = [];
  let reachTypes = [];

  if (matches.gen) {
    totalPoints += 5;
    reachLabels.push('世代');
    reachTypes.push('generation');
  }
  if (matches.category) {
    totalPoints += 4;
    reachLabels.push('レアカテゴリ');
    reachTypes.push('category');
  }
  if (matches.style) {
    totalPoints += 3;
    reachLabels.push('脚質');
    reachTypes.push('style');
  }
  if (matches.potential) {
    totalPoints += 2;
    reachLabels.push('ポテンシャル');
    reachTypes.push('potential');
  }

  let reachText = '';
  const count = reachLabels.length;

  if (hasThree && count === 4) {
    reachText = '🔥🔥 クワドラプル確定！！ (翌日確変濃厚) 🔥🔥';
  } else if (hasThree && count === 3) {
    reachText = '⚡⚡ トリプルリーチ！！ ⚡⚡';
  } else if (count >= 3) {
    reachText = `${reachLabels.join('＆')}トリプルリーチ！`;
  } else if (count === 2) {
    reachText = `${reachLabels.join('＆')}ダブルリーチ！`;
  } else if (count === 1) {
    reachText = `${reachLabels[0]}リーチ！`;
  }

  const isFever = hasThree && (matches.gen && matches.category && matches.style && matches.potential);

  return {
    points: totalPoints,
    reachText,
    reachTypes,
    isFever
  };
}

/**
 * 確変時用：ポイントに基づいた対象カテゴリ一覧と均等割り確率分布を作成
 * @param {number} points 
 * @returns {Array} [{ code, prob }]
 */
export function buildFeverProbabilityTable(points) {
  let allowedRanks = POINT_RANK_POOLS[12];
  if (points <= 2) allowedRanks = POINT_RANK_POOLS[2];
  else if (points <= 10) allowedRanks = POINT_RANK_POOLS[points] || POINT_RANK_POOLS[2];

  const eligibleCodes = Object.keys(RARITY_CONFIG).filter(code => {
    const config = RARITY_CONFIG[code];
    return config.rank !== 'NOR' && allowedRanks.includes(config.rank);
  });

  if (eligibleCodes.length === 0) {
    return [{ code: 'SPR', prob: 1.0 }];
  }

  const count = eligibleCodes.length;
  const baseProb = Math.floor((1.0 / count) * 10000) / 10000;
  let remainder = Math.round((1.0 - (baseProb * count)) * 10000) / 10000;

  return eligibleCodes.map((code, index) => {
    let prob = baseProb;
    if (index === count - 1) {
      prob = Math.round((prob + remainder) * 10000) / 10000;
    }
    return { code, prob };
  });
}

export async function playFourthCornerCutIn(chosenHorse, customRenderer = cardRenderer) {
  injectCutInStyles();

  if (customRenderer && !customRenderer.isLoaded) {
    try {
      await Promise.race([
        customRenderer.init(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Init Timeout')), 3000))
      ]);
    } catch (e) {
      console.warn('CardRenderer init bypassed:', e);
    }
  }

  let horseId = String(chosenHorse?.horse_id || chosenHorse?.id || chosenHorse || '');
  const masterHorse = customRenderer.getHorse ? customRenderer.getHorse(horseId) : null;
  const horse = { ...(masterHorse || {}), ...(typeof chosenHorse === 'object' ? chosenHorse : {}), horse_id: horseId };

  const genText = parseGeneration(horse);
  const surfaces = getSurfaceAptitudes(horse);
  const distText = getDistanceAptitudeText(horse);

  const rarityCode = (horse.rarity || 'NOR').toUpperCase();
  const isRare = rarityCode !== 'NOR';
  const rarityConfig = RARITY_CONFIG[rarityCode] || RARITY_CONFIG['NOR'];

  let abilities = [];
  if (Array.isArray(horse.ability)) abilities = horse.ability.filter(a => a);
  else if (typeof horse.ability === 'string' && horse.ability) abilities = [horse.ability];
  else if (Array.isArray(horse.skill)) abilities = horse.skill.filter(s => s);

  let cardHtml = '';
  try {
    cardHtml = (customRenderer && customRenderer.isLoaded)
      ? customRenderer.renderCardUI(horse, 'large')
      : `<div style="padding:20px; text-align:center; font-weight:bold;">${horse.name || '馬データ取得中'}</div>`;
  } catch (err) {
    cardHtml = `<div style="padding:20px; text-align:center; font-weight:bold;">${horse.name || '馬データ'}</div>`;
  }

  let backdrop = document.getElementById('login-cutin-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'login-cutin-backdrop';
    backdrop.className = 'cutin-backdrop';
    document.body.appendChild(backdrop);
  }

  backdrop.innerHTML = `
    <!-- 動的バナーコンテナ -->
    <div id="dynamic-banners" class="dynamic-banners"></div>

    <!-- カード＆レア表示コンテナ -->
    <div id="card-box" class="cutin-card-box">
      <div class="card-render-inner">${cardHtml}</div>
      <div id="rare-slot" class="rare-banner-slot"></div>
    </div>
  `;

  const dynamicBanners = document.getElementById('dynamic-banners');
  const cardBox = document.getElementById('card-box');
  const rareSlot = document.getElementById('rare-slot');
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const playBannerDynamic = async (text, bgClass, delayBeforeNext) => {
    const row = document.createElement('div');
    row.className = 'banner-row';
    const banner = document.createElement('div');
    banner.className = `slot-banner ${bgClass}`;
    banner.textContent = text;
    row.appendChild(banner);
    
    dynamicBanners.prepend(row);

    requestAnimationFrame(() => {
      row.classList.add('open');
    });

    await wait(20);
    banner.classList.add('in');
    
    await wait(delayBeforeNext);
  };

  backdrop.classList.add('active');
  await wait(600);

  const NORMAL_DELAY = 1250;

  // 1. アビリティ
  if (abilities.length > 0) {
    for (let i = 0; i < Math.min(abilities.length, 3); i++) {
      await playBannerDynamic(`⚡ ${abilities[i]}`, 'bg-ability', NORMAL_DELAY);
    }
  }

  // 2. 芝/ダート適性
  for (const s of surfaces) {
    await playBannerDynamic(s.text, s.bgClass, NORMAL_DELAY);
  }

  // 3. 距離適性
  await playBannerDynamic(`🏁 ${distText}`, 'bg-dist', NORMAL_DELAY);

  // 4. 世代
  await playBannerDynamic(genText, 'bg-gen', 2500); 

  // 5. 馬名
  await playBannerDynamic(horse.name || '馬名不明', 'bg-name', 1000);

  dynamicBanners.style.opacity = '0';
  await wait(300);

  // 6. 中央にカード表示
  cardBox.classList.add('in');

  if (isRare) {
    await wait(600);
    
    // 7. レアバナー演出
    const rareBanner = document.createElement('div');
    rareBanner.className = `slot-banner bg-rare`;
    rareBanner.style.boxShadow = rarityConfig.shadow; 
    rareBanner.innerHTML = `✨ ${rarityConfig.name} ✨`;
    rareSlot.appendChild(rareBanner);

    await wait(20);
    rareBanner.classList.add('in');
    
    await wait(3200);
  } else {
    await wait(3500);
  }

  backdrop.classList.remove('active');
  await wait(800);
}

/**
 * ログインボーナスカードの抽選
 * @param {Object} renderer 
 * @param {string} affiliation 
 * @param {boolean} isFever 確変状態フラグ
 * @param {number} feverPoints 獲得ポイント（確変時）
 * @returns {Object} 抽選された馬データ
 */
export function drawBonusCard(renderer = cardRenderer, affiliation, isFever = false, feverPoints = 0) {
  const allHorses = (renderer && renderer.horsesMap && renderer.horsesMap.size > 0)
    ? Array.from(renderer.horsesMap.values())
    : [];
    
  if (allHorses.length === 0) {
    return { horse_id: "8801", name: "オグリキャップ", rarity: "CLR", ability: ["地方からの勇者", "連勝街道"] };
  }

  // 1. 確率テーブルの選定（通常 or 確変）
  const table = isFever 
    ? buildFeverProbabilityTable(feverPoints) 
    : NORMAL_PROBABILITY_TABLE;

  // 2. レアリティコードの抽選
  const rand = Math.random();
  let cumulative = 0;
  let targetRarity = table[table.length - 1].code;

  for (const item of table) {
    cumulative += item.prob;
    if (rand <= cumulative) {
      targetRarity = item.code;
      break;
    }
  }

  // 3. 抽選されたレアリティに合致する馬を抽出（該当がなければ全体から）
  const matchingHorses = allHorses.filter(h => (h.rarity || 'NOR').toUpperCase() === targetRarity);
  const pool = matchingHorses.length > 0 ? matchingHorses : allHorses;
  const selected = pool[Math.floor(Math.random() * pool.length)];

  return {
    ...selected,
    rarity: targetRarity
  };
}
