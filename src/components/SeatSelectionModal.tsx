import React, { useMemo, useState } from 'react';
import { Party, Course, UnitSeat, SeatDetail, Inside } from '../types';
import { getSeatsRangeForPartySize } from '../utils/seatUtils';
import RoomDiagram from './RoomDiagram';
import styles from './SeatSelectionModal.module.css';

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
            <div className={`modal-content ${styles.seatSelectionModal}`} onClick={(e) => e.stopPropagation()}>
                <h3>座席を選択 ({selectedSeats.size}/{targetSeatsCount}席) 【{party.size}人客】</h3>

                <div className={styles.seatModalSection}>
                    <label>コースを選択：</label>
                    <div className={styles.courseOptions}>
                        {courses.map((course) => (
                            <button
                                key={course.id}
                                type="button"
                                className={`${styles.courseOption} ${selectedCourseId === course.id ? styles.selected : ''}`}
                                onClick={() => setSelectedCourseId(course.id)}
                            >
                                <div className={styles.courseMinutes}>{course.minutes}分</div>
                                <div className={styles.courseName}>{course.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.seatModalSection}>
                    <label>占有する座席数を選択：</label>
                    <div className={styles.seatsCountRow}>
                        <span className={styles.seatsRange}>
                            {seatsRange.min}～{seatsRange.max}席
                        </span>
                        <div className={styles.seatsStepper}>
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
                                className={styles.seatsInput}
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
                        <span className={styles.seatsUnit}>席</span>
                    </div>
                </div>

                <div className={styles.seatModalSection}>
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

                <div className={styles.modalActions}>
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
