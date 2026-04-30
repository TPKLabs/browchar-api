import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './prisma/generated/client';
import { env } from "@/config/env";

const connectionString = `${env.DATABASE_URL}`

const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({ adapter })

export { prisma }

export default prisma;