import { useEffect, useState } from 'preact/hooks';
import { COURSE, SCHOOL, TEACHER, DEFAULT_GROUP } from '../../config/school';
import { PROGRAM } from '../../content/program';
import { useClock, useDemo } from '../../lib/hooks';
import { fmtDateTime, methodText, planTitle } from '../../lib/orders';
import { planAmounts, uah } from '../../lib/pricing';
import { addDays, dayMonth, getGroup, groupStart, kyivToInstant, kyivToday, plural, wdLongDayMonth, type CivilDate } from '../../lib/schedule';
import './Learn.css';

const TODO = [
  { id: 'test', title: 'Пройти тест рівня', note: '12 хвилин, результат побачить Ярина до першого заняття' },
  { id: 'voice', title: 'Записати голосове «до»', note: '1 хвилина про себе англійською — порівняємо на 8-му тижні' },
  { id: 'zoom', title: 'Встановити Zoom', note: 'На ноутбук або телефон, навушники з мікрофоном — бажано' },
];
const TODO_KEY = 'uhm-learn-todo';

function lessonDates(start: CivilDate): CivilDate[] {
  return Array.from({ length: COURSE.lessons }, (_, i) => addDays(start, Math.floor(i / 2) * 7 + (i % 2) * 2));
}

/** Файл календаря з усіма 16 заняттями — працює в Google, Apple й Outlook. */
function icsFile(start: CivilDate, time: string, title: string): string {
  const [h, m] = time.split(':').map(Number);
  const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = lessonDates(start).map((d, i) => {
    const from = kyivToInstant(d, h, m);
    const to = from + COURSE.lessonMinutes * 60_000;
    return [
      'BEGIN:VEVENT',
      `UID:uhm-${d}-${i}@${location.hostname}`,
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(from)}`,
      `DTEND:${stamp(to)}`,
      `SUMMARY:${title} — заняття ${i + 1}`,
      'DESCRIPTION:Посилання на Zoom — у чаті групи в Telegram.',
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//uhm demo//UK', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
}

export default function Learn({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { real, schedule } = useClock(ssrNow, demo);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(TODO_KEY) || '[]'));
    } catch {
      /* порожній список */
    }
    setReady(true);
  }, []);

  if (!ready) return <div class="learn learn--loading" aria-busy="true" />;

  const mine = [...demo.payments].reverse().find((p) => p.cohortKey === schedule.cohortKey);
  const sample = !mine;
  const groupId = mine?.groupId ?? DEFAULT_GROUP;
  const g = getGroup(groupId);
  const start = groupStart(schedule, g);
  const dates = lessonDates(start);
  const daysLeft = Math.max(0, Math.round((start - kyivToday(real)) / 86_400_000));
  const a = mine ? planAmounts(mine.plan, mine.early) : null;

  function toggle(id: string) {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(next));
    } catch {
      /* ок, просто не збережеться */
    }
  }

  function downloadIcs() {
    const blob = new Blob([icsFile(start, g.time, `${SCHOOL.name} ${COURSE.title}`)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'uhm-zanyattya.ics';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div class="learn">
      {sample && (
        <p class="learn__sample">
          Це приклад кабінету. Після тестової оплати тут будуть ваші група й платежі.{' '}
          <a href="/checkout">Забронювати місце</a>
        </p>
      )}

      <header class="learn__head">
        <p class="eyebrow">Кабінет учня{mine ? ` · ${mine.email}` : ''}</p>
        <h1 class="learn__h">{COURSE.title}</h1>
        <p class="learn__group tnum">
          Група {g.days}, {g.time}–{g.timeEnd} · веде {TEACHER.firstName} {TEACHER.lastName}
        </p>
      </header>

      <section class="learn__next on-ink" aria-labelledby="l-next">
        <p class="learn__count tnum">
          {daysLeft === 0 ? 'Сьогодні' : `через ${daysLeft} ${plural(daysLeft, 'день', 'дні', 'днів')}`}
        </p>
        <h2 id="l-next" class="learn__h2">
          Перше заняття — {wdLongDayMonth(start)}, {g.time}
        </h2>
        <p class="learn__muted">Посилання на Zoom з’явиться тут і в чаті групи за 24 години до заняття.</p>
        <div class="learn__actions">
          <button type="button" class="btn btn--paper" disabled aria-disabled="true">
            Увійти в Zoom
          </button>
          <button type="button" class="btn btn--ghost learn__ghost" onClick={downloadIcs}>
            Усі 16 занять у календар
          </button>
        </div>
      </section>

      <section class="learn__todo" aria-labelledby="l-todo">
        <h2 id="l-todo" class="learn__h2">
          До старту{' '}
          <span class="tnum">
            {done.length} з {TODO.length}
          </span>
        </h2>
        <ul>
          {TODO.map((t) => (
            <li key={t.id}>
              <label class="todo">
                <input type="checkbox" checked={done.includes(t.id)} onChange={() => toggle(t.id)} />
                <span class="todo__box" aria-hidden="true" />
                <span>
                  <span class="todo__title">{t.title}</span>
                  <span class="todo__note">{t.note}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="l-prog">
        <h2 id="l-prog" class="learn__h2">
          Програма
        </h2>
        <ol class="learn__weeks">
          {PROGRAM.map((w, i) => {
            const open = i === 0;
            return (
              <li key={i} class={open ? 'is-open' : ''}>
                <span class="learn__wnum tnum">{String(i + 1).padStart(2, '0')}</span>
                <span class="learn__wtxt">
                  <b>{w.title}</b>
                  <span class="tnum">
                    {open ? 'Матеріали відкриються після 1-го заняття' : `Відкриється ${dayMonth(dates[i * 2])}`}
                  </span>
                </span>
                <span class="learn__lock">{open ? 'тиждень 1' : <span class="sr-only">ще закрито</span>}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section class="learn__pay card" aria-labelledby="l-pay">
        <h2 id="l-pay" class="learn__h2">
          Оплата
        </h2>
        {mine && a ? (
          <>
            <p class="tnum">
              <b>{uah(mine.amount)}</b> · {planTitle(mine.plan)} · {methodText(mine)} · {fmtDateTime(mine.createdAt)}
            </p>
            {a.parts === 2 && (
              <p class="learn__muted tnum">
                Друга частина {uah(a.perPart)} — до {dayMonth(addDays(start, 14))}
              </p>
            )}
            {a.parts === 4 && <p class="learn__muted tnum">Ще 3 платежі по {uah(a.perPart)} — банк списує щомісяця</p>}
            <a href={`/mail?order=${encodeURIComponent(mine.id)}`}>Лист і чек</a>
          </>
        ) : (
          <p class="learn__muted">Тут з’являться ваші платежі й чеки.</p>
        )}
        <p class="learn__muted">Питання — у чаті групи або у відповідь на лист після оплати.</p>
      </section>
    </div>
  );
}
