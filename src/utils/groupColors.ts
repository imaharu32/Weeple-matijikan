/**
 * 店内の組ごとの色。座席図と店内リストで同じ色を使い、どの席がどの組かを分かりやすくする。
 * 組の id から色を決めるので、ほかの組が退店しても色はほぼ変わらない（同時にいる組同士は重ならない）。
 */

import type { Inside } from '../types';

export type GroupColor = { bg: string; fg: string };

const GROUP_COLOR_COUNT = 8;

const hash = (text: string) => {
	let h = 0;
	for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
	return h;
};

export function buildGroupColorMap(inside: Inside[]): Map<string, GroupColor> {
	const map = new Map<string, GroupColor>();
	const used = new Set<number>();
	const ordered = [...inside].sort((a, b) => a.enterAt.localeCompare(b.enterAt) || a.id.localeCompare(b.id));
	for (const entry of ordered) {
		let index = hash(entry.id) % GROUP_COLOR_COUNT;
		// 同時にいる組とは重ならないようにずらす（8組を超えたら重複を許す）
		for (let tries = 0; used.has(index) && tries < GROUP_COLOR_COUNT; tries++) index = (index + 1) % GROUP_COLOR_COUNT;
		used.add(index);
		map.set(entry.id, { bg: `var(--group-${index + 1}-bg)`, fg: `var(--group-${index + 1}-fg)` });
	}
	return map;
}
