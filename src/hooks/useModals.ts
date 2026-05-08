/**
 * モーダル状態管理用カスタムフック
 */

import { useState } from 'react';

export function useModals() {
	const [showAddModal, setShowAddModal] = useState(false);
	const [showHistoryModal, setShowHistoryModal] = useState(false);

	return {
		showAddModal,
		setShowAddModal,
		showHistoryModal,
		setShowHistoryModal,
	};
}
