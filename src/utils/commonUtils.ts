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
