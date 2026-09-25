import { useEffect, useState } from 'preact/hooks';
import { countdown, plural } from '../../lib/schedule';

interface Props {
  until: number;
  /** Зсув демо-годинника. */
  offset: number;
  /** Момент збірки — перший рендер збігається зі статичним HTML. */
  ssrNow: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function Countdown({ until, offset, ssrNow }: Props) {
  const [now, setNow] = useState(ssrNow);
  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offset]);

  const c = countdown(until, now);
  const days = c.days > 0 ? `${c.days} ${plural(c.days, 'день', 'дні', 'днів')} ` : '';
  // Читачам екрана — без щосекундних оголошень: aria-live вимкнено, є статичний текст поруч.
  return (
    <span class="countdown tnum" role="timer" aria-live="off">
      {days}
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </span>
  );
}
