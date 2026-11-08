import { db } from '../firebase';
import {
	collection,
	doc,
	setDoc,
	query,
	orderBy,
	where,
	deleteDoc,
	serverTimestamp,
	writeBatch,
	updateDoc,
	onSnapshot,
	type DocumentData,
	type FirestoreError,
	type QuerySnapshot,
} from 'firebase/firestore';
import type { Party, Inside, HistoryEntry, SeatDetail } from '../types';

// shops/{shopId}/...
const queueCol = (shopId: string) => collection(db, 'shops', shopId, 'queue');
const insideCol = (shopId: string) => collection(db, 'shops', shopId, 'inside');
const historyCol = (shopId: string) => collection(db, 'shops', shopId, 'history');

type ErrorHandler = (error: FirestoreError) => void;

const toItems = <T,>(snapshot: QuerySnapshot<DocumentData>): T[] =>
	snapshot.docs.map((d) => ({ ...(d.data() as Omit<T, 'id'>), id: d.id }) as T);

const logAndForward = (label: string, onError?: ErrorHandler) => (error: FirestoreError) => {
	console.error(`[Firestore] ${label} error:`, error.code, error.message);
	onError?.(error);
};

// --- 待ち列 ---

export async function addPartyToQueue(shopId: string, party: Omit<Party, 'id'>, id: string) {
	await setDoc(doc(queueCol(shopId), id), {
		...party,
		note: party.note ?? '',
		createdAt: serverTimestamp(),
	});
	return id;
}

export async function updatePartyInQueue(shopId: string, partyId: string, partial: Partial<Party>) {
	await updateDoc(doc(queueCol(shopId), partyId), { ...partial, updatedAt: serverTimestamp() });
}

export async function removePartyFromQueue(shopId: string, partyId: string) {
	await deleteDoc(doc(queueCol(shopId), partyId));
}

export function listenQueue(shopId: string, cb: (items: Party[]) => void, onError?: ErrorHandler) {
	return onSnapshot(
		query(queueCol(shopId), orderBy('createdAt')),
		(snapshot) => cb(toItems<Party>(snapshot)),
		logAndForward('listenQueue', onError)
	);
}

// --- 店内 ---

/**
 * 待ち列 → 店内。inside を作って queue を消す。
 * バッチ書き込みなので、送った瞬間に手元のキャッシュに反映され、画面からすぐ消える（どちらか片方だけ成功することはない）。
 * トランザクションはサーバーで確定するまで手元に反映されず、その間は待ち列に残って見えるので使わない。
 */
export async function movePartyToInside(
	shopId: string,
	party: Party,
	insideId: string,
	fields: { courseId: string; enterAt: string; exitAt: string; seats: SeatDetail[] }
) {
	const { id: partyId, ...partyData } = party;
	const batch = writeBatch(db);
	batch.set(doc(insideCol(shopId), insideId), {
		...partyData,
		note: partyData.note ?? '',
		...fields,
		createdAt: serverTimestamp(),
	});
	batch.delete(doc(queueCol(shopId), partyId));
	await batch.commit();
}

export async function updateInsideEntry(shopId: string, insideId: string, partial: Partial<Inside>) {
	await updateDoc(doc(insideCol(shopId), insideId), { ...partial, updatedAt: serverTimestamp() });
}

/** 店内のレコードを履歴に残さずに消す */
export async function removeInside(shopId: string, insideId: string) {
	await deleteDoc(doc(insideCol(shopId), insideId));
}

/** 店内 → 退店。history を作って inside を消す（入店と同じくバッチ書き込み） */
export async function checkoutFromInside(shopId: string, entry: Inside, exitAt: string) {
	const { id: insideId, ...insideData } = entry;
	const batch = writeBatch(db);
	batch.set(doc(historyCol(shopId)), {
		...insideData,
		note: insideData.note ?? '',
		exitAt,
		createdAt: serverTimestamp(),
	});
	batch.delete(doc(insideCol(shopId), insideId));
	await batch.commit();
}

export function listenInside(shopId: string, cb: (items: Inside[]) => void, onError?: ErrorHandler) {
	return onSnapshot(
		query(insideCol(shopId), orderBy('createdAt')),
		(snapshot) => cb(toItems<Inside>(snapshot)),
		logAndForward('listenInside', onError)
	);
}

// --- 履歴 ---

export async function removeHistoryEntry(shopId: string, historyId: string) {
	await deleteDoc(doc(historyCol(shopId), historyId));
}

/**
 * sinceIso 以降に退店した履歴だけを新しい順に購読する。
 * exitAt は toISOString() の文字列なので、文字列比較で期間を絞れる。
 */
export function listenHistory(
	shopId: string,
	sinceIso: string,
	cb: (items: HistoryEntry[]) => void,
	onError?: ErrorHandler
) {
	return onSnapshot(
		query(historyCol(shopId), where('exitAt', '>=', sinceIso), orderBy('exitAt', 'desc')),
		(snapshot) => cb(toItems<HistoryEntry>(snapshot)),
		logAndForward('listenHistory', onError)
	);
}
