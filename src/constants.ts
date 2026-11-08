import { Course, UnitSeat } from './types';

/** 接続する店舗。開発時は .env.development で dev_shop に切り替わる */
export const SHOP_ID = import.meta.env.REACT_APP_SHOP_ID || 'default_shop';

export const COURSES: Course[] = [
	{ id: 'c30', name: '30分コース', minutes: 30 },
	{ id: 'c60', name: '60分コース', minutes: 60 },
];

/** 入店時の退店予定 = コース時間 + この分数 */
export const EXIT_BUFFER_MINUTES = 15;

/** 履歴は直近この日数分だけ読み込む（それより古いデータは Firestore に残る） */
export const HISTORY_DAYS = 30;

const TABLE_COUNT = 6;
const SEATS_PER_TABLE = 6;

/** 店舗収容人数（6人席 × 6 = 36人） */
export const MAX_CAPACITY = TABLE_COUNT * SEATS_PER_TABLE;

/** 1人単位の座席（6人テーブル × 6） */
export const UNIT_SEATS: UnitSeat[] = Array.from({ length: TABLE_COUNT }, (_, t) =>
	Array.from({ length: SEATS_PER_TABLE }, (_, s) => ({
		id: `table_${t + 1}_${s}`,
		tableNumber: t + 1,
		seatIndex: s,
	}))
).flat();
