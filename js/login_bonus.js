// login_bonus.js
import { cardRenderer } from './card_renderer.js';

// 全12種類のレアリティ定義（正式名称 ＆ 専用カラー/シャドウ設定）
const RARITY_CONFIG = {
  // レアランクS
  'INF': { name: 'インフィニティレア', bg: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)', shadow: '0 0 30px rgba(0, 255, 255, 0.9)' },
  'SER': { name: 'シークレットレア', bg: 'linear-gradient(45deg, #2c3e50, #000000, #8a2be2)', shadow: '0 0 30px rgba(138, 43, 226, 0.9)' },
  
  // レアランクA
  'ULR': { name: 'アルティメットレア', bg: 'linear-gradient(45deg, #ffd700, #ff4500, #ff0055)', shadow: '0 0 25px rgba(255, 215, 0, 0.9)' },
  'LGR': { name: 'レジェンダリーレア', bg: 'linear-gradient(45deg, #b8860b, #ffd700, #8b0000)', shadow: '0 0 25px rgba(218, 165, 32, 0.8)' },
  'CLR': { name: 'クラシカルレア', bg: 'linear-gradient(45deg, #d2691e, #ff8c00, #ffd700)', shadow: '0 0 25px rgba(210, 105, 30, 0.8)' },
  'TRR': { name: 'トラディショナルレア', bg: 'linear-gradient(45deg, #4b0082, #8a2be2, #d4af37)', shadow: '0 0 25px rgba(138, 43, 226, 0.8)' },
  
  // レアランクB
  'RER': { name: 'レトロレア', bg: 'linear-gradient(45deg, #708090, #c0c0c0, #4682b4)', shadow: '0 0 18px rgba(192, 192, 192, 0.7)' },
  'ANR': { name: 'アンティークレア', bg: 'linear-gradient(45deg, #2e8b57, #3cb371, #8fbc8f)', shadow: '0 0 18px rgba(46, 139, 87, 0.7)' },
  'VIR': { name: 'ビンテージレア', bg: 'linear-gradient(45deg, #1e90ff, #00bfff, #87cefa)', shadow: '0 0 18px rgba(30, 144, 255, 0.7)' },
  'PRR': { name: 'プレミアレア', bg: 'linear-gradient(45deg, #9370db, #ba55d3, #ee82ee)', shadow: '0 0 18px rgba(186, 85, 211, 0.7)' },
  
  // レアランクC & その他
  'SPR': { name: 'スペシャルレア', bg: 'linear-gradient(45deg, #32cd32, #00ff7f, #98fb98)', shadow: '0 0 15px rgba(50, 205, 50, 0.6)' },
  'NOR': { name: 'ノーマル', bg: 'linear-gradient(45deg, #555555, #888888, #aaaaaa)', shadow: '0 0 12px rgba(136, 136, 136, 0.5)' }
};

function injectCutInStyles() {
  if (document.getElementById('login-cutin-style')) return;
  const style = document.createElement('style');
  style.id = 'login-cutin-style';
  style.textContent = `
    .cutin-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(5, 10, 20, 0.92);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      overflow: hidden; pointer-events: none; opacity: 0;
      transition: opacity 0.4s ease;
    }
    .cutin-overlay.active { opacity: 1; }

    /* 縦幅半分のスリムな横帯カットイン */
    .cutin-banner {
      width: 100%; height: 52px;
      display: flex; align-items: center;
      font-weight: 900; color: #fff;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.8);
      transition: transform 0.35s cubic-bezier(0.15, 0.85, 0.35, 1.2), opacity 0.3s ease;
      margin: 8px 0;
    }
    .cutin-banner-gen {
      background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #0d3b66 20%, #0077b6 80%, rgba(0,0,0,0) 100%);
      justify-content: flex-start; padding-left: 12%; font-size: 1.4rem; color: #70d6ff;
      letter-spacing: 2px;
      transform: translateX(-100%);
    }
    .cutin-banner-gen.in { transform: translateX(0); }

    .cutin-banner-name {
      background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #7209b7 20%, #f72585 80%, rgba(0,0,0,0) 100%);
      justify-content: flex-end; padding-right: 12%; font-size: 1.8rem; color: #ffffff;
      text-shadow: 0 0 10px rgba(255,255,255,0.8);
      transform: translateX(100%);
    }
    .cutin-banner-name.in { transform: translateX(0); }

    .cutin-banner.out-left { transform: translateX(-100%); opacity: 0; }
    .cutin-banner.out-right { transform: translateX(100%); opacity: 0; }

    /* CardRendererをそのまま描画するカードラッパー */
    .cutin-card-wrapper {
      position: absolute;
      width: 88%; max-width: 320px;
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      transform: scale(0.3); opacity: 0;
      transition: transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.35s ease;
    }
    .cutin-card-wrapper.in { transform: scale(1); opacity: 1; }

    .card-render-container {
      width: 100%;
      border-radius: 8px;
      box-shadow: 0 0 25px rgba(255, 204, 0, 0.6);
      background: #ffffff;
      overflow: hidden;
    }

    /* 正式名称ポップアップ */
    .cutin-rarity-badge {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 10px 20px; border-radius: 12px; width: 90%;
      transform: scale(0); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.3s ease;
    }
    .cutin-rarity-badge.pop { transform: scale(1.05); opacity: 1; }
    .rarity-full-title { font-size: 1.15rem; font-weight: 900; color: #fff; text-shadow: 1px 1px 4px #000; letter-spacing: 1px; text-align: center; }
    .rarity-code-sub { font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.85); font-style: italic; margin-top: 2px; }
  `;
  document.head.appendChild(style);
}

export async function playFourthCornerCutIn(chosenHorse, customRenderer = cardRenderer) {
  injectCutInStyles();

  let overlay = document.getElementById('login-cutin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'login-cutin-overlay';
    overlay.className = 'cutin-overlay';
    document.body.appendChild(overlay);
  }

  const horseId = chosenHorse.horse_id || chosenHorse.id || 'H001';
  const genYear = getGenerationYear(horseId, customRenderer);
  const code = (chosenHorse.rarity || 'NOR').toUpperCase();
  const config = RARITY_CONFIG[code] || RARITY_CONFIG['NOR'];

  // CardRenderer より pool モードの HTML を取得して挿入
  const cardHtml = customRenderer && customRenderer.isLoaded 
    ? customRenderer.renderCardUI(horseId, 'pool') 
    : `<div style="padding:20px; text-align:center; background:#fff;">${chosenHorse.name}</div>`;

  overlay.innerHTML = `
    <div id="banner-gen" class="cutin-banner cutin-banner-gen">${genYear}年世代</div>
    <div id="banner-name" class="cutin-banner cutin-banner-name">${chosenHorse.name}</div>
    <div id="card-wrapper" class="cutin-card-wrapper">
      <div class="card-render-container">
        ${cardHtml}
      </div>
      <div id="rarity-badge" class="cutin-rarity-badge">
        <span class="rarity-full-title">${config.name}</span>
        <span class="rarity-code-sub">-[ ${code} ]-</span>
      </div>
    </div>
  `;

  const bannerGen = document.getElementById('banner-gen');
  const bannerName = document.getElementById('banner-name');
  const cardWrapper = document.getElementById('card-wrapper');
  const rarityBadge = document.getElementById('rarity-badge');

  if (rarityBadge) {
    rarityBadge.style.background = config.bg;
    rarityBadge.style.boxShadow = config.shadow;
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // --- タイムライン（トータル約7秒）---
  overlay.classList.add('active');
  await wait(100);

  // 1. 世代帯が左から登場（0.1s - 1.0s）
  bannerGen.classList.add('in');
  await wait(900);

  // 2. 馬名帯が右から登場（1.0s - 2.2s）
  bannerName.classList.add('in');
  await wait(1200);

  // 3. 帯が左右に退出 ＆ CardRendererのカードUIがズームイン（2.2s - 2.8s）
  bannerGen.classList.remove('in');
  bannerGen.classList.add('out-left');
  bannerName.classList.remove('in');
  bannerName.classList.add('out-right');
  await wait(200);
  cardWrapper.classList.add('in');
  await wait(1000);

  // 4. 正式名称レアリティがポップアップ（3.4s - 6.2s）
  rarityBadge.classList.add('pop');
  await wait(2800);

  // 5. 全体フェードアウト（6.2s - 6.8s）
  overlay.classList.remove('active');
  await wait(600);
}

export function drawBonusCard(renderer = cardRenderer, affiliation, isFever) {
  const allHorses = renderer && renderer.horsesMap ? Array.from(renderer.horsesMap.values()) : [];
  if (allHorses.length === 0) {
    return { horse_id: "H001", name: "トウカイテイオー", rarity: "TRR" };
  }
  const selected = allHorses[Math.floor(Math.random() * allHorses.length)];
  return {
    horse_id: selected.horse_id || selected.id || "H001",
    name: selected.name || "競走馬",
    rarity: isFever ? "ULR" : (selected.rarity || "NOR")
  };
}

export function getGenerationYear(horseId, renderer = cardRenderer) {
  if (renderer && typeof renderer.getGenerationYear === 'function') {
    return renderer.getGenerationYear(horseId);
  }
  return 2020;
}

export function getGenYearLastDigit(horseId, renderer = cardRenderer) {
  const year = getGenerationYear(horseId, renderer);
  return String(year).slice(-1);
}
