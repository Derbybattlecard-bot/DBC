import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 1. カードを出品する関数
 */
export async function createTradeListing(db, currentUser, horse, wantRarity, wantHorseId, comment) {
  const horseId = String(horse.horse_id ?? horse.id);

  // 出品者の表示名取得
  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const userName = userDoc.exists() ? (userDoc.data().display_name || "名無しオーナー") : "名無しオーナー";

  // trades コレクションへ追加
  await addDoc(collection(db, "trades"), {
    seller_uid: currentUser.uid,
    seller_name: userName,
    offered_horse_id: horseId,
    offered_horse_name: horse.name,
    offered_rarity: horse.rarity || 'N',
    want_rarity: wantRarity,
    want_horse_id: wantHorseId || null,
    comment: comment,
    status: "active",
    created_at: serverTimestamp()
  });

  // インベントリのロック（トレード中）数を増やす
  const invRef = doc(db, `users/${currentUser.uid}/inventory/${horseId}`);
  await updateDoc(invRef, {
    locked_count: increment(1)
  });
}

/**
 * 2. 出品を取り下げる関数
 */
export async function cancelTradeListing(db, currentUserUid, tradeId, horseId) {
  // ステータスをキャンセルに変更
  await updateDoc(doc(db, "trades", tradeId), { status: "cancelled" });

  // ロック数を減らす
  await updateDoc(doc(db, `users/${currentUserUid}/inventory/${horseId}`), {
    locked_count: increment(-1)
  });
}

/**
 * 3. トレード（カード交換）を実行する関数
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
    const offeredHorseId = activeTradeData.offered_horse_id; // 出品されたカード
    const buyerHorseId = selectedOfferHorseId;               // 申し込んだカード

    // 出品者: 出品カード -1（ロック解除兼用）、獲得カード +1
    const sellerOfferInvRef = doc(db, `users/${sellerUid}/inventory/${offeredHorseId}`);
    const sellerBuyerInvRef = doc(db, `users/${sellerUid}/inventory/${buyerHorseId}`);
    
    transaction.update(sellerOfferInvRef, { count: increment(-1), locked_count: increment(-1) });
    transaction.set(sellerBuyerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });

    // 申込者: 申込カード -1、獲得カード +1
    const buyerOfferInvRef = doc(db, `users/${buyerUid}/inventory/${buyerHorseId}`);
    const buyerSellerInvRef = doc(db, `users/${buyerUid}/inventory/${offeredHorseId}`);

    transaction.update(buyerOfferInvRef, { count: increment(-1) });
    transaction.set(buyerSellerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });

    // トレード完了状態に更新
    transaction.update(tradeRef, {
      status: "completed",
      buyer_uid: buyerUid,
      exchanged_at: serverTimestamp()
    });
  });
}
