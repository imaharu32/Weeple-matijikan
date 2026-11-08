import React, { useMemo, useState } from 'react';
import { Course, Inside, UnitSeat } from '../types';
import {
	addMinutesISO,
	describeSeats,
	formatTime,
	getOccupiedSeatIds,
	GroupColor,
	remainingStatus,
} from '../utils';
import RoomDiagram from './RoomDiagram';
import Modal from './ui/Modal';
import NumberStepper from './ui/NumberStepper';
import styles from './InsideDetailModal.module.css';

type Props = {
	inside: Inside;
	allInside: Inside[];
	courses: Course[];
	unitSeats: UnitSeat[];
	groupColors: Map<string, GroupColor>;
	onClose: () => void;
	onSave: (id: string, updates: Partial<Inside>) => void;
	onCheckout: (id: string) => void;
	onDelete: (id: string) => void;
};

const TONE_CHIP = { danger: 'chip chip-danger', warning: 'chip chip-warning', normal: 'chip' } as const;

export default function InsideDetailModal({
	inside,
	allInside,
	courses,
	unitSeats,
	groupColors,
	onClose,
	onSave,
	onCheckout,
	onDelete,
}: Props) {
	const [size, setSize] = useState(inside.size);
	const [note, setNote] = useState(inside.note ?? '');
	const [courseId, setCourseId] = useState(inside.courseId);
	const [extraMinutes, setExtraMinutes] = useState(0);
	const originalSeatIds = useMemo(() => new Set(inside.seats.map((s) => s.id)), [inside.seats]);
	const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(() => new Set(originalSeatIds));

	const originalCourse = courses.find((c) => c.id === inside.courseId);
	const selectedCourse = courses.find((c) => c.id === courseId);
	// 今の退店予定（これまでの延長を含む）を基準に、コースの差と追加の延長を足す
	const courseDelta = originalCourse && selectedCourse ? selectedCourse.minutes - originalCourse.minutes : 0;
	const previewExitAt = addMinutesISO(inside.exitAt, courseDelta + extraMinutes);
	const remaining = remainingStatus(previewExitAt);

	const occupiedByOthers = useMemo(() => getOccupiedSeatIds(allInside, inside.id), [allInside, inside.id]);
	const selectedSeats = unitSeats
		.filter((seat) => selectedSeatIds.has(seat.id))
		.map((seat) => ({ id: seat.id, tableNumber: seat.tableNumber, seatIndex: seat.seatIndex }));
	const seatsChanged =
		selectedSeatIds.size !== originalSeatIds.size || [...selectedSeatIds].some((id) => !originalSeatIds.has(id));
	// 画面を開いている間に、別の端末がその席を使った場合
	const takenSeatIds = [...selectedSeatIds].filter((id) => occupiedByOthers.has(id));
	// 席は何席でもよいが、1席以上は必要
	const canSave = selectedSeatIds.size - takenSeatIds.length >= 1 && takenSeatIds.length === 0;

	const toggleSeat = (seatId: string) => {
		if (occupiedByOthers.has(seatId)) return;
		setSelectedSeatIds((current) => {
			const next = new Set(current);
			if (next.has(seatId)) next.delete(seatId);
			else next.add(seatId);
			return next;
		});
	};

	const save = () => {
		if (!canSave) return;
		onSave(inside.id, { size, note, courseId, exitAt: previewExitAt, seats: seatsChanged ? selectedSeats : inside.seats });
	};

	return (
		<Modal
			size="xl"
			title={inside.note || 'メモなしの組'}
			subtitle={`${inside.size}名 ・ ${originalCourse?.name ?? inside.courseId} ・ ${formatTime(inside.enterAt)} 入店`}
			onClose={onClose}
			footer={
				<>
					<button
						type="button"
						className={`btn btn-danger btn-sm ${styles.deleteButton}`}
						onClick={() => {
							if (window.confirm('この組を削除しますか？\n退店履歴には残りません。間違えて登録したときだけ使ってください。')) {
								onDelete(inside.id);
							}
						}}
					>
						この組を削除
					</button>
					<button type="button" className="btn btn-secondary" onClick={() => onCheckout(inside.id)}>
						退店する
					</button>
					<button type="button" className="btn btn-primary btn-lg" onClick={save} disabled={!canSave}>
						変更を保存
					</button>
				</>
			}
		>
			<div className={styles.layout}>
				<div className={styles.form}>
					<div className="field">
						<span className="field-label">人数</span>
						<NumberStepper value={size} onChange={setSize} min={1} max={30} unit="名" label="人数" />
					</div>

					<div className="field">
						<span className="field-label">コース</span>
						<div className={styles.courses} role="radiogroup" aria-label="コース">
							{courses.map((course) => (
								<button
									key={course.id}
									type="button"
									role="radio"
									aria-checked={course.id === courseId}
									className={`${styles.course} ${course.id === courseId ? styles.courseSelected : ''}`}
									onClick={() => setCourseId(course.id)}
								>
									{course.name}
								</button>
							))}
						</div>
					</div>

					<label className="field">
						<span className="field-label">メモ</span>
						<input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：家族、大学生 など" />
					</label>

					<div className="field">
						<span className="field-label">時間</span>
						<div className={styles.timeBox}>
							<div className={styles.timeRow}>
								<span className={styles.timeLabel}>退店予定</span>
								<span className={styles.timeValue}>{formatTime(previewExitAt)}</span>
								<span className={TONE_CHIP[remaining.tone]}>{remaining.label}</span>
							</div>
							<div className={styles.extendRow}>
								<button type="button" className="btn btn-secondary btn-sm" onClick={() => setExtraMinutes((m) => m + 15)}>
									＋15分 延長
								</button>
								<button type="button" className="btn btn-secondary btn-sm" onClick={() => setExtraMinutes((m) => m + 30)}>
									＋30分 延長
								</button>
								{extraMinutes > 0 && (
									<button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtraMinutes(0)}>
										延長を取り消す
									</button>
								)}
							</div>
							{(extraMinutes > 0 || courseDelta !== 0) && (
								<p className={styles.pending}>「変更を保存」を押すと反映されます（{courseDelta + extraMinutes > 0 ? '+' : ''}
									{courseDelta + extraMinutes}分）</p>
							)}
						</div>
					</div>
				</div>

				<div className={styles.seats}>
					<div className={styles.seatsHeader}>
						<div>
							<span className="field-label">席</span>
							<div className={styles.seatsValue}>
								{selectedSeatIds.size > 0 ? describeSeats(selectedSeats) : '席が選ばれていません'}
								{seatsChanged && <span className={`chip chip-warning ${styles.changedChip}`}>変更あり</span>}
							</div>
						</div>
						{seatsChanged && (
							<button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedSeatIds(new Set(originalSeatIds))}>
								席を元に戻す
							</button>
						)}
					</div>

					{takenSeatIds.length > 0 ? (
						<div className={`${styles.seatHint} ${styles.seatHintNg}`}>
							選んでいた席のうち {takenSeatIds.length}席が、ほかの組に使われました。
							<button
								type="button"
								className={`btn btn-secondary btn-sm ${styles.hintAction}`}
								onClick={() => setSelectedSeatIds((current) => new Set([...current].filter((id) => !occupiedByOthers.has(id))))}
							>
								使われた席を外す
							</button>
						</div>
					) : (
						<p className={`${styles.seatHint} ${canSave ? styles.seatHintInfo : styles.seatHintNg}`}>
							{canSave
								? '空いている席をクリックすると追加、この組の席をクリックすると外せます。「変更を保存」で反映されます。'
								: '席を1つ以上選んでください。'}
						</p>
					)}

					<RoomDiagram
						unitSeats={unitSeats}
						inside={allInside}
						groupColors={groupColors}
						mode="edit"
						selectedSeatIds={selectedSeatIds}
						editingInsideId={inside.id}
						onSeatClick={toggleSeat}
					/>
				</div>
			</div>
		</Modal>
	);
}
