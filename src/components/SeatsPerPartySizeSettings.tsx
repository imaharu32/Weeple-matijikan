import React, { useState } from 'react';

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
		<div className="settings-panel">
			<h3>人数別座席占有範囲設定</h3>
			<p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
				各グループサイズに対して、占有座席数の最小値と最大値を設定してください。
				（例：2人客は2～4席の範囲で選択可、など）
			</p>

			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
				{[1, 2, 3, 4, 5, 6].map((partySize) => {
					const range = settings[partySize] || { min: partySize, max: partySize };
					return (
						<div key={partySize} style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
							<label style={{ display: 'block', marginBottom: 12 }}>
								<span style={{ fontWeight: 600 }}>{partySize}人客</span>
							</label>
							<div style={{ marginBottom: 8 }}>
								<label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
									<span style={{ fontSize: 12, minWidth: 30 }}>最小:</span>
									<input
										type="number"
										min={1}
										max={6}
										value={range.min}
										onChange={(e) => handleMinChange(partySize, Number(e.target.value) || 1)}
										style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
									/>
									<span style={{ fontSize: 12, minWidth: 16 }}>席</span>
								</label>
								<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
									<span style={{ fontSize: 12, minWidth: 30 }}>最大:</span>
									<input
										type="number"
										min={1}
										max={6}
										value={range.max}
										onChange={(e) => handleMaxChange(partySize, Number(e.target.value) || 6)}
										style={{ flex: 1, padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
									/>
									<span style={{ fontSize: 12, minWidth: 16 }}>席</span>
								</label>
							</div>
							<div style={{ fontSize: 12, color: '#999', padding: 6, background: '#f5f5f5', borderRadius: 4 }}>
								{range.min}～{range.max}席で選択可
							</div>
						</div>
					);
				})}
			</div>

			{isSaved && (
				<div style={{ padding: 8, background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, marginBottom: 12 }}>
					✓ 設定を保存しました
				</div>
			)}

			<div style={{ display: 'flex', gap: 8 }}>
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
