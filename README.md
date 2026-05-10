# SplitEase 💸

A Splitwise-inspired expense splitting app built with Next.js 14, Prisma, and PostgreSQL.

## Features

- 👥 Create groups (trips, home, work, etc.)
- 💰 Add expenses with equal, exact, or percentage splits
- 📊 View balances — who owes who
- ✅ Settle up and mark debts as paid
- 🔐 Secure authentication with NextAuth.js

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 (credentials) |
| Styling | Tailwind CSS |
| State | Zustand |
| Validation | Zod |
| Forms | React Hook Form |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth handler
│   │   ├── groups/         # Group CRUD
│   │   ├── expenses/       # Expense CRUD
│   │   ├── settlements/    # Settlements
│   │   └── users/          # User management
│   ├── auth/               # Login & register pages
│   ├── dashboard/          # Main dashboard
│   ├── groups/             # Group pages
│   ├── expenses/           # Expense pages
│   └── settlements/        # Settlement pages
├── components/
│   ├── layout/             # Sidebar, Header
│   ├── ui/                 # Reusable UI components
│   ├── groups/             # Group-specific components
│   └── expenses/           # Expense-specific components
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   └── auth.ts             # NextAuth config
├── hooks/                  # Custom React hooks
├── store/                  # Zustand stores
├── types/                  # TypeScript types
└── utils/
    ├── balance.ts          # Balance calculation algorithm
    └── cn.ts               # Tailwind class utility
```

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo>
cd splitwise-clone
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:
- `DATABASE_URL` — get a free PostgreSQL DB from [Neon](https://neon.tech) or [Railway](https://railway.app)
- `AUTH_SECRET` — run `openssl rand -base64 32`

### 3. Set up the database

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # run migrations
npm run db:seed       # optional: seed with test data
```

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Test accounts (after seeding)

| Email | Password |
|-------|----------|
| alice@example.com | password123 |
| bob@example.com | password123 |
| carol@example.com | password123 |

## Key Algorithms

### Balance Computation

Each expense has splits. To compute net balances:
- Payer's balance increases by each split amount
- Each split user's balance decreases by their split amount

### Debt Simplification

Uses a greedy algorithm to minimise the number of transactions:
1. Separate users into creditors (positive balance) and debtors (negative balance)
2. Match the largest creditor with the largest debtor
3. Settle the minimum of the two amounts, repeat

See `src/utils/balance.ts` for the full implementation.

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Add environment variables in the Vercel dashboard.
Use [Neon](https://neon.tech) for a serverless PostgreSQL database.

## Roadmap

- [ ] Email invitations to groups
- [ ] Expense categories with icons
- [ ] Activity feed / notifications
- [ ] Currency conversion
- [ ] Receipt photo uploads
- [ ] Monthly spending reports
- [ ] Mobile app (React Native)
