import type { Deck, StudyCard } from '../types';

export const initialDecks: Deck[] = [
  {
    id: 'english',
    title: '영어 단어',
    subtitle: '매일 조금씩 영어와 친해지기',
    theme: 'peach',
    icon: 'language',
  },
  {
    id: 'java',
    title: '개발 개념',
    subtitle: '알고 있는 것을 오래 기억하기',
    theme: 'lavender',
    icon: 'code',
  },
  { id: 'history', title: '한국사', subtitle: '이야기로 기억하는 역사', theme: 'butter', icon: 'history' },
  { id: 'general', title: '나의 메모', subtitle: '잊고 싶지 않은 작은 지식', theme: 'blue', icon: 'book' },
];
const yesterday = (daysBack = 0) => new Date(Date.now() - daysBack * 86_400_000).toISOString();
export const initialCards: StudyCard[] = [
  {
    id: 'c1',
    deckId: 'java',
    front: 'REST API에서 멱등성이란?',
    back: '같은 요청을 여러 번 실행해도 서버의 최종 상태가 동일하게 유지되는 성질이에요.',
    dueAt: yesterday(1),
    repetitions: 2,
  },
  {
    id: 'c2',
    deckId: 'english',
    front: 'serendipity',
    back: '뜻밖의 행운, 우연히 발견한 기쁨\n\nA happy serendipity brought us together.',
    dueAt: yesterday(1),
    repetitions: 1,
  },
  {
    id: 'c3',
    deckId: 'history',
    front: '훈민정음이 반포된 해는?',
    back: '1446년, 세종 28년이에요.',
    dueAt: yesterday(1),
    repetitions: 0,
  },
  {
    id: 'c4',
    deckId: 'english',
    front: 'resilient',
    back: '회복력이 있는, 탄력 있는\n\nShe remained resilient despite difficulties.',
    dueAt: yesterday(1),
    repetitions: 2,
  },
  {
    id: 'c5',
    deckId: 'java',
    front: '트랜잭션 ACID의 네 가지 속성은?',
    back: '원자성(Atomicity), 일관성(Consistency), 격리성(Isolation), 지속성(Durability)',
    dueAt: yesterday(1),
    repetitions: 0,
  },
  {
    id: 'c6',
    deckId: 'general',
    front: '망각곡선과 간격 반복의 차이는?',
    back: '망각곡선은 시간이 지남에 따라 기억이 약해지는 경향을 설명하고, 간격 반복은 복습 간격을 조절해 기억을 강화하는 학습 방법이에요.',
    dueAt: yesterday(1),
    repetitions: 0,
  },
];
