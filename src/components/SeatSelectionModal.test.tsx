import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { COURSES, UNIT_SEATS } from '../constants';
import type { Inside, Party } from '../types';
import SeatSelectionModal from './SeatSelectionModal';

const party: Party = { id: 'p1', size: 2, note: '', joinAt: new Date().toISOString() };
const otherGroup: Inside = {
	id: 'other',
	size: 1,
	courseId: 'c30',
	enterAt: new Date().toISOString(),
	exitAt: new Date(Date.now() + 30 * 60000).toISOString(),
	// おすすめで選ばれるテーブル1の席1を、別の端末で使われたことにする
	seats: [{ id: 'table_1_0', tableNumber: 1, seatIndex: 0 }],
};

const renderModal = (inside: Inside[], onConfirm = vi.fn()) =>
	render(
		<SeatSelectionModal
			party={party}
			courses={COURSES}
			unitSeats={UNIT_SEATS}
			inside={inside}
			groupColors={new Map()}
			onConfirm={onConfirm}
			onClose={vi.fn()}
		/>
	);

describe('SeatSelectionModal', () => {
	test('開いた時点で人数分のおすすめの席が選ばれ、そのまま入店できる', () => {
		const onConfirm = vi.fn();
		renderModal([], onConfirm);
		fireEvent.click(screen.getByRole('button', { name: 'この席で入店する' }));
		expect(onConfirm).toHaveBeenCalledWith('c30', [
			{ id: 'table_1_0', tableNumber: 1, seatIndex: 0 },
			{ id: 'table_1_1', tableNumber: 1, seatIndex: 1 },
		]);
	});

	test('選んでいた席が別の端末で使われたら、確定できず、外せば確定できる', () => {
		const onConfirm = vi.fn();
		const { rerender } = renderModal([], onConfirm);

		// 画面を開いている間に、ほかの組がテーブル1の席1に入った
		rerender(
			<SeatSelectionModal
				party={party}
				courses={COURSES}
				unitSeats={UNIT_SEATS}
				inside={[otherGroup]}
				groupColors={new Map()}
				onConfirm={onConfirm}
				onClose={vi.fn()}
			/>
		);

		const confirmButton = screen.getByRole('button', { name: 'この席で入店する' });
		expect(screen.getByText(/ほかの組に使われました/)).toBeInTheDocument();
		expect(confirmButton).toBeDisabled();

		fireEvent.click(screen.getByRole('button', { name: '使われた席を外す' }));
		expect(confirmButton).toBeEnabled();
		fireEvent.click(confirmButton);
		expect(onConfirm).toHaveBeenCalledWith('c30', [{ id: 'table_1_1', tableNumber: 1, seatIndex: 1 }]);
	});
});
