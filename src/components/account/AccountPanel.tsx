"use client";

import { AlertCircle, Download, LogOut, Monitor, Moon, Sun, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import type { Theme } from "@/lib/validation";

interface User {
  name: string;
  email: string;
  theme: string;
}

type Status = { kind: "ok" | "error"; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return status.kind === "ok" ? (
    <p className="ok-text" role="status">
      {status.text}
    </p>
  ) : (
    <p className="form-error" role="alert">
      <AlertCircle aria-hidden="true" />
      {status.text}
    </p>
  );
}

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Theo máy", icon: Monitor },
  { value: "light", label: "Sáng", icon: Sun },
  { value: "dark", label: "Tối", icon: Moon },
];

export function AccountPanel({ user }: { user: User }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Status>(null);
  const [theme, setTheme] = useState<Theme>(user.theme === "light" || user.theme === "dark" ? user.theme : "system");
  const [themeStatus, setThemeStatus] = useState<Status>(null);
  const [password, setPassword] = useState<Status>(null);
  const [backup, setBackup] = useState<Status>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    setBusy("name");
    try {
      await api("/api/me", { method: "PATCH", body: { name } });
      setProfile({ kind: "ok", text: "Đã lưu tên." });
      router.refresh();
    } catch (error) {
      setProfile({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function chooseTheme(next: Theme) {
    const before = theme;
    setTheme(next);
    applyTheme(next);
    try {
      await api("/api/me", { method: "PATCH", body: { theme: next } });
      setThemeStatus(null);
    } catch (error) {
      setTheme(before);
      applyTheme(before);
      setThemeStatus({ kind: "error", text: errorMessage(error) });
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setPassword({ kind: "error", text: "Hai lần nhập mật khẩu mới chưa khớp nhau." });
      return;
    }
    setBusy("password");
    try {
      await api("/api/me/password", { method: "POST", body: { currentPassword, newPassword } });
      form.reset();
      setPassword({ kind: "ok", text: "Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất." });
    } catch (error) {
      setPassword({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBackup({ kind: "error", text: "File quá lớn (tối đa 5 MB)." });
      return;
    }
    setBusy("import");
    try {
      const { result } = await api<{ result: { added: number; duplicates: number; skipped: number; weeks: number } }>(
        "/api/backup",
        { method: "POST", raw: await file.text() },
      );
      const parts = [`Đã thêm ${result.added} việc`];
      if (result.duplicates) parts.push(`bỏ qua ${result.duplicates} việc đã có`);
      if (result.skipped) parts.push(`${result.skipped} mục không đọc được`);
      if (result.weeks) parts.push(`cập nhật ghi chú ${result.weeks} tuần`);
      setBackup({ kind: "ok", text: `${parts.join(", ")}.` });
    } catch (error) {
      setBackup({ kind: "error", text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function logout() {
    setBusy("logout");
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setBusy(null);
      setBackup({ kind: "error", text: errorMessage(error) });
    }
  }

  return (
    <div className="account">
      <div className="account-head">
        <p className="eyebrow">Tài khoản</p>
        <h1>{user.name}</h1>
        <p className="hint">{user.email}</p>
      </div>

      <section className="panel" aria-labelledby="profile-title">
        <h2 id="profile-title">Thông tin</h2>
        <form onSubmit={saveName}>
          <div className="field">
            <label className="field-label" htmlFor="profile-name">
              Tên hiển thị
            </label>
            <input id="profile-name" className="input" name="name" defaultValue={user.name} required maxLength={80} autoComplete="name" />
          </div>
          <div className="panel-row">
            <button className="btn btn-primary" type="submit" disabled={busy === "name"}>
              Lưu tên
            </button>
          </div>
          <StatusLine status={profile} />
        </form>
      </section>

      <section className="panel" aria-labelledby="theme-title">
        <h2 id="theme-title">Giao diện</h2>
        <div className="segmented" role="radiogroup" aria-labelledby="theme-title">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <label key={value}>
              <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => chooseTheme(value)} />
              <Icon aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
        <p className="hint">Lựa chọn được lưu theo tài khoản, áp dụng trên mọi thiết bị bạn đăng nhập.</p>
        <StatusLine status={themeStatus} />
      </section>

      <section className="panel" aria-labelledby="password-title">
        <h2 id="password-title">Đổi mật khẩu</h2>
        <form onSubmit={changePassword}>
          <div className="field">
            <label className="field-label" htmlFor="current-password">
              Mật khẩu hiện tại
            </label>
            <input id="current-password" className="input" name="currentPassword" type="password" required autoComplete="current-password" maxLength={200} />
          </div>
          <div className="row-2">
            <div className="field">
              <label className="field-label" htmlFor="new-password">
                Mật khẩu mới
              </label>
              <input id="new-password" className="input" name="newPassword" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="confirm-password">
                Nhập lại mật khẩu mới
              </label>
              <input id="confirm-password" className="input" name="confirmPassword" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
            </div>
          </div>
          <div className="panel-row">
            <button className="btn btn-primary" type="submit" disabled={busy === "password"}>
              Đổi mật khẩu
            </button>
          </div>
          <StatusLine status={password} />
        </form>
      </section>

      <section className="panel" aria-labelledby="backup-title">
        <h2 id="backup-title">Sao lưu dữ liệu</h2>
        <p className="hint">
          File sao lưu chứa mọi việc, mục tiêu và ghi chú của bạn. Nhập file chỉ thêm dữ liệu, không xóa hay ghi đè việc đang có. Dùng
          được cả file sao lưu của bản kế hoạch tuần cũ.
        </p>
        <div className="panel-row">
          <a className="btn" href="/api/backup" download>
            <Download aria-hidden="true" />
            Tải bản sao lưu
          </a>
          <button className="btn" type="button" disabled={busy === "import"} onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden="true" />
            {busy === "import" ? "Đang nhập…" : "Nhập từ file"}
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} aria-label="Chọn file sao lưu" />
        </div>
        <StatusLine status={backup} />
      </section>

      <section className="panel" aria-labelledby="logout-title">
        <h2 id="logout-title">Đăng xuất</h2>
        <p className="hint">Đăng xuất khỏi thiết bị này. Dữ liệu vẫn được giữ trong tài khoản.</p>
        <div className="panel-row">
          <button className="btn btn-danger" type="button" onClick={logout} disabled={busy === "logout"}>
            <LogOut aria-hidden="true" />
            Đăng xuất
          </button>
        </div>
      </section>
    </div>
  );
}
