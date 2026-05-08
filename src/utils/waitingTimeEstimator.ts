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

	// 退店イベント（時刻ごとの解放席数）を整理
	const insideExitMap = new Map<number, number>();
	inside.forEach((entry) => {
		const occupiedSeats = unitSeats.filter((s) => s.occupiedByInsideId === entry.id).length;
		const exitTime = new Date(entry.exitAt).getTime();
		insideExitMap.set(exitTime, (insideExitMap.get(exitTime) ?? 0) + occupiedSeats);
	});

	const releaseEvents = Array.from(insideExitMap.entries())
		.map(([time, seats]) => ({ time, seats }))
		.sort((a, b) => a.time - b.time);

	let eventIndex = 0;
	let simulatedTime = now;

	// キュー順に、前の組から順番に空席を消費していく
	for (const party of queue) {
		const neededSeats = party.size;

		// まだ足りない場合は、現在の時刻以降で退店イベントを順に消費する
		while (availableSeats < neededSeats && eventIndex < releaseEvents.length) {
			const nextTime = releaseEvents[eventIndex].time;
			simulatedTime = Math.max(simulatedTime, nextTime);

			while (eventIndex < releaseEvents.length && releaseEvents[eventIndex].time === nextTime) {
				availableSeats += releaseEvents[eventIndex].seats;
				eventIndex += 1;
			}
		}

		if (availableSeats >= neededSeats) {
			estimates[party.id] = Math.ceil(Math.max(0, simulatedTime - now) / 60000);
			availableSeats -= neededSeats;
		} else {
			// 不整合なデータの場合は 0 分に落とす
			estimates[party.id] = 0;
		}
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
