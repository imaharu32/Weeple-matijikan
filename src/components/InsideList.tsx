import React, { useState } from 'react';
import { Inside, Course } from '../types';
import { getRemainingMinutes } from '../utils';

type Props = {
	inside: Inside[];
	courses: Course[];
	onCheckout: (id: string) => void;
	onDelete: (id: string) => void;
	onUpdateInside: (id: string, size: number, note: string) => void;
	onSelectInside: (id: string) => void;
	onMultiSelect: (ids: string[]) => void;
	selectedInside: Set<string>;
	nowTick?: number;
};

export default function InsideList({
	inside,
	courses,
	onCheckout,
	onDelete,
	onUpdateInside,
	onSelectInside,
	onMultiSelect,
	selectedInside,
	nowTick,
}: Props) {
	// reference nowTick so component re-renders periodically
	void nowTick;
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const findCourse = (id: string) => courses.find((c) => c.id === id);

	const sorted = [...inside].sort(
		(a, b) => new Date(a.exitAt).getTime() - new Date(b.exitAt).getTime()
	);

	const handleInsideClick = (id: string) => {
		if (multiSelectMode) {
			const newSelected = new Set(selectedInside);
			if (newSelected.has(id)) {
				newSelected.delete(id);
			} else {
				newSelected.add(id);
			}
			onMultiSelect(Array.from(newSelected));
			return;
		}
		onSelectInside(id);
	};

	return (
		<div className="inside-list">
			<div className="list-header">
				<h3>店内（{inside.reduce((s, p) => s + p.size, 0)}名）</h3>
				<button
					className="toggle-button"
					onClick={() => {
						setMultiSelectMode(!multiSelectMode);
						if (!multiSelectMode) {
							onMultiSelect([]);
						}
					}}
				>
					{multiSelectMode ? '通常に戻す' : '複数選択'}
				</button>
			</div>
			<ul>
				{sorted.map((i) => {
					const remainMin = getRemainingMinutes(i.exitAt);
					const course = findCourse(i.courseId);
					const isSelected = selectedInside.has(i.id);

					return (
						<li
							key={i.id}
							className={`card inside-card ${isSelected ? 'selected' : ''}`}
							onClick={() => handleInsideClick(i.id)}
						>
							<div className="card-left">
								<div className="badge inside-badge editable">
									<input
										type="number"
										min="1"
										value={i.size}
										onChange={(e) => {
											const newSize = Math.max(1, parseInt(e.target.value) || 1);
											onUpdateInside(i.id, newSize, i.note || '');
										}}
										onClick={(e) => e.stopPropagation()}
									/>
									名
								</div>
							</div>
							<div className="card-body">
								<div className="party-note editable">
									<input
										type="text"
										value={i.note || ''}
										placeholder="メモを追加"
										onChange={(e) => onUpdateInside(i.id, i.size, e.target.value)}
										onClick={(e) => e.stopPropagation()}
									/>
								</div>
								{(i.note || '').trim() ? <div className="note-preview">メモ: {i.note}</div> : null}
							<div className={`meta ${remainMin === 0 ? 'zero-wait-time' : ''}`}>
									{course ? course.name : i.courseId} ／ 残り: {remainMin}分
								</div>
								<div className="card-actions">
									<button
										onClick={() => onCheckout(i.id)}
										className="btn-small btn-checkout"
									>
										退店
									</button>
									<button
										onClick={() => onDelete(i.id)}
										className="btn-small btn-secondary"
									>
										削除
									</button>
								</div>
							</div>
						</li>
					);
				})}
			</ul>

			{multiSelectMode && selectedInside.size > 0 && (
				<div className="list-actions">
					<div className="selected-info">{selectedInside.size}組選択中</div>
					<div className="action-buttons">
						<button
							className="btn-action btn-checkout-multi"
							onClick={() => {
								Array.from(selectedInside).forEach((id) => {
									onCheckout(id);
								});
								setMultiSelectMode(false);
								onMultiSelect([]);
							}}
						>
							選択を退店
						</button>
						<button
							className="btn-action btn-delete-multi"
							onClick={() => {
								Array.from(selectedInside).forEach((id) => {
									onDelete(id);
								});
								setMultiSelectMode(false);
								onMultiSelect([]);
							}}
						>
							選択を削除
						</button>
						<button
							className="btn-action btn-cancel"
							onClick={() => {
								setMultiSelectMode(false);
								onMultiSelect([]);
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
