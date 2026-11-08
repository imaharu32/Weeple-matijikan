import React, { useId, useState } from 'react';
import Modal from './ui/Modal';
import NumberStepper from './ui/NumberStepper';
import styles from './PartyFormModal.module.css';

type Props = {
	mode: 'add' | 'edit';
	initialSize?: number;
	initialNote?: string;
	/** 指定人数で並んだ場合の見込み（分）。追加のときだけ表示する */
	getEstimate?: (size: number) => number;
	onSubmit: (size: number, note: string) => void;
	onClose: () => void;
};

const QUICK_SIZES = [1, 2, 3, 4, 5, 6];

/** 列に追加する／列の内容を編集するフォーム */
export default function PartyFormModal({ mode, initialSize = 2, initialNote = '', getEstimate, onSubmit, onClose }: Props) {
	const formId = useId();
	const [size, setSize] = useState(initialSize);
	const [note, setNote] = useState(initialNote);
	const estimate = getEstimate && size > 0 ? getEstimate(size) : null;

	return (
		<Modal
			size="md"
			title={mode === 'add' ? '列に追加' : '列の内容を編集'}
			subtitle={mode === 'add' ? '来たお客さんの人数と、呼ぶときの目印になるメモを入れます。' : undefined}
			onClose={onClose}
			footer={
				<>
					<button type="button" className="btn btn-secondary" onClick={onClose}>
						キャンセル
					</button>
					<button type="submit" form={formId} className="btn btn-primary btn-lg" disabled={size < 1}>
						{mode === 'add' ? '列に追加する' : '保存する'}
					</button>
				</>
			}
		>
			<form
				id={formId}
				className={styles.form}
				onSubmit={(e) => {
					e.preventDefault();
					if (size < 1) return;
					onSubmit(size, note.trim());
				}}
			>
				<div className="field">
					<span className="field-label">人数</span>
					<div className={styles.sizeRow}>
						<NumberStepper size="lg" value={size} onChange={setSize} min={1} max={30} unit="名" label="人数" />
					</div>
					<div className={styles.quick} role="group" aria-label="人数をすぐ選ぶ">
						{QUICK_SIZES.map((n) => (
							<button
								key={n}
								type="button"
								className={`${styles.quickButton} ${n === size ? styles.quickSelected : ''}`}
								aria-pressed={n === size}
								onClick={() => setSize(n)}
							>
								{n}名
							</button>
						))}
					</div>
				</div>

				<label className="field">
					<span className="field-label">メモ（任意）</span>
					<input
						className="input"
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="例：家族、大学生、カップル、服の色 など"
						autoFocus
					/>
				</label>

				{estimate !== null && (
					<div className={`${styles.estimate} ${estimate === 0 ? styles.estimateNow : ''}`}>
						{estimate === 0 ? (
							'空いている席があるので、すぐ案内できます'
						) : (
							<>
								入店までの目安 <strong className="num">約{estimate}分</strong>
							</>
						)}
					</div>
				)}
			</form>
		</Modal>
	);
}
