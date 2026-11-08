import React from 'react';
import styles from './WaitTime.module.css';

type Props = {
	minutes: number;
};

export default function WaitTime({ minutes }: Props) {
	return (
		<div className={styles.waitTimePage}>
			<div className={styles.waitTimeCard}>
				<div className={styles.waitTimeLabel}>現在の待ち時間</div>
				<div className={styles.waitTimeValue}>{minutes}分</div>
				<div className={styles.waitTimeNote}>（2名で並んだ場合の目安）</div>
			</div>
		</div>
	);
}
