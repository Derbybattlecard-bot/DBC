/**
 * js/login_bonus.js
 * ログインボーナスの抽選および判定ロジック
 */

// 1. ガチャ確率テーブル
export const NORMAL_PROBABILITY_TABLE = [
  { rarity: "INF", prob: 0.005 },
  { rarity: "SER", prob: 0.005 },
  { rarity: "URR", prob: 0.010 },
  { rarity: "LGR", prob: 0.010 },
  { rarity: "CLR", prob: 0.010 },
  { rarity: "TRR", prob: 0.010 },
  { rarity: "RER", prob: 0.020 },
  { rarity: "ANR", prob: 0.020 },
  { rarity: "VIR", prob: 0.020 },
  { rarity: "PRR", prob: 0.020 },
  { rarity: "SPR", prob: 0.030 },
  { rarity: "NOR", prob: 0.840 }
];

export const FEVER_PROBABILITY_TABLE = [
  { rarity: "INF", prob: 0.10 },
  { rarity: "SER", prob: 0.10 },
  { rarity: "URR", prob: 0.10 },
  { rarity: "LGR", prob: 0.10 },
  { rarity: "CLR", prob: 0.10 },
  { rarity: "TRR", prob: 0.10 },
  { rarity: "RER", prob: 0.10 },
  { rarity: "ANR", prob: 0.10 },
  { rarity: "VIR", prob: 0.10 },
  { rarity: "PRR", prob: 0.10 }
];

// 2. 世代年数の取得関数
export function getGenerationYear(horseId) {
  if (!horseId) return 2000;
  const strId = String(horseId);
  if (strId.length < 2) return 2000;
  
  const prefix = parseInt(strId.substring(0, 2), 10);
  if (isNaN(prefix)) return 2000;
  
  return prefix >= 60 ? 1900 + prefix : 2000 + prefix;
}

// 3. 世代年の下1桁を取得する関数
export function getGenYearLastDigit(horseId) {
  return getGenerationYear(horseId) % 10;
}

// 4. ユーザー所属文字列から除外対象の1桁数字を取得する関数
export function getAffiliationDigit(affiliationStr) {
  if (affiliationStr === null || affiliationStr === undefined) return null;
  const match = String(affiliationStr).match(/\d/g);
  if (match && match.length > 0) {
    return parseInt(match[match.length - 1], 10);
  }
  return null;
}

/**
 * 5. ログインボーナスの抽選メイン処理
 */
export function drawBonusCard(cardRenderer, affiliationStr, isFever = false) {
  const excludeDigit = getAffiliationDigit(affiliationStr);
  const table = isFever ? FEVER_PROBABILITY_TABLE : NORMAL_PROBABILITY_TABLE;

  // ① レアリティの決定
  const rand = Math.random();
  let cumulative = 0;
  let selectedRarity = "NOR";

  for (const entry of table) {
    cumulative += entry.prob;
    if (rand <= cumulative) {
      selectedRarity = entry.rarity;
      break;
    }
  }

  // ② 全馬データから選定されたレアリティのプールを作成
  const allHorses = Array.from(cardRenderer.horsesMap.values());
  let pool = allHorses.filter(h => h.rarity === selectedRarity);

  // 該当レアリティが存在しない場合のフォールバック（全馬対象）
  if (pool.length === 0) {
    pool = allHorses;
  }

  // ③ 再抽選ロジック（除外対象の数字を避けるまで繰り返し抽選）
  let chosenHorse = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 100;

  do {
    chosenHorse = pool[Math.floor(Math.random() * pool.length)];
    attempts++;

    // 除外対象の指定がない場合は最初の抽選で確定
    if (excludeDigit === null) break;

    // horse_id から世代の下1桁を計算
    const lastDigit = getGenYearLastDigit(chosenHorse.horse_id);

    // 除外対象の数字と異なる場合は決定
    if (lastDigit !== excludeDigit) {
      break;
    }
  } while (attempts < MAX_ATTEMPTS);

  return chosenHorse;
}
