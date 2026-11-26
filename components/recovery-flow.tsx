"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';
import { type Course, evaluateBackups, slot } from '@/lib/courses';
import { registrationBatch, registrationCheck, type RegistrationResults } from '@/lib/registration';
import { Timetable } from './timetable';
import { useLanguage } from './language';
import { Hint } from './hint';

type Props = {
 planName:string; plans:Record<string,Course[]>; backups:string[];
 results:RegistrationResults; registered:Course[];
 onCommit:(results:RegistrationResults,successful:Course[])=>void;
 onSelectPlan:(name:string)=>void; onReplace:(from:string,to:string)=>void;
 onDetail:(course:Course)=>void; onExplore:()=>void; onRegistered:()=>void; onEdit:()=>void;
};

export function RecoveryFlow({planName,plans,backups,results,registered,onCommit,onSelectPlan,onReplace,onDetail,onExplore,onRegistered,onEdit,planIdByName={}}:Props&{planIdByName?:Record<string,string>}){
 const en=useLanguage()==='en';
 const tr=(zh:string,english:string)=>en?english:zh;
 const [busy,setBusy]=useState('');
 const [simulateFull,setSimulateFull]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const lock=useRef(false);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const list=plans[planName]??[];
 const registeredIds=new Set(registered.map(c=>c.id));
 const failed=list.filter(c=>results[c.id]==='failed'||results[c.id]==='waitlist');
 const pending=list.filter(c=>!results[c.id]);
 const complete=list.length>0&&list.every(c=>registeredIds.has(c.id));
 const check=registrationCheck(list,registered);
 const firstFailed=failed[0];
 const backupCheck=firstFailed?evaluateBackups(firstFailed,backups.filter(id=>!registeredIds.has(id)),registered):null;
 const replacement=backupCheck?.pick?.course;
 const replacementCheck=replacement?registrationCheck([replacement],registered):null;
 const title=(c:Course)=>en?c.english:c.title;
 function blockers(target:Course[],forFallback=false):string[]{
  const c=registrationCheck(target,registered);const reasons:string[]=[];
  if(!target.length)reasons.push(tr('计划暂无课程。','This plan has no courses.'));
  if(c.credits>18)reasons.push(tr(`包含已注册课程后共 ${c.credits} 学分，超过 18 学分上限。`,`${c.credits} credits including registered courses exceeds the 18-credit limit.`));
  if(c.conflicts.length)reasons.push(tr('时间冲突：','Time conflict: ')+c.conflicts.map(pair=>pair.map(x=>x.id).join(' / ')).join('; '));
  if(c.ineligible.length)reasons.push(tr('未满足选课资格：','Eligibility not met: ')+c.ineligible.map(x=>x.id).join(', '));
  if(c.sectionChanges.length)reasons.push(tr('这些课程的班次与已注册班次不同，请先到加选 / 退选处理：','These sections differ from your registered sections. Use Add / Drop first: ')+c.sectionChanges.map(x=>x.id).join(', '));
  if(forFallback){
   const unavailable=c.additions.filter(x=>x.seats<=0||results[x.id]==='failed'||results[x.id]==='waitlist');
   if(unavailable.length)reasons.push(tr('仍不可注册：','Still unavailable: ')+unavailable.map(x=>x.id).join(', '));
  }
  return reasons;
 }
 const reasons=blockers(list);
 function submit(targetName:string,target:Course[],fallback=false,replaceFrom?:string){
  if(lock.current||blockers(target,fallback).length)return;
  const newCourses=target.filter(c=>!results[c.id]);
  if(!newCourses.length)return;
  lock.current=true;setBusy(targetName);
  const simulated=simulateFull&&!fallback?'CSC4130':'';
  timer.current=setTimeout(()=>{
   void (async()=>{
   let batch:{results:RegistrationResults;successful:Course[]};
   try{
    const res=await fetch('/api/registration',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({planId:planIdByName[targetName]??'',confirm:true})});
    const data=await res.json();
    if(res.ok&&data.items){
     batch={results:{},successful:[]};
     for(const item of data.items){
      batch.results[item.courseId]=item.status==='registered'?'registered':item.status==='waitlist'?'waitlist':'failed';
      const found=target.find(x=>x.id===item.courseId);
      if(item.status==='registered'&&found)batch.successful.push(found);
     }
     for(const c of newCourses)if(!(c.id in batch.results))batch.results[c.id]='failed';
    }else{
     batch=registrationBatch(newCourses,registered,simulated);
    }
   }catch{
    batch=registrationBatch(newCourses,registered,simulated);
   }
   onCommit(batch.results,batch.successful);
   if(replaceFrom&&batch.successful.length)onReplace(replaceFrom,batch.successful[0].id);
   if(targetName!==planName)onSelectPlan(targetName);
   setSimulateFull(false);setBusy('');lock.current=false;
   })();
  },1200);
 }
 return <div className="recovery-layout">
  <div className="recovery-main">
   <section className="card enroll-card" aria-labelledby="enroll-title">
    <div className="enroll-head"><div className="eyebrow">{tr('课程注册 · 本次演示会话','COURSE REGISTRATION · DEMO SESSION')}</div><label className="registration-plan-label">{tr('注册计划','Registration plan')}<select aria-label={tr('注册计划','Registration plan')} value={planName} disabled={!!busy} onChange={e=>{onSelectPlan(e.target.value);setSimulateFull(false)}}>{Object.keys(plans).map(name=><option key={name}>{name}</option>)}</select></label></div>
    <div className="enroll-course"><div><span className="tag">{planName}</span><h2 id="enroll-title">{tr(`${planName} · ${list.length} 门课程`,`${planName} · ${list.length} courses`)}</h2><p>{tr(`${list.filter(c=>registeredIds.has(c.id)).length} 门已注册 · ${pending.length} 门待提交`,`${list.filter(c=>registeredIds.has(c.id)).length} registered · ${pending.length} ready to submit`)}</p></div>
     <button className="btn primary enroll-btn" disabled={!!busy||!!reasons.length||!pending.length} aria-busy={!!busy} onClick={()=>submit(planName,list)}>{busy?<><LoaderCircle size={15} className="spin"/>{tr('注册中…','Registering…')}</>:complete?<><Check size={15}/>{tr('已注册','Registered')}</>:<>{tr(`注册 ${planName}`,`Register ${planName}`)}<ArrowRight size={15}/></>}</button>
    </div>
    {!busy&&pending.some(c=>c.id==='CSC4130')&&<label className="registration-simulation"><input type="checkbox" checked={simulateFull} onChange={e=>setSimulateFull(e.target.checked)}/>{tr('模拟 CSC4130 在提交时满额（用于测试备用计划）','Simulate CSC4130 filling up on submission (test your backup plan)')}</label>}
    {!!reasons.length&&<div className="failure-result" role="alert"><TriangleAlert size={22}/><div><h3>{tr('请先调整计划','Update your plan first')}</h3>{reasons.map(reason=><p key={reason}>{reason}</p>)}<button className="btn" onClick={onEdit}>{tr('编辑计划','Edit plan')}</button></div></div>}
    {busy&&<div className="submit-progress" role="status" aria-label={tr('正在提交注册','Submitting registration')}><span/></div>}
    <ol className="enroll-rows" aria-live="polite">{list.map((c,i)=>{
     const status=results[c.id];const running=!!busy&&!status;
     return <li key={c.id} className={`enroll-row ${status==='registered'?'ok':status==='failed'?'fail':'pending'}`}><span className="step-icon">{status==='registered'?<Check size={13}/>:status==='failed'?<CircleX size={13}/>:running?<LoaderCircle className="spin" size={13}/>:i+1}</span><div className="enroll-row-main"><button className="text-button course-link" onClick={()=>onDetail(c)}><b>{c.id}</b></button><span>{title(c)}</span></div><span className="enroll-row-status">{status==='registered'?tr('已注册 · 保留','Registered · Kept'):status==='failed'?tr('失败 · 名额已满','Failed · Full'):status==='waitlist'?tr('候补中','Waitlisted'):running?tr('注册中…','Registering…'):tr('待提交','Ready')}</span></li>
    })}</ol>
    {!!failed.length&&<div className="failure-result" role="alert"><CircleX size={24}/><div><h3>{tr('部分课程未注册成功','Some courses were not registered')}</h3><p>{failed.map(c=>c.id).join(', ')} · {tr('无可用名额。已注册课程保留，无需重复提交。','No seats available. Registered courses are kept; do not resubmit them.')}</p></div></div>}
    {complete&&<div className="complete-result" role="status"><Check size={24}/><div><h3>{tr(`${planName} 注册完成`,`${planName} registration complete`)}</h3><p>{tr(`本计划 ${list.length} 门课程已注册。`, `All ${list.length} courses in this plan are registered.`)}</p></div></div>}
    {!!registered.length&&<div className="registration-footer"><p>{tr(`本次会话共注册 ${registered.length} 门课程、${registered.reduce((n,c)=>n+c.credits,0)} 学分。`,`${registered.length} courses and ${registered.reduce((n,c)=>n+c.credits,0)} credits registered this session.`)}</p><button className="btn" onClick={onRegistered}>{tr('查看已注册课程','View registered courses')}<ArrowRight size={15}/></button></div>}
   </section>
   {!!failed.length&&<section className="card adaptive-panel"><div className="adaptive-head"><h2>{tr('选择下一步','Choose your next step')}</h2><p>{tr('直接注册已编辑的备用计划，或为失败课程选择备选。不会自动退选任何已注册课程。','Register an edited backup plan or replace a failed course. No registered course is dropped automatically.')}</p></div>
    <div className="option-list">{Object.entries(plans).filter(([name])=>name!==planName).map(([name,target])=>{
     const c=registrationCheck(target,registered);const problems=blockers(target,true);
     const retainedOutside=registered.filter(r=>!target.some(t=>t.id===r.id));
     const additions=c.additions;
     return <article className="recovery-option featured" key={name}><div className="option-body"><h3>{name}</h3><p>{tr('新增：','Add: ')}{additions.map(c=>c.id).join(', ')||tr('无','None')}</p><p>{tr('保留已注册：','Keep registered: ')}{registered.map(c=>c.id).join(', ')||tr('无','None')}</p>{!!retainedOutside.length&&<p>{tr('不在此计划中的已注册课程仍会保留：','Registered courses outside this plan are also kept: ')}{retainedOutside.map(c=>c.id).join(', ')}</p>}<p>{tr(`合计 ${c.credits} / 18 学分`,`${c.credits} / 18 total credits`)}</p>
      {problems.length?<div className="conflict-hint">{problems.map(p=><p key={p}>{p}</p>)}</div>:<p className="counts-inline"><Check size={14}/>{tr('时间、选课资格与余位检查通过','Time, eligibility and seat checks passed')}</p>}
      <div className="option-actions"><button className="btn primary" disabled={!!busy||!!problems.length||!additions.length} onClick={()=>submit(name,target,true)}>{tr(`立即注册 ${name}`,`Register ${name} now`)}<ArrowRight size={15}/></button><button className="btn" disabled={!!busy} onClick={()=>{onSelectPlan(name);onEdit()}}>{tr('编辑此计划','Edit this plan')}</button></div>{!additions.length&&<p>{tr('此计划的课程均已注册，无需再次提交。','All courses in this plan are already registered.')}</p>}
     </div></article>
    })}
    <article className="recovery-option"><div className="option-body"><h3>{tr('自行选择其他课程','Choose another course')}</h3><p>{tr('前往探索课程，选择符合条件且有余位的课程。已成功注册的课程会保留。','Explore eligible courses with available seats. Your successful registrations will be kept.')}</p><button className="btn" disabled={!!busy} onClick={onExplore}>{tr('注册其他课程','Register other courses')}<ArrowRight size={15}/></button></div></article>
    {firstFailed&&<article className="recovery-option"><div className="option-body"><h3>{firstFailed.id} · {tr('候补','Waitlist')}<Hint text={tr('候补不是注册成功，有空位时才可能递补。本演示不保证候补成功。','Waitlisting is not registration. A seat may become available; this demo does not guarantee one.')}/></h3><p>{tr('等待该课程释放名额，其他已注册课程不受影响。','Wait for a seat in this course; other registered courses are unaffected.')}</p><button className="btn" disabled={!!busy||results[firstFailed.id]==='waitlist'} onClick={()=>onCommit({[firstFailed.id]:'waitlist'},[])}>{results[firstFailed.id]==='waitlist'?tr('已加入候补','Waitlisted'):tr('加入候补','Join waitlist')}</button></div></article>}
    {firstFailed&&<article className="recovery-option"><div className="option-body"><h3>{tr('推荐备选课程','Recommended backup course')}</h3>{replacement?<><p>{replacement.id} · {title(replacement)} · {slot(replacement,en)}</p><p>{tr('按备选优先级推荐；符合相同培养类别，与已注册课程无时间冲突。','Recommended by backup priority; matches the requirement category and does not conflict with registered courses.')}</p><button className="btn" disabled={!!busy||!replacementCheck||replacementCheck.credits>18||!!results[replacement.id]} onClick={()=>submit(planName,[replacement],true,firstFailed.id)}>{tr(`替换并注册 ${replacement.id}`,`Replace and register ${replacement.id}`)}</button>{replacementCheck&&replacementCheck.credits>18&&<p className="conflict-hint">{tr('加入后超过 18 学分上限。','This would exceed 18 credits.')}</p>}</>:<p>{tr('没有符合条件的备选课程。','No eligible backup course is available.')}</p>}<button className="text-button" disabled={!!busy} onClick={onExplore}>{tr('探索其他课程','Explore other courses')}<ArrowRight size={15}/></button></div></article>}
    </div>
   </section>}
  </div>
  <aside className="recovery-side"><section className="card recovery-timetable"><div className="section-head"><h2>{tr('计划课表','Plan preview')} <span className="tag">{planName}</span></h2><span className="tag">{list.reduce((n,c)=>n+c.credits,0)} {tr('学分','credits')}</span></div><Timetable list={list} onDetail={onDetail} compact blockClass={c=>results[c.id]==='failed'?'failed-block':''}/><p className="registration-footnote">{tr('此处显示计划；实际已注册课程请到「加选 / 退选」查看。','This shows your plan. View actual registered courses in Add / Drop.')}</p></section></aside>
 </div>;
}
