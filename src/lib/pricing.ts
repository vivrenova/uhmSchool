import { COURSE, PLANS, type PlanId } from '../config/school';

const NBSP = ' ';

/** 5900 → «5 900 ₴» (нерозривні пробіли, щоб ціна не рвалась на два рядки). */
export function uah(n: number): string {
  const s = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${s}${NBSP}₴`;
}

export function coursePrice(isEarly: boolean): number {
  return isEarly ? COURSE.price.early : COURSE.price.regular;
}

export function planOf(id: PlanId | string | null | undefined) {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Скільки платить учень зараз і скільки всього. */
export function planAmounts(plan: PlanId, isEarly: boolean) {
  const total = coursePrice(isEarly);
  const parts = planOf(plan).parts;
  return { total, parts, perPart: Math.round(total / parts), now: Math.round(total / parts) };
}
