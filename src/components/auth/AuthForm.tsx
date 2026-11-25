"use client";

import { AlertCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { api, errorMessage } from "@/lib/api";

export function AuthForm({ mode, inviteRequired = false }: { mode: "login" | "signup"; inviteRequired?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signup = mode === "signup";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "");
    setBusy(true);
    setError(null);
    try {
      await api(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        body: signup
          ? { name: get("name"), email: get("email"), password: get("password"), inviteCode: get("inviteCode") }
          : { email: get("email"), password: get("password") },
      });
      router.replace("/week");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <div>
        <h2>{signup ? "Tạo tài khoản" : "Đăng nhập"}</h2>
        <p className="auth-switch">
          {signup ? (
            <>
              Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
            </>
          ) : (
            <>
              Chưa có tài khoản? <Link href="/signup">Đăng ký</Link>
            </>
          )}
        </p>
      </div>
      {error && (
        <p className="form-error" role="alert">
          <AlertCircle aria-hidden="true" />
          {error}
        </p>
      )}
      <form method="post" onSubmit={onSubmit}>
        {signup && (
          <div className="field">
            <label className="field-label" htmlFor="name">
              Tên của bạn
            </label>
            <input id="name" className="input" name="name" autoComplete="name" required maxLength={80} />
          </div>
        )}
        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="password">
            Mật khẩu
          </label>
          <div className="password-wrap">
            <input
              id="password"
              className="input"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 8 : undefined}
              maxLength={200}
              aria-describedby={signup ? "password-hint" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {signup && (
            <span id="password-hint" className="hint">
              Tối thiểu 8 ký tự.
            </span>
          )}
        </div>
        {signup && inviteRequired && (
          <div className="field">
            <label className="field-label" htmlFor="inviteCode">
              Mã mời
            </label>
            <input
              id="inviteCode"
              className="input"
              name="inviteCode"
              autoComplete="off"
              required
              maxLength={200}
              aria-describedby="invite-hint"
            />
            <span id="invite-hint" className="hint">
              Người mời bạn vào Ai Planner sẽ gửi mã này.
            </span>
          </div>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy && <LoaderCircle className="spin" aria-hidden="true" />}
          {busy ? "Đang xử lý…" : signup ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
