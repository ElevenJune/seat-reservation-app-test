import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import apiClient from "../api/axios";

import { formatDate, getOrCreateSessionId, appRoutes } from "../utils/utils";
import "./Section.css";
import { Seat } from "./Seat";
import { HLayout, VLayout } from "./Navigation/Layout";
import { RoundedButton } from "./Widgets/RoundedButton";
import { Loading } from "./Widgets/Loading";
import { type SeatType, SeatStatus } from "../types/seat";
import type { Event } from "@server/schemas/types";
import {
  type GetEventResponse,
  type LockSeatResponse,
  type EventError,
} from "@server/constants/types";

interface SectionProps {}

export const Section: React.FC<SectionProps> = ({}) => {
  const { id: eventId } = useParams<{ id: string }>();

  const [seats, setSeats] = useState<SeatType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const userSeats = useMemo(()=> seats.filter(
    (s) =>
      s.lockedBy === getOrCreateSessionId() &&
      s.eventId === eventId &&
      (s.status === SeatStatus.BOOKED || s.status == SeatStatus.LOCKED),
  ),[seats,eventId]);
  const numberOfSelectedSeats = userSeats.filter((s)=>s.status == SeatStatus.LOCKED).length;
  const isLimitReached = userSeats.length >= 5;

  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);

  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(null);

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

    timerRef.current = setInterval(() => {
      updateSeats(eventId);
    }, 60000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [eventId]);

  function checkOverflow() {
    if (containerRef.current && mapRef.current) {
      setIsOverflowing(
        containerRef.current.clientWidth < mapRef.current.scrollWidth * 0.9 ||
          containerRef.current.clientHeight < mapRef.current.scrollHeight * 0.9,
      );
    }
  }
  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
  }, []);

  function updateSeats(eventId: string) {
    if (!eventId) return;
    apiClient
      .get<GetEventResponse>(appRoutes.event(eventId), {
        skipToast: true,
      } as any)
      .then((response) => {
        const eventData = response.data.event;
        if (!eventData || !eventData.seats) return;
        setSeats(eventData.seats);

        setEvent(eventData);
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      })
      .catch((error) => {
        setLoading(false);
        if (error.response?.status === 404) {
          const errData = error.response?.data as EventError;
          console.error("Erreur serveur :", errData?.error);
          setNotFound(true);
        }
      });
  }

  function toggleSeat(seatId: string) {
    if (!eventId) return;
    const selectedSeat = seats.find((seat) => seat.id === seatId);
    const action =
      selectedSeat?.status === SeatStatus.LOCKED ? "unlock" : "lock";
    if (
      selectedSeat?.status === SeatStatus.BOOKED ||
      (action == "lock" && isLimitReached)
    )
      return;
    apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId, action))
      .then((response) => {
        if (response.status === 200) updateSeats(eventId);
      });
  }

  let component = null;
  if (loading)
    component = (
      <div className="filling-component">
        <Loading />
      </div>
    );
  else if (notFound || seats.length == 0)
    component = (
      <div className="filling-component">
        <h2>Oups...</h2>
        <p>
          {!notFound
            ? "Cet événement n'a aucun siège"
            : "Aucun événement n'a été trouvé avec cet ID."}
        </p>
      </div>
    );
  else
    component = (
      <div className="seating-container" ref={containerRef}>
        <p>Select your seat</p>
        <TransformWrapper
          centerOnInit={true}
          minScale={isOverflowing ? 0.8 : 1}
          maxScale={1.2}
        >
          <TransformComponent
            wrapperClass="scrollview"
            wrapperStyle={{
              width: "100%",
              height: "100%",
              maxHeight: "500px",
              minHeight: "300px",
            }}
            contentStyle={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              className={`map ${isLimitReached ? "limit-reached" : ""}`}
              ref={mapRef}
            >
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
                        yours={seat.lockedBy === getOrCreateSessionId()}
                        onClick={() => toggleSeat(seat.id)}
                      />
                    ))}
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
        {isLimitReached ? (
          <div className="alert-banner">
            Vous avez atteint la limite maximale de 5 sièges.
          </div>
        ) : (
          <p>Sièges réservables : {numberOfSelectedSeats}/{5-(userSeats.length-numberOfSelectedSeats)}, Sièges réservés : {userSeats.length-numberOfSelectedSeats}/5</p>
        )}
      </div>
    );

  return (
    <VLayout className="page-container" justify="start" gap="10px">
      <h2 className="mt-header">{event?.title ?? "Event"}</h2>
      <p>{event?.date ? formatDate(event.date) : ""}</p>
      {component}
      <HLayout gap="20px">
        <RoundedButton onClick={() => navigate("/")}>Retour</RoundedButton>
        <RoundedButton
          disabled={numberOfSelectedSeats == 0}
          variant="secondary"
          onClick={() => {
            navigate("/cart");
          }}
        >
          Continuer
        </RoundedButton>
      </HLayout>
    </VLayout>
  );
};
