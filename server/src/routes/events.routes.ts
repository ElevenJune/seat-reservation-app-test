import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma, SeatStatus } from "../lib/prisma";
import {
  releaseExpiredSeats,
  lockSeat,
  unlockSeat,
} from "../services/seatService";
import {
  userSectionSchema,
  eventSchema,
  eventsSchema,
  lockSeatSchema
} from "../schemas/events.schema";
import { API_PATHS } from "../constants/routes";

export async function eventRoutes(app: FastifyInstance) {

  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.addHook("preHandler", async (request, reply) => {
    if (request.url.includes("seat") || request.url.includes("events")) await releaseExpiredSeats();
  });

  fastify.get("/api/events/:id", { schema: eventSchema }, async (request, reply) => {
    const { id } = request.params;
    const { seats } = request.query;
    const event = await prisma.event.findUnique({
      include: {
        seats: seats === true,
      },
      where: { id: id },
    });
    if (event)
      return { event };
    else
      return reply.status(404).send({error:"No event found with ID "+id});
      
  });

  fastify.get("/api/events", { schema: eventsSchema }, async (request, reply) => {
    const events = await prisma.event.findMany();
    if (events)
      return { events };
    else
      return reply.status(404).send({error:"No event found "});
  });

  fastify.get(
    "/api/seats/:row",
    { schema: userSectionSchema },
    async (request) => {
      // row provient de params, asc provient de query
      const { row } = request.params;
      const { asc } = request.query;

      const seats = await prisma.seat.findMany({
        orderBy: asc.valueOf() ? [{ number: "asc" }] : [{ number: "desc" }],
      });
      const filtered = seats.filter((seat) => seat.row === row);
      return { list: filtered, order: asc };
    },
  );

  fastify.post(
    API_PATHS.LOCK_SEAT,
    { schema: lockSeatSchema },
    async (request, reply) => {
      const { seatId } = request.params;
      const result = await lockSeat(seatId);
      if (result.count === 0) {
        return reply
          .status(404)
          .send({ error: "Seat already locked or not found" });
      }
      return reply.status(200).send({seatId,locked:true});
      //return { success: true, message: `Seat ${row}${number} locked` };
    },
  );

  fastify.post(
    API_PATHS.UNLOCK_SEAT,
    { schema: lockSeatSchema },
    async (request, reply) => {
      const { seatId } = request.params;
      const result = await unlockSeat(seatId);
      if (result.count === 0) {
        return reply
          .status(404)
          .send({ error: "Seat already unlocked or not found" });
      }

      return reply.status(200).send({seatId,locked:false});
    },
  );
}
