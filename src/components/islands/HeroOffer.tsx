import type { ComponentChildren } from 'preact';
import { COURSE, TEACHER } from '../../config/school';
import { useBefore, useClock, useDemo, useSelectedGroup } from '../../lib/hooks';
import { coursePrice, uah } from '../../lib/pricing';
import {
  deadlineWords,
  getGroup,
  groupStart,
  wdDayMonth,
  dayMonth,
} from '../../lib/schedule';
import { allSeats } from '../../lib/store';
import Pen from '../Pen';
import SeatDots from '../SeatDots';
import GroupPicker from './GroupPicker';
import Countdown from './Countdown';
import './HeroOffer.css';

interface Props {
  ssrNow: number;
  /** Фото викладачки з Astro (<Image>), щоб отримати AVIF/WebP і srcset. */
  children?: ComponentChildren;
}

export function openWaitlist(groupId: string) {
  window.dispatchEvent(new CustomEvent('uhm:waitlist', { detail: { groupId } }));
}

export default function HeroOffer({ ssrNow, children }: Props) {
  const demo = useDemo();
  const { now, schedule } = useClock(ssrNow, demo);
  const [groupId, setGroup] = useSelectedGroup();
  const group = getGroup(groupId);
  const seats = allSeats(demo, schedule);
  const s = seats[group.id];
  const early = useBefore(schedule.earlyDeadline, now, demo.timeOffset);
  const price = coursePrice(early);
  const full = s.free === 0;

  return (
    <div class="offer">
      <p class="offer__eyebrow eyebrow">Онлайн у Zoom · група до {COURSE.groupSize} · {COURSE.level}</p>

      <h1 class="offer__title">
        Розмовна англійська{' '}
        <span class="nowrap">
          за{' '}
          <Pen kind="underline" draw="intro">
            {COURSE.weeks} тижнів
          </Pen>
        </span>
      </h1>

      <p class="offer__lead lead">
        {COURSE.lessons} занять по {COURSE.lessonMinutes} хвилин. Дві третини часу говорите ви, а {TEACHER.firstName} записує
        помилки й розбирає їх наприкінці заняття.
      </p>

      <div class="offer__photo">{children}</div>

      <GroupPicker name="group-hero" class="offer__groups" value={group.id} seats={seats} onChange={setGroup} />

      <dl class="offer__facts facts">
        <div class="facts__row">
          <dt>Старт</dt>
          <dd>{wdDayMonth(groupStart(schedule, group))}</dd>
        </div>
        <div class="facts__row">
          <dt>Розклад</dt>
          <dd class="tnum">
            {group.days}, {group.time}–{group.timeEnd}
          </dd>
        </div>
        <div class="facts__row">
          <dt>Місця</dt>
          <dd class="facts__seats">
            <SeatDots sold={s.sold} total={s.total} />
            <span class="tnum" aria-hidden="true">
              {full ? 'усі зайняті' : `${s.free} з ${s.total}`}
            </span>
          </dd>
        </div>
      </dl>

      <div class="offer__price price" aria-live="polite">
        {full ? (
          <p class="price__full">
            У цій групі місць немає. Наступний набір — старт {dayMonth(schedule.nextCohortStart)}. Залиште номер: напишемо,
            щойно звільниться місце.
          </p>
        ) : (
          <>
            <p class="price__row">
              <span class="price__now tnum">{uah(price)}</span>
              {early && (
                <span class="price__old tnum">
                  <span class="sr-only">замість</span>
                  <Pen kind="strike" draw="intro">
                    {uah(COURSE.price.regular)}
                  </Pen>
                </span>
              )}
            </p>
            {early ? (
              <p class="price__timer">
                Рання ціна до {deadlineWords(schedule.earlyDeadline, now)}, 23:59 · залишилось{' '}
                <Countdown until={schedule.earlyDeadline} offset={demo.timeOffset} ssrNow={ssrNow} />
              </p>
            ) : (
              <p class="price__timer">Рання ціна закінчилась. Можна оплатити частинами: 2 × {uah(price / 2)}</p>
            )}
          </>
        )}
      </div>

      <div class="offer__cta" id="hero-cta" data-primary-cta>
        {full ? (
          <button type="button" class="btn btn--block" onClick={() => openWaitlist(group.id)}>
            Записатися в лист очікування
          </button>
        ) : (
          <a class="btn btn--block" href={`/checkout?group=${group.id}`}>
            Забронювати місце
          </a>
        )}
      </div>

      <p class="offer__note">
        {full
          ? 'Без оплати. Просто напишемо в Telegram або подзвонимо.'
          : `Картка, Apple Pay або частинами. Повне повернення до ${COURSE.refundUntilLesson}-го заняття.`}
      </p>
    </div>
  );
}
