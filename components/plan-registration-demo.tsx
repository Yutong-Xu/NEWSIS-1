"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react';
import { courses, findCourse, type Course } from '@/lib/courses';
import { registrationCheck } from '@/lib/registration';
import { useLanguage } from './language';
import { Timetable } from './timetable';

// Isolated fixtures make the failure repeatable without changing the student's plans.
const shared = ['ECO3121', 'CSC3170', 'ENG2001A', 'GED2003'];
const planA = [...shared, 'CSC4130'].map(findCourse);
const planB = [...shared, 'DMS2030'].map(findCourse);
type Phase = 'ready' | 'registering-a' | 'failed' | 'registering-b' | 'done' | 'choosing-other' | 'registering-other' | 'done-other' | 'registering-priority' | 'done-priority';

export function PlanRegistrationDemo({children,onDetail,priorities}:{children:ReactNode;onDetail:(course:Course)=>void;priorities:string[]}) {
 const en=useLanguage()==='en';
 const tr=(zh:string,english:string)=>en?english:zh;
 const [open,setOpen]=useState(false),[phase,setPhase]=useState<Phase>('ready');
 const [otherCourse,setOtherCourse]=useState('CSC4310');
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const busy=phase==='registering-a'||phase==='registering-b'||phase==='registering-other'||phase==='registering-priority';
 const usingB=phase==='registering-b'||phase==='done';
 const usingOther=phase==='registering-other'||phase==='done-other';
 const usingPriority=phase==='registering-priority'||phase==='done-priority';
 const registeredFixture=shared.map(findCourse);
 const priorityCourse=priorities.map(id=>courses.find(c=>c.id===id)).find(c=>{
  if(!c||c.id==='CSC4130'||shared.includes(c.id)||c.seats<=0)return false;
  const check=registrationCheck([c],registeredFixture);
  return check.credits<=18&&!check.conflicts.length&&!check.ineligible.length;
 });
 const list=usingPriority&&priorityCourse?[...registeredFixture,priorityCourse]:usingOther?[...shared,otherCourse].map(findCourse):usingB?planB:planA;
 function reset(){if(timer.current)clearTimeout(timer.current);setPhase('ready')}
 function submit(target:'a'|'b'){
  if((target==='a'&&phase!=='ready')||(target==='b'&&phase!=='failed'))return;
  setPhase(target==='a'?'registering-a':'registering-b');
  timer.current=setTimeout(()=>setPhase(target==='a'?'failed':'done'),1000);
 }
 function submitOther(){
  if(phase!=='choosing-other')return;
  setPhase('registering-other');
  timer.current=setTimeout(()=>setPhase('done-other'),1000);
 }
 function submitPriority(){
  if(phase!=='failed'||!priorityCourse)return;
  setPhase('registering-priority');
  timer.current=setTimeout(()=>setPhase('done-priority'),1000);
 }
 return <>
  <section className="card plan-demo-toolbar">
   <div><strong>{tr('注册失败恢复演示','Registration recovery demo')}</strong><p>{tr('预设场景：Plan A 的 CSC4130 满额，可改用 Plan B、注册最高优先级可选课程，或自行选择其他课程。演示不会修改你的计划。','Preset scenario: CSC4130 fills up in Plan A. Use Plan B, register the highest-priority eligible course, or choose another course. Your saved plans stay unchanged.')}</p></div>
   <button className="btn" onClick={()=>{reset();setOpen(!open)}}>{open?tr('退出演示','Exit demo'):tr('开始演示','Start demo')}<ArrowRight size={15}/></button>
  </section>
  {!open?children:<div className="recovery-layout">
   <section className="card plan-demo-card">
    <div className="plan-demo-heading"><span className="tag">{tr('预设演示 · 非真实注册','Preset demo · No real registration')}</span><button className="text-button" onClick={reset}><RotateCcw size={14}/>{tr('重新演示','Replay demo')}</button></div>
    <h2>{usingPriority?tr('优先课程','Priority course'):usingOther?tr('其他课程','Other courses'):usingB?'Plan B':'Plan A'} · {tr('课程注册','Course registration')}</h2>
    <p>{tr('先注册 Plan A，若有课程失败，再选择恢复方案。','Register Plan A first. If a course fails, choose a recovery option.')}</p>
    <div className="plan-demo-steps" aria-label={tr('演示步骤','Demo steps')}>
     <span className="tag">1 · {tr('注册 Plan A','Register Plan A')}</span><ArrowRight size={14}/><span className="tag">2 · {tr('课程满额','Course full')}</span><ArrowRight size={14}/><span className="tag">3 · {tr('选择恢复方案','Choose a recovery option')}</span>
    </div>
    <ul className="plan-demo-courses" aria-live="polite">{list.map(c=>{
     const common=shared.includes(c.id);
     const registered=phase==='done'||phase==='done-other'||phase==='done-priority'||(common&&(['failed','choosing-other','registering-b','registering-other','registering-priority'] as Phase[]).includes(phase));
     const failed=c.id==='CSC4130'&&(phase==='failed'||phase==='choosing-other');
     return <li key={c.id}><div><b>{c.id}</b><span>{en?c.english:c.title}</span></div><span className={failed?'demo-failed':'demo-status'}>{registered?<><Check size={14}/>{usingB&&common?tr('保留已注册','Already registered'):tr('注册成功','Registered')}</>:failed?tr('失败 · 名额已满','Failed · Full'):busy?tr('注册中…','Registering…'):tr('待提交','Ready')}</span></li>
    })}</ul>
    {phase==='ready'&&<button className="btn primary" onClick={()=>submit('a')}>{tr('注册 Plan A','Register Plan A')}<ArrowRight size={15}/></button>}
    {busy&&<p role="status" className="plan-demo-loading"><LoaderCircle className="spin" size={17}/>{usingPriority?tr('正在注册最高优先级可选课程…','Registering the highest-priority eligible course…'):usingOther?tr('正在注册所选课程…','Registering the selected course…'):usingB?tr('正在注册 Plan B 的新增课程…','Registering the new course in Plan B…'):tr('正在注册 Plan A…','Registering Plan A…')}</p>}
    {phase==='failed'&&<section className="plan-demo-fallback">
     <div role="alert"><h3><TriangleAlert size={18}/>{tr('Plan A 未能全部注册','Plan A registration incomplete')}</h3><p>{tr('CSC4130 已满，另外 4 门课已注册成功。','CSC4130 is full. The other 4 courses registered successfully.')}</p></div>
     <h3>{tr('直接注册 Plan B','Register Plan B now')}</h3>
     <p>{tr('Plan B 用 DMS2030 替代 CSC4130。已成功注册的课程会保留，无需重新提交。','Plan B replaces CSC4130 with DMS2030. Successfully registered courses are kept and will not be submitted again.')}</p>
     <div className="plan-demo-steps"><span className="tag">CSC4130</span><ArrowRight size={14}/><span className="tag">DMS2030</span></div>
     <p>{tr('17 / 18 学分 · 无时间冲突 · 符合先修条件 · 12 个剩余名额','17 / 18 credits · No time conflicts · Prerequisites met · 12 seats available')}</p>
     <button className="btn primary" onClick={()=>submit('b')}>{tr('立即注册 Plan B','Register Plan B now')}<ArrowRight size={15}/></button>
     <div className="plan-demo-priority-option"><h3>{tr('注册最高优先级可选课程','Register the highest-priority eligible course')}</h3>{priorityCourse?<><p>{tr(`按 Plan A 的课程优先级，跳过已注册或不可用课程后，推荐 ${priorityCourse.id} · ${priorityCourse.title}。与已注册课程无冲突，合计 ${14+priorityCourse.credits} 学分。`,`Using Plan A's course priority, the first eligible unregistered course is ${priorityCourse.id} · ${priorityCourse.english}. It fits the registered schedule, for ${14+priorityCourse.credits} credits total.`)}</p><button className="btn" onClick={submitPriority}>{tr(`注册优先课程 ${priorityCourse.id}`,`Register priority course ${priorityCourse.id}`)}<ArrowRight size={15}/></button></>:<p>{tr('目前没有符合条件的未注册优先课程。','No eligible unregistered priority course is available.')}</p>}</div>
     <button className="btn" onClick={()=>setPhase('choosing-other')}>{tr('注册其他课程','Register other courses')}<ArrowRight size={15}/></button>
    </section>}
    {phase==='choosing-other'&&<section className="plan-demo-fallback"><h3>{tr('选择其他课程','Choose another course')}</h3><p>{tr('以下课程有余位、符合先修条件，且与已注册的 4 门课程没有时间冲突。','These courses have available seats, meet prerequisites, and do not conflict with the four registered courses.')}</p><label>{tr('要注册的课程','Course to register')}<select value={otherCourse} onChange={event=>setOtherCourse(event.target.value)}><option value="CSC4310">CSC4310 · {tr('交互媒体设计','Interactive Media Design')} · {findCourse('CSC4310').credits} {tr('学分','credits')}</option><option value="DDA2081">DDA2081 · {tr('数据分析导论','Introduction to Data Analytics')} · {findCourse('DDA2081').credits} {tr('学分','credits')}</option></select></label><div className="option-actions"><button className="btn primary" onClick={submitOther}>{tr('注册所选课程','Register selected course')}<ArrowRight size={15}/></button><button className="btn" onClick={()=>setPhase('failed')}>{tr('返回恢复方案','Back to recovery options')}</button></div></section>}
    {phase==='done'&&<div className="complete-result" role="status"><Check size={24}/><div><h3>{tr('Plan B 注册成功','Plan B registered successfully')}</h3><p>{tr('5 门课程 · 17 学分。4 门已注册课程已保留，DMS2030 新增注册成功。','5 courses · 17 credits. Kept 4 registered courses and successfully registered DMS2030.')}</p></div></div>}
    {phase==='done-priority'&&priorityCourse&&<div className="complete-result" role="status"><Check size={24}/><div><h3>{tr('优先课程注册成功','Priority course registered successfully')}</h3><p>{tr(`5 门课程 · ${14+priorityCourse.credits} 学分。原有 4 门课程已保留，${priorityCourse.id} 新增注册成功。`,`5 courses · ${14+priorityCourse.credits} credits. Kept the 4 registered courses and added ${priorityCourse.id}.`)}</p></div></div>}
    {phase==='done-other'&&<div className="complete-result" role="status"><Check size={24}/><div><h3>{tr('其他课程注册成功','Other course registered successfully')}</h3><p>{tr(`5 门课程 · ${14+findCourse(otherCourse).credits} 学分。原有 4 门课程已保留，${otherCourse} 新增注册成功。`,`5 courses · ${14+findCourse(otherCourse).credits} credits. Kept the 4 registered courses and added ${otherCourse}.`)}</p></div></div>}
   </section>
   <aside className="card recovery-timetable"><div className="section-head"><h2>{tr('课表预览','Schedule preview')} · {usingPriority?priorityCourse?.id:usingOther?otherCourse:usingB?'Plan B':'Plan A'}</h2><span className="tag">{list.reduce((sum,c)=>sum+c.credits,0)} / 18 {tr('学分','credits')}</span></div><Timetable list={list} onDetail={onDetail} compact blockClass={c=>c.id==='CSC4130'&&(phase==='failed'||phase==='choosing-other')?'failed-block':''}/></aside>
  </div>}
 </>;
}
