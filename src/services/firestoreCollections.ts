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
	runTransaction,
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

/** 待ち列 → 店内（トランザクションで queue を消して inside を作る） */
export async function movePartyToInside(
	shopId: string,
	partyId: string,
	insideId: string,
	fields: { courseId: string; enterAt: string; exitAt: string; seats: SeatDetail[] }
) {
	const queueRef = doc(queueCol(shopId), partyId);
	const insideRef = doc(insideCol(shopId), insideId);
	await runTransaction(db, async (tx) => {
		const snap = await tx.get(queueRef);
		if (!snap.exists()) throw new Error('Party not found in queue');
		const partyData = snap.data() as Omit<Party, 'id'>;
		tx.set(insideRef, {
			...partyData,
			note: partyData.note ?? '',
			...fields,
			createdAt: serverTimestamp(),
		});
		tx.delete(queueRef);
	});
}

export async function updateInsideEntry(shopId: string, insideId: string, partial: Partial<Inside>) {
	await updateDoc(doc(insideCol(shopId), insideId), { ...partial, updatedAt: serverTimestamp() });
}

/** 店内のレコードを履歴に残さずに消す */
export async function removeInside(shopId: string, insideId: string) {
	await deleteDoc(doc(insideCol(shopId), insideId));
}

/** 店内 → 退店（トランザクションで history を作って inside を消す） */
export async function checkoutFromInside(shopId: string, insideId: string, exitAt: string) {
	const insideRef = doc(insideCol(shopId), insideId);
	const historyRef = doc(historyCol(shopId));
	await runTransaction(db, async (tx) => {
		const snap = await tx.get(insideRef);
		if (!snap.exists()) throw new Error('Inside entry not found');
		const insideData = snap.data() as Omit<Inside, 'id'>;
		tx.set(historyRef, {
			...insideData,
			note: insideData.note ?? '',
			exitAt,
			createdAt: serverTimestamp(),
		});
		tx.delete(insideRef);
	});
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
