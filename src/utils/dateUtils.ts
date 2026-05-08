/**
 * 日付処理ユーティリティ
 */

export function toYMD(iso: string): string {
	const d = new Date(iso);
	// ローカル日付ベースで YYYY-MM-DD を返す
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${dd}`;
}

export function humanLabelForDate(ymd: string): string {
	const today = new Date();
	const tY = today.getFullYear();
	const tM = String(today.getMonth() + 1).padStart(2, '0');
	const tD = String(today.getDate()).padStart(2, '0');
	const todayYMD = `${tY}-${tM}-${tD}`;

	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	const yY = yesterday.getFullYear();
	const yM = String(yesterday.getMonth() + 1).padStart(2, '0');
	const yD = String(yesterday.getDate()).padStart(2, '0');
	const yesterdayYMD = `${yY}-${yM}-${yD}`;

	if (ymd === todayYMD) return '今日';
	if (ymd === yesterdayYMD) return '昨日';
	return ymd;
}

export function groupHistoryByDate<T extends { exitAt: string }>(
	history: T[]
): { keys: string[]; map: Map<string, T[]> } {
	const map = new Map<string, T[]>();
	history.forEach((h) => {
		const k = toYMD(h.exitAt);
		if (!map.has(k)) map.set(k, [] as T[]);
		map.get(k)!.push(h);
	});
	// ソート（降順：新しい日付が先）
	const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
	return { keys, map };
}
