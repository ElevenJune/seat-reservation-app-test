import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [bookedSeats, setBookedSeats] = useState<GetUserCartResponse>();
  let isCartEmpty = !(cartContent && cartContent.lockedSeats.length>0);
  let isBookedEmpty = !(bookedSeats && bookedSeats.lockedSeats.length>0);

  let navigate = useNavigate();

  useEffect(() => {
    getUserCart();
    getBookedSeats();
  }, []);

  function getUserCart() {
    apiClient
      .get<GetUserCartResponse>(appRoutes.getCart())
      .then((response) => {
        setCartContent(response.data)
      });
  }

  function getBookedSeats() {
    apiClient
      .get<GetUserCartResponse>(appRoutes.getBookedSeats())
      .then((response) => {
        setBookedSeats(response.data)
      });
  }

    function bookSeats() {
      apiClient
        .post<LockSeatResponse>(appRoutes.bookSeats())
        .then((response) => {
          if (response.status === 200){
            getUserCart();
            getBookedSeats();
          }
        });
    }

    function removeSeat(seatId:string){
      apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId, "unlock"))
      .then((response) => {
        if (response.status === 200) getUserCart();
      });
    }

    function cancelSeat(seatId:string){
      apiClient
      .post<LockSeatResponse>(appRoutes.lockSeat(seatId, "free"))
      .then((response) => {
        if (response.status === 200) getBookedSeats();
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

  let booked = bookedSeats?.lockedSeats.map((seat) => (
    <HLayout className="cartItem" align='stretch' justify="end" gap="20px" key={seat.id}>
      <a className="eventTitle" onClick={()=>{navigate(`/event/${seat.eventId}`)}}><b>{seat.event.title}</b></a>
      <p className="eventSeat">{`${seat.row}${seat.number}`}</p>
      <p className="eventPrice">{seat.price+"€"}</p>
      <RoundedButton variant="secondary" additionalClassName="removeFromCartButton" onClick={()=>{cancelSeat(seat.id)}}>Cancel</RoundedButton>
    </HLayout>
  ));

  let component = !isCartEmpty ? list : (<i>Cart is empty</i>)
  let component2 = !isBookedEmpty ? booked : (<i>You don't have any booked seat</i>)

  return (
    <VLayout className="page-container" justify="start" gap="10px">
        <h2 className="mt-header">Cart</h2>
        {component}
        <RoundedButton hidden={isCartEmpty} additionalClassName="bookButton" onClick={bookSeats} >Réserver</RoundedButton>
        <h2 className="mt-header">Your booked Seats</h2>
        {component2}
    </VLayout>
  )
};
