import { Inside, Party, SeatDetail } from '../types';
import { COURSES as courses, DEFAULT_SEATS_RANGE_PER_PARTY_SIZE, UNIT_SEATS as unitSeats } from '../constants';
import {
	addMinutesISO,
	estimateForNewParty,
	estimateWaitingTimeWithSeats,
	getSeatsRangeForPartySize,
	groupHistoryByDate,
	parseSeatsRangePerPartySize,
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

describe('getSeatsRangeForPartySize', () => {
	test('ルール未指定ならデフォルトの座席範囲を使う', () => {
		expect(getSeatsRangeForPartySize(2)).toEqual({ min: 2, max: 4 });
	});

	test('カスタムルールは 1〜6 席の範囲に収める', () => {
		expect(getSeatsRangeForPartySize(3, { 3: { min: 0, max: 9 } })).toEqual({ min: 1, max: 6 });
	});
});

describe('UNIT_SEATS', () => {
	test('6テーブル × 6席 = 36席で、id が重ならない', () => {
		expect(unitSeats).toHaveLength(36);
		expect(new Set(unitSeats.map((s) => s.id)).size).toBe(36);
	});
});

describe('parseSeatsRangePerPartySize', () => {
	test('Firestore の map（キーは文字列）を人数ごとのルールに変換する', () => {
		const result = parseSeatsRangePerPartySize({ '2': { min: 2, max: 3 } });
		expect(result?.[2]).toEqual({ min: 2, max: 3 });
		// 保存されていない人数は初期ルールで補う
		expect(result?.[1]).toEqual(DEFAULT_SEATS_RANGE_PER_PARTY_SIZE[1]);
	});

	test('形が正しくない値は無視する', () => {
		const result = parseSeatsRangePerPartySize({ '2': { min: 4, max: 2 }, '3': { min: 3, max: 5 }, x: { min: 1, max: 1 } });
		expect(result?.[2]).toEqual(DEFAULT_SEATS_RANGE_PER_PARTY_SIZE[2]);
		expect(result?.[3]).toEqual({ min: 3, max: 5 });
	});

	test('未保存・空なら null', () => {
		expect(parseSeatsRangePerPartySize(undefined)).toBeNull();
		expect(parseSeatsRangePerPartySize({})).toBeNull();
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
