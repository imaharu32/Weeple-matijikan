export type Party = {
	id: string;
	size: number;
	note?: string;
	joinAt: string; // ISO
};

export type Inside = {
	id: string;
	size: number;
	note?: string;
	courseId: string;
	enterAt: string; // ISO
	exitAt: string; // ISO
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
};

export type Settings = {
	maxCapacity: number;
};

export type AppState = {
	queue: Party[];
	inside: Inside[];
	courses: Course[];
	history?: HistoryEntry[];
	settings: Settings;
};
