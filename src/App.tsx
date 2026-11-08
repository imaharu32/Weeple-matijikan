import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Party, SeatDetail } from './types';
import { COURSES, MAX_CAPACITY, SHOP_ID, UNIT_SEATS } from './constants';
import AddForm from './components/AddForm';
import QueueList from './components/QueueList';
import InsideList from './components/InsideList';
import InsideDetailModal from './components/InsideDetailModal';
import HistoryModal from './components/HistoryModal';
import SeatView from './components/SeatView';
import SeatSelectionModal from './components/SeatSelectionModal';
import SeatsPerPartySizeSettings from './components/SeatsPerPartySizeSettings';
import WaitTime from './components/WaitTime';
import { estimateWaitingTimeWithSeats, estimateForNewParty } from './utils';
import { useErrorMessage, useModals, useMultiSelect, useShopData } from './hooks';

function App() {
	const { message: errorMessage, setMessage: setErrorMessage } = useErrorMessage(5000);
	const {
		queue,
		inside,
		history,
		seatsRangePerPartySize,
		addParty,
		removeParty,
		updateParty,
		enterParty,
		checkout,
		removeInside,
		updateInside,
		removeHistoryEntry,
		saveSeatsRange,
	} = useShopData(SHOP_ID, setErrorMessage);

	const [previewSize, setPreviewSize] = useState<number | ''>('');
	const { showAddModal, setShowAddModal, showHistoryModal, setShowHistoryModal } = useModals();
	const selectedParties = useMultiSelect();
	const selectedInside = useMultiSelect();
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [selectedPartyForSeats, setSelectedPartyForSeats] = useState<Party | null>(null);
	const [selectedInsideDetailId, setSelectedInsideDetailId] = useState<string | null>(null);
	const selectedInsideDetail = useMemo(
		() => inside.find((item) => item.id === selectedInsideDetailId) ?? null,
		[inside, selectedInsideDetailId]
	);

	// 30秒ごとに再描画して、残り時間や見込み時間を更新する
	const [nowTick, setNowTick] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setNowTick((t) => t + 1), 30000);
		return () => clearInterval(id);
	}, []);

	const handleEnter = (partyId: string) => {
		const party = queue.find((item) => item.id === partyId);
		if (party) setSelectedPartyForSeats(party);
	};

	const handleSeatSelectionConfirm = (courseId: string, selectedSeats: SeatDetail[]) => {
		if (!selectedPartyForSeats) return;
		const party = selectedPartyForSeats;
		setSelectedPartyForSeats(null);
		void enterParty(party, courseId, selectedSeats);
	};

	const estimates = estimateWaitingTimeWithSeats(queue, inside, UNIT_SEATS, COURSES, seatsRangePerPartySize);
	const estimateForNewPartyPreview = (size: number) =>
		estimateForNewParty(size, queue, inside, UNIT_SEATS, COURSES, seatsRangePerPartySize);

	// 2人で並んだ場合の待ち時間だけを表示するページ
	if (window.location.pathname === '/wait_time') {
		return <WaitTime minutes={estimateForNewPartyPreview(2)} />;
	}

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
			<button className="secondary settings-button" onClick={() => setShowSettingsModal(true)}>
				⚙ 設定
			</button>
			<button
				className="add-button"
				onClick={() => setShowAddModal(true)}
				title="新たに並ぶ"
				aria-label="新たに並ぶ"
			>
				+
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
						value={MAX_CAPACITY}
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
						courses={COURSES}
						onEnter={handleEnter}
						onRemove={removeParty}
						onUpdateParty={updateParty}
						onMultiSelect={(ids) => selectedParties.setSelected(new Set(ids))}
						selectedParties={selectedParties.selected}
						nowTick={nowTick}
						estimates={estimates}
					/>
				</div>

				<div className="column right-column">
					<InsideList
						inside={inside}
						courses={COURSES}
						onCheckout={checkout}
						onDelete={removeInside}
						onUpdateInside={(id, size, note) => updateInside(id, { size, note })}
						onSelectInside={(insideId) => setSelectedInsideDetailId(insideId)}
						onMultiSelect={(ids) => selectedInside.setSelected(new Set(ids))}
						selectedInside={selectedInside.selected}
						nowTick={nowTick}
					/>
				</div>
			</div>

			<section style={{ marginTop: 20, marginBottom: 12 }}>
				<SeatView
					unitSeats={UNIT_SEATS}
					inside={inside}
					courses={COURSES}
					onCheckout={checkout}
					onDelete={removeInside}
					onSelectInside={(insideId) => setSelectedInsideDetailId(insideId)}
				/>
			</section>

			{selectedInsideDetail && (
				<InsideDetailModal
					inside={selectedInsideDetail}
					courses={COURSES}
					unitSeats={UNIT_SEATS}
					onClose={() => setSelectedInsideDetailId(null)}
					onSave={updateInside}
					onCheckout={(id: string) => {
						void checkout(id);
						setSelectedInsideDetailId(null);
					}}
					onDelete={(id: string) => {
						void removeInside(id);
						setSelectedInsideDetailId(null);
					}}
				/>
			)}

			{showHistoryModal && (
				<HistoryModal
					history={history}
					courses={COURSES}
					onRemove={(id) => void removeHistoryEntry(id)}
					onClose={() => setShowHistoryModal(false)}
				/>
			)}

			{showAddModal && (
				<div className="modal-overlay" onClick={() => setShowAddModal(false)}>
					<div className="modal-content add-form-modal" onClick={(e) => e.stopPropagation()}>
						<h3>新しく並ぶ</h3>
						<AddForm
							onAdd={addParty}
							getEstimate={(size) => estimateForNewPartyPreview(size)}
							onAfterAdd={() => setShowAddModal(false)}
							onCancel={() => setShowAddModal(false)}
						/>
					</div>
				</div>
			)}

			{selectedPartyForSeats && (
				<SeatSelectionModal
					party={selectedPartyForSeats}
					courses={COURSES}
					unitSeats={UNIT_SEATS}
					inside={inside}
					seatsRangePerPartySize={seatsRangePerPartySize}
					onConfirm={handleSeatSelectionConfirm}
					onCancel={() => setSelectedPartyForSeats(null)}
				/>
			)}

			{showSettingsModal && (
				<div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
					<div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>設定</h3>
							<button className="secondary" onClick={() => setShowSettingsModal(false)}>
								閉じる
							</button>
						</div>
						<div className="modal-body">
							<SeatsPerPartySizeSettings
								seatsRangePerPartySize={seatsRangePerPartySize}
								onSave={async (newSettings) => {
									if (await saveSeatsRange(newSettings)) {
										setErrorMessage('座席占有ルールを更新しました');
										setShowSettingsModal(false);
									}
								}}
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
