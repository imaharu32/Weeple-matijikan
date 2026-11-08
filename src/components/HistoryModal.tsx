import React, { useMemo } from 'react';
import { HISTORY_DAYS } from '../constants';
import { Course, HistoryEntry } from '../types';
import { groupHistoryByDate, humanLabelForDate } from '../utils';

type Props = {
	history: HistoryEntry[];
	courses: Course[];
	onRemove: (historyId: string) => void;
	onClose: () => void;
};

export default function HistoryModal({ history, courses, onRemove, onClose }: Props) {
	const { keys, map } = useMemo(() => groupHistoryByDate(history), [history]);

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<h3>退店履歴</h3>
				<p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>直近{HISTORY_DAYS}日分を表示しています</p>
				{history.length === 0 ? (
					<p>履歴はありません</p>
				) : (
					<div style={{ maxHeight: '60vh', overflow: 'auto' }}>
						{keys.map((day) => {
							const items = map.get(day) || [];
							const dayTotal = items.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
							const courseCounts = courses.map((course) => ({
								id: course.id,
								name: course.name,
								count: items.reduce((sum, entry) => sum + (entry.courseId === course.id ? (entry.size ?? 0) : 0), 0),
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
										{items.map((entry) => {
											const course = courses.find((item) => item.id === entry.courseId);
											return (
												<li key={entry.id} className="card" style={{ marginBottom: 6 }}>
													<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
														<div>
															<div style={{ fontWeight: 700 }}>
																{entry.size}名 {entry.note ? `- ${entry.note}` : ''}
															</div>
															<div style={{ color: '#666', fontSize: 13 }}>
																{course ? course.name : (entry.courseId ?? 'コース未設定')} ／ 退店:{' '}
																{new Date(entry.exitAt).toLocaleString()}
															</div>
														</div>
														<div>
															<button className="secondary" onClick={() => onRemove(entry.id)}>
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
					<button className="secondary" onClick={onClose}>
						閉じる
					</button>
				</div>
			</div>
		</div>
	);
}
