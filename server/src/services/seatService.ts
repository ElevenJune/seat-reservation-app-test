import { boolean } from "zod";
import { prisma, SeatStatus } from "../lib/prisma";

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
    },
  });

  return result.count;
}

export enum LockSeatError {
  QUOTA_REACHED = 1,
  UPDATE_FAILED = 2,
  NO_EVENT = 3,
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
  console.log("===> number of seats from", sessionId, seatsOfThisUser.length, seatsOfThisUser);
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

export async function bookSeat(sessionId: string) {
  return await prisma.seat.updateMany({
    where: { lockedBy: sessionId, status: SeatStatus.LOCKED },
    data: { status: SeatStatus.BOOKED, lockedAt: null, lockedBy: sessionId },
  });
}

export async function unlockSeat(id: string) {
  return await prisma.seat.updateMany({
    where: { id, status: SeatStatus.LOCKED },
    data: { status: SeatStatus.AVAILABLE, lockedAt: null, lockedBy: "" },
  });
}
