// Сторінки демо для швидкого переходу: футер і демо-панель беруть список звідси.
// /pay сюди не входить — це крок оплати, на нього потрапляють із бронювання.

export const DEMO_PAGES = [
  { href: '/', label: 'Сторінка курсу' },
  { href: '/checkout', label: 'Бронювання' },
  { href: '/success', label: 'Оплату отримано' },
  { href: '/mail', label: 'Лист учню' },
  { href: '/learn', label: 'Кабінет учня' },
  { href: '/admin', label: 'Кабінет власника' },
  { href: '/demo', label: 'Два екрани' },
] as const;

/** «/checkout.html», «/checkout/» → «/checkout» */
export function normalizePath(path: string): string {
  const p = path.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1');
  return p || '/';
}
