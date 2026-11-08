import React, { useMemo, useState } from 'react';
import { EXIT_BUFFER_MINUTES } from '../constants';
import { Course, Inside, Party, SeatDetail, UnitSeat } from '../types';
import { addMinutesISO, formatTime, getOccupiedSeatIds, GroupColor, nowIso, suggestSeats } from '../utils';
import RoomDiagram from './RoomDiagram';
import Modal from './ui/Modal';
import styles from './SeatSelectionModal.module.css';

type Props = {
	party: Party;
	courses: Course[];
	unitSeats: UnitSeat[];
	inside: Inside[];
	groupColors: Map<string, GroupColor>;
	onConfirm: (courseId: string, seats: SeatDetail[]) => void;
	onClose: () => void;
};

export default function SeatSelectionModal({ party, courses, unitSeats, inside, groupColors, onConfirm, onClose }: Props) {
	const occupied = useMemo(() => getOccupiedSeatIds(inside), [inside]);
	const freeCount = unitSeats.length - occupied.size;

	const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
	// 開いた時点で、人数と同じ数のおすすめの席を選んでおく
	const [selected, setSelected] = useState<Set<string>>(() => new Set(suggestSeats(party.size, unitSeats, occupied)));

	const count = selected.size;
	const isValid = count >= 1 && !!courseId;
	const course = courses.find((item) => item.id === courseId);
	const exitPreview = (minutes: number) => formatTime(addMinutesISO(nowIso(), minutes + EXIT_BUFFER_MINUTES));

	const toggleSeat = (seatId: string) => {
		if (occupied.has(seatId)) return;
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(seatId)) next.delete(seatId);
			else next.add(seatId);
			return next;
		});
	};

	const confirm = () => {
		if (!isValid) return;
		const seats = unitSeats
			.filter((seat) => selected.has(seat.id))
			.map((seat) => ({ id: seat.id, tableNumber: seat.tableNumber, seatIndex: seat.seatIndex }));
		onConfirm(courseId, seats);
	};

	return (
		<Modal
			size="xl"
			title="席を選んで入店"
			subtitle={`${party.size}名${party.note ? `（${party.note}）` : ''}`}
			onClose={onClose}
			footer={
				<>
					<span className={styles.footerSummary}>
						{course?.name} ・ <span className="num">{count}</span>席
					</span>
					<button type="button" className="btn btn-secondary" onClick={onClose}>
						キャンセル
					</button>
					<button type="button" className="btn btn-primary btn-lg" onClick={confirm} disabled={!isValid}>
						この席で入店する
					</button>
				</>
			}
		>
			<div className={styles.layout}>
				<div className={styles.side}>
					<section className={styles.step}>
						<h3 className={styles.stepTitle}>
							<span className={styles.stepNo}>1</span>コースを選ぶ
						</h3>
						<div className={styles.courses} role="radiogroup" aria-label="コース">
							{courses.map((item) => (
								<button
									key={item.id}
									type="button"
									role="radio"
									aria-checked={item.id === courseId}
									className={`${styles.course} ${item.id === courseId ? styles.courseSelected : ''}`}
									onClick={() => setCourseId(item.id)}
								>
									<span className={styles.courseName}>{item.name}</span>
									<span className={styles.courseMeta}>{exitPreview(item.minutes)} ごろ退店</span>
								</button>
							))}
						</div>
					</section>

					<section className={styles.step}>
						<h3 className={styles.stepTitle}>
							<span className={styles.stepNo}>2</span>席を選ぶ
						</h3>
						<p className={styles.help}>
							人数分の席を、おすすめとして選んであります。変えるときは右の図の席をクリックしてください（何席でも選べます）。
						</p>
						<div className={`${styles.count} ${count >= 1 ? styles.countOk : styles.countNg}`}>
							<span>
								選択中 <strong className="num">{count}</strong>席
							</span>
							<span className={styles.countMessage}>
								{count === 0 ? '席を1つ以上選んでください' : `${party.size}名で${count}席を使います`}
							</span>
						</div>
						{freeCount < party.size && (
							<p className={styles.warning}>空いている席が人数より少なくなっています（空き {freeCount}席）。</p>
						)}
						<div className={styles.seatActions}>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={() => setSelected(new Set(suggestSeats(party.size, unitSeats, occupied)))}
							>
								おすすめの席を選び直す
							</button>
							<button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())} disabled={count === 0}>
								選択を解除
							</button>
						</div>
					</section>
				</div>

				<div className={styles.map}>
					<RoomDiagram
						unitSeats={unitSeats}
						inside={inside}
						groupColors={groupColors}
						mode="select"
						selectedSeatIds={selected}
						onSeatClick={toggleSeat}
					/>
				</div>
			</div>
		</Modal>
	);
}
