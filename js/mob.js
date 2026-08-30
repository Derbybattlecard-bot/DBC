/**
 * /js/mob.js
 * モブ馬・CPU馬に関連する外部処理モジュール
 */

/**
 * 馬の作戦と作戦レベルを仕様書に従って自動決定する関数
 * @param {string|number} horseId - 馬のID
 * @param {string} style - 脚質 (逃げ, 先行など)
 * @param {number} gateNum - 枠順/馬番 (1〜16)
 * @param {Array|Object} strategyMaster - 作戦のマスターデータ
 * @param {boolean} isCpuRival - CPUライバル馬かどうかのフラグ
 * @returns {Object} { tactic: string, level: number }
 */
export function determineStrategy(horseId, style, gateNum, strategyMaster, isCpuRival = false) {
  // 1. IDから数値を抽出して下一桁を取得（ダミーや数値なしの場合はランダム）
  const idStr = String(horseId || "");
  const idNumbers = idStr.match(/\d+/g); 
  const idNum = idNumbers ? parseInt(idNumbers.join(''), 10) : Math.floor(Math.random() * 10);
  const key1 = idNum % 10;

  // 2. 馬番（gateNum）の下一桁を取得
  const validGateNum = (typeof gateNum === 'number' && gateNum >= 1 && gateNum <= 16) ? gateNum : 1;
  const key2 = validGateNum % 10;

  // 3. 計算
  const A = (key1 + key2) % 4; // 作戦選定用インデックス (0〜3)
  const B = (key1 * key2) % 5; // レベル選定用ベース (0〜4)
  let strategyLevel = B + 1;   // 作戦レベル (1〜5)

  // 4. CPU馬特有のレベル制限ルール (MAX 3)
  if (isCpuRival && strategyLevel === 5) {
    strategyLevel = 3;
  }

  // 5. 該当する脚質の作戦リストをマスターから抽出
  const stratList = Array.isArray(strategyMaster) ? strategyMaster : Object.values(strategyMaster || {});
  let styleStrategies = stratList.filter(s => s.category === style || s.style === style);

  // 万が一マスターに該当脚質がない場合はフォールバック
  if (styleStrategies.length === 0) {
    styleStrategies = stratList.length > 0 ? stratList : [{ name: "おまかせ" }];
  }

  // 6. 計算値 A をインデックスとして作戦を決定
  const selectedStrategyIndex = A % styleStrategies.length;
  // マスターのプロパティ名(name もしくは strategy_name)に合わせて取得
  const selectedStrategyName = styleStrategies[selectedStrategyIndex].name || styleStrategies[selectedStrategyIndex].strategy_name;

  return {
    tactic: selectedStrategyName,
    level: strategyLevel
  };
}
