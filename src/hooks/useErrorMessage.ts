/**
 * エラーメッセージ管理用カスタムフック
 */

import { useEffect, useState } from 'react';

export function useErrorMessage(autoHideDuration = 5000) {
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!message) return;
		const timer = setTimeout(() => setMessage(null), autoHideDuration);
		return () => clearTimeout(timer);
	}, [message, autoHideDuration]);

	return { message, setMessage };
}
