import React, { ReactNode } from 'react';
import styles from './Panel.module.css';

type Props = {
	title: ReactNode;
	/** 見出しの横に出す件数など */
	badge?: ReactNode;
	/** 見出しの右側に出すボタンなど */
	actions?: ReactNode;
	/** 見出しの下に出す短い説明 */
	description?: ReactNode;
	/** 下部に固定表示するもの（まとめて操作するときのボタンなど） */
	footer?: ReactNode;
	children: ReactNode;
};

/**
 * 見出し付きの枠。中身が多いときは枠の中だけがスクロールする。
 */
export default function Panel({ title, badge, actions, description, footer, children }: Props) {
	return (
		<div className={styles.panel}>
			<div className={styles.header}>
				<div className={styles.headings}>
					<h2 className={styles.title}>
						{title}
						{badge && <span className={styles.badge}>{badge}</span>}
					</h2>
					{description && <p className={styles.description}>{description}</p>}
				</div>
				{actions && <div className={styles.actions}>{actions}</div>}
			</div>
			<div className={styles.body}>{children}</div>
			{footer && <div className={styles.footer}>{footer}</div>}
		</div>
	);
}

/** 中身がないときの表示 */
export function PanelEmpty({ title, description }: { title: string; description?: string }) {
	return (
		<div className={styles.empty}>
			<p className={styles.emptyTitle}>{title}</p>
			{description && <p className={styles.emptyDescription}>{description}</p>}
		</div>
	);
}
