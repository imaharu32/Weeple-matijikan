import React from 'react';
import styles from './NumberStepper.module.css';

type Props = {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	/** 数字の後ろに表示する単位（「名」「席」「分」など） */
	unit?: string;
	/** 読み上げ用の名前（「人数」など） */
	label: string;
	size?: 'sm' | 'md' | 'lg';
};

/**
 * −／＋ボタン付きの数値入力。直接入力もできる。
 */
export default function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, unit, label, size = 'md' }: Props) {
	const clamp = (n: number) => Math.min(max, Math.max(min, n));

	return (
		<div className={`${styles.stepper} ${styles[size]}`}>
			<button
				type="button"
				className={styles.button}
				onClick={() => onChange(clamp(value - step))}
				disabled={value <= min}
				aria-label={`${label}を減らす`}
			>
				−
			</button>
			<input
				className={`${styles.value} num`}
				type="number"
				inputMode="numeric"
				value={value}
				min={min}
				max={max}
				aria-label={label}
				onChange={(e) => {
					const n = Number(e.target.value);
					// 小数（2.5 など）は整数に丸める
					if (!Number.isNaN(n)) onChange(clamp(Math.round(n)));
				}}
				onFocus={(e) => e.target.select()}
			/>
			<button
				type="button"
				className={styles.button}
				onClick={() => onChange(clamp(value + step))}
				disabled={value >= max}
				aria-label={`${label}を増やす`}
			>
				＋
			</button>
			{unit && <span className={styles.unit}>{unit}</span>}
		</div>
	);
}
