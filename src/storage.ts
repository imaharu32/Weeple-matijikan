import { AppState } from './types';

const STORAGE_KEY = 'matijikan_state_v1';

const defaultCourses = [
	{ id: 'c30', name: '30分コース', minutes: 30 },
	{ id: 'c60', name: '60分コース', minutes: 60 },
];

const defaultSettings = {
	maxCapacity: 20,
};

export function loadState(): AppState {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			const initial: AppState = { queue: [], inside: [], courses: defaultCourses, history: [], settings: defaultSettings };
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
		};
		return state;
	} catch {
		const initial: AppState = { queue: [], inside: [], courses: defaultCourses, history: [], settings: defaultSettings };
		return initial;
	}
}

export function saveState(state: AppState) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
