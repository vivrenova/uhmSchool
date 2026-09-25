import { useEffect, useState } from 'preact/hooks';
import { COURSE } from '../../config/school';
import { PROGRAM } from '../../content/program';
import { useClock, useDemo, useSelectedGroup } from '../../lib/hooks';
import { addDays, getGroup, groupStart, type CivilDate } from '../../lib/schedule';
import './Program.css';

const fmtDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', timeZone: 'UTC' });
const fmtDayMonth = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtMonth = new Intl.DateTimeFormat('uk-UA', { month: 'numeric', timeZone: 'UTC' });

/** «6 і 8 жовтня» або «30 жовтня і 1 листопада» */
function pairDates(a: CivilDate, b: CivilDate): string {
  return fmtMonth.format(a) === fmtMonth.format(b)
    ? `${fmtDay.format(a)} і ${fmtDayMonth.format(b)}`
    : `${fmtDayMonth.format(a)} і ${fmtDayMonth.format(b)}`;
}

function useDesktop(query = '(min-width: 900px)') {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = matchMedia(query);
    const upd = () => setOn(mq.matches);
    upd();
    mq.addEventListener('change', upd);
    return () => mq.removeEventListener('change', upd);
  }, [query]);
  return on;
}

export default function Program({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { schedule } = useClock(ssrNow, demo);
  const [groupId] = useSelectedGroup();
  const group = getGroup(groupId);
  const start = groupStart(schedule, group);
  const desktop = useDesktop();
  const [open, setOpen] = useState<number[]>([0]);

  const toggle = (i: number) => setOpen((o) => (o.includes(i) ? o.filter((x) => x !== i) : [...o, i]));

  return (
    <div class="program">
      <p class="program__group">
        Дати — для групи{' '}
        <b class="tnum">
          {group.days} {group.time}
        </b>
        . Іншу групу можна обрати на початку сторінки або в цінах.
      </p>
      <ol class="weeks">
        {PROGRAM.map((w, i) => {
          const first = addDays(start, i * 7);
          const second = addDays(first, 2);
          const isOpen = desktop || open.includes(i);
          const head = (
            <>
              <span class="week__num tnum">{String(i + 1).padStart(2, '0')}</span>
              <span class="week__head">
                <span class="week__title">{w.title}</span>
                <span class="week__dates tnum">{pairDates(first, second)}</span>
              </span>
            </>
          );
          return (
            <li class={`week${isOpen ? ' is-open' : ''}`} key={i}>
              {desktop ? (
                <h3 class="week__bar">{head}</h3>
              ) : (
                <h3 class="week__h">
                  <button
                    type="button"
                    class="week__bar"
                    aria-expanded={isOpen}
                    aria-controls={`week-${i}`}
                    onClick={() => toggle(i)}
                  >
                    {head}
                    <span class="week__chev" aria-hidden="true" />
                  </button>
                </h3>
              )}
              <div class="week__body" id={`week-${i}`} hidden={!isOpen}>
                <ol class="week__lessons">
                  {w.lessons.map((l, j) => (
                    <li key={j}>
                      <span class="week__lnum tnum">Заняття {i * 2 + j + 1}</span>
                      {l}
                    </li>
                  ))}
                </ol>
                <p class="week__result">
                  <span class="hand">після тижня:</span> {w.result}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p class="program__total">
        Разом — {COURSE.lessons} занять по {COURSE.lessonMinutes} хвилин і близько 15 хвилин на день на голосові.
      </p>
    </div>
  );
}
