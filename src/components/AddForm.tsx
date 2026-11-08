import React, { useMemo, useState, useRef, useEffect } from 'react';
import styles from './AddForm.module.css';

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

	const noteRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		// 初回表示時にメモ欄へフォーカス
		noteRef.current?.focus();
	}, []);

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
			className={styles.addForm}
		>
			<div className={styles.addFormSizeSection}>
				<label className={styles.addFormLabel}>人数</label>
				<div className={styles.addFormSizeControl}>
					<button
						type="button"
						className={styles.sizeBtnMinus}
						onClick={() => {
							setSize(Math.max(1, size - 1));
							setTimeout(() => noteRef.current?.focus(), 0);
						}}
						disabled={size <= 1}
					>
						−
					</button>
					<input
						type="number"
						value={size}
						min={1}
						onChange={(e) => setSize(Number(e.target.value))}
						className={styles.sizeInputLarge}
					/>
					<button
						type="button"
						className={styles.sizeBtnPlus}
						onClick={() => {
							setSize(size + 1);
							setTimeout(() => noteRef.current?.focus(), 0);
						}}
					>
						＋
					</button>
				</div>
			</div>

			<label className={styles.addFormRow}>
				<span className={styles.addFormLabel}>メモ：</span>
				<textarea
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="例: 小学生、家族、カップル、大学生など"
					className={styles.noteInput}
					ref={noteRef}
					rows={2}
				/>
			</label>

			{estimateMin !== null && (
				<div className={styles.addFormEstimate}>
					並んだ場合の入店見込み： <strong>約{estimateMin}分</strong>
				</div>
			)}

			<div className={styles.addFormActions}>
				<button type="button" className="secondary" onClick={onCancel}>
					キャンセル
				</button>
				<button type="submit" className={`primary ${styles.submitButton}`}>
					列に追加
				</button>
			</div>
		</form>
	);
}
