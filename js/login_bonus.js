// ログインボーナスの抽選ロジックを独立した関数として切り出し
export function drawBonusCard(cardRenderer, userAffiliation) {
  // ユーザーの除外数値（例: 6）を取得
  const userDigit = parseInt(userAffiliation, 10);
  
  // レアリティ決定（確率テーブルに基づく）
  const rarity = selectRarity(); 
  
  // 該当レアリティの馬プールを取得
  const pool = Array.from(cardRenderer.horsesMap.values())
                    .filter(h => h.rarity === rarity);

  let chosenHorse = null;
  let attempts = 0;

  // 6なら96, 06, 16年世代以外が出るまで再抽選（無限ループ防止付き）
  do {
    chosenHorse = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
    
    if (isNaN(userDigit)) break; // 設定なしならそのまま決定
    
    // horse_id (例: 9601) から世代下1桁を計算
    const generation = Math.floor(parseInt(chosenHorse.horse_id, 10) / 100); // 96
    const lastDigit = generation % 10; // 6

    // 除外数値と一致しなければ確定
    if (lastDigit !== userDigit) {
      break;
    }
  } while (attempts < 100);

  return chosenHorse;
}
