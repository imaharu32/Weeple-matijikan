import React, { CSSProperties, useState } from 'react';
import { Course, Inside } from '../types';
import { describeSeats, elapsedRatio, formatTime, GroupColor, remainingStatus } from '../utils';
import Panel, { PanelEmpty } from './ui/Panel';
import styles from './InsideList.module.css';

type Props = {
	inside: Inside[];
	courses: Course[];
	groupColors: Map<string, GroupColor>;
	onCheckout: (insideId: string) => void;
	onOpenDetail: (insideId: string) => void;
};

const TONE_CHIP = { danger: 'chip chip-danger', warning: 'chip chip-warning', normal: 'chip' } as const;

export default function InsideList({ inside, courses, groupColors, onCheckout, onOpenDetail }: Props) {
	const [selectMode, setSelectMode] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const people = inside.reduce((sum, entry) => sum + entry.size, 0);
	// 退店予定が近い順
	const sorted = [...inside].sort((a, b) => a.exitAt.localeCompare(b.exitAt));

	const exitSelectMode = () => {
		setSelectMode(false);
		setSelected(new Set());
	};
	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	return (
		<Panel
			title="店内"
			badge={`${inside.length}組・${people}名`}
			description="退店予定が近い順です。色は座席図と同じです。"
			actions={
				!selectMode && (
					<button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectMode(true)} disabled={inside.length === 0}>
						まとめて退店
					</button>
				)
			}
			footer={
				selectMode && (
					<div className={styles.bulkBar}>
						<span className={styles.bulkCount}>
							{selected.size === 0 ? '退店する組を選んでください' : `${selected.size}組を選択中`}
						</span>
						<button type="button" className="btn btn-ghost btn-sm" onClick={exitSelectMode}>
							やめる
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={selected.size === 0}
							onClick={() => {
								selected.forEach((id) => onCheckout(id));
								exitSelectMode();
							}}
						>
							選んだ組を退店
						</button>
					</div>
				)
			}
		>
			{inside.length === 0 ? (
				<PanelEmpty title="店内にお客さんはいません" description="待ち列の「席を選んで入店」から案内すると、ここに表示されます。" />
			) : (
				<ul className={styles.list}>
					{sorted.map((entry) => {
						const course = courses.find((item) => item.id === entry.courseId);
						const remaining = remainingStatus(entry.exitAt);
						const color = groupColors.get(entry.id);
						const isSelected = selected.has(entry.id);
						const progress = elapsedRatio(entry.enterAt, entry.exitAt);
						const colorVars = { '--group-bg': color?.bg, '--group-fg': color?.fg } as CSSProperties;

						const content = (
							<>
								<div className={styles.head}>
									<span className={styles.dot} aria-hidden />
									{selectMode ? (
										<span className={entry.note ? styles.name : styles.noName}>{entry.note || 'メモなし'}</span>
									) : (
										// 名前（メモ）を押すと詳細を開く
										<button
											type="button"
											className={`${entry.note ? styles.name : styles.noName} ${styles.nameButton}`}
											onClick={() => onOpenDetail(entry.id)}
											title="この組の詳細を開く"
										>
											{entry.note || 'メモなし'}
										</button>
									)}
									<span className={`${styles.size} num`}>{entry.size}名</span>
								</div>
								<div className={styles.info}>
									{course?.name ?? entry.courseId} ・ {describeSeats(entry.seats)}
								</div>
								<div className={styles.time}>
									<span className={TONE_CHIP[remaining.tone]}>{remaining.label}</span>
									<span className={styles.exitAt}>{formatTime(entry.exitAt)} 退店予定</span>
								</div>
								<div className={styles.progress} aria-hidden>
									<div className={`${styles.progressBar} ${styles[remaining.tone]}`} style={{ width: `${progress * 100}%` }} />
								</div>
							</>
						);

						return (
							<li key={entry.id} style={colorVars}>
								{selectMode ? (
									<label className={`${styles.card} ${styles.selectable} ${isSelected ? styles.selected : ''}`}>
										<input type="checkbox" className={styles.checkbox} checked={isSelected} onChange={() => toggle(entry.id)} />
										<div className={styles.content}>{content}</div>
									</label>
								) : (
									<div className={styles.card}>
										<div className={styles.content}>
											{content}
											<div className={styles.actions}>
												<button type="button" className="btn btn-secondary btn-sm" onClick={() => onCheckout(entry.id)}>
													退店する
												</button>
												<button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenDetail(entry.id)}>
													詳細・編集
												</button>
											</div>
										</div>
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}
