// レアリティごとのカード外枠カラー
const RARITY_BORDER_COLORS = {
  INF: '#ff00ff',
  SER: '#8a2be2',
  ULR: '#d4af37',
  LGR: '#b8860b',
  CLR: '#d2691e',
  TRR: '#4b0082',
  RER: '#708090',
  ANR: '#2e8b57',
  VIR: '#1e90ff',
  PRR: '#9370db',
  SPR: '#32cd32',
  NOR: '#9ca3af',
};
const DEFAULT_BORDER_COLOR = '#9ca3af';

// 脚質ごとのテーマカラー
const STYLE_THEMES = {
  '逃げ': { fill: 'rgba(239, 83, 80, 0.35)', border: '#e53935', point: '#c62828', bg: '#ffebee', text: '#c62828' },
  '大逃': { fill: 'rgba(239, 83, 80, 0.35)', border: '#e53935', point: '#c62828', bg: '#ffebee', text: '#c62828' },
  '先行': { fill: 'rgba(255, 167, 38, 0.35)', border: '#fb8c00', point: '#ef6c00', bg: '#fff3e0', text: '#ef6c00' },
  '好位': { fill: 'rgba(255, 167, 38, 0.35)', border: '#fb8c00', point: '#ef6c00', bg: '#fff3e0', text: '#ef6c00' },
  '差し': { fill: 'rgba(102, 187, 106, 0.35)', border: '#43a047', point: '#2e7d32', bg: '#e8f5e9', text: '#2e7d32' },
  '追込': { fill: 'rgba(171, 71, 188, 0.35)', border: '#ab47bc', point: '#7b1fa2', bg: '#f3e5f5', text: '#7b1fa2' },
  '自在': { fill: 'rgba(30, 136, 229, 0.35)', border: '#1e88e5', point: '#1565c0', bg: '#e3f2fd', text: '#1565c0' },
  '逃追': { fill: 'rgba(30, 136, 229, 0.35)', border: '#1e88e5', point: '#1565c0', bg: '#e3f2fd', text: '#1565c0' },
  'default': { fill: 'rgba(45, 106, 55, 0.35)', border: '#2d6a37', point: '#1b4d23', bg: '#e8f5e9', text: '#2d6a37' }
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
      .crc-card {
        box-sizing: border-box;
        border-radius: 8px;
        background: #ffffff;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        color: #1a2e1d;
        width: 100%;
        min-width: 0;
        cursor: pointer;
        transition: transform 0.1s ease, box-shadow 0.1s ease;
      }
      .crc-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(0,0,0,0.12);
      }

      .crc-abilities-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 3px;
        width: 100%;
        box-sizing: border-box;
      }
      .crc-ability-btn {
        background: #e2efe3;
        border: 1px solid #2d6a37;
        color: #2d6a37;
        border-radius: 4px;
        padding: 3px 0;
        font-size: 9.5px;
        font-weight: bold;
        text-align: center;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .crc-ability-btn.empty {
        visibility: hidden;
        border-color: transparent;
        background: transparent;
      }

      /* 通常一覧用デックレイアウト */
      .crc-card-deck {
        padding: 6px;
        min-height: 135px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
      }
      .crc-deck-header {
        width: 100%;
        margin-bottom: 4px;
      }
      .crc-deck-name {
        font-weight: bold;
        font-size: 11px;
        letter-spacing: -0.3px;
        color: #1a2e1d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }
      .crc-deck-body {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        margin: 2px 0;
      }
      .crc-deck-img-box {
        width: 32px;
        height: 32px;
        flex-shrink: 0;
        border: 1px solid #b5d4ba;
        border-radius: 4px;
        overflow: hidden;
        background: #f2f7f3;
      }
      .crc-deck-details {
        display: flex;
        flex-direction: column;
        gap: 1px;
        color: #4e6b52;
        font-size: 10px;
        font-weight: bold;
        line-height: 1.2;
        flex: 1;
      }
      .crc-deck-radar {
        width: 65px;
        height: 65px;
        flex-shrink: 0;
      }

      /* 拡大表示（3:4 縦長ボーナスカード用） */
      .crc-card-large {
        width: 100%;
        aspect-ratio: 3 / 4;
        padding: 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        box-sizing: border-box;
        overflow: hidden;
      }

      /* 1行目: 馬名 + レアバッジ */
      .crc-large-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e2efe3;
        padding-bottom: 4px;
      }
      .crc-large-name {
        font-size: 16px;
        font-weight: 900;
        color: #1a2e1d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 72%;
      }
      .crc-rarity-badge {
        font-size: 10px;
        font-weight: 900;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 10px;
        letter-spacing: 0.5px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }

      /* 2行目: 画像 */
      .crc-large-hero-img {
        width: 100%;
        height: 110px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #b5d4ba;
        background: #f2f7f3;
        margin: 2px 0;
      }
      .crc-large-hero-img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      /* 3行目: 基本ステータス（2行構造） */
      .crc-large-info-block {
        background: #f6faf7;
        border-radius: 6px;
        padding: 5px 8px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        border: 1px solid #e2efe3;
      }
      .crc-info-row {
        display: flex;
        justify-content: space-around;
        align-items: center;
        font-size: 10.5px;
        font-weight: bold;
        color: #2d6a37;
      }
      .crc-info-item {
        white-space: nowrap;
      }

      /* 4行目: 左右分割（左レーダー / 右コメント） */
      .crc-large-mid-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        height: 105px;
        margin: 1px 0;
      }
      .crc-large-radar-wrap {
        width: 105px;
        height: 105px;
        flex-shrink: 0;
      }
      .crc-large-comment-box {
        flex: 1;
        height: 100%;
        background: #f4f8f4;
        border-radius: 6px;
        border: 1px solid #d0e4d2;
        padding: 6px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        overflow: hidden;
      }
      .crc-comment-title {
        font-size: 9.5px;
        font-weight: bold;
        color: #1b4d23;
        margin-bottom: 2px;
      }
      .crc-comment-text {
        font-size: 10px;
        color: #334e38;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-weight: 500;
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
    if (t > 0 && d > 0) return t === d ? `芝/ダ${t}` : `芝${t}ダ${d}`;
    if (t > 0) return `芝${t}`;
    if (d > 0) return `ダ${d}`;
    return '-';
  }

  getDistanceText(horse) {
    const min = horse.min_distance || horse.distance_min;
    const max = horse.max_distance || horse.distance_max;
    if (min && max) return `${min}m-${max}m`;
    if (horse.distance) return `${horse.distance}m`;
    return '-';
  }

  getGenerationText(horse) {
    let idStr = String(horse?.horse_id || horse?.id || '');
    if (idStr.length >= 2) {
      const genYY = idStr.substring(0, 2);
      if (!isNaN(parseInt(genYY, 10))) return `${genYY}世代`;
    }
    const year = horse?.generation_year || horse?.birth_year || horse?.generation || horse?.gen_year;
    if (year) {
      const str = String(year);
      return str.length >= 4 ? `${str.slice(-2)}世代` : `${str}世代`;
    }
    return '----世代';
  }

  getDistanceLinesHtml(horse) {
    const min = horse.min_distance || horse.distance_min;
    const max = horse.max_distance || horse.distance_max;
    if (min && max) {
      return `<div>${min}m</div><div>${max}m</div>`;
    }
    if (horse.distance) {
      const parts = String(horse.distance).split('-');
      if (parts.length === 2) {
        return `<div>${parts[0]}m</div><div>${parts[1]}m</div>`;
      }
      return `<div>${horse.distance}</div>`;
    }
    return `<div>-</div>`;
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

  generateRadarSVG(params, styleName = 'default') {
    const theme = STYLE_THEMES[styleName] || STYLE_THEMES.default;
    const labels = ['スピ', 'スタ', '瞬発', '持続', '根性'];
    const values = [params.spdVal, params.stmVal, params.shpVal, params.jzkVal, params.gutVal];
    const maxVal = 25;

    const cx = 50, cy = 50, r = 35;
    const angles = [
      -Math.PI / 2,
      -Math.PI / 2 + (2 * Math.PI) / 5,
      -Math.PI / 2 + (4 * Math.PI) / 5,
      -Math.PI / 2 + (6 * Math.PI) / 5,
      -Math.PI / 2 + (8 * Math.PI) / 5
    ];

    let gridHtml = '';
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach(level => {
      const pts = angles.map(a => `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`).join(' ');
      gridHtml += `<polygon points="${pts}" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>`;
    });

    let axisHtml = '';
    angles.forEach(a => {
      axisHtml += `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(a)}" y2="${cy + r * Math.sin(a)}" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`;
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

    let labelsHtml = '';
    const labelOffsets = [
      { dx: 0, dy: -6 },
      { dx: 6, dy: -1 },
      { dx: 5, dy: 6 },
      { dx: -5, dy: 6 },
      { dx: -6, dy: -1 }
    ];
    angles.forEach((a, i) => {
      const lx = cx + (r + 7) * Math.cos(a) + labelOffsets[i].dx;
      const ly = cy + (r + 7) * Math.sin(a) + labelOffsets[i].dy;
      labelsHtml += `<text x="${lx}" y="${ly}" font-size="7" font-weight="bold" fill="${theme.border}" text-anchor="middle" dominant-baseline="central">${labels[i]}</text>`;
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

  getAbilityBadgesHtml(horse) {
    let abilities = [];
    if (Array.isArray(horse.ability)) {
      abilities = horse.ability;
    } else if (typeof horse.ability === 'string' && horse.ability) {
      abilities = [horse.ability];
    } else if (horse.skill) {
      abilities = Array.isArray(horse.skill) ? horse.skill : [horse.skill];
    }

    let html = '<div class="crc-abilities-row">';
    for (let i = 0; i < 3; i++) {
      if (abilities[i]) {
        const label = String(abilities[i]).substring(0, 3);
        html += `<div class="crc-ability-btn" title="${abilities[i]}">${label}</div>`;
      } else {
        html += `<div class="crc-ability-btn empty">---</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  renderCardUI(horseId, mode = 'deck') {
    let horse = this.getHorse(horseId);
    if (!horse && typeof horseId === 'object' && horseId !== null) {
      horse = horseId;
    }
    if (!horse) return `<div class="card-error" style="color:#888; font-size:11px; text-align:center; padding:10px;">(未設定: ID ${horseId})</div>`;

    const rarityKey = (horse.rarity || 'NOR').toUpperCase();
    const borderColor = RARITY_BORDER_COLORS[rarityKey] || DEFAULT_BORDER_COLOR;

    const surfaceText = this.formatAptitude(
      this.getHorseParam(horse, ['turf_potential', 'turf']),
      this.getHorseParam(horse, ['dirt_potential', 'dirt'])
    );
    const distText = this.getDistanceText(horse);
    const genText = this.getGenerationText(horse);
    const sexText = horse.sex || '-';
    const abilitiesHtml = this.getAbilityBadgesHtml(horse);

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

    const styleName = horse.style || horse.running_style || 'default';
    const radarSvgHtml = this.generateRadarSVG(paramsObj, styleName);

    const rawId = String(horse?.horse_id || horse?.id || '8801');
    const formattedId = rawId.padStart(4, '0');
    const imgPath = `./images/${formattedId}.jpg`;
    const fallbackPath = `./images/8801.jpg`;

    // 1. デック用（通常一覧表示）
    if (mode === 'deck') {
      const distLinesHtml = this.getDistanceLinesHtml(horse);
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
              <div>${surfaceText}</div>
              ${distLinesHtml}
              <div>${styleName}</div>
              <div>${sexText}</div>
            </div>
            <div class="crc-deck-radar">
              ${radarSvgHtml}
            </div>
          </div>
          ${abilitiesHtml}
        </div>
      `;
    }

    // 2. 拡大表示（large モード：縦長 3:4 スケール）
    const commentText = horse.comment || horse.description || horse.memo || `${horse.name}。高い能力を秘めた競走馬。`;

    return `
      <div class="crc-card crc-card-large" style="border: 3px solid ${borderColor};">
        <!-- 1行目: 馬名 (左) + レアバッジ (右) -->
        <div class="crc-large-header">
          <div class="crc-large-name" title="${horse.name}">${horse.name}</div>
          <div class="crc-rarity-badge" style="background: ${borderColor};">${rarityKey}</div>
        </div>

        <!-- 2行目: 馬画像 -->
        <div class="crc-large-hero-img">
          <img src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" alt="${horse.name}">
        </div>

        <!-- 3行目: 基本情報 (2行構造) -->
        <div class="crc-large-info-block">
          <div class="crc-info-row">
            <span class="crc-info-item">適性: ${surfaceText}</span>
            <span class="crc-info-item">性別: ${sexText}</span>
            <span class="crc-info-item">${genText}</span>
          </div>
          <div class="crc-info-row">
            <span class="crc-info-item">距離: ${distText}</span>
            <span class="crc-info-item">脚質: ${styleName}</span>
          </div>
        </div>

        <!-- 4行目: 左右分割 (左: レーダーチャート / 右: コメント) -->
        <div class="crc-large-mid-section">
          <div class="crc-large-radar-wrap">
            ${radarSvgHtml}
          </div>
          <div class="crc-large-comment-box">
            <div class="crc-comment-title">【特徴・メモ】</div>
            <div class="crc-comment-text">${commentText}</div>
          </div>
        </div>

        <!-- 5行目: アビリティバッジ -->
        ${abilitiesHtml}
      </div>
    `;
  }
}

export const cardRenderer = new CardRenderer();
