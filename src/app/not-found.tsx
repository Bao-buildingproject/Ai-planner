import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="center-note">
        <p className="eyebrow">Lỗi 404</p>
        <h1>Không có trang này</h1>
        <p>Đường dẫn có thể đã sai hoặc trang đã được dời đi.</p>
        <Link className="btn btn-primary" href="/week">
          Về tuần của tôi
        </Link>
      </div>
    </main>
  );
}
