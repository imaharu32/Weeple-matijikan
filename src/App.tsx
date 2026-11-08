import React, { useEffect, useMemo, useState } from 'react';
import styles from './App.module.css';
import { Party } from './types';
import { COURSES, MAX_CAPACITY, SHOP_ID, UNIT_SEATS } from './constants';
import QueueList from './components/QueueList';
import InsideList from './components/InsideList';
import SeatView from './components/SeatView';
import SeatSelectionModal from './components/SeatSelectionModal';
import InsideDetailModal from './components/InsideDetailModal';
import HistoryModal from './components/HistoryModal';
import PartyFormModal from './components/PartyFormModal';
import WaitTime from './components/WaitTime';
import NumberStepper from './components/ui/NumberStepper';
import { buildGroupColorMap, estimateForNewParty, estimateWaitingTimeWithSeats } from './utils';
import { useErrorMessage, useShopData } from './hooks';
import { useDemoShopData } from './dev/useDemoShopData';

// 開発時に ?demo を付けて開くと、Firebase を使わずサンプルデータで動く（本番ビルドでは常に false）
const IS_DEMO = import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo');
const useData = IS_DEMO ? useDemoShopData : useShopData;

type PartyFormState = { mode: 'add' } | { mode: 'edit'; party: Party };

function App() {
	const { message, setMessage } = useErrorMessage(5000);
	// 退店履歴を開いている間だけ、履歴を読み込む（Firestore の読み取り回数を抑えるため）
	const [showHistory, setShowHistory] = useState(false);
	const {
		queue,
		inside,
		history,
		historyLoading,
		addParty,
		removeParty,
		updateParty,
		enterParty,
		checkout,
		removeInside,
		updateInside,
		removeHistoryEntry,
	} = useData(SHOP_ID, setMessage, { withHistory: showHistory });

	const [partyForm, setPartyForm] = useState<PartyFormState | null>(null);
	const [partyToSeat, setPartyToSeat] = useState<Party | null>(null);
	const [detailInsideId, setDetailInsideId] = useState<string | null>(null);
	const [previewSize, setPreviewSize] = useState(2);

	// 30秒ごとに再描画して、残り時間や見込み時間を更新する
	const [, setNowTick] = useState(0);
	useEffect(() => {
		const id = setInterval(() => setNowTick((t) => t + 1), 30000);
		return () => clearInterval(id);
	}, []);

	const groupColors = useMemo(() => buildGroupColorMap(inside), [inside]);
	const detailInside = inside.find((item) => item.id === detailInsideId) ?? null;
	const estimates = estimateWaitingTimeWithSeats(queue, inside, UNIT_SEATS, COURSES);
	const estimateFor = (size: number) => estimateForNewParty(size, queue, inside, UNIT_SEATS, COURSES);

	// 2人で並んだ場合の待ち時間だけを表示するページ（お客さん向け）
	if (window.location.pathname === '/wait_time') {
		return <WaitTime minutes={estimateFor(2)} />;
	}

	const queuePeople = queue.reduce((sum, party) => sum + party.size, 0);
	const insidePeople = inside.reduce((sum, entry) => sum + entry.size, 0);
	const usedSeats = inside.reduce((sum, entry) => sum + (entry.seats?.length ?? 0), 0);
	const freeSeats = Math.max(0, MAX_CAPACITY - usedSeats);
	const previewMinutes = estimateFor(previewSize);

	return (
		<div className={styles.app}>
			{IS_DEMO && (
				<div className={`${styles.envBanner} ${styles.envDemo}`}>
					デモモード：サンプルデータで動いています。操作しても保存されません。
				</div>
			)}
			{import.meta.env.DEV && !IS_DEMO && (
				<div className={`${styles.envBanner} ${SHOP_ID === 'default_shop' ? styles.envDanger : styles.envDev}`}>
					{SHOP_ID === 'default_shop'
						? '開発モードですが、本番のお店のデータ（default_shop）に接続しています。操作に注意してください。'
						: `開発モード：開発用のデータ（${SHOP_ID}）に接続しています。本番のお店のデータではありません。URL に ?demo を付けるとサンプルデータで動きます。`}
				</div>
			)}

			<header className={styles.header}>
				<div className={styles.brand}>
					<h1 className={styles.title}>待ち時間管理</h1>
					<span className={styles.shopName}>ボドゲカフェ Weeple</span>
				</div>
				<div className={styles.headerActions}>
					<button type="button" className="btn btn-ghost" onClick={() => setShowHistory(true)}>
						退店履歴
					</button>
					<button type="button" className="btn btn-primary btn-lg" onClick={() => setPartyForm({ mode: 'add' })}>
						＋ 列に追加
					</button>
				</div>
			</header>

			<section className={styles.summary} aria-label="いまの状況">
				<SummaryItem label="待っている組" value={`${queue.length}組`} sub={`${queuePeople}名`} />
				<SummaryItem label="店内" value={`${insidePeople}名`} sub={`${inside.length}組`} />
				<SummaryItem label="空いている席" value={`${freeSeats}席`} sub={`全${MAX_CAPACITY}席`} />
				<div className={`${styles.summaryItem} ${styles.estimator}`}>
					<div className={styles.summaryLabel}>今から並ぶと、入店までの目安</div>
					<div className={styles.estimatorRow}>
						<NumberStepper size="sm" value={previewSize} min={1} max={30} unit="名なら" label="人数" onChange={setPreviewSize} />
						{previewMinutes === 0 ? (
							<span className={`chip chip-success ${styles.estimatorChip}`}>すぐ案内できます</span>
						) : (
							<span className={styles.estimatorValue}>
								約<span className="num">{previewMinutes}</span>分
							</span>
						)}
					</div>
				</div>
			</section>

			<main className={styles.main}>
				<section className={styles.queueArea}>
					<QueueList
						queue={queue}
						estimates={estimates}
						onEnter={(party) => setPartyToSeat(party)}
						onEdit={(party) => setPartyForm({ mode: 'edit', party })}
						onRemove={(partyId) => void removeParty(partyId)}
					/>
				</section>
				<section className={styles.seatArea}>
					<SeatView unitSeats={UNIT_SEATS} inside={inside} groupColors={groupColors} onOpenInside={setDetailInsideId} />
				</section>
				<section className={styles.insideArea}>
					<InsideList
						inside={inside}
						courses={COURSES}
						groupColors={groupColors}
						onCheckout={(id) => void checkout(id)}
						onOpenDetail={setDetailInsideId}
					/>
				</section>
			</main>

			{message && (
				<div className={styles.toast} role="status">
					<span>{message}</span>
					<button type="button" className={styles.toastClose} onClick={() => setMessage(null)}>
						閉じる
					</button>
				</div>
			)}

			{partyForm && (
				<PartyFormModal
					mode={partyForm.mode}
					initialSize={partyForm.mode === 'edit' ? partyForm.party.size : 2}
					initialNote={partyForm.mode === 'edit' ? (partyForm.party.note ?? '') : ''}
					getEstimate={partyForm.mode === 'add' ? estimateFor : undefined}
					onSubmit={(size, note) => {
						if (partyForm.mode === 'edit') void updateParty(partyForm.party.id, size, note);
						else void addParty(size, note);
						setPartyForm(null);
					}}
					onClose={() => setPartyForm(null)}
				/>
			)}

			{partyToSeat && (
				<SeatSelectionModal
					party={partyToSeat}
					courses={COURSES}
					unitSeats={UNIT_SEATS}
					inside={inside}
					groupColors={groupColors}
					onConfirm={(courseId, seats) => {
						void enterParty(partyToSeat, courseId, seats);
						setPartyToSeat(null);
					}}
					onClose={() => setPartyToSeat(null)}
				/>
			)}

			{detailInside && (
				<InsideDetailModal
					key={detailInside.id}
					inside={detailInside}
					allInside={inside}
					courses={COURSES}
					unitSeats={UNIT_SEATS}
					groupColors={groupColors}
					onClose={() => setDetailInsideId(null)}
					onSave={(id, partial) => {
						void updateInside(id, partial);
						setDetailInsideId(null);
					}}
					onCheckout={(id) => {
						void checkout(id);
						setDetailInsideId(null);
					}}
					onDelete={(id) => {
						void removeInside(id);
						setDetailInsideId(null);
					}}
				/>
			)}

			{showHistory && (
				<HistoryModal
					history={history}
					loading={historyLoading}
					courses={COURSES}
					onRemove={(id) => void removeHistoryEntry(id)}
					onClose={() => setShowHistory(false)}
				/>
			)}
		</div>
	);
}

function SummaryItem({ label, value, sub }: { label: string; value: string; sub: string }) {
	return (
		<div className={styles.summaryItem}>
			<div className={styles.summaryLabel}>{label}</div>
			<div>
				<span className={`${styles.summaryValue} num`}>{value}</span>
				<span className={styles.summarySub}>{sub}</span>
			</div>
		</div>
	);
}

export default App;
