import { cardRenderer } from './card_renderer.js';

// 仕様書 Ver3.0 準拠のレアリティ定義
const RARITY_CONFIG = {
  'INF': { name: 'インフィニティレア', bg: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)', shadow: '0 0 30px rgba(0, 255, 255, 0.9)' },
  'SER': { name: 'シークレットレア', bg: 'linear-gradient(45deg, #2c3e50, #000000, #8a2be2)', shadow: '0 0 30px rgba(138, 43, 226, 0.9)' },
  'ULR': { name: 'アルティメットレア', bg: 'linear-gradient(45deg, #ffd700, #ff4500, #ff0055)', shadow: '0 0 25px rgba(255, 215, 0, 0.9)' },
  'LGR': { name: 'レジェンダリーレア', bg: 'linear-gradient(45deg, #b8860b, #ffd700, #8b0000)', shadow: '0 0 25px rgba(218, 165, 32, 0.8)' },
  'CLR': { name: 'クラシカルレア', bg: 'linear-gradient(45deg, #d2691e, #ff8c00, #ffd700)', shadow: '0 0 25px rgba(210, 105, 30, 0.8)' },
  'TRR': { name: 'トラディショナルレア', bg: 'linear-gradient(45deg, #4b0082, #8a2be2, #d4af37)', shadow: '0 0 25px rgba(138, 43, 226, 0.8)' },
  'RER': { name: 'レトロレア', bg: 'linear-gradient(45deg, #708090, #c0c0c0, #4682b4)', shadow: '0 0 18px rgba(192, 192, 192, 0.7)' },
  'ANR': { name: 'アンティークレア', bg: 'linear-gradient(45deg, #2e8b57, #3cb371, #8fbc8f)', shadow: '0 0 18px rgba(46, 139, 87, 0.7)' },
  'VIR': { name: 'ビンテージレア', bg: 'linear-gradient(45deg, #1e90ff, #00bfff, #87cefa)', shadow: '0 0 18px rgba(30, 144, 255, 0.7)' },
  'PRR': { name: 'プレミアレア', bg: 'linear-gradient(45deg, #9370db, #ba55d3, #ee82ee)', shadow: '0 0 18px rgba(186, 85, 211, 0.7)' },
  'SPR': { name: 'スペシャルレア', bg: 'linear-gradient(45deg, #32cd32, #00ff7f, #98fb98)', shadow: '0 0 15px rgba(50, 205, 50, 0.6)' },
  'NOR': { name: 'ノーマル', bg: 'linear-gradient(45deg, #555555, #888888, #aaaaaa)', shadow: '0 0 12px rgba(136, 136, 136, 0.5)' }
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
      align-items: center; /* 完全な中央配置に変更 */
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
      box-sizing: border-box;
    }
    .cutin-backdrop.active {
      opacity: 1; pointer-events: auto;
    }

    /* 上から順にずらして表示するためのバナーコンテナ */
    .dynamic-banners {
      position: absolute;
      top: 15vh; /* 画面上部から開始 */
      left: 0; width: 100%;
      display: flex;
      flex-direction: column;
      gap: 16px; /* バナー間の間隔 */
      z-index: 20;
      transition: opacity 0.3s ease;
    }

    .banner-row {
      width: 100%; height: 52px;
      position: relative;
      overflow: hidden;
    }

    .slot-banner {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; letter-spacing: 1px; font-weight: 900;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.15, 0.85, 0.35, 1.2);
    }
    .slot-banner.in { transform: translateX(0); }
    .slot-banner.out { transform: translateX(-100%); }

    /* 背景色設定 */
    .bg-ability { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e5128 20%, #4e9f3d 80%, rgba(0,0,0,0) 100%); color: #d8f3dc; font-size: 1.15rem; }
    .bg-surface-turf { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e7e34 20%, #28a745 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .bg-surface-dirt { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #5c2e0b 20%, #8b4513 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
    .bg-dist { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #2a9d8f 20%, #e9c46a 80%, rgba(0,0,0,0) 100%); color: #112233; }
    .bg-gen { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #0d3b66 20%, #0077b6 80%, rgba(0,0,0,0) 100%); color: #70d6ff; }
    .bg-name { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #7209b7 20%, #f72585 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.8); }
    .bg-rare { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #b8860b 20%, #ffd700 80%, rgba(0,0,0,0) 100%); color: #3a2500; text-shadow: 0 0 8px rgba(255,255,255,0.6); }

    /* 中央のカードボックス */
    .cutin-card-box {
      position: relative; /* 子要素（レアバナー）の絶対配置の基準 */
      width: 90%; max-width: 320px;
      transform: scale(0.5); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.3s ease;
      z-index: 10;
    }
    .cutin-card-box.in { transform: scale(1); opacity: 1; }

    .card-render-inner {
      width: 100%; border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      background: #fff; overflow: hidden;
    }

    /* カード直下に被せるレア表示スロット */
    .rare-banner-slot {
      position: absolute;
      bottom: 0px; /* カード下部にピッタリかぶせる */
      left: -2%; width: 104%; /* カードより少し幅広にする */
      height: 52px;
      overflow: hidden;
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

  // --- 素材を順にずらしながら表示する関数 ---
  const playBannerDynamic = async (text, bgClass, displayMs = 1100) => {
    const row = document.createElement('div');
    row.className = 'banner-row';
    const banner = document.createElement('div');
    banner.className = `slot-banner ${bgClass}`;
    banner.textContent = text;
    row.appendChild(banner);
    
    // コンテナに追加することで、1段ずつ自動で下にずれていく
    dynamicBanners.appendChild(row);

    await wait(20);
    banner.classList.add('in');
    await wait(displayMs);

    banner.classList.remove('in');
    banner.classList.add('out');
    await wait(200); // 次の素材が出るまでの間隔
  };

  backdrop.classList.add('active');
  await wait(200);

  // 1. アビリティ（1件ずつずらして表示）
  if (abilities.length > 0) {
    for (let i = 0; i < Math.min(abilities.length, 3); i++) { // 多すぎ防止で最大3つまで
      await playBannerDynamic(`⚡ ${abilities[i]}`, 'bg-ability');
    }
  }

  // 2. 芝/ダート適性
  for (const s of surfaces) {
    await playBannerDynamic(s.text, s.bgClass);
  }

  // 3. 距離適性
  await playBannerDynamic(`🏁 ${distText}`, 'bg-dist');

  // 4. 世代 & 馬名
  await playBannerDynamic(genText, 'bg-gen', 900);
  await playBannerDynamic(horse.name || '馬名不明', 'bg-name', 900);

  // バナー群を非表示にしてスッキリさせる
  dynamicBanners.style.opacity = '0';
  await wait(300);

  // 5. 中央にカードをバチッと表示
  cardBox.classList.add('in');

  if (isRare) {
    await wait(800); // カードが出て少しタメる
    
    // 6. カード下部にレアバナーをかぶせて表示
    const rareBanner = document.createElement('div');
    rareBanner.className = `slot-banner bg-rare`;
    rareBanner.style.boxShadow = rarityConfig.shadow; // レアリティ専用の発光
    rareBanner.innerHTML = `✨ ${rarityConfig.name} ✨`;
    rareSlot.appendChild(rareBanner);

    await wait(20);
    rareBanner.classList.add('in');
    
    await wait(3200); // じっくり結果を見せる
  } else {
    // ノーマルの場合はカードのみをじっくり見せる
    await wait(3500);
  }

  backdrop.classList.remove('active');
  await wait(800);
}

export function drawBonusCard(renderer = cardRenderer, affiliation, isFever) {
  const allHorses = (renderer && renderer.horsesMap && renderer.horsesMap.size > 0)
    ? Array.from(renderer.horsesMap.values())
    : [];
    
  if (allHorses.length === 0) {
    return { horse_id: "8801", name: "オグリキャップ", rarity: "CLR", ability: ["地方からの勇者", "連勝街道"] };
  }
  
  const selected = allHorses[Math.floor(Math.random() * allHorses.length)];
  return {
    ...selected,
    rarity: isFever ? "ULR" : (selected.rarity || "NOR")
  };
}
