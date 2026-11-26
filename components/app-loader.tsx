"use client";

/**
 * AppLoader: hydration boundary.
 * Everything is static — the persona is generated in the browser on first
 * visit (localStorage UUID), the catalog shapes itself against that persona.
 * The brief loading state exists only so server-rendered HTML and the first
 * client render agree (the persona does not exist during SSR).
 */
import { useEffect, useState } from "react";
import { adaptCourse, catalogFor, personaAsMe, termState, type ApiCourse, type ApiMe, type ApiTerm } from "@/lib/api";
import { getPersona } from "@/lib/persona";
import type { Course } from "@/lib/courses";
import NewSIS from "@/components/new-sis";
import { courses as legacyCourses } from "@/lib/courses";

export interface AppData {
  me: ApiMe;
  term: ApiTerm;
  courses: Course[];
  rawCourses: ApiCourse[];
}

export default function AppLoader() {
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    const persona = getPersona();
    const rawCourses = catalogFor(persona);
    const adapted = rawCourses.map(adaptCourse);
    legacyCourses.splice(0, legacyCourses.length, ...adapted);
    setData({
      me: personaAsMe(persona),
      term: termState(),
      rawCourses,
      courses: adapted,
    });
  }, []);

  if (!data) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ alignItems: "center", textAlign: "center" }}>
          <p>正在加载学生工作台… / Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return <NewSIS data={data} reloadAll={() => {}} />;
}
