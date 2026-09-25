import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSE, GROUPS, type GroupId } from '../../config/school';
import { useBefore, useClock, useDemo } from '../../lib/hooks';
import {
  allNotices,
  allPayments,
  allWaitlist,
  fmtDateTime,
  methodText,
  offerSeat,
  planTitle,
} from '../../lib/orders';
import { uah } from '../../lib/pricing';
import { dayMonth, deadlineWords, getGroup, groupStart } from '../../lib/schedule';
import { allSeats, type Notice, type Payment } from '../../lib/store';
import { formatPhone, maskPhone } from '../../lib/validate';
import SeatDots from '../SeatDots';
import BotMessage from './BotMessage';
import './Admin.css';

const phoneOf = (p: { phone: string; seeded?: boolean }) => (p.seeded ? maskPhone(p.phone) : formatPhone(p.phone));

function toCsv(rows: Payment[]): string {
  const head = ['Дата', 'Замовлення', 'Email', 'Телефон', 'Група', 'Оплата', 'Сума, грн', 'Спосіб'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = rows.map((p) => {
    const g = getGroup(p.groupId);
    return [fmtDateTime(p.createdAt), p.id, p.email, phoneOf(p), `${g.days} ${g.time}`, planTitle(p.plan), p.amount, methodText(p)]
      .map(esc)
      .join(';');
  });
  return '﻿' + [head.map(esc).join(';'), ...body].join('\r\n');
}

export default function Admin({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { now, real, schedule } = useClock(ssrNow, demo, 30_000);
  const early = useBefore(schedule.earlyDeadline, now, demo.timeOffset);
  const [filter, setFilter] = useState<'all' | GroupId>('all');
  const [toast, setToast] = useState<Notice | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  // Перший рендер — ще без даних з localStorage; «нові» рахуємо лише після завантаження.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const payments = allPayments(demo, schedule);
  const waitlist = allWaitlist(demo, schedule);
  const notices = allNotices(demo, schedule);
  const seats = allSeats(demo, schedule);

  // Нові події, що прийшли, поки сторінка відкрита, — підсвічуємо й показуємо спливашку.
  useEffect(() => {
    if (!mounted) return;
    const ids = new Set(notices.map((n) => n.id));
    if (!seen.current) {
      seen.current = ids;
      return;
    }
    const added = notices.filter((n) => !seen.current!.has(n.id));
    if (added.length) {
      seen.current = ids;
      setFresh((f) => new Set([...f, ...added.map((n) => n.id), ...added.map((n) => n.refId ?? '')]));
      setToast(added[0]);
      document.title = `(${added.length}) ${document.title.replace(/^\(\d+\)\s*/, '')}`;
    }
  }, [notices.length, mounted]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 7000);
    const clear = () => (document.title = document.title.replace(/^\(\d+\)\s*/, ''));
    window.addEventListener('focus', clear);
    return () => {
      clearTimeout(id);
      window.removeEventListener('focus', clear);
    };
  }, [toast]);

  const sold = Object.values(seats).reduce((s, x) => s + x.sold, 0);
  const total = GROUPS.length * COURSE.groupSize;
  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const todayCount = payments.filter((p) => real - p.createdAt < 86_400_000).length;
  const rows = filter === 'all' ? payments : payments.filter((p) => p.groupId === filter);

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uhm-oplaty-${schedule.cohortKey}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div class="adm">
      <div class="adm__top">
        <div>
          <p class="eyebrow">Кабінет власника</p>
          <h1 class="adm__h">Набір на потік {dayMonth(schedule.cohortStart)}</h1>
        </div>
        <p class="adm__live">
          <span class="adm__dot" aria-hidden="true" />
          Оновлюється саме — відкрийте сайт у сусідній вкладці й оплатіть
        </p>
      </div>

      <dl class="adm__kpi">
        <div>
          <dt>Оплат</dt>
          <dd class="tnum">
            {payments.length}
            {todayCount > 0 && <small> +{todayCount} за добу</small>}
          </dd>
        </div>
        <div>
          <dt>Отримано</dt>
          <dd class="tnum">{uah(revenue)}</dd>
        </div>
        <div>
          <dt>Місць зайнято</dt>
          <dd class="tnum">
            {sold} <small>з {total}</small>
          </dd>
        </div>
        <div>
          <dt>Лист очікування</dt>
          <dd class="tnum">{waitlist.length}</dd>
        </div>
      </dl>

      <p class="adm__price">
        {early
          ? `Рання ціна ${uah(COURSE.price.early)} діє до ${deadlineWords(schedule.earlyDeadline, now)}, 23:59. Далі — ${uah(COURSE.price.regular)}, ціна на сайті зміниться сама.`
          : `Рання ціна закінчилась — на сайті вже ${uah(COURSE.price.regular)}.`}
      </p>

      <div class="adm__grid">
        <div class="adm__main">
          <section aria-labelledby="adm-groups">
            <h2 id="adm-groups" class="adm__h2">
              Групи
            </h2>
            <ul class="adm__groups">
              {GROUPS.map((g) => {
                const s = seats[g.id];
                return (
                  <li key={g.id}>
                    <span class="adm__gname tnum">
                      <b>
                        {g.days} {g.time}
                      </b>
                      <span>старт {dayMonth(groupStart(schedule, g))}</span>
                    </span>
                    <SeatDots sold={s.sold} total={s.total} />
                    <span class={`adm__gfree tnum${s.free === 0 ? ' is-full' : ''}`}>
                      {s.free === 0 ? 'набрано' : `вільно ${s.free}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="adm-pay">
            <div class="adm__bar">
              <h2 id="adm-pay" class="adm__h2">
                Оплати
              </h2>
              <div class="adm__tools">
                <label class="sr-only" for="adm-filter">
                  Група
                </label>
                <select
                  id="adm-filter"
                  class="adm__select"
                  value={filter}
                  onChange={(e) => setFilter((e.currentTarget as HTMLSelectElement).value as 'all' | GroupId)}
                >
                  <option value="all">Усі групи</option>
                  {GROUPS.map((g) => (
                    <option value={g.id} key={g.id}>
                      {g.days} {g.time}
                    </option>
                  ))}
                </select>
                <button type="button" class="btn btn--ghost adm__csv" onClick={exportCsv}>
                  CSV
                </button>
              </div>
            </div>
            <div class="adm__tablewrap">
              <table class="adm__table">
                <thead>
                  <tr>
                    <th scope="col">Час</th>
                    <th scope="col">Email</th>
                    <th scope="col">Телефон</th>
                    <th scope="col">Група</th>
                    <th scope="col">Оплата</th>
                    <th scope="col" class="num">
                      Сума
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const g = getGroup(p.groupId);
                    const isNew = !p.seeded;
                    return (
                      <tr key={p.id} class={`${isNew ? 'is-new' : ''}${fresh.has(p.id) ? ' is-fresh' : ''}`}>
                        <td data-label="Час" class="tnum">
                          {fmtDateTime(p.createdAt)}
                          {isNew && <span class="adm__chip">нова</span>}
                        </td>
                        <td data-label="Email" class="adm__email" title={p.email}>
                          {p.email}
                        </td>
                        <td data-label="Телефон" class="tnum">
                          {phoneOf(p)}
                        </td>
                        <td data-label="Група" class="tnum">
                          {g.days} {g.time}
                        </td>
                        <td data-label="Оплата">
                          {planTitle(p.plan)}
                          <span class="adm__method">{methodText(p)}</span>
                        </td>
                        <td data-label="Сума" class="num tnum">
                          <b>{uah(p.amount)}</b>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="adm-wl">
            <h2 id="adm-wl" class="adm__h2">
              Лист очікування
            </h2>
            {waitlist.length === 0 ? (
              <p class="adm__muted">Поки порожньо.</p>
            ) : (
              <ol class="adm__wl">
                {waitlist.map((w, i) => {
                  const g = getGroup(w.groupId);
                  const offered = demo.offered.includes(w.id);
                  return (
                    <li key={w.id} class={fresh.has(w.id) ? 'is-fresh' : ''}>
                      <span class="adm__wlpos tnum">{i + 1}</span>
                      <span class="adm__wlwho">
                        <b>{w.name}</b>
                        <span class="tnum">
                          {phoneOf(w)} · {g.days} {g.time} · {fmtDateTime(w.createdAt)}
                        </span>
                      </span>
                      {offered ? (
                        <span class="adm__offered">Місце запропоновано</span>
                      ) : (
                        <button type="button" class="btn btn--ghost adm__offer" onClick={() => offerSeat(w.id)}>
                          Запропонувати місце
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <aside class="adm__feed" aria-labelledby="adm-bot">
          <div class="adm__phone">
            <p class="adm__bothead" id="adm-bot">
              <span class="adm__botava" aria-hidden="true">
                u.
              </span>
              <span>
                <b>uhm. бот</b>
                <span>сповіщення власнику</span>
              </span>
            </p>
            <div class="adm__botlist" aria-live="polite">
              {notices.slice(0, 8).map((n) => {
                const p = n.kind === 'payment' ? payments.find((x) => x.id === n.refId) : undefined;
                return (
                  <BotMessage
                    key={n.id}
                    notice={n}
                    plan={p?.plan}
                    method={p ? methodText(p) : undefined}
                    fresh={fresh.has(n.id)}
                  />
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div class="adm__toast" role="status">
          <b>{toast.kind === 'payment' ? 'Нова оплата' : toast.kind === 'waitlist' ? 'Новий у листі очікування' : 'Оплата не пройшла'}</b>
          <span>
            {toast.kind === 'waitlist' ? toast.name : toast.email}
            {toast.amount ? ` · ${uah(toast.amount)}` : ''}
          </span>
          <button type="button" class="adm__toastx" onClick={() => setToast(null)} aria-label="Закрити сповіщення">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
