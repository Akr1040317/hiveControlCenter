import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInitialized = false;

function getClientApp() {
  if (!appInitialized) {
    const required: Array<[string, string | undefined]> = [
      ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
      ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
      ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
    ];
    const missing = required
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(
        `Missing Firebase client env vars: ${missing.join(", ")}.`,
      );
    }

    appInitialized = true;
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  return getAuth(getClientApp());
}

export function getFirebaseDb() {
  return getFirestore(getClientApp());
}

export function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
