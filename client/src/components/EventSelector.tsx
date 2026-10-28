import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Event } from "@server/schemas/types";
import { AxiosError, isAxiosError } from "axios";
import apiClient from "../api/axios";

import "./EventSelector.css";
import { formatDate } from "../utils/utils";
import { RoundedButton } from "./Widgets/RoundedButton";
import { VLayout } from "./Navigation/Layout";

import {
  type GetEventsResponse,
  type EventError,
} from "@server/constants/types";

interface EventSelectorProps {}

export const EventSelector: React.FC<EventSelectorProps> = ({}) => {
  const [_selectedEventIndex, setselectedEventIndex] = useState<number>(-1);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
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
    setError("");
    apiClient
      .get<GetEventsResponse>("/events")
      .then((response) => {
        const eventsData = response.data.events;
        if (!eventsData) return;
        eventsData.sort((evtA,evtB)=>{return evtA.date>evtB.date?1:-1;})
        setEvents(eventsData);
        //console.log(eventsData);
        //selectEvent(eventsData.length > 0 ? 0 : -1);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error while calling events");
        if (isAxiosError(err)) {
          console.log("Erreur Axios :", err);
          setError(
            `Erreur de communication : ${err.message} (code:${err.code})`,
          );
        } else {
          let errData = err.response?.message as EventError;
          setError("Erreur réseau inattendue" + errData.error);
        }
        console.error(error);
        setLoading(false);
      });
  }


  const listItems = events.map((event, index) => (
    <div key={event.id} className="whole" onClick={() => selectEvent(index)}>
      <div className="left">
        <h3 className="title">{event.title}</h3>
        <p className="date">{formatDate(event.date)}</p>
      </div>
      <div className="right">
        <RoundedButton
          background-color="var(--primary)"
          onClick={() => selectEvent(index)}
        >
          Select
        </RoundedButton>
      </div>
    </div>
  ));

  const content = error ? (
    <p>{error}</p>
  ) : (
    <ul className="list">{listItems}</ul>
  );
  return (
    <VLayout className="page-container">
      <h1 className="mt-header">Events</h1>
      {content}
    </VLayout>
  );
};
