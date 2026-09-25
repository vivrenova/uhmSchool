import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_GROUP, type GroupId } from '../../config/school';
import { useClock, useDemo } from '../../lib/hooks';
import { joinWaitlist } from '../../lib/orders';
import { dayMonth, getGroup } from '../../lib/schedule';
import { formatPhone, phoneError } from '../../lib/validate';
import PhoneInput from '../form/PhoneInput';
import Pen from '../Pen';
import './Waitlist.css';

/** Лист очікування: відкривається подією «uhm:waitlist» з будь-якої кнопки на сторінці. */
export default function Waitlist({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { schedule } = useClock(ssrNow, demo);
  const ref = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [groupId, setGroupId] = useState<GroupId>(DEFAULT_GROUP);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    const open = (e: Event) => {
      const g = (e as CustomEvent<{ groupId: GroupId }>).detail?.groupId;
      if (g) setGroupId(g);
      setPosition(null);
      setSubmitted(false);
      setTouched({ name: false, phone: false });
      ref.current?.showModal();
      requestAnimationFrame(() => nameRef.current?.focus());
    };
    window.addEventListener('uhm:waitlist', open);
    return () => window.removeEventListener('uhm:waitlist', open);
  }, []);

  const group = getGroup(groupId);
  const nErr = name.trim().length < 2 ? 'Як до вас звертатися?' : null;
  const pErr = phoneError(phone);
  const showN = (touched.name || submitted) && nErr;
  const showP = (touched.phone || submitted) && pErr;

  function submit(e: Event) {
    e.preventDefault();
    setSubmitted(true);
    if (nErr || pErr) {
      ref.current?.querySelector<HTMLInputElement>(nErr ? '#wl-name' : '#wl-phone')?.focus();
      return;
    }
    setPosition(joinWaitlist(name.trim(), phone, group.id, schedule));
  }

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      class="wl"
      aria-labelledby="wl-title"
      onClick={(e) => {
        // клік по затемненню — закрити
        if (e.target === ref.current) close();
      }}
    >
      <div class="wl__box">
        <button type="button" class="wl__close" onClick={close} aria-label="Закрити">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        {position === null ? (
          <form onSubmit={submit} noValidate class="wl__form">
            <h2 id="wl-title" class="wl__title">
              Лист очікування
              <span class="tnum">
                {group.days} {group.time}
              </span>
            </h2>
            <p class="wl__text">
              Якщо хтось відмовиться від місця, напишемо вам першим. Або запропонуємо наступний набір — старт{' '}
              {dayMonth(schedule.nextCohortStart)}. Оплата не потрібна.
            </p>

            <div class="field">
              <label class="field__label" for="wl-name">
                Ім’я
              </label>
              <input
                ref={nameRef}
                id="wl-name"
                class="input"
                type="text"
                autoComplete="given-name"
                autoCapitalize="words"
                enterKeyHint="next"
                value={name}
                onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                aria-invalid={showN ? 'true' : 'false'}
                aria-describedby={showN ? 'wl-name-err' : undefined}
              />
              {showN && (
                <p class="field__error" id="wl-name-err" role="alert">
                  {nErr}
                </p>
              )}
            </div>

            <div class="field">
              <label class="field__label" for="wl-phone">
                Телефон
              </label>
              <PhoneInput
                id="wl-phone"
                value={phone}
                onInput={setPhone}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                invalid={!!showP}
                describedBy={showP ? 'wl-phone-err' : 'wl-phone-hint'}
                enterKeyHint="send"
              />
              {showP ? (
                <p class="field__error" id="wl-phone-err" role="alert">
                  {pErr}
                </p>
              ) : (
                <p class="field__hint" id="wl-phone-hint">
                  Напишемо в Telegram або Viber, не дзвонимо без потреби
                </p>
              )}
            </div>

            <button type="submit" class="btn btn--block">
              Записатися
            </button>
          </form>
        ) : (
          <div class="wl__done" role="status">
            <p class="wl__num">
              <Pen kind="circle" draw="intro">
                <span class="tnum">{position}</span>
              </Pen>
              <span class="wl__numcap">місце в черзі</span>
            </p>
            <h2 id="wl-title" class="wl__title">
              {name.trim()}, ви в листі очікування
            </h2>
            <p class="wl__text">
              На групу {group.days} {group.time}. Щойно звільниться місце — напишемо на{' '}
              <span class="tnum nowrap">{formatPhone(phone)}</span>, і в вас буде 24 години, щоб його забрати.
            </p>
            <button type="button" class="btn btn--ghost btn--block" onClick={close}>
              Добре
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
