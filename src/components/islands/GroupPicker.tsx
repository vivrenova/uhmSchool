import { GROUPS, type GroupId } from '../../config/school';
import { plural } from '../../lib/schedule';
import type { Seats } from '../../lib/store';
import './GroupPicker.css';

interface Props {
  /** Унікальне ім’я радіогрупи: пікер є і на першому екрані, і в цінах. */
  name: string;
  value: GroupId;
  seats: Record<GroupId, Seats>;
  onChange: (g: GroupId) => void;
  class?: string;
  /** Для темного фону (картка цін). */
  onInk?: boolean;
}

export default function GroupPicker({ name, value, seats, onChange, class: cls = '', onInk = false }: Props) {
  return (
    <fieldset class={`groups ${onInk ? 'groups--ink' : ''} ${cls}`}>
      <legend class="groups__legend">Час занять за Києвом</legend>
      <div class="groups__list">
        {GROUPS.map((g) => {
          const s = seats[g.id];
          return (
            <label class={`chip${s.free === 0 ? ' chip--full' : ''}`} key={g.id}>
              <input type="radio" name={name} value={g.id} checked={g.id === value} onChange={() => onChange(g.id)} />
              <span class="chip__main tnum">
                {g.days} {g.time}
              </span>
              <span class="chip__sub">
                {s.free === 0 ? '0 місць' : `${s.free} ${plural(s.free, 'місце', 'місця', 'місць')}`}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
