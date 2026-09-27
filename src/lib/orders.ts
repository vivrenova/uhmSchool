// Дії демо-«бекенду»: замовлення, оплати, лист очікування, сповіщення власнику,
// плюс стартові дані, щоб кабінет власника не був порожнім.

import { COURSE, GROUPS, PLANS, type GroupId, type PlanId } from '../config/school';
import { planAmounts } from './pricing';
import { addDays, kyivToInstant, type Schedule } from './schedule';
import {
  getState,
  newId,
  seatsFor,
  update,
  type DemoState,
  type Draft,
  type Notice,
  type PayMethod,
  type Payment,
  type WaitlistEntry,
} from './store';

// ——— Стартові дані ———
// Прив’язані до потоку: продажі відкрились за 28 днів до старту, оплати розкидані
// по перших 11 днях — тож завжди в минулому й однакові для всіх відвідувачів.

const PEOPLE: { email: string; phone: string; plan: PlanId; method: PayMethod; h: number; m: number }[] = [
  { email: 'kateryna.m2107@gmail.com', phone: '671234845', plan: 'full', method: 'apple', h: 21, m: 14 },
  { email: 'andrii.bondar.dev@gmail.com', phone: '931187702', plan: 'bank', method: 'card', h: 9, m: 41 },
  { email: 'marta.sly@ukr.net', phone: '504419236', plan: 'full', method: 'google', h: 13, m: 5 },
  { email: 'ihor.v.krakow@gmail.com', phone: '682093318', plan: 'two', method: 'card', h: 7, m: 52 },
  { email: 'sofiia.tkachuk@icloud.com', phone: '995528140', plan: 'full', method: 'apple', h: 22, m: 37 },
  { email: 'd.melnyk.pm@gmail.com', phone: '961370425', plan: 'two', method: 'apple', h: 18, m: 20 },
  { email: 'yulia.hrytsenko@i.ua', phone: '731164509', plan: 'full', method: 'card', h: 20, m: 3 },
  { email: 'oksana.lviv.88@gmail.com', phone: '977741286', plan: 'bank', method: 'card', h: 12, m: 48 },
  { email: 'roman.shev.qa@gmail.com', phone: '638850117', plan: 'full', method: 'apple', h: 8, m: 15 },
  { email: 'nataliia.kozak@ukr.net', phone: '662207534', plan: 'full', method: 'card', h: 19, m: 26 },
  { email: 'taras.onysko@gmail.com', phone: '503318460', plan: 'two', method: 'google', h: 23, m: 9 },
  { email: 'viktoriia.ryb@icloud.com', phone: '937720194', plan: 'full', method: 'apple', h: 10, m: 57 },
  { email: 'maksym.dz@gmail.com', phone: '681145376', plan: 'bank', method: 'card', h: 16, m: 34 },
  { email: 'iryna.pavlenko.hr@gmail.com', phone: '994406921', plan: 'full', method: 'apple', h: 21, m: 48 },
  { email: 'bohdan.lysenko@ukr.net', phone: '975530812', plan: 'two', method: 'card', h: 7, m: 30 },
  { email: 'anna.kovalchuk.ua@gmail.com', phone: '671902247', plan: 'full', method: 'google', h: 14, m: 12 },
];

const WAITERS = [
  { name: 'Людмила', phone: '672214098', h: 8, m: 5 },
  { name: 'Сергій', phone: '507736512', h: 20, m: 44 },
  { name: 'Христина', phone: '934481207', h: 7, m: 18 },
];

const LAST4 = ['4242', '1881', '0357', '7710', '5096', '2231', '6604', '9018'];

export function seedPayments(sch: Schedule): Payment[] {
  const open = addDays(sch.cohortStart, -28);
  const quotas = GROUPS.flatMap((g) => Array.from({ length: g.seededSold }, () => g.id));
  // Ранкова група розкупилась першою — ставимо її оплати на початок.
  quotas.sort((a, b) => (a === 'mw-0800' ? -1 : 0) - (b === 'mw-0800' ? -1 : 0));
  const n = quotas.length;
  return quotas.map((groupId, i) => {
    const p = PEOPLE[i % PEOPLE.length];
    const day = Math.floor(0.3 + (i * 11) / n);
    const a = planAmounts(p.plan, true);
    return {
      id: `UHM-${String(20417 + i * 37).padStart(5, '0')}`,
      createdAt: kyivToInstant(addDays(open, day), p.h, p.m),
      email: p.email,
      phone: p.phone,
      groupId,
      cohortKey: sch.cohortKey,
      plan: p.plan,
      amount: a.now,
      total: a.total,
      early: true,
      method: p.method,
      cardLast4: p.method === 'card' ? LAST4[i % LAST4.length] : undefined,
      seeded: true,
    };
  });
}

export function seedWaitlist(sch: Schedule): WaitlistEntry[] {
  const open = addDays(sch.cohortStart, -28);
  return WAITERS.map((w, i) => ({
    id: `W-${3101 + i}`,
    createdAt: kyivToInstant(addDays(open, 9 + i), w.h, w.m),
    name: w.name,
    phone: w.phone,
    groupId: 'mw-0800' as GroupId,
    cohortKey: sch.cohortKey,
    seeded: true,
  }));
}

/** Усі оплати поточного потоку: стартові + зроблені в цьому браузері, нові зверху. */
export function allPayments(s: DemoState, sch: Schedule): Payment[] {
  return [...seedPayments(sch), ...s.payments.filter((p) => p.cohortKey === sch.cohortKey)].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function allWaitlist(s: DemoState, sch: Schedule): WaitlistEntry[] {
  return [...seedWaitlist(sch), ...s.waitlist.filter((w) => w.cohortKey === sch.cohortKey)].sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

/** Стрічка бота: сповіщення зі стартових даних + нові, нові зверху. */
export function allNotices(s: DemoState, sch: Schedule): Notice[] {
  const seeded: Notice[] = [
    ...seedPayments(sch).map((p) => ({
      id: `N-${p.id}`,
      createdAt: p.createdAt,
      kind: 'payment' as const,
      refId: p.id,
      amount: p.amount,
      email: p.email,
      phone: p.phone,
      groupId: p.groupId,
      seeded: true,
    })),
    ...seedWaitlist(sch).map((w) => ({
      id: `N-${w.id}`,
      createdAt: w.createdAt,
      kind: 'waitlist' as const,
      refId: w.id,
      name: w.name,
      phone: w.phone,
      groupId: w.groupId,
      seeded: true,
    })),
  ];
  return [...seeded, ...s.notices].sort((a, b) => b.createdAt - a.createdAt);
}

// ——— Дії ———

export function saveDraft(d: Omit<Draft, 'id' | 'createdAt'>): Draft {
  const draft: Draft = { ...d, id: newId('UHM'), createdAt: Date.now() };
  update((s) => {
    s.draft = draft;
  });
  return draft;
}

export function completePayment(draft: Draft, method: PayMethod, cardLast4?: string): Payment {
  const payment: Payment = {
    id: draft.id,
    createdAt: Date.now(),
    email: draft.email,
    phone: draft.phone,
    groupId: draft.groupId,
    cohortKey: draft.cohortKey,
    plan: draft.plan,
    amount: draft.amount,
    total: draft.total,
    early: draft.early,
    method,
    cardLast4,
  };
  update((s) => {
    if (s.payments.some((p) => p.id === payment.id)) return;
    s.payments.push(payment);
    s.notices.push({
      id: newId('N'),
      createdAt: payment.createdAt,
      kind: 'payment',
      refId: payment.id,
      amount: payment.amount,
      email: payment.email,
      phone: payment.phone,
      groupId: payment.groupId,
    });
    s.draft = null;
  });
  return payment;
}

export function failPayment(draft: Draft, reason: string) {
  update((s) => {
    s.notices.push({
      id: newId('N'),
      createdAt: Date.now(),
      kind: 'failed',
      refId: draft.id,
      amount: draft.amount,
      email: draft.email,
      phone: draft.phone,
      groupId: draft.groupId,
      reason,
    });
  });
}

export function findPayment(id: string | null): Payment | undefined {
  if (!id) return undefined;
  return getState().payments.find((p) => p.id === id);
}

/** Повертає місце в черзі (1 — перший). */
export function joinWaitlist(name: string, phone: string, groupId: GroupId, sch: Schedule): number {
  const entry: WaitlistEntry = {
    id: newId('W'),
    createdAt: Date.now(),
    name,
    phone,
    groupId,
    cohortKey: sch.cohortKey,
  };
  update((s) => {
    s.waitlist.push(entry);
    s.notices.push({ id: newId('N'), createdAt: entry.createdAt, kind: 'waitlist', refId: entry.id, name, phone, groupId });
  });
  return allWaitlist(getState(), sch).filter((w) => w.groupId === groupId).length;
}

export function offerSeat(id: string) {
  update((s) => {
    if (!s.offered.includes(id)) s.offered.push(id);
  });
}

// ——— Демо-панель ———

/** Залишити у групі рівно `free` вільних місць. */
export function setFreeSeats(groupId: GroupId, free: number, sch: Schedule) {
  update((s) => {
    const mine = s.payments.filter((p) => p.groupId === groupId && p.cohortKey === sch.cohortKey).length;
    s.soldBase[groupId] = Math.max(0, COURSE.groupSize - free - mine);
  });
}

export function setTimeOffset(ms: number) {
  update((s) => {
    s.timeOffset = ms;
  });
}

export function freeSeats(groupId: GroupId, sch: Schedule) {
  return seatsFor(groupId, getState(), sch).free;
}

// ——— Підписи ———

const dtFmt = new Intl.DateTimeFormat('uk-UA', {
  timeZone: 'Europe/Kyiv',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});
/** «25.09, 21:14» за Києвом */
export const fmtDateTime = (t: number) => dtFmt.format(t);

const tFmt = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (t: number) => tFmt.format(t);

export const METHOD_LABEL: Record<PayMethod, string> = {
  card: 'Картка',
  apple: 'Apple Pay',
  google: 'Google Pay',
};

export function methodText(p: Pick<Payment, 'method' | 'cardLast4'>): string {
  return p.method === 'card' && p.cardLast4 ? `Картка •• ${p.cardLast4}` : METHOD_LABEL[p.method];
}

export function planTitle(id: PlanId): string {
  return PLANS.find((p) => p.id === id)?.title ?? id;
}

// ——— Приклад для сторінок після оплати ———
// Якщо «Оплату отримано» чи «Лист учню» відкрили без оплати (з футера), показуємо зразок.

export function samplePayment(sch: Schedule, realNow: number): Payment {
  const a = planAmounts('full', true);
  return {
    id: 'UHM-00000',
    createdAt: realNow - 3 * 60_000,
    email: 'olena@example.com',
    phone: '671234567',
    groupId: 'tt-1930',
    cohortKey: sch.cohortKey,
    plan: 'full',
    amount: a.now,
    total: a.total,
    early: true,
    method: 'apple',
  };
}

/** Оплата для показу: за номером замовлення → остання з цього браузера → зразок. */
export function paymentToShow(s: DemoState, sch: Schedule, orderId: string | null, realNow: number) {
  const found = orderId ? s.payments.find((p) => p.id === orderId) : undefined;
  const latest = [...s.payments].reverse().find((p) => p.cohortKey === sch.cohortKey);
  const payment = found ?? latest ?? samplePayment(sch, realNow);
  return { payment, isSample: !found && !latest };
}
