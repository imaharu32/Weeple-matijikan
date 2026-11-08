import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.REACT_APP_API_KEY,
    authDomain: import.meta.env.REACT_APP_AUTH_DOMAIN,
    projectId: import.meta.env.REACT_APP_PROJECT_ID,
    storageBucket: import.meta.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: import.meta.env.REACT_APP_APP_ID,
};

// デバッグログは開発時（npm run dev）だけ出す。本番ビルドでは何も出さない。
const isDev = import.meta.env.DEV;
const debugLog = (...args: unknown[]) => {
    if (isDev) console.log(...args);
};

debugLog('Firebase config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
});

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

const auth = getAuth(app);

// アプリ読み込み時に匿名認証を一度だけ開始する
let authInitPromise: Promise<void> | null = null;

function initializeAuth(): Promise<void> {
    if (!authInitPromise) {
        authInitPromise = signInAnonymously(auth)
            .then(() => {
                debugLog('[Firebase] Anonymous sign-in successful');
            })
            .catch((err) => {
                console.error('[Firebase] Anonymous sign-in failed:', {
                    code: err.code,
                    message: err.message,
                });
                throw err;
            });
    }
    return authInitPromise;
}

export function ensureAuthenticated(): Promise<void> {
    return initializeAuth();
}

// 匿名ログインは ensureAuthenticated() が最初に呼ばれたとき（＝データを購読するとき）に始まる。
// 読み込んだだけではネットワークにつながらないので、デモモードでは Firebase を使わずに済む。

if (isDev) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            debugLog('[Firebase] Auth state changed - signed in:', {
                uid: user.uid,
                isAnonymous: user.isAnonymous,
            });
        } else {
            debugLog('[Firebase] Auth state changed - signed out');
        }
    });
}
