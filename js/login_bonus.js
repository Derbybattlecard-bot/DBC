// login_bonus.js
import { cardRenderer } from './card_renderer.js';

// 仕様書 Ver3.0 準拠のレアリティ定義（ポップアップ・バナー用）
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
    /* 暗転背景 */
    .cutin-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex; justify-content: center; align-items: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .cutin-backdrop.active { opacity: 1; pointer-events: auto; }

    /* 中央の演出ステージ（赤枠サイズ: 初期116px → カード時360pxへ拡大） */
    .cutin-stage {
      position: relative; width: 92%; max-width: 400px;
      height: 116px;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      overflow: hidden;
      transition: height 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.2);
    }
    .cutin-stage.expanded {
      height: 360px; /* カード表示用に縦幅を約3倍に拡大 */
    }

    /* 上段・下段のスロット帯 */
    .cutin-slot {
      width: 100%; height: 52px;
      position: absolute; left: 0;
      display: flex; align-items: center;
      font-weight: 900; color: #fff;
      overflow: hidden; opacity: 0;
      transition: opacity 0.2s ease;
    }
    .cutin-slot.slot-top { top: 4px; }
    .cutin-slot.slot-bottom { bottom: 4px; }
    .cutin-slot.active { opacity: 1; }

    /* バナーアニメーション */
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

    /* バナーカラー */
    .bg-ability { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #1e5128 20%, #4e9f3d 80%, rgba(0,0,0,0) 100%); color: #d8f3dc; font-size: 1.15rem; }
    .bg-gen { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #0d3b66 20%, #0077b6 80%, rgba(0,0,0,0) 100%); color: #70d6ff; }
    .bg-name { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #7209b7 20%, #f72585 80%, rgba(0,0,0,0) 100%); color: #ffffff; text-shadow: 0 0 8px rgba(255,255,255,0.8); }
    .bg-rare { background: linear-gradient(90deg, rgba(0,0,0,0) 0%, #b8860b 20%, #ffd700 80%, rgba(0,0,0,0) 100%); color: #3a2500; font-weight: 900; }

    /* CardRenderer表示ボックス */
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

    /* 正式レア名称ポップアップ */
    .cutin-rarity-pop {
      width: 100%; padding: 8px 12px; border-radius: 8px; box-sizing: border-box;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transform: scale(0); opacity: 0;
      transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.25s ease;
    }
    .cutin-rarity-pop.show { transform: scale(1); opacity: 1; }
    .rarity-pop-title { font-size: 1.05rem; font-weight: 900; color: #fff; text-shadow: 1px 1px 3px #000; }
    .rarity-pop-code { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.85); margin-top: 1px; }
  `;
  document.head.appendChild(style);
}

// horse_id 先頭2桁から世代表記を復元
function parseGeneration(horse) {
  const idStr = String(horse.horse_id || horse.id || '');
  if (idStr.length >= 4) {
    return `${idStr.substring(0, 2)}世代`;
  }
  return '----世代';
}

export async function playFourthCornerCutIn(chosenHorse, customRenderer = cardRenderer) {
  injectCutInStyles();

  if (customRenderer && !customRenderer.isLoaded) {
    await customRenderer.init().catch(e => console.error(e));
  }

  let backdrop = document.getElementById('login-cutin-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'login-cutin-backdrop';
    backdrop.className = 'cutin-backdrop';
    document.body.appendChild(backdrop);
  }

  const horseId = String(chosenHorse.horse_id || chosenHorse.id);
  const genText = parseGeneration(chosenHorse);
  const rarityCode = (chosenHorse.rarity || 'NOR').toUpperCase();
  const isRare = rarityCode !== 'NOR';
  const rarityConfig = RARITY_CONFIG[rarityCode] || RARITY_CONFIG['NOR'];

  // アビリティ配列の抽出
  let abilities = [];
  if (Array.isArray(chosenHorse.ability)) {
    abilities = chosenHorse.ability.filter(a => a);
  } else if (typeof chosenHorse.ability === 'string' && chosenHorse.ability) {
    abilities = [chosenHorse.ability];
  }

  // CardRenderer の renderCardUI(horseId, 'pool') を使用
  const cardHtml = customRenderer && customRenderer.isLoaded 
    ? customRenderer.renderCardUI(horseId, 'pool')
    : `<div style="padding:20px; text-align:center;">${chosenHorse.name}</div>`;

  backdrop.innerHTML = `
    <div id="cutin-stage" class="cutin-stage">
      <div id="slot-top" class="cutin-slot slot-top active"></div>
      <div id="slot-bottom" class="cutin-slot slot-bottom active"></div>

      <div id="card-box" class="cutin-card-box">
        <div class="card-render-inner">${cardHtml}</div>
        <div id="rarity-pop" class="cutin-rarity-pop">
          <span class="rarity-pop-title">${rarityConfig.name}</span>
          <span class="rarity-pop-code">-[ ${rarityCode} ]-</span>
        </div>
      </div>
    </div>
  `;

  const stage = document.getElementById('cutin-stage');
  const slotTop = document.getElementById('slot-top');
  const slotBottom = document.getElementById('slot-bottom');
  const cardBox = document.getElementById('card-box');
  const rarityPop = document.getElementById('rarity-pop');

  if (rarityPop) {
    rarityPop.style.background = rarityConfig.bg;
    rarityPop.style.boxShadow = rarityConfig.shadow;
  }

  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // スロットアニメーション処理
  const playBanner = async (targetSlot, text, bgClass, displayMs = 750) => {
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
  await wait(150);

  // 1. アビリティカットイン（上の段に最大3つ順次上書き／無い場合はスキップ）
  if (abilities.length > 0) {
    const showCount = Math.min(abilities.length, 3);
    for (let i = 0; i < showCount; i++) {
      await playBanner(slotTop, `⚡ ${abilities[i]}`, 'bg-ability', 650);
    }
  }

  // 2. 世代表示（下の段）
  const genPromise = playBanner(slotBottom, genText, 'bg-gen', 850);

  // 3. 馬名カットイン（上の段）
  await wait(150);
  await playBanner(slotTop, chosenHorse.name, 'bg-name', 950);
  await genPromise;

  // 4. レアカードカットイン（下の段／ノーマル非表示）
  if (isRare) {
    await playBanner(slotBottom, `✨ ${rarityConfig.name} ✨`, 'bg-rare', 850);
  }

  // スロット非表示＆縦幅を約3倍に拡張
  slotTop.classList.remove('active');
  slotBottom.classList.remove('active');
  stage.classList.add('expanded');
  await wait(250);

  // 5. カードデザイン表示 (CardRenderer)
  cardBox.classList.add('in');
  await wait(800);

  // 6. 正式レア名称ポップアップ（ノーマル NOR は非表示）
  if (isRare) {
    rarityPop.classList.add('show');
    await wait(2000);
  } else {
    await wait(1400);
  }

  // フェードアウト終了
  backdrop.classList.remove('active');
  await wait(350);
}

export function drawBonusCard(renderer = cardRenderer, affiliation, isFever) {
  const allHorses = renderer && renderer.horsesMap ? Array.from(renderer.horsesMap.values()) : [];
  if (allHorses.length === 0) {
    return { horse_id: "8801", name: "オグリキャップ", rarity: "CLR", ability: ["地方からの勇者"] };
  }
  const selected = allHorses[Math.floor(Math.random() * allHorses.length)];
  return {
    ...selected,
    rarity: isFever ? "ULR" : (selected.rarity || "NOR")
  };
}
