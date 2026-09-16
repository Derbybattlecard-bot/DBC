import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// CPUの固定識別ID
export const CPU_UID = "CPU_SYSTEM_BOT";

/**
 * 1. 通常ユーザー用 カード出品関数（1人1件制限チェック付き）
 */
export async function createTradeListing(db, currentUser, horse, wantHorseNames, comment) {
  // 1人1件制限の重複チェック
  const activeQuery = query(
    collection(db, "trades"),
    where("seller_uid", "==", currentUser.uid),
    where("status", "==", "active")
  );
  const activeSnap = await getDocs(activeQuery);

  if (!activeSnap.empty) {
    throw new Error("既に出品中のカードが存在します。出品は1人1つまでです。");
  }

  const horseId = String(horse.horse_id ?? horse.id);

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));
  const userName = userDoc.exists() ? (userDoc.data().display_name || "名無しオーナー") : "名無しオーナー";

  // 配列データの整形（文字列化・トリム・空文字列の除去）
  const namesArray = Array.isArray(wantHorseNames) 
    ? wantHorseNames.map(n => String(n).trim()).filter(n => n !== "")
    : [];

  await addDoc(collection(db, "trades"), {
    seller_uid: currentUser.uid,
    seller_name: userName,
    offered_horse_id: horseId,
    offered_horse_name: horse.name,
    offered_rarity: horse.rarity || 'N',
    want_horse_names: namesArray,
    comment: comment || "",
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

  const namesArray = Array.isArray(wantHorseNames) 
    ? wantHorseNames.map(n => String(n).trim()).filter(n => n !== "")
    : [];

  await addDoc(collection(db, "trades"), {
    seller_uid: CPU_UID,
    seller_name: "🤖 公式トレードBOT",
    offered_horse_id: horseId,
    offered_horse_name: horse.name,
    offered_rarity: horse.rarity || 'N',
    want_horse_names: namesArray,
    comment: comment || "【公式BOT】テスト出品です。どなたでも交換どうぞ！",
    status: "active",
    created_at: serverTimestamp()
  });
  // CPU出品の場合はインベントリ更新（locked_count）をスキップ
}

/**
 * 3. 出品取り下げ関数（CPU出品時のロック減算回避に対応）
 */
export async function cancelTradeListing(db, currentUserUid, tradeId, horseId) {
  await updateDoc(doc(db, "trades", tradeId), { status: "cancelled" });

  // CPU出品以外の場合のみインベントリのロック数を減算
  if (currentUserUid !== CPU_UID) {
    const invRef = doc(db, `users/${currentUserUid}/inventory/${horseId}`);
    await setDoc(invRef, {
      locked_count: increment(-1)
    }, { merge: true });
  }
}

/**
 * 4. トレード（カード交換）実行関数（CPU相手の取引に対応）
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

    // 出品者側の更新（CPUでない場合のみ実在のインベントリを変更）
    if (!isCpuTrade) {
      const sellerOfferInvRef = doc(db, `users/${sellerUid}/inventory/${offeredHorseId}`);
      const sellerBuyerInvRef = doc(db, `users/${sellerUid}/inventory/${buyerHorseId}`);
      
      transaction.update(sellerOfferInvRef, { count: increment(-1), locked_count: increment(-1) });
      transaction.set(sellerBuyerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });
    }

    // 申込者（プレイヤー）側のインベントリ更新
    const buyerOfferInvRef = doc(db, `users/${buyerUid}/inventory/${buyerHorseId}`);
    const buyerSellerInvRef = doc(db, `users/${buyerUid}/inventory/${offeredHorseId}`);

    transaction.update(buyerOfferInvRef, { count: increment(-1) });
    transaction.set(buyerSellerInvRef, { count: increment(1), obtained_at: new Date().toISOString() }, { merge: true });

    // トレードステータスを完了に変更
    transaction.update(tradeRef, {
      status: "completed",
      buyer_uid: buyerUid,
      exchanged_at: serverTimestamp()
    });
  });
}
