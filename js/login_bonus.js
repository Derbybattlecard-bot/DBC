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
      display: flex; justify-content: center; align-items: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .cutin-backdrop.active { opacity: 1; pointer-events: auto; }

    .cutin-stage {
      position: relative; width: 92%; max-width: 400px;
      height: 116px;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      overflow: hidden;
      transition: height 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.2);
    }
    .cutin-stage.expanded { height: 360px; }

    .cutin-slot {
      width: 100%; height: 52px;
      position: absolute; left: 0;
      display: flex; align-items: center;
      font-weight: 900; color: #fff;
      overflow: hidden; opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 20;
    }
    .cutin-slot.slot-top { top: 4px; }
    .cutin-slot.slot-bottom { bottom: 4px; }
    .cutin-slot.active { opacity: 1; }

    .slot-banner {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem; letter-spacing: 1px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      transform: translateX(100%);
      transition: transform 0.28s cubic-bezier(0.15, 0.85, 0.35, 1.2);
    }
    .slot-banner.in { transform: translateX(0); }
    .slot-banner.out { transform: translateX(-100%); }

    .bg-ability { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e5128 20%, #4e9f3d 80%, rgba(0,0,0,0) 100%); color: #d8f3dc; font-size: 1.15rem; }
    .bg-surface { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #d4a373 20%, #faedcd 80%, rgba(0,0,0,0) 100%); color: #332211; }
    .bg-dist { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #2a9d8f 20%, #e9c46a 80%, rgba(0,0,0,0) 100%); color: #112233; }
    .bg-gen { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #0d3b66 20%, #0077b6 80%, rgba(0,0,0,0) 100%); color: #70d6ff; }
    .bg-name { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #7209b7 20%, #f72585 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.8); }
    .bg-rare { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #b8860b 20%, #ffd700 80%, rgba(0,0,0,0) 100%); color: #3a2500; font-weight: 900; }

    .cutin-card-box {
      width: 100%; max-width: 320px;
      transform: scale(0.5); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.3s ease;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      z-index: 10;
    }
    .cutin-card-box.in { transform: scale(1); opacity: 1; }

    .card-render-inner {
      width: 100%; border-radius: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      background: #fff; overflow: hidden;
    }
  `;
  document.head.appendChild(style);
}

// 馬ID（4桁）から西暦4桁を取得
export function getGenerationYear(horseOrId) {
  if (!horseOrId) return '----';

  let idStr = '';
  if (typeof horseOrId === 'object' && horseOrId !== null) {
    idStr = String(horseOrId.horse_id || horseOrId.id || '');
  } else {
    idStr = String(horseOrId || '');
  }

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

// 世代表記（例: "98世代"）を返す関数
export function parseGeneration(horseOrId) {
  let idStr = '';
  if (typeof horseOrId === 'object' && horseOrId !== null) {
    idStr = String(horseOrId.horse_id || horseOrId.id || '');
  } else {
    idStr = String(horseOrId || '');
  }

  if (idStr.length >= 2) {
    const genYY = idStr.substring(0, 2);
    if (!isNaN(parseInt(genYY, 10))) {
      return `${genYY}世代`;
    }
  }

  const yearStr = getGenerationYear(horseOrId);
  if (yearStr.length >= 4) {
    return `${yearStr.slice(-2)}世代`;
  }
  return '----世代';
}

export function getGenYearLastDigit(horseOrId) {
  let idStr = '';
  if (typeof horseOrId === 'object' && horseOrId !== null) {
    idStr = String(horseOrId.horse_id || horseOrId.id || '');
  } else {
    idStr = String(horseOrId || '');
  }

  if (idStr.length >= 2) {
    return idStr.substring(1, 2);
  }
  return '0';
}

function getSurfaceAptitudeText(horse) {
  const turf = Number(horse.turf ?? horse.aptitude?.turf ?? 0);
  const dirt = Number(horse.dirt ?? horse.aptitude?.dirt ?? 0);

  if (turf > 0 && dirt > 0) return '芝/ダート適性';
  if (dirt > 0 && turf === 0) return 'ダート適性';
  return '芝適性';
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
      console.warn('CardRenderer init bypassed or timed out:', e);
    }
  }

  let horseId = String(chosenHorse?.horse_id || chosenHorse?.id || chosenHorse || '');
  const masterHorse = customRenderer.getHorse ? customRenderer.getHorse(horseId) : null;
  
  const horse = {
    ...(masterHorse || {}),
    ...(typeof chosenHorse === 'object' ? chosenHorse : {}),
    horse_id: horseId
  };

  const genText = parseGeneration(horse);
  const surfaceText = getSurfaceAptitudeText(horse);
  const distText = getDistanceAptitudeText(horse);

  const rarityCode = (horse.rarity || 'NOR').toUpperCase();
  const isRare = rarityCode !== 'NOR';
  const rarityConfig = RARITY_CONFIG[rarityCode] || RARITY_CONFIG['NOR'];

  let abilities = [];
  if (Array.isArray(horse.ability)) {
    abilities = horse.ability.filter(a => a);
  } else if (typeof horse.ability === 'string' && horse.ability) {
    abilities = [horse.ability];
  } else if (Array.isArray(horse.skill)) {
    abilities = horse.skill.filter(s => s);
  }

  let cardHtml = '';
  try {
    cardHtml = (customRenderer && customRenderer.isLoaded)
      ? customRenderer.renderCardUI(horseId, 'pool')
      : `<div style="padding:20px; text-align:center; font-weight:bold;">${horse.name || '馬データ取得中'}</div>`;
  } catch (err) {
    console.error('Render error:', err);
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
    <div id="cutin-stage" class="cutin-stage">
      <div id="slot-top" class="cutin-slot slot-top active"></div>
      <div id="slot-bottom" class="cutin-slot slot-bottom active"></div>

      <div id="card-box" class="cutin-card-box">
        <div class="card-render-inner">${cardHtml}</div>
      </div>
    </div>
  `;

  const stage = document.getElementById('cutin-stage');
  const slotTop = document.getElementById('slot-top');
  const slotBottom = document.getElementById('slot-bottom');
  const cardBox = document.getElementById('card-box');

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const playBanner = async (targetSlot, text, bgClass, displayMs = 2000) => {
    const banner = document.createElement('div');
    banner.className = `slot-banner ${bgClass}`;
    banner.textContent = text;
    targetSlot.appendChild(banner);

    await wait(20);
    banner.classList.add('in');
    await wait(displayMs);

    banner.classList.remove('in');
    banner.classList.add('out');
    await wait(260);
    banner.remove();
  };

  backdrop.classList.add('active');
  await wait(200);

  // --- カットイン演出シーケンス ---

  // 1. アビリティ全件（上段 / 各2秒）
  if (abilities.length > 0) {
    for (let i = 0; i < abilities.length; i++) {
      await playBanner(slotTop, `⚡ ${abilities[i]}`, 'bg-ability', 2000);
    }
  }

  // 2. 芝/ダート適性（下段 / 2秒）
  await playBanner(slotBottom, `🌱 ${surfaceText}`, 'bg-surface', 2000);

  // 3. 距離適性（上段 / 2秒）
  await playBanner(slotTop, `🏁 ${distText}`, 'bg-dist', 2000);

  // 4. 世代（下段 / 2秒）
  await playBanner(slotBottom, genText, 'bg-gen', 2000);

  // 5. 馬名（上段 / 2秒）
  await playBanner(slotTop, horse.name || '馬名不明', 'bg-name', 2000);

  // 6. カードバチッと表示 & 終盤（4秒後）にレア名称追いかけ表示
  stage.classList.add('expanded');
  await wait(300);
  cardBox.classList.add('in'); // カード表示開始

  if (isRare) {
    // 4秒間カードだけを見せる
    await wait(4000);
    // 4秒経過後、下の段からレア名称が追いかけ表示（1.5秒間）
    slotBottom.classList.add('active');
    await playBanner(slotBottom, `✨ ${rarityConfig.name} ✨`, 'bg-rare', 1500);
  } else {
    // ノーマルの場合はカードのみを5秒間じっくり見せる
    await wait(5000);
  }

  slotTop.classList.remove('active');
  slotBottom.classList.remove('active');

  backdrop.classList.remove('active');
  await wait(350);
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
