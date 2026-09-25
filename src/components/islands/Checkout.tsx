import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSE, DEFAULT_GROUP, GROUPS, PLANS, TEACHER, type GroupId, type PlanId } from '../../config/school';
import { useBefore, useClock, useDemo } from '../../lib/hooks';
import { saveDraft } from '../../lib/orders';
import { planAmounts, uah } from '../../lib/pricing';
import { dayMonth, deadlineWords, getGroup, groupStart, wdLongDayMonth, addDays } from '../../lib/schedule';
import { allSeats } from '../../lib/store';
import { emailError, emailSuggestion, normalizeEmail, phoneDigits, phoneError } from '../../lib/validate';
import PhoneInput from '../form/PhoneInput';
import Countdown from './Countdown';
import GroupPicker from './GroupPicker';
import { openWaitlist } from './HeroOffer';
import PlanPicker from './PlanPicker';
import './Checkout.css';

export default function Checkout({ ssrNow }: { ssrNow: number }) {
  const demo = useDemo();
  const { now, schedule } = useClock(ssrNow, demo);
  const [groupId, setGroupId] = useState<GroupId>(DEFAULT_GROUP);
  const [plan, setPlan] = useState<PlanId>('full');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState({ email: false, phone: false });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  // До гідратації кнопка неактивна: інакше ранній тап відправить форму як звичайний HTML.
  const [hydrated, setHydrated] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Група й план — з адреси; контакти — з незавершеного замовлення (повернулись з оплати).
  useEffect(() => {
    setHydrated(true);
    // На повільному інтернеті людина встигає ввести дані до завантаження JS — підхоплюємо їх.
    const typedEmail = (document.getElementById('co-email') as HTMLInputElement | null)?.value;
    const typedPhone = (document.getElementById('co-phone') as HTMLInputElement | null)?.value;
    if (typedEmail) setEmail(typedEmail);
    if (typedPhone) setPhone(phoneDigits(typedPhone));
    const q = new URLSearchParams(location.search);
    const g = q.get('group');
    const p = q.get('plan');
    if (g && GROUPS.some((x) => x.id === g)) setGroupId(g as GroupId);
    if (p && PLANS.some((x) => x.id === p)) setPlan(p as PlanId);
  }, []);
  useEffect(() => {
    if (demo.draft && !email && !phone) {
      setEmail(demo.draft.email);
      setPhone(demo.draft.phone);
    }
  }, [demo.draft]);

  // Адреса сторінки завжди відповідає вибору — оновлення сторінки нічого не зламає.
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('group', groupId);
    url.searchParams.set('plan', plan);
    history.replaceState(null, '', url);
  }, [groupId, plan]);

  const group = getGroup(groupId);
  const seats = allSeats(demo, schedule);
  const s = seats[group.id];
  const full = s.free === 0;
  const early = useBefore(schedule.earlyDeadline, now, demo.timeOffset);
  const a = planAmounts(plan, early);
  const start = groupStart(schedule, group);

  const eErr = emailError(normalizeEmail(email));
  const pErr = phoneError(phone);
  const showE = (touched.email || submitted) && eErr;
  const showP = (touched.phone || submitted) && pErr;
  const suggestion = !eErr ? emailSuggestion(normalizeEmail(email)) : null;

  function submit(e: Event) {
    e.preventDefault();
    setSubmitted(true);
    if (eErr || pErr) {
      const first = formRef.current?.querySelector<HTMLInputElement>(eErr ? '#co-email' : '#co-phone');
      first?.focus();
      return;
    }
    if (full) return;
    setBusy(true);
    const draft = saveDraft({
      email: normalizeEmail(email),
      phone,
      groupId: group.id,
      cohortKey: schedule.cohortKey,
      plan,
      amount: a.now,
      total: a.total,
      early,
    });
    location.href = `/pay?order=${encodeURIComponent(draft.id)}`;
  }

  const secondDue = addDays(start, 14); // перед 5-м заняттям

  return (
    <div class="co">
      <aside class="co__summary card" aria-labelledby="co-sum-title">
        <h2 id="co-sum-title" class="co__course">{COURSE.title}</h2>
        <dl class="co__facts">
          <div>
            <dt>Група</dt>
            <dd class="tnum">
              {group.days}, {group.time}–{group.timeEnd}
            </dd>
          </div>
          <div>
            <dt>Старт</dt>
            <dd>{wdLongDayMonth(start)}</dd>
          </div>
          <div>
            <dt>Викладачка</dt>
            <dd>
              {TEACHER.firstName} {TEACHER.lastName}
            </dd>
          </div>
          <div>
            <dt>Місць</dt>
            <dd class="tnum">{full ? 'немає' : `${s.free} з ${s.total}`}</dd>
          </div>
        </dl>

        <dl class="co__bill tnum">
          <div>
            <dt>Курс, {COURSE.lessons} занять</dt>
            <dd>{uah(COURSE.price.regular)}</dd>
          </div>
          {early && (
            <div class="co__discount">
              <dt>Рання ціна</dt>
              <dd>−{uah(COURSE.price.regular - COURSE.price.early)}</dd>
            </div>
          )}
          <div class="co__total">
            <dt>{a.parts === 1 ? 'До сплати' : 'Зараз'}</dt>
            <dd>{uah(a.now)}</dd>
          </div>
          {a.parts === 2 && (
            <div class="co__later">
              <dt>Друга частина — до {dayMonth(secondDue)}</dt>
              <dd>{uah(a.perPart)}</dd>
            </div>
          )}
          {a.parts === 4 && (
            <div class="co__later">
              <dt>Ще 3 платежі раз на місяць</dt>
              <dd>3 × {uah(a.perPart)}</dd>
            </div>
          )}
        </dl>
        {early && (
          <p class="co__timer">
            Рання ціна діє до {deadlineWords(schedule.earlyDeadline, now)}, 23:59 — ще{' '}
            <Countdown until={schedule.earlyDeadline} offset={demo.timeOffset} ssrNow={ssrNow} />
          </p>
        )}
        <p class="co__refund">Повернемо всю суму, якщо напишете до {COURSE.refundUntilLesson}-го заняття.</p>
      </aside>

      <form class="co__form" ref={formRef} onSubmit={submit} noValidate>
        <GroupPicker name="co-group" value={group.id} seats={seats} onChange={setGroupId} class="groups--rows co__block" />

        {full ? (
          <div class="co__full">
            <p>
              У групі {group.days} {group.time} місць немає. Оберіть іншу групу або станьте в лист очікування — наступний набір
              стартує {dayMonth(schedule.nextCohortStart)}.
            </p>
            <button type="button" class="btn btn--ghost" onClick={() => openWaitlist(group.id)}>
              Записатися в лист очікування
            </button>
          </div>
        ) : (
          <>
            <PlanPicker name="co-plan" value={plan} early={early} onChange={setPlan} showLegend legend="Як оплатити" />

            <fieldset class="co__contacts co__block">
              <legend class="co__legend">Куди надіслати доступ</legend>

              <div class="field">
                <label class="field__label" for="co-email">
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="co-email"
                  class="input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellcheck={false}
                  enterKeyHint="next"
                  placeholder="name@gmail.com"
                  value={email}
                  onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
                  onBlur={() => {
                    setEmail((v) => normalizeEmail(v));
                    setTouched((t) => ({ ...t, email: true }));
                  }}
                  aria-invalid={showE ? 'true' : 'false'}
                  aria-describedby={showE ? 'co-email-err' : 'co-email-hint'}
                />
                {showE ? (
                  <p class="field__error" id="co-email-err" role="alert">
                    {eErr}
                  </p>
                ) : (
                  <p class="field__hint" id="co-email-hint">
                    Сюди прийде чек і лист із доступом до кабінету
                  </p>
                )}
                {suggestion && (
                  <button
                    type="button"
                    class="suggest"
                    onClick={() => {
                      setEmail(suggestion);
                      emailRef.current?.focus();
                    }}
                  >
                    Можливо, <b>{suggestion}</b>?
                  </button>
                )}
              </div>

              <div class="field">
                <label class="field__label" for="co-phone">
                  Телефон
                </label>
                <PhoneInput
                  id="co-phone"
                  value={phone}
                  onInput={setPhone}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  invalid={!!showP}
                  describedBy={showP ? 'co-phone-err' : 'co-phone-hint'}
                  enterKeyHint="go"
                />
                {showP ? (
                  <p class="field__error" id="co-phone-err" role="alert">
                    {pErr}
                  </p>
                ) : (
                  <p class="field__hint" id="co-phone-hint">
                    Для чату групи в Telegram і нагадувань перед заняттям
                  </p>
                )}
              </div>
            </fieldset>

            <button type="submit" class="btn btn--block co__pay" disabled={busy || !hydrated}>
              {busy ? 'Переходимо до оплати…' : `Перейти до оплати · ${uah(a.now)}`}
            </button>
            <p class="co__legal">
              Далі — сторінка платіжного сервісу: картка, Apple Pay або Google Pay. Натискаючи кнопку, ви погоджуєтесь з
              умовами публічної оферти.
            </p>
          </>
        )}
      </form>
    </div>
  );
}
