// レアリティごとのカード外枠カラー
const RARITY_BORDER_COLORS = {
  INF: '#ff00ff', SER: '#8a2be2', ULR: '#f1c40f', LGR: '#b8860b',
  CLR: '#d2691e', TRR: '#4b0082', RER: '#708090', ANR: '#2e8b57',
  VIR: '#1e90ff', PRR: '#9370db', SPR: '#32cd32', NOR: '#7f8c8d',
};
const DEFAULT_BORDER_COLOR = '#d4af37';

// 脚質ごとのテーマカラー＆グラデーション・アイコン
const STYLE_THEMES = {
  '大逃': { icon: '⚡', fill: 'rgba(239, 83, 80, 0.4)', border: '#e53935', point: '#ff5252', grad: 'linear-gradient(135deg, #e53935, #b71c1c)' },
  '逃げ': { icon: '🏃', fill: 'rgba(255, 112, 67, 0.4)', border: '#f4511e', point: '#ff7043', grad: 'linear-gradient(135deg, #f4511e, #bf360c)' },
  '先行': { icon: '🎯', fill: 'rgba(255, 179, 0, 0.4)', border: '#ffb300', point: '#ffca28', grad: 'linear-gradient(135deg, #fb8c00, #e65100)' },
  '好位': { icon: '🎯', fill: 'rgba(255, 179, 0, 0.4)', border: '#ffb300', point: '#ffca28', grad: 'linear-gradient(135deg, #fb8c00, #e65100)' },
  '差し': { icon: '🐎', fill: 'rgba(76, 175, 80, 0.4)', border: '#43a047', point: '#66bb6a', grad: 'linear-gradient(135deg, #43a047, #1b5e20)' },
  '追込': { icon: '🚀', fill: 'rgba(171, 71, 188, 0.4)', border: '#ab47bc', point: '#ba68c8', grad: 'linear-gradient(135deg, #ab47bc, #4a148c)' },
  '自在': { icon: '✨', fill: 'rgba(30, 136, 229, 0.4)', border: '#1e88e5', point: '#42a5f5', grad: 'linear-gradient(135deg, #1e88e5, #0d47a1)' },
  '逃追': { icon: '🔀', fill: 'rgba(0, 150, 136, 0.4)', border: '#00897b', point: '#26a69a', grad: 'linear-gradient(135deg, #00897b, #004d40)' },
  'default': { icon: '🏇', fill: 'rgba(212, 175, 55, 0.4)', border: '#d4af37', point: '#f1c40f', grad: 'linear-gradient(135deg, #d35400, #a04000)' }
};

export class CardRenderer {
  constructor() {
    this.horsesMap = new Map();
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded) return;

    try {
      const horsesPath = './data/horses_master.json';
      const horsesRes = await fetch(horsesPath).catch(e => {
        throw new Error(`[通信エラー] ${horsesPath} にアクセスできません`);
      });

      if (!horsesRes.ok) throw new Error(`馬データが見つかりません (ステータス: ${horsesRes.status}) パス: ${horsesPath}`);
      const horsesArray = await horsesRes.json();

      this.horsesMap.clear();
      horsesArray.forEach(horse => {
        this.horsesMap.set(String(horse.horse_id || horse.id), horse);
      });

      this.injectStyles();
      this.isLoaded = true;
      console.log("✅ CardRenderer 初期化完了:", this.horsesMap.size, "件");
    } catch (error) {
      console.error("❌ CardRenderer の初期化に失敗:", error);
      throw error;
    }
  }

  injectStyles() {
    if (document.getElementById('card-renderer-styles')) return;

    const style = document.createElement('style');
    style.id = 'card-renderer-styles';
    style.textContent = `
      /* カード基本設定 */
      .crc-card {
        box-sizing: border-box;
        border-radius: 12px;
        font-family: 'Hiragino Sans', 'Meiryo', 'Helvetica Neue', Arial, sans-serif;
        color: #f5f6fa;
        width: 100%;
        height: 100%;
        min-width: 0;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      /* デッキ用ミニカード */
      .crc-card-deck {
        padding: 6px;
        min-height: 135px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
        background: #1e2429;
        border-radius: 8px;
        color: #e1e8ed;
      }
      .crc-deck-header { width: 100%; margin-bottom: 4px; }
      .crc-deck-name {
        font-weight: bold; font-size: 11px; color: #f1c40f;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;
      }
      .crc-deck-body { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin: 2px 0; }
      .crc-deck-img-box { width: 34px; height: 34px; flex-shrink: 0; border: 1px solid #d4af37; border-radius: 4px; overflow: hidden; background: #111; }
      .crc-deck-details { display: flex; flex-direction: column; gap: 1px; color: #cbd5e1; font-size: 10px; font-weight: bold; line-height: 1.2; flex: 1; }
      .crc-deck-radar { width: 60px; height: 60px; flex-shrink: 0; }
      .crc-abilities-row { display: flex; justify-content: center; align-items: center; gap: 3px; width: 100%; }
      .crc-ability-btn {
        background: rgba(241, 196, 15, 0.15);
        border: 1px solid #f1c40f;
        color: #f1c40f;
        border-radius: 3px;
        padding: 2px 0;
        font-size: 8.5px;
        font-weight: bold;
        text-align: center;
        flex: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* 🃏 大型カード：シックダーク＆ゴールド仕様 (59:86黄金比) */
      .crc-card-large {
        width: 100%;
        height: 100%;
        aspect-ratio: 59 / 86;
        padding: 8px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 12px;
        background: linear-gradient(160deg, #1f2428 0%, #111417 100%);
        box-shadow: 0 10px 28px rgba(0,0,0,0.8), 0 0 12px rgba(212, 175, 55, 0.25);
        box-sizing: border-box;
        overflow: hidden;
      }

      /* ヘッダー: 左(世代) / 中央(馬名) / 右(レアリティ) */
      .crc-large-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(90deg, #111518, #2a3137, #111518);
        border: 1px solid #d4af37;
        padding: 3px 6px;
        border-radius: 5px;
        flex-shrink: 0;
      }
      .crc-generation-badge {
        background: #34495e;
        color: #ecf0f1;
        font-size: 10px;
        font-weight: bold;
        padding: 1px 5px;
        border-radius: 3px;
        border: 1px solid #7f8c8d;
      }
      .crc-large-name {
        font-size: 13.5px;
        font-weight: bold;
        color: #ffffff;
        text-shadow: 1px 1px 3px #000;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 55%;
        text-align: center;
      }
      .crc-rarity-badge {
        font-size: 10px;
        font-weight: bold;
        color: #111;
        padding: 1px 5px;
        border-radius: 3px;
        text-shadow: 0 1px 1px rgba(255,255,255,0.4);
      }

      /* 競馬場風背景 ＋ メインイラスト (横幅コンパクト化) */
      .crc-large-hero-wrap {
        width: 100%;
        height: 30%;
        border: 1.5px solid #d4af37;
        border-radius: 5px;
        overflow: hidden;
        position: relative;
        background: linear-gradient(180deg, #2980b9 0%, #27ae60 65%, #1e824c 100%);
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
      }
      .crc-large-hero-wrap::before {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.5) 100%);
        pointer-events: none;
      }
      .crc-large-hero-img {
        height: 96%;
        max-width: 75%;
        object-fit: contain;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
        z-index: 1;
      }

      /* 🎯 出走条件ワンセットパネル */
      .crc-conditions-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 0, 0, 0.65);
        border: 1px solid rgba(212, 175, 55, 0.7);
        border-radius: 5px;
        padding: 3px 8px;
        flex-shrink: 0;
      }
      .crc-cond-item {
        font-size: 10.5px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .crc-cond-turf { color: #2ecc71; }
      .crc-cond-dirt { color: #e67e22; }
      .crc-cond-dist { color: #f1c40f; }
      .crc-cond-sex  { color: #ecf0f1; }

      /* 📊 チャート＆右側(脚質＋アビリティ) */
      .crc-large-spec-container {
        display: flex;
        background: rgba(0,0,0,0.5);
        border: 1px solid #444;
        border-radius: 5px;
        padding: 4px;
        height: 29%;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
      }
      .crc-large-radar-wrap {
        width: 50%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .crc-right-status-box {
        width: 50%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 4px;
        height: 100%;
      }
      .crc-style-badge {
        color: #ffffff;
        font-weight: bold;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }
      .crc-ability-list-box {
        display: flex;
        flex-direction: column;
        gap: 3px;
        justify-content: center;
        flex-grow: 1;
      }
      .crc-ability-item {
        background: linear-gradient(135deg, #f1c40f, #f39c12);
        color: #111;
        font-weight: bold;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 3px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }

      /* 📜 コメント・メモ領域 (フォント拡大 11.5px) */
      .crc-large-comment-box {
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid #444;
        border-radius: 5px;
        padding: 4px 6px;
        height: 20%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex-shrink: 0;
      }
      .crc-comment-title {
        font-size: 9.5px;
        font-weight: bold;
        color: #f1c40f;
        margin-bottom: 2px;
      }
      .crc-comment-text {
        font-size: 11.5px;
        color: #f5f6fa;
        line-height: 1.25;
        overflow-y: auto;
      }
    `;
    document.head.appendChild(style);
  }

  getHorse(horseId) {
    if (!horseId) return null;
    return this.horsesMap.get(String(horseId));
  }

  formatAptitude(turf, dirt) {
    const t = Number(turf) || 0;
    const d = Number(dirt) || 0;
    let res = [];
    if (t > 0) res.push(`<span class="crc-cond-turf">芝 ${t}</span>`);
    else res.push(`<span class="crc-cond-turf" style="opacity:0.5;">芝 --</span>`);
    
    if (d > 0) res.push(`<span class="crc-cond-dirt">ダ ${d}</span>`);
    else res.push(`<span class="crc-cond-dirt" style="opacity:0.5;">ダ --</span>`);
    
    return res.join(' ');
  }

  getDistanceText(horse) {
    const min = horse.min_distance || horse.distance_min;
    const max = horse.max_distance || horse.distance_max;
    if (min && max) return `${min}-${max}m`;
    if (horse.distance) return `${horse.distance}m`;
    return '----m';
  }

  getGenerationText(horse) {
    let rawYear = horse?.generation_year || horse?.birth_year || horse?.generation || horse?.gen_year || horse?.year;
    if (rawYear) {
      const num = Number(rawYear);
      if (!isNaN(num)) {
        if (num >= 1000 && num <= 9999) return `${num}世代`;
        if (num < 100) {
          const fullYear = num >= 30 ? 1900 + num : 2000 + num;
          return `${fullYear}世代`;
        }
      }
    }
    let idStr = String(horse?.horse_id || horse?.id || '');
    if (idStr.length >= 4) {
      const yy = parseInt(idStr.substring(0, 2), 10);
      if (!isNaN(yy)) {
        const fullYear = yy >= 30 ? 1900 + yy : 2000 + yy;
        return `${fullYear}世代`;
      }
    }
    return '----世代';
  }

  rankToValue(rank) {
    if (!rank) return 12;
    const r = String(rank).toUpperCase();
    if (r === 'SS') return 24;
    if (r === 'S') return 21;
    if (r === 'A') return 18;
    if (r === 'B') return 15;
    if (r === 'C') return 12;
    const num = Number(rank);
    return !isNaN(num) ? num : 12;
  }

  getParamRank(val) {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "-";
    const num = Number(val);
    if (num >= 23) return "SS";
    if (num >= 21) return "S";
    if (num >= 18) return "A";
    if (num >= 16) return "B";
    return "C";
  }

  getHorseParam(horse, keys) {
    for (const key of keys) {
      if (horse[key] !== undefined && horse[key] !== null) {
        return horse[key];
      }
    }
    return undefined;
  }

  // レーダーチャート（5大パラメータテキスト付き）のSVG生成
  generateRadarSVG(params, styleName = 'default') {
    const theme = STYLE_THEMES[styleName] || STYLE_THEMES.default;
    const labels = ['スピ', 'スタ', '瞬発', '持続', '根性'];
    const values = [params.spdVal, params.stmVal, params.shpVal, params.jzkVal, params.gutVal];
    const maxVal = 25;

    const cx = 50, cy = 50, r = 32;
    const angles = [
      -Math.PI / 2,
      -Math.PI / 2 + (2 * Math.PI) / 5,
      -Math.PI / 2 + (4 * Math.PI) / 5,
      -Math.PI / 2 + (6 * Math.PI) / 5,
      -Math.PI / 2 + (8 * Math.PI) / 5
    ];

    let gridHtml = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const pts = angles.map(a => `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`).join(' ');
      gridHtml += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>`;
    });

    let axisHtml = '';
    angles.forEach(a => {
      axisHtml += `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>`;
    });

    const dataPtsArr = values.map((v, i) => {
      const ratio = Math.min(1.0, Math.max(0.1, v / maxVal));
      return {
        x: cx + r * ratio * Math.cos(angles[i]),
        y: cy + r * ratio * Math.sin(angles[i])
      };
    });
    const dataPtsStr = dataPtsArr.map(p => `${p.x},${p.y}`).join(' ');

    let pointsHtml = '';
    dataPtsArr.forEach(p => {
      pointsHtml += `<circle cx="${p.x}" cy="${p.y}" r="2" fill="${theme.point}" />`;
    });

    // パラメータラベル（スピ、スタ、瞬発、持続、根性）
    let labelsHtml = '';
    const labelOffsets = [
      { dx: 0, dy: -6 },
      { dx: 7, dy: -1 },
      { dx: 5, dy: 6 },
      { dx: -5, dy: 6 },
      { dx: -7, dy: -1 }
    ];
    angles.forEach((a, i) => {
      const lx = cx + (r + 7.5) * Math.cos(a) + labelOffsets[i].dx;
      const ly = cy + (r + 7.5) * Math.sin(a) + labelOffsets[i].dy;
      labelsHtml += `<text x="${lx}" y="${ly}" font-size="8" font-weight="bold" fill="#f1c40f" text-anchor="middle" dominant-baseline="central">${labels[i]}</text>`;
    });

    return `
      <svg viewBox="0 0 100 100" class="crc-radar-svg" style="width:100%; height:100%; overflow:visible;">
        ${gridHtml}
        ${axisHtml}
        <polygon points="${dataPtsStr}" fill="${theme.fill}" stroke="${theme.border}" stroke-width="1.8"/>
        ${pointsHtml}
        ${labelsHtml}
      </svg>
    `;
  }

  getRawAbilities(horse) {
    if (Array.isArray(horse.ability)) return horse.ability;
    if (typeof horse.ability === 'string' && horse.ability) return [horse.ability];
    if (horse.skill) return Array.isArray(horse.skill) ? horse.skill : [horse.skill];
    return [];
  }

  getAbilityListHtml(horse) {
    const abilities = this.getRawAbilities(horse).filter(a => a && String(a).trim() !== '');
    if (abilities.length === 0) return '';

    let html = '<div class="crc-ability-list-box">';
    for (let i = 0; i < Math.min(3, abilities.length); i++) {
      html += `<div class="crc-ability-item" title="${abilities[i]}">✨ ${abilities[i]}</div>`;
    }
    html += '</div>';
    return html;
  }

  renderCardUI(horseId, mode = 'deck') {
    let horse = this.getHorse(horseId);
    if (!horse && typeof horseId === 'object' && horseId !== null) {
      horse = horseId;
    }
    if (!horse) return `<div class="card-error" style="color:#888; font-size:11px; text-align:center; padding:10px;">(未設定)</div>`;

    const rarityKey = (horse.rarity || 'NOR').toUpperCase();
    const borderColor = RARITY_BORDER_COLORS[rarityKey] || DEFAULT_BORDER_COLOR;

    const surfaceHtml = this.formatAptitude(
      this.getHorseParam(horse, ['turf_potential', 'turf']),
      this.getHorseParam(horse, ['dirt_potential', 'dirt'])
    );
    const distText = this.getDistanceText(horse);
    const genText = this.getGenerationText(horse);
    const sexText = horse.sex || '牡馬';

    const spdParam = this.getHorseParam(horse, ['speed', 'spd']);
    const stmParam = this.getHorseParam(horse, ['stamina', 'stm']);
    const shpParam = this.getHorseParam(horse, ['sharp', 'sharpness', 'agility']);
    const jzkParam = this.getHorseParam(horse, ['jizoku', 'durability', 'tenacity']);
    const gutParam = this.getHorseParam(horse, ['guts', 'stren']);

    const paramsObj = {
      spdVal: typeof spdParam === 'number' ? spdParam : this.rankToValue(this.getParamRank(spdParam)),
      stmVal: typeof stmParam === 'number' ? stmParam : this.rankToValue(this.getParamRank(stmParam)),
      shpVal: typeof shpParam === 'number' ? shpParam : this.rankToValue(this.getParamRank(shpParam)),
      jzkVal: typeof jzkParam === 'number' ? jzkParam : this.rankToValue(this.getParamRank(jzkParam)),
      gutVal: typeof gutParam === 'number' ? gutParam : this.rankToValue(this.getParamRank(gutParam))
    };

    const styleName = horse.style || horse.running_style || '差し';
    const styleTheme = STYLE_THEMES[styleName] || STYLE_THEMES.default;
    const radarSvgHtml = this.generateRadarSVG(paramsObj, styleName);

    const rawId = String(horse?.horse_id || horse?.id || '8801');
    const formattedId = rawId.padStart(4, '0');
    const imgPath = `./images/${formattedId}.jpg`;
    const fallbackPath = `./images/8801.jpg`;

    // デッキモード（ミニカード）
    if (mode === 'deck') {
      const rawAbilities = this.getRawAbilities(horse);
      let abilitiesRow = '<div class="crc-abilities-row">';
      for (let i = 0; i < 3; i++) {
        if (rawAbilities[i]) {
          abilitiesRow += `<div class="crc-ability-btn">${String(rawAbilities[i]).substring(0, 4)}</div>`;
        }
      }
      abilitiesRow += '</div>';

      return `
        <div class="crc-card crc-card-deck" style="border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor};">
          <div class="crc-deck-header">
            <div class="crc-deck-name" title="${horse.name}">${horse.name}</div>
          </div>
          <div class="crc-deck-body">
            <div class="crc-deck-img-box">
              <img src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" style="width:100%; height:100%; object-fit:cover;" alt="horse">
            </div>
            <div class="crc-deck-details">
              <div>${distText}</div>
              <div>${styleName} / ${sexText}</div>
            </div>
            <div class="crc-deck-radar">
              ${radarSvgHtml}
            </div>
          </div>
          ${abilitiesRow}
        </div>
      `;
    }

    // 大型カードモード（シック＆ゴールド仕様）
    const commentText = horse.comment || horse.description || horse.memo || `${horse.name}。血統と能力に恵まれた競走馬。`;
    const abilityListHtml = this.getAbilityListHtml(horse);

    return `
      <div class="crc-card crc-card-large" style="border: 3px solid ${borderColor};">
        <!-- ヘッダー (左:世代 / 中央:馬名 / 右:レアリティ) -->
        <div class="crc-large-header">
          <span class="crc-generation-badge">${genText}</span>
          <span class="crc-large-name" title="${horse.name}">${horse.name}</span>
          <span class="crc-rarity-badge" style="background: ${borderColor};">${rarityKey}</span>
        </div>

        <!-- メインイラスト (背景風景＋中央コンパクト画像) -->
        <div class="crc-large-hero-wrap">
          <img class="crc-large-hero-img" src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" alt="${horse.name}">
        </div>

        /* 🎯 出走条件ワンセットパネル */
      .crc-conditions-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 0, 0, 0.65);
        border: 1px solid rgba(212, 175, 55, 0.7);
        border-radius: 5px;
        padding: 3px 8px;
        flex-shrink: 0;
      }
      .crc-cond-item {
        font-size: 10.5px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .crc-cond-turf { color: #2ecc71; }
      .crc-cond-dirt { color: #e67e22; }
      .crc-cond-dist { color: #f1c40f; }
      .crc-cond-sex  { color: #ecf0f1; }

      /* 📊 チャート＆右側(脚質＋アビリティ) */
      .crc-large-spec-container {
        display: flex;
        background: rgba(0,0,0,0.5);
        border: 1px solid #444;
        border-radius: 5px;
        padding: 4px;
        height: 29%;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
      }
      .crc-large-radar-wrap {
        width: 50%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .crc-right-status-box {
        width: 50%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        gap: 4px;
        height: 100%;
      }
      .crc-style-badge {
        color: #ffffff;
        font-weight: bold;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.3);
        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }
      .crc-ability-list-box {
        display: flex;
        flex-direction: column;
        gap: 3px;
        justify-content: center;
        flex-grow: 1;
      }
      .crc-ability-item {
        background: linear-gradient(135deg, #f1c40f, #f39c12);
        color: #111;
        font-weight: bold;
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 3px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }

      /* 📜 コメント・メモ領域 (フォント拡大 11.5px) */
      .crc-large-comment-box {
        background: rgba(0, 0, 0, 0.7);
        border: 1px solid #444;
        border-radius: 5px;
        padding: 4px 6px;
        height: 20%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex-shrink: 0;
      }
      .crc-comment-title {
        font-size: 9.5px;
        font-weight: bold;
        color: #f1c40f;
        margin-bottom: 2px;
      }
      .crc-comment-text {
        font-size: 11.5px;
        color: #f5f6fa;
        line-height: 1.25;
        overflow-y: auto;
      }
    `;
    document.head.appendChild(style);
  }

  getHorse(horseId) {
    if (!horseId) return null;
    return this.horsesMap.get(String(horseId));
  }

  formatAptitude(turf, dirt) {
    const t = Number(turf) || 0;
    const d = Number(dirt) || 0;
    let res = [];
    if (t > 0) res.push(`<span class="crc-cond-turf">芝 ${t}</span>`);
    else res.push(`<span class="crc-cond-turf" style="opacity:0.5;">芝 --</span>`);
    
    if (d > 0) res.push(`<span class="crc-cond-dirt">ダ ${d}</span>`);
    else res.push(`<span class="crc-cond-dirt" style="opacity:0.5;">ダ --</span>`);
    
    return res.join(' ');
  }

  getDistanceText(horse) {
    const min = horse.min_distance || horse.distance_min;
    const max = horse.max_distance || horse.distance_max;
    if (min && max) return `${min}-${max}m`;
    if (horse.distance) return `${horse.distance}m`;
    return '----m';
  }

  getGenerationText(horse) {
    let rawYear = horse?.generation_year || horse?.birth_year || horse?.generation || horse?.gen_year || horse?.year;
    if (rawYear) {
      const num = Number(rawYear);
      if (!isNaN(num)) {
        if (num >= 1000 && num <= 9999) return `${num}世代`;
        if (num < 100) {
          const fullYear = num >= 30 ? 1900 + num : 2000 + num;
          return `${fullYear}世代`;
        }
      }
    }
    let idStr = String(horse?.horse_id || horse?.id || '');
    if (idStr.length >= 4) {
      const yy = parseInt(idStr.substring(0, 2), 10);
      if (!isNaN(yy)) {
        const fullYear = yy >= 30 ? 1900 + yy : 2000 + yy;
        return `${fullYear}世代`;
      }
    }
    return '----世代';
  }

  rankToValue(rank) {
    if (!rank) return 12;
    const r = String(rank).toUpperCase();
    if (r === 'SS') return 24;
    if (r === 'S') return 21;
    if (r === 'A') return 18;
    if (r === 'B') return 15;
    if (r === 'C') return 12;
    const num = Number(rank);
    return !isNaN(num) ? num : 12;
  }

  getParamRank(val) {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "-";
    const num = Number(val);
    if (num >= 23) return "SS";
    if (num >= 21) return "S";
    if (num >= 18) return "A";
    if (num >= 16) return "B";
    return "C";
  }

  getHorseParam(horse, keys) {
    for (const key of keys) {
      if (horse[key] !== undefined && horse[key] !== null) {
        return horse[key];
      }
    }
    return undefined;
  }

  // レーダーチャート（5大パラメータテキスト付き）のSVG生成
  generateRadarSVG(params, styleName = 'default') {
    const theme = STYLE_THEMES[styleName] || STYLE_THEMES.default;
    const labels = ['スピ', 'スタ', '瞬発', '持続', '根性'];
    const values = [params.spdVal, params.stmVal, params.shpVal, params.jzkVal, params.gutVal];
    const maxVal = 25;

    const cx = 50, cy = 50, r = 32;
    const angles = [
      -Math.PI / 2,
      -Math.PI / 2 + (2 * Math.PI) / 5,
      -Math.PI / 2 + (4 * Math.PI) / 5,
      -Math.PI / 2 + (6 * Math.PI) / 5,
      -Math.PI / 2 + (8 * Math.PI) / 5
    ];

    let gridHtml = '';
    [0.25, 0.5, 0.75, 1.0].forEach(level => {
      const pts = angles.map(a => `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`).join(' ');
      gridHtml += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>`;
    });

    let axisHtml = '';
    angles.forEach(a => {
      axisHtml += `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="rgba(255,255,255,0.2)" stroke-width="0.8"/>`;
    });

    const dataPtsArr = values.map((v, i) => {
      const ratio = Math.min(1.0, Math.max(0.1, v / maxVal));
      return {
        x: cx + r * ratio * Math.cos(angles[i]),
        y: cy + r * ratio * Math.sin(angles[i])
      };
    });
    const dataPtsStr = dataPtsArr.map(p => `${p.x},${p.y}`).join(' ');

    let pointsHtml = '';
    dataPtsArr.forEach(p => {
      pointsHtml += `<circle cx="${p.x}" cy="${p.y}" r="2" fill="${theme.point}" />`;
    });

    // パラメータラベル（スピ、スタ、瞬発、持続、根性）
    let labelsHtml = '';
    const labelOffsets = [
      { dx: 0, dy: -6 },
      { dx: 7, dy: -1 },
      { dx: 5, dy: 6 },
      { dx: -5, dy: 6 },
      { dx: -7, dy: -1 }
    ];
    angles.forEach((a, i) => {
      const lx = cx + (r + 7.5) * Math.cos(a) + labelOffsets[i].dx;
      const ly = cy + (r + 7.5) * Math.sin(a) + labelOffsets[i].dy;
      labelsHtml += `<text x="${lx}" y="${ly}" font-size="8" font-weight="bold" fill="#f1c40f" text-anchor="middle" dominant-baseline="central">${labels[i]}</text>`;
    });

    return `
      <svg viewBox="0 0 100 100" class="crc-radar-svg" style="width:100%; height:100%; overflow:visible;">
        ${gridHtml}
        ${axisHtml}
        <polygon points="${dataPtsStr}" fill="${theme.fill}" stroke="${theme.border}" stroke-width="1.8"/>
        ${pointsHtml}
        ${labelsHtml}
      </svg>
    `;
  }

  getRawAbilities(horse) {
    if (Array.isArray(horse.ability)) return horse.ability;
    if (typeof horse.ability === 'string' && horse.ability) return [horse.ability];
    if (horse.skill) return Array.isArray(horse.skill) ? horse.skill : [horse.skill];
    return [];
  }

  getAbilityListHtml(horse) {
    const abilities = this.getRawAbilities(horse).filter(a => a && String(a).trim() !== '');
    if (abilities.length === 0) return '';

    let html = '<div class="crc-ability-list-box">';
    for (let i = 0; i < Math.min(3, abilities.length); i++) {
      html += `<div class="crc-ability-item" title="${abilities[i]}">✨ ${abilities[i]}</div>`;
    }
    html += '</div>';
    return html;
  }

  renderCardUI(horseId, mode = 'deck') {
    let horse = this.getHorse(horseId);
    if (!horse && typeof horseId === 'object' && horseId !== null) {
      horse = horseId;
    }
    if (!horse) return `<div class="card-error" style="color:#888; font-size:11px; text-align:center; padding:10px;">(未設定)</div>`;

    const rarityKey = (horse.rarity || 'NOR').toUpperCase();
    const borderColor = RARITY_BORDER_COLORS[rarityKey] || DEFAULT_BORDER_COLOR;

    const surfaceHtml = this.formatAptitude(
      this.getHorseParam(horse, ['turf_potential', 'turf']),
      this.getHorseParam(horse, ['dirt_potential', 'dirt'])
    );
    const distText = this.getDistanceText(horse);
    const genText = this.getGenerationText(horse);
    const sexText = horse.sex || '牡馬';

    const spdParam = this.getHorseParam(horse, ['speed', 'spd']);
    const stmParam = this.getHorseParam(horse, ['stamina', 'stm']);
    const shpParam = this.getHorseParam(horse, ['sharp', 'sharpness', 'agility']);
    const jzkParam = this.getHorseParam(horse, ['jizoku', 'durability', 'tenacity']);
    const gutParam = this.getHorseParam(horse, ['guts', 'stren']);

    const paramsObj = {
      spdVal: typeof spdParam === 'number' ? spdParam : this.rankToValue(this.getParamRank(spdParam)),
      stmVal: typeof stmParam === 'number' ? stmParam : this.rankToValue(this.getParamRank(stmParam)),
      shpVal: typeof shpParam === 'number' ? shpParam : this.rankToValue(this.getParamRank(shpParam)),
      jzkVal: typeof jzkParam === 'number' ? jzkParam : this.rankToValue(this.getParamRank(jzkParam)),
      gutVal: typeof gutParam === 'number' ? gutParam : this.rankToValue(this.getParamRank(gutParam))
    };

    const styleName = horse.style || horse.running_style || '差し';
    const styleTheme = STYLE_THEMES[styleName] || STYLE_THEMES.default;
    const radarSvgHtml = this.generateRadarSVG(paramsObj, styleName);

    const rawId = String(horse?.horse_id || horse?.id || '8801');
    const formattedId = rawId.padStart(4, '0');
    const imgPath = `./images/${formattedId}.jpg`;
    const fallbackPath = `./images/8801.jpg`;

    // デッキモード（ミニカード）
    if (mode === 'deck') {
      const rawAbilities = this.getRawAbilities(horse);
      let abilitiesRow = '<div class="crc-abilities-row">';
      for (let i = 0; i < 3; i++) {
        if (rawAbilities[i]) {
          abilitiesRow += `<div class="crc-ability-btn">${String(rawAbilities[i]).substring(0, 4)}</div>`;
        }
      }
      abilitiesRow += '</div>';

      return `
        <div class="crc-card crc-card-deck" style="border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor};">
          <div class="crc-deck-header">
            <div class="crc-deck-name" title="${horse.name}">${horse.name}</div>
          </div>
          <div class="crc-deck-body">
            <div class="crc-deck-img-box">
              <img src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" style="width:100%; height:100%; object-fit:cover;" alt="horse">
            </div>
            <div class="crc-deck-details">
              <div>${distText}</div>
              <div>${styleName} / ${sexText}</div>
            </div>
            <div class="crc-deck-radar">
              ${radarSvgHtml}
            </div>
          </div>
          ${abilitiesRow}
        </div>
      `;
    }

    // 大型カードモード（シック＆ゴールド仕様）
    const commentText = horse.comment || horse.description || horse.memo || `${horse.name}。血統と能力に恵まれた競走馬。`;
    const abilityListHtml = this.getAbilityListHtml(horse);

    return `
      <div class="crc-card crc-card-large" style="border: 3px solid ${borderColor};">
        <!-- ヘッダー (左:世代 / 中央:馬名 / 右:レアリティ) -->
        <div class="crc-large-header">
          <span class="crc-generation-badge">${genText}</span>
          <span class="crc-large-name" title="${horse.name}">${horse.name}</span>
          <span class="crc-rarity-badge" style="background: ${borderColor};">${rarityKey}</span>
        </div>

        <!-- メインイラスト (背景風景＋中央コンパクト画像) -->
        <div class="crc-large-hero-wrap">
          <img class="crc-large-hero-img" src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" alt="${horse.name}">
        </div>

        <!-- 出走条件ワンセット (芝・ダポテンシャル ＋ 距離 ＋ 性別) -->
        <div class="crc-conditions-panel">
          <div class="crc-cond-item">${surfaceHtml}</div>
          <div class="crc-cond-item crc-cond-dist">⏱ ${distText}</div>
          <div class="crc-cond-item crc-cond-sex">♂ ${sexText}</div>
        </div>

        <!-- チャート & 右側(脚質 + アビリティ) -->
        <div class="crc-large-spec-container">
          <div class="crc-large-radar-wrap">
            ${radarSvgHtml}
          </div>
          <div class="crc-right-status-box">
            <div class="crc-style-badge" style="background: ${styleTheme.grad};">
              ${styleTheme.icon} 脚質: ${styleName}
            </div>
            ${abilityListHtml}
          </div>
        </div>

        <!-- コメント・特徴メモ (フォント拡大 11.5px) -->
        <div class="crc-large-comment-box">
          <div class="crc-comment-title">【特徴・メモ】</div>
          <div class="crc-comment-text">${commentText}</div>
        </div>
      </div>
    `;
  }
}

export const cardRenderer = new CardRenderer();

if (typeof window !== 'undefined') {
  window.CardRenderer = CardRenderer;
  window.cardRenderer = cardRenderer;
            }
