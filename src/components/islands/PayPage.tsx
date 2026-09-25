import { useEffect, useRef, useState } from 'preact/hooks';
import { COURSE, SCHOOL } from '../../config/school';
import { useDemo } from '../../lib/hooks';
import { completePayment, failPayment } from '../../lib/orders';
import { uah } from '../../lib/pricing';
import { getGroup } from '../../lib/schedule';
import { getState, type Draft, type PayMethod } from '../../lib/store';
import {
  TEST_CARDS,
  cardBrand,
  cardDigits,
  cardError,
  cvcError,
  expiryError,
  formatCard,
  formatExpiry,
  formatPhone,
} from '../../lib/validate';
import './PayPage.css';

type Stage = 'form' | 'processing' | 'otp' | 'wallet';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Чи показувати Apple Pay: лише там, де він справді є (Safari на Apple), або ?wallet=apple для тесту. */
function detectWallet(): 'apple' | 'google' {
  const q = new URLSearchParams(location.search).get('wallet');
  if (q === 'apple' || q === 'google') return q;
  return 'ApplePaySession' in window || /iPhone|iPad|Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent)
    ? 'apple'
    : 'google';
}

export default function PayPage() {
  const demo = useDemo();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<'apple' | 'google'>('google');
  const [stage, setStage] = useState<Stage>('form');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [walletDone, setWalletDone] = useState(false);
  const errRef = useRef<HTMLDivElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('order');
    setOrderId(id);
    setWallet(detectWallet());
    // Уже оплачено (наприклад, натиснули «назад») — одразу на сторінку успіху.
    if (id && getState().payments.some((p) => p.id === id)) location.replace(`/success?order=${id}`);
    setReady(true);
  }, []);

  const draft: Draft | null = demo.draft && demo.draft.id === orderId ? demo.draft : null;

  if (!ready) return <div class="pay pay--loading" aria-busy="true" />;

  if (!draft) {
    return (
      <div class="pay">
        <div class="pay__card pay__empty">
          <h1 class="pay__h">Замовлення не знайдено</h1>
          <p>Можливо, його вже оплачено або демо-дані скинуто. Почніть бронювання ще раз.</p>
          <a class="btn btn--block" href="/checkout">
            До бронювання
          </a>
        </div>
      </div>
    );
  }

  const group = getGroup(draft.groupId);
  const brand = cardBrand(card);
  const cErr = cardError(card);
  const xErr = expiryError(exp);
  const vErr = cvcError(cvc);
  const back = `/checkout?group=${draft.groupId}&plan=${draft.plan}`;

  async function finish(method: PayMethod, last4?: string) {
    setStage('processing');
    await wait(reduceMotion() ? 300 : 1100);
    const p = completePayment(draft!, method, last4);
    location.replace(`/success?order=${encodeURIComponent(p.id)}`);
  }

  async function payCard(e: Event) {
    e.preventDefault();
    setSubmitted(true);
    setDeclined(null);
    if (cErr || xErr || vErr) {
      document.querySelector<HTMLInputElement>(cErr ? '#pay-card' : xErr ? '#pay-exp' : '#pay-cvc')?.focus();
      return;
    }
    setStage('processing');
    await wait(reduceMotion() ? 300 : 900);
    setOtp('');
    setOtpErr(null);
    setStage('otp');
    requestAnimationFrame(() => otpRef.current?.focus());
  }

  async function confirmOtp(e: Event) {
    e.preventDefault();
    if (otp !== '1234') {
      setOtpErr('Невірний код. Тестовий код — 1234');
      otpRef.current?.focus();
      return;
    }
    if (card === TEST_CARDS.declined) {
      setStage('processing');
      await wait(reduceMotion() ? 300 : 1000);
      const reason = 'Недостатньо коштів на картці';
      failPayment(draft!, reason);
      setDeclined(reason);
      setStage('form');
      requestAnimationFrame(() => errRef.current?.focus());
      return;
    }
    finish('card', card.slice(-4));
  }

  async function payWallet() {
    setWalletDone(true);
    await wait(reduceMotion() ? 200 : 900);
    finish(wallet);
  }

  return (
    <div class="pay">
      <p class="pay__test" role="note">
        <b>Тестовий режим.</b> Гроші не списуються — вводьте тестові картки нижче.
      </p>

      <div class="pay__card">
        <header class="pay__head">
          <p class="pay__merchant">
            {SCHOOL.name} <span>· {SCHOOL.tagline}</span>
          </p>
          <p class="pay__amount tnum">{uah(draft.amount)}</p>
          <p class="pay__desc">
            {COURSE.title}, група {group.days} {group.time}
            {draft.amount !== draft.total && ` — перший платіж із ${uah(draft.total)}`}
          </p>
          <p class="pay__order tnum">Замовлення {draft.id}</p>
        </header>

        {declined && (
          <div class="pay__declined" role="alert" tabIndex={-1} ref={errRef}>
            <p>
              <b>Банк відхилив оплату:</b> {declined.toLowerCase()}. Гроші не списано.
            </p>
            <p>Спробуйте іншу картку або {wallet === 'apple' ? 'Apple Pay' : 'Google Pay'}.</p>
          </div>
        )}

        <div class="pay__wallets">
          {wallet === 'apple' ? (
            <button type="button" class="wallet wallet--apple" onClick={() => setStage('wallet')} aria-label="Оплатити через Apple Pay">
              <span class="wallet__fallback">Оплатити через Apple Pay</span>
            </button>
          ) : (
            <button type="button" class="wallet wallet--google" onClick={() => setStage('wallet')}>
              Оплатити через Google Pay
            </button>
          )}
          <p class="pay__or">
            <span>або карткою</span>
          </p>
        </div>

        <form class="pay__form" onSubmit={payCard} noValidate>
          <div class="field">
            <label class="field__label" for="pay-card">
              Номер картки
            </label>
            <div class="pay__cardwrap">
              <input
                id="pay-card"
                class="input tnum"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                value={formatCard(card)}
                onInput={(e) => {
                  const el = e.currentTarget as HTMLInputElement;
                  const d = cardDigits(el.value);
                  el.value = formatCard(d);
                  setCard(d);
                }}
                aria-invalid={submitted && cErr ? 'true' : 'false'}
                aria-describedby={submitted && cErr ? 'pay-card-err' : undefined}
              />
              {brand && <span class={`pay__brand pay__brand--${brand}`}>{brand === 'visa' ? 'VISA' : 'MC'}</span>}
            </div>
            {submitted && cErr && (
              <p class="field__error" id="pay-card-err">
                {cErr}
              </p>
            )}
          </div>

          <div class="pay__row">
            <div class="field">
              <label class="field__label" for="pay-exp">
                Термін дії
              </label>
              <input
                id="pay-exp"
                class="input tnum"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="ММ / РР"
                maxLength={7}
                value={exp}
                onInput={(e) => {
                  const el = e.currentTarget as HTMLInputElement;
                  const deleting = (e as InputEvent).inputType?.startsWith('delete');
                  const v = deleting ? el.value : formatExpiry(el.value);
                  el.value = v;
                  setExp(v);
                }}
                aria-invalid={submitted && xErr ? 'true' : 'false'}
                aria-describedby={submitted && xErr ? 'pay-exp-err' : undefined}
              />
              {submitted && xErr && (
                <p class="field__error" id="pay-exp-err">
                  {xErr}
                </p>
              )}
            </div>
            <div class="field">
              <label class="field__label" for="pay-cvc">
                CVV
              </label>
              <input
                id="pay-cvc"
                class="input tnum"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                maxLength={3}
                value={cvc}
                onInput={(e) => {
                  const el = e.currentTarget as HTMLInputElement;
                  const d = el.value.replace(/\D/g, '').slice(0, 3);
                  el.value = d;
                  setCvc(d);
                }}
                aria-invalid={submitted && vErr ? 'true' : 'false'}
                aria-describedby={submitted && vErr ? 'pay-cvc-err' : undefined}
              />
              {submitted && vErr && (
                <p class="field__error" id="pay-cvc-err">
                  {vErr}
                </p>
              )}
            </div>
          </div>

          <div class="pay__tests">
            <p>Тестові картки:</p>
            <button
              type="button"
              class="pay__testcard"
              onClick={() => {
                setCard(TEST_CARDS.ok);
                setExp('12 / 29');
                setCvc('123');
                setDeclined(null);
              }}
            >
              <span class="tnum">4242 4242 4242 4242</span> <span>успішна оплата</span>
            </button>
            <button
              type="button"
              class="pay__testcard"
              onClick={() => {
                setCard(TEST_CARDS.declined);
                setExp('12 / 29');
                setCvc('123');
                setDeclined(null);
              }}
            >
              <span class="tnum">4000 0000 0000 0002</span> <span>банк відмовить</span>
            </button>
          </div>

          <button type="submit" class="btn btn--block pay__submit">
            Сплатити {uah(draft.amount)}
          </button>
        </form>

        <p class="pay__foot">
          Після оплати доступ відкриється одразу, а чек прийде на {draft.email}. <a href={back}>Повернутися до бронювання</a>
        </p>
      </div>

      {stage === 'processing' && (
        <div class="pay__overlay" role="status" aria-live="assertive">
          <span class="pay__spinner" aria-hidden="true" />
          <p>Обробляємо оплату…</p>
          <p class="pay__overlay-sub">Не закривайте сторінку</p>
        </div>
      )}

      {stage === 'otp' && (
        <div class="pay__overlay pay__overlay--sheet">
          <form class="sheet" onSubmit={confirmOtp} role="dialog" aria-modal="true" aria-labelledby="otp-title">
            <h2 id="otp-title" class="sheet__title">
              Підтвердження від банку
            </h2>
            <p class="sheet__text">
              Банк надіслав код на <span class="tnum nowrap">{formatPhone(draft.phone)}</span>. Тестовий код —{' '}
              <b class="tnum">1234</b>.
            </p>
            <label class="sr-only" for="otp">
              Код з SMS
            </label>
            <input
              ref={otpRef}
              id="otp"
              class="input tnum sheet__otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder="••••"
              value={otp}
              onInput={(e) => {
                const el = e.currentTarget as HTMLInputElement;
                const d = el.value.replace(/\D/g, '').slice(0, 4);
                el.value = d;
                setOtp(d);
                setOtpErr(null);
              }}
              aria-invalid={otpErr ? 'true' : 'false'}
              aria-describedby={otpErr ? 'otp-err' : undefined}
            />
            {otpErr && (
              <p class="field__error" id="otp-err" role="alert">
                {otpErr}
              </p>
            )}
            <button type="submit" class="btn btn--block">
              Підтвердити
            </button>
            <button type="button" class="link-btn" onClick={() => setStage('form')}>
              Скасувати
            </button>
          </form>
        </div>
      )}

      {stage === 'wallet' && (
        <div
          class="pay__overlay pay__overlay--sheet"
          onClick={(e) => e.target === e.currentTarget && !walletDone && setStage('form')}
        >
          <div class="sheet sheet--wallet" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
            <h2 id="wallet-title" class="sheet__title">
              {wallet === 'apple' ? 'Apple Pay' : 'Google Pay'} <span>симуляція</span>
            </h2>
            <dl class="sheet__rows">
              <div>
                <dt>Картка</dt>
                <dd class="tnum">Visa •••• 4242</dd>
              </div>
              <div>
                <dt>Отримувач</dt>
                <dd>{SCHOOL.name}</dd>
              </div>
              <div class="sheet__sum">
                <dt>До сплати</dt>
                <dd class="tnum">{uah(draft.amount)}</dd>
              </div>
            </dl>
            {walletDone ? (
              <p class="sheet__ok" role="status">
                <span class="sheet__tick" aria-hidden="true" />
                Готово
              </p>
            ) : (
              <>
                <button type="button" class="btn btn--block" onClick={payWallet} autoFocus>
                  {wallet === 'apple' ? 'Підтвердити Face ID' : 'Продовжити'}
                </button>
                <button type="button" class="link-btn" onClick={() => setStage('form')}>
                  Скасувати
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
