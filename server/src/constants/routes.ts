export const API_PATHS = {
  EVENTS: '/api/events',
  EVENT_BY_ID: '/api/events/:id',
  LOCK_SEAT: '/api/seats/:seatId/lock',
  UNLOCK_SEAT: '/api/seats/:seatId/unlock',
  FREE_SEAT: '/api/seats/:seatId/free',
  BOOK_SEATS: '/api/seats/book',
  CART: '/api/cart',
  BOOKED_SEATS: '/api/bookedSeats'
} as const;

// The user session is always carried by this header,
// set on the client side by the axios request interceptor.
export const SESSION_HEADER = "x-session-id";
