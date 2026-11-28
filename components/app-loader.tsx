"use client";

/**
 * AppLoader: hydration boundary + start-mode routing.
 * - No visitor record yet → the onboarding start screen (one-time choice).
 * - Record exists → the workspace, with the persona's mode applied:
 *   fresh starts empty, preset seeds in-progress state (see lib/persona.ts).
 * Everything is static; the brief loading state exists so SSR HTML and the
 * first client render agree.
 */
import { useCallback, useEffect, useState } from "react";
import { adaptCourse, catalogFor, personaAsMe, termState, type ApiCourse, type ApiMe, type ApiTerm } from "@/lib/api";
import { loadVisitor, personaAt, type Persona, type StartMode } from "@/lib/persona";
import type { Course } from "@/lib/courses";
import NewSIS from "@/components/new-sis";
import { Onboarding } from "@/components/onboarding";
import { courses as legacyCourses } from "@/lib/courses";

export interface AppData {
  me: ApiMe;
  term: ApiTerm;
  courses: Course[];
  rawCourses: ApiCourse[];
  persona: Persona;
  mode: StartMode;
}

function buildData(persona: Persona, mode: StartMode): AppData {
  const rawCourses = catalogFor(persona);
  const adapted = rawCourses.map(adaptCourse);
  legacyCourses.splice(0, legacyCourses.length, ...adapted);
  return {
    me: personaAsMe(persona),
    term: termState(),
    rawCourses,
    courses: adapted,
    persona,
    mode,
  };
}

export default function AppLoader() {
  // null = hydrating (unknown yet), "choose" = onboarding, otherwise ready
  const [phase, setPhase] = useState<"loading" | "choose" | "ready">("loading");
  const [data, setData] = useState<AppData | null>(null);

  const enter = useCallback(() => {
    const visitor = loadVisitor();
    if (!visitor) {
      setPhase("choose");
      return;
    }
    setData(buildData(personaAt(visitor.template), visitor.mode));
    setPhase("ready");
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => enter());
    return () => cancelAnimationFrame(frame);
  }, [enter]);

  // persona switch / restart from within the workspace re-enters here
  useEffect(() => {
    const handler = () => enter();
    window.addEventListener("newsis:visitor-changed", handler);
    return () => window.removeEventListener("newsis:visitor-changed", handler);
  }, [enter]);

  if (phase === "choose") {
    return <Onboarding onDone={enter} />;
  }

  if (!data) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ alignItems: "center", textAlign: "center" }}>
          <p>正在加载学生工作台… / Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return <NewSIS key={`${data.persona.studentNo}:${data.mode}`} data={data} />;
}
