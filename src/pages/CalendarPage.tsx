import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { localDay, today } from '../study/review';
import type { ReviewLog } from '../types';

function CalendarCloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 48 34" fill="none" aria-hidden="true">
      <path
        d="M12 31C6 31 2 27 2 22s4-9 9-10C13 6 17 3 23 3c5 0 9 2 12 7 6 0 11 4 11 10s-5 11-11 11H12Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function CalendarPage({ logs }: { logs: ReviewLog[] }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const currentDay = today();
  const monthLabel = `${year}년 ${monthIndex + 1}월`;
  const counts = new Map<string, number>();
  for (const log of logs) {
    const date = new Date(log.date);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex) continue;
    const day = localDay(date);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  const days = Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => index + 1);
  const moveMonth = (offset: number) => setMonth(new Date(year, monthIndex + offset, 1));
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>학습 캘린더</h1>
        </div>
        <CalendarCloud className="calendar-heading-cloud" />
      </div>
      <section className="monthly-calendar" aria-label="월별 학습 기록">
        <div className="month-heading">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">
            <ArrowLeft size={18} />
          </button>
          <h2 aria-live="polite">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            disabled={localDay(month).slice(0, 7) >= currentDay.slice(0, 7)}
            aria-label="다음 달"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="month-grid">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <span className="month-weekday" key={day}>
              {day}
            </span>
          ))}
          {days.map((day) => {
            const date = localDay(new Date(year, monthIndex, day));
            const count = counts.get(date) ?? 0;
            return (
              <div
                key={day}
                className="month-day"
                style={day === 1 ? { gridColumnStart: month.getDay() + 1 } : undefined}
                aria-current={date === currentDay ? 'date' : undefined}
              >
                {count > 0 && <CalendarCloud className="month-cloud" />}
                <time
                  dateTime={date}
                  aria-label={`${monthLabel} ${day}일, ${count ? `복습 ${count}회` : '복습 기록 없음'}`}
                >
                  {day}
                </time>
              </div>
            );
          })}
        </div>
        <div className="month-footer">
          <p className="month-summary" aria-live="polite">
            {counts.size ? `복습한 날 ${counts.size}일` : '이 달에는 복습 기록이 없어요.'}
          </p>
          <span className="month-legend">
            <CalendarCloud className="month-legend-cloud" /> 복습한 날
          </span>
        </div>
      </section>
    </div>
  );
}
