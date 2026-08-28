// login_bonus.js

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

    /* スリムな横帯カットイン（縦幅約半分） */
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

    /* カード風表示ボックス */
    .cutin-card-box {
      position: absolute;
      width: 260px; height: 370px;
      background: linear-gradient(135deg, #0a0d1a, #1a2238);
      border: 3px solid #ffcc00; border-radius: 16px;
      box-shadow: 0 0 35px rgba(255, 204, 0, 0.5);
      display: flex; flex-direction: column; justify-content: space-between; align-items: center;
      padding: 24px 16px; box-sizing: border-box; color: #fff;
      transform: scale(0.4); opacity: 0;
      transition: transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.25), opacity 0.35s ease;
    }
    .cutin-card-box.in { transform: scale(1); opacity: 1; }

    .card-gen-text { font-size: 1rem; color: #70d6ff; font-weight: bold; letter-spacing: 1px; }
    .card-horse-text { font-size: 1.8rem; font-weight: 900; color: #fff; text-shadow: 0 0 8px rgba(255,255,255,0.7); text-align: center; }

    /* 正式名称ポップアップ */
    .cutin-rarity-badge {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 10px 20px; border-radius: 12px; width: 85%;
      transform: scale(0); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.3s ease;
    }
    .cutin-rarity-badge.pop { transform: scale(1.1); opacity: 1; }
    .rarity-full-title { font-size: 1.1rem; font-weight: 900; color: #fff; text-shadow: 1px 1px 4px #000; letter-spacing: 1px; text-align: center; }
    .rarity-code-sub { font-size: 0.85rem; font-weight: 700; color: rgba(255,255,255,0.85); font-style: italic; margin-top: 2px; }
  `;
  document.head.appendChild(style);
}

export async function playFourthCornerCutIn(chosenHorse) {
  injectCutInStyles();

  let overlay = document.getElementById('login-cutin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'login-cutin-overlay';
    overlay.className = 'cutin-overlay';
    document.body.appendChild(overlay);
  }

  const genYear = getGenerationYear(chosenHorse.horse_id || chosenHorse.id);
  const code = (chosenHorse.rarity || 'NOR').toUpperCase();
  const config = RARITY_CONFIG[code] || RARITY_CONFIG['NOR'];

  // DOM生成
  overlay.innerHTML = `
    <div id="banner-gen" class="cutin-banner cutin-banner-gen">${genYear}年世代</div>
    <div id="banner-name" class="cutin-banner cutin-banner-name">${chosenHorse.name}</div>
    <div id="card-box" class="cutin-card-box">
      <div class="card-gen-text">【 ${genYear}年世代 】</div>
      <div class="card-horse-text">${chosenHorse.name}</div>
      <div id="rarity-badge" class="cutin-rarity-badge">
        <span class="rarity-full-title">${config.name}</span>
        <span class="rarity-code-sub">-[ ${code} ]-</span>
      </div>
    </div>
  `;

  const bannerGen = document.getElementById('banner-gen');
  const bannerName = document.getElementById('banner-name');
  const cardBox = document.getElementById('card-box');
  const rarityBadge = document.getElementById('rarity-badge');

  if (rarityBadge) {
    rarityBadge.style.background = config.bg;
    rarityBadge.style.boxShadow = config.shadow;
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // --- タイムライン（トータル約7秒）---
  
  // 1. 背景フェードイン（0.0s）
  overlay.classList.add('active');
  await wait(100);

  // 2. 世代帯が左から登場（0.1s - 1.1s）
  bannerGen.classList.add('in');
  await wait(900);

  // 3. 馬名帯が右から登場（1.0s - 2.2s）
  bannerName.classList.add('in');
  await wait(1200);

  // 4. 帯が左右に退出 & カード枠がズームイン（2.2s - 2.8s）
  bannerGen.classList.remove('in');
  bannerGen.classList.add('out-left');
  bannerName.classList.remove('in');
  bannerName.classList.add('out-right');
  await wait(200);
  cardBox.classList.add('in');
  await wait(1000);

  // 5. レアランク（正式名称）ポップアップ（3.4s - 6.2s）
  rarityBadge.classList.add('pop');
  await wait(2800);

  // 6. 全体フェードアウト（6.2s - 6.8s）
  overlay.classList.remove('active');
  await wait(600);
}

export function drawBonusCard(cardRenderer, affiliation, isFever) {
  const allHorses = cardRenderer && cardRenderer.horses ? Object.values(cardRenderer.horses) : [];
  if (allHorses.length === 0) {
    return { horse_id: "H001", name: "トウカイテイオー", rarity: "TRR" };
  }
  const selected = allHorses[Math.floor(Math.random() * allHorses.length)];
  return {
    horse_id: selected.id || selected.horse_id || "H001",
    name: selected.name || "競走馬",
    rarity: isFever ? "ULR" : (selected.rarity || "NOR")
  };
}

export function getGenerationYear(horseId) {
  return 2020;
}

export function getGenYearLastDigit(horseId) {
  const year = getGenerationYear(horseId);
  return String(year).slice(-1);
}
