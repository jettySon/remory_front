export const deckKinds = [
  { icon: 'language', label: '외국어', theme: 'peach', card: 'word' },
  { icon: 'code', label: '개발', theme: 'lavender', card: 'basic' },
  { icon: 'history', label: '역사', theme: 'butter', card: 'cloze' },
  { icon: 'book', label: '일반', theme: 'blue', card: 'basic' },
] as const;

export const themeLabels = { lavender: '라벤더', peach: '복숭아', butter: '버터 옐로', blue: '하늘색' };
