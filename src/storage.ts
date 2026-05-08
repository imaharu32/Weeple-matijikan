import { AppState, UnitSeat } from './types';

export const defaultCourses = [
	{ id: 'c30', name: '30分コース', minutes: 30 },
	{ id: 'c60', name: '60分コース', minutes: 60 },
];

export const defaultSettings = {
	maxCapacity: 20,
};

/**
 * 6人席6個 = 36個の1人単位座席を初期生成
 */
export function generateDefaultUnitSeats(): UnitSeat[] {
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

/**
 * デフォルト状態を返す（Firestore同期の初期値用）
 */
export function getDefaultState(): AppState {
	return {
		queue: [],
		inside: [],
		courses: defaultCourses,
		history: [],
		settings: defaultSettings,
		unitSeats: generateDefaultUnitSeats(),
	};
}
