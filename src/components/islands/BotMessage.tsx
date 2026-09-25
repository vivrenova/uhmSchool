import { planTitle } from '../../lib/orders';
import { uah } from '../../lib/pricing';
import { getGroup } from '../../lib/schedule';
import type { Notice } from '../../lib/store';
import { formatPhone, maskPhone } from '../../lib/validate';
import { fmtTime } from '../../lib/orders';
import type { PlanId } from '../../config/school';

interface Props {
  notice: Notice;
  /** Вільні місця в групі на момент показу. */
  free?: number;
  plan?: PlanId;
  method?: string;
  fresh?: boolean;
}

/** Повідомлення Telegram-бота власнику школи. */
export default function BotMessage({ notice: n, free, plan, method, fresh }: Props) {
  const g = n.groupId ? getGroup(n.groupId) : null;
  const phone = n.phone ? (n.seeded ? maskPhone(n.phone) : formatPhone(n.phone)) : '';
  return (
    <div class={`bot${fresh ? ' bot--fresh' : ''}`}>
      {n.kind === 'payment' && (
        <>
          <p class="bot__title">Нова оплата · {uah(n.amount ?? 0)}</p>
          {g && (
            <p>
              Група {g.days} {g.time}
              {plan && ` · ${planTitle(plan).toLowerCase()}`}
            </p>
          )}
          <p class="bot__muted">
            {n.email}
            {phone && ` · ${phone}`}
          </p>
          {method && <p class="bot__muted">{method}</p>}
          {free !== undefined && <p>Вільних місць у групі: {free}</p>}
        </>
      )}
      {n.kind === 'waitlist' && (
        <>
          <p class="bot__title">Лист очікування · {n.name}</p>
          {g && (
            <p>
              Група {g.days} {g.time}
            </p>
          )}
          <p class="bot__muted">{phone}</p>
        </>
      )}
      {n.kind === 'failed' && (
        <>
          <p class="bot__title bot__title--warn">Оплата не пройшла · {uah(n.amount ?? 0)}</p>
          <p>{n.reason}</p>
          <p class="bot__muted">
            {n.email}
            {phone && ` · ${phone}`}
          </p>
          <p>Варто написати: людина хотіла оплатити.</p>
        </>
      )}
      <span class="bot__time tnum">{fmtTime(n.createdAt)}</span>
    </div>
  );
}
