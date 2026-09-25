// Відгуки у форматі скрінів, які школа зазвичай тримає в хайлайтах Instagram.
// Тексти навмисно «живі»: маленькі літери, одруки, пара емодзі — як у справжніх переписках.

export type Bubble = { text: string; time: string } | { voice: string; time: string };

export type Review =
  | { kind: 'tg'; name: string; seen: string; initials: string; color: string; bubbles: Bubble[]; caption: string }
  | { kind: 'tg-group'; chat: string; name: string; color: string; text: string; time: string; reaction: string; caption: string }
  | { kind: 'ig-reply'; name: string; initials: string; story: string; text: string; caption: string }
  | { kind: 'ig-dm'; name: string; initials: string; texts: string[]; caption: string };

export const REVIEWS: Review[] = [
  {
    kind: 'tg',
    name: 'Катерина',
    seen: 'була в мережі нещодавно',
    initials: 'К',
    color: '#b35d28',
    bubbles: [
      { text: 'Ярино!!! у мене сьогодні була співбесіда англійською', time: '18:52' },
      { text: '25 хвилин. і я жодного разу не зависла. ну ок, двічі 😅', time: '18:52' },
      { text: 'мене питали майже те саме, що ми робили на стендапах на 3 тижні', time: '18:53' },
    ],
    caption: 'Катерина, група Вт/Чт',
  },
  {
    kind: 'ig-reply',
    name: 'Денис',
    initials: 'Д',
    story: 'Тиждень 8: фінальні розмови з носіями',
    text: 'це перший курс, який я дойшов до кінця. і перший раз говорив з американцем 10 хв і не перепитував кожне речення',
    caption: 'Денис, група Пн/Ср 19:30',
  },
  {
    kind: 'tg-group',
    chat: 'Speaking B1 · Пн/Ср',
    name: 'Марта',
    color: '#1f6aa5',
    text: 'маленька перемога: на мітингу замість «sorry my english is bad» сказала «could you repeat the last part?» і все 🙂',
    time: '11:20',
    reaction: '👏 6',
    caption: 'Марта, чат групи Пн/Ср',
  },
  {
    kind: 'ig-dm',
    name: 'Олена К.',
    initials: 'ОК',
    texts: [
      'а коли наступний потік?',
      'хочу записати ще чоловіка. він послухав мої голосові й сказав що теж так хоче 😂',
    ],
    caption: 'Олена, група Вт/Чт',
  },
  {
    kind: 'tg',
    name: 'Ігор',
    seen: 'був у мережі о 09:20',
    initials: 'І',
    color: '#3d7d4c',
    bubbles: [
      { voice: '0:34', time: '09:14' },
      { text: 'це я замовляю каву в Кракові. 5 тиждень працює, бариста навіть не перейшов на польську', time: '09:15' },
    ],
    caption: 'Ігор, група Пн/Ср 08:00',
  },
  {
    kind: 'tg',
    name: 'Софія',
    seen: 'в мережі',
    initials: 'С',
    color: '#6d4fa3',
    bubbles: [
      {
        text: 'можна чесний фідбек? боялась що буде 20 людей і я просто сидітиму з вимкненим мікро. а в групі на 8 не сховаєшся — і це найкраще, що могло статись',
        time: '22:07',
      },
    ],
    caption: 'Софія, група Пн/Ср 19:30',
  },
];
