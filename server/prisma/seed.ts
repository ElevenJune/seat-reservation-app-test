// prisma/seed.ts
import { prisma, SeatStatus } from "../src/lib/prisma.js";

async function main() {
  console.log("Nettoyage de la base de données...");
  // Supprime les données existantes si besoin pour repartir à zéro
  await prisma.seat.deleteMany();
  await prisma.event.deleteMany();

  const eventKP = await prisma.event.create({
    data: {
      title: "Katy Perry",
      date: new Date(),
    },
  });
  const eventO = await prisma.event.create({
    data: {
      title: "Orelsan",
      date: new Date(),
    },
  });
  const seatsDataKP = [];
  const seatsDataO = [];
  const rows = ['A', 'B', 'C', 'D','E','F'];
  for (const row of rows) {
    for (let num = 1; num <= 15; num++) {
      seatsDataO.push({
        row,
        number: num,
        price: 60.0,
        status: SeatStatus.AVAILABLE,
        eventId: eventO.id,
      });
    }
    if(row=="E"||row=="F")
      continue
    for (let num = 1; num <= 10; num++) {
      seatsDataKP.push({
        row,
        number: num,
        price: 50.0,
        status: SeatStatus.AVAILABLE,
        eventId: eventKP.id,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsDataKP });
  await prisma.seat.createMany({ data: seatsDataO });
  console.log("Seeding terminé");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });