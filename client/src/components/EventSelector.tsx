import React from "react";
import { useEffect, useState } from "react";
import type { Event } from "@server/schemas/types";
import apiClient from "../api/axios";
import { isAxiosError } from "axios";
import "./EventSelector.css"

import {
  type GetEventsResponse,
  type EventError,
} from "@server/constants/types";

interface EventSelectorProps {
  onEventChanged: (id: string) => void;
}

export const EventSelector: React.FC<EventSelectorProps> = ({
  onEventChanged,
}) => {
  const [selectedEventIndex, setselectedEventIndex] = useState<number>(-1);
  const [events, setEvents] = useState<Event[]>([]);

  //Startup
  useEffect(() => {
    updateEvents();
  }, []);

  function selectEvent(index: number) {
    console.log("select event at index",index)
    setselectedEventIndex(index);
    if (index < 0 || index > events.length) return;
    const id = events[index].id;
    console.log("New id",id)
    onEventChanged(id);
  }

  function updateEvents() {
    console.log("Updating events");
    apiClient
      .get<GetEventsResponse>("/events")
      .then((response) => {
        const eventsData = response.data.events;
        if (!eventsData) return;
        setEvents(eventsData);
        console.log(eventsData);
        //selectEvent(eventsData.length > 0 ? 0 : -1);
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

  const listItems = events.map((event, index) => (
    <li key={event.id}>
        <b style={{ fontWeight: index === selectedEventIndex ? "bold" : "normal" }}>{event.title}:</b>
        <p>{"at " + event.date + " "}</p>
      <button className="select" onClick={()=>selectEvent(index)}>Select</button>
    </li>
  ));
  return (
    <div>
      <h1>Events</h1>
      <ul>{listItems}</ul>
    </div>
  );
};
