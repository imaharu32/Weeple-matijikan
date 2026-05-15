import React, { useEffect, useMemo, useState } from 'react';
import { Course, Inside, UnitSeat } from '../types';
import RoomDiagram from './RoomDiagram';

type Props = {
	inside: Inside;
	courses: Course[];
	unitSeats: UnitSeat[];
	onClose: () => void;
	onSave: (id: string, updates: Partial<Inside>) => void | Promise<void>;
	onCheckout: (id: string) => void;
	onDelete: (id: string) => void;
};

export default function InsideDetailModal({ inside, courses, unitSeats, onClose, onSave, onCheckout, onDelete }: Props) {
	const [size, setSize] = useState<number>(inside.size);
	const [note, setNote] = useState<string>(inside.note ?? '');
	const [courseId, setCourseId] = useState<string>(inside.courseId);
	const [extraMinutes, setExtraMinutes] = useState<number>(0);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setSize(inside.size);
		setNote(inside.note ?? '');
		setCourseId(inside.courseId);
		setExtraMinutes(0);
	}, [inside.id, inside.size, inside.note, inside.courseId]);

	const selectedCourse = useMemo(
		() => courses.find((course) => course.id === courseId) ?? courses.find((course) => course.id === inside.courseId) ?? null,
		[courses, courseId, inside.courseId]
	);

	const baseMinutes = (selectedCourse?.minutes ?? 0) + 15;
	const previewExitAt = useMemo(() => {
		const enterAtMs = new Date(inside.enterAt).getTime();
		const nextMinutes = Math.max(0, baseMinutes + Math.max(0, extraMinutes));
		return new Date(enterAtMs + nextMinutes * 60000).toISOString();
	}, [inside.enterAt, baseMinutes, extraMinutes]);

	const remainingMinutes = Math.max(0, Math.ceil((new Date(inside.exitAt).getTime() - Date.now()) / 60000));
	const previewRemainingMinutes = Math.max(0, Math.ceil((new Date(previewExitAt).getTime() - Date.now()) / 60000));
	const seatLabels = inside.seats.map((seat) => `T${seat.tableNumber}-${seat.seatIndex + 1}`);

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await onSave(inside.id, {
				size,
				note,
				courseId: selectedCourse?.id ?? inside.courseId,
				exitAt: previewExitAt,
				seats: inside.seats,
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content inside-detail-modal" onClick={(e) => e.stopPropagation()}>
				<div className="inside-detail-header">
					<div>
						<h3>{inside.note ? inside.note : '店内客の詳細'}</h3>
						<div className="inside-detail-subtitle">
							入店: {new Date(inside.enterAt).toLocaleString()} / 退店見込み: {previewRemainingMinutes}分
						</div>
					</div>
					<button className="secondary" onClick={onClose}>
						閉じる
					</button>
				</div>

				<div className="inside-detail-grid">
					<div className="inside-detail-panel">
						<label className="inside-detail-field">
							<span>人数</span>
							<input
								type="number"
								min={1}
								value={size}
								onChange={(e) => setSize(Math.max(1, Number(e.target.value) || 1))}
							/>
						</label>

						<label className="inside-detail-field">
							<span>コース</span>
							<select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
								{courses.map((course) => (
									<option key={course.id} value={course.id}>
										{course.name}
									</option>
								))}
							</select>
						</label>

						<div className="inside-detail-field">
							<span>メモ</span>
							<textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder="メモを入力"
								rows={4}
							/>
						</div>

						<div className="inside-detail-field">
							<span>延長</span>
							<div className="inside-detail-extension-row">
								<button type="button" className="secondary" onClick={() => setExtraMinutes((current) => current + 15)}>
									+15分
								</button>
								<button type="button" className="secondary" onClick={() => setExtraMinutes((current) => current + 30)}>
									+30分
								</button>
								<input
									type="number"
									min={0}
									value={extraMinutes}
									onChange={(e) => setExtraMinutes(Math.max(0, Number(e.target.value) || 0))}
									placeholder="分"
								/>
							</div>
						</div>

						<div className="inside-detail-summary">
							<div>現在の残り: {remainingMinutes}分</div>
							<div>保存後の見込み: {previewRemainingMinutes}分</div>
							<div>席: {seatLabels.length > 0 ? seatLabels.join(' / ') : '未設定'}</div>
						</div>

						<div className="inside-detail-actions">
							<button className="secondary" onClick={() => onCheckout(inside.id)}>
								退店
							</button>
							<button className="secondary" onClick={() => onDelete(inside.id)}>
								削除
							</button>
							<button className="primary" onClick={handleSave} disabled={isSaving}>
								{isSaving ? '保存中...' : '保存'}
							</button>
						</div>
					</div>

					<div className="inside-detail-panel inside-detail-panel--diagram">
						<div className="inside-detail-field inside-detail-field--label">いる席（図）</div>
						<RoomDiagram
							unitSeats={unitSeats}
							inside={[inside]}
							courses={courses}
							mode="view"
							selectedInsideIds={new Set([inside.id])}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}