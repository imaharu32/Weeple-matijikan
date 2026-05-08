import React, { useState } from 'react';
import { Party, Course } from '../types';

type Props = {
	queue: Party[];
	courses: Course[];
	onEnter: (partyId: string) => void;
	onRemove: (partyId: string) => void;
	onUpdateParty: (partyId: string, size: number, note: string) => void;
	onMultiSelect: (partyIds: string[]) => void;
	selectedParties: Set<string>;
	estimates?: Record<string, number>;
};

export default function QueueList({
	queue,
	courses,
	onEnter,
	onRemove,
	onUpdateParty,
	onMultiSelect,
	selectedParties,
	estimates,
}: Props) {
	const [multiSelectMode, setMultiSelectMode] = useState(false);
	const avgMinutes =
		courses.length > 0 ? courses.reduce((sum, course) => sum + course.minutes, 0) / courses.length : 30;

	const handlePartyClick = (partyId: string) => {
		if (!multiSelectMode) return;
		const nextSelected = new Set(selectedParties);
		if (nextSelected.has(partyId)) {
			nextSelected.delete(partyId);
		} else {
			nextSelected.add(partyId);
		}
		onMultiSelect(Array.from(nextSelected));
	};

	return (
		<div className="queue-list">
			<div className="list-header">
				<h3>列（{queue.length}組）</h3>
				<button
					className="toggle-button"
					onClick={() => {
						setMultiSelectMode((current) => !current);
						if (!multiSelectMode) {
							onMultiSelect([]);
						}
					}}
				>
					{multiSelectMode ? '通常に戻す' : '複数選択'}
				</button>
			</div>

			<ul>
				{queue.map((party, index) => (
					<li
						key={party.id}
						className={`card queue-card ${selectedParties.has(party.id) ? 'selected' : ''}`}
						onClick={() => handlePartyClick(party.id)}
					>
						<div className="card-left">
							<div className="badge editable">
								<input
									type="number"
									min="1"
									value={party.size}
									onChange={(e) => {
										const newSize = Math.max(1, parseInt(e.target.value) || 1);
										onUpdateParty(party.id, newSize, party.note || '');
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
									value={party.note || ''}
									placeholder="メモを追加"
									onChange={(e) => onUpdateParty(party.id, party.size, e.target.value)}
									onClick={(e) => e.stopPropagation()}
								/>
							</div>
							<div className="meta">参加: {new Date(party.joinAt).toLocaleTimeString()}</div>
							<div className="estimate">
								{estimates && estimates[party.id] !== undefined
									? `入店見込み： 約${estimates[party.id]}分`
									: `推定待ち： 約${Math.round(avgMinutes * index)}分`}
							</div>
							<div className="card-actions">
								<EnterControls party={party} onEnter={onEnter} onRemove={onRemove} />
							</div>
						</div>
					</li>
				))}
			</ul>

			{multiSelectMode && selectedParties.size > 0 && (
				<div className="list-actions">
					<div className="selected-info">{selectedParties.size}組選択中</div>
					<div className="action-buttons">
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

function EnterControls({
	party,
	onEnter,
	onRemove,
}: {
	party: Party;
	onEnter: (partyId: string) => void;
	onRemove: (partyId: string) => void;
}) {

	return (
		<div className="enter-controls">
			<button
				onClick={() => {
					onEnter(party.id);
				}}
				className="btn-small primary"
			>
				入店
			</button>
			<button onClick={() => onRemove(party.id)} className="btn-small btn-secondary">
				キャンセル
			</button>
		</div>
	);
}

