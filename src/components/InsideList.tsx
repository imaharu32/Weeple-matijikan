import React from 'react';
import { Inside, Course } from '../types';

type Props = {
	inside: Inside[];
	courses: Course[];
	onCheckout: (id: string) => void; // 退店して履歴に記録
	onDelete: (id: string) => void;   // 履歴に残さず削除
};

export default function InsideList({ inside, courses, onCheckout, onDelete }: Props) {
	const findCourse = (id: string) => courses.find((c) => c.id === id);
	const now = Date.now();

	// exitAt（残り時間）で昇順にソートして、早く出る順に表示する
	const sorted = [...inside].sort(
		(a, b) => new Date(a.exitAt).getTime() - new Date(b.exitAt).getTime()
	);

	return (
		<div className="inside-list">
			<h3>店内（{inside.reduce((s, p) => s + p.size, 0)}名）</h3>
			<ul>
				{sorted.map((i) => {
					const exit = new Date(i.exitAt).getTime();
					const remainMs = Math.max(0, exit - now);
					const remainMin = Math.ceil(remainMs / 60000);
					const course = findCourse(i.courseId);
					return (
						<li key={i.id} className="card inside-card">
							<div className="card-left">
								<div className="badge inside-badge">{i.size}名</div>
							</div>
							<div className="card-body">
								<div className="party-note">{i.note || 'メモなし'}</div>
								<div className="meta">{course ? course.name : i.courseId} ／ 残り: {remainMin}分</div>
								<div className="card-actions">
									<button onClick={() => onCheckout(i.id)} className="primary">退店（履歴に記録）</button>
									<button onClick={() => onDelete(i.id)} className="secondary">削除（履歴に残さない）</button>
								</div>
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
