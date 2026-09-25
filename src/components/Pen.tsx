import type { ComponentChildren } from 'preact';

// Позначки «червоною ручкою» поверх тексту. Лінії трохи нерівні — як від руки.
// Працює і як статичний компонент в .astro, і всередині островів.

const PATHS = {
  strike: 'M1 6.2 C 18 4.6, 34 6.8, 52 5.4 S 84 4.2, 99 5.6',
  underline: 'M1 5.5 C 22 8.2, 48 3.4, 70 5.2 S 92 6.8, 99 4.4',
  circle:
    'M58 3 C 30 1.5, 4 8, 3 20 C 2 31, 30 37.5, 58 36.5 C 86 35.5, 98 28, 97 18 C 96 8, 76 2.5, 52 3.6 C 40 4.1, 30 5.5, 22 8',
} as const;

type Kind = keyof typeof PATHS;

interface Props {
  kind?: Kind;
  /** Дорисувати один раз при завантаженні (перший екран) або по класу is-on у батька. */
  draw?: 'intro' | 'toggle' | 'none';
  children: ComponentChildren;
  class?: string;
}

export default function Pen({ kind = 'strike', draw = 'none', children, class: cls = '' }: Props) {
  const box = kind === 'circle' ? '0 0 100 40' : '0 0 100 10';
  return (
    <span class={`pen pen--${kind} pen--draw-${draw} ${cls}`}>
      {children}
      <svg class="pen__svg" viewBox={box} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={PATHS[kind]} />
      </svg>
    </span>
  );
}
