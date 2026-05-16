/**
 * 座席ベースの待ち時間推定エンジン
 * 座席の占有状況と退店予定時刻から、キューのパーティの入店見込み時刻を推定
 */

import { Party, Inside, UnitSeat, Course } from '../types';
import { getSeatsRangeForPartySize } from './seatUtils';

/**
 * キュー内の各パーティについて、座席割当が可能になる時刻（見込み時間）を計算
 *
 * @param queue - 待機中のパーティ
 * @param inside - 現在店内のパーティ
 * @param unitSeats - 座席状況
 * @param courses - コース情報（参考）
 * @param seatsRangePerPartySize - 人数ごとの座席占有範囲ルール（オプション）
 * @returns Record<partyId, estimatedMinutes>
 */
export function estimateWaitingTimeWithSeats(
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[],
	seatsRangePerPartySize?: Record<number, { min: number; max: number }>
): Record<string, number> {
	const now = Date.now();
	const estimates: Record<string, number> = {};

	// デフォルト滞在時間（キュー内のパーティは最短コースを仮定）
	const defaultStayMinutes = courses.length > 0 ? Math.min(...courses.map((c) => c.minutes)) : 30;
	const defaultStayMs = defaultStayMinutes * 60000;

	// 全座席数
	const totalSeats = unitSeats.length;

	// 現在の空席数：inside データから実際に占有されている座席数を計算
	const occupiedCount = inside.reduce((sum, entry) => sum + (entry.seats?.length || 0), 0);
	let currentAvailableSeats = totalSeats - occupiedCount;

	// 退店イベントを時刻順に管理する
	type ReleaseEvent = { time: number; seats: number };
	const releaseEvents: ReleaseEvent[] = inside
		.map((entry) => ({
			time: new Date(entry.exitAt).getTime(),
			seats: entry.seats?.length || 0,
		}))
		.filter((event) => event.seats > 0)
		.sort((a, b) => a.time - b.time);

	let releaseIndex = 0;
	let simTime = now;

	const releaseEventsUpTo = (time: number) => {
		while (releaseIndex < releaseEvents.length && releaseEvents[releaseIndex].time <= time) {
			currentAvailableSeats = Math.min(totalSeats, currentAvailableSeats + releaseEvents[releaseIndex].seats);
			releaseIndex += 1;
		}
	};

	const insertReleaseEvent = (event: ReleaseEvent) => {
		if (event.seats <= 0) return;
		let insertAt = releaseEvents.length;
		while (insertAt > releaseIndex && releaseEvents[insertAt - 1].time > event.time) {
			insertAt -= 1;
		}
		releaseEvents.splice(insertAt, 0, event);
	};

	// キューを順番に処理
	for (let i = 0; i < queue.length; i++) {
		const party = queue[i];
		// 人数から座席選択可能な範囲を取得し、最小値を見込み座席数として使用
		const seatsRange = getSeatsRangeForPartySize(party.size, seatsRangePerPartySize);
		const needed = seatsRange.min;

		// すでに時刻が来ている退店イベントを反映
		releaseEventsUpTo(simTime);

		let entryTime = simTime;

		// 必要な席が空くまで、次の退店イベントへ進める
		while (currentAvailableSeats < needed) {
			if (releaseIndex >= releaseEvents.length) {
				// これ以上空く席がない場合は、現時点を入店時刻として打ち切る
				break;
			}

			entryTime = Math.max(entryTime, releaseEvents[releaseIndex].time);
			releaseEventsUpTo(entryTime);
			simTime = entryTime;
		}

		const waitMinutes = Math.ceil(Math.max(0, entryTime - now) / 60000);

		estimates[party.id] = waitMinutes;

		// このパーティがシミュレーション上で入店したので、座席を確保
		currentAvailableSeats -= needed;

		// このパーティの退店イベントをタイムラインに追加
		insertReleaseEvent({
			time: entryTime + defaultStayMs,
			seats: needed,
		});

		// 次のパーティはこの時刻以降で計算
		simTime = entryTime;
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
 * @param seatsRangePerPartySize - 人数ごとの座席占有範囲ルール（オプション）
 * @returns 見込み分数
 */
export function estimateForNewParty(
	size: number,
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[],
	seatsRangePerPartySize?: Record<number, { min: number; max: number }>
): number {
	const tempParty: Party = {
		id: '__tmp',
		size,
		note: '',
		joinAt: new Date().toISOString(),
	};
	const mergedQueue = [...queue, tempParty];
	const estimates = estimateWaitingTimeWithSeats(mergedQueue, inside, unitSeats, courses, seatsRangePerPartySize);
	return estimates.__tmp ?? 0;
}
