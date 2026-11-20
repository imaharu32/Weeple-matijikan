/**
 * 座席まわりのユーティリティ
 */

import { Inside, UnitSeat } from '../types';

/** 使用中の席 id の一覧（ignoreInsideId の組の席は空席として扱う） */
export function getOccupiedSeatIds(inside: Inside[], ignoreInsideId?: string): Set<string> {
	const ids = new Set<string>();
	inside.forEach((entry) => {
		if (entry.id === ignoreInsideId) return;
		entry.seats?.forEach((seat) => ids.add(seat.id));
	});
	return ids;
}

/**
 * おすすめの席を count 席ぶん選ぶ。
 * 1つのテーブルに収まるなら、空きが一番少ない（ちょうど収まる）テーブルの席を番号順に選ぶ。
 * 大きなテーブルを後の組のために残すため。収まらなければ、空きの多いテーブルから順に埋める。
 * 空席が足りなければ、選べた分だけ返す。
 */
export function suggestSeats(count: number, unitSeats: UnitSeat[], occupiedSeatIds: Set<string>): string[] {
	if (count <= 0) return [];
	const freeByTable = new Map<number, UnitSeat[]>();
	unitSeats
		.filter((seat) => !occupiedSeatIds.has(seat.id))
		.sort((a, b) => a.tableNumber - b.tableNumber || a.seatIndex - b.seatIndex)
		.forEach((seat) => freeByTable.set(seat.tableNumber, [...(freeByTable.get(seat.tableNumber) ?? []), seat]));

	const tables = Array.from(freeByTable.entries());
	const fitting = tables
		.filter(([, seats]) => seats.length >= count)
		.sort((a, b) => a[1].length - b[1].length || a[0] - b[0]);
	if (fitting.length > 0) return fitting[0][1].slice(0, count).map((seat) => seat.id);

	const result: string[] = [];
	tables
		.sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
		.forEach(([, seats]) => seats.forEach((seat) => result.length < count && result.push(seat.id)));
	return result;
}
