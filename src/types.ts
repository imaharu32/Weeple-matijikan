export type Party = {
	id: string;
	size: number;
	note?: string;
	joinAt: string; // ISO
};

export type SeatDetail = {
	id: string; // "table_1_0"
	tableNumber: number; // 1-6
	seatIndex: number; // 0-5
};

export type Inside = {
	id: string;
	size: number;
	note?: string;
	courseId: string;
	enterAt: string; // ISO
	exitAt: string; // ISO
	seats: SeatDetail[]; // 座席詳細情報
};

/**
 * 1人単位の座席（6人テーブルを6つの席に分けて扱う）
 */
export type UnitSeat = {
	id: string; // "table_1_0" のような形（一意）
	tableNumber: number; // 1-6
	seatIndex: number; // 0-5
	occupiedByInsideId?: string; // 使用中の Inside ID
};

export type Course = {
	id: string;
	name: string;
	minutes: number;
};

export type HistoryEntry = {
	id: string;
	size: number;
	note?: string;
	courseId?: string;
	enterAt?: string; // ISO
	exitAt: string; // ISO - 退店（または削除）した時刻
	seats: SeatDetail[];
};

export type SeatsRange = { min: number; max: number };

/**
 * 人数ごとに使う席数の範囲
 * 例: { 1: { min: 1, max: 2 }, 2: { min: 2, max: 4 }, ... }
 */
export type SeatsRangePerPartySize = Record<number, SeatsRange>;
