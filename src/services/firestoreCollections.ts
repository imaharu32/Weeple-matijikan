import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  runTransaction,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import type { AppState, Party, Inside, HistoryEntry } from "../types";

// helpers: collection/document refs
const queueCol = (shopId: string) => collection(db, "shops", shopId, "queue");
const insideCol = (shopId: string) => collection(db, "shops", shopId, "inside");
const historyCol = (shopId: string) => collection(db, "shops", shopId, "history");
const settingsDoc = (shopId: string) => doc(db, "shops", shopId, "meta", "settings");

// --- 差分同期用 API ---

// 1) キューへパーティを追加（差分: 追加のみ）
export async function addPartyToQueue(shopId: string, party: Omit<Party, "id">, id?: string) {
  const data = { ...party, note: party.note ?? '', createdAt: serverTimestamp() } as any;
  if (id) {
    const ref = doc(queueCol(shopId), id);
    await setDoc(ref, data);
    return id;
  }
  const ref = await addDoc(queueCol(shopId), data);
  return ref.id;
}

// 2) キュー内のパーティを更新（部分更新）
export async function updatePartyInQueue(shopId: string, partyId: string, partial: Partial<Party>) {
  const ref = doc(queueCol(shopId), partyId);
  await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() } as any);
}

// 3) キューから削除
export async function removePartyFromQueue(shopId: string, partyId: string) {
  const ref = doc(queueCol(shopId), partyId);
  await deleteDoc(ref);
}

// remove inside entry without history
export async function removeInside(shopId: string, insideId: string) {
  const ref = doc(insideCol(shopId), insideId);
  await deleteDoc(ref);
}

// delete history entry
export async function removeHistoryEntry(shopId: string, historyId: string) {
  const ref = doc(historyCol(shopId), historyId);
  await deleteDoc(ref);
}

// 4) キューから店内へ移動（トランザクションで安全に実行）
//    - queue ドキュメントを読み取り → inside に追加 → queue を削除
export async function movePartyToInside(shopId: string, partyId: string, insideFields: Partial<Inside> = {}) {
  const queueRef = doc(queueCol(shopId), partyId);
  // inside ドキュメントは自動IDで作る
  const insideCollectionRef = insideCol(shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(queueRef);
    if (!snap.exists()) throw new Error("Party not found in queue");
    const partyData = snap.data() as Party;
    const newInsideRef = doc(insideCollectionRef);
    const insideData: any = {
      ...partyData,
      note: (partyData as any).note ?? '',
      ...insideFields,
      enterAt: insideFields.enterAt ?? new Date().toISOString(),
      createdAt: serverTimestamp(),
    };
    tx.set(newInsideRef, insideData);
    tx.delete(queueRef);
  });
}

// 5) 店内から退店（history に追加して店内から削除）
export async function checkoutFromInside(shopId: string, insideId: string, historyExtra: Partial<HistoryEntry> = {}) {
  const insideRef = doc(insideCol(shopId), insideId);
  const historyCollectionRef = historyCol(shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(insideRef);
    if (!snap.exists()) throw new Error("Inside entry not found");
    const insideData = snap.data() as Inside;
    const historyRef = doc(historyCollectionRef);
    const historyData: any = {
      ...insideData,
      note: (insideData as any).note ?? '',
      exitAt: historyExtra.exitAt ?? new Date().toISOString(),
      createdAt: serverTimestamp(),
      ...historyExtra,
    };
    tx.set(historyRef, historyData);
    tx.delete(insideRef);
  });
}

// 6) 単方向リスナー（リアルタイム同期）
export function listenQueue(shopId: string, cb: (items: (Party & { id: string })[]) => void) {
  const q = query(queueCol(shopId), orderBy("createdAt"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

export function listenInside(shopId: string, cb: (items: (Inside & { id: string })[]) => void) {
  const q = query(insideCol(shopId), orderBy("createdAt"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

export function listenHistory(shopId: string, cb: (items: (HistoryEntry & { id: string })[]) => void) {
  const q = query(historyCol(shopId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    cb(items);
  });
}

// 7) 手動同期: 全置換（既存を削除して上書き） — 必要なら使用
export async function overwriteAllCollections(shopId: string, state: AppState) {
  // delete existing small collections (注意: 大量データはページングが必要)
  await deleteCollectionFully(queueCol(shopId));
  await deleteCollectionFully(insideCol(shopId));
  await deleteCollectionFully(historyCol(shopId));

  const batch = writeBatch(db);
  for (const p of state.queue) {
    const ref = doc(queueCol(shopId));
    batch.set(ref, { ...p, createdAt: serverTimestamp() } as any);
  }
  for (const i of state.inside) {
    const ref = doc(insideCol(shopId));
    batch.set(ref, { ...i, createdAt: serverTimestamp() } as any);
  }
  for (const h of (state.history ?? [])) {
    const ref = doc(historyCol(shopId));
    batch.set(ref, { ...h, createdAt: serverTimestamp() } as any);
  }
  batch.set(settingsDoc(shopId), { ...state.settings, updatedAt: serverTimestamp() }, { merge: true } as any);
  await batch.commit();
}

// deleteCollectionFully helper (小規模向け、大規模はページング必要)
async function deleteCollectionFully(collRef: any) {
  const snaps = await getDocs(collRef);
  if (snaps.empty) return;
  const batch = writeBatch(db);
  snaps.docs.forEach((d: any) => batch.delete(d.ref));
  await batch.commit();
}
