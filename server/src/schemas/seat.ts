// 1. Import uniquement des TYPES générés par Prisma (0% de code JS Node/Prisma au runtime)
import type { 
  Seat as PrismaSeat, 
  SeatStatus as PrismaSeatStatus, 
  Event as PrismaEvent 
} from "../generated/prisma/index.js";

// 2. Objet JavaScript pur (runtime) utilisable côté React pour éviter les chaînes magiques
export const SeatStatus = {
  AVAILABLE: "AVAILABLE",
  BOOKED: "BOOKED",
  LOCKED: "LOCKED",
} as const;

// 3. Réexport des types Prisma pour le frontend et le backend
export type Seat = PrismaSeat;
export type SeatStatus = PrismaSeatStatus;
export type Event = PrismaEvent;