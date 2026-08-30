export class CardRenderer {
  constructor() {
    this.horsesMap = new Map();
    this.designConfig = null;
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded) return;

    try {
      const horsesPath = './data/horses_master.json';
      const designPath = './data/card_design.json';

      const [horsesRes, designRes] = await Promise.all([
        fetch(horsesPath).catch(e => { throw new Error(`[通信エラー] ${horsesPath} にアクセスできません`); }),
        fetch(designPath).catch(e => { throw new Error(`[通信エラー] ${designPath} にアクセスできません`); })
      ]);

      if (!horsesRes.ok) throw new Error(`馬データが見つかりません (ステータス: ${horsesRes.status}) パス: ${horsesPath}`);
      const horsesArray = await horsesRes.json();
      
      if (designRes.ok) {
        this.designConfig = await designRes.json();
      } else {
        console.warn(`[警告] ${designPath} が読み込めませんでしたが、デフォルトデザインで続行します。`);
        this.designConfig = { rarity_styles: {} };
      }

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
        padding: 1px 5px;
        font-size: 8.5px;
        font-weight: 900;
        border-radius: 8px;
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
        box-shadow: 0 1px 3px rgba(212, 175, 55, 0.4);
      }
      .crc-rarity-badge.rarity-ssr {
        background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
        color: #ffffff;
        border-color: #e63956;
        box-shadow: 0 1px 3px rgba(230, 57, 86, 0.4);
      }
      .crc-rarity-badge.rarity-sr {
        background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
        color: #ffffff;
        border-color: #1e90ff;
      }
      .crc-rarity-badge.rarity-r {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: #0d4220;
        border-color: #2ed573;
      }

      .crc-gen-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 1px 4px;
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
        margin-top: 3px;
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
        letter-spacing: -0.5px;
      }
      .crc-ability-btn.empty {
        visibility: hidden;
        border-color: transparent;
        background: transparent;
      }

      .crc-card-deck {
        padding: 4px;
        min-height: 96px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
      }
      .crc-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2px;
      }
      .crc-deck-name {
        font-weight: bold;
        font-size: 11.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }
      .crc-deck-details {
        display: flex;
        flex-direction: column;
        gap: 1px;
        color: #4e6b52;
        font-size: 9.5px;
      }
      .crc-deck-details span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .crc-deck-params {
        display: flex;
        justify-content: space-between;
        background: #f8faf8;
        border: 1px solid #e2efe3;
        padding: 1px 2px;
        border-radius: 3px;
        margin-top: 2px;
        font-size: 8.5px;
        color: #2d6a37;
        font-weight: bold;
        font-family: 'Consolas', 'Monaco', monospace;
      }

      .crc-card-pool {
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
      }
      .crc-pool-name {
        font-weight: bold;
        font-size: 12.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .crc-pool-sub {
        font-size: 10.5px;
        color: #4e6b52;
        font-weight: bold;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .crc-pool-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        background: #f8faf8;
        border: 1px solid #e2efe3;
        border-radius: 4px;
        padding: 2px 4px;
        text-align: center;
        font-size: 11px;
        gap: 1px;
      }
      .crc-stat-item { display: flex; flex-direction: column; line-height: 1.1; }
      .crc-stat-label { font-size: 9px; color: #4e6b52; }
      .crc-stat-val { font-weight: bold; color: #2d6a37; font-size: 11px; font-family: 'Consolas', 'Monaco', monospace; }

      /* ====================================================
         拡大パターン（.crc-card-large）レイアウト調整
      ==================================================== */
      .crc-card-large {
        padding: 12px;
        min-height: 380px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
        border-radius: 10px;
        background: #ffffff;
      }

      /* 馬名：1行で独立表示 */
      .crc-card-large .crc-deck-name {
        font-size: 22px;
        font-weight: bold;
        line-height: 1.2;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }

      /* 画像枠：横幅を約2/3（66%）にして中央寄せ */
      .crc-large-image-box {
        width: 66%;
        height: 120px;
        margin: 0 auto;
        background: #f2f7f3;
        border-radius: 6px;
        border: 1px dashed #b5d4ba;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .crc-large-image-box img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      /* 画像下のバッジ配置領域 */
      .crc-large-badges-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
      }

      .crc-card-large .crc-rarity-badge,
      .crc-card-large .crc-gen-badge {
        font-size: 15px;
        padding: 2px 8px;
        border-radius: 6px;
      }

      /* 芝ダート・距離・脚質・性別のフォント拡大 */
      .crc-card-large .crc-deck-details {
        font-size: 20px;
        line-height: 1.35;
        gap: 4px;
        font-weight: 500;
      }

      /* ステータスパラメータ表示 */
      .crc-card-large .crc-deck-params {
        font-size: 16px;
        padding: 4px 6px;
        border-radius: 6px;
      }

      /* アビリティボタン */
      .crc-card-large .crc-ability-btn {
        font-size: 15px;
        padding: 4px 0;
        border-radius: 4px;
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
    if (min && max) {
      return `${min}-${max}m`;
    }
    return horse.distance || '-';
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

    const rarityInfo = (this.designConfig && this.designConfig.rarity_styles && this.designConfig.rarity_styles[horse.rarity]) 
      || { border_color: '#a0ca33', bg_color: '#ffffff' };

    const surfaceText = this.formatAptitude(
      this.getHorseParam(horse, ['turf_potential', 'turf']),
      this.getHorseParam(horse, ['dirt_potential', 'dirt'])
    );
    const distanceText = this.getDistanceText(horse);
    const sexText = horse.sex || '-';
    const abilitiesHtml = this.getAbilityBadgesHtml(horse);
    const rarityBadgeHtml = this.getRarityBadgeHtml(horse);
    const genBadgeHtml = this.getGenBadgeHtml(horse);

    const spd = this.getParamRank(this.getHorseParam(horse, ['speed', 'spd']));
    const stm = this.getParamRank(this.getHorseParam(horse, ['stamina', 'stm']));
    const shp = this.getParamRank(this.getHorseParam(horse, ['sharp', 'sharpness', 'agility']));
    const jzk = this.getParamRank(this.getHorseParam(horse, ['jizoku', 'durability', 'tenacity']));
    const gut = this.getParamRank(this.getHorseParam(horse, ['guts', 'stren']));

    // 1. デック用（コンパクト表示）
    if (mode === 'deck') {
      return `
        <div class="crc-card crc-card-deck" style="border: 1px solid ${rarityInfo.border_color}; border-left: 4px solid ${rarityInfo.border_color};">
          <div class="crc-card-header">
            <div class="crc-deck-name">${horse.name}</div>
            ${genBadgeHtml}
            ${rarityBadgeHtml}
          </div>
          <div class="crc-deck-details">
            <span>${surfaceText} ${distanceText} 性別:${sexText}</span>
            <span>脚:${horse.style || '-'}</span>
            <div class="crc-deck-params">
              <span>ス:${spd}</span>
              <span>タ:${stm}</span>
              <span>瞬:${shp}</span>
              <span>持:${jzk}</span>
              <span>根:${gut}</span>
            </div>
          </div>
          ${abilitiesHtml}
        </div>`;
    }

    // 2. 拡大パターン（大型表示）
    if (mode === 'large') {
      const imgPath = horse.image_url || horse.image || `./images/horses/${horse.horse_id || horse.id}.png`;
      return `
        <div class="crc-card crc-card-large" style="border: 2px solid ${rarityInfo.border_color}; border-left: 6px solid ${rarityInfo.border_color};">
          <!-- 1行独立表示の馬名 -->
          <div class="crc-deck-name" title="${horse.name}">${horse.name}</div>

          <!-- 横幅2/3の画像ボックス -->
          <div class="crc-large-image-box">
            <img src="${imgPath}" alt="${horse.name}" onerror="this.style.display='none'; this.parentElement.innerText='🐴 No Image';">
          </div>

          <!-- 画像の下に配置したバッジ類 -->
          <div class="crc-large-badges-row">
            ${genBadgeHtml}
            ${rarityBadgeHtml}
          </div>

          <!-- 拡大表示用の詳細テキスト（適性・距離・脚質・性別） -->
          <div class="crc-deck-details">
            <div>${surfaceText} ${distanceText}</div>
            <div>脚質:${horse.style || '-'} 性別:${sexText}</div>
            <div class="crc-deck-params">
              <span>ス:${spd}</span>
              <span>タ:${stm}</span>
              <span>瞬:${shp}</span>
              <span>持:${jzk}</span>
              <span>根:${gut}</span>
            </div>
          </div>
          ${abilitiesHtml}
        </div>`;
    }

    // 3. プール/一覧用（標準表示）
    return `
      <div class="crc-card crc-card-pool" style="border: 1px solid ${rarityInfo.border_color};">
        <div class="crc-card-header">
          <div class="crc-pool-name">${horse.name}</div>
          <div style="display:flex; gap:3px;">
            ${genBadgeHtml}
            ${rarityBadgeHtml}
          </div>
        </div>
        <div class="crc-pool-sub">${surfaceText} ${distanceText} ${sexText}</div>
        <div class="crc-pool-stats-grid">
          <div class="crc-stat-item"><span class="crc-stat-label">脚質</span><span class="crc-stat-val">${horse.style || '-'}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">スピ</span><span class="crc-stat-val">${spd}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">スタ</span><span class="crc-stat-val">${stm}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">瞬発</span><span class="crc-stat-val">${shp}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">持続</span><span class="crc-stat-val">${jzk}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">根性</span><span class="crc-stat-val">${gut}</span></div>
        </div>
        ${abilitiesHtml}
      </div>`;
  }

  renderRaceTableRow(horseId, index) {
    const horse = this.getHorse(horseId);
    const frameNum = Math.floor(index / 2) + 1;
    const frameClass = `w-${Math.min(frameNum, 8)}`;
    const mark = index === 0 ? '◎' : index === 1 ? '○' : index === 2 ? '▲' : '';

    if (!horse) {
      return `
        <tr>
          <td><span class="${frameClass}">${frameNum}</span></td>
          <td>-</td>
          <td class="horse-name" style="color:#aaa;">(未設定: ID ${horseId})</td>
          <td>-</td>
          <td>-</td>
        </tr>`;
    }

    const surfaceText = this.formatAptitude(
      this.getHorseParam(horse, ['turf_potential', 'turf']),
      this.getHorseParam(horse, ['dirt_potential', 'dirt'])
    );
    const distanceText = this.getDistanceText(horse);

    return `
      <tr>
        <td><span class="${frameClass}">${frameNum}</span></td>
        <td>${mark}</td>
        <td class="horse-name">${horse.name}</td>
        <td>${surfaceText}</td>
        <td>${distanceText}</td>
      </tr>`;
  }
}

export const cardRenderer = new CardRenderer();
