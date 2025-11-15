import React, { useState } from 'react';
import { Party, Course } from '../types';

type Props = {
	queue: Party[];
	courses: Course[];
	onEnter: (partyId: string, courseId: string) => void;
	onRemove: (partyId: string) => void;
	estimates?: Record<string, number>;
};

export default function QueueList({ queue, courses, onEnter, onRemove, estimates }: Props) {
	const avgMinutes =
		courses.length > 0 ? courses.reduce((s, c) => s + c.minutes, 0) / courses.length : 30;
	return (
		<div className="queue-list">
			<h3>列（{queue.length}組）</h3>
			<ul>
				{queue.map((p, idx) => (
					<li key={p.id} className="card queue-card">
						<div className="card-left">
							<div className="badge">{p.size}名</div>
						</div>
						<div className="card-body">
							<div className="party-note">{p.note || 'メモなし'}</div>
							<div className="meta">参加: {new Date(p.joinAt).toLocaleTimeString()}</div>
							<div className="estimate">
								{estimates && estimates[p.id] !== undefined
									? `入店見込み： 約${estimates[p.id]}分`
									: `推定待ち： 約${Math.round(avgMinutes * idx)}分`}
							</div>
							<div className="card-actions">
								<EnterControls party={p} courses={courses} onEnter={onEnter} onRemove={onRemove} />
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function EnterControls({
	party,
	courses,
	onEnter,
	onRemove,
}: {
	party: Party;
	courses: Course[];
	onEnter: (partyId: string, courseId: string) => void;
	onRemove: (partyId: string) => void;
}) {
	const [sel, setSel] = useState<string>(courses[0]?.id ?? '');
	return (
		<div className="enter-controls">
			<select value={sel} onChange={(e) => setSel(e.target.value)}>
				{courses.map((c) => (
					<option key={c.id} value={c.id}>
						{c.name}
					</option>
				))}
			</select>
			<button
				onClick={() => {
					if (!sel) return;
					onEnter(party.id, sel);
				}}
				style={{ marginLeft: 8 }}
			>
				店内に入れる
			</button>
			<button onClick={() => onRemove(party.id)} style={{ marginLeft: 8 }}>
				キャンセル
			</button>
		</div>
	);
}
