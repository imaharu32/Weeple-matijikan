import React from 'react';
import { Party } from '../types';
import { formatTime, minutesSince } from '../utils';
import Panel, { PanelEmpty } from './ui/Panel';
import styles from './QueueList.module.css';

type Props = {
	queue: Party[];
	/** partyId → 入店までの見込み（分） */
	estimates: Record<string, number>;
	onEnter: (party: Party) => void;
	onEdit: (party: Party) => void;
	onRemove: (partyId: string) => void;
};

export default function QueueList({ queue, estimates, onEnter, onEdit, onRemove }: Props) {
	const people = queue.reduce((sum, party) => sum + party.size, 0);

	return (
		<Panel title="待ち列" badge={`${queue.length}組・${people}名`} description="来た順に並んでいます。案内するときは「席を選んで入店」を押します。">
			{queue.length === 0 ? (
				<PanelEmpty title="待っているお客さんはいません" description="お客さんが来たら、右上の「＋ 列に追加」から登録します。" />
			) : (
				<ol className={styles.list}>
					{queue.map((party, index) => {
						const estimate = estimates[party.id];
						return (
							<li key={party.id} className={styles.card}>
								<div className={styles.head}>
									<span className={`${styles.order} num`} aria-label={`${index + 1}番目`}>
										{index + 1}
									</span>
									<div className={styles.who}>
										<span className={styles.size}>
											<span className="num">{party.size}</span>名
										</span>
										<span className={party.note ? styles.note : styles.noNote}>{party.note || 'メモなし'}</span>
									</div>
								</div>

								<div className={styles.status}>
									{estimate === 0 ? (
										<span className="chip chip-success">すぐ案内できます</span>
									) : estimate !== undefined ? (
										<span className="chip">入店まで 約{estimate}分</span>
									) : null}
									<span className={styles.waited}>
										{formatTime(party.joinAt)} から {minutesSince(party.joinAt)}分待ち
									</span>
								</div>

								<div className={styles.actions}>
									<button type="button" className={`btn btn-primary ${styles.enter}`} onClick={() => onEnter(party)}>
										席を選んで入店
									</button>
									<button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(party)}>
										編集
									</button>
									<button
										type="button"
										className="btn btn-ghost btn-sm"
										onClick={() => {
											if (window.confirm(`${party.size}名${party.note ? `（${party.note}）` : ''}を列から外しますか？`)) {
												onRemove(party.id);
											}
										}}
									>
										列から外す
									</button>
								</div>
							</li>
						);
					})}
				</ol>
			)}
		</Panel>
	);
}
