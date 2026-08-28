// login_bonus.js

// レア度マッピング定義（コード -> 正式名称）
const RARITY_NAMES = {
  'TRR': 'トラディショナルレア',
  'INF': 'インフィニティレア',
  'URR': 'ウルトラレア',
  'NOR': 'ノーマル'
};

function injectCutInStyles() {
  if (document.getElementById('login-cutin-style')) return;
  const style = document.createElement('style');
  style.id = 'login-cutin-style';
  style.textContent = `
    .corner-cutin-overlay {
      position: fixed; top: 0; left: -100%;
      width: 100vw; height: 100vh;
      background: rgba(0, 10, 30, 0.88);
      backdrop-filter: blur(5px);
      z-index: 9999;
      display: flex; justify-content: center; align-items: center;
      transition: left 0.35s cubic-bezier(0.15, 0.85, 0.35, 1.2);
      pointer-events: none;
    }
    .corner-cutin-overlay.active { left: 0; }
    .corner-cutin-overlay.exit { left: 100%; }

    .corner-cutin-box {
      width: 85%; max-width: 480px;
      background: linear-gradient(135deg, #0f0c20, #1b1636);
      border: 3px solid #ffd700;
      box-shadow: 0 0 35px rgba(255, 215, 0, 0.5);
      border-radius: 16px; padding: 28px 20px;
      text-align: center; color: #fff;
    }
    .corner-cutin-title {
      font-size: 1.2rem; color: #8a2be2;
      font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;
    }
    .corner-cutin-horse {
      font-size: 2.2rem; color: #ffffff;
      font-weight: 900;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
      margin-bottom: 16px;
    }

    /* レア度ポップアップ用スタイル */
    .corner-rarity-container {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 10px 28px;
      background: linear-gradient(45deg, #d4af37, #ff4500, #ffd700);
      background-size: 200% 200%;
      border-radius: 12px;
      box-shadow: 0 0 25px rgba(255, 215, 0, 0.8);
      transform: scale(0); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.3s;
    }
    .corner-rarity-container.pop {
      transform: scale(1.1); opacity: 1;
    }
    /* 短縮表示 (TRR) */
    .rarity-code {
      font-size: 2.2rem; font-weight: 900;
      font-style: italic; color: #fff;
      line-height: 1; text-shadow: 2px 2px 4px #000;
    }
    /* 正式名称 (トラディショナルレア) */
    .rarity-full {
      font-size: 0.95rem; font-weight: 700;
      color: #fff; letter-spacing: 1px;
      text-shadow: 1px 1px 3px #000;
    }
  `;
  document.head.appendChild(style);
}

export async function playFourthCornerCutIn(chosenHorse) {
  injectCutInStyles();

  let overlay = document.getElementById('login-cutin-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'login-cutin-overlay';
    overlay.className = 'corner-cutin-overlay';
    document.body.appendChild(overlay);
  }

  // 略称（例: TRR）と正式名称（例: トラディショナルレア）の取得
  const code = chosenHorse.rarity || 'TRR';
  const fullName = RARITY_NAMES[code] || chosenHorse.rarity_name || 'トラディショナルレア';

  overlay.innerHTML = `
    <div class="corner-cutin-box">
      <div class="corner-cutin-title">第4コーナーをカーブして…！</div>
      <div class="corner-cutin-horse">${chosenHorse.name}</div>
      <div id="corner-rarity" class="corner-rarity-container">
        <span class="rarity-code">${code}</span>
        <span class="rarity-full">${fullName}</span>
      </div>
    </div>
  `;

  // 1. 横から中央へシャキーンと進入
  await new Promise(r => setTimeout(r, 50));
  overlay.classList.remove('exit');
  overlay.classList.add('active');

  // 2. 中央到着後（0.6秒後）、追いかけで TRR / トラディショナルレア がポップアップ
  await new Promise(r => setTimeout(r, 600));
  const rarityBadge = document.getElementById('corner-rarity');
  if (rarityBadge) rarityBadge.classList.add('pop');

  // 3. 3秒間停止・保持
  await new Promise(r => setTimeout(r, 3000));

  // 4. 右へスライドアウトして消える
  overlay.classList.remove('active');
  overlay.classList.add('exit');

  await new Promise(r => setTimeout(r, 400));
}
