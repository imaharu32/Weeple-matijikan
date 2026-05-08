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
const unitSeatsCol = (shopId: string) => collection(db, "shops", shopId, "unitSeats");

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

export async function updateInsideEntry(shopId: string, insideId: string, partial: Partial<Inside>) {
  const ref = doc(insideCol(shopId), insideId);
  await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() } as any);
}

// delete history entry
export async function removeHistoryEntry(shopId: string, historyId: string) {
  const ref = doc(historyCol(shopId), historyId);
  await deleteDoc(ref);
}

// 4) キューから店内へ移動（トランザクションで安全に実行）
//    - queue ドキュメントを読み取り → inside に追加 → queue を削除
export async function movePartyToInside(
  shopId: string,
  partyId: string,
  insideFields: Partial<Inside> = {},
  insideId?: string
) {
  const queueRef = doc(queueCol(shopId), partyId);
  // inside ドキュメントは自動IDか、渡された ID を使う
  const insideCollectionRef = insideCol(shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(queueRef);
    if (!snap.exists()) throw new Error("Party not found in queue");
    const partyData = snap.data() as Party;
    const newInsideRef = insideId ? doc(insideCollectionRef, insideId) : doc(insideCollectionRef);
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

// トランザクション: queue -> inside 作成 + 座席情報を Inside に含める
export async function movePartyToInsideWithSeats(
  shopId: string,
  partyId: string,
  insideFields: Partial<Inside> = {},
  insideId?: string,
  seats: { id: string; tableNumber: number; seatIndex: number }[] = []
) {
  const queueRef = doc(queueCol(shopId), partyId);
  const insideCollectionRef = insideCol(shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(queueRef);
    if (!snap.exists()) throw new Error('Party not found in queue');
    const partyData = snap.data() as Party;
    const newInsideRef = insideId ? doc(insideCollectionRef, insideId) : doc(insideCollectionRef);
    const insideData: any = {
      ...partyData,
      note: (partyData as any).note ?? '',
      ...insideFields,
      enterAt: insideFields.enterAt ?? new Date().toISOString(),
      seats: seats, // 座席詳細を直接含める
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

// トランザクション: inside -> history 追加 + inside 削除 + seats の解放
export async function checkoutFromInsideWithSeats(
  shopId: string,
  insideId: string,
  historyExtra: Partial<HistoryEntry> = {},
  seats: { id: string }[] = []
) {
  const insideRef = doc(insideCol(shopId), insideId);
  const historyCollectionRef = historyCol(shopId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(insideRef);
    if (!snap.exists()) throw new Error('Inside entry not found');
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

// トランザクション: inside の単純削除（history を作らない）
export async function removeInsideWithSeats(shopId: string, insideId: string, seats: { id: string }[] = []) {
  const insideRef = doc(insideCol(shopId), insideId);
  await deleteDoc(insideRef);
}

// 6) 単方向リスナー（リアルタイム同期）
export function listenQueue(shopId: string, cb: (items: (Party & { id: string })[]) => void) {
  const q = query(queueCol(shopId), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(items);
    },
    (error) => {
      console.error('[Firestore] listenQueue error:', error.code, error.message);
    }
  );
}

export function listenInside(shopId: string, cb: (items: (Inside & { id: string })[]) => void) {
  const q = query(insideCol(shopId), orderBy("createdAt"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(items);
    },
    (error) => {
      console.error('[Firestore] listenInside error:', error.code, error.message);
    }
  );
}

export function listenUnitSeats(shopId: string, cb: (items: (any & { id: string })[]) => void) {
  const q = query(unitSeatsCol(shopId), orderBy("tableNumber"), orderBy("seatIndex"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(items);
    },
    (error) => {
      console.error('[Firestore] listenUnitSeats error:', error.code, error.message);
    }
  );
}

// unitSeats が未作成の店舗向けに、初回のみ 6x6 の座席を作成
export async function ensureUnitSeatsInitialized(shopId: string) {
  const colRef = unitSeatsCol(shopId);
  try {
    const snaps = await getDocs(colRef);
    console.log('[Firestore] ensureUnitSeatsInitialized - existing seats:', snaps.size);
    if (!snaps.empty) {
      console.log('[Firestore] unitSeats already initialized, skipping');
      return;
    }

    console.log('[Firestore] Creating 36 unitSeats...');
    const batch = writeBatch(db);
    for (let tableNumber = 1; tableNumber <= 6; tableNumber++) {
      for (let seatIndex = 0; seatIndex < 6; seatIndex++) {
        const id = `table_${tableNumber}_${seatIndex}`;
        const ref = doc(colRef, id);
        batch.set(ref, { tableNumber, seatIndex, occupiedByInsideId: null } as any, { merge: true } as any);
      }
    }
    await batch.commit();
    console.log('[Firestore] unitSeats creation completed successfully');
  } catch (error) {
    console.error('[Firestore] ensureUnitSeatsInitialized failed:', error);
    throw error;
  }
}

export async function updateUnitSeatsBatch(shopId: string, seats: any[]) {
  const batch = writeBatch(db);
  const colRef = unitSeatsCol(shopId);
  seats.forEach((s) => {
    const ref = doc(colRef, s.id);
    const data = { tableNumber: s.tableNumber, seatIndex: s.seatIndex, occupiedByInsideId: s.occupiedByInsideId ?? null } as any;
    batch.set(ref, data, { merge: true } as any);
  });
  await batch.commit();
}

export function listenHistory(shopId: string, cb: (items: (HistoryEntry & { id: string })[]) => void) {
  const q = query(historyCol(shopId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      cb(items);
    },
    (error) => {
      console.error('[Firestore] listenHistory error:', error.code, error.message);
    }
  );
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
