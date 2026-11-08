import React from 'react';
import { Inside, UnitSeat } from '../types';
import { GroupColor } from '../utils';
import RoomDiagram from './RoomDiagram';
import Panel from './ui/Panel';
import styles from './SeatView.module.css';

type Props = {
	unitSeats: UnitSeat[];
	inside: Inside[];
	groupColors: Map<string, GroupColor>;
	onOpenInside: (insideId: string) => void;
};

export default function SeatView({ unitSeats, inside, groupColors, onOpenInside }: Props) {
	const usedSeats = inside.reduce((sum, entry) => sum + (entry.seats?.length ?? 0), 0);
	const freeSeats = Math.max(0, unitSeats.length - usedSeats);

	return (
		<Panel
			title="座席"
			badge={`空き ${freeSeats}席`}
			description="入口から見た配置です。色の付いた席や組の名前をクリックすると詳細を開きます。"
			actions={
				<div className={styles.legend} aria-label="凡例">
					<span className={styles.legendItem}>
						<span className={`${styles.swatch} ${styles.swatchEmpty}`} />
						空席
					</span>
					<span className={styles.legendItem}>
						<span className={`${styles.swatch} ${styles.swatchUsed}`} />
						使用中（組ごとに色分け）
					</span>
				</div>
			}
		>
			<RoomDiagram
				unitSeats={unitSeats}
				inside={inside}
				groupColors={groupColors}
				mode="view"
				onSeatClick={(_seatId, insideId) => insideId && onOpenInside(insideId)}
				onGroupClick={onOpenInside}
			/>
		</Panel>
	);
}
