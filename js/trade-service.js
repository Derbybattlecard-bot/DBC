import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc, 
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CPUの固定識別ID
export const CPU_UID = "CPU_SYSTEM_BOT";

/**
 * 1. 通常ユーザー用 カード出品関数
 */
export async function createTradeListing(db, currentUser, horse, wantHorseNames, comment) {
  const horseId = String(horse.horse_id ?? horse.id);

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const userName = userDoc.exists() ? (userDoc.data().display_name || "名無しオーナー") : "名無しオーナー";

  // 有効な馬名（空文字除外、最大5つ）を抽出
  const validWantNames = Array.isArray(wantHorseNames) 
    ? wantHorseNames.map(n => n.trim()).filter(n => n !== '').slice(0, 5)
    : [];

  await addDoc(collection(db, "trades"), {
    seller_uid: currentUser.uid,
    seller_name: userName,
    offered_horse_id: horseId,
    offered_horse_name: horse.name,
    offered_rarity: horse.rarity || 'N',
    want_horse_names: validWantNames,
    comment: comment,
    status: "active",
    created_at: serverTimestamp()
  });

  const invRef = doc(db, `users/${currentUser.uid}/inventory/${horseId}`);
  await setDoc(invRef, {
    locked_count: increment(1)
  }, { merge: true });
}

/**
 * 2. CPU（公式BOT）用 トレード出品作成関数
 */
export async function createCpuTradeListing(db, horse, wantHorseNames, comment) {
  const horseId = String(horse.horse_id ?? horse.id);

  // 有効な馬名（空文字除外、最大5つ）を抽出
  const validWantNames = Array.isArray(wantHorseNames) 
    ? wantHorseNames.map(n => n.trim()).filter(n => n !== '').slice(0, 5)
    : [];

  await addDoc(collection(db, "trades"), {
    seller_uid: CPU_UID,
    seller_name: "🤖 公式トレードBOT",
    offered_horse_id: horseId,
    offered_horse_name: horse.name,
    offered_rarity: horse.rarity || 'N',
    want_horse_names: validWantNames,
    comment: comment || "【公式BOT】テスト出品です。どなたでも交換どうぞ！",
    status: "active",
    created_at: serverTimestamp()
  });
}

/**
 * 3. 出品取り下げ関数
 */
export async function cancelTradeListing(db, currentUserUid, tradeId, horseId) {
  await updateDoc(doc(db, "trades", tradeId), { status: "cancelled" });

  if (currentUserUid !== CPU_UID) {
    const invRef = doc(db, `users/${currentUserUid}/inventory/${horseId}`);
    await setDoc(invRef, {
      locked_count: increment(-1)
    }, { merge: true });
  }
}

/**
 * 4. トレード実行関数
 */
export async function executeTradeTransaction(db, currentUser, activeTradeData, selectedOfferHorseId) {
  await runTransaction(db, async (transaction) => {
    const tradeRef = doc(db, "trades", activeTradeData.id);
    const tradeSnap = await transaction.get(tradeRef);

    if (!tradeSnap.exists() || tradeSnap.data().status !== 'active') {
      throw new Error("このトレードは既に終了しているか、キャンセルされました。");
    }

    const sellerUid = activeTradeData.seller_uid;
    const buyerUid = currentUser.uid;
    const offeredHorseId = activeTradeData.offered_horse_id;
    const buyerHorseId = selectedOfferHorseId;

    const isCpuTrade = (sellerUid === CPU_UID);

    if (!isCpuTrade) {
      const sellerOfferInvRef = doc(db, `users/${sellerUid}/inventory/${offeredHorseId}`);
      const sellerBuyerInvRef = doc(db, `users/${sellerUid}/inventory/${buyerHorseId}`);
      
      transaction.update(sellerOfferInvRef, { count: increment(-1), locked_count: increment(-1) });
      transaction.set(sellerBuyerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });
    }

    const buyerOfferInvRef = doc(db, `users/${buyerUid}/inventory/${buyerHorseId}`);
    const buyerSellerInvRef = doc(db, `users/${buyerUid}/inventory/${offeredHorseId}`);

    transaction.update(buyerOfferInvRef, { count: increment(-1) });
    transaction.set(buyerSellerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });

    transaction.update(tradeRef, {
      status: "completed",
      buyer_uid: buyerUid,
      exchanged_at: serverTimestamp()
    });
  });
}
