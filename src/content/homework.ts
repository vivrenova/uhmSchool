// Розшифровка голосового домашнього завдання учениці (3-й тиждень) з правками Ярини.
// Рядок — звичайний текст; об’єкт — місце, яке виправляє червона ручка.

export type Piece = string | { wrong: string; fix?: string };

export const HOMEWORK = {
  student: 'Олена К.',
  group: 'Вт/Чт 19:30',
  week: 3,
  duration: '1:12',
  task: 'Розкажіть про минулі вихідні',
  text: [
    { wrong: 'Uhm,' },
    ' last weekend I ',
    { wrong: 'have been', fix: 'went' },
    ' to Lviv with my friends. We ',
    { wrong: 'was', fix: 'were' },
    ' there for two days. The weather was so nice ',
    { wrong: 'what', fix: 'that' },
    ' we walked a lot. ',
    { wrong: 'Uhm…' },
    ' my friend said that Lviv is the most beautiful city in Ukraine, and I ',
    { wrong: 'am agree', fix: 'agree' },
    '. ',
    { wrong: 'In the', fix: 'On' },
    ' Sunday we found a tiny coffee shop, and I ',
    { wrong: 'was ordered', fix: 'ordered' },
    ' a latte in English!',
  ] as Piece[],
  comment: 'Олено, 1:12 без зупинок — удвічі довше, ніж на першому тижні! На завтра: 5 речень з that.',
  rules: [
    'last weekend → Past Simple: went, не have been',
    'що → that, а не what',
    'дні тижня — з on: on Sunday',
  ],
};
