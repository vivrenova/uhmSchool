import { useEffect, useState } from 'preact/hooks';
import { COURSE, SCHOOL, TEACHER } from '../../config/school';
import { useClock, useDemo } from '../../lib/hooks';
import { fmtDateTime, methodText, paymentToShow, planTitle } from '../../lib/orders';
import { planAmounts, uah } from '../../lib/pricing';
import { addDays, dayMonth, getGroup, groupStart, wdLongDayMonth } from '../../lib/schedule';
import './MailView.css';

/** Лист, який отримує учень після оплати, — у вигляді поштового клієнта. */
export default function MailView({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { real, schedule } = useClock(ssrNow, demo);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setOrderId(new URLSearchParams(location.search).get('order'));
    setReady(true);
  }, []);
  if (!ready) return <div class="mail mail--loading" aria-busy="true" />;

  const { payment: p, isSample } = paymentToShow(demo, schedule, orderId, real);

  const g = getGroup(p.groupId);
  const start = groupStart(schedule, g);
  const a = planAmounts(p.plan, p.early);

  return (
    <div class="mail">
      <p class="mail__demo">
        Демо: так виглядає лист, який приходить учню одразу після оплати.
        {isSample && (
          <>
            {' '}
            Це приклад — <a href="/checkout">після тестової оплати</a> тут буде ваш лист.
          </>
        )}
      </p>

      <article class="mail__client" aria-labelledby="mail-subject">
        <header class="mail__head">
          <h1 id="mail-subject" class="mail__subject">
            Ви в групі {g.days} {g.time} — доступ до курсу всередині
          </h1>
          <div class="mail__from">
            <span class="mail__ava" aria-hidden="true">
              u.
            </span>
            <div>
              <p>
                <b>{SCHOOL.name}</b>
              </p>
              <p class="mail__to">
                кому: {p.email} · <span class="tnum">{fmtDateTime(p.createdAt)}</span>
              </p>
            </div>
          </div>
        </header>

        <div class="letter">
          <p class="letter__logo">
            uhm<span>.</span>
          </p>
          <h2 class="letter__h">Місце ваше. Старт — {wdLongDayMonth(start)}</h2>
          <p>
            Дякуємо за оплату! Ви в групі <b>{g.days}, {g.time}–{g.timeEnd}</b> курсу «{COURSE.title}». Веде{' '}
            {TEACHER.firstName} {TEACHER.lastName}.
          </p>

          <a class="letter__btn" href="/learn">
            Увійти в кабінет
          </a>

          <table class="letter__table">
            <tbody>
              <tr>
                <th scope="row">Замовлення</th>
                <td class="tnum">{p.id}</td>
              </tr>
              <tr>
                <th scope="row">Оплата</th>
                <td>
                  {planTitle(p.plan)} · {methodText(p)}
                </td>
              </tr>
              <tr>
                <th scope="row">Сплачено</th>
                <td class="tnum">
                  <b>{uah(p.amount)}</b>
                  {a.parts > 1 && ` із ${uah(a.total)}`}
                </td>
              </tr>
              {a.parts === 2 && (
                <tr>
                  <th scope="row">Друга частина</th>
                  <td class="tnum">
                    {uah(a.perPart)} до {dayMonth(addDays(start, 14))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 class="letter__h3">До старту</h3>
          <ol class="letter__list">
            <li>Пройдіть у кабінеті тест рівня — 12 хвилин.</li>
            <li>Запишіть голосове «до»: 1 хвилина про себе англійською. На 8-му тижні порівняємо.</li>
            <li>
              {dayMonth(addDays(start, -1))} надішлемо в Telegram запрошення в чат групи й посилання на Zoom.
            </li>
          </ol>

          <p class="letter__muted">
            Питання чи передумали? Просто дайте відповідь на цей лист. До {COURSE.refundUntilLesson}-го заняття повертаємо
            всю суму.
          </p>
          <p class="letter__muted">— {TEACHER.firstName} і команда {SCHOOL.name}</p>
        </div>
      </article>

      <a class="btn btn--ghost" href={`/success?order=${encodeURIComponent(p.id)}`}>
        Назад до підтвердження оплати
      </a>
    </div>
  );
}
