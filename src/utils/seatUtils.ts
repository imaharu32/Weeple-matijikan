/**
 * 座席まわりのユーティリティ
 */

import { DEFAULT_SEATS_RANGE_PER_PARTY_SIZE } from '../constants';
import { Inside, SeatsRange, SeatsRangePerPartySize, UnitSeat } from '../types';

const MAX_SEATS_PER_TABLE = 6;

/**
 * テーブルの座席状況（UI表示用）
 */
export type TableSeatInfo = {
	id: string;
	seatIndex: number;
	occupiedByInsideId?: string;
	occupantSize?: number; // 座っている組の人数（複数座席は1つのInsideで共有）
	remainingMinutes?: number; // 残り滞在時間
};

export function getTableSeatsInfo(
	tableNumber: number,
	unitSeats: UnitSeat[],
	inside: Inside[]
): TableSeatInfo[] {
	const tableSeats = unitSeats
		.filter((s) => s.tableNumber === tableNumber)
		.sort((a, b) => a.seatIndex - b.seatIndex);

	return tableSeats.map((seat) => {
		const info: TableSeatInfo = {
			id: seat.id,
			seatIndex: seat.seatIndex,
		};

		const insideUsingThisSeat = inside.find((insideEntry) =>
			insideEntry.seats?.some((s) => s.id === seat.id)
		);

		if (insideUsingThisSeat) {
			info.occupiedByInsideId = insideUsingThisSeat.id;
			info.occupantSize = insideUsingThisSeat.size;
			const remainMs = Math.max(0, new Date(insideUsingThisSeat.exitAt).getTime() - Date.now());
			info.remainingMinutes = Math.ceil(remainMs / 60000);
		}

		return info;
	});
}

/**
 * 人数に対して使える席数の範囲を返す
 * @param seatsRangePerPartySize - 人数ごとのルール（省略時は初期ルール）
 */
export function getSeatsRangeForPartySize(
	partySize: number,
	seatsRangePerPartySize: SeatsRangePerPartySize = DEFAULT_SEATS_RANGE_PER_PARTY_SIZE
): SeatsRange {
	const range = seatsRangePerPartySize[partySize];
	if (range) {
		return {
			min: Math.max(1, range.min),
			max: Math.min(MAX_SEATS_PER_TABLE, range.max),
		};
	}

	// ルールがなければ、人数〜人数+2席
	return {
		min: Math.max(1, partySize),
		max: Math.min(MAX_SEATS_PER_TABLE, partySize + 2),
	};
}

/**
 * Firestore から読んだ座席ルールを検証する。
 * 形が正しくない人数の分は初期ルールで補い、何も使えなければ null を返す。
 */
export function parseSeatsRangePerPartySize(data: unknown): SeatsRangePerPartySize | null {
	if (!data || typeof data !== 'object') return null;

	const result: SeatsRangePerPartySize = { ...DEFAULT_SEATS_RANGE_PER_PARTY_SIZE };
	let found = false;

	for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
		const partySize = Number(key);
		if (!Number.isInteger(partySize) || partySize < 1) continue;
		if (!value || typeof value !== 'object') continue;
		const { min, max } = value as Record<string, unknown>;
		if (typeof min !== 'number' || typeof max !== 'number' || min < 1 || max < min) continue;
		result[partySize] = { min, max };
		found = true;
	}

	return found ? result : null;
}
