import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOrCreateSessionId } from "../utils/utils";
import { VLayout, HLayout } from "./Navigation/Layout";
import { RoundedButton } from "./Widgets/RoundedButton";
import apiClient from "../api/axios";
import { appRoutes } from "../utils/utils";
import {
  type GetUserCartResponse,
  type LockSeatResponse,
  type EventError,
} from "@server/constants/types";

import "./Cart.css"

export const Cart: React.FC<{}> = () => {
  const [cartContent, setCartContent] = useState<GetUserCartResponse>();
  let isEmpty = !(cartContent && cartContent.lockedSeats.length>0);

  let navigate = useNavigate();

  useEffect(() => {
    getUserCart();
  }, []);

  function getUserCart() {
    const sessionId = getOrCreateSessionId();
    apiClient
      .get<GetUserCartResponse>("cart", {
        headers: { "x-session-id": sessionId },
      })
      .then((response) => {
        setCartContent(response.data)
      });
  }

    function bookSeats(sessionId: string) {
      apiClient
        .post<LockSeatResponse>(appRoutes.bookSeats(), { sessionId })
        .then((response) => {
          if (response.status === 200) getUserCart();
        });
    }

    function removeSeat(seatId:string){
      apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId, "unlock"), {
        sessionId: getOrCreateSessionId(),
      })
      .then((response) => {
        if (response.status === 200) getUserCart();
      });
    }

  let list = cartContent?.lockedSeats.map((seat) => (
    <HLayout className="cartItem" align='stretch' justify="end" gap="20px" key={seat.id}>
      <a className="eventTitle" onClick={()=>{navigate(`/event/${seat.eventId}`)}}><b>{seat.event.title}</b></a>
      <p className="eventSeat">{`${seat.row}${seat.number}`}</p>
      <p className="eventPrice">{seat.price+"€"}</p>
      <RoundedButton variant="secondary" additionalClassName="removeFromCartButton" onClick={()=>{removeSeat(seat.id)}}>X</RoundedButton>
    </HLayout>
  ));

  let component = !isEmpty ? list : (<i>Cart is empty</i>)

  return (
    <VLayout className="page-container" justify="start" gap="10px">
        <h2 className="mt-header">Cart</h2>
        {component}
        <RoundedButton hidden={isEmpty} additionalClassName="bookButton" onClick={()=>{bookSeats(getOrCreateSessionId())}} >Réserver</RoundedButton>
    </VLayout>
  )
};
