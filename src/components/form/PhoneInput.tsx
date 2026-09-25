import { useRef, useState } from 'preact/hooks';
import { caretAfterDigits, digitsBefore, formatPhone, phoneDigits } from '../../lib/validate';

interface Props {
  id: string;
  /** 9 цифр після +380 */
  value: string;
  onInput: (digits: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  enterKeyHint?: 'next' | 'done' | 'go' | 'send';
}

const PREFIX = '+380 ';

/**
 * Телефон з маскою «+380 67 123 45 67».
 * Приймає будь-який формат при вставці й автозаповненні, тримає курсор на місці,
 * а Backspace «перестрибує» пробіли, щоб не залипати.
 */
export default function PhoneInput({ id, value, onInput, onBlur, invalid, describedBy, enterKeyHint = 'next' }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const shown = value ? formatPhone(value) : focused ? PREFIX : '';

  function handleInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const raw = el.value;
    const pos = el.selectionStart ?? raw.length;
    const before = digitsBefore(raw, pos);
    const d = phoneDigits(raw);
    const next = d ? formatPhone(d) : PREFIX;
    el.value = next;
    const caret = d ? caretAfterDigits(next, before) : next.length;
    if (document.activeElement === el) el.setSelectionRange(caret, caret);
    onInput(d);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const el = e.currentTarget as HTMLInputElement;
    const pos = el.selectionStart ?? 0;
    if (e.key === 'Backspace' && pos === el.selectionEnd) {
      if (pos <= PREFIX.length) {
        e.preventDefault();
        return;
      }
      if (el.value[pos - 1] === ' ') el.setSelectionRange(pos - 1, pos - 1);
    }
  }

  function handleFocus() {
    // Префікс «+380 » з’являється через рендер (shown); тут лише ставимо курсор у кінець.
    // Дивимось на DOM, а не на value з замикання: автозаповнення могло вже вписати номер.
    setFocused(true);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el && document.activeElement === el && el.value === PREFIX) {
        el.setSelectionRange(PREFIX.length, PREFIX.length);
      }
    });
  }

  return (
    <input
      ref={ref}
      id={id}
      class="input tnum"
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      enterKeyHint={enterKeyHint}
      placeholder="+380 67 123 45 67"
      value={shown}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      aria-invalid={invalid ? 'true' : 'false'}
      aria-describedby={describedBy}
    />
  );
}
