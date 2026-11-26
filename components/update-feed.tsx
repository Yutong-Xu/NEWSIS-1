"use client";
import { Button } from '@/components/ui/button';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ChevronRight, FileCheck2, ShieldCheck, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useLanguage } from './language';

interface ApiNotification {
  id: string;
  courseId: string | null;
  kind: string;
  bodyZh: string;
  bodyEn: string;
  createdAt: string;
  read: boolean;
}

const kindIcon = (kind: string) =>
  kind === 'requirement_change' ? FileCheck2 : kind === 'seat_change' ? ShieldCheck : kind === 'instructor_change' ? UserRound : BookOpen;

const kindLabel = (kind: string, en: boolean) =>
  kind === 'requirement_change' ? (en ? 'Degree requirements' : '修读计划')
  : kind === 'seat_change' ? (en ? 'Seat change' : '名额调整')
  : kind === 'instructor_change' ? (en ? 'Instructor change' : '教师变更')
  : (en ? 'Course update' : '课程更新');

function ago(createdAt: string, en: boolean): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (mins < 60) return en ? `${mins} min ago` : `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return en ? `${hours} hours ago` : `${hours} 小时前`;
  const days = Math.round(hours / 24);
  return en ? `${days} days ago` : `${days} 天前`;
}

export function UpdateFeed({onViewPlan}:{onViewPlan:()=>void}) {
  const language = useLanguage();
  const en = language === 'en';
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const selected = items.find(n => n.id === selectedId);

  useEffect(() => {
    import('@/lib/content').then(m => setItems(m.NOTIFICATIONS));
  }, []);

  return <section className="card updates-card">
    <div className="section-head"><h2>{en?'Important updates':'重要更新'} <span className="count-badge">{items.length}</span></h2><span>{en?'Courses and degree requirements':'课程与修读计划动态'}</span></div>
    <div className="update-list">{items.map(n=>{
      const Icon = kindIcon(n.kind);
      const body = en ? n.bodyEn : n.bodyZh;
      // title line: first sentence up to the first punctuation, rest goes to detail
      const split = body.indexOf('。') > -1 ? body.indexOf('。') : body.indexOf('. ');
      const title = split > 0 ? body.slice(0, split) : body;
      return <Button variant="bare" type="button" key={n.id} onClick={()=>setSelectedId(n.id)} aria-label={`${en?'View details for':'查看详情：'} ${title}`} className="update-row update-row-button">
        <span className="update-icon"><Icon size={18}/></span>
        <span className="update-row-copy"><span className="update-row-title"><b>{n.courseId ?? kindLabel(n.kind, en)}</b> {title}</span></span>
        <small>{ago(n.createdAt, en)}</small><ChevronRight className="update-row-chevron" size={16} aria-hidden="true"/>
      </Button>;
    })}</div>
    {!items.length && <p className="update-empty">{en?'No updates yet.':'暂无更新。'}</p>}
    <Button variant="text" className="update-footer" onClick={onViewPlan}>{en?'View my course plans':'查看我的选课计划'} <ArrowRight size={15}/></Button>

    <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelectedId(null)}}><DialogContent className="sm:max-w-lg">
      {selected&&<><DialogHeader><div className="eyebrow">{en?'FALL 2026 · INFORMATION UPDATE':'2026 秋季 · 信息更新'}</div><DialogTitle>{selected.courseId ?? kindLabel(selected.kind, en)}</DialogTitle><DialogDescription>{ago(selected.createdAt, en)}</DialogDescription></DialogHeader>
        <div className="update-detail"><h3>{kindLabel(selected.kind, en)}</h3>
          <p className="update-detail-note">{en ? selected.bodyEn : selected.bodyZh}</p>
        </div></>}
    </DialogContent></Dialog>
  </section>;
}
