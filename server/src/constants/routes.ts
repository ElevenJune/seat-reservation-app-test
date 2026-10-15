export const API_PATHS = {
  EVENTS: '/api/events',
  EVENT_BY_ID: '/api/events/:id',
  LOCK_SEAT: '/api/seats/:seatId/lock',
  UNLOCK_SEAT: '/api/seats/:seatId/unlock',
} as const;

export const appRoutes = {
  lockSeat: (seatId: string, action: string) => 
    `/api/seats/${seatId}/${action}`,
};