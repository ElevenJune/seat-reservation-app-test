import { useState, useEffect } from "react";
import apiClient from "./api/axios";
import "./App.css";

import { Section } from "./components/Section";
// Importation depuis le schéma partagé (valeur + type)
import { type SeatType, SeatStatus } from "./types/seat";
import type {
  GetEventsResponse,
  LockSeatResponse
} from "@server/index";

function App() {
  const [seats, setSeats] = useState<SeatType[]>([]);
  useEffect(() => updateSeats("9ad9516e-7792-4ac6-9574-f92aee59a5da"), []);

  function updateSeats(eventId: string) {
    apiClient.get<GetEventsResponse>(`/events/${eventId}`).then((response) => {
      const eventData = response.data.events[0];
      if (!eventData || !eventData.seats) return;

      const seatsFromApi = eventData.seats.map((seat) => ({
        ...seat,
        id: `${seat.row}-seat-${seat.number}`,
      }));

      setSeats(seatsFromApi);
    });
  }

  function toggleSeat(seatId: string) {
    console.log(seatId);
    const selectedSeat = seats.find((seat) => seat.id === seatId);
    const row = selectedSeat?.row;
    const num = selectedSeat?.number;
    const action =
      selectedSeat?.status === SeatStatus.LOCKED ? "unlock" : "lock";
    if (selectedSeat?.status === SeatStatus.BOOKED) return;
    apiClient
      .post<LockSeatResponse>(`/seats/${row}/${num}/${action}`)
      .then((response) => {
        if (response.status === 200) updateSeats("9ad9516e-7792-4ac6-9574-f92aee59a5da");
      });
  }

  return (
    <>
      <section id="center">
        <Section seats={seats} onClicked={toggleSeat} />
      </section>
    </>
  );
}

export default App;
