// src/types/index.ts

export type GroupCategory = 'HOME' | 'TRIP' | 'FOOD' | 'WORK' | 'OTHER';
export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ENTERTAINMENT' | 'UTILITIES' | 'SHOPPING' | 'HEALTH' | 'OTHER';
export type MemberRole = 'ADMIN' | 'MEMBER';
export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface GroupMember {
  id: string;
  role: MemberRole;
  joinedAt: Date;
  userId: string;
  groupId: string;
  user: User;
}

export interface Group {
  id: string;
  name: string;
  description?: string | null;
  category: GroupCategory;
  imageUrl?: string | null;
  createdAt: Date;
  createdById: string;
  members: GroupMember[];
  _count?: { expenses: number };
}

export interface ExpenseSplit {
  id: string;
  amount: number;
  settled: boolean;
  settledAt?: Date | null;
  userId: string;
  expenseId: string;
  user: User;
}

export interface Expense {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  date: Date;
  createdAt: Date;
  paidById: string;
  groupId: string;
  paidBy: User;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: string;
  amount: number;
  currency: string;
  note?: string | null;
  createdAt: Date;
  payerId: string;
  receiverId: string;
  groupId: string;
  payer: User;
  receiver: User;
}

// Computed balance between two users in a group
export interface Balance {
  userId: string;
  user: User;
  amount: number; // positive = they owe you, negative = you owe them
}

// Simplified debt after running the settlement algorithm
export interface Debt {
  from: User;
  to: User;
  amount: number;
}
