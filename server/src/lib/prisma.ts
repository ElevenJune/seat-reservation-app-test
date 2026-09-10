import dotenv from "dotenv";
dotenv.config();

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, SeatStatus } from "../generated/prisma/index.js";

// Pour SQLite, adapter-better-sqlite3 s'appuie sur le chemin défini dans la datasource ou un chemin direct
const connectionString = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

const adapter = new PrismaBetterSqlite3({ url: connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma, SeatStatus };