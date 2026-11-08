import React, { useState } from 'react';
import styles from './SeatsPerPartySizeSettings.module.css';

type Props = {
	seatsRangePerPartySize: Record<number, { min: number; max: number }>;
	onSave: (settings: Record<number, { min: number; max: number }>) => void;
};

export default function SeatsPerPartySizeSettings({ seatsRangePerPartySize, onSave }: Props) {
	const [settings, setSettings] = useState<Record<number, { min: number; max: number }>>(seatsRangePerPartySize);
	const [isSaved, setIsSaved] = useState(false);

	const handleMinChange = (partySize: number, minSeats: number) => {
		const updated = { ...settings };
		if (!updated[partySize]) {
			updated[partySize] = { min: minSeats, max: minSeats };
		} else {
			updated[partySize] = {
				min: Math.max(1, minSeats),
				max: Math.max(minSeats, updated[partySize].max),
			};
		}
		setSettings(updated);
	};

	const handleMaxChange = (partySize: number, maxSeats: number) => {
		const updated = { ...settings };
		if (!updated[partySize]) {
			updated[partySize] = { min: 1, max: maxSeats };
		} else {
			updated[partySize] = {
				min: Math.min(updated[partySize].min, maxSeats),
				max: Math.min(6, maxSeats),
			};
		}
		setSettings(updated);
	};

	const handleSave = () => {
		onSave(settings);
		setIsSaved(true);
		setTimeout(() => setIsSaved(false), 2000);
	};

	const handleReset = () => {
		setSettings(seatsRangePerPartySize);
		setIsSaved(false);
	};

	return (
		<div>
			<h3>人数別座席占有範囲設定</h3>
			<p className={styles.description}>
				各グループサイズに対して、占有座席数の最小値と最大値を設定してください。
				（例：2人客は2～4席の範囲で選択可、など）
			</p>

			<div className={styles.grid}>
				{[1, 2, 3, 4, 5, 6].map((partySize) => {
					const range = settings[partySize] || { min: partySize, max: partySize };
					return (
						<div key={partySize} className={styles.rule}>
							<label className={styles.ruleTitle}>
								<span className={styles.ruleTitleText}>{partySize}人客</span>
							</label>
							<div className={styles.fields}>
								<label className={styles.field}>
									<span className={styles.fieldLabel}>最小:</span>
									<input
										type="number"
										min={1}
										max={6}
										value={range.min}
										onChange={(e) => handleMinChange(partySize, Number(e.target.value) || 1)}
										className={styles.input}
									/>
									<span className={styles.fieldUnit}>席</span>
								</label>
								<label className={styles.field}>
									<span className={styles.fieldLabel}>最大:</span>
									<input
										type="number"
										min={1}
										max={6}
										value={range.max}
										onChange={(e) => handleMaxChange(partySize, Number(e.target.value) || 6)}
										className={styles.input}
									/>
									<span className={styles.fieldUnit}>席</span>
								</label>
							</div>
							<div className={styles.summary}>
								{range.min}～{range.max}席で選択可
							</div>
						</div>
					);
				})}
			</div>

			{isSaved && (
				<div className={styles.saved}>
					✓ 設定を保存しました
				</div>
			)}

			<div className={styles.actions}>
				<button className="secondary" onClick={handleReset}>
					戻す
				</button>
				<button className="primary" onClick={handleSave}>
					設定を保存
				</button>
			</div>
		</div>
	);
}
