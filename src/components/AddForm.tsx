import React, { useMemo, useState } from 'react';

type Props = {
	onAdd: (size: number, note?: string) => void;
	// 追加：指定人数で並んだ場合の見込み時間（分）を返す関数（任意）
	getEstimate?: (size: number) => number;
	// 追加：送信後にモーダルを閉じるコールバック（任意）
	onAfterAdd?: () => void;
};

export default function AddForm({ onAdd, getEstimate, onAfterAdd }: Props) {
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
			<label className="add-form-row">
				<span className="add-form-label">人数：</span>
				<input
					type="number"
					value={size}
					min={1}
					onChange={(e) => setSize(Number(e.target.value))}
					className="size-input"
				/>
			</label>

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
				<div style={{ color: '#444', fontSize: 14, marginTop: 6 }}>
					並んだ場合の入店見込み： 約{estimateMin}分
				</div>
			)}

			<div className="add-form-actions">
				<button type="submit" className="primary">列に追加</button>
			</div>
		</form>
	);
}
