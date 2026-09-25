import { useRef, useState } from 'preact/hooks';
import { GROUPS, type GroupId } from '../../config/school';
import { AUTHOR } from '../../config/author';
import { useClock, useDemo, useSelectedGroup } from '../../lib/hooks';
import { setFreeSeats, setTimeOffset } from '../../lib/orders';
import { getGroup } from '../../lib/schedule';
import { resetDemo, seatsFor, update } from '../../lib/store';
import './DemoPanel.css';

/** Кнопка в демо-плашці й панель: керування станами школи без очікування. */
export default function DemoPanel({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { schedule } = useClock(ssrNow, demo);
  const ref = useRef<HTMLDialogElement>(null);
  const [selected] = useSelectedGroup();
  const [groupId, setGroupId] = useState<GroupId | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const g = getGroup(groupId ?? selected);
  const free = seatsFor(g.id, demo, schedule).free;
  const early = Date.now() + demo.timeOffset < schedule.earlyDeadline;

  function flash(msg: string) {
    setDone(msg);
    setTimeout(() => setDone(null), 2500);
  }

  const links = [
    { href: '/admin', label: 'Кабінет власника', note: 'оплати, лист очікування, бот' },
    { href: '/demo', label: 'Два екрани', note: 'учень і власник поруч (на комп’ютері)' },
    { href: '/learn', label: 'Кабінет учня', note: 'куди веде лист після оплати' },
  ];
  const author = [
    AUTHOR.telegram && { href: `https://t.me/${AUTHOR.telegram}`, label: 'Telegram' },
    AUTHOR.email && { href: `mailto:${AUTHOR.email}`, label: 'Пошта' },
    AUTHOR.github && { href: AUTHOR.github, label: 'GitHub' },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <>
      <button
        type="button"
        class="dp__open"
        onClick={() => {
          setGroupId(null);
          setConfirmReset(false);
          ref.current?.showModal();
        }}
      >
        Як тикати
      </button>

      <dialog
        ref={ref}
        class="dp"
        aria-labelledby="dp-title"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div class="dp__box">
          <button type="button" class="dp__x" onClick={() => ref.current?.close()} aria-label="Закрити">
            ×
          </button>
          <h2 id="dp-title" class="dp__title">
            Демо-панель
          </h2>
          <p class="dp__intro">
            Натисніть «Забронювати», оплатіть тестовою карткою <b class="tnum">4242 4242 4242 4242</b> (код з SMS — 1234) і
            відкрийте кабінет власника. А тут можна показати стани, яких інакше довелося б чекати.
          </p>

          <section class="dp__sec" aria-labelledby="dp-seats">
            <h3 id="dp-seats">Місця в групі</h3>
            <div class="dp__groups" role="radiogroup" aria-label="Група">
              {GROUPS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={x.id === g.id}
                  class={`dp__g tnum${x.id === g.id ? ' is-on' : ''}`}
                  onClick={() => setGroupId(x.id)}
                >
                  {x.days} {x.time}
                </button>
              ))}
            </div>
            <p class="dp__state tnum">Зараз вільно: {free} з 8</p>
            <div class="dp__row">
              <button type="button" class="btn btn--ghost dp__btn" onClick={() => (setFreeSeats(g.id, 1, schedule), flash('Залишилось 1 місце'))}>
                Залишити 1 місце
              </button>
              <button type="button" class="btn btn--ghost dp__btn" onClick={() => (setFreeSeats(g.id, 0, schedule), flash('Набір закрито — з’явився лист очікування'))}>
                Закрити набір
              </button>
              <button
                type="button"
                class="btn btn--ghost dp__btn"
                onClick={() => {
                  update((s) => {
                    delete s.soldBase[g.id];
                  });
                  flash('Як було');
                }}
              >
                Як було
              </button>
            </div>
          </section>

          <section class="dp__sec" aria-labelledby="dp-time">
            <h3 id="dp-time">Рання ціна</h3>
            <p class="dp__state">{early ? 'Зараз діє рання ціна' : 'Рання ціна закінчилась'}</p>
            <div class="dp__row">
              <button
                type="button"
                class="btn btn--ghost dp__btn"
                onClick={() => {
                  setTimeOffset(schedule.earlyDeadline - Date.now() - 10_000);
                  ref.current?.close();
                }}
              >
                Закінчиться через 10 секунд
              </button>
              <button
                type="button"
                class="btn btn--ghost dp__btn"
                onClick={() => (setTimeOffset(schedule.earlyDeadline - Date.now() + 60_000), flash('Рання ціна закінчилась'))}
              >
                Уже закінчилась
              </button>
              <button type="button" class="btn btn--ghost dp__btn" onClick={() => (setTimeOffset(0), flash('Реальний час'))}>
                Реальний час
              </button>
            </div>
          </section>

          <section class="dp__sec" aria-labelledby="dp-see">
            <h3 id="dp-see">Подивитися</h3>
            <ul class="dp__links">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a> <span>— {l.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section class="dp__sec">
            {confirmReset ? (
              <div class="dp__row">
                <button
                  type="button"
                  class="btn dp__btn"
                  onClick={() => {
                    resetDemo();
                    setConfirmReset(false);
                    flash('Демо скинуто');
                  }}
                >
                  Так, скинути все
                </button>
                <button type="button" class="btn btn--ghost dp__btn" onClick={() => setConfirmReset(false)}>
                  Ні
                </button>
              </div>
            ) : (
              <button type="button" class="link-btn" onClick={() => setConfirmReset(true)}>
                Скинути демо: оплати, лист очікування, налаштування
              </button>
            )}
            <p class="dp__small">Усе зберігається лише у вашому браузері — інші відвідувачі цього не бачать.</p>
          </section>

          {(AUTHOR.label || author.length > 0) && (
            <p class="dp__author">
              {AUTHOR.label}
              {author.map((a) => (
                <a key={a.href} href={a.href} target="_blank" rel="noopener">
                  {a.label}
                </a>
              ))}
            </p>
          )}

          <p class="dp__done" role="status" aria-live="polite">
            {done}
          </p>
        </div>
      </dialog>
    </>
  );
}
