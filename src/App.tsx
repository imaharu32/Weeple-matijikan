import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Party, Inside, Course } from './types';
import { loadState, saveState } from './storage';
import AddForm from './components/AddForm';
import QueueList from './components/QueueList';
import InsideList from './components/InsideList';

function uid(prefix = '') {
	return prefix + Math.random().toString(36).slice(2, 9);
}

function nowIso() {
	return new Date().toISOString();
}

function addMinutesISO(baseIso: string, minutes: number) {
	return new Date(new Date(baseIso).getTime() + minutes * 60 * 1000).toISOString();
}

function estimateQueueEntryMinutes(
	queue: Party[],
	inside: Inside[],
	maxCapacity: number,
	courses: Course[]
): Record<string, number> {
	const now = Date.now();
	// exit events from current inside (time asc)
	const exitEvents = inside
		.map((i) => ({ time: new Date(i.exitAt).getTime(), size: i.size }))
		.sort((a, b) => a.time - b.time);

	// initial inside total
	const totalInsideInitial = inside.reduce((s, i) => s + i.size, 0);

	// average course minutes to assume for queued parties
	const avgCourse =
		courses && courses.length > 0 ? Math.round(courses.reduce((s, c) => s + c.minutes, 0) / courses.length) : 30;
	const assumedStay = avgCourse + 7 * 1; // +7分

	// scheduled entries: assignedTime + exitTime + size
	const scheduled: { assign: number; exit: number; size: number; id: string }[] = [];

	// time points to consider: now + exit events (initial) + scheduled assign/exit times (dynamic)
	let timePoints = [now, ...exitEvents.map((e) => e.time)].filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

	const estimates: Record<string, number> = {};

	// FIFO 保証：次の組はこの時刻より前に割り当てない
	let minAllowedTime = now;

	for (const party of queue) {
		let assignedTime: number | null = null;

		// iterate timePoints; timePoints can grow when we add scheduled exits
		for (let ti = 0; ti < timePoints.length; ti++) {
			const t = timePoints[ti];
			if (t < minAllowedTime) continue;

			// base occupancy from initial inside minus initial exits up to t
			const freedByExits = exitEvents.filter((e) => e.time <= t).reduce((s, e) => s + e.size, 0);
			const baseOccupancy = Math.max(0, totalInsideInitial - freedByExits);

			// occupancy contributed by scheduled entries that are active at time t
			const scheduledOcc = scheduled
				.filter((s) => s.assign <= t && s.exit > t)
				.reduce((s, e) => s + e.size, 0);

			const occupiedAtT = baseOccupancy + scheduledOcc;
			const availableAtT = maxCapacity - occupiedAtT;

			if (availableAtT >= party.size) {
				assignedTime = t;
				break;
			}
		}

		if (assignedTime === null) {
			const last = timePoints.length > 0 ? timePoints[timePoints.length - 1] : now;
			assignedTime = Math.max(last, minAllowedTime, now);
		}

		// compute exit for this scheduled party (assume avg course + 7min)
		const exitTime = assignedTime + assumedStay * 60 * 1000;
		// add to scheduled list (affects subsequent parties)
		scheduled.push({ assign: assignedTime, exit: exitTime, size: party.size, id: party.id });

		// ensure assign and exit times are considered in timePoints
		if (!timePoints.includes(assignedTime)) timePoints.push(assignedTime);
		if (!timePoints.includes(exitTime)) timePoints.push(exitTime);
		timePoints = Array.from(new Set(timePoints)).sort((a, b) => a - b);

		// next party cannot be assigned before this party's assign time (FIFO)
		minAllowedTime = Math.max(minAllowedTime, assignedTime);

		// minutes from now
		const minutes = Math.max(0, Math.ceil((assignedTime - now) / 60000));
		estimates[party.id] = minutes;
	}

	return estimates;
}

function App() {
	const initial = loadState();
	const [queue, setQueue] = useState<Party[]>(initial.queue);
	const [inside, setInside] = useState<Inside[]>(initial.inside);
	const [courses] = useState<Course[]>(initial.courses);
	const [maxCapacity, setMaxCapacity] = useState<number>(initial.settings?.maxCapacity ?? 20);
	const [showAddModal, setShowAddModal] = useState(false);
	// 履歴（退店した人の記録）
	const [history, setHistory] = useState(() => initial.history ?? []);
	const [showHistoryModal, setShowHistoryModal] = useState(false);

	// 右上プレビュー用：人数入力（空文字は未入力）
	const [previewSize, setPreviewSize] = useState<number | ''>('');

	// 追加：新しく並んだ場合の見込みを計算するユーティリティ（previewEstimate で先に使うためここで定義）
	const estimateForNewParty = (size: number) => {
		const fake = { id: '__tmp', size, note: '', joinAt: nowIso() } as Party;
		const mergedQueue = [...queue, fake];
		const est = estimateQueueEntryMinutes(mergedQueue, inside, maxCapacity, courses);
		return est['__tmp'] ?? 0;
	};

	// 新しく並んだ場合の見込み計算は既存の estimateForNewParty を利用（下で定義済み）
	// previewEstimate は入力がある場合のみ表示
	const previewEstimate = previewSize ? estimateForNewParty(Number(previewSize)) : null;

	// persist whenever relevant state changes (queue / inside / courses / settings / history)
	useEffect(() => {
		saveState({ queue, inside, courses, history, settings: { maxCapacity } } as any);
	}, [queue, inside, courses, maxCapacity, history]);

	// 退店（履歴に記録して店内から削除）
	const handleCheckout = (id: string) => {
		const item = inside.find((i) => i.id === id);
		if (!item) return;
		const entry = {
			id: `h_${Math.random().toString(36).slice(2, 9)}`,
			size: item.size,
			note: item.note,
			courseId: item.courseId,
			enterAt: item.enterAt,
			exitAt: nowIso(),
		};
		setHistory((s) => [entry, ...s]);
		setInside((s) => s.filter((x) => x.id !== id));
	};

	// 削除（履歴を残さず店内から削除）
	const handleDeleteInside = (id: string) => {
		setInside((s) => s.filter((x) => x.id !== id));
	};

	const handleAdd = (size: number, note?: string) => {
		const p: Party = { id: uid('q_'), size, note, joinAt: nowIso() };
		setQueue((s) => [...s, p]);
	};

	const handleRemoveParty = (partyId: string) => {
		setQueue((s) => s.filter((p) => p.id !== partyId));
	};

	const handleEnter = (partyId: string, courseId: string) => {
		const party = queue.find((p) => p.id === partyId);
		const course = courses.find((c) => c.id === courseId);
		if (!party || !course) return;
		const enterAt = nowIso();
		const exitAt = addMinutesISO(enterAt, course.minutes + 7); // +7分
		const ins = {
			id: uid('in_'),
			size: party.size,
			note: party.note,
			courseId,
			enterAt,
			exitAt,
		};
		setInside((s) => [...s, ins]);
		setQueue((s) => s.filter((p) => p.id !== partyId));
	};

	// estimates memoized (pass courses so queued parties' assumed exits affect later estimates)
	const estimates = useMemo(
		() => estimateQueueEntryMinutes(queue, inside, maxCapacity, courses),
		[queue, inside, maxCapacity, courses]
	);

	return (
		<div className="App" style={{ padding: 16 }}>
			<header className="app-header">
				<h1>待ち時間管理　ボドゲカフェWeeple</h1>

				{/* 右上操作：履歴モーダル表示ボタン */}
				<button className="add-button" style={{ right: 140 }} onClick={() => setShowHistoryModal(true)}>
					履歴
				</button>

				<button className="add-button" onClick={() => setShowAddModal(true)}>
					新しく並ぶ
				</button>

				{/* add-button の下にプレーンな推定テキストを表示（ボタン的ではなく普通の文字） */}
				<div className="header-preview-estimate">
					{previewSize === '' ? '入店見込み：—' : `入店見込み 約${previewEstimate}分`}
				</div>

				{/* 入店見込みの下にプレーンな人数入力欄を配置（入力欄の右に「人数」テキスト） */}
				<div className="header-preview-count">
					<input
						type="number"
						min={1}
						value={previewSize === '' ? '' : previewSize}
						onChange={(e) => {
							const v = e.target.value;
							setPreviewSize(v === '' ? '' : Math.max(1, Number(v)));
						}}
						className="header-count-input"
						placeholder="人数を入力"
					/>
					<span className="header-count-label">人数</span>
				</div>
			</header>

			{/* settings: max capacity */}
			<section style={{ marginBottom: 12 }}>
				<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<span>店舗収容人数：</span>
					<input
						type="number"
						value={maxCapacity}
						min={1}
						onChange={(e) => setMaxCapacity(Math.max(1, Number(e.target.value) || 1))}
						style={{ width: 100, padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
					/>
					<span style={{ color: '#666', fontSize: 13 }}>（この人数を基に待ち時間を推定）</span>
				</label>
			</section>

			{/* 画面いっぱいに左右2カラム表示（左: 列 / 右: 店内） */}
			<div className="main-columns">
				{/* 左カラム：列 */}
				<div className="column left-column">
					<QueueList
						queue={queue}
						courses={courses}
						onEnter={handleEnter}
						onRemove={handleRemoveParty}
						estimates={estimates}
					/>
				</div>

				{/* 右カラム：店内 */}
				<div className="column right-column">
					<InsideList inside={inside} courses={courses} onCheckout={handleCheckout} onDelete={handleDeleteInside} />
				</div>
			</div>

			{/* 履歴モーダル */}
			{showHistoryModal && (
				<div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>退店履歴</h3>
						{history.length === 0 ? (
							<p>履歴はありません</p>
						) : (
							<ul style={{ listStyle: 'none', padding: 0 }}>
								{history.map((h) => {
									const course = courses.find((c) => c.id === h.courseId);
									return (
										<li key={h.id} className="card">
											<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
												<div>
													<div style={{ fontWeight: 700 }}>{h.size}名 {h.note ? `- ${h.note}` : ''}</div>
													<div style={{ color: '#666', fontSize: 13 }}>
														{course ? course.name : (h.courseId ?? 'コース未設定')}
														{' '}／ 退店: {new Date(h.exitAt).toLocaleString()}
													</div>
												</div>
												<div>
													<button className="secondary" onClick={() => {
														// 履歴から削除（確認はUIに追加しても良い）
														setHistory((s) => s.filter(x => x.id !== h.id));
													}}>削除</button>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						)}
						<div style={{ textAlign: 'right', marginTop: 12 }}>
							<button className="secondary" onClick={() => setShowHistoryModal(false)}>閉じる</button>
						</div>
					</div>
				</div>
			)}

			{/* モーダル化した新規追加フォーム（ボタンで開く） */}
			{showAddModal && (
				<div className="modal-overlay" onClick={() => setShowAddModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>新しく並ぶ</h3>
						<AddForm
							onAdd={handleAdd}
							getEstimate={(size) => {
								const fake = { id: '__tmp', size, note: '', joinAt: nowIso() } as Party;
								const mergedQueue = [...queue, fake];
								const est = estimateQueueEntryMinutes(mergedQueue, inside, maxCapacity, courses);
								return est['__tmp'] ?? 0;
							}}
							onAfterAdd={() => setShowAddModal(false)}
						/>
						<div style={{ textAlign: 'right', marginTop: 8 }}>
							<button className="secondary" onClick={() => setShowAddModal(false)}>
								閉じる
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
