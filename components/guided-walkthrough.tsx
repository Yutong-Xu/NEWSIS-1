"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useLanguage } from './language';

const storageKey='new-sis-walkthrough-v5';
const steps=[
 {target:'explore-nav',title:['先探索课程','Explore courses'],body:['点击左侧「探索课程」，从这里开始找课。','Click Explore courses in the sidebar to start finding a course.']},
 {target:'course-search',title:['搜索目标课程','Search for a course'],body:['点击搜索框，试着输入 CSC4130；点击屏幕其他位置也能继续。','Click the search box and try CSC4130. You can also click elsewhere to continue.']},
 {target:'course-detail',title:['查看课程详情','Check course details'],body:['点击 CSC4130 的「查看课程详情」，确认时间、学分、余位和先修要求。','Open CSC4130 details to review its time, credits, seats, and prerequisites.']},
 {target:'candidate-add',title:['先加入候选','Add to candidates'],body:['点击「加入候选课程」，先把这门课存进候选列表。','Click Add to Candidates to save this course to your candidate list.']},
 {target:'plan-nav',title:['打开选课计划','Open course plans'],body:['点击左侧「我的选课计划」，再决定把候选课程放进哪个计划。','Open My Course Plans to decide which plan should include the candidate.']},
 {target:'candidate-plan-add',title:['加入所选计划','Add to the chosen plan'],body:['选中 Plan A 或 Plan B，再点击候选课程的「加入计划」。','Select Plan A or Plan B, then click Add to Plan on the candidate.']},
 {target:'review-plan',title:['检查课表并验证','Review your schedule'],body:['查看课表中的课程、冲突和学分，再点击「注册前检查」。','Review your timetable, conflicts, and credits, then click Pre-registration check.']},
 {target:'continue-registration',title:['前往课程注册','Continue to registration'],body:['检查通过后点击「继续注册」。正式提交前仍可选择注册计划。','After the check passes, click Continue to registration. You can still choose a plan before submission.']},
] as const;

type Position={left:number;top:number;side:'top'|'bottom'};
export function GuidedWalkthrough({run,onNavigate,onAddExampleCandidate,onAddExampleToPlan,onShowCourse,onSearchExample}:{run:number;onNavigate:(page:string)=>void;onAddExampleCandidate:()=>void;onAddExampleToPlan:()=>void;onShowCourse:()=>void;onSearchExample:()=>void}) {
 const en=useLanguage()==='en',lang=en?1:0;
 const [active,setActive]=useState(false),[step,setStep]=useState(0);
 const [position,setPosition]=useState<Position|null>(null);
 const handledClick=useRef<Event|null>(null);
 useEffect(()=>{let seen=false;try{seen=localStorage.getItem(storageKey)==='done'}catch{}if(run>0||!seen){setStep(0);setActive(true)}},[run]);
 function finish(){setActive(false);setPosition(null);try{localStorage.setItem(storageKey,'done')}catch{}}
 const current=steps[step];
 useEffect(()=>{
  if(!active)return;
  const selector=current.target==='candidate-add'?'[data-slot="dialog-content"] [data-tour="candidate-add"]':`[data-tour="${current.target}"]`;
  let target:HTMLElement|null=null;
  let frame=0;
  function place(){
   const found=document.querySelector<HTMLElement>(selector);
   if(found!==target){target?.classList.remove('tour-highlight');target=found;target?.classList.add('tour-highlight');if(target)target.scrollIntoView({block:'nearest',behavior:'smooth'});}
   if(!target){setPosition(null);return}
   const rect=target.getBoundingClientRect();
   const width=Math.min(340,window.innerWidth-24);
   const left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
   const side=rect.bottom+190<window.innerHeight?'bottom':'top';
   const top=side==='bottom'?Math.min(rect.bottom+12,window.innerHeight-12):Math.max(12,rect.top-12);
   setPosition(old=>old?.left===left&&old.top===top&&old.side===side?old:{left,top,side});
  }
  function schedulePlace(){cancelAnimationFrame(frame);frame=requestAnimationFrame(place)}
  const observer=new MutationObserver(schedulePlace);
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',schedulePlace);window.addEventListener('scroll',schedulePlace,true);
  schedulePlace();
  function next(){if(step===steps.length-1)finish();else setStep(value=>value+1)}
  function advance(event:Event){
   const source=event.target;
   if(!(source instanceof Element)||source.closest('.tour-coachmark button'))return;
   const onTarget=!!source.closest(selector);
   if(event.type!=='click')return;
   if(handledClick.current===event)return;
   handledClick.current=event;
   if(step===5&&source.closest('.plan-tabs button'))return;
   if(onTarget){if(step===1)onSearchExample();if(step===3)window.setTimeout(()=>onNavigate('explorer'),0);next();return}
   event.preventDefault();event.stopPropagation();
   if(step===0)onNavigate('explorer');
   if(step===1){onNavigate('explorer');onSearchExample()}
   if(step===2)onShowCourse();
   if(step===3){onAddExampleCandidate();onNavigate('explorer')}
   if(step===4)onNavigate('plan');
   if(step===5){onNavigate('plan');onAddExampleToPlan()}
   if(step===6)onNavigate('review');
   if(step===7)onNavigate('registration');
   next();
  }
  document.addEventListener('click',advance,true);
  return ()=>{cancelAnimationFrame(frame);observer.disconnect();target?.classList.remove('tour-highlight');window.removeEventListener('resize',schedulePlace);window.removeEventListener('scroll',schedulePlace,true);document.removeEventListener('click',advance,true)};
 },[active,step,current,onNavigate,onAddExampleCandidate,onAddExampleToPlan,onShowCourse,onSearchExample]);
 if(!active)return null;
 return <div className="tour-coachmark" role="status" aria-live="polite" style={position?{left:position.left,top:position.top,transform:position.side==='top'?'translateY(-100%)':undefined}:{left:12,top:12}}>
  <div className="tour-coachmark-top"><span>{en?'GUIDED WALKTHROUGH':'选课分步引导'} · {step+1}/{steps.length}</span><button aria-label={en?'Close walkthrough':'关闭引导'} onClick={finish}><X size={18}/></button></div>
  <h2>{current.title[lang]}</h2><p>{current.body[lang]}</p>
  <div className="tour-coachmark-bottom"><span>{position?(en?'Click the control or anywhere to continue':'点击高亮控件或屏幕任意位置继续'):(en?'Click anywhere to continue':'点击屏幕继续')}</span><button onClick={finish}>{en?'Skip guide':'跳过引导'}<ArrowRight size={14}/></button></div>
 </div>;
}
