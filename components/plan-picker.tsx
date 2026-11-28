"use client";

import type { Course, Plan } from '@/lib/courses';
import { useLanguage } from './language';
import { Select } from './ui/select';

export function PlanPicker({course,plans,onAdd}:{course:Course;plans:Record<string,Plan>;onAdd:(target:string)=>void}){
 const en=useLanguage()==='en';
 const elig=(course as Course&{_eligibility?:{reasonZh:string;reasonEn:string}|null})._eligibility;
 const reason=en?(elig?.reasonEn??'Not eligible for this course'):(elig?.reasonZh??'暂不满足选课条件');
 return <span title={course.eligible?undefined:reason} className="plan-picker-wrap">
  <Select
  className="btn plan-picker"
  aria-label={en?`Add ${course.id} to a plan`:`将 ${course.id} 加入计划`}
  value=""
  disabled={!course.eligible}
  onChange={target=>{if(target)onAdd(target)}}
 >
  <option value="">{en?'Add to Plan…':'加入计划…'}</option>
  {Object.keys(plans).map(name=><option key={name} value={name}>{name}</option>)}
 </Select></span>;
}
