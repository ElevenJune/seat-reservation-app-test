import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma, SeatStatus } from "../lib/prisma";
import {
  releaseExpiredSeats,
  lockSeat,
  LockSeatError,
  unlockSeat,
  bookSeats,
  getUserCart,
  getUserBookedSeats,
  freeSeat,
} from "../services/seatService";
import {
  eventSchema,
  eventsSchema,
  lockSeatSchema,
  bookSeatsSchema,
  EventError,
  getUserCartSchema,
} from "../schemas/events.schema";
import { API_PATHS, SESSION_HEADER } from "../constants/routes";

export async function eventRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.addHook("preHandler", async (request, reply) => {
    if (request.url.includes("seat") || request.url.includes("events"))
      await releaseExpiredSeats();
  });

  fastify.get(
    API_PATHS.EVENT_BY_ID,
    { schema: eventSchema },
    async (request, reply) => {
      const { id } = request.params;
      const { seats } = request.query;
      const event = await prisma.event.findUnique({
        include: {
          seats: seats === true,
        },
        where: { id: id },
      });
      if (event) return { event };
      else
        return reply
          .status(404)
          .send({ error: "No event found with ID " + id });
    },
  );

  fastify.get(
    API_PATHS.EVENTS,
    { schema: eventsSchema },
    async (request, reply) => {
      const events = await prisma.event.findMany();
      if (events) return { events };
      else return reply.status(404).send({ error: "No event found " });
    },
  );

  fastify.get(
    API_PATHS.CART,
    { schema: getUserCartSchema },
    async (request, reply) => {
      const sessionId = request.headers[SESSION_HEADER];
      const seats = await getUserCart(sessionId);
      if (seats) return reply.status(200).send({ lockedSeats: seats });
      else return reply.status(404).send({ error: "User does not exists" });
    },
  );

  fastify.get(
    API_PATHS.BOOKED_SEATS,
    { schema: getUserCartSchema },
    async (request, reply) => {
      const sessionId = request.headers[SESSION_HEADER];
      const seats = await getUserBookedSeats(sessionId);
      if (seats) return reply.status(200).send({ lockedSeats: seats });
      else return reply.status(404).send({ error: "User does not exists" });
    },
  );

  fastify.post(
    API_PATHS.LOCK_SEAT,
    { schema: lockSeatSchema },
    async (request, reply) => {
      const { seatId } = request.params;
      const sessionId = request.headers[SESSION_HEADER];
      const result = await lockSeat(seatId, sessionId);

      if (!result.result) {
        let code = 400;
        let message = "Unknown error";

        switch (result.errCode) {
          case LockSeatError.QUOTA_REACHED:
            code = 412;
            message = "Quota of 5 seats by event reached";
            break;
          case LockSeatError.NO_EVENT:
            code = 400;
            message = "This seat does not have a parent event";
            break;
          case LockSeatError.UPDATE_FAILED:
            code = 404;
            message = "Seat already locked or not found";
            break;
        }

        return reply.status(code).send({ statusCode: code, error: message });
      }

      return reply.status(200).send({ seatId, locked: true });
    },
  );

  fastify.post(
    API_PATHS.UNLOCK_SEAT,
    { schema: lockSeatSchema },
    async (request, reply) => {
      const { seatId } = request.params;
      const sessionId = request.headers[SESSION_HEADER];
      const result = await unlockSeat(seatId, sessionId);
      if (result.count === 0) {
        return reply
          .status(404)
          .send({ error: "Seat not locked by you or not found" });
      }

      return reply.status(200).send({ seatId, locked: false });
    },
  );

  fastify.post(
    API_PATHS.FREE_SEAT,
    { schema: lockSeatSchema },
    async (request, reply) => {
      const { seatId } = request.params;
      const sessionId = request.headers[SESSION_HEADER];
      const result = await freeSeat(seatId, sessionId);
      if (result.count === 0) {
        return reply
          .status(404)
          .send({ error: "Seat not booked by you or not found" });
      }

      return reply.status(200).send({ seatId, locked: false });
    },
  );

  fastify.post(
    API_PATHS.BOOK_SEATS,
    { schema: bookSeatsSchema },
    async (request, reply) => {
      const sessionId = request.headers[SESSION_HEADER];
      const result = await bookSeats(sessionId);
      if (result.count === 0) {
        return reply.status(404).send({ error: "No seat locked by that id" });
      }
      return reply.status(200).send({ sessionId });
      //return { success: true, message: `Seat ${row}${number} locked` };
    },
  );
}
