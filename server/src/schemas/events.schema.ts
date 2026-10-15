import { boolean, number, z } from "zod";
import { EventSchema, SeatSchema } from "../generated/zod";

const optionalBoolSchema = (defaultValue = false) =>
  z
    .union([z.boolean(), z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === "") return undefined;
      const str = String(val).trim().toLowerCase();
      if (["1", "true", "yes"].includes(str)) return true;
      if (["0", "false", "no"].includes(str)) return false;
      return undefined;
    })
    .pipe(z.boolean().optional())
    .default(defaultValue);

export const RowEnum = z.enum(["A", "B", "C", "D"]);
export const EventErrorSchema = z.object({
  error: z.string(),
  statusCode: z.number().optional(),
});

export type EventError = z.infer<typeof EventErrorSchema>;

// ===== Routes
export const API_PATHS = {
  EVENTS: '/api/events',
  EVENT_BY_ID: '/api/events/:id',
  LOCK_SEAT: '/api/seats/:seatId/lock',
  UNLOCK_SEAT: '/api/seats/:seatId/unlock',
} as const;

/*export const appRoutes = {
  lockSeat: (seatId: string, action: string) => 
    `/api/seats/${seatId}/${action}`,
};*/


// ===== Schemas
export const userSectionSchema = {
  // Paramètres d'URL (:row)
  params: z.object({
    row: RowEnum,
  }),
  // Paramètres de query (?asc=true)
  querystring: z.object({
    asc: optionalBoolSchema(true),
  }),
};

export const eventSchema = {
  params: z.object({
    //Factorize when needed
    id: z.string().optional(),
  }),
  querystring: z.object({
    seats: optionalBoolSchema(true),
  }),
  response: {
    200: z.object({
      event: EventSchema.extend({
        seats: z.array(SeatSchema).optional(),
      }),
    }),
    "4xx": EventErrorSchema,
  },
};
export type GetEventResponse = z.infer<(typeof eventSchema.response)[200]>;

export const eventsSchema = {
  response: {
    200: z.object({
      events: z.array(EventSchema),
    }),
    "4xx": EventErrorSchema,
  },
};
export type GetEventsResponse = z.infer<(typeof eventsSchema.response)[200]>;


export const lockSeatSchema = {
  // Paramètres d'URL (:row)
  params: z.object({
    seatId: z.string()
  }),
  response: {
    200: z.object({
      seatId: z.string(),
      locked: z.boolean(),
    }),
    "4xx": z.object({
      error: z.string(),
    }),
  },
};

export type LockSeatResponse = z.infer<(typeof lockSeatSchema.response)[200]>;
