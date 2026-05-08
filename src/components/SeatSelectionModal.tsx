import React, { useState } from 'react';
import { Party, Course, UnitSeat } from '../types';
import RoomDiagram from './RoomDiagram';

type Props = {
    party: Party;
    courses: Course[];
    unitSeats: UnitSeat[];
    onConfirm: (courseId: string, selectedSeatIds: string[]) => void;
    onCancel: () => void;
};

export default function SeatSelectionModal({ party, courses, unitSeats, onConfirm, onCancel }: Props) {
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? '');
    const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());

    const handleSeatToggle = (seatId: string, isOccupied: boolean) => {
        if (isOccupied) return;
        const next = new Set(selectedSeats);
        if (next.has(seatId)) next.delete(seatId);
        else {
            if (next.size >= party.size) return;
            next.add(seatId);
        }
        setSelectedSeats(next);
    };

    const isConfirmDisabled = selectedSeats.size !== party.size;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content seat-selection-modal" onClick={(e) => e.stopPropagation()}>
                <h3>座席を選択 ({selectedSeats.size}/{party.size}人)</h3>

                <div className="seat-modal-section">
                    <label>コースを選択：</label>
                    <select value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)}>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                                {course.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="seat-modal-section full-seat-grid">
                    <label>入口から見た教室図（空席を選択）</label>
                    <RoomDiagram
                        unitSeats={unitSeats}
                        inside={[]}
                        courses={courses}
                        mode="select"
                        selectedSeatIds={selectedSeats}
                        onSeatClick={(seatId, occupiedByInsideId) => handleSeatToggle(seatId, !!occupiedByInsideId)}
                    />
                </div>

                <div className="modal-actions">
                    <button className="btn-cancel" onClick={onCancel}>
                        キャンセル
                    </button>
                    <button
                        className="primary"
                        onClick={() => {
                            if (!isConfirmDisabled) {
                                onConfirm(selectedCourseId, Array.from(selectedSeats));
                            }
                        }}
                        disabled={isConfirmDisabled}
                    >
                        確定
                    </button>
                </div>
            </div>
        </div>
    );
}
