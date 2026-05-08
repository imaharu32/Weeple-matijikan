/**
 * 座席管理ユーティリティ
 * 1人単位の座席割当・解放・検索を管理
 */

import { UnitSeat, Inside } from '../types';

/**
 * 指定したテーブル内で、連続した N 個の空き座席を見つける
 * @param tableNumber - テーブル番号（1-6）
 * @param count - 必要な座席数（1-6）
 * @param unitSeats - 全座席リスト
 * @returns 見つかったら座席インデックスの開始位置、見つからなければ -1
 */
export function findConsecutiveEmptySeatsInTable(
	tableNumber: number,
	count: number,
	unitSeats: UnitSeat[]
): number {
	if (count < 1 || count > 6) return -1;

	// 該当テーブルの座席を取得（seatIndex 順）
	const tableSeats = unitSeats
		.filter((s) => s.tableNumber === tableNumber)
		.sort((a, b) => a.seatIndex - b.seatIndex);

	// 連続した count 個の空き座席を探す
	for (let i = 0; i <= 6 - count; i++) {
		const consecutive = tableSeats.slice(i, i + count);
		if (consecutive.every((s) => !s.occupiedByInsideId)) {
			return i; // 見つかった
		}
	}
	return -1; // 見つからない
}

/**
 * 指定したテーブルの連続した座席にパーティを割当
 * @param tableNumber - テーブル番号（1-6）
 * @param startSeatIndex - 開始座席インデックス（0-5）
 * @param count - 座席数（1-6）
 * @param insideId - 割当先の Inside ID
 * @param unitSeats - 全座席リスト（更新されます）
 * @returns 割当済みの座席リスト
 */
export function assignSeatsToParty(
	tableNumber: number,
	startSeatIndex: number,
	count: number,
	insideId: string,
	unitSeats: UnitSeat[]
): UnitSeat[] {
	const assigned: UnitSeat[] = [];

	unitSeats.forEach((seat) => {
		if (
			seat.tableNumber === tableNumber &&
			seat.seatIndex >= startSeatIndex &&
			seat.seatIndex < startSeatIndex + count
		) {
			seat.occupiedByInsideId = insideId;
			assigned.push(seat);
		}
	});

	return assigned;
}

/**
 * 複数座席を任意に割り当てる（テーブルを跨いでも可）
 * @param seatIds - 割り当てる座席の id リスト
 */
export function assignMultipleSeats(seatIds: string[], insideId: string, unitSeats: UnitSeat[]): UnitSeat[] {
	const assigned: UnitSeat[] = [];
	const idSet = new Set(seatIds);
	unitSeats.forEach((seat) => {
		if (idSet.has(seat.id)) {
			seat.occupiedByInsideId = insideId;
			assigned.push(seat);
		}
	});
	return assigned;
}

/**
 * パーティが占有している座席を全て解放
 * @param insideId - Inside ID
 * @param unitSeats - 全座席リスト（更新されます）
 */
export function releaseSeatsOfParty(insideId: string, unitSeats: UnitSeat[]): void {
	unitSeats.forEach((seat) => {
		if (seat.occupiedByInsideId === insideId) {
			seat.occupiedByInsideId = undefined;
		}
	});
}

/**
 * テーブル内で割当可能な最小座席インデックスを探す
 * @param tableNumber
 * @param count - 必要な座席数
 * @param unitSeats
 * @returns インデックス（見つからなければ -1）
 */
export function findFirstAvailableSeatsInTable(
	tableNumber: number,
	count: number,
	unitSeats: UnitSeat[]
): number {
	return findConsecutiveEmptySeatsInTable(tableNumber, count, unitSeats);
}

/**
 * 全テーブルをスキャンして、最初に割当可能なテーブルを見つける
 * @param count - 必要な座席数
 * @param unitSeats
 * @returns { tableNumber, seatIndex } または null
 */
export function findAvailableTable(
	count: number,
	unitSeats: UnitSeat[]
): { tableNumber: number; seatIndex: number } | null {
	for (let tableNum = 1; tableNum <= 6; tableNum++) {
		const seatIndex = findConsecutiveEmptySeatsInTable(tableNum, count, unitSeats);
		if (seatIndex >= 0) {
			return { tableNumber: tableNum, seatIndex };
		}
	}
	return null;
}

/**
 * テーブルの座席状況を取得（UI表示用）
 * @param tableNumber
 * @param unitSeats
 * @param inside - Inside リスト（滞在時間計算用）
 * @returns テーブル内の座席情報
 */
export type TableSeatInfo = {
	id: string;
	seatIndex: number;
	occupiedByInsideId?: string;
	occupantSize?: number; // 座席グループの人数（複数座席は1つのInsideで共有）
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
			occupiedByInsideId: seat.occupiedByInsideId,
		};

		if (seat.occupiedByInsideId) {
			const insideData = inside.find((i) => i.id === seat.occupiedByInsideId);
			if (insideData) {
				info.occupantSize = insideData.size;
				const now = Date.now();
				const exitMs = new Date(insideData.exitAt).getTime();
				const remainMs = Math.max(0, exitMs - now);
				info.remainingMinutes = Math.ceil(remainMs / 60000);
			}
		}

		return info;
	});
}

/**
 * 特定のInsideが使用している座席スパンを取得
 * @param insideId
 * @param unitSeats
 * @returns { tableNumber, startSeatIndex, count }
 */
export function getSeatsOccupiedByInside(
	insideId: string,
	unitSeats: UnitSeat[]
): { tableNumber: number; startSeatIndex: number; count: number } | null {
	const occupied = unitSeats.filter((s) => s.occupiedByInsideId === insideId);
	if (occupied.length === 0) return null;

	const table = occupied[0].tableNumber;
	const indices = occupied.map((s) => s.seatIndex).sort((a, b) => a - b);
	const start = indices[0];
	const count = indices.length;

	return { tableNumber: table, startSeatIndex: start, count };
}
