/**
 * デモモード用の店舗データ（開発時のみ）。
 * `npm run dev` で http://localhost:3000/?demo を開くと、Firebase を使わずにこのサンプルデータで動く。
 * 操作はすべてメモリ上だけで行われ、リロードすると元に戻る。
 */

import { useState } from 'react';
import { COURSES, EXIT_BUFFER_MINUTES } from '../constants';
import type { ShopDataOptions, useShopData } from '../hooks/useShopData';
import type { HistoryEntry, Inside, Party, SeatDetail } from '../types';
import { addMinutesISO, nowIso, uid } from '../utils';

const minutesFromNow = (min: number) => new Date(Date.now() + min * 60000).toISOString();
const seats = (table: number, ...indexes: number[]): SeatDetail[] =>
	indexes.map((i) => ({ id: `table_${table}_${i}`, tableNumber: table, seatIndex: i }));

function createSample() {
	const queue: Party[] = [
		{ id: 'demo_q1', size: 2, note: 'カップル', joinAt: minutesFromNow(-18) },
		{ id: 'demo_q2', size: 4, note: '', joinAt: minutesFromNow(-9) },
		{ id: 'demo_q3', size: 3, note: '大学生', joinAt: minutesFromNow(-3) },
		{ id: 'demo_q4', size: 1, note: '', joinAt: minutesFromNow(-1) },
	];
	const inside: Inside[] = [
		{ id: 'demo_i1', size: 2, note: '常連さん', courseId: 'c60', enterAt: minutesFromNow(-50), exitAt: minutesFromNow(25), seats: seats(1, 0, 1) },
		{ id: 'demo_i2', size: 4, note: '家族（子ども2人）', courseId: 'c60', enterAt: minutesFromNow(-70), exitAt: minutesFromNow(5), seats: seats(2, 0, 1, 2, 3) },
		{ id: 'demo_i3', size: 3, note: '', courseId: 'c30', enterAt: minutesFromNow(-50), exitAt: minutesFromNow(-5), seats: seats(3, 0, 1, 2) },
		{ id: 'demo_i4', size: 5, note: '会社の同僚', courseId: 'c60', enterAt: minutesFromNow(-10), exitAt: minutesFromNow(65), seats: seats(5, 0, 1, 2, 3, 4, 5) },
		{ id: 'demo_i5', size: 1, note: '', courseId: 'c30', enterAt: minutesFromNow(-5), exitAt: minutesFromNow(40), seats: seats(4, 0) },
	];
	const history: HistoryEntry[] = [
		{ id: 'demo_h1', size: 2, note: '', courseId: 'c30', enterAt: minutesFromNow(-120), exitAt: minutesFromNow(-75), seats: seats(1, 2, 3) },
		{ id: 'demo_h2', size: 3, note: '友人', courseId: 'c60', enterAt: minutesFromNow(-180), exitAt: minutesFromNow(-105), seats: seats(6, 0, 1, 2) },
		{ id: 'demo_h3', size: 4, note: '', courseId: 'c60', enterAt: minutesFromNow(-24 * 60 - 120), exitAt: minutesFromNow(-24 * 60 - 45), seats: seats(2, 0, 1, 2, 3) },
		{ id: 'demo_h4', size: 2, note: 'カップル', courseId: 'c30', enterAt: minutesFromNow(-24 * 60 - 200), exitAt: minutesFromNow(-24 * 60 - 155), seats: seats(4, 0, 1) },
	];
	return { queue, inside, history };
}

export function useDemoShopData(
	_shopId: string,
	_notify: (message: string) => void,
	_options?: ShopDataOptions
): ReturnType<typeof useShopData> {
	const [initial] = useState(createSample);
	const [queue, setQueue] = useState<Party[]>(initial.queue);
	const [inside, setInside] = useState<Inside[]>(initial.inside);
	const [history, setHistory] = useState<HistoryEntry[]>(initial.history);

	return {
		queue,
		inside,
		history,
		historyLoading: false,
		addParty: async (size, note) => {
			setQueue((current) => [...current, { id: uid('q_'), size, note: note ?? '', joinAt: nowIso() }]);
		},
		removeParty: async (partyId) => {
			setQueue((current) => current.filter((party) => party.id !== partyId));
		},
		updateParty: async (partyId, size, note) => {
			setQueue((current) => current.map((party) => (party.id === partyId ? { ...party, size, note } : party)));
		},
		enterParty: async (party, courseId, selectedSeats) => {
			const course = COURSES.find((item) => item.id === courseId);
			if (!course) return;
			const enterAt = nowIso();
			setQueue((current) => current.filter((item) => item.id !== party.id));
			setInside((current) => [
				...current,
				{
					id: uid('in_'),
					size: party.size,
					note: party.note ?? '',
					courseId,
					enterAt,
					exitAt: addMinutesISO(enterAt, course.minutes + EXIT_BUFFER_MINUTES),
					seats: selectedSeats,
				},
			]);
		},
		checkout: async (insideId) => {
			const entry = inside.find((item) => item.id === insideId);
			if (!entry) return;
			setInside((current) => current.filter((item) => item.id !== insideId));
			setHistory((current) => [{ ...entry, id: uid('h_'), exitAt: nowIso() }, ...current]);
		},
		removeInside: async (insideId) => {
			setInside((current) => current.filter((item) => item.id !== insideId));
		},
		updateInside: async (insideId, partial) => {
			setInside((current) => current.map((item) => (item.id === insideId ? { ...item, ...partial } : item)));
		},
		removeHistoryEntry: async (historyId) => {
			setHistory((current) => current.filter((item) => item.id !== historyId));
		},
	};
}
