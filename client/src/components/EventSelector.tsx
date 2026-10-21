import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Event } from "@server/schemas/types";
import apiClient from "../api/axios";
import { isAxiosError } from "axios";
import "./EventSelector.css";

import {
  type GetEventsResponse,
  type EventError,
} from "@server/constants/types";

interface EventSelectorProps {}

export const EventSelector: React.FC<EventSelectorProps> = ({}) => {
  const [selectedEventIndex, setselectedEventIndex] = useState<number>(-1);
  const [events, setEvents] = useState<Event[]>([]);
  const navigate = useNavigate();

  //Startup
  useEffect(() => {
    updateEvents();
  }, []);

  function selectEvent(index: number) {
    console.log("select event at index", index);
    setselectedEventIndex(index);
    if (index < 0 || index > events.length) return;
    const id = events[index].id;
    console.log("New id", id);
    navigate(`/event/${id}`);
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
    <div key={event.id} className="whole" onClick={() => selectEvent(index)}>
      <div className="left">
        <p className="title">
          {event.title}
        </p>
        <p className="date">{event.date+""}</p>
      </div>
      <div className="right">
        <button className="select" onClick={() => selectEvent(index)}>
          Select
        </button>
      </div>
    </div>
  ));
  return (
    <div>
      <h1>Events</h1>
      <ul className="list">{listItems}</ul>
    </div>
  );
};
