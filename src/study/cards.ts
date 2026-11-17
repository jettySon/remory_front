import type { CardContent, CardDraft, CardKind, StudyCard } from '../types';

export const cardFields = {
  basic: { label: '질문과 답', fields: ['질문', '답'] },
  word: { label: '단어와 예문', fields: ['단어', '뜻', '예문'] },
  cloze: { label: '빈칸 채우기', fields: ['문장 (빈칸은 ___로 표시)', '빈칸에 들어갈 말'] },
  choice: { label: '객관식', fields: ['질문', '정답', '오답 1', '오답 2'] },
} satisfies Record<CardKind, { label: string; fields: string[] }>;

export type BulkRow = { line: number; values: string[] };

export function validateDraft(kind: CardKind, values: string[]): string | undefined {
  const fieldCount = cardFields[kind].fields.length;
  if (values.length !== fieldCount) return `이 카드 유형에는 열이 ${fieldCount}개 필요해요.`;
  if (values.some((value) => !value.trim())) return '비어 있는 항목을 채워 주세요.';
  if (kind === 'cloze' && values[0].split('___').length !== 2) return '문장에 ___를 한 번 넣어 주세요.';
  if (kind === 'choice' && new Set(values.slice(1).map((value) => value.trim())).size !== 3) {
    return '정답과 오답은 서로 달라야 해요.';
  }
}

export function makeDraft(kind: CardKind, values: string[]): CardDraft {
  const [front, back, third, fourth] = values.map((value) => value.trim());
  if (kind === 'word') return { kind, front, back: back + '\n\n' + third };
  if (kind === 'cloze') {
    return { kind, front, back: front.replace('___', () => back) };
  }
  if (kind === 'choice') {
    const choices = [back, third, fourth];
    const position = Math.floor(Math.random() * choices.length);
    [choices[0], choices[position]] = [choices[position], choices[0]];
    return { kind, front, back, choices };
  }
  return { kind, front, back };
}

type CardEditFields = { kind: CardKind; values: string[]; labels?: string[] };

export function readCardEditFields(card: StudyCard): CardEditFields {
  if (card.kind === 'choice' || card.choices?.length) {
    const wrongAnswers = card.choices?.filter((choice) => choice !== card.back) ?? [];
    return { kind: 'choice', values: [card.front, card.back, wrongAnswers[0] ?? '', wrongAnswers[1] ?? ''] };
  }

  // 단어 카드와 빈칸 카드는 만들 때 입력값을 합쳐 저장하므로 편집할 때 다시 펼친다.
  if (card.kind === 'word') {
    const separator = card.back.indexOf('\n\n');
    if (separator > 0 && card.back.slice(separator + 2).trim()) {
      return {
        kind: 'word',
        values: [card.front, card.back.slice(0, separator), card.back.slice(separator + 2)],
      };
    }
    return { kind: 'basic', labels: ['단어', '뜻과 예문'], values: [card.front, card.back] };
  }

  if (card.kind === 'cloze') {
    const parts = card.front.split('___');
    if (parts.length === 2) {
      const [prefix, suffix] = parts;
      const answer = card.back.slice(prefix.length, card.back.length - suffix.length);
      if (answer.trim() && card.back.startsWith(prefix) && card.back.endsWith(suffix)) {
        return { kind: 'cloze', values: [card.front, answer] };
      }
    }
    return { kind: 'basic', labels: ['문장', '답'], values: [card.front, card.back] };
  }

  return { kind: 'basic', values: [card.front, card.back] };
}

export function makeCardEdit(card: StudyCard, kind: CardKind, values: string[]): CardContent {
  if (kind === 'choice') {
    const [front, back, firstWrong, secondWrong] = values.map((value) => value.trim());
    const correctIndex = card.choices?.indexOf(card.back) ?? -1;
    const choices = [firstWrong, secondWrong];
    choices.splice(Math.max(0, correctIndex), 0, back);
    return { front, back, choices };
  }

  const { front, back } = makeDraft(kind, values);
  return { front, back };
}
