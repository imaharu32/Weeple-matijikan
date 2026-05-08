/**
 * 複数選択ロジック用カスタムフック
 */

import { useState } from 'react';

export function useMultiSelect() {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	return {
		selected,
		setSelected,
		clearSelection: () => setSelected(new Set()),
		toggleItem: (id: string) => {
			setSelected((current) => {
				const next = new Set(current);
				if (next.has(id)) {
					next.delete(id);
				} else {
					next.add(id);
				}
				return next;
			});
		},
	};
}
