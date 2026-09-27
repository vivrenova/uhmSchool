// Усі «факти» про вигадану школу в одному місці: назва, курс, ціни, групи.
// Дати не зашиті — їх рахує src/lib/schedule.ts від поточного дня.

export const SCHOOL = {
  name: 'uhm.',
  tagline: 'школа розмовної англійської',
  timeZone: 'Europe/Kyiv',
} as const;

export const TEACHER = {
  firstName: 'Ярина',
  firstNameGen: 'Ярини',
  firstNameIns: 'Яриною',
  lastName: 'Кравець',
  facts: ['CELTA (2019)', 'IELTS 8.5', 'викладає з 2017', '2 роки жила в Единбурзі'],
} as const;

export const COURSE = {
  id: 'speaking-b1',
  title: 'Розмовна англійська B1',
  level: 'B1',
  weeks: 8,
  lessons: 16,
  lessonMinutes: 90,
  groupSize: 8,
  price: {
    early: 5900,
    regular: 7200,
  },
  // Скільки днів до старту закінчується рання ціна (п’ятниця, 23:59 за Києвом).
  earlyDaysBeforeStart: 10,
  refundUntilLesson: 2,
} as const;

export type GroupId = 'tt-1930' | 'mw-0800' | 'mw-1930';

export interface Group {
  id: GroupId;
  days: string;
  daysLong: string;
  time: string;
  timeEnd: string;
  /** Зміщення першого заняття від понеділка тижня старту (0 = пн, 1 = вт). */
  startOffsetDays: number;
  /** Скільки місць уже продано «до нас» — стартові дані демо. */
  seededSold: number;
}

export const GROUPS: readonly Group[] = [
  {
    id: 'tt-1930',
    days: 'Вт/Чт',
    daysLong: 'вівторок і четвер',
    time: '19:30',
    timeEnd: '21:00',
    startOffsetDays: 1,
    seededSold: 5,
  },
  {
    id: 'mw-0800',
    days: 'Пн/Ср',
    daysLong: 'понеділок і середа',
    time: '08:00',
    timeEnd: '09:30',
    startOffsetDays: 0,
    seededSold: 8,
  },
  {
    id: 'mw-1930',
    days: 'Пн/Ср',
    daysLong: 'понеділок і середа',
    time: '19:30',
    timeEnd: '21:00',
    startOffsetDays: 0,
    seededSold: 2,
  },
] as const;

export const DEFAULT_GROUP: GroupId = 'tt-1930';

export type PlanId = 'full' | 'two' | 'bank';

export const PLANS: readonly { id: PlanId; title: string; parts: number; note: string }[] = [
  { id: 'full', title: 'Повністю', parts: 1, note: 'Одним платежем' },
  { id: 'two', title: 'Двома частинами', parts: 2, note: 'Друга частина — перед 5-м заняттям' },
  { id: 'bank', title: 'Частинами від банку', parts: 4, note: '4 платежі без переплати' },
] as const;
