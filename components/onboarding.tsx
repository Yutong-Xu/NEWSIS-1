"use client";

/**
 * Start screen — a one-time choice, not a login.
 * Fresh: the guided newcomer experience with an empty slate.
 * Preset: pick a persona and enter a workspace already in progress.
 */
import { useState } from "react";
import { ArrowRight, GraduationCap, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personaTemplates, saveVisitor } from "@/lib/persona";
import { useLanguage } from "./language";

export function Onboarding({ onDone }: { onDone: () => void }) {
  const en = useLanguage() === "en";
  const tr = (zh: string, english: string) => (en ? english : zh);
  const templates = personaTemplates();
  const [template, setTemplate] = useState(0);

  const yearZh = (year: number) => tr(`大${["一", "二", "三", "四"][year - 1] ?? year}`, `Year ${year}`);

  return (
    <div className="login-shell">
      <div className="login-card onboarding-card">
        <div className="brand" style={{ pointerEvents: "none" }}>
          <span className="university-crest">
            <img src="/cuhk-shenzhen-logo.png" alt="香港中文大学（深圳）校徽" width={348} height={50} />
          </span>
          <span>New <b>SIS</b><small>{tr("学生信息系统", "Student Information System")}</small></span>
        </div>
        <h1>{tr("你想怎样开始？", "How would you like to start?")}</h1>
        <div className="onboarding-options">
          <button
            type="button"
            className="onboarding-option"
            onClick={() => { saveVisitor({ mode: "fresh", template: 0 }); onDone(); }}
          >
            <GraduationCap size={28} aria-hidden="true" />
            <strong>{tr("全新体验", "Start fresh")}</strong>
            <span>{tr("以新生身份完整体验选课流程，从空白计划开始。", "Experience the full registration journey as a newcomer, starting with an empty plan.")}</span>
            <em>{tr("包含新手引导", "Includes the guided tour")}</em>
          </button>
          <div className="onboarding-option onboarding-preset">
            <Zap size={28} aria-hidden="true" />
            <strong>{tr("快速查看", "Quick look")}</strong>
            <span>{tr("选择一个身份，直接进入已有进度的学生工作台。", "Pick an identity and enter a workspace already in progress.")}</span>
            <div className="onboarding-personas" role="radiogroup" aria-label={tr("选择身份", "Choose an identity")}>
              {templates.map((p, i) => (
                <label key={p.studentNo} className={`onboarding-persona ${template === i ? "selected" : ""}`}>
                  <input type="radio" name="persona" checked={template === i} onChange={() => setTemplate(i)} />
                  <b>{en ? p.nameEn : p.nameZh}</b>
                  <small>{yearZh(p.year)} · {p.major}</small>
                </label>
              ))}
            </div>
            <Button variant="primary" onClick={() => { saveVisitor({ mode: "preset", template }); onDone(); }}>
              {tr("进入工作台", "Enter workspace")}
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
        <p className="onboarding-note">{tr("所有数据仅保存在当前浏览器中，与任何真实系统无关。", "All data stays in this browser and is unrelated to any real system.")}</p>
      </div>
    </div>
  );
}
