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

/*
 * ===== 座席の配置 =====
 * 配置が変わったら、ここの数字を書き換える（座席図・席選び・待ち時間の計算がまとめて切り替わる）。
 * - テーブルは TABLE_COLUMNS 列で並び、番号は左上から 1, 2 / 3, 4 / 5, 6 …
 * - 各テーブルの席は左右に半分ずつ並ぶ。席番号は上の段から「1 2」「3 4」…（左が奇数、右が偶数）
 * - 座席図の右上に入口、一番下にボードゲーム棚を表示する（RoomDiagram）
 * - テーブル数が列数で割り切れないときは、最後の段の左から詰めて並ぶ（今は 1 2 / 3 4 / 5）
 *
 * 注意: 席は "table_{テーブル番号}_{0始まりの席番号}" という id で店内の組に記録される。
 * 席数を減らすと、なくなった席に座っている組が座席図に出なくなるので、店内に組がいないときに切り替える。
 */
export const TABLE_COUNT = 5;
export const SEATS_PER_TABLE = 4;
export const TABLE_COLUMNS = 2;

/** 店舗の全席数（4人席 × 5 = 20席） */
export const MAX_CAPACITY = TABLE_COUNT * SEATS_PER_TABLE;

/** 1人単位の座席 */
export const UNIT_SEATS: UnitSeat[] = Array.from({ length: TABLE_COUNT }, (_, t) =>
	Array.from({ length: SEATS_PER_TABLE }, (_, s) => ({
		id: `table_${t + 1}_${s}`,
		tableNumber: t + 1,
		seatIndex: s,
	}))
).flat();
