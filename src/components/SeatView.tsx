import React, { useState } from 'react';
import { UnitSeat, Inside, Course } from '../types';
import RoomDiagram from './RoomDiagram';

type Props = {
	unitSeats: UnitSeat[];
	inside: Inside[];
	courses: Course[];
	onCheckout: (id: string) => void;
	onDelete: (id: string) => void;
	onSelectInside: (id: string) => void;
};

export default function SeatView({ unitSeats, inside, courses, onCheckout, onDelete, onSelectInside }: Props) {
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const [selectedInsideIds, setSelectedInsideIds] = useState<Set<string>>(new Set());

	const handleSeatClick = (_seatId: string, insideId?: string) => {
		if (!insideId || !multiSelectMode) return;
		const next = new Set(selectedInsideIds);
		if (next.has(insideId)) next.delete(insideId);
		else next.add(insideId);
		setSelectedInsideIds(next);
	};

	return (
		<div className="seat-view">
			<div className="seat-view-header">
				<div>
					<h2>座席管理</h2>
					<div className="seat-view-subtitle">入口から見た教室配置</div>
				</div>
				<button
					className="toggle-button"
					onClick={() => {
						setMultiSelectMode(!multiSelectMode);
						if (!multiSelectMode) setSelectedInsideIds(new Set());
					}}
				>
					{multiSelectMode ? '単一選択に戻す' : '複数選択モード'}
				</button>
			</div>

			<RoomDiagram
				unitSeats={unitSeats}
				inside={inside}
				courses={courses}
				mode="view"
				multiSelectMode={multiSelectMode}
				selectedInsideIds={selectedInsideIds}
				onSeatClick={handleSeatClick}
				onInsideClick={onSelectInside}
				onCheckout={onCheckout}
			/>

			{multiSelectMode && selectedInsideIds.size > 0 && (
				<div className="seat-view-actions">
					<div className="selected-info">{selectedInsideIds.size}団体選択中</div>
					<div className="action-buttons">
						<button
							className="btn-action btn-checkout-multi"
							onClick={() => {
								Array.from(selectedInsideIds).forEach((id) => onCheckout(id));
								setMultiSelectMode(false);
								setSelectedInsideIds(new Set());
							}}
						>
							選択団体を退店
						</button>
						<button
							className="btn-action btn-delete-multi"
							onClick={() => {
								Array.from(selectedInsideIds).forEach((id) => onDelete(id));
								setMultiSelectMode(false);
								setSelectedInsideIds(new Set());
							}}
						>
							選択団体を削除
						</button>
						<button
							className="btn-action btn-cancel"
							onClick={() => {
								setMultiSelectMode(false);
								setSelectedInsideIds(new Set());
							}}
						>
							キャンセル
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
