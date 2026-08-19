// Firebase SDK (CDN) のインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebaseの設定情報（先ほど取得した値を当てはめています）
const firebaseConfig = {
  apiKey: "AIzaSyC5ZXpqMy3xeNfEupmMH5GZuBT_QAxGFiE",
  authDomain: "dbc2026.firebaseapp.com",
  projectId: "dbc2026",
  storageBucket: "dbc2026.firebasestorage.app",
  messagingSenderId: "799202254380",
  appId: "1:799202254380:web:d72e754608f6c29620bb89",
  measurementId: "G-BB3VMFPRV0"
};

// 初期化
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// 匿名ログイン処理
export async function initAuth() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch((err) => reject(err));
      }
    });
  });
}
