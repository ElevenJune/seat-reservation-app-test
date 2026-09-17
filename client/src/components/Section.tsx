import {useMemo } from 'react';
import './Section.css';
import { Seat } from './Seat';
import { type Seat as SeatType } from '@server/schemas/seat';

interface SectionProps {
  seats: SeatType[],
  onClicked: (seat:string) => void
}

export const Section: React.FC<SectionProps> = ({ seats, onClicked }) => {
  const rows = useMemo(() => {
    return seats.reduce((acc: string[], seat) => {
      if (!acc.includes(seat.row))
        acc.push(seat.row)
      return acc
    }, [])
}, [seats])

  return(
    <>
    {rows.map((row)=>(
    <div className='row'>
      <p>{row}</p>
      {
            seats
            .filter((s)=>s.row===row)
            .map((seat)=>(
                <Seat
                    row={seat.row}
                    number={seat.number}
                    status={seat.status}
                    key={seat.id}
                    onClick={()=>onClicked(seat.id)}
                />
            ))
        }
    </div>
    ))}
    </>
  )
};