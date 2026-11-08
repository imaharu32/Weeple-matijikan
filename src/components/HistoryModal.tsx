import React, { useMemo } from 'react';
import { HISTORY_DAYS } from '../constants';
import { Course, HistoryEntry } from '../types';
import { formatTime, groupHistoryByDate, humanLabelForDate } from '../utils';
import Modal from './ui/Modal';
import styles from './HistoryModal.module.css';

type Props = {
	history: HistoryEntry[];
	/** 読み込み中（開いた直後） */
	loading?: boolean;
	courses: Course[];
	onRemove: (historyId: string) => void;
	onClose: () => void;
};

export default function HistoryModal({ history, loading = false, courses, onRemove, onClose }: Props) {
	const { keys, map } = useMemo(() => groupHistoryByDate(history), [history]);

	return (
		<Modal
			size="lg"
			title="退店履歴"
			subtitle={`直近${HISTORY_DAYS}日分を、日付ごとに新しい順で表示しています。`}
			onClose={onClose}
			footer={
				<button type="button" className="btn btn-secondary" onClick={onClose}>
					閉じる
				</button>
			}
		>
			{loading ? (
				<p className={styles.empty}>読み込んでいます…</p>
			) : history.length === 0 ? (
				<p className={styles.empty}>まだ退店したお客さんはいません。</p>
			) : (
				<div className={styles.days}>
					{keys.map((day) => {
						const items = map.get(day) || [];
						const dayTotal = items.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
						return (
							<section key={day} className={styles.day}>
								<div className={styles.dayHeader}>
									<h3 className={styles.dayTitle}>{humanLabelForDate(day)}</h3>
									<span className="chip chip-primary">
										合計 {items.length}組・{dayTotal}名
									</span>
									{courses.map((course) => {
										const count = items.reduce((sum, entry) => sum + (entry.courseId === course.id ? (entry.size ?? 0) : 0), 0);
										return (
											<span key={course.id} className="chip">
												{course.name} {count}名
											</span>
										);
									})}
								</div>
								<table className={styles.table}>
									<thead>
										<tr>
											<th scope="col">退店</th>
											<th scope="col">人数</th>
											<th scope="col">メモ</th>
											<th scope="col">コース</th>
											<th scope="col">
												<span className={styles.srOnly}>操作</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{items.map((entry) => {
											const course = courses.find((item) => item.id === entry.courseId);
											return (
												<tr key={entry.id}>
													<td className="num">{formatTime(entry.exitAt)}</td>
													<td className="num">{entry.size}名</td>
													<td className={entry.note ? undefined : styles.muted}>{entry.note || '—'}</td>
													<td>{course ? course.name : (entry.courseId ?? '—')}</td>
													<td className={styles.actionCell}>
														<button
															type="button"
															className="btn btn-ghost btn-sm"
															onClick={() => {
																if (window.confirm('この履歴を削除しますか？')) onRemove(entry.id);
															}}
														>
															削除
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</section>
						);
					})}
				</div>
			)}
		</Modal>
	);
}
