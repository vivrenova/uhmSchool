// Маски й перевірки полів: телефон +380, email з підказкою при одруку, картка.
import { plural } from './schedule';

// ——— Телефон ———

/** Будь-який ввід («067…», «+38 (067)…», «380…», автозаповнення iOS) → 9 цифр після +380. */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length <= 3 && '380'.startsWith(d)) return '';
  // Префіксів може бути кілька: «+380 » з маски + вставлений «+38 (067)…» або «067…».
  // Номер після коду країни в Україні не починається з 0, тож нулі на початку — зайві.
  for (;;) {
    if (d.startsWith('380') && d.length > 3) d = d.slice(3);
    else if (d.startsWith('80') && d.length >= 11) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    else break;
  }
  return d.slice(0, 9);
}

/** 9 цифр → «+380 67 123 45 67». */
export function formatPhone(d: string): string {
  let out = '+380';
  if (d.length) out += ' ' + d.slice(0, 2);
  if (d.length > 2) out += ' ' + d.slice(2, 5);
  if (d.length > 5) out += ' ' + d.slice(5, 7);
  if (d.length > 7) out += ' ' + d.slice(7, 9);
  return out;
}

/** Позиція курсора у відформатованому номері після n-ї цифри оператора/номера. */
export function caretAfterDigits(formatted: string, n: number): number {
  if (n <= 0) return Math.min(formatted.length, 5);
  let seen = 0;
  for (let i = 4; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === n) return i + 1;
    }
  }
  return formatted.length;
}

/** Скільки цифр номера (без +380) стоїть перед позицією pos у сирому значенні. */
export function digitsBefore(raw: string, pos: number): number {
  return phoneDigits(raw.slice(0, pos)).length;
}

export function phoneError(d: string): string | null {
  if (!d) return 'Вкажіть телефон — напишемо в Telegram або Viber перед стартом';
  if (d.length < 9) {
    const left = 9 - d.length;
    return `Не вистачає ${left} ${plural(left, 'цифри', 'цифр', 'цифр')}`;
  }
  return null;
}

/** Маскуємо середину: «+380 67 ••• •• 67». */
export function maskPhone(d: string): string {
  return `+380 ${d.slice(0, 2)} ••• •• ${d.slice(7, 9)}`;
}

// ——— Email ———

const DOMAINS = ['gmail.com', 'ukr.net', 'i.ua', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'meta.ua', 'proton.me'];

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function normalizeEmail(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLowerCase();
}

export function emailError(v: string): string | null {
  if (!v) return 'Вкажіть email — туди надішлемо доступ і чек';
  if (!v.includes('@')) return 'В адресі немає @';
  const [local, domain = ''] = v.split('@');
  if (!local) return 'Перед @ має бути ім’я скриньки';
  if (!domain || !domain.includes('.')) return 'Після @ має бути домен, наприклад gmail.com';
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return 'Перевірте адресу: схоже, в ній помилка';
  return null;
}

/** «olena@gmial.com» → «olena@gmail.com». Null, якщо домен виглядає нормально. */
export function emailSuggestion(v: string): string | null {
  const at = v.lastIndexOf('@');
  if (at < 1) return null;
  const domain = v.slice(at + 1);
  if (!domain || DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestD = 3;
  for (const d of DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best && bestD <= 2 ? `${v.slice(0, at + 1)}${best}` : null;
}

// ——— Картка ———

export function cardDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 16);
}
export function formatCard(d: string): string {
  return d.replace(/(\d{4})(?=\d)/g, '$1 ');
}
export function luhn(d: string): boolean {
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return d.length > 0 && sum % 10 === 0;
}
export function cardBrand(d: string): 'visa' | 'mastercard' | null {
  if (d.startsWith('4')) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  return null;
}
export function cardError(d: string): string | null {
  if (!d) return 'Введіть номер картки';
  if (d.length < 16) return `Ще ${16 - d.length} ${plural(16 - d.length, 'цифра', 'цифри', 'цифр')}`;
  if (!luhn(d)) return 'Номер картки з помилкою — перевірте цифри';
  return null;
}

export function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length === 1 && Number(d) > 1) return `0${d} / `;
  if (d.length >= 3) return `${d.slice(0, 2)} / ${d.slice(2)}`;
  if (d.length === 2 && !raw.includes('/')) return `${d} / `;
  return d;
}
export function expiryError(raw: string, now = new Date()): string | null {
  const d = raw.replace(/\D/g, '');
  if (!d) return 'Вкажіть термін дії';
  if (d.length < 4) return 'Формат ММ / РР';
  const m = Number(d.slice(0, 2));
  const y = 2000 + Number(d.slice(2, 4));
  if (m < 1 || m > 12) return 'Місяць — від 01 до 12';
  const lastMoment = new Date(y, m, 1).getTime();
  if (lastMoment <= now.getTime()) return 'Термін дії картки минув';
  return null;
}
export function cvcError(d: string): string | null {
  if (!d) return 'Вкажіть CVV';
  if (d.length < 3) return '3 цифри на звороті картки';
  return null;
}

export const TEST_CARDS = {
  ok: '4242424242424242',
  declined: '4000000000000002',
} as const;
