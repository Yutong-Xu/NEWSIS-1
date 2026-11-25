"use client";
import { Course, conflicts, dayNames, slot, time } from '@/lib/courses';
import { Check, Clock3, TriangleAlert } from 'lucide-react';
import { Localized, useLanguage } from './language';

type Props = { list: Course[]; conflictIds?: string[]; fullId?: string; onDetail: (c: Course) => void; compact?: boolean; blockClass?: (c: Course) => string; };

export function Timetable({ list, conflictIds = [], fullId, onDetail, compact = false, blockClass }: Props) {
  const en = useLanguage() === 'en';
  const height = compact ? 40 : 58;
  const pairs = conflicts(list);
  const conflictSet = new Set([...conflictIds, ...pairs.flatMap(pair => pair.map(c => c.id))]);
  return (
    <Localized>
      <div className={`timetable ${compact ? 'compact' : ''}`}>
        <div className="schedule-conflict-summary" role="status" aria-atomic="true">
          {pairs.map(([a,b]) => <p key={`${a.id}-${b.id}`}><TriangleAlert size={16} aria-hidden="true" />{en ? `Time conflict: ${a.id} and ${b.id}. Open course details or use the course list below to adjust your plan.` : `时间冲突：${a.id} 与 ${b.id}。可打开课程详情或使用下方课程列表调整计划。`}</p>)}
        </div>
        <div className="week-heading"><span><Clock3 size={14} /></span>{dayNames.map((d, i) => <div key={d}><b>{d}</b><span>{14 + i}</span></div>)}</div>
        <div className="week-body" style={{ height: height * 9 }}>
          <div className="time-axis">{Array.from({ length: 9 }, (_, i) => <span style={{ height }} key={i}>{9 + i}:00</span>)}</div>
          {dayNames.map((d, day) => (
            <div className="day-column" key={d} style={{ backgroundSize: `100% ${height}px` }}>
              {list.filter(c => c.days.includes(day)).map((c, i) => {
                const overlap = conflictSet.has(c.id);
                return (
                  <button key={c.id} onClick={() => onDetail(c)} aria-label={`${en ? 'View course details' : '查看课程详情'}: ${c.id}, ${en ? c.english : c.title}, ${slot(c,en)}${overlap ? (en ? ', Time conflict' : '，时间冲突') : ''}${fullId === c.id ? (en ? ', Full' : '，已满') : ''}`} className={`course-block ${c.tone} ${overlap ? 'conflicting' : ''} ${fullId === c.id ? 'unavailable' : ''} ${blockClass?.(c) ?? ''}`} style={{ top: (c.start - 9) * height, height: (c.end - c.start) * height - 3, left: overlap && i % 2 ? '28%' : 4, right: 4, zIndex: overlap ? i + 1 : 1 }}>
                    <strong>{c.id}{fullId === c.id ? (en ? ' · Full' : ' · 已满') : ''}</strong>
                    {(overlap) && <span className="block-conflict-label"><TriangleAlert size={14} aria-hidden="true" />{en ? 'Conflict' : '时间冲突'}</span>}
                    <span>{c.title}</span><small>{time(c.start)}–{time(c.end)}</small>
                    {!compact && <small>{c.section ?? (c.id === 'DDA2081' && c.start === 16 ? 'Section B' : 'Section 01')}</small>}
                  </button>
                );
              })}

            </div>
          ))}
        </div>
        {!compact && <details className="schedule-readable-list" open={pairs.length > 0}>
          <summary>{en ? 'Course list — full times and conflict status' : '课程列表 — 完整时间与冲突状态'}</summary>
          <ul>{list.map(c => <li key={c.id}>
            <button className="course-list-detail" onClick={() => onDetail(c)}>
              <strong>{c.id} · {en ? c.english : c.title}</strong><span>{slot(c,en)}</span>
              <span className={`course-list-status ${conflictSet.has(c.id)||fullId===c.id?'warning':'clear'}`}>{fullId===c.id?<><TriangleAlert size={16} aria-hidden="true"/>{en?'Full':'已满'}{conflictSet.has(c.id)?(en?' · Time conflict':' · 时间冲突'):''}</>:conflictSet.has(c.id)?<><TriangleAlert size={16} aria-hidden="true"/>{en?'Time conflict':'时间冲突'}</>:<><Check size={16} aria-hidden="true"/>{en?'No time conflict':'无时间冲突'}</>}</span>
            </button>
          </li>)}</ul>
        </details>}
        {!compact && <div className="timetable-caption"><Check size={15} aria-hidden="true" />{en ? 'Click Add to Plan to schedule a course at its official time. Conflicts are checked before adding.' : '点击「加入计划」即可按官方时间排课，加入前会检查时间冲突。'}</div>}
      </div>
    </Localized>
  );
}
