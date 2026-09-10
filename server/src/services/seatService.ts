import {prisma, SeatStatus} from "../lib/prisma"

export async function releaseExpiredSeats() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const result = await prisma.seat.updateMany({
    where: {
      status: SeatStatus.LOCKED,
      OR :[ {lockedAt: { lt: tenMinutesAgo }},{lockedAt:null}],
    },
    data: {
      status: SeatStatus.AVAILABLE,
      lockedAt: null,
    },
  });


  return result.count;
}