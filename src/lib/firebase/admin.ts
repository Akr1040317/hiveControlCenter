import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getPrivateKey() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) {
    throw new Error("Missing FIREBASE_ADMIN_PRIVATE_KEY");
  }
  return key.replace(/\\n/g, "\n");
}

let cachedAdminApp: App | null = null;

function getAdminApp() {
  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  if (getApps().length) {
    cachedAdminApp = getApps()[0] ?? null;
    if (cachedAdminApp) {
      return cachedAdminApp;
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  cachedAdminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: getPrivateKey(),
    }),
  });

  return cachedAdminApp;
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorageBucket() {
  const explicitBucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  const fallbackBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`;
  return getStorage(getAdminApp()).bucket(explicitBucket || fallbackBucket);
}
