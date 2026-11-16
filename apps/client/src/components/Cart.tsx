import { useNavigate } from "react-router-dom";
import { VLayout, HLayout } from "./Navigation/Layout";
import { RoundedButton } from "./Widgets/RoundedButton";
import { useCartContent, useBookedSeats } from "../api/cart";
import { useLockSeat, useBookSeat } from "../api/seats";

import "./Cart.css";

export const Cart: React.FC<{}> = () => {
  //const [bookedSeats, setBookedSeats] = useState<GetUserCartResponse>();
  const bookedSeatsQuery = useBookedSeats();
  const cartQuery = useCartContent();

  const lockSeat = useLockSeat();
  const bookSeats = useBookSeat();

  let navigate = useNavigate();

  function book() {
    bookSeats.mutate(undefined);
  }

  function removeSeat(seatId: string) {
    lockSeat.mutate({ seatId, action: "unlock" });
  }

  function cancelSeat(seatId: string) {
    lockSeat.mutate({ seatId, action: "free" });
  }

  let list = cartQuery.data?.lockedSeats.map((seat) => (
    <HLayout
      className="cartItem"
      align="stretch"
      justify="end"
      gap="20px"
      key={seat.id}
    >
      <a
        className="eventTitle"
        onClick={() => {
          navigate(`/event/${seat.eventId}`);
        }}
      >
        <b>{seat.event.title}</b>
      </a>
      <p className="eventSeat">{`${seat.row}${seat.number}`}</p>
      <p className="eventPrice">{seat.price + "€"}</p>
      <RoundedButton
        variant="secondary"
        additionalClassName="removeFromCartButton"
        onClick={() => {
          removeSeat(seat.id);
        }}
      >
        X
      </RoundedButton>
    </HLayout>
  ));

  let booked = bookedSeatsQuery.data?.lockedSeats.map((seat) => (
    <HLayout
      className="cartItem"
      align="stretch"
      justify="end"
      gap="20px"
      key={seat.id}
    >
      <a
        className="eventTitle"
        onClick={() => {
          navigate(`/event/${seat.eventId}`);
        }}
      >
        <b>{seat.event.title}</b>
      </a>
      <p className="eventSeat">{`${seat.row}${seat.number}`}</p>
      <p className="eventPrice">{seat.price + "€"}</p>
      <RoundedButton
        variant="secondary"
        additionalClassName="removeFromCartButton"
        onClick={() => {
          cancelSeat(seat.id);
        }}
      >
        Cancel
      </RoundedButton>
    </HLayout>
  ));

  function renderCart() {
    if (cartQuery.isPending) return <i>Loading...</i>;
    if (cartQuery.isError) return <i>{"Error: " + cartQuery.error}</i>;
    if (cartQuery.data.lockedSeats.length === 0) return <i>Cart is empty</i>;
    return list;
  }

  function renderBookedSeats() {
    if (bookedSeatsQuery.isPending) return <i>Loading...</i>;
    if (bookedSeatsQuery.isError)
      return <i>{"Error: " + bookedSeatsQuery.error}</i>;
    if (bookedSeatsQuery.data.lockedSeats.length === 0)
      return <i>You don't have any booked seat</i>;
    return booked;
  }

  return (
    <VLayout className="page-container" justify="start" gap="10px">
      <h2 className="mt-header">Cart</h2>
      {renderCart()}
      <RoundedButton
        hidden={!cartQuery.data||cartQuery.data.lockedSeats.length==0}
        additionalClassName="bookButton"
        onClick={book}
      >
        Réserver
      </RoundedButton>
      <h2 className="mt-header">Your booked Seats</h2>
      {renderBookedSeats()}
    </VLayout>
  );
};
