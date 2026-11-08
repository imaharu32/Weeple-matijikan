import React, { ReactNode, useEffect, useId, useRef } from 'react';
import styles from './Modal.module.css';

type Props = {
	title: ReactNode;
	subtitle?: ReactNode;
	onClose: () => void;
	children: ReactNode;
	/** 下部に固定表示するボタンなど（スクロールしても常に見える） */
	footer?: ReactNode;
	size?: 'sm' | 'md' | 'lg' | 'xl';
};

/**
 * 共通のモーダル。Esc キー・背景クリック・右上の「閉じる」で閉じる。
 */
export default function Modal({ title, subtitle, onClose, children, footer, size = 'md' }: Props) {
	const titleId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	useEffect(() => {
		onCloseRef.current = onClose;
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onCloseRef.current();
		};
		document.addEventListener('keydown', handleKeyDown);
		// 中の入力欄が自分でフォーカスしていなければ、ダイアログにフォーカスを移す
		if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	return (
		<div
			className={styles.overlay}
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={dialogRef}
				className={`${styles.dialog} ${styles[size]}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<div className={styles.header}>
					<div className={styles.headings}>
						<h2 id={titleId} className={styles.title}>
							{title}
						</h2>
						{subtitle && <div className={styles.subtitle}>{subtitle}</div>}
					</div>
					<button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="閉じる">
						✕ 閉じる
					</button>
				</div>
				<div className={styles.body}>{children}</div>
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</div>
	);
}
