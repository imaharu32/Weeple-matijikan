import { Inside, Party, SeatDetail } from '../types';
import { COURSES as courses, UNIT_SEATS as unitSeats } from '../constants';
import {
	addMinutesISO,
	buildGroupColorMap,
	describeSeats,
	estimateForNewParty,
	estimateWaitingTimeWithSeats,
	getOccupiedSeatIds,
	groupHistoryByDate,
	remainingStatus,
	suggestSeats,
} from './index';

const NOW = new Date('2026-05-16T10:00:00Z');

const seats = (count: number): SeatDetail[] =>
	Array.from({ length: count }, (_, i) => ({ id: `s${i}`, tableNumber: 1, seatIndex: i }));

const insideParty = (id: string, seatCount: number, exitInMinutes: number): Inside => ({
	id,
	size: seatCount,
	courseId: 'c30',
	enterAt: NOW.toISOString(),
	exitAt: addMinutesISO(NOW.toISOString(), exitInMinutes),
	seats: seats(seatCount),
});

const party = (id: string, size: number): Party => ({ id, size, joinAt: NOW.toISOString() });

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('addMinutesISO', () => {
	test('指定した分数だけ進んだ ISO 文字列を返す', () => {
		expect(addMinutesISO('2026-05-16T10:00:00.000Z', 15)).toBe('2026-05-16T10:15:00.000Z');
	});
});

describe('groupHistoryByDate', () => {
	test('ローカル日付ごとにまとめ、新しい日付が先に来る', () => {
		const day1 = new Date(2026, 4, 15, 12, 0).toISOString();
		const day2a = new Date(2026, 4, 16, 9, 0).toISOString();
		const day2b = new Date(2026, 4, 16, 18, 0).toISOString();

		const { keys, map } = groupHistoryByDate([{ exitAt: day1 }, { exitAt: day2a }, { exitAt: day2b }]);

		expect(keys).toEqual(['2026-05-16', '2026-05-15']);
		expect(map.get('2026-05-16')).toHaveLength(2);
		expect(map.get('2026-05-15')).toHaveLength(1);
	});
});

describe('UNIT_SEATS', () => {
	test('6テーブル × 6席 = 36席で、id が重ならない', () => {
		expect(unitSeats).toHaveLength(36);
		expect(new Set(unitSeats.map((s) => s.id)).size).toBe(36);
	});
});

describe('suggestSeats', () => {
	const occupiedOf = (inside: Inside[]) => getOccupiedSeatIds(inside);

	test('1つのテーブルに収まるなら、ちょうど収まるテーブルの席を番号順に選ぶ', () => {
		// テーブル1は残り2席、ほかは全部空き → 2名ならテーブル1の残り2席
		const inside = [{ ...insideParty('i1', 4, 30), seats: [0, 1, 2, 3].map((i) => ({ id: `table_1_${i}`, tableNumber: 1, seatIndex: i })) }];
		expect(suggestSeats(2, unitSeats, occupiedOf(inside))).toEqual(['table_1_4', 'table_1_5']);
	});

	test('どのテーブルにも収まらなければ、空きの多いテーブルから順に埋める', () => {
		const result = suggestSeats(8, unitSeats, new Set());
		expect(result).toHaveLength(8);
		expect(result.slice(0, 6)).toEqual([0, 1, 2, 3, 4, 5].map((i) => `table_1_${i}`));
	});

	test('空席が足りなければ、選べた分だけ返す', () => {
		const allButOne = new Set(unitSeats.slice(1).map((s) => s.id));
		expect(suggestSeats(3, unitSeats, allButOne)).toEqual([unitSeats[0].id]);
	});

	test('席を変更するときは、その組の席を空席として扱える', () => {
		const inside = [insideParty('i1', 6, 30)];
		expect(getOccupiedSeatIds(inside).size).toBe(6);
		expect(getOccupiedSeatIds(inside, 'i1').size).toBe(0);
	});
});

describe('remainingStatus', () => {
	test('10分より多ければ通常、10分以下は注意、過ぎたら超過', () => {
		expect(remainingStatus(addMinutesISO(NOW.toISOString(), 25))).toEqual({ minutes: 25, label: '残り25分', tone: 'normal' });
		expect(remainingStatus(addMinutesISO(NOW.toISOString(), 10)).tone).toBe('warning');
		expect(remainingStatus(addMinutesISO(NOW.toISOString(), -6))).toEqual({ minutes: -6, label: '6分超過', tone: 'danger' });
	});
});

describe('describeSeats', () => {
	test('テーブル番号と席数をまとめて表示する', () => {
		expect(describeSeats([{ tableNumber: 2 }, { tableNumber: 2 }])).toBe('テーブル2（2席）');
		expect(describeSeats([{ tableNumber: 3 }, { tableNumber: 1 }, { tableNumber: 1 }])).toBe('テーブル1・3（3席）');
	});
});

describe('buildGroupColorMap', () => {
	test('同時にいる組には別々の色を割り当てる（8組まで）', () => {
		const inside = Array.from({ length: 8 }, (_, i) => insideParty(`group_${i}`, 1, 30));
		const colors = new Set(Array.from(buildGroupColorMap(inside).values()).map((c) => c.bg));
		expect(colors.size).toBe(8);
	});
});

describe('estimateWaitingTimeWithSeats', () => {
	test('空席があればすぐ入れる', () => {
		const result = estimateWaitingTimeWithSeats([party('p1', 2)], [], unitSeats, courses);
		expect(result).toEqual({ p1: 0 });
	});

	test('満席なら最初に空く時刻まで待つ', () => {
		const inside = [insideParty('i1', 36, 20)];
		const result = estimateWaitingTimeWithSeats([party('p1', 2), party('p2', 2)], inside, unitSeats, courses);
		expect(result).toEqual({ p1: 20, p2: 20 });
	});

	test('前の組が残りの席を使うと、次の組は最短コース分あとになる', () => {
		const inside = [insideParty('i1', 34, 45)]; // 残り2席
		const result = estimateWaitingTimeWithSeats([party('p1', 2), party('p2', 2)], inside, unitSeats, courses);
		// p1 は今すぐ入店 → 最短コース(30分)後に2席が空く
		expect(result).toEqual({ p1: 0, p2: 30 });
	});
});

describe('estimateForNewParty', () => {
	test('今の列の後ろに並んだ場合の見込みを返す', () => {
		const inside = [insideParty('i1', 36, 20)];
		expect(estimateForNewParty(4, [], inside, unitSeats, courses)).toBe(20);
	});
});
