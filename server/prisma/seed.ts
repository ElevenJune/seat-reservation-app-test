// prisma/seed.ts
import { prisma, SeatStatus } from "../src/lib/prisma.js";

async function main() {
  console.log("Nettoyage de la base de données...");
  // Supprime les données existantes si besoin pour repartir à zéro
  await prisma.seat.deleteMany();
  await prisma.event.deleteMany();

  const event = await prisma.event.create({
    data: {
      title: "Concert Live Salle Principale",
      date: new Date(),
    },
  });
  const seatsData = [];
  const rows = ['A', 'B', 'C', 'D'];
  for (const row of rows) {
    for (let num = 1; num <= 10; num++) {
      seatsData.push({
        row,
        number: num,
        price: 50.0,
        status: SeatStatus.AVAILABLE,
        eventId: event.id,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsData });
  console.log("Seeding terminé : Événement et 40 sièges créés.");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });