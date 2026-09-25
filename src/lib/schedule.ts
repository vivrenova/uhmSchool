// «Ковзний» розклад: демо не застаріває. Від сьогоднішнього дня (за Києвом) рахуємо
// найближчий потік, дедлайн ранньої ціни та дати груп. Усі відвідувачі в один день
// бачать однакові дати.

import { COURSE, GROUPS, SCHOOL, type Group, type GroupId } from '../config/school';

const TZ = SCHOOL.timeZone;
const DAY = 86_400_000;

/** Календарна дата без часу: зберігаємо як UTC-північ, щоб рахувати дні без сюрпризів з DST. */
export type CivilDate = number;

const partsFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function zonedParts(instant: number) {
  const p: Record<string, number> = {};
  for (const { type, value } of partsFmt.formatToParts(instant)) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

function offsetMs(instant: number): number {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Київський локальний час → абсолютний момент (мс). */
export function kyivToInstant(date: CivilDate, h = 0, m = 0, s = 0): number {
  const guess = date + ((h * 60 + m) * 60 + s) * 1000;
  const first = guess - offsetMs(guess);
  const second = guess - offsetMs(first);
  return second;
}

export function kyivToday(instant: number): CivilDate {
  const p = zonedParts(instant);
  return Date.UTC(p.year, p.month - 1, p.day);
}

export const addDays = (d: CivilDate, n: number): CivilDate => d + n * DAY;

/** 0 = понеділок … 6 = неділя */
export const weekday = (d: CivilDate) => (new Date(d).getUTCDay() + 6) % 7;

export interface Schedule {
  /** Понеділок тижня старту потоку. */
  cohortStart: CivilDate;
  /** Кінець ранньої ціни: п’ятниця, 23:59:59 за Києвом. */
  earlyDeadline: number;
  /** Старт наступного потоку — пропонуємо тим, хто в листі очікування. */
  nextCohortStart: CivilDate;
  cohortKey: string;
}

export function getSchedule(realNow: number): Schedule {
  const today = kyivToday(realNow);
  // Понеділок, не раніше ніж через 10 днів: дедлайн ранньої ціни тоді припадає
  // на найближчі 0–6 днів, а старт — через 10–16 днів.
  const min = addDays(today, 10);
  const cohortStart = addDays(min, (7 - weekday(min)) % 7);
  const deadlineDate = addDays(cohortStart, -COURSE.earlyDaysBeforeStart);
  return {
    cohortStart,
    earlyDeadline: kyivToInstant(deadlineDate, 23, 59, 59),
    nextCohortStart: addDays(cohortStart, 28),
    cohortKey: new Date(cohortStart).toISOString().slice(0, 10),
  };
}

export function getGroup(id: GroupId | string | null | undefined): Group {
  return GROUPS.find((g) => g.id === id) ?? GROUPS[0];
}

export function groupStart(s: Schedule, g: Group): CivilDate {
  return addDays(s.cohortStart, g.startOffsetDays);
}

export function groupLastLesson(s: Schedule, g: Group): CivilDate {
  // 16 занять = 8 тижнів по 2; останнє — друге заняття восьмого тижня.
  return addDays(groupStart(s, g), (COURSE.weeks - 1) * 7 + 2);
}

// ——— Форматування ———

const fmtDayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtWeekdayShort = new Intl.DateTimeFormat('uk-UA', { weekday: 'short', timeZone: 'UTC' });
const fmtWeekdayLong = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', timeZone: 'UTC' });

/** «14 жовтня» */
export const dayMonth = (d: CivilDate) => fmtDayMonth.format(d);
/** «вт, 14 жовтня» */
export const wdDayMonth = (d: CivilDate) => `${fmtWeekdayShort.format(d)}, ${fmtDayMonth.format(d)}`;
/** «вівторок, 14 жовтня» */
export const wdLongDayMonth = (d: CivilDate) => `${fmtWeekdayLong.format(d)}, ${fmtDayMonth.format(d)}`;

/** Дата дедлайну (момент) → «3 жовтня» за Києвом */
export const instantDayMonth = (instant: number) => dayMonth(kyivToday(instant));
export const instantWeekday = (instant: number) => fmtWeekdayLong.format(kyivToday(instant));

export function plural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export interface Countdown {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdown(until: number, now: number): Countdown {
  const ms = Math.max(0, until - now);
  const total = Math.floor(ms / 1000);
  return {
    done: ms <= 0,
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Відносна дата дедлайну: «сьогодні», «завтра», «у п’ятницю» або «3 жовтня». */
export function deadlineWords(deadline: number, now: number): string {
  const diff = Math.round((kyivToday(deadline) - kyivToday(now)) / DAY);
  if (diff <= 0) return 'сьогодні';
  if (diff === 1) return 'завтра';
  return dayMonth(kyivToday(deadline));
}
