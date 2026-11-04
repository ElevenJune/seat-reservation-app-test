import React from 'react';
import './Seat.css';
import { type SeatStatusType, SeatStatus } from '../types/seat';

interface SeatProps {
  row?: string;
  number: number;
  status: SeatStatusType;
  yours?: boolean,
  onClick?: (row?: string, number?: number) => void;
}

export const Seat: React.FC<SeatProps> = ({ row, number, status, yours=false, onClick }) => {
  // Mapping explicite vers la classe CSS d'état
  const statusClassMap: Record<SeatStatusType, string> = {
    [SeatStatus.AVAILABLE]: 'available',
    [SeatStatus.LOCKED]: 'locked',
    [SeatStatus.BOOKED]: 'booked',
  };

  const isBooked = status === SeatStatus.BOOKED;
  let statusClass = statusClassMap[status] || 'available';
  if(isBooked && yours) statusClass+=' yours'

  return (
    <button
      type="button"
      className={`seat ${statusClass}`}
      disabled={isBooked}
      onClick={() => onClick?.(row, number)}
    >
      {row ? `${row}${number}` : number}
    </button>
  );
};