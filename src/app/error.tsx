"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="page">
      <div className="center-note" role="alert">
        <p className="eyebrow">Có lỗi xảy ra</p>
        <h1>Chưa tải được trang</h1>
        <p>Máy chủ hoặc kết nối mạng đang gặp sự cố. Dữ liệu của bạn không bị ảnh hưởng.</p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Thử lại
        </button>
      </div>
    </main>
  );
}
