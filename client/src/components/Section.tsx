import { useMemo, useState, useEffect } from "react";
import "./Section.css";
import { Seat } from "./Seat";
import { type SeatType, SeatStatus } from "../types/seat";

import apiClient from "../api/axios";
import { isAxiosError } from "axios";
import {
  type GetEventResponse,
  type LockSeatResponse,
  type EventError,
} from "@server/constants/types";

interface SectionProps {
  eventId: string
}

const appRoutes = {
  events: () => "/events",
  event: (eventId: string) => `/events/${eventId}`,
  lockSeat: (seatId: string, action: string) => `/seats/${seatId}/${action}`,
};

export const Section: React.FC<SectionProps> = ({ eventId }) => {
  const [seats, setSeats] = useState<SeatType[]>([]);

  const rows = useMemo(() => {
    return seats.reduce((acc: string[], seat) => {
      if (!acc.includes(seat.row)) acc.push(seat.row);
      return acc;
    }, []);
  }, [seats]);

  useEffect(() => {
    updateSeats(eventId);
    console.log("selectedEventIndex changed", eventId);
    setInterval(() => {
      updateSeats(eventId);
    }, 60000);
  }, [eventId]);

  function updateSeats(eventId: string) {
    if(!eventId) return;
    apiClient
      .get<GetEventResponse>(appRoutes.event(eventId))
      .then((response) => {
        const eventData = response.data.event;
        if (!eventData || !eventData.seats) return;

        const seatsFromApi = eventData.seats.map((seat) => ({
          ...seat,
          //id: `${seat.row}-seat-${seat.number}`,
        }));

        setSeats(seatsFromApi);
      })
      .catch((error) => {
        if (isAxiosError(error)) {
          // TypeScript sait maintenant exactement que error.response?.data correspond à ErrorResponse
          const errData = error.response?.data as EventError;
          console.error("Erreur serveur :", errData?.error);
        } else {
          console.error("Erreur réseau inattendue", error);
        }
      });
  }

    function toggleSeat(seatId: string) {
    console.log(seatId);
    const selectedSeat = seats.find((seat) => seat.id === seatId);
    const action =
      selectedSeat?.status === SeatStatus.LOCKED ? "unlock" : "lock";
    if (selectedSeat?.status === SeatStatus.BOOKED) return;
    apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId,action))
      .then((response) => {
        if (response.status === 200) updateSeats(eventId);
      });
  }

  return (
    <>
      {rows.map((row) => (
        <div className="row" key={row}>
          <p>{row}</p>
          {seats
            .filter((s) => s.row === row)
            .map((seat) => (
              <Seat
                row={seat.row}
                number={seat.number}
                status={seat.status}
                key={seat.id}
                onClick={() => toggleSeat(seat.id)}
              />
            ))}
        </div>
      ))}
    </>
  );
};
