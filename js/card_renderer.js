// レアリティごとのカード外枠カラー（card_design.jsonより移植・集約）
const RARITY_BORDER_COLORS = {
  ULR: '#d4af37', // ULTRA LEGEND
  INF: '#e0a800', // INFINITE
  SER: '#a855f7', // SECRET RARE
  URR: '#ef4444', // ULTIMATE RARE
  SPR: '#3b82f6', // SUPER RARE
  PRR: '#10b981', // PREMIUM RARE
  VIR: '#f59e0b', // VICTORY RARE
  NOR: '#9ca3af', // NORMAL
  LGR: '#b8860b', // LEGENDARY RARE
  CLR: '#d2691e', // CLASSICAL RARE
  TRR: '#4b0082', // TRADITIONAL RARE
  RER: '#708090', // RETRO RARE
  ANR: '#2e8b57', // ANTIQUE RARE
};
const DEFAULT_BORDER_COLOR = '#9ca3af';

// 脚質ごとのテーマカラー（レーダーチャート＆バッジ用）
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
        border-radius: 6px;
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

      .crc-rarity-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 4px;
        font-size: 8.5px;
        font-weight: 900;
        border-radius: 6px;
        border: 1px solid #c29b1d;
        background: linear-gradient(135deg, #ffffff 0%, #f4f4f4 100%);
        color: #c29b1d;
        box-shadow: 0 1px 2px rgba(0,0,0,0.12);
        letter-spacing: 0.5px;
        line-height: 1.1;
        white-space: nowrap;
      }
      .crc-rarity-badge.rarity-ur {
        background: linear-gradient(135deg, #fff2cb 0%, #ffd700 100%);
        color: #6b4d00;
        border-color: #d4af37;
      }
      .crc-rarity-badge.rarity-ssr {
        background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
        color: #ffffff;
        border-color: #e63956;
      }

      .crc-gen-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 3px;
        font-size: 8.5px;
        font-weight: bold;
        border-radius: 3px;
        background: #2d6a37;
        color: #ffffff;
        line-height: 1.1;
        white-space: nowrap;
      }

      .crc-abilities-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.5px;
        margin-top: 2px;
        width: 100%;
        box-sizing: border-box;
      }
      .crc-ability-btn {
        background: #e2efe3;
        border: 1px solid #2d6a37;
        color: #2d6a37;
        border-radius: 3px;
        padding: 1px 0;
        font-size: 8.5px;
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

      /* デック用カードレイアウト最適化 */
      .crc-card-deck {
        padding: 4px 6px;
        min-height: 105px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
      }
      .crc-deck-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
        width: 100%;
        margin-bottom: 2px;
      }
      .crc-deck-name {
        font-weight: bold;
        font-size: 11.5px;
        color: #1a2e1d;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        line-height: 1.2;
      }
      .crc-deck-badges {
        display: flex;
        gap: 2px;
        flex-shrink: 0;
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
        font-size: 9.5px;
        line-height: 1.1;
        flex: 1;
      }
      .crc-deck-details span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .crc-deck-radar {
        width: 50px;
        height: 50px;
        flex-shrink: 0;
      }

      /* 拡大パターン（.crc-card-large） */
      .crc-card-large {
        padding: 12px;
        min-height: 420px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
        border-radius: 10px;
        background: #ffffff;
      }
      .crc-card-large .crc-deck-name {
        font-size: 20px;
        font-weight: bold;
        text-align: center;
      }
      .crc-large-radar-section {
        display: flex;
        align-items: center;
        justify-content: space-around;
        background: rgba(248, 250, 248, 0.8);
        border: 1px solid #e2efe3;
        border-radius: 8px;
        padding: 6px;
      }
      .crc-large-radar-chart {
        width: 120px;
        height: 120px;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  getHorse(horseId) {
    if (!horseId) return null;
    return this.horsesMap.get(String(horseId));
  }

  getGenerationYear(horseOrId) {
    const horse = typeof horseOrId === 'object' ? horseOrId : this.getHorse(horseOrId);
    let idStr = String(horse?.horse_id || horse?.id || horseOrId || '');

    if (idStr.length >= 2) {
      const yyNum = parseInt(idStr.substring(0, 2), 10);
      if (!isNaN(yyNum)) {
        const century = yyNum >= 50 ? '19' : '20';
        return `${century}${idStr.substring(0, 2)}`;
      }
    }
    if (!horse) return '----';
    const year = horse.generation_year || horse.birth_year || horse.generation || horse.gen_year;
    return year ? String(year) : '----';
  }

  getGenYearTwoDigits(horseOrId) {
    const yearStr = this.getGenerationYear(horseOrId);
    return yearStr.length >= 4 ? yearStr.slice(-2) : '--';
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
    if (min && max) return `${min}-${max}m`;
    return horse.distance || '-';
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

  getRarityBadgeHtml(horse) {
    const rarity = (horse.rarity || 'N').toUpperCase();
    return `<span class="crc-rarity-badge rarity-${rarity.toLowerCase()}">${rarity}</span>`;
  }

  getGenBadgeHtml(horse) {
    const gen2 = this.getGenYearTwoDigits(horse);
    return `<span class="crc-gen-badge">${gen2}世代</span>`;
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
    const distanceText = this.getDistanceText(horse);
    const sexText = horse.sex || '-';
    const abilitiesHtml = this.getAbilityBadgesHtml(horse);
    const rarityBadgeHtml = this.getRarityBadgeHtml(horse);
    const genBadgeHtml = this.getGenBadgeHtml(horse);

    const spdParam = this.getHorseParam(horse, ['speed', 'spd']);
    const stmParam = this.getHorseParam(horse, ['stamina', 'stm']);
    const shpParam = this.getHorseParam(horse, ['sharp', 'sharpness', 'agility']);
    const jzkParam = this.getHorseParam(horse, ['jizoku', 'durability', 'tenacity']);
    const gutParam = this.getHorseParam(horse, ['guts', 'stren']);

    const spd = this.getParamRank(spdParam);
    const stm = this.getParamRank(stmParam);
    const shp = this.getParamRank(shpParam);
    const jzk = this.getParamRank(jzkParam);
    const gut = this.getParamRank(gutParam);

    const paramsObj = {
      spdVal: typeof spdParam === 'number' ? spdParam : this.rankToValue(spd),
      stmVal: typeof stmParam === 'number' ? stmParam : this.rankToValue(stm),
      shpVal: typeof shpParam === 'number' ? shpParam : this.rankToValue(shp),
      jzkVal: typeof jzkParam === 'number' ? jzkParam : this.rankToValue(jzk),
      gutVal: typeof gutParam === 'number' ? gutParam : this.rankToValue(gut)
    };

    const styleName = horse.style || horse.running_style || 'default';
    const radarSvgHtml = this.generateRadarSVG(paramsObj, styleName);

    // 1. デック用（コンパクト表示・レイアウト最適化）
    if (mode === 'deck') {
      const rawId = String(horse?.horse_id || horse?.id || '8801');
      const formattedId = rawId.padStart(4, '0');
      const imgPath = `./images/${formattedId}.jpg`;
      const fallbackPath = `./images/8801.jpg`;

      return `
        <div class="crc-card crc-card-deck" style="border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor};">
          <div class="crc-deck-header">
            <div class="crc-deck-name" title="${horse.name}">${horse.name}</div>
            <div class="crc-deck-badges">${genBadgeHtml}${rarityBadgeHtml}</div>
          </div>
          <div class="crc-deck-body">
            <div class="crc-deck-img-box">
              <img src="${imgPath}" onerror="this.onerror=null; this.src='${fallbackPath}';" style="width:100%; height:100%; object-fit:cover;" alt="horse">
            </div>
            <div class="crc-deck-details">
              <span>${surfaceText} ${distanceText}</span>
              <span>脚:${styleName} 性:${sexText}</span>
            </div>
            <div class="crc-deck-radar">
              ${radarSvgHtml}
            </div>
          </div>
          ${abilitiesHtml}
        </div>
      `;
    }

    // 2. 拡大表示（large モード）
    return `
      <div class="crc-card crc-card-large" style="border: 2px solid ${borderColor};">
        <div class="crc-deck-name">${horse.name}</div>
        <div class="crc-large-badges-row">
          ${genBadgeHtml}
          ${rarityBadgeHtml}
        </div>
        <div class="crc-deck-details">
          <span>${surfaceText} ${distanceText} 性別:${sexText}</span>
          <span>脚質: ${styleName}</span>
        </div>
        <div class="crc-large-radar-section">
          <div class="crc-large-radar-chart">
            ${radarSvgHtml}
          </div>
          <div class="crc-large-rank-grid">
            <div class="crc-rank-row"><span class="crc-rank-label">スピード</span><span class="crc-rank-val">${spd}</span></div>
            <div class="crc-rank-row"><span class="crc-rank-label">スタミナ</span><span class="crc-rank-val">${stm}</span></div>
            <div class="crc-rank-row"><span class="crc-rank-label">瞬発力</span><span class="crc-rank-val">${shp}</span></div>
            <div class="crc-rank-row"><span class="crc-rank-label">勝負根性</span><span class="crc-rank-val">${jzk}</span></div>
            <div class="crc-rank-row"><span class="crc-rank-label">柔軟性</span><span class="crc-rank-val">${gut}</span></div>
          </div>
        </div>
        ${abilitiesHtml}
      </div>
    `;
  }
}

export const cardRenderer = new CardRenderer();
