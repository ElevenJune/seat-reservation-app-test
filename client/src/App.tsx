import { useState, useEffect } from "react";
import apiClient from "./api/axios";
import { isAxiosError } from "axios";
import "./App.css";

import { Section } from "./components/Section";
// Importation depuis le schéma partagé (valeur + type)
import { type SeatType, SeatStatus } from "./types/seat";
import {
  type GetEventResponse,
  type GetEventsResponse,
  type LockSeatResponse,
  type EventError
} from "@server/constants/types";

const appRoutes = {
  events: () => '/events',
  event: (eventId:string) => `/events/${eventId}`,
  lockSeat: (seatId: string, action: string) => `/seats/${seatId}/${action}`,
};

function App() {
  const [seats, setSeats] = useState<SeatType[]>([]);
  const [selectedEventIndex, setselectedEventIndex] = useState<number>(-1);
  const [events, setEvents] = useState<string[]>([]);

  //Startup
  useEffect(() => {
    updateEvents();
  }, []);

  useEffect(() => {
    updateSeatsForSelectedEvent()
    console.log("selectedEventIndex changed", selectedEventIndex);
    setInterval(() => {
      updateSeatsForSelectedEvent()
    }, 60000);
  }, [selectedEventIndex]);

  function updateSeatsForSelectedEvent(){
    if (selectedEventIndex < 0 || selectedEventIndex >= events.length) return;
    updateSeats(events[selectedEventIndex]);
  }

 const keyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
  console.log("Key down", event.code)
    if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      const incr = event.code === "ArrowLeft" ? -1 : 1;
      const newIndex = selectedEventIndex+incr>=events.length ? 0 : selectedEventIndex+incr;
      setselectedEventIndex(newIndex)
    }
  };

  function updateSeats(eventId: string) {
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

  function updateEvents() {
    console.log("Updating events");
    apiClient
      .get<GetEventsResponse>(appRoutes.events())
      .then((response) => {
        const eventsData = response.data.events;
        if (!eventsData) return;
        setEvents(eventsData.map((evt) => evt.id))
        console.log(events)
        setselectedEventIndex(eventsData.length>0 ? 0 : -1)
      })
      .catch((error) => {
        if (isAxiosError(error)) {
          const errData = error.response?.data as EventError;
          console.error("Erreur serveur :", errData);
        } else {
          console.error("Erreur réseau inattendue", error);
        }
      });
  }
  //"appRoutes.lockSeat(seatId,action)"
  function toggleSeat(seatId: string) {
    console.log(seatId);
    const selectedSeat = seats.find((seat) => seat.id === seatId);
    const action =
      selectedSeat?.status === SeatStatus.LOCKED ? "unlock" : "lock";
    if (selectedSeat?.status === SeatStatus.BOOKED) return;
    apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId,action))
      .then((response) => {
        if (response.status === 200) updateSeats(events[selectedEventIndex]);
      });
  }

  return (
      <section id="center" onKeyDown={keyDownHandler}>
        <Section seats={seats} onClicked={toggleSeat} />
      </section>
  );
}

export default App;
