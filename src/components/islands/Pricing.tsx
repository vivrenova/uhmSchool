import { useState } from 'preact/hooks';
import { COURSE, type PlanId } from '../../config/school';
import { useBefore, useClock, useDemo, useSelectedGroup } from '../../lib/hooks';
import { planAmounts, uah } from '../../lib/pricing';
import { dayMonth, deadlineWords, getGroup, groupStart, wdDayMonth } from '../../lib/schedule';
import { allSeats } from '../../lib/store';
import Pen from '../Pen';
import Countdown from './Countdown';
import GroupPicker from './GroupPicker';
import PlanPicker from './PlanPicker';
import { openWaitlist } from './HeroOffer';
import './Pricing.css';

export default function Pricing({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { now, schedule } = useClock(ssrNow, demo);
  const [groupId, setGroup] = useSelectedGroup();
  const [plan, setPlan] = useState<PlanId>('full');
  const group = getGroup(groupId);
  const seats = allSeats(demo, schedule);
  const s = seats[group.id];
  const full = s.free === 0;
  const early = useBefore(schedule.earlyDeadline, now, demo.timeOffset);
  const amounts = planAmounts(plan, early);

  return (
    <div class="pcard on-ink">
      <GroupPicker name="group-prices" onInk value={group.id} seats={seats} onChange={setGroup} class="pcard__groups groups--rows" />

      <p class="pcard__start">
        Старт — <b>{wdDayMonth(groupStart(schedule, group))}</b>
        {full ? ', місць немає' : `, вільно ${s.free} з ${s.total}`}
      </p>

      <PlanPicker name="plan-prices" onInk value={plan} early={early} onChange={setPlan} disabled={full} />

      <div class="pcard__price" aria-live="polite">
        {early ? (
          <p>
            Рання ціна <span class="tnum">{uah(COURSE.price.early)}</span> замість{' '}
            <Pen kind="strike">
              <span class="tnum">{uah(COURSE.price.regular)}</span>
            </Pen>{' '}
            — до {deadlineWords(schedule.earlyDeadline, now)}, 23:59. Залишилось{' '}
            <Countdown until={schedule.earlyDeadline} offset={demo.timeOffset} ssrNow={ssrNow} />
          </p>
        ) : (
          <p>
            Рання ціна закінчилась. Повна вартість — <span class="tnum">{uah(COURSE.price.regular)}</span>.
          </p>
        )}
      </div>

      <div class="pcard__cta" data-primary-cta>
        {full ? (
          <>
            <button type="button" class="btn btn--paper btn--block" onClick={() => openWaitlist(group.id)}>
              Записатися в лист очікування
            </button>
            <p class="pcard__small">Наступний набір стартує {dayMonth(schedule.nextCohortStart)}.</p>
          </>
        ) : (
          <>
            <a class="btn btn--paper btn--block" href={`/checkout?group=${group.id}&plan=${plan}`}>
              {amounts.parts === 1 ? `Оплатити ${uah(amounts.now)}` : `Оплатити перший платіж ${uah(amounts.now)}`}
            </a>
            <p class="pcard__small">Картка, Apple Pay, Google Pay. Тестовий режим — гроші не списуються.</p>
          </>
        )}
      </div>
    </div>
  );
}
