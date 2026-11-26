"use client";
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronRight, FileCheck2, ShieldCheck, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useLanguage } from './language';

type Copy = readonly [string, string];

const updates = [
  {
    id: 'CSC4130', subject: ['CSC4130', 'CSC4130'], title: ['授课教师已更新', 'Instructor updated'],
    previous: ['Prof. James Wang', 'Prof. James Wang'], current: ['Prof. Sidong Feng', 'Prof. Sidong Feng'],
    field: ['授课教师', 'Instructor'], ago: ['20 分钟前', '20 min ago'], icon: UserRound,
    note: ['CSC4130 的任课教师已更换。请在课程详情中确认最新授课信息。', 'The instructor for CSC4130 has changed. Check the course details for the latest teaching information.'],
  },
  {
    id: 'DDA2081', subject: ['DDA2081', 'DDA2081'], title: ['课程容量增加', 'Course capacity increased'],
    previous: ['40 个名额', '40 seats'], current: ['50 个名额', '50 seats'],
    field: ['课程容量', 'Course capacity'], ago: ['1 小时前', '1 hour ago'], icon: BookOpen,
    note: ['课程总容量增加了 10 个名额。实际可用余位以课程详情为准。', 'Total capacity increased by 10 seats. Check the course details for current availability.'],
  },
  {
    id: 'curriculum', subject: ['修读计划', 'Degree requirements'], title: ['2026 秋季修读计划已更新', 'Fall 2026 degree requirements updated'],
    previous: ['2025 版', '2025 version'], current: ['2026 版', '2026 version'],
    field: ['修读计划版本', 'Requirements version'], ago: ['2 小时前', '2 hours ago'], icon: FileCheck2,
    note: ['MAT3007、CSC5130 已加入 2026 版修读计划。这是培养要求的变化，不会自动将课程加入你的 Plan A 或 Plan B。', 'MAT3007 and CSC5130 were added to the 2026 degree requirements. This does not automatically add either course to your Plan A or Plan B.'],
    addedCourses: ['MAT3007', 'CSC5130'],
  },
  {
    id: 'ECO3121', subject: ['ECO3121', 'ECO3121'], title: ['预留名额调整', 'Reserved seats changed'],
    previous: ['10 个名额', '10 seats'], current: ['15 个名额', '15 seats'],
    field: ['预留名额', 'Reserved seats'], ago: ['3 小时前', '3 hours ago'], icon: ShieldCheck,
    note: ['预留名额增加了 5 个；是否可使用预留名额仍取决于注册时的资格检查。', 'Reserved seats increased by five. Access to them still depends on eligibility checks at registration.'],
  },
] as const;

export const updateCount = updates.length;

export function UpdateFeed({onViewPlan}:{onViewPlan:()=>void}) {
  const language = useLanguage();
  const index = language === 'en' ? 1 : 0;
  const copy = (value:Copy) => value[index];
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const selected = updates.find(update=>update.id===selectedId);

  return <section className="card updates-card">
    <div className="section-head"><h2>{language==='en'?'Important updates':'重要更新'} <span className="count-badge">{updateCount}</span></h2><span>{language==='en'?'Courses and degree requirements':'课程与修读计划动态'}</span></div>
    <div className="update-list">{updates.map(update=><button type="button" className="update-row update-row-button" key={update.id} onClick={()=>setSelectedId(update.id)} aria-label={`${language==='en'?'View details for':'查看详情：'} ${copy(update.subject)} ${copy(update.title)}`}>
      <span className="update-icon"><update.icon size={18}/></span>
      <span className="update-row-copy"><span className="update-row-title"><b>{copy(update.subject)}</b> {copy(update.title)}</span><span className="update-row-change"><s>{copy(update.previous)}</s><ArrowRight size={13}/><strong>{copy(update.current)}</strong></span></span>
      <small>{copy(update.ago)}</small><ChevronRight className="update-row-chevron" size={16} aria-hidden="true"/>
    </button>)}</div>
    <Button variant="text" className="update-footer" onClick={onViewPlan}>{language==='en'?'View my course plans':'查看我的选课计划'} <ArrowRight size={15}/></Button>

    <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelectedId(null)}}><DialogContent className="sm:max-w-lg">
      {selected&&<><DialogHeader><div className="eyebrow">{language==='en'?'FALL 2026 · INFORMATION UPDATE':'2026 秋季 · 信息更新'}</div><DialogTitle>{copy(selected.subject)} · {copy(selected.title)}</DialogTitle><DialogDescription>{copy(selected.ago)}</DialogDescription></DialogHeader>
        <div className="update-detail"><h3>{copy(selected.field)}</h3><div className="update-detail-diff"><span><small>{language==='en'?'Previous':'更新前'}</small><s>{copy(selected.previous)}</s></span><ArrowRight size={18} aria-hidden="true"/><span><small>{language==='en'?'Updated':'更新后'}</small><strong>{copy(selected.current)}</strong></span></div>
          {'addedCourses' in selected&&<div className="update-added"><h3>{language==='en'?'Courses added to the requirements':'新增至修读计划的课程'}</h3><ul>{selected.addedCourses.map(course=><li key={course}><span className="update-added-icon">+</span><strong>{course}</strong><span>{language==='en'?'Added to the 2026 requirements':'已加入 2026 版修读计划'}</span></li>)}</ul></div>}
          <p className="update-detail-note">{copy(selected.note)}</p>
        </div></>}
    </DialogContent></Dialog>
  </section>;
}
