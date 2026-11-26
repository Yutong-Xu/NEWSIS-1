"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";

/**
 * Login page. The form is a thin client: the demo/SSO branch is decided
 * server-side by /api/auth/login (account lookup), never here.
 */
export default function LoginPage() {
  const router = useRouter();
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentNo, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "登录失败 / Sign-in failed");
        setBusy(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试 / Network error, please retry");
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <GraduationCap size={30} />
          <div>
            <h1>学生信息系统</h1>
            <p>Student Information System</p>
          </div>
        </div>
        <label>
          学号 / Student ID
          <input
            value={studentNo}
            onChange={(e) => setStudentNo(e.target.value)}
            placeholder="123090873"
            autoComplete="username"
            required
          />
        </label>
        <label>
          密码 / Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="btn primary login-submit" disabled={busy}>
          {busy && <Loader2 size={15} className="spin" />}
          登录 / Sign in
        </button>
        <p className="login-hint">
          演示账号：123090873 / 123090456 / 123078899，密码 demo123456。
          其他学号将通过学校统一认证（ADFS）验证。
        </p>
      </form>
    </div>
  );
}
