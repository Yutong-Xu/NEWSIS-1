"use client";

/**
 * AppLoader: auth guard + data loading boundary.
 * Loads all server resources once, then renders the workspace with them.
 * The visual structure of the app is unchanged — this is a pure data gate.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApiResource, adaptCourse, type ApiCourse, type ApiPlan, type ApiMe, type ApiTerm, type ApiEnrollment } from "@/lib/api";
import type { Course } from "@/lib/courses";
import NewSIS from "@/components/new-sis";
import { courses as legacyCourses } from "@/lib/courses";

export interface AppData {
  me: ApiMe;
  term: ApiTerm;
  courses: Course[];
  rawCourses: ApiCourse[];
  plans: ApiPlan[];
  candidates: { courseId: string; dismissed: boolean }[];
  enrollments: ApiEnrollment[];
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
  const plansRes = useApiResource<{ items: ApiPlan[] }>(authChecked && me ? "/api/plans" : null);
  const candidatesRes = useApiResource<{ items: { courseId: string; dismissed: boolean }[] }>(authChecked && me ? "/api/candidates" : null);
  const enrollmentRes = useApiResource<{ items: ApiEnrollment[] }>(authChecked && me ? "/api/enrollment" : null);
  const termRes = useApiResource<ApiTerm>(authChecked && me ? "/api/term" : null);

  const failed = [coursesRes, plansRes, candidatesRes, enrollmentRes, termRes].find((r) => r.error);
  if (!me || !coursesRes.data || !plansRes.data || !candidatesRes.data || !enrollmentRes.data || !termRes.data) {
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
    plans: plansRes.data.items,
    candidates: candidatesRes.data.items,
    enrollments: enrollmentRes.data.items,
  };

  const reloadAll = () => {
    coursesRes.reload();
    plansRes.reload();
    candidatesRes.reload();
    enrollmentRes.reload();
  };

  return <NewSIS data={data} reloadAll={reloadAll} reloadPlans={plansRes.reload} reloadEnrollment={enrollmentRes.reload} />;
}
