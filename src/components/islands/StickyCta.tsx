import { useEffect, useState } from 'preact/hooks';
import { useBefore, useClock, useDemo, useSelectedGroup } from '../../lib/hooks';
import { coursePrice, uah } from '../../lib/pricing';
import { getGroup, groupStart, dayMonth, plural } from '../../lib/schedule';
import { seatsFor } from '../../lib/store';
import { openWaitlist } from './HeroOffer';
import './StickyCta.css';

/**
 * Нижня панель на телефоні: ціна, місця й кнопка завжди під пальцем.
 * Ховається, коли на екрані вже є основна кнопка (перший екран або блок цін).
 */
export default function StickyCta({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { now, schedule } = useClock(ssrNow, demo);
  const [groupId] = useSelectedGroup();
  const group = getGroup(groupId);
  const seats = seatsFor(group.id, demo, schedule);
  const early = useBefore(schedule.earlyDeadline, now, demo.timeOffset);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const targets = [...document.querySelectorAll('[data-primary-cta]')];
    if (!targets.length || !('IntersectionObserver' in window)) return;
    const onScreen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target);
        setVisible(onScreen.size === 0);
      },
      { rootMargin: '0px 0px -40px 0px' },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const full = seats.free === 0;
  const price = coursePrice(early);

  return (
    <div class={`sticky-cta${visible ? ' is-visible' : ''}`} aria-hidden={!visible} inert={!visible}>
      <div class="sticky-cta__info">
        <span class="sticky-cta__price tnum">{full ? 'Місць немає' : uah(price)}</span>
        <span class="sticky-cta__meta">
          {full
            ? `${group.days} ${group.time}`
            : `${seats.free} ${plural(seats.free, 'місце', 'місця', 'місць')} · старт ${dayMonth(groupStart(schedule, group))}`}
        </span>
      </div>
      {full ? (
        <button type="button" class="btn sticky-cta__btn" onClick={() => openWaitlist(group.id)}>
          У лист очікування
        </button>
      ) : (
        <a class="btn sticky-cta__btn" href={`/checkout?group=${group.id}`}>
          Забронювати
        </a>
      )}
    </div>
  );
}
