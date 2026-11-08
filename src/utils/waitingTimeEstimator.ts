/**
 * 座席ベースの待ち時間の見積もり
 *
 * - 席は1人1席として数える（全席数より多い組は、全席を使うものとして扱う）
 * - 店内の組は、退店予定時刻に席を空ける（予定を過ぎた組の席は、もう空いているものとして扱う）
 * - 待ち列は並んだ順に案内する（前の組が入るまで、後ろの組は入れない）
 * - 待ち列の組は、入店してから「一番短いコース ＋ 退店までの余裕」だけ席を使う
 *   （入店時に設定する退店予定と同じ計算）
 */

import { EXIT_BUFFER_MINUTES } from '../constants';
import { Party, Inside, UnitSeat, Course } from '../types';

const MINUTE = 60000;

/**
 * 待ち列の各組について、入店までの見込み（分）を返す
 * @returns Record<partyId, 分>
 */
export function estimateWaitingTimeWithSeats(
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[],
	now = Date.now()
): Record<string, number> {
	const estimates: Record<string, number> = {};
	const totalSeats = unitSeats.length;

	// 待ち列の組の滞在時間（コース ＋ 退店までの余裕）
	const shortestCourse = courses.length > 0 ? Math.min(...courses.map((c) => c.minutes)) : 30;
	const stayMs = (shortestCourse + EXIT_BUFFER_MINUTES) * MINUTE;

	// 今の空席数
	const occupiedCount = inside.reduce((sum, entry) => sum + (entry.seats?.length || 0), 0);
	let available = Math.max(0, totalSeats - occupiedCount);

	// 席が空く予定（時刻順）。予定を過ぎた組は、計算の最初に空く
	type ReleaseEvent = { time: number; seats: number };
	const releaseEvents: ReleaseEvent[] = inside
		.map((entry) => ({ time: new Date(entry.exitAt).getTime(), seats: entry.seats?.length || 0 }))
		.filter((event) => event.seats > 0)
		.sort((a, b) => a.time - b.time);
	let releaseIndex = 0;

	const releaseUpTo = (time: number) => {
		while (releaseIndex < releaseEvents.length && releaseEvents[releaseIndex].time <= time) {
			available = Math.min(totalSeats, available + releaseEvents[releaseIndex].seats);
			releaseIndex += 1;
		}
	};

	const addReleaseEvent = (event: ReleaseEvent) => {
		let insertAt = releaseEvents.length;
		while (insertAt > releaseIndex && releaseEvents[insertAt - 1].time > event.time) insertAt -= 1;
		releaseEvents.splice(insertAt, 0, event);
	};

	let simTime = now;
	for (const party of queue) {
		// 全席数より多い組は、全席を使うものとする（そうしないと永遠に入れない）
		const needed = Math.min(totalSeats, Math.max(1, party.size));

		releaseUpTo(simTime);
		let entryTime = simTime;
		// 必要な席数が空くまで、次に席が空く時刻へ進める
		// （店内の組も待ち列の組もいずれ必ず退店するので、needed ≦ 全席数なら必ず入れる）
		while (available < needed && releaseIndex < releaseEvents.length) {
			entryTime = Math.max(entryTime, releaseEvents[releaseIndex].time);
			releaseUpTo(entryTime);
		}

		estimates[party.id] = Math.ceil(Math.max(0, entryTime - now) / MINUTE);
		available -= needed;
		addReleaseEvent({ time: entryTime + stayMs, seats: needed });
		simTime = entryTime;
	}

	return estimates;
}

/**
 * 今から size 名で並んだ場合の入店までの見込み（分）
 */
export function estimateForNewParty(
	size: number,
	queue: Party[],
	inside: Inside[],
	unitSeats: UnitSeat[],
	courses: Course[],
	now = Date.now()
): number {
	const tempParty: Party = { id: '__new', size, note: '', joinAt: new Date(now).toISOString() };
	const estimates = estimateWaitingTimeWithSeats([...queue, tempParty], inside, unitSeats, courses, now);
	return estimates.__new ?? 0;
}
