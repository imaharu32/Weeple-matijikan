import React, { useMemo, useState } from 'react';
import { Course, Inside, UnitSeat } from '../types';
import { getTableSeatsInfo } from '../utils';

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

const SEAT_POSITIONS = [
	'r1c1',
	'r1c2',
	'r2c1',
	'r2c2',
	'r3c1',
	'r3c2',
];

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
		<div className={`room-diagram room-diagram--${mode}`}>
			<div className="room-sidebar">
				<div className="room-sidebar-label">ボードゲーム</div>
			</div>

			<div className="room-legend">
				<div className="legend-item"><span className="legend-dot empty"/> 空席</div>
				<div className="legend-item"><span className="legend-dot occupied"/> 使用中</div>
			</div>

			<div className="room-floor">
				{TABLE_POSITIONS.map((pos, index) => {
					const tableNum = index + 1;
					const tableSeats = getTableSeatsInfo(tableNum, unitSeats, inside);

					return (
						<div key={`table-${tableNum}`} className={`room-table room-table--row-${pos.row} room-table--col-${pos.col}`}>
							<div className="room-table-label">テーブル {tableNum}</div>
							{tableSeats.map((seatInfo, seatIndex) => {
								const isOccupied = !!seatInfo.occupiedByInsideId;
								const seatId = seatInfo.id;
								const insideId = seatInfo.occupiedByInsideId;
								const course = isOccupied && insideId ? courseMap.get(inside.find((item) => item.id === insideId)?.courseId ?? '') : null;
								const isSeatSelected = mode === 'select' ? selectedSeatIds?.has(seatId) : false;
								const isGroupSelected = mode === 'view' && isOccupied && !!insideId && selectedInsideIds?.has(insideId);
								const isFocusedInside = mode === 'view' && isOccupied && !!insideId && focusInsideId === insideId;
								const positionClass = `room-seat--${SEAT_POSITIONS[seatIndex]}`;

								return (
									<div
										key={seatId}
										className={`room-seat ${positionClass} ${isOccupied ? 'occupied' : 'empty'} ${
											isSeatSelected || isGroupSelected ? 'selected' : ''
										} ${isFocusedInside ? 'focused' : ''}`}
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
										<div className="status-dot-wrapper">
											<div className={`status-dot ${isOccupied ? 'occupied' : 'empty'}`} />
										</div>
										{mode === 'select' ? (
											<div className="room-seat-select-content">
												<div className="room-seat-number">{seatInfo.seatIndex + 1}</div>
												<div className="room-seat-status">
													{isOccupied ? '使用中' : isSeatSelected ? '選択中' : '空席'}
												</div>
											</div>
										) : isOccupied ? (
											<div className="room-seat-view-content">
												<div className="room-seat-info">
													<div className="room-seat-line1">
														<span className="room-seat-name">席 {seatInfo.seatIndex + 1}</span>
														<span className="room-seat-count">{seatInfo.occupantSize}名</span>
													</div>
													<div className="room-seat-line2">
														<span className="room-seat-course">{course?.name ?? '?'}</span>
														<span className="room-seat-remaining">残り {seatInfo.remainingMinutes}分</span>
													</div>
													<div className={`seat-tooltip ${tooltipSeatId === seatId ? 'open' : ''}`}>
														<div className="tooltip-name">{insideMap.get(insideId ?? '')?.id ?? '不明'}</div>
														<div className="tooltip-course">{course?.name ?? '?'}</div>
														<div className="tooltip-remaining">残り {seatInfo.remainingMinutes}分</div>
													</div>
												</div>
												<div className="room-seat-actions">
													{mode === 'view' && isOccupied && insideId && onInsideClick && (
														<button
															className="btn-seat-details"
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
															className="btn-seat-checkout"
															onClick={(e) => {
																e.stopPropagation();
																onCheckout(insideId);
															}}
														>
															退店
														</button>
													)}
													{multiSelectMode && insideId && isGroupSelected && (
														<div className="seat-select-checkbox">✓</div>
													)}
												</div>
											</div>
										) : (
											<div className="room-seat-empty-content">
												<div className="room-seat-number">席 {seatInfo.seatIndex + 1}</div>
												<div className="room-seat-status">空席</div>
											</div>
										)}
										</div>
				)})}
						</div>
					);
				})}
			</div>

			<div className="room-entrance">
				<div className="room-entrance-icon" aria-hidden>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M5 12h14" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						<path d="M13 6l6 6-6 6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>
				<div className="room-entrance-label">入口</div>
			</div>
		</div>
	);
}