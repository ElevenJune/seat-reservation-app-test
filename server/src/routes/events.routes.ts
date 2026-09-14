import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { prisma, SeatStatus } from '../lib/prisma';
import { releaseExpiredSeats, lockSeat, unlockSeat } from '../services/seatService';
import {
  userSectionSchema,
  eventSchema,
  lockSeatSchema,
  
} from '../schemas/events.schema';
import { networkInterfaces } from 'os';

export async function eventRoutes(app: FastifyInstance) {
  const fastify = app.withTypeProvider<ZodTypeProvider>();

  fastify.addHook('preHandler', async (request, reply) => {
    if(request.url.includes("seat"))
        await releaseExpiredSeats();
    });

  fastify.get(
    '/api/events/:id',
    { schema : eventSchema},
    async (request) => {
        const { id } = request.params;
        const {seats} = request.query;
        const allEvents = await prisma.event.findMany({
            include:{
                seats:(seats===true)
            },
            where: { id }
        });
        return {allEvents};
  });

  fastify.get(
    '/api/seats/:row',
    { schema: userSectionSchema },
    async (request) => {
      // row provient de params, asc provient de query
      const { row } = request.params;
      const { asc } = request.query; 
  
      const seats = await prisma.seat.findMany({
        orderBy: asc.valueOf() ? [{ number: 'asc' }] : [{ number: 'desc' }],
      });
      const filtered = seats.filter((seat) => seat.row === row);
      return { "list":filtered, "order":asc };
  });

fastify.post(
    '/api/seats/:row/:number/lock',
    { schema: lockSeatSchema },
    async (request, reply) => {
        const { row, number } = request.params;
        const result = await lockSeat(row,number)
        if (result.count === 0) {
            return reply.status(409).send({ error: "Seat already locked or not found" });
    }

    return { success: true, message: `Seat ${row}${number} locked` };
  });

fastify.post(
    '/api/seats/:row/:number/unlock',
    { schema: lockSeatSchema },
    async (request, reply) => {
        const { row, number } = request.params;
        const result = await unlockSeat(row,number)
        if (result.count === 0) {
            return reply.status(409).send({ error: "Seat already unlocked or not found" });
    }

    return { success: true, message: `Seat ${row}${number} unlocked` };
  });
}