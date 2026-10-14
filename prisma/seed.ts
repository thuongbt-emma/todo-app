import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { ensureDefaults } from '../src/lib/todo/defaults';

ensureDefaults(prisma)
  .then(() => console.log('Seed done'))
  .finally(() => prisma.$disconnect());
