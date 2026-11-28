export type Course = { id: string; title: string; english: string; instructor: string; days: number[]; start: number; end: number; seats: number; capacity: number; quota: number; wait: number; category: string; workload: string; demand: string; tone: string; eligible: boolean; credits: number; program?: boolean; target?: string; rating?: number; reviews?: number; section?: string };
const T = 15 + 1 / 3;
export const courses: Course[] = [
 {id:'CSC4130',title:'人机交互',english:'Human-Computer Interaction',instructor:'Prof. Sidong Feng',days:[1,3],start:14,end:T,seats:18,capacity:60,quota:5,wait:3,category:'专业选修',workload:'中等',demand:'高',tone:'teal',eligible:true,credits:4,target:'CSE 大三–大四',rating:4.6,reviews:28},
 {id:'DDA2081',title:'数据分析导论',english:'Introduction to Data Analytics',instructor:'Prof. Wei Zhang',days:[1,3],start:14,end:15.25,seats:4,capacity:50,quota:10,wait:6,category:'专业必修',workload:'较高',demand:'高',tone:'blue',eligible:true,credits:3,rating:4.2,reviews:41},
 {id:'ECO3121',title:'行为经济学',english:'Behavioral Economics',instructor:'Prof. Sarah Chen',days:[0,2],start:10,end:11.25,seats:18,capacity:80,quota:15,wait:0,category:'自由选修',workload:'中等',demand:'中',tone:'sand',eligible:true,credits:4,rating:4.4,reviews:52},
 {id:'MAT3007',title:'数学专题（演示）',english:'Topics in Mathematics (Demo)',instructor:'Dr. Min Li',days:[0,2],start:10,end:11.25,seats:16,capacity:45,quota:0,wait:0,category:'专业选修',workload:'中等',demand:'中',tone:'sand',eligible:true,credits:3,rating:4.2,reviews:12},
 {id:'CSC3170',title:'数据库系统',english:'Database Systems',instructor:'Prof. Lin Huang',days:[0,2],start:14,end:T,seats:9,capacity:60,quota:0,wait:0,category:'专业必修',workload:'较高',demand:'中',tone:'blue',eligible:true,credits:4,rating:4.3,reviews:37},
 {id:'ENG2001A',title:'学术英语',english:'English for Academic Purposes',instructor:'Dr. Emily Wong',days:[0,2],start:12,end:13.25,seats:8,capacity:30,quota:0,wait:0,category:'通识教育',workload:'较低',demand:'中',tone:'blue',eligible:true,credits:3,rating:4.1,reviews:19},
 {id:'DMS2030',title:'供应链管理',english:'Supply Chain Management',instructor:'Prof. Kevin Zhou',days:[1,3],start:14,end:15.25,seats:12,capacity:45,quota:0,wait:0,category:'专业选修',workload:'中等',demand:'低',tone:'teal',eligible:true,credits:3,rating:3.9,reviews:22},
 {id:'GED2003',title:'可持续发展与社会',english:'Sustainability and Society',instructor:'Dr. Alex Li',days:[4],start:10,end:12.5,seats:24,capacity:60,quota:0,wait:0,category:'通识教育',workload:'较低',demand:'低',tone:'sand',eligible:true,credits:3,rating:4.0,reviews:31},
 {id:'CSC4210',title:'交互系统设计',english:'Design of Interactive Systems',instructor:'Prof. Mei Tan',days:[1,3],start:14,end:T,seats:7,capacity:50,quota:0,wait:0,category:'专业选修',workload:'中等',demand:'中',tone:'teal',eligible:true,credits:4,target:'CSE 大三–大四',rating:4.4,reviews:17},
 {id:'CSC4040',title:'可用性工程',english:'Usability Engineering',instructor:'Prof. Jun Ho',days:[1,3],start:14,end:T,seats:0,capacity:45,quota:0,wait:8,category:'专业选修',workload:'中等',demand:'高',tone:'blue',eligible:true,credits:4,target:'CSE 大三–大四',rating:4.5,reviews:24},
 {id:'CSC4310',title:'交互媒体设计',english:'Interactive Media Design',instructor:'Prof. Ana Ruiz',days:[1,3],start:15.5,end:16+5/6,seats:9,capacity:40,quota:0,wait:0,category:'专业选修',workload:'中等',demand:'中',tone:'sand',eligible:true,credits:4,target:'CSE 大三–大四',rating:4.3,reviews:15},
 {id:'CSC4100',title:'机器学习',english:'Machine Learning',instructor:'Prof. David Wu',days:[2,4],start:16,end:17.25,seats:0,capacity:50,quota:10,wait:12,category:'专业选修',workload:'较高',demand:'高',tone:'blue',eligible:false,credits:3,rating:4.7,reviews:63}
];
export type Plan = { ids: string[]; alternate: boolean; priorities: string[]; saved: boolean; overrides?: Record<string, Partial<Course>> };
export const dayNames = ['周一','周二','周三','周四','周五'];
export const dayNamesEn = ['Mon','Tue','Wed','Thu','Fri'];
export const time = (n:number) => `${Math.floor(n).toString().padStart(2,'0')}:${Math.round(n%1*60).toString().padStart(2,'0')}`;
export const slot = (c:Course, en=false) => `${c.days.map(d=>(en?dayNamesEn:dayNames)[d]).join(' / ')} ${time(c.start)}–${time(c.end)}`;
export const findCourse = (id:string) => courses.find(c=>c.id===id)!;
export const enrolled = (c:Course) => c.capacity - c.seats;
export function plannedCourses(plan:Plan) { return plan.ids.map(id=>courses.find(c=>c.id===id)!).map(c=>c.id==='DDA2081'&&plan.alternate?{...c,days:[2],start:16,end:17.25,seats:12}:c).map(c=>({...c,...plan.overrides?.[c.id]})); }
type Meetingish={dayOfWeek:number;startMin:number;endMin:number};
export const meetingsOf=(c:Course):Meetingish[]=>{
  const secs=(c as Course&{_sections?:Array<{kind:string;sectionCode:string;meetings:Meetingish[]}>|undefined;_tut?:{meetings:Meetingish[]}|undefined})._sections;
  if(!secs)return [];
  const out:Meetingish[]=[];
  // a projected course carries exactly the chosen LEC(+TUT); a raw catalog course
  // carries every section — for conflict purposes assume the PRIMARY lecture only,
  // since tutorial choice happens after adding (and may change conflicts).
  const lecs=secs.filter(s=>s.kind==='LEC');
  const primary=lecs[0];
  if(primary)for(const m of primary.meetings)out.push(m);
  const tut=(c as Course&{_tut?:{meetings:Meetingish[]}})._tut;
  if(tut)for(const m of tut.meetings)out.push(m);
  return out;
};
/** Per-meeting overlap when both courses expose meetings (LEC+TUT accurate);
 * falls back to the day-window check for legacy projections. */
export const overlaps=(a:Course,b:Course)=>{
  if(a.id===b.id)return false;
  const ma=meetingsOf(a),mb=meetingsOf(b);
  if(ma.length&&mb.length)return ma.some(x=>mb.some(y=>x.dayOfWeek===y.dayOfWeek&&x.startMin<y.endMin&&y.startMin<x.endMin));
  return a.days.some(d=>b.days.includes(d))&&a.start<b.end&&b.start<a.end;
};
export function conflicts(list:Course[]) {return list.flatMap((a,i)=>list.slice(i+1).filter(b=>overlaps(a,b)).map(b=>[a,b]));}
export const conflictWith = (list:Course[], c:Course) => list.find(o=>overlaps(o,c));
export function backupFor(plan:Plan, affected:string) {const remaining=plannedCourses(plan).filter(c=>c.id!==affected);return plan.priorities.map(id=>courses.find(c=>c.id===id)!).find(c=>!plan.ids.includes(c.id)&&c.eligible&&c.seats>0&&!conflicts([...remaining,c]).length);}
export type BackupCheck = { course: Course; ok: boolean; reason: 'full'|'prereq'|'program'|'requirement'|'conflict'|'ok'; sameSlot: boolean };
export function evaluateBackups(primary:Course, ranked:string[], rest:Course[]) {
 const checks:BackupCheck[] = ranked.map(findCourse).map(c=>{
  const sameSlot = c.start===primary.start&&c.end===primary.end&&c.days.join()===primary.days.join();
  const reason:BackupCheck['reason'] = c.seats<=0?'full':!c.eligible?'prereq':c.program===false?'program':c.category!==primary.category?'requirement':conflictWith(rest,c)?'conflict':'ok';
  return { course:c, ok:reason==='ok', reason, sameSlot };
 });
 return { checks, pick: checks.find(c=>c.ok) };
}
export function metrics(plan:Plan) {const cs=plannedCourses(plan);return {credits:cs.reduce((n,c)=>n+c.credits,0),conflicts:conflicts(cs).length,preferred:cs.filter(c=>['CSC4130','DDA2081','ECO3121'].includes(c.id)).length,early:cs.filter(c=>c.start<10).length,free:5-new Set(cs.flatMap(c=>c.days)).size,work:cs.reduce((n,c)=>n+(c.workload==='较高'?8:c.workload==='中等'?6:4),0)};}
