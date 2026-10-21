import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import apiClient from "../api/axios";
import { isAxiosError } from "axios";

import "./Section.css";
import { Seat } from "./Seat";
import { type SeatType, SeatStatus } from "../types/seat";
import {
  type GetEventResponse,
  type LockSeatResponse,
  type EventError,
} from "@server/constants/types";

interface SectionProps {}

const appRoutes = {
  events: () => "/events",
  event: (eventId: string) => `/events/${eventId}`,
  lockSeat: (seatId: string, action: string) => `/seats/${seatId}/${action}`,
};

export const Section: React.FC<SectionProps> = ({}) => {
  const [seats, setSeats] = useState<SeatType[]>([]);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  const navigate = useNavigate();

  const { id: eventId } = useParams<{ id: string }>();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return seats.reduce((acc: string[], seat) => {
      if (!acc.includes(seat.row)) acc.push(seat.row);
      return acc;
    }, []);
  }, [seats]);

  useEffect(() => {
    if (!eventId) {
      navigate("/");
      return;
    }
    updateSeats(eventId);
    console.log("selectedEventIndex changed", eventId);
    setInterval(() => {
      updateSeats(eventId);
    }, 60000);
  }, [eventId]);

  useEffect(() => {
    function checkOverflow(){
      if(containerRef.current && mapRef.current){
        setIsOverflowing(containerRef.current.clientWidth < mapRef.current.scrollWidth
          || containerRef.current.clientHeight < mapRef.current.scrollHeight)
      }
    }

    checkOverflow()
  }, [seats]);

  function updateSeats(eventId: string) {
    if (!eventId) return;
    apiClient
      .get<GetEventResponse>(appRoutes.event(eventId))
      .then((response) => {
        const eventData = response.data.event;
        if (!eventData || !eventData.seats) return;
        setSeats(eventData.seats);
      })
      .catch((error) => {
        if (isAxiosError(error)) {
          const errData = error.response?.data as EventError;
          console.error("Erreur serveur :", errData?.error);
          setNotFound(true);
        } else {
          console.error("Erreur réseau inattendue", error);
        }
      });
  }

  function toggleSeat(seatId: string) {
    if (!eventId) return;
    const selectedSeat = seats.find((seat) => seat.id === seatId);
    const action =
      selectedSeat?.status === SeatStatus.LOCKED ? "unlock" : "lock";
    if (selectedSeat?.status === SeatStatus.BOOKED) return;
    apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId, action))
      .then((response) => {
        if (response.status === 200) updateSeats(eventId);
      });
  }

  if (notFound || seats.length == 0)
    return (
      <>
        <h2>Oups...</h2>
        <p>
          {!notFound
            ? "Cet événement n'a aucun siège"
            : "Aucun événement n'a été trouvé avec cet ID."}
        </p>
        <Link to="/">Retour à la liste des événements</Link>
      </>
    );

  return (
    <div className="page">
      <div className="seating-container" ref={containerRef}>
        <TransformWrapper centerOnInit={true} minScale={isOverflowing ? 0.8 : 1}>
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div className="map" ref={mapRef}>
              {rows.map((row) => (
                <div className="row" key={row}>
                  {row}
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
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
      <button className="back" onClick={() => navigate("/")}>
        Retour
      </button>
    </div>
  );
};
