import { useEffect, useState } from 'preact/hooks';
import { COURSE } from '../../config/school';
import { useClock, useDemo } from '../../lib/hooks';
import { fmtDateTime, methodText, paymentToShow, planTitle } from '../../lib/orders';
import { planAmounts, uah } from '../../lib/pricing';
import { addDays, dayMonth, getGroup, groupStart, wdLongDayMonth } from '../../lib/schedule';
import { seatsFor, type Notice } from '../../lib/store';
import { maskPhone } from '../../lib/validate';
import BotMessage from './BotMessage';
import './Success.css';

export default function Success({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { real, schedule } = useClock(ssrNow, demo);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOrderId(new URLSearchParams(location.search).get('order'));
    setReady(true);
  }, []);

  if (!ready) return <div class="ok ok--loading" aria-busy="true" />;

  const { payment: p, isSample } = paymentToShow(demo, schedule, orderId, real);

  const group = getGroup(p.groupId);
  const start = groupStart(schedule, group);
  const a = planAmounts(p.plan, p.early);
  const free = seatsFor(p.groupId, demo, schedule).free;
  const notice: Notice =
    demo.notices.find((n) => n.refId === p.id && n.kind === 'payment') ??
    ({ id: 'n', createdAt: p.createdAt, kind: 'payment', amount: p.amount, email: p.email, phone: p.phone, groupId: p.groupId } as Notice);

  return (
    <div class="ok">
      {isSample && (
        <p class="ok__sample">
          Приклад сторінки: так її бачить учень одразу після оплати. <a href="/checkout">Оплатіть тестовою карткою</a> — і
          тут будуть ваші дані.
        </p>
      )}
      <div class="ok__hero">
        <svg class="ok__tick" viewBox="0 0 64 48" aria-hidden="true">
          <path d="M4 26 C 12 30, 18 38, 22 44 C 30 28, 44 12, 60 4" />
        </svg>
        <h1 class="ok__h">Оплату отримано</h1>
        <p class="ok__lead tnum">
          {uah(p.amount)} · {methodText(p)} · {fmtDateTime(p.createdAt)}
        </p>
        <p class="ok__order tnum">Замовлення {p.id}</p>
      </div>

      <section class="ok__access on-ink" aria-labelledby="ok-access">
        <h2 id="ok-access" class="ok__h2">Доступ уже відкрито</h2>
        <p>
          Ви в групі <b class="tnum">{group.days} {group.time}</b>. Перше заняття — {wdLongDayMonth(start)} о {group.time} за
          Києвом.
        </p>
        <a class="btn btn--paper btn--block" href="/learn">
          Відкрити кабінет учня
        </a>
        <p class="ok__mail">
          Лист із доступом і чек надіслано на <b>{p.email}</b>.{' '}
          <a href={`/mail?order=${encodeURIComponent(p.id)}`}>Подивитися лист</a>
        </p>
        {a.parts > 1 && (
          <p class="ok__next tnum">
            {a.parts === 2
              ? `Друга частина ${uah(a.perPart)} — до ${dayMonth(addDays(start, 14))}. Нагадаємо за 3 дні.`
              : `Ще 3 платежі по ${uah(a.perPart)} спише банк раз на місяць, без переплати.`}
          </p>
        )}
      </section>

      <section class="ok__steps" aria-labelledby="ok-steps">
        <h2 id="ok-steps" class="ok__h2">Що далі</h2>
        <ol>
          <li>
            <b>Сьогодні.</b> Зайдіть у кабінет і пройдіть тест рівня — 12 хвилин.
          </li>
          <li>
            <b>{dayMonth(addDays(start, -1))}.</b> У Telegram прийде запрошення в чат групи й посилання на Zoom.
          </li>
          <li>
            <b>
              {dayMonth(start)}, {group.time}.
            </b>{' '}
            Перше заняття. Потрібні лише ноутбук чи телефон і навушники.
          </li>
        </ol>
      </section>

      <section class="ok__behind" aria-labelledby="ok-behind">
        <p class="ok__demo">Демо: цього учень не бачить</p>
        <h2 id="ok-behind" class="ok__h2">А власник школи в цей момент отримав</h2>
        <div class="ok__behind-grid">
          <figure class="ok__fig">
            <figcaption>Сповіщення від бота в Telegram</figcaption>
            <div class="ok__chat">
              <BotMessage notice={notice} free={free} plan={p.plan} method={methodText(p)} />
            </div>
          </figure>
          <figure class="ok__fig">
            <figcaption>Новий рядок у таблиці оплат</figcaption>
            <div class="ok__row tnum">
              <span>{fmtDateTime(p.createdAt)}</span>
              <span>{p.email}</span>
              <span>{maskPhone(p.phone)}</span>
              <span>
                {group.days} {group.time}
              </span>
              <span>{planTitle(p.plan)}</span>
              <span class="ok__row-sum">{uah(p.amount)}</span>
            </div>
          </figure>
        </div>
        <a class="btn btn--ghost" href="/admin" target="_blank" rel="noopener">
          Відкрити кабінет власника
        </a>
        <p class="ok__small">
          Курс: {COURSE.title}. Вільних місць у групі тепер: {free}.
        </p>
      </section>
    </div>
  );
}
