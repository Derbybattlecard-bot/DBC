export class CardRenderer {
  constructor() {
    this.horsesMap = new Map();
    this.designConfig = null;
    this.isLoaded = false;
  }

  // データとデザインの非同期一括読み込み
  async init() {
    if (this.isLoaded) return;

    try {
      // 【重要】先頭の '/' を './' に変更（現在のHTMLファイルからの相対パス）
      const horsesPath = './data/horses_master.json';
      const designPath = './data/card_design.json';

      // ネットワークエラーも検知できるように catch を挟む
      const [horsesRes, designRes] = await Promise.all([
        fetch(horsesPath).catch(e => { throw new Error(`[通信エラー] ${horsesPath} にアクセスできません`); }),
        fetch(designPath).catch(e => { throw new Error(`[通信エラー] ${designPath} にアクセスできません`); })
      ]);

      // ステータスコードのチェック
      if (!horsesRes.ok) throw new Error(`馬データが見つかりません (ステータス: ${horsesRes.status}) パス: ${horsesPath}`);
      
      const horsesArray = await horsesRes.json();
      
      // デザインファイルは無くてもエラーで止めず、空の設定で進める（フォールバック）
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

      this.isLoaded = true;
      console.log("✅ CardRenderer 初期化完了:", this.horsesMap.size, "件");
    } catch (error) {
      console.error("❌ CardRenderer の初期化に失敗:", error);
      throw error; // index.html にエラーを投げて知らせる
    }
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

    const surfaceText = this.formatAptitude(horse.turf_potential, horse.dirt_potential);
    const distanceText = horse.min_distance && horse.max_distance ? `${horse.min_distance}-${horse.max_distance}m` : '-';

    return `
      <tr>
        <td><span class="${frameClass}">${frameNum}</span></td>
        <td>${mark}</td>
        <td class="horse-name">${horse.name}</td>
        <td>${surfaceText}</td>
        <td>${distanceText}</td>
      </tr>`;
  }

  renderCardUI(horseId) {
    const horse = this.getHorse(horseId);
    if (!horse) return `<div class="card-error">データが見つかりません (ID: ${horseId})</div>`;

    // デザインが読み込めなかった場合でもエラーにならないようガード
    const rarityInfo = (this.designConfig && this.designConfig.rarity_styles && this.designConfig.rarity_styles[horse.rarity]) 
      || { border_color: '#ccc', badge_bg: '#999', text_color: '#fff', label: horse.rarity };
      
    const abilities = Array.isArray(horse.ability) ? horse.ability.join(', ') : (horse.ability || 'なし');

    return `
      <div class="card-item" style="border: 2px solid ${rarityInfo.border_color}; background: #fff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="background:${rarityInfo.badge_bg}; color:${rarityInfo.text_color}; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">${rarityInfo.label}</span>
          <span style="font-size:11px; color:#666;">${horse.sex || ''}</span>
        </div>
        <div style="font-size:16px; font-weight:bold; color:#0d4220; margin-bottom:6px;">${horse.name}</div>
        <div style="font-size:11px; color:#333; background:#f2f8f3; padding:6px; border-radius:4px; margin-bottom:6px;">
          <div>適性: ${this.formatAptitude(horse.turf_potential, horse.dirt_potential)} (${horse.min_distance || 0}-${horse.max_distance || 0}m)</div>
          <div>脚質: ${horse.style || '-'} | アビリティ: ${abilities}</div>
        </div>
        ${horse.comment ? `<div style="font-size:10px; color:#555; line-height:1.3;">${horse.comment}</div>` : ''}
      </div>`;
  }
}

export const cardRenderer = new CardRenderer();
