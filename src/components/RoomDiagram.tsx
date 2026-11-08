import React, { CSSProperties } from 'react';
import { Inside, UnitSeat } from '../types';
import { GroupColor, remainingStatus } from '../utils';
import styles from './RoomDiagram.module.css';

type Props = {
	unitSeats: UnitSeat[];
	inside: Inside[];
	groupColors: Map<string, GroupColor>;
	/**
	 * view:   使用中の席をクリックすると、その組を開く
	 * select: 空いている席をクリックして選ぶ（入店時）
	 * edit:   editingInsideId の組の席を、クリックで追加・削除する（詳細画面）
	 */
	mode: 'view' | 'select' | 'edit';
	/** select / edit: 選んでいる席 */
	selectedSeatIds?: Set<string>;
	/** edit: 席を編集している組 */
	editingInsideId?: string;
	/** view: この組だけを目立たせる */
	highlightInsideId?: string;
	onSeatClick?: (seatId: string, insideId?: string) => void;
	/** view: テーブルの上の組の名前を押したとき */
	onGroupClick?: (insideId: string) => void;
};

const TABLE_COUNT = 6;
const SEATS_PER_TABLE = 6;
/** テーブルの左側・右側に並ぶ席の番号（0始まり）。席番号は 1・2 が手前の行 */
const LEFT_SEATS = [0, 2, 4];
const RIGHT_SEATS = [1, 3, 5];

const cx = (...names: Array<string | false | undefined>) => names.filter(Boolean).join(' ');

export default function RoomDiagram({
	unitSeats,
	inside,
	groupColors,
	mode,
	selectedSeatIds,
	editingInsideId,
	highlightInsideId,
	onSeatClick,
	onGroupClick,
}: Props) {
	// edit では、編集中の組の席を「いま選んでいる席」に置き換えて表示する
	const shownInside =
		mode === 'edit' && editingInsideId
			? inside.map((entry) =>
					entry.id === editingInsideId
						? {
								...entry,
								seats: unitSeats
									.filter((seat) => selectedSeatIds?.has(seat.id))
									.map((seat) => ({ id: seat.id, tableNumber: seat.tableNumber, seatIndex: seat.seatIndex })),
							}
						: entry
				)
			: inside;
	const focusId = mode === 'edit' ? editingInsideId : highlightInsideId;

	// 席 id → 使っている組
	const seatOwner = new Map<string, Inside>();
	shownInside.forEach((entry) => entry.seats?.forEach((seat) => seatOwner.set(seat.id, entry)));

	const colorVars = (entry?: Inside) => {
		const color = entry ? groupColors.get(entry.id) : undefined;
		return color ? ({ '--group-bg': color.bg, '--group-fg': color.fg } as CSSProperties) : undefined;
	};

	const renderSeat = (seat: UnitSeat | undefined) => {
		if (!seat) return <div className={styles.seatPlaceholder} />;
		const owner = seatOwner.get(seat.id);
		const number = seat.seatIndex + 1;
		const place = `テーブル${seat.tableNumber} 席${number}`;

		if (mode === 'select') {
			const isSelected = selectedSeatIds?.has(seat.id) ?? false;
			return (
				<button
					type="button"
					className={cx(styles.seat, owner ? styles.taken : isSelected ? styles.chosen : styles.free)}
					disabled={!!owner}
					aria-pressed={isSelected}
					aria-label={`${place}${owner ? '（使用中）' : isSelected ? '（選択中）' : ''}`}
					onClick={() => onSeatClick?.(seat.id)}
				>
					<span className={styles.seatNumber}>{isSelected ? '✓' : number}</span>
					{owner && <span className={styles.seatState}>使用中</span>}
				</button>
			);
		}

		if (mode === 'edit') {
			// この組の席: クリックで外す
			if (owner && owner.id === editingInsideId) {
				return (
					<button
						type="button"
						className={cx(styles.seat, styles.occupied, styles.removable)}
						style={colorVars(owner)}
						aria-pressed="true"
						aria-label={`${place}（この組の席。クリックで外す）`}
						title="クリックでこの席を外す"
						onClick={() => onSeatClick?.(seat.id)}
					>
						<span className={styles.seatNumber}>{number}</span>
						<span className={styles.hoverMark}>外す</span>
					</button>
				);
			}
			// ほかの組の席: 選べない
			if (owner) {
				return (
					<div
						className={cx(styles.seat, styles.occupied, styles.dimmed)}
						style={colorVars(owner)}
						aria-label={`${place}（${owner.note || 'メモなし'}が使用中）`}
					>
						<span className={styles.seatNumber}>{number}</span>
					</div>
				);
			}
			// 空いている席: クリックで追加
			return (
				<button
					type="button"
					className={cx(styles.seat, styles.empty, styles.addable)}
					aria-pressed="false"
					aria-label={`${place}（空席。クリックで追加）`}
					title="クリックでこの席を追加"
					onClick={() => onSeatClick?.(seat.id)}
				>
					<span className={styles.seatNumber}>{number}</span>
					<span className={styles.hoverMark}>＋</span>
				</button>
			);
		}

		if (!owner) {
			return (
				<div className={cx(styles.seat, styles.empty)} aria-label={`${place}（空席）`}>
					<span className={styles.seatNumber}>{number}</span>
				</div>
			);
		}
		const dimmed = !!focusId && owner.id !== focusId;
		return (
			<button
				type="button"
				className={cx(styles.seat, styles.occupied, dimmed && styles.dimmed)}
				style={colorVars(owner)}
				title={`${owner.note || 'メモなし'}（${owner.size}名）の詳細を開く`}
				aria-label={`${place}：${owner.note || 'メモなし'} ${owner.size}名`}
				onClick={() => onSeatClick?.(seat.id, owner.id)}
				disabled={!onSeatClick}
			>
				<span className={styles.seatNumber}>{number}</span>
			</button>
		);
	};

	return (
		<div className={styles.room}>
			<div className={styles.shelf}>ボードゲーム棚</div>
			<div className={styles.floor}>
				{Array.from({ length: TABLE_COUNT }, (_, t) => {
					const tableNumber = t + 1;
					const seats = unitSeats
						.filter((seat) => seat.tableNumber === tableNumber)
						.sort((a, b) => a.seatIndex - b.seatIndex);
					const seatAt = (index: number) => seats.find((seat) => seat.seatIndex === index);
					const groups = Array.from(
						new Map(seats.map((seat) => seatOwner.get(seat.id)).filter((e): e is Inside => !!e).map((e) => [e.id, e])).values()
					);
					const freeCount = seats.filter((seat) => !seatOwner.has(seat.id)).length;

					return (
						<div key={tableNumber} className={styles.table}>
							<div className={styles.tableHeader}>
								<span className={styles.tableName}>テーブル {tableNumber}</span>
								<span className={cx(styles.tableFree, freeCount === 0 && styles.tableFull)}>
									{freeCount === 0 ? '満席' : `空き ${freeCount} / ${SEATS_PER_TABLE}`}
								</span>
							</div>
							<div className={styles.tableBody}>
								<div className={styles.seatColumn}>{LEFT_SEATS.map((i) => <React.Fragment key={i}>{renderSeat(seatAt(i))}</React.Fragment>)}</div>
								<div className={styles.surface}>
									{mode !== 'select' &&
										groups.map((entry) => {
											const remaining = remainingStatus(entry.exitAt);
											const dimmed = !!focusId && entry.id !== focusId;
											const label = (
												<>
													<span className={styles.groupName}>{entry.note || 'メモなし'}</span>
													<span className={styles.groupMeta}>
														{entry.size}名・<span className={cx(styles.groupTime, styles[remaining.tone])}>{remaining.label}</span>
													</span>
												</>
											);
											return mode === 'view' && onGroupClick ? (
												<button
													key={entry.id}
													type="button"
													className={cx(styles.groupLabel, styles.groupButton, dimmed && styles.dimmed)}
													style={colorVars(entry)}
													onClick={() => onGroupClick(entry.id)}
													title="この組の詳細を開く"
												>
													{label}
												</button>
											) : (
												<div key={entry.id} className={cx(styles.groupLabel, dimmed && styles.dimmed)} style={colorVars(entry)}>
													{label}
												</div>
											);
										})}
								</div>
								<div className={styles.seatColumn}>{RIGHT_SEATS.map((i) => <React.Fragment key={i}>{renderSeat(seatAt(i))}</React.Fragment>)}</div>
							</div>
						</div>
					);
				})}
			</div>
			<div className={styles.entrance}>
				<span aria-hidden>▼</span> 入口
			</div>
		</div>
	);
}
