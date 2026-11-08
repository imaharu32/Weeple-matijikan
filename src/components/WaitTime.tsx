import React from 'react';
import styles from './WaitTime.module.css';

type Props = {
	minutes: number;
};

/** お客さん向け：2名で並んだ場合の待ち時間の目安 */
export default function WaitTime({ minutes }: Props) {
	return (
		<div className={styles.page}>
			<div className={styles.card}>
				<p className={styles.shop}>ボドゲカフェ Weeple</p>
				<p className={styles.label}>ただいまの待ち時間の目安</p>
				{minutes === 0 ? (
					<p className={styles.now}>すぐにご案内できます</p>
				) : (
					<p className={styles.value}>
						約<span className={styles.number}>{minutes}</span>分
					</p>
				)}
				<p className={styles.note}>2名さまでお並びいただいた場合の目安です</p>
			</div>
		</div>
	);
}
