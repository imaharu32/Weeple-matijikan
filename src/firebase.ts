// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
};

console.log('Firebase config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

const auth = getAuth();

// Initialize anonymous authentication immediately on app load
let authInitPromise: Promise<void> | null = null;

function initializeAuth(): Promise<void> {
    if (!authInitPromise) {
        authInitPromise = signInAnonymously(auth)
            .then(() => {
                console.log('[Firebase] Anonymous sign-in successful');
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

// Start authentication immediately when this module loads
initializeAuth().catch((err) => {
    console.error('[Firebase] Initial auth init failed:', err);
});

// Monitor auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('[Firebase] Auth state changed - signed in:', {
            uid: user.uid,
            isAnonymous: user.isAnonymous,
            email: user.email || 'N/A',
        });
    } else {
        console.log('[Firebase] Auth state changed - signed out');
    }
});