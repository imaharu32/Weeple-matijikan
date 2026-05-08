import { AppState, UnitSeat } from './types';

const STORAGE_KEY = 'matijikan_state_v1';

const defaultCourses = [
	{ id: 'c30', name: '30分コース', minutes: 30 },
	{ id: 'c60', name: '60分コース', minutes: 60 },
];

const defaultSettings = {
	maxCapacity: 20,
};

/**
 * 6人席6個 = 36個の1人単位座席を初期生成
 */
function generateDefaultUnitSeats(): UnitSeat[] {
	const seats: UnitSeat[] = [];
	for (let tableNum = 1; tableNum <= 6; tableNum++) {
		for (let seatIdx = 0; seatIdx < 6; seatIdx++) {
			seats.push({
				id: `table_${tableNum}_${seatIdx}`,
				tableNumber: tableNum,
				seatIndex: seatIdx,
				occupiedByInsideId: undefined,
			});
		}
	}
	return seats;
}

export function loadState(): AppState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			const initial: AppState = {
				queue: [],
				inside: [],
				courses: defaultCourses,
				history: [],
				settings: defaultSettings,
				unitSeats: generateDefaultUnitSeats(),
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
			return initial;
		}
		const parsed = JSON.parse(raw) as Partial<AppState>;
		const state: AppState = {
			queue: parsed.queue ?? [],
			inside: parsed.inside ?? [],
			courses: parsed.courses ?? defaultCourses,
			history: parsed.history ?? [],
			settings: parsed.settings ?? defaultSettings,
			unitSeats: parsed.unitSeats ?? generateDefaultUnitSeats(),
		};
		return state;
	} catch {
		const initial: AppState = {
			queue: [],
			inside: [],
			courses: defaultCourses,
			history: [],
			settings: defaultSettings,
			unitSeats: generateDefaultUnitSeats(),
		};
		return initial;
	}
}

export function saveState(state: AppState) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
