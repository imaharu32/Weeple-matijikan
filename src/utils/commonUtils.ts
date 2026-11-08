/**
 * 共通ユーティリティ関数
 */

export function uid(prefix = ''): string {
	return prefix + Math.random().toString(36).slice(2, 9);
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function addMinutesISO(baseIso: string, minutes: number): string {
	return new Date(
		new Date(baseIso).getTime() + minutes * 60 * 1000
	).toISOString();
}

export function toLocaleTimeString(iso: string): string {
	return new Date(iso).toLocaleTimeString();
}

export function toLocaleString(iso: string): string {
	return new Date(iso).toLocaleString();
}

export function getTimeMs(iso: string): number {
	return new Date(iso).getTime();
}

export function getRemainingMinutes(endIso: string): number {
	const now = Date.now();
	const endMs = getTimeMs(endIso);
	const remainMs = Math.max(0, endMs - now);
	return Math.ceil(remainMs / 60000);
}

/** 指定時刻までの分数（過ぎていればマイナス） */
export function minutesUntil(iso: string, now = Date.now()): number {
	const diff = new Date(iso).getTime() - now;
	return diff >= 0 ? Math.ceil(diff / 60000) : -Math.ceil(-diff / 60000);
}

/** 経過分数（0以上） */
export function minutesSince(iso: string, now = Date.now()): number {
	return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

/** "13:05" のような時刻表示 */
export function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export type RemainingStatus = { minutes: number; label: string; tone: 'danger' | 'warning' | 'normal' };

/** 退店予定までの残り時間と、その表示（10分以下は注意、過ぎたら超過） */
export function remainingStatus(exitAt: string, now = Date.now()): RemainingStatus {
	const minutes = minutesUntil(exitAt, now);
	if (minutes < 0) return { minutes, label: `${-minutes}分超過`, tone: 'danger' };
	if (minutes <= 10) return { minutes, label: `残り${minutes}分`, tone: 'warning' };
	return { minutes, label: `残り${minutes}分`, tone: 'normal' };
}

/** 席の表示（例: "テーブル1（2席）"、"テーブル1・2（4席）"） */
export function describeSeats(seats: { tableNumber: number }[]): string {
	if (!seats || seats.length === 0) return '席なし';
	const tables = Array.from(new Set(seats.map((seat) => seat.tableNumber))).sort((a, b) => a - b);
	return `テーブル${tables.join('・')}（${seats.length}席）`;
}

/** 入店から退店予定までのうち、どれだけ過ぎたか（0〜1） */
export function elapsedRatio(enterAt: string, exitAt: string, now = Date.now()): number {
	const start = new Date(enterAt).getTime();
	const total = new Date(exitAt).getTime() - start;
	if (total <= 0) return 1;
	return Math.min(1, Math.max(0, (now - start) / total));
}
