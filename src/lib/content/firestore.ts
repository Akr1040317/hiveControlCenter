import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

type ListOptions = {
  limit?: number;
  orderBy?: string;
  direction?: "asc" | "desc";
  statusFilter?: string;
};

export async function listDocuments<T>(
  collectionName: string,
  options: ListOptions = {},
): Promise<(T & { id: string })[]> {
  const db = getAdminDb();
  const { limit = 50, orderBy = "updatedAt", direction = "desc", statusFilter } = options;

  let q: FirebaseFirestore.Query = db.collection(collectionName);

  if (statusFilter) {
    q = q.where("status", "==", statusFilter);
  }

  try {
    q = q.orderBy(orderBy, direction);
  } catch {
    // index may not exist yet
  }

  q = q.limit(limit);
  const snap = await q.get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as T),
  }));
}

export async function getDocument<T>(
  collectionName: string,
  docId: string,
): Promise<(T & { id: string }) | null> {
  const db = getAdminDb();
  const doc = await db.collection(collectionName).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as T) };
}

export async function createDocument<T extends Record<string, unknown>>(
  collectionName: string,
  data: T,
): Promise<string> {
  const db = getAdminDb();
  const ref = await db.collection(collectionName).add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const db = getAdminDb();
  await db
    .collection(collectionName)
    .doc(docId)
    .update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
): Promise<void> {
  const db = getAdminDb();
  await db.collection(collectionName).doc(docId).delete();
}
