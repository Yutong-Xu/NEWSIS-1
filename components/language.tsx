"use client";
import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { courses } from '@/lib/courses';
import { english } from '@/lib/translations';
import { Select } from './ui/select';
type Language = 'zh' | 'en';
const LanguageContext = createContext<{language:Language;setLanguage:(value:Language)=>void}>({language:'zh',setLanguage:()=>{}});
const extra: Record<string,string> = {'学业进度':'Degree Progress','学业咨询':'Advising','设置':'Settings','查看课程详情':'View Course Details','选课窗口':'Registration window','学分上限':'Credit limit','年级 / 专业':'Year / Major','加入计划':'Add to Plan','香港中文大学（深圳）校徽':'CUHK-Shenzhen crest'};
const dictionary = {...english, ...extra, ...Object.fromEntries(courses.map(c=>[c.title,c.english]))};
const phrases = Object.keys(dictionary).sort((a,b)=>b.length-a.length);
const pattern = new RegExp(phrases.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
function translate(text:string){return dictionary[text] ?? text.replace(pattern, match=>dictionary[match]);}
export function LanguageProvider({children}:{children:ReactNode}){
 // persisted per browser: the interface language is user preference, independent of persona state
 const [language,setLanguage]=useState<Language>(()=>{
  try{return localStorage.getItem('newsis:v1:lang')==='en'?'en':'zh'}catch{return 'zh'}
 });
 useEffect(()=>{
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.title=language==='zh'?'New SIS · 课程注册':'New SIS · Course Registration';
  try{localStorage.setItem('newsis:v1:lang',language)}catch{}
 },[language]);
 return <LanguageContext.Provider value={{language,setLanguage}}>{children}</LanguageContext.Provider>;
}
export function useLanguage(){return useContext(LanguageContext).language}
export function LanguageSelect(){const {language,setLanguage}=useContext(LanguageContext);return <Select className="language-select" aria-label={language==='zh'?'界面语言':'Interface language'} value={language} onChange={v=>setLanguage(v as Language)}><option value="zh">中文</option><option value="en">English</option></Select>}
// Translate presentation only; keep selection values and application state language-independent.
// Both languages run through the same Children.map pass so element keys stay identical and switching never remounts stateful components.
function localize(node:ReactNode,tr:(s:string)=>string):ReactNode{
 return Children.map(node,child=>{
  if(typeof child==='string')return tr(child);
  if(!isValidElement<Record<string,unknown>>(child))return child;
  const props:Record<string,unknown>={};
  for(const key of ['aria-label','title','placeholder','alt'])if(typeof child.props[key]==='string')props[key]=tr(child.props[key] as string);
  if(child.type==='option'&&child.props.value===undefined&&typeof child.props.children==='string')props.value=child.props.children;
  if(child.props.children!==undefined)props.children=localize(child.props.children as ReactNode,tr);
  return cloneElement(child,props);
 });
}
const identity=(s:string)=>s;
export function Localized({children}:{children:ReactNode}){const {language}=useContext(LanguageContext);return <>{localize(children,language==='en'?translate:identity)}</>}
