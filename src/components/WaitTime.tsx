import React from 'react';

type Props = {
	minutes: number;
};

export default function WaitTime({ minutes }: Props) {
	return (
		<div className="wait-time-page">
			<div className="wait-time-card">
				<div className="wait-time-label">現在の待ち時間</div>
				<div className="wait-time-value">{minutes}分</div>
				<div className="wait-time-note">（2名で並んだ場合の目安）</div>
			</div>
		</div>
	);
}
