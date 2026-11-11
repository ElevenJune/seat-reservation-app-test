import { prisma, SeatStatus } from "../lib/prisma";
import { type Seat } from "../generated/prisma";
import { type PublicSeat } from "../schemas/events.schema";

export async function releaseExpiredSeats() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const result = await prisma.seat.updateMany({
    where: {
      status: SeatStatus.LOCKED,
      OR: [{ lockedAt: { lt: tenMinutesAgo } }, { lockedAt: null }],
    },
    data: {
      status: SeatStatus.AVAILABLE,
      lockedAt: null,
      lockedBy: "",
    },
  });

  return result.count;
}

export enum LockSeatError {
  QUOTA_REACHED = 1,
  UPDATE_FAILED = 2,
  NO_EVENT = 3,
}

function isHeldBy(seat: Seat, sessionId?:string){
  return !!sessionId && seat.status!==SeatStatus.AVAILABLE && seat.lockedBy === sessionId
}

export function toPublicSeat(seat: Seat, sessionId?:string): PublicSeat {
  return{
    id: seat.id,
    row: seat.row,
    number: seat.number,
    status: seat.status,
    price: seat.price,
    updatedAt: seat.updatedAt,
    eventId: seat.eventId,
    isMine: isHeldBy(seat,sessionId)
  };
}

export async function lockSeat(
  id: string,
  sessionId: string,
): Promise<{ result: boolean; errCode: LockSeatError }> {
  const eventId = (
    await prisma.seat.findFirst({
      where: { id },
    })
  )?.eventId;
  if (!eventId) return Promise.resolve({ result: false, errCode: LockSeatError.NO_EVENT });
  const seatsOfThisUser = await prisma.seat.findMany({
    where: {
      lockedBy: sessionId,
      eventId,
      NOT : {status:SeatStatus.AVAILABLE},
    },
  });
  //console.log("===> number of seats from", sessionId, seatsOfThisUser.length, seatsOfThisUser);
  if (seatsOfThisUser.length >=5 )
    return Promise.resolve({ result: false, errCode: LockSeatError.QUOTA_REACHED });
  const p = await prisma.seat.updateMany({
    where: { id, status: SeatStatus.AVAILABLE },
    data: {
      status: SeatStatus.LOCKED,
      lockedAt: new Date(),
      lockedBy: sessionId,
    },
  });
  return { result: p.count > 0, errCode: LockSeatError.UPDATE_FAILED };
}

export async function bookSeats(sessionId: string) {
  return await prisma.seat.updateMany({
    where: { lockedBy: sessionId, status: SeatStatus.LOCKED },
    data: { status: SeatStatus.BOOKED, lockedAt: null, lockedBy: sessionId },
  });
}

// Filtering on lockedBy in the where clause makes the ownership check atomic:
// if the seat does not belong to this session, count is 0.
export async function unlockSeat(id: string, sessionId: string) {
  return await prisma.seat.updateMany({
    where: { id, status: SeatStatus.LOCKED, lockedBy: sessionId },
    data: { status: SeatStatus.AVAILABLE, lockedAt: null, lockedBy: "" },
  });
}

export async function freeSeat(id: string, sessionId: string) {
  return await prisma.seat.updateMany({
    where: { id, status: SeatStatus.BOOKED, lockedBy: sessionId },
    data: { status: SeatStatus.AVAILABLE, lockedAt: null, lockedBy: "" },
  });
}

export async function getUserCart(sessionId: string){
  return await prisma.seat.findMany({
    where: { status : SeatStatus.LOCKED, lockedBy: sessionId},
    //omit: { lockedBy: true, lockedAt: true },
    include: { event : true }
  });
}

export async function getUserBookedSeats(sessionId: string){
  return await prisma.seat.findMany({
    where: { status : SeatStatus.BOOKED, lockedBy: sessionId},
    //omit: { lockedBy: true, lockedAt: true },
    include: { event : true }
  });
}
