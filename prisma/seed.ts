// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: await bcrypt.hash('password123', 12),
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: await bcrypt.hash('password123', 12),
      },
    }),
    prisma.user.upsert({
      where: { email: 'carol@example.com' },
      update: {},
      create: {
        name: 'Carol White',
        email: 'carol@example.com',
        password: await bcrypt.hash('password123', 12),
      },
    }),
  ]);

  // Create a group
  const group = await prisma.group.create({
    data: {
      name: 'Tokyo Trip 2025',
      category: 'TRIP',
      description: 'Our amazing trip to Japan',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' },
          { userId: carol.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Create some expenses
  await prisma.expense.create({
    data: {
      title: 'Airbnb',
      amount: 900,
      category: 'ACCOMMODATION',
      groupId: group.id,
      paidById: alice.id,
      splits: {
        create: [
          { userId: alice.id, amount: 300 },
          { userId: bob.id, amount: 300 },
          { userId: carol.id, amount: 300 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      title: 'Ramen dinner',
      amount: 75,
      category: 'FOOD',
      groupId: group.id,
      paidById: bob.id,
      splits: {
        create: [
          { userId: alice.id, amount: 25 },
          { userId: bob.id, amount: 25 },
          { userId: carol.id, amount: 25 },
        ],
      },
    },
  });

  console.log('✅ Seed complete!');
  console.log('   alice@example.com / password123');
  console.log('   bob@example.com   / password123');
  console.log('   carol@example.com / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
