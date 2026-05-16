import React, { useMemo, useState } from 'react';
import { Party, Course, UnitSeat, SeatDetail, Inside } from '../types';
import { getSeatsRangeForPartySize } from '../utils/seatUtils';
import RoomDiagram from './RoomDiagram';

type Props = {
    party: Party;
    courses: Course[];
    unitSeats: UnitSeat[];
    inside: Inside[];
    seatsRangePerPartySize?: Record<number, { min: number; max: number }>;
    onConfirm: (courseId: string, selectedSeats: SeatDetail[]) => void;
    onCancel: () => void;
};

export default function SeatSelectionModal({ party, courses, unitSeats, inside, seatsRangePerPartySize, onConfirm, onCancel }: Props) {
    const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? '');
    const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
    const [targetSeatsCount, setTargetSeatsCount] = useState<number>(0);

    // 座席選択可能な範囲を取得
    const seatsRange = useMemo(
        () => getSeatsRangeForPartySize(party.size, seatsRangePerPartySize),
        [party.size, seatsRangePerPartySize]
    );

    // 初期化：targetSeatsCount がまだ設定されていなければ、min値で初期化
    if (targetSeatsCount === 0) {
        setTimeout(() => setTargetSeatsCount(seatsRange.min), 0);
    }

    const handleSeatToggle = (seatId: string, isOccupied: boolean) => {
        if (isOccupied) return;
        const next = new Set(selectedSeats);
        if (next.has(seatId)) next.delete(seatId);
        else {
            if (next.size >= targetSeatsCount) return;
            next.add(seatId);
        }
        setSelectedSeats(next);
    };

    const isConfirmDisabled = selectedSeats.size !== targetSeatsCount || targetSeatsCount === 0;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content seat-selection-modal" onClick={(e) => e.stopPropagation()}>
                <h3>座席を選択 ({selectedSeats.size}/{targetSeatsCount}席) 【{party.size}人客】</h3>

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

                <div className="seat-modal-section">
                    <label>占有する座席数を選択：</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                        <span style={{ minWidth: 80 }}>
                            {seatsRange.min}～{seatsRange.max}席
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setTargetSeatsCount(Math.max(seatsRange.min, targetSeatsCount - 1))}
                                disabled={targetSeatsCount <= seatsRange.min}
                            >
                                −
                            </button>
                            <input
                                type="number"
                                min={seatsRange.min}
                                max={seatsRange.max}
                                value={targetSeatsCount}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (!isNaN(val)) {
                                        setTargetSeatsCount(Math.max(seatsRange.min, Math.min(seatsRange.max, val)));
                                    }
                                }}
                                style={{ width: 60, padding: 6, borderRadius: 4, border: '1px solid #ccc', textAlign: 'center' }}
                            />
                            <button
                                type="button"
                                className="secondary"
                                onClick={() => setTargetSeatsCount(Math.min(seatsRange.max, targetSeatsCount + 1))}
                                disabled={targetSeatsCount >= seatsRange.max}
                            >
                                ＋
                            </button>
                        </div>
                        <span style={{ fontWeight: 600 }}>席</span>
                    </div>
                </div>

                <div className="seat-modal-section full-seat-grid">
                    <label>入口から見た教室図（空席を選択）</label>
                    <RoomDiagram
                        unitSeats={unitSeats}
                        inside={inside}
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
                                // Convert selected seat IDs to SeatDetail objects
                                const selectedSeatDetails = Array.from(selectedSeats)
                                    .map(seatId => {
                                        const seat = unitSeats.find(s => s.id === seatId);
                                        return seat ? { id: seat.id, tableNumber: seat.tableNumber, seatIndex: seat.seatIndex } : null;
                                    })
                                    .filter((s): s is SeatDetail => s !== null);
                                onConfirm(selectedCourseId, selectedSeatDetails);
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
