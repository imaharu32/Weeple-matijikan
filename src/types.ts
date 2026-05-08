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

export type Seat = {
	id: string;
	tableNumber: number; // テーブル番号
	capacity: number; // 座席数
	insideId?: string; // 現在座っているInside ID
};

/**
 * 1人単位の座席（新しい座席管理システム）
 * 6人席を6個の1人単位座席に分割して管理
 */
export type UnitSeat = {
	id: string; // "table_1_0" のような形（一意）
	tableNumber: number; // 1-6（6人席 6個のテーブル番号）
	seatIndex: number; // 0-5（テーブル内の座席インデックス）
	occupiedByInsideId?: string; // 現在使用中の Inside ID（null なら空席）
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
	enterAt?: string; // ISO - optional if not available
	exitAt: string; // ISO - when removed/checked out
	seats: SeatDetail[]; // 座席詳細情報
};

export type Settings = {
	maxCapacity: number;
	seats?: Seat[];
};

export type AppState = {
	queue: Party[];
	inside: Inside[];
	courses: Course[];
	history?: HistoryEntry[];
	settings: Settings;
	unitSeats?: UnitSeat[];
};
