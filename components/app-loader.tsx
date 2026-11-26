"use client";

/**
 * AppLoader: auth guard + data loading boundary.
 * Loads read-only reference data (catalog, term, profile) from the server,
 * then renders the workspace. All simulated user state (plans, registrations)
 * lives browser-side in localStorage — see lib/storage.ts.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApiResource, adaptCourse, type ApiCourse, type ApiMe, type ApiTerm } from "@/lib/api";
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
  const router = useRouter();
  const [me, setMe] = useState<ApiMe | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    api<ApiMe>("/api/auth/me")
      .then((m) => { setMe(m); setAuthChecked(true); })
      .catch(() => { router.replace("/login"); });
  }, [router]);

  const coursesRes = useApiResource<{ items: ApiCourse[] }>(authChecked && me ? "/api/courses" : null);
  const termRes = useApiResource<ApiTerm>(authChecked && me ? "/api/term" : null);

  const failed = [coursesRes, termRes].find((r) => r.error);
  if (!me || !coursesRes.data || !termRes.data) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ alignItems: "center", textAlign: "center" }}>
          {failed ? (
            <>
              <p>加载失败 / Failed to load: {String(failed.error)}</p>
              <p>
                <a href="/login" style={{ color: "var(--primary)" }}>重新登录 / Sign in again</a>
                {" · "}
                <a href="/" style={{ color: "var(--primary)" }} onClick={(e) => { e.preventDefault(); location.reload(); }}>重试 / Retry</a>
              </p>
            </>
          ) : (
            <p>正在加载学生工作台… / Loading your workspace…</p>
          )}
        </div>
      </div>
    );
  }

  const rawCourses = coursesRes.data.items;
  // inject server data into the legacy module array the components read.
  // done before the first child render so all render-time computations see it.
  const adapted = rawCourses.map(adaptCourse);
  legacyCourses.splice(0, legacyCourses.length, ...adapted);
  const data: AppData = {
    me,
    term: termRes.data,
    rawCourses,
    courses: rawCourses.map(adaptCourse),
  };

  return <NewSIS data={data} reloadAll={coursesRes.reload} />;
}
