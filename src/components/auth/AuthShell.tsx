import { CalendarCheck, Highlighter, LockKeyhole } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "../Logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-cover" aria-label="Giới thiệu Ai Planner">
        <Link href="/" className="brand">
          <LogoMark className="brand-mark" />
          <span>Ai Planner</span>
        </Link>
        <div>
          <h1>
            Sổ kế hoạch tuần <span className="marker">của riêng bạn</span>
          </h1>
          <p className="lead">Ghi việc theo từng ngày, tích khi xong và xem cả tuần đã đi được bao xa.</p>
        </div>
        <ul className="auth-points">
          <li>
            <CalendarCheck aria-hidden="true" />
            <span>
              <b>Mở ra là thấy việc hôm nay</b>
              Việc trễ được đánh dấu theo giờ Việt Nam.
            </span>
          </li>
          <li>
            <Highlighter aria-hidden="true" />
            <span>
              <b>Việc xong được tô dạ quang</b>
              Tiến độ tuần tự tính, có so sánh với tuần trước.
            </span>
          </li>
          <li>
            <LockKeyhole aria-hidden="true" />
            <span>
              <b>Mỗi người một tài khoản</b>
              Dữ liệu lưu trên máy chủ, dùng được trên điện thoại và máy tính.
            </span>
          </li>
        </ul>
      </section>
      <main className="auth-main" id="main">
        {children}
      </main>
    </div>
  );
}
