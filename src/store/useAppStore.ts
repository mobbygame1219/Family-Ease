// src/store/useAppStore.ts
import { create } from 'zustand';
import type { Group, Expense } from '@/types';

interface AppState {
  // Active group context
  activeGroupId: string | null;
  setActiveGroupId: (id: string | null) => void;

  // Cached groups (populated by server but useful for optimistic updates)
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeGroupId: null,
  setActiveGroupId: (id) => set({ activeGroupId: id }),

  groups: [],
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),
  updateGroup: (id, updates) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),
  removeGroup: (id) =>
    set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
