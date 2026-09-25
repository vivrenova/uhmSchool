import { plural } from '../lib/schedule';

interface Props {
  sold: number;
  total: number;
  class?: string;
}

/** 8 квадратиків = 8 місць у групі. Зафарбовані — зайняті. */
export default function SeatDots({ sold, total, class: cls = '' }: Props) {
  const free = total - sold;
  const label =
    free === 0
      ? `Усі ${total} місць зайняті`
      : `Вільно ${free} ${plural(free, 'місце', 'місця', 'місць')} з ${total}`;
  return (
    <span class={`seats ${cls}`} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <span class={i < sold ? 'seats__dot seats__dot--taken' : 'seats__dot'} />
      ))}
    </span>
  );
}
