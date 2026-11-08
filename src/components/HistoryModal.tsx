import React, { useMemo } from 'react';
import { HISTORY_DAYS } from '../constants';
import { Course, HistoryEntry } from '../types';
import { groupHistoryByDate, humanLabelForDate } from '../utils';
import styles from './HistoryModal.module.css';

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
				<p className={styles.periodNote}>直近{HISTORY_DAYS}日分を表示しています</p>
				{history.length === 0 ? (
					<p>履歴はありません</p>
				) : (
					<div className={styles.scroll}>
						{keys.map((day) => {
							const items = map.get(day) || [];
							const dayTotal = items.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
							const courseCounts = courses.map((course) => ({
								id: course.id,
								name: course.name,
								count: items.reduce((sum, entry) => sum + (entry.courseId === course.id ? (entry.size ?? 0) : 0), 0),
							}));

							return (
								<div key={day} className={styles.day}>
									<div className={styles.dayTitle}>
										{humanLabelForDate(day)} — 合計: {dayTotal}名
									</div>
									<div className={styles.daySummary}>
										{courseCounts.map((courseCount) => (
											<span key={courseCount.id} className={styles.courseCount}>
												{courseCount.name}: {courseCount.count}名
											</span>
										))}
									</div>
									<ul className={styles.entries}>
										{items.map((entry) => {
											const course = courses.find((item) => item.id === entry.courseId);
											return (
												<li key={entry.id} className={`card ${styles.entry}`}>
													<div className={styles.entryRow}>
														<div>
															<div className={styles.entryTitle}>
																{entry.size}名 {entry.note ? `- ${entry.note}` : ''}
															</div>
															<div className={styles.entryMeta}>
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
				<div className={styles.footer}>
					<button className="secondary" onClick={onClose}>
						閉じる
					</button>
				</div>
			</div>
		</div>
	);
}
