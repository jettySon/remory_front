import { ArrowLeft } from 'lucide-react';
import { SectionHeading } from '../components/SectionHeading';
import { localDay } from '../study/review';
import type { ReviewLog, StudyCard } from '../types';

export function StatsPage({
  logs,
  cards,
  back,
}: {
  logs: ReviewLog[];
  cards: StudyCard[];
  back: () => void;
}) {
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      d: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()],
      n: logs.filter((l) => localDay(l.date) === localDay(d)).length,
    };
  });
  const max = Math.max(...week.map((x) => x.n), 1);
  return (
    <div className="page stats-page">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={19} /> 홈으로
      </button>
      <h1>학습 통계</h1>
      <div className="stat-grid">
        <div className="stat-block lavender">
          <span>전체 카드</span>
          <strong>
            {cards.length}
            <small>장</small>
          </strong>
        </div>
        <div className="stat-block peach">
          <span>누적 복습</span>
          <strong>
            {logs.length}
            <small>회</small>
          </strong>
        </div>
      </div>
      <div className="chart-panel">
        <SectionHeading title="최근 7일 복습 횟수" />
        <div className="bar-chart">
          {week.map((x, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-container">
                <div className="bar" style={{ height: `${Math.max(7, (x.n / max) * 100)}%` }} />
              </div>
              <span>{x.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
