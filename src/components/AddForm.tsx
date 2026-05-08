import React, { useMemo, useState } from 'react';

type Props = {
	onAdd: (size: number, note?: string) => void;
	// 追加：指定人数で並んだ場合の見込み時間（分）を返す関数（任意）
	getEstimate?: (size: number) => number;
	// 追加：送信後にモーダルを閉じるコールバック（任意）
	onAfterAdd?: () => void;
	// キャンセルボタンコールバック（任意）
	onCancel?: () => void;
};

export default function AddForm({ onAdd, getEstimate, onAfterAdd, onCancel }: Props) {
	const [size, setSize] = useState<number>(2);
	const [note, setNote] = useState<string>('');

	// 人数に応じた見込み（分）
	const estimateMin = useMemo(() => {
		if (!getEstimate) return null;
		const v = Number(size) || 0;
		if (v <= 0) return null;
		return getEstimate(v);
	}, [size, getEstimate]);

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (size <= 0) return;
				onAdd(size, note || undefined);
				setNote('');
				setSize(2);
				if (onAfterAdd) onAfterAdd();
			}}
			className="add-form"
		>
			<div className="add-form-size-section">
				<label className="add-form-label">人数</label>
				<div className="add-form-size-control">
					<button
						type="button"
						className="size-btn-minus"
						onClick={() => setSize(Math.max(1, size - 1))}
						disabled={size <= 1}
					>
						−
					</button>
					<input
						type="number"
						value={size}
						min={1}
						onChange={(e) => setSize(Number(e.target.value))}
						className="size-input-large"
					/>
					<button
						type="button"
						className="size-btn-plus"
						onClick={() => setSize(size + 1)}
					>
						＋
					</button>
				</div>
			</div>

			<label className="add-form-row">
				<span className="add-form-label">メモ：</span>
				<textarea
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="例: 小学生、家族、カップル、大学生など"
					className="note-input"
					rows={2}
				/>
			</label>

			{estimateMin !== null && (
				<div className="add-form-estimate">
					並んだ場合の入店見込み： <strong>約{estimateMin}分</strong>
				</div>
			)}

			<div className="add-form-actions">
				<button type="button" className="secondary" onClick={onCancel}>
					キャンセル
				</button>
				<button type="submit" className="primary" style={{ fontSize: 16, padding: '12px 20px' }}>
					列に追加
				</button>
			</div>
		</form>
	);
}
