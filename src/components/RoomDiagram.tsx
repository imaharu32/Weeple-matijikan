import React, { useMemo, useState } from 'react';
import { Course, Inside, UnitSeat } from '../types';
import { getTableSeatsInfo } from '../utils';
import styles from './RoomDiagram.module.css';

type SeatMode = 'view' | 'select';

type Props = {
	unitSeats: UnitSeat[];
	inside: Inside[];
	courses: Course[];
	mode: SeatMode;
	selectedSeatIds?: Set<string>;
	selectedInsideIds?: Set<string>;
	focusInsideId?: string;
	multiSelectMode?: boolean;
	onSeatClick?: (seatId: string, occupiedByInsideId?: string) => void;
	onInsideClick?: (insideId: string) => void;
	onCheckout?: (insideId: string) => void;
};

const TABLE_POSITIONS = [
	{ row: 1, col: 1 },
	{ row: 1, col: 2 },
	{ row: 2, col: 1 },
	{ row: 2, col: 2 },
	{ row: 3, col: 1 },
	{ row: 3, col: 2 },
];

// テーブル内の席の位置（seatIndex 0〜5 → 2列 × 3行）
const SEAT_POSITION_CLASSES = [
	styles.roomSeatR1c1,
	styles.roomSeatR1c2,
	styles.roomSeatR2c1,
	styles.roomSeatR2c2,
	styles.roomSeatR3c1,
	styles.roomSeatR3c2,
];

const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

export default function RoomDiagram({
	unitSeats,
	inside,
	courses,
	mode,
	selectedSeatIds,
	selectedInsideIds,
	focusInsideId,
	multiSelectMode,
	onSeatClick,
	onInsideClick,
	onCheckout,
}: Props) {
	const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
	const groupColorMap = useMemo(() => {
		const palette = [
			'#E8D4C4', '#D4E8C4', '#C4D4E8', '#E8C4D4', '#E8E4C4', '#D4E8E4',
			'#E4D4E8', '#E8D4E4', '#D8E4C4', '#C4E4E8', '#E8D0C4', '#D0C4E8',
			'#E4C4D4', '#D4C4E8', '#C4E8D4', '#E8C4C4',
		];
		const map = new Map<string, string>();
		inside.forEach((item, index) => map.set(item.id, palette[index % palette.length]));
		return map;
	}, [inside]);

	const insideMap = useMemo(() => new Map(inside.map((i) => [i.id, i])), [inside]);

	const [tooltipSeatId, setTooltipSeatId] = useState<string | null>(null);

	return (
		<div className={cx(styles.roomDiagram, mode === 'select' && styles.roomDiagramSelect)}>
			<div className={styles.roomSidebar}>
				<div className={styles.roomSidebarLabel}>ボードゲーム</div>
			</div>

			<div className={styles.roomLegend}>
				<div className={styles.legendItem}><span className={cx(styles.legendDot, styles.empty)}/> 空席</div>
				<div className={styles.legendItem}><span className={cx(styles.legendDot, styles.occupied)}/> 使用中</div>
			</div>

			<div className={styles.roomFloor}>
				{TABLE_POSITIONS.map((_, index) => {
					const tableNum = index + 1;
					const tableSeats = getTableSeatsInfo(tableNum, unitSeats, inside);

					return (
						<div key={`table-${tableNum}`} className={styles.roomTable}>
							<div className={styles.roomTableLabel}>テーブル {tableNum}</div>
							{tableSeats.map((seatInfo, seatIndex) => {
								const isOccupied = !!seatInfo.occupiedByInsideId;
								const seatId = seatInfo.id;
								const insideId = seatInfo.occupiedByInsideId;
								const course = isOccupied && insideId ? courseMap.get(inside.find((item) => item.id === insideId)?.courseId ?? '') : null;
								const isSeatSelected = mode === 'select' ? selectedSeatIds?.has(seatId) : false;
								const isGroupSelected = mode === 'view' && isOccupied && !!insideId && selectedInsideIds?.has(insideId);
								const isFocusedInside = mode === 'view' && isOccupied && !!insideId && focusInsideId === insideId;
								const positionClass = SEAT_POSITION_CLASSES[seatIndex];

								return (
									<div
										key={seatId}
										className={cx(
											styles.roomSeat,
											positionClass,
											isOccupied ? styles.occupied : styles.empty,
											(isSeatSelected || isGroupSelected) && styles.selected
										)}
										tabIndex={mode === 'select' && isOccupied ? -1 : 0}
										onClick={() => {
											if (!onSeatClick) return;
											if (mode === 'view' && !isOccupied) return;
											onSeatClick(seatId, insideId);
										}}
										onTouchStart={() => setTooltipSeatId(seatId)}
										role="button"
										aria-disabled={mode === 'select' && isOccupied}
										aria-label={mode === 'view' && isOccupied && insideId ? '客の詳細を開く' : undefined}
										style={
											mode === 'view' && isOccupied && insideId
												? {
													backgroundColor: groupColorMap.get(insideId) ?? '#fff',
													borderColor: isFocusedInside ? 'var(--primary)' : undefined,
													boxShadow: isFocusedInside
														? '0 0 0 4px rgba(91, 124, 92, 0.22), 0 10px 22px rgba(0, 0, 0, 0.18)'
														: undefined,
											}
											: undefined
										}
										onKeyDown={(e) => {
											if (mode === 'view' && isOccupied && insideId && (e.key === 'Enter' || e.key === ' ')) {
												e.preventDefault();
												onInsideClick?.(insideId);
											}
										}}
									>
										<div className={styles.statusDotWrapper}>
											<div className={cx(styles.statusDot, isOccupied ? styles.occupied : styles.empty)} />
										</div>
										{mode === 'select' ? (
											<div className={styles.roomSeatSelectContent}>
												<div className={styles.roomSeatNumber}>{seatInfo.seatIndex + 1}</div>
												<div className={styles.roomSeatStatus}>
													{isOccupied ? '使用中' : isSeatSelected ? '選択中' : '空席'}
												</div>
											</div>
										) : isOccupied ? (
											<div className={styles.roomSeatViewContent}>
												<div className={styles.roomSeatInfo}>
													<div className={styles.roomSeatLine1}>
														<span className={styles.roomSeatName}>席 {seatInfo.seatIndex + 1}</span>
														<span className={styles.roomSeatCount}>{seatInfo.occupantSize}名</span>
													</div>
													<div className={styles.roomSeatLine2}>
														<span className={styles.roomSeatCourse}>{course?.name ?? '?'}</span>
														<span className={styles.roomSeatRemaining}>残り {seatInfo.remainingMinutes}分</span>
													</div>
													<div className={cx(styles.seatTooltip, tooltipSeatId === seatId && styles.open)}>
														<div className={styles.tooltipName}>{insideMap.get(insideId ?? '')?.id ?? '不明'}</div>
														<div>{course?.name ?? '?'}</div>
														<div>残り {seatInfo.remainingMinutes}分</div>
													</div>
												</div>
												<div className={styles.roomSeatActions}>
													{mode === 'view' && isOccupied && insideId && onInsideClick && (
														<button
															className={styles.btnSeatDetails}
															onClick={(e) => {
																e.stopPropagation();
																onInsideClick(insideId);
															}}
														>
															詳細
														</button>
													)}
													{!multiSelectMode && onCheckout && insideId && (
														<button
															className={styles.btnSeatCheckout}
															onClick={(e) => {
																e.stopPropagation();
																onCheckout(insideId);
															}}
														>
															退店
														</button>
													)}
													{multiSelectMode && insideId && isGroupSelected && (
														<div className={styles.seatSelectCheckbox}>✓</div>
													)}
												</div>
											</div>
										) : (
											<div className={styles.roomSeatEmptyContent}>
												<div className={styles.roomSeatNumber}>席 {seatInfo.seatIndex + 1}</div>
												<div className={styles.roomSeatStatus}>空席</div>
											</div>
										)}
										</div>
				)})}
						</div>
					);
				})}
			</div>

			<div className={styles.roomEntrance}>
				<div className={styles.roomEntranceIcon} aria-hidden>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 12h14" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M13 6l6 6-6 6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>
				<div className={styles.roomEntranceLabel}>入口</div>
			</div>
		</div>
	);
}