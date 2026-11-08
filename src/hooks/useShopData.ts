/**
 * 店舗データ（待ち列・店内・履歴）の購読と更新をまとめたフック。
 * 画面側はこのフックが返す値と関数だけを使えばよい。
 * 更新はすべて「先に画面へ反映 → 失敗したら元に戻してメッセージ表示」の流れ。
 */

import { useEffect, useState } from 'react';
import { ensureAuthenticated } from '../firebase';
import { COURSES, EXIT_BUFFER_MINUTES, HISTORY_DAYS } from '../constants';
import * as api from '../services/firestoreCollections';
import type { HistoryEntry, Inside, Party, SeatDetail } from '../types';
import { addMinutesISO, nowIso, uid } from '../utils';

const DAY_MS = 24 * 60 * 60 * 1000;

export function useShopData(shopId: string, notify: (message: string) => void) {
	const [queue, setQueue] = useState<Party[]>([]);
	const [inside, setInside] = useState<Inside[]>([]);
	const [history, setHistory] = useState<HistoryEntry[]>([]);

	useEffect(() => {
		let isMounted = true;
		// 認証完了後に登録したリスナーの解除関数をここに貯めて、アンマウント時に必ず呼ぶ
		const unsubscribers: Array<() => void> = [];
		const onListenError = () => {
			if (isMounted) notify('データの読み込みに失敗しました。通信状況を確認してください。');
		};
		const historySince = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString();

		ensureAuthenticated()
			.then(() => {
				if (!isMounted) return;
				unsubscribers.push(
					api.listenQueue(shopId, (items) => {
						if (isMounted) setQueue(items);
					}, onListenError),
					api.listenInside(shopId, (items) => {
						if (isMounted) setInside(items);
					}, onListenError),
					api.listenHistory(shopId, historySince, (items) => {
						if (isMounted) setHistory(items);
					}, onListenError)
				);
			})
			.catch((error) => {
				console.error('[useShopData] Authentication failed:', error);
				if (!isMounted) return;
				notify(
					import.meta.env.DEV
						? 'Firebase に接続できませんでした。.env の設定を確認するか、URL の末尾に ?demo を付けてデモモードで開いてください。'
						: '認証に失敗しました。ページをリロードしてください。'
				);
			});

		return () => {
			isMounted = false;
			unsubscribers.forEach((unsubscribe) => {
				try {
					unsubscribe();
				} catch {
					// すでに解除済みなどで失敗しても、アンマウント処理は止めない
				}
			});
		};
	}, [shopId, notify]);

	// --- 待ち列 ---

	const addParty = async (size: number, note?: string) => {
		const party: Party = { id: uid('q_'), size, note: note ?? '', joinAt: nowIso() };
		setQueue((current) => [...current, party]);
		try {
			await api.addPartyToQueue(shopId, { size: party.size, note: party.note, joinAt: party.joinAt }, party.id);
		} catch (error) {
			console.error('addParty error', error);
			setQueue((current) => current.filter((item) => item.id !== party.id));
			notify('列への追加に失敗しました。');
		}
	};

	const removeParty = async (partyId: string) => {
		const previousQueue = queue;
		setQueue((current) => current.filter((party) => party.id !== partyId));
		try {
			await api.removePartyFromQueue(shopId, partyId);
		} catch (error) {
			console.error('remove party error', error);
			setQueue(previousQueue);
			notify('列からの削除に失敗しました。');
		}
	};

	const updateParty = async (partyId: string, size: number, note: string) => {
		const previousQueue = queue;
		setQueue((current) => current.map((party) => (party.id === partyId ? { ...party, size, note } : party)));
		try {
			await api.updatePartyInQueue(shopId, partyId, { size, note });
		} catch (error) {
			console.error('update party error', error);
			setQueue(previousQueue);
			notify('列の更新に失敗しました。');
		}
	};

	// --- 店内 ---

	const enterParty = async (party: Party, courseId: string, seats: SeatDetail[]) => {
		const course = COURSES.find((item) => item.id === courseId);
		if (!course) return;

		const enterAt = nowIso();
		const exitAt = addMinutesISO(enterAt, course.minutes + EXIT_BUFFER_MINUTES);
		const newInside: Inside = {
			id: uid('in_'),
			size: party.size,
			note: party.note ?? '',
			courseId,
			enterAt,
			exitAt,
			seats,
		};
		const previousQueue = queue;
		const previousInside = inside;

		setQueue((current) => current.filter((item) => item.id !== party.id));
		setInside((current) => [...current, newInside]);

		try {
			await api.movePartyToInside(shopId, party, newInside.id, { courseId, enterAt, exitAt, seats });
		} catch (error) {
			console.error('move to inside error', error);
			setQueue(previousQueue);
			setInside(previousInside);
			notify('入店処理に失敗しました。再試行してください。');
		}
	};

	const checkout = async (insideId: string) => {
		const entry = inside.find((item) => item.id === insideId);
		if (!entry) return;
		const historyEntry: HistoryEntry = {
			id: uid('h_'),
			size: entry.size,
			note: entry.note,
			courseId: entry.courseId,
			enterAt: entry.enterAt,
			exitAt: nowIso(),
			seats: entry.seats,
		};
		const previousInside = inside;
		const previousHistory = history;

		setInside((current) => current.filter((item) => item.id !== insideId));
		setHistory((current) => [historyEntry, ...current]);

		try {
			await api.checkoutFromInside(shopId, entry, historyEntry.exitAt);
		} catch (error) {
			console.error('checkout error', error);
			setInside(previousInside);
			setHistory(previousHistory);
			notify('退店処理に失敗しました。通信状況を確認してください。');
		}
	};

	const removeInside = async (insideId: string) => {
		const previousInside = inside;
		setInside((current) => current.filter((item) => item.id !== insideId));
		try {
			await api.removeInside(shopId, insideId);
		} catch (error) {
			console.error('remove inside error', error);
			setInside(previousInside);
			notify('店内レコードの削除に失敗しました。');
		}
	};

	const updateInside = async (insideId: string, partial: Partial<Inside>) => {
		const previousInside = inside;
		setInside((current) => current.map((item) => (item.id === insideId ? { ...item, ...partial } : item)));
		try {
			await api.updateInsideEntry(shopId, insideId, partial);
		} catch (error) {
			console.error('update inside error', error);
			setInside(previousInside);
			notify('店内レコードの更新に失敗しました。');
		}
	};

	// --- 履歴 ---

	const removeHistoryEntry = async (historyId: string) => {
		const previousHistory = history;
		setHistory((current) => current.filter((item) => item.id !== historyId));
		try {
			await api.removeHistoryEntry(shopId, historyId);
		} catch (error) {
			console.error('remove history error', error);
			setHistory(previousHistory);
			notify('履歴の削除に失敗しました。');
		}
	};

	return {
		queue,
		inside,
		history,
		addParty,
		removeParty,
		updateParty,
		enterParty,
		checkout,
		removeInside,
		updateInside,
		removeHistoryEntry,
	};
}
