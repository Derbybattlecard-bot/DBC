// login_bonus.js[span_1](start_span)[span_1](end_span)

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
    .corner-cutin-overlay {
      position: fixed; top: 0; left: -100%;
      width: 100vw; height: 100vh;
      background: rgba(0, 10, 25, 0.90);
      backdrop-filter: blur(6px);
      z-index: 9999;
      display: flex; justify-content: center; align-items: center;
      transition: left 0.35s cubic-bezier(0.15, 0.85, 0.35, 1.2);
      pointer-events: none;
    }
    .corner-cutin-overlay.active { left: 0; }
    .corner-cutin-overlay.exit { left: 100%; }

    .corner-cutin-box {
      width: 88%; max-width: 480px;
      background: linear-gradient(135deg, #0a0d1a, #161c33);
      border: 3px solid #ffcc00;
      box-shadow: 0 0 35px rgba(255, 204, 0, 0.5);
      border-radius: 16px; padding: 28px 20px;
      text-align: center; color: #fff;
    }
    .corner-cutin-title {
      font-size: 1.2rem; color: #70d6ff;
      font-weight: bold; letter-spacing: 2px; margin-bottom: 8px;
    }
    .corner-cutin-horse {
      font-size: 2.2rem; color: #ffffff; font-weight: 900;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
      margin-bottom: 16px;
    }

    /* レア度ポップアップバッジ */
    .corner-rarity-container {
      display: inline-flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 8px 30px; border-radius: 12px;
      transform: scale(0); opacity: 0;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.4), opacity 0.3s;
    }
    .corner-rarity-container.pop { transform: scale(1.1); opacity: 1; }
    .rarity-code {
      font-size: 2.2rem; font-weight: 900; font-style: italic;
      color: #fff; line-height: 1; text-shadow: 2px 2px 4px #000;
    }
    .rarity-full {
      font-size: 0.9rem; font-weight: 700; color: #fff;
      letter-spacing: 1px; text-shadow: 1px 1px 3px #000;
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

  // 1. レア度設定の取得（未定義の場合は NOR をフォールバック）[span_2](start_span)[span_2](end_span)
  const code = (chosenHorse.rarity || 'NOR').toUpperCase();
  const config = RARITY_CONFIG[code] || RARITY_CONFIG['NOR'];

  // 2. HTML生成
  overlay.innerHTML = `
    <div class="corner-cutin-box">
      <div class="corner-cutin-title">第4コーナーをカーブして…！</div>
      <div class="corner-cutin-horse">${chosenHorse.name}</div>
      <div id="corner-rarity" class="corner-rarity-container">
        <span class="rarity-code">${code}</span>
        <span class="rarity-full">${config.name}</span>
      </div>
    </div>
  `;

  // 3. レア度に応じた動的スタイル適用
  const rarityBadge = document.getElementById('corner-rarity');
  if (rarityBadge) {
    rarityBadge.style.background = config.bg;
    rarityBadge.style.boxShadow = config.shadow;
  }

  // 4. アニメーション実行（中央へスライドイン）
  await new Promise(r => setTimeout(r, 50));
  overlay.classList.remove('exit');
  overlay.classList.add('active');

  // 5. 追いかけでレア度ポップアップ表示
  await new Promise(r => setTimeout(r, 600));
  if (rarityBadge) rarityBadge.classList.add('pop');

  // 6. 中央で3秒間停止・保持
  await new Promise(r => setTimeout(r, 3000));

  // 7. スライドアウト消去
  overlay.classList.remove('active');
  overlay.classList.add('exit');
  await new Promise(r => setTimeout(r, 400));
}
