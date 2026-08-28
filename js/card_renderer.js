export class CardRenderer {
  constructor() {
    this.horsesMap = new Map();
    this.designConfig = null;
    this.isLoaded = false;
  }

  // データ・デザイン読み込み ＆ 専用スタイルの自動注入
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
        this.horsesMap.set(String(horse.horse_id), horse);
      });

      // スタイルの自動注入
      this.injectStyles();

      this.isLoaded = true;
      console.log("✅ CardRenderer 初期化完了:", this.horsesMap.size, "件");
    } catch (error) {
      console.error("❌ CardRenderer の初期化に失敗:", error);
      throw error;
    }
  }

  // カード専用CSSを<head>に自動挿入
  injectStyles() {
    if (document.getElementById('card-renderer-styles')) return;

    const style = document.createElement('style');
    style.id = 'card-renderer-styles';
    style.textContent = `
      /* 共通カード基本設定 */
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

      /* アビリティバッジ（3列均等表示） */
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

      /* --- モード①: deck (コンパクト / スロット用) --- */
      .crc-card-deck {
        padding: 4px;
        min-height: 96px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 11px;
      }
      .crc-deck-name {
        font-weight: bold;
        font-size: 11.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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

      /* --- モード②: pool (標準 / 一覧・プール用) --- */
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
    if (horse.min_distance && horse.max_distance) {
      return `${horse.min_distance}-${horse.max_distance}m`;
    }
    return horse.distance || '-';
  }

  getParamRank(val) {
    if (val === undefined || val === null) return "-";
    if (val >= 20) return "S";
    if (val >= 18) return "A";
    if (val >= 16) return "B";
    return "C";
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

  /**
   * カードUI描画処理
   * @param {string|number} horseId 
   * @param {'deck'|'pool'} mode 'deck' (コンパクト) または 'pool' (標準)
   */
  renderCardUI(horseId, mode = 'deck') {
    const horse = this.getHorse(horseId);
    if (!horse) return `<div class="card-error" style="color:#888; font-size:11px; text-align:center; padding:10px;">(未設定: ID ${horseId})</div>`;

    const rarityInfo = (this.designConfig && this.designConfig.rarity_styles && this.designConfig.rarity_styles[horse.rarity]) 
      || { border_color: '#a0ca33', bg_color: '#ffffff' };

    const surfaceText = this.formatAptitude(horse.turf_potential ?? horse.turf, horse.dirt_potential ?? horse.dirt);
    const distanceText = this.getDistanceText(horse);
    const sexText = horse.sex || '-';
    const abilitiesHtml = this.getAbilityBadgesHtml(horse);

    // 1. デック用（コンパクト表示）
    if (mode === 'deck') {
      return `
        <div class="crc-card crc-card-deck" style="border: 1px solid ${rarityInfo.border_color}; border-left: 4px solid ${rarityInfo.border_color};">
          <div class="crc-deck-name">${horse.name}</div>
          <div class="crc-deck-details">
            <span>${surfaceText} ${distanceText}</span>
            <span>脚:${horse.style || '-'} ${sexText}</span>
            <div class="crc-deck-params">
              <span>ス${this.getParamRank(horse.speed)}</span>
              <span>タ${this.getParamRank(horse.stamina)}</span>
              <span>瞬${this.getParamRank(horse.sharp ?? horse.sharpness)}</span>
              <span>持${this.getParamRank(horse.jizoku)}</span>
              <span>根${this.getParamRank(horse.guts)}</span>
            </div>
          </div>
          ${abilitiesHtml}
        </div>`;
    }

    // 2. プール/一覧用（標準表示）
    return `
      <div class="crc-card crc-card-pool" style="border: 1px solid ${rarityInfo.border_color};">
        <div class="crc-pool-name">${horse.name}</div>
        <div class="crc-pool-sub">${surfaceText} ${distanceText} ${sexText}</div>
        <div class="crc-pool-stats-grid">
          <div class="crc-stat-item"><span class="crc-stat-label">脚質</span><span class="crc-stat-val">${horse.style || '-'}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">スピ</span><span class="crc-stat-val">${this.getParamRank(horse.speed)}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">スタ</span><span class="crc-stat-val">${this.getParamRank(horse.stamina)}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">瞬発</span><span class="crc-stat-val">${this.getParamRank(horse.sharp ?? horse.sharpness)}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">持続</span><span class="crc-stat-val">${this.getParamRank(horse.jizoku)}</span></div>
          <div class="crc-stat-item"><span class="crc-stat-label">根性</span><span class="crc-stat-val">${this.getParamRank(horse.guts)}</span></div>
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

    const surfaceText = this.formatAptitude(horse.turf_potential ?? horse.turf, horse.dirt_potential ?? horse.dirt);
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
