import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Party, Inside, Course, UnitSeat } from './types';
import { loadState, saveState } from './storage';
import AddForm from './components/AddForm';
import QueueList from './components/QueueList';
import InsideList from './components/InsideList';
import SeatView from './components/SeatView';
import SeatSelectionModal from './components/SeatSelectionModal';
import {
	addPartyToQueue,
	removePartyFromQueue,
	movePartyToInsideWithSeats,
	checkoutFromInsideWithSeats,
	listenQueue,
	listenInside,
	listenUnitSeats,
	listenHistory,
	removeInsideWithSeats,
	removeHistoryEntry,
	updatePartyInQueue,
	updateInsideEntry,
} from './services/firestoreCollections';
import {
	uid,
	nowIso,
	addMinutesISO,
	humanLabelForDate,
	groupHistoryByDate,
	estimateWaitingTimeWithSeats,
	estimateForNewParty,
	releaseSeatsOfParty,
	// assignSeatsToParty, (no longer used here)
	assignMultipleSeats,
} from './utils';
import { useErrorMessage, useModals, useMultiSelect } from './hooks';

function App() {
	const initial = loadState();
	const shopId = process.env.REACT_APP_SHOP_ID ?? 'default_shop';
	const [queue, setQueue] = useState<Party[]>(initial.queue);
	const [inside, setInside] = useState<Inside[]>(initial.inside);
	const [courses] = useState<Course[]>(initial.courses);
	const [history, setHistory] = useState(() => initial.history ?? []);
	const [unitSeats, setUnitSeats] = useState<UnitSeat[]>(initial.unitSeats ?? []);
	const [previewSize, setPreviewSize] = useState<number | ''>('');
	const FIXED_MAX_CAPACITY = 36; // 6人席 × 6 = 36人
	const [maxCapacity] = useState<number>(FIXED_MAX_CAPACITY);
	const { showAddModal, setShowAddModal, showHistoryModal, setShowHistoryModal } = useModals();
	const { message: errorMessage, setMessage: setErrorMessage } = useErrorMessage(5000);
	const selectedParties = useMultiSelect();
	const selectedInside = useMultiSelect();
	const [showSeatSelectionModal, setShowSeatSelectionModal] = useState(false);
	const [selectedPartyForSeats, setSelectedPartyForSeats] = useState<Party | null>(null);

	useEffect(() => {
		saveState({ queue, inside, courses, history, settings: { maxCapacity }, unitSeats } as any);
	}, [queue, inside, courses, history, maxCapacity, unitSeats]);

	useEffect(() => {
		const unsubQueue = listenQueue(shopId, (items) => setQueue(items));
		const unsubInside = listenInside(shopId, (items) => setInside(items));
		const unsubHistory = listenHistory(shopId, (items) => setHistory(items));
		const unsubUnitSeats = listenUnitSeats(shopId, (items) => setUnitSeats(items));
		return () => {
			try {
				unsubQueue();
			} catch {}
			try {
				unsubInside();
			} catch {}
			try {
				unsubHistory();
			} catch {}
			try {
				unsubUnitSeats();
			} catch {}
		};
	}, [shopId]);

	const handleAdd = async (size: number, note?: string) => {
		const id = uid('q_');
		const party: Party = { id, size, note: note ?? '', joinAt: nowIso() };
		setQueue((current) => [...current, party]);
		try {
			await addPartyToQueue(shopId, { size: party.size, note: party.note, joinAt: party.joinAt }, id);
		} catch (error) {
			console.error('addParty error', error);
			setErrorMessage('列への追加に失敗しました。');
		}
	};

	const handleRemoveParty = async (partyId: string) => {
		const previousQueue = queue;
		setQueue((current) => current.filter((party) => party.id !== partyId));
		try {
			await removePartyFromQueue(shopId, partyId);
		} catch (error) {
			console.error('remove party error', error);
			setQueue(previousQueue);
			setErrorMessage('列からの削除に失敗しました。');
		}
	};

	const handleUpdateParty = async (partyId: string, size: number, note: string) => {
		const previousQueue = queue;
		setQueue((current) => current.map((party) => (party.id === partyId ? { ...party, size, note } : party)));
		try {
			await updatePartyInQueue(shopId, partyId, { size, note });
		} catch (error) {
			console.error('update party error', error);
			setQueue(previousQueue);
			setErrorMessage('列の更新に失敗しました。');
		}
	};

	const handleEnter = (partyId: string) => {
		const party = queue.find((item) => item.id === partyId);
		if (!party) return;

		// 座席選択モーダルを表示
		setSelectedPartyForSeats(party);
		setShowSeatSelectionModal(true);
	};

	const handleSeatSelectionConfirm = async (courseId: string, selectedSeatIds: string[]) => {
		if (!selectedPartyForSeats) return;

		const party = selectedPartyForSeats;
		const course = courses.find((item) => item.id === courseId);
		if (!course) return;

		const enterAt = nowIso();
		const exitAt = addMinutesISO(enterAt, course.minutes + 7);
		const previousQueue = queue;
		const previousInside = inside;
		const previousUnitSeats = unitSeats.map((s) => ({ ...s }));
		const tempInsideId = uid('in_');

		// 座席割当実行
		const updatedSeats = unitSeats.map((s) => ({ ...s }));
		// assign selected seat ids
		assignMultipleSeats(selectedSeatIds, tempInsideId, updatedSeats);

		const tempInside: Inside = {
			id: tempInsideId,
			size: party.size,
			note: party.note ?? '',
			courseId,
			enterAt,
			exitAt,
			seatIds: selectedSeatIds,
		};

		setQueue((current) => current.filter((item) => item.id !== party.id));
		setInside((current) => [...current, tempInside]);
		setUnitSeats(updatedSeats);
		setShowSeatSelectionModal(false);
		setSelectedPartyForSeats(null);

		try {
			// atomic: queue -> inside 作成 + seats 更新
			// atomic create inside + set occupiedByInsideId on selected seats
			const seatsForTx = selectedSeatIds.map((id) => {
				const s = updatedSeats.find((u) => u.id === id)!;
				return { id: s.id, tableNumber: s.tableNumber, seatIndex: s.seatIndex };
			});
			await movePartyToInsideWithSeats(shopId, party.id, { courseId, enterAt, exitAt }, tempInsideId, seatsForTx);
		} catch (error) {
			console.error('move to inside / update seats error', error);
			// ロールバック（ローカル）
			setQueue(previousQueue);
			setInside(previousInside);
			setUnitSeats(previousUnitSeats);
			setErrorMessage('入店処理に失敗しました。再試行してください。');
			// 効果的なサーバ側ロールバックが必要なら追加実装
		}
	};

	const handleCheckout = async (id: string) => {
		const entry = inside.find((item) => item.id === id);
		if (!entry) return;
		const historyEntry = {
			id: uid('h_'),
			size: entry.size,
			note: entry.note,
			courseId: entry.courseId,
			enterAt: entry.enterAt,
			exitAt: nowIso(),
			seatId: entry.seatId,
			seatIds: entry.seatIds,
		};
		const previousInside = inside;
		const previousHistory = history;
		const previousUnitSeats = unitSeats.map((s) => ({ ...s }));

		// 座席解放
		const updatedSeats = unitSeats.map((s) => ({ ...s }));
		releaseSeatsOfParty(entry.id, updatedSeats);

		setInside((current) => current.filter((item) => item.id !== id));
		setHistory((current) => [...current, historyEntry]);
		setUnitSeats(updatedSeats);

		try {
			await checkoutFromInsideWithSeats(shopId, id, { exitAt: historyEntry.exitAt }, updatedSeats.map((s) => ({ id: s.id })));
		} catch (error) {
			console.error('checkout error', error);
			setInside(previousInside);
			setHistory(previousHistory);
			setUnitSeats(previousUnitSeats);
			setErrorMessage('退店処理に失敗しました。通信状況を確認してください。');
		}
	};

	const handleDeleteInside = async (id: string) => {
		const previousInside = inside;
		const previousUnitSeats = unitSeats.map((s) => ({ ...s }));

		// 座席解放
		const updatedSeats = unitSeats.map((s) => ({ ...s }));
		releaseSeatsOfParty(id, updatedSeats);

		setInside((current) => current.filter((item) => item.id !== id));
		setUnitSeats(updatedSeats);

		try {
			await removeInsideWithSeats(shopId, id, updatedSeats.map((s) => ({ id: s.id })));
		} catch (error) {
			console.error('remove inside error', error);
			setInside(previousInside);
			setUnitSeats(previousUnitSeats);
			setInside(previousInside);
			setErrorMessage('店内レコードの削除に失敗しました。');
		}
	};

	const handleUpdateInside = async (id: string, size: number, note: string) => {
		const previousInside = inside;
		setInside((current) => current.map((item) => (item.id === id ? { ...item, size, note } : item)));
		try {
			await updateInsideEntry(shopId, id, { size, note });
		} catch (error) {
			console.error('update inside error', error);
			setInside(previousInside);
			setErrorMessage('店内レコードの更新に失敗しました。');
		}
	};

	const estimates = useMemo(
		() => estimateWaitingTimeWithSeats(queue, inside, unitSeats, courses),
		[queue, inside, unitSeats, courses]
	);
	const { keys: groupedHistoryKeys, map: groupedHistoryMap } = useMemo(() => groupHistoryByDate(history), [history]);

	const estimateForNewPartyPreview = (size: number) => {
		return estimateForNewParty(size, queue, inside, unitSeats, courses);
	};

	return (
		<div className="App" style={{ padding: 16 }}>
			{errorMessage && (
				<div className="error-message">
					{errorMessage}
					<button className="error-message-close" onClick={() => setErrorMessage(null)}>
						閉じる
					</button>
				</div>
			)}

			<header className="app-header">
				<h1>待ち時間管理　ボドゲカフェWeeple</h1>
				<button className="secondary history-button" onClick={() => setShowHistoryModal(true)}>
					履歴
				</button>
				<button className="add-button" onClick={() => setShowAddModal(true)}>
					新しく並ぶ
				</button>
				<div className="header-preview-estimate">
					{previewSize === '' ? '入店見込み：—' : `入店見込み 約${estimateForNewPartyPreview(Number(previewSize))}分`}
				</div>
				<div className="header-preview-count">
					<input
						type="number"
						min={1}
						value={previewSize === '' ? '' : previewSize}
						onChange={(e) => {
							const value = e.target.value;
							setPreviewSize(value === '' ? '' : Math.max(1, Number(value)));
						}}
						className="header-count-input"
						placeholder="人数を入力"
					/>
					<span className="header-count-label">人数</span>
				</div>
			</header>

			<section style={{ marginBottom: 12 }}>
				<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					<span>店舗収容人数：</span>
					<input
						type="number"
						value={maxCapacity}
						min={1}
						readOnly
						disabled
						style={{ width: 100, padding: 6, borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7' }}
					/>
				</label>
			</section>

			<div className="main-columns">
				<div className="column left-column">
					<QueueList
						queue={queue}
						courses={courses}
						onEnter={handleEnter}
						onRemove={handleRemoveParty}
						onUpdateParty={handleUpdateParty}
						onMultiSelect={(ids) => selectedParties.setSelected(new Set(ids))}
						selectedParties={selectedParties.selected}
						estimates={estimates}
					/>
				</div>

				<div className="column right-column">
					<InsideList
						inside={inside}
						courses={courses}
						onCheckout={handleCheckout}
						onDelete={handleDeleteInside}
						onUpdateInside={handleUpdateInside}
						onMultiSelect={(ids) => selectedInside.setSelected(new Set(ids))}
						selectedInside={selectedInside.selected}
					/>
				</div>
			</div>

			<section style={{ marginTop: 20, marginBottom: 12 }}>
				<SeatView
					unitSeats={unitSeats}
					inside={inside}
					courses={courses}
					onCheckout={handleCheckout}
					onDelete={handleDeleteInside}
				/>
			</section>

			{showHistoryModal && (
				<div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>退店履歴</h3>
						{history.length === 0 ? (
							<p>履歴はありません</p>
						) : (
							<div style={{ maxHeight: '60vh', overflow: 'auto' }}>
								{groupedHistoryKeys.map((day: string) => {
									const items = groupedHistoryMap.get(day) || [];
									const dayTotal = items.reduce((sum: number, entry) => sum + (entry.size ?? 0), 0);
									const courseCounts = courses.map((course) => ({
										id: course.id,
										name: course.name,
										count: items.reduce(
											(sum: number, entry: { courseId?: string; size?: number }) =>
												sum + (entry.courseId === course.id ? (entry.size ?? 0) : 0),
											0
										),
									}));

									return (
										<div key={day} style={{ marginBottom: 12 }}>
											<div style={{ fontWeight: 700, marginBottom: 6 }}>
												{humanLabelForDate(day)} — 合計: {dayTotal}名
											</div>
											<div style={{ marginBottom: 8, color: '#444', fontSize: 13 }}>
												{courseCounts.map((courseCount) => (
													<span key={courseCount.id} style={{ marginRight: 12 }}>
														{courseCount.name}: {courseCount.count}名
													</span>
												))}
											</div>
											<ul style={{ listStyle: 'none', padding: 0 }}>
												{items.map((entry: { id: string; size: number; note?: string; courseId?: string; exitAt: string }) => {
													const course = courses.find((item) => item.id === entry.courseId);
													return (
														<li key={entry.id} className="card" style={{ marginBottom: 6 }}>
															<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
																<div>
																	<div style={{ fontWeight: 700 }}>{entry.size}名 {entry.note ? `- ${entry.note}` : ''}</div>
																	<div style={{ color: '#666', fontSize: 13 }}>
																		{course ? course.name : (entry.courseId ?? 'コース未設定')} ／ 退店: {new Date(entry.exitAt).toLocaleString()}
																	</div>
																</div>
																<div>
																	<button
																		className="secondary"
																		onClick={async () => {
																			try {
																				await removeHistoryEntry(shopId, entry.id);
																			} catch (error) {
																				console.error('remove history error', error);
																				setHistory((current) => current.filter((item) => item.id !== entry.id));
																			}
																		}}
																	>
																		削除
																	</button>
																</div>
															</div>
														</li>
													);
												})}
											</ul>
										</div>
									);
								})}
							</div>
						)}
						<div style={{ textAlign: 'right', marginTop: 12 }}>
							<button className="secondary" onClick={() => setShowHistoryModal(false)}>
								閉じる
							</button>
						</div>
					</div>
				</div>
			)}

			{showAddModal && (
				<div className="modal-overlay" onClick={() => setShowAddModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<h3>新しく並ぶ</h3>
						<AddForm
							onAdd={handleAdd}
							getEstimate={(size) => estimateForNewPartyPreview(size)}
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

			{showSeatSelectionModal && selectedPartyForSeats && (
				<SeatSelectionModal
					party={selectedPartyForSeats}
					courses={courses}
					unitSeats={unitSeats}
					onConfirm={handleSeatSelectionConfirm}
					onCancel={() => {
						setShowSeatSelectionModal(false);
						setSelectedPartyForSeats(null);
					}}
				/>
			)}
		</div>
	);
}

export default App;
