import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	// Vercel のルートで配信する。/wait_time などのサブパスでも JS・CSS を絶対パスで読めるようにする
	base: '/',
	// Vercel・.env に設定済みの REACT_APP_* をそのまま使えるようにする
	envPrefix: ['VITE_', 'REACT_APP_'],
	server: {
		port: 3000,
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './src/setupTests.ts',
	},
});
