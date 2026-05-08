/**
 * 座席ベースの待ち時間推定エンジン
 * 座席の占有状況と退店予定時刻から、キューのパーティの入店見込み時刻を推定
 */

import { Party, Inside, UnitSeat, Course } from '../types';

/**
 * キュー内の各パーティについて、座席割当が可能になる時刻（見込み時間）を計算
 *
 * @param queue - 待機中のパーティ
 * @param inside - 現在店内のパーティ
 * @param unitSeats - 座席状況
 * @param courses - コース情報（参考）
 * @returns Record<partyId, estimatedMinutes>
 */
export function estimateWaitingTimeWithSeats(
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[]
): Record<string, number> {
	const now = Date.now();
	const estimates: Record<string, number> = {};

	// 現在の空席数
	let availableSeats = unitSeats.filter((seat) => !seat.occupiedByInsideId).length;

	// 優先度付きキュー（min-heap）で退店イベントを管理する
	type Event = { time: number; seats: number };
	const heap: Event[] = [];
	const push = (ev: Event) => {
		heap.push(ev);
		let i = heap.length - 1;
		while (i > 0) {
			const p = Math.floor((i - 1) / 2);
			if (heap[p].time <= heap[i].time) break;
			[heap[p], heap[i]] = [heap[i], heap[p]];
			i = p;
		}
	};
	const pop = (): Event | undefined => {
		if (heap.length === 0) return undefined;
		const top = heap[0];
		const last = heap.pop()!;
		if (heap.length === 0) return top;
		heap[0] = last;
		let i = 0;
		while (true) {
			const l = i * 2 + 1;
			const r = i * 2 + 2;
			let smallest = i;
			if (l < heap.length && heap[l].time < heap[smallest].time) smallest = l;
			if (r < heap.length && heap[r].time < heap[smallest].time) smallest = r;
			if (smallest === i) break;
			[heap[i], heap[smallest]] = [heap[smallest], heap[i]];
			i = smallest;
		}
		return top;
	};

	// 初期イベント（既に店内にいる人の退店）を投入
	inside.forEach((entry) => {
		const occupiedSeats = unitSeats.filter((s) => s.occupiedByInsideId === entry.id).length;
		const exitTime = new Date(entry.exitAt).getTime();
		if (occupiedSeats > 0) push({ time: exitTime, seats: occupiedSeats });
	});

	// 推定に使う各パーティの滞在分数（キュー内は最短コースを仮定）
	const defaultCourseMinutes = courses.length > 0 ? Math.min(...courses.map((c) => c.minutes)) : 30;

	// キューを先頭から順にシミュレーションして割当時刻を決定
	for (const party of queue) {
		const needed = party.size;
		let assignTime = now;

		if (availableSeats >= needed) {
			// すぐに入店可能
			assignTime = now;
			availableSeats -= needed;
		} else {
			// 退店イベントを順に消費して、必要座席が確保できる時刻を探す
			let freed = 0;
			while (availableSeats + freed < needed) {
					const ev = pop();
					if (!ev) {
						// 将来の情報が足りない場合は仮定イベントを生成して推定を続行する
						// 仮定: 一定間隔ごとにいくつかの座席が解放されると見なす
						const intervalMs = defaultCourseMinutes * 60000;
						const assumedSeatsPerInterval = Math.max(1, Math.floor(unitSeats.length / 6));
						// schedule synthetic event time
						const syntheticTime = assignTime + intervalMs;
						freed += assumedSeatsPerInterval;
						assignTime = syntheticTime;
						// continue the loop to check if freed is enough; do not push to heap
						continue;
					}
				// 同じ時刻のイベントはまとめて処理する
				const t = ev.time;
				freed += ev.seats;
				// 次の同時刻イベントも取り出す
				while (heap.length > 0 && heap[0].time === t) {
					const ev2 = pop()!;
					freed += ev2.seats;
				}
				assignTime = Math.max(assignTime, t);
			}

			if (assignTime === Infinity) {
				estimates[party.id] = 0;
				continue;
			}

			// 確保できる時間に到達したのでその時刻で入店扱い
			availableSeats = availableSeats + freed - needed;
		}

		// 割当時刻に基づき、そのパーティの退店イベントを追加
		const exitTime = assignTime + defaultCourseMinutes * 60000;
		if (isFinite(assignTime)) push({ time: exitTime, seats: needed });

		// 推定分を記録
		const waitMinutes = isFinite(assignTime) ? Math.ceil(Math.max(0, assignTime - now) / 60000) : 0;
		estimates[party.id] = waitMinutes;
	}

	return estimates;
}

/**
 * 新規に追加されたパーティの見込み時間を計算（プレビュー用）
 * @param size - パーティ人数
 * @param queue - 現在のキュー
 * @param inside - 現在の店内状況
 * @param unitSeats - 座席状況
 * @param courses - コース情報
 * @returns 見込み分数
 */
export function estimateForNewParty(
	size: number,
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[]
): number {
	const tempParty: Party = {
		id: '__tmp',
		size,
		note: '',
		joinAt: new Date().toISOString(),
	};
	const mergedQueue = [...queue, tempParty];
	const estimates = estimateWaitingTimeWithSeats(mergedQueue, inside, unitSeats, courses);
	return estimates.__tmp ?? 0;
}
