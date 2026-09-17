import { useState, useEffect } from 'react';
import './App.css';

import { Section } from './components/Section';
// Importation depuis le schéma partagé (valeur + type)
import { type SeatType, SeatStatus } from './types/seat';

const initSeats = (): SeatType[] => {
  let init = [];
    for (var row of ['A','B','C','D']){
      for(let i = 0; i < 10; i++){
        init.push({
          id: row+'-seat-'+i,
          number: i+1,
          row,
          eventId: 'event-1',
          price: 0,
          status: SeatStatus.AVAILABLE,
          lockedAt: null,
          updatedAt: new Date(),
        })
    }}
    return init;
  }

function App() {
  const [seats, setSeats] = useState<SeatType[]>(initSeats)

  const toggleSeat = (seatId: string) => {
    setSeats((currentSeats) =>
      currentSeats.map((seat) =>
        seat.id === seatId && seat.status === SeatStatus.AVAILABLE
          ? { ...seat, status: SeatStatus.LOCKED }
          : seat,
      ),
    );
  };

  return (
    <>
      <section id="center">
        <Section seats={seats} onClicked={toggleSeat} />
      </section>
      <div className="ticks"></div>
    </>
  );
}

export default App;