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

export async function lockSeat(row:string,number:number){
  return await prisma.seat.updateMany({
    where: { row, number, status:SeatStatus.AVAILABLE },
    data : {status:SeatStatus.LOCKED, lockedAt:new Date()}
  });
}

export async function unlockSeat(row:string,number:number){
  return await prisma.seat.updateMany({
    where: { row, number, status:SeatStatus.LOCKED },
    data : {status:SeatStatus.AVAILABLE, lockedAt:null}
  });
}