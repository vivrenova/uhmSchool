// Симульований «бекенд» демо: усе живе в localStorage цього браузера.
// BroadcastChannel синхронізує вкладки — оплата в одній вкладці одразу
// з’являється в кабінеті власника в іншій.
//
// Коли з’являться справжні інтеграції, замінюється лише цей модуль:
// addPayment → API оплати, addWaitlist → CRM/таблиця, notices → Telegram-бот.

import { COURSE, GROUPS, type GroupId, type PlanId } from '../config/school';
import { getGroup, type Schedule } from './schedule';

export type PayMethod = 'card' | 'apple' | 'google';

export interface Payment {
  id: string;
  createdAt: number;
  email: string;
  phone: string;
  groupId: GroupId;
  cohortKey: string;
  plan: PlanId;
  /** Сплачено зараз. */
  amount: number;
  /** Вартість курсу за обраною ціною. */
  total: number;
  early: boolean;
  method: PayMethod;
  cardLast4?: string;
  /** Стартові дані демо (не з цього браузера). */
  seeded?: boolean;
}

/** Замовлення між чекаутом і оплатою. */
export interface Draft {
  id: string;
  createdAt: number;
  email: string;
  phone: string;
  groupId: GroupId;
  cohortKey: string;
  plan: PlanId;
  amount: number;
  total: number;
  early: boolean;
}

export interface WaitlistEntry {
  id: string;
  createdAt: number;
  name: string;
  phone: string;
  groupId: GroupId;
  cohortKey: string;
  seeded?: boolean;
}

export interface Notice {
  id: string;
  createdAt: number;
  kind: 'payment' | 'waitlist' | 'failed';
  refId?: string;
  amount?: number;
  email?: string;
  phone?: string;
  name?: string;
  groupId?: GroupId;
  reason?: string;
  /** Стартові дані: телефон показуємо замаскованим. */
  seeded?: boolean;
}

export interface DemoState {
  v: 1;
  payments: Payment[];
  waitlist: WaitlistEntry[];
  notices: Notice[];
  /** Демо-панель: «вже продано до нас» для групи замість значення з конфігу. */
  soldBase: Partial<Record<GroupId, number>>;
  /** Демо-панель: зсув годинника, мс. */
  timeOffset: number;
  draft: Draft | null;
  /** Кому з листа очікування власник уже запропонував місце. */
  offered: string[];
}

const KEY = 'uhm-demo-v1';
export const emptyState = (): DemoState => ({
  v: 1,
  payments: [],
  waitlist: [],
  notices: [],
  soldBase: {},
  timeOffset: 0,
  draft: null,
  offered: [],
});
const empty = emptyState;

const isBrowser = typeof window !== 'undefined';

function read(): DemoState {
  if (!isBrowser) return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as DemoState;
    return parsed?.v === 1 ? { ...empty(), ...parsed } : empty();
  } catch {
    return empty();
  }
}

let state: DemoState = read();
const listeners = new Set<() => void>();
const channel = isBrowser && 'BroadcastChannel' in window ? new BroadcastChannel('uhm-demo') : null;

function emit() {
  for (const l of listeners) l();
}

if (isBrowser) {
  channel?.addEventListener('message', () => {
    state = read();
    emit();
  });
  // Запасний шлях для браузерів без BroadcastChannel.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = read();
      emit();
    }
  });
}

export function getState(): DemoState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function update(fn: (s: DemoState) => DemoState | void) {
  const draft = structuredClone(state);
  state = fn(draft) ?? draft;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* приватний режим або переповнене сховище — демо просто не переживе перезавантаження */
  }
  channel?.postMessage('sync');
  emit();
}

export function resetDemo() {
  update(() => empty());
}

/** Демо-годинник: реальний час + зсув з демо-панелі. */
export function demoNow(s: DemoState = state): number {
  return Date.now() + (s.timeOffset || 0);
}

export function newId(prefix: string): string {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `${prefix}-${n}`;
}

// ——— Місця ———

export interface Seats {
  sold: number;
  free: number;
  total: number;
}

export function seatsFor(groupId: GroupId, s: DemoState, sch: Schedule): Seats {
  const g = getGroup(groupId);
  const base = s.soldBase[groupId] ?? g.seededSold;
  const mine = s.payments.filter((p) => p.groupId === groupId && p.cohortKey === sch.cohortKey).length;
  const sold = Math.min(COURSE.groupSize, base + mine);
  return { sold, free: COURSE.groupSize - sold, total: COURSE.groupSize };
}

export function allSeats(s: DemoState, sch: Schedule): Record<GroupId, Seats> {
  return Object.fromEntries(GROUPS.map((g) => [g.id, seatsFor(g.id, s, sch)])) as Record<GroupId, Seats>;
}
