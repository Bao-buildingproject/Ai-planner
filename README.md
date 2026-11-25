# Ai Planner

Sổ kế hoạch tuần trên web. Mỗi người có tài khoản riêng: ghi việc theo từng ngày, tích khi xong, xem tiến độ cả tuần và so với tuần trước. Giao diện theo hướng **“Giấy kẻ ô”**: nền giấy kẻ ô, mực xanh đen, việc xong được tô bút dạ quang, việc trễ được đánh dấu bằng bút đỏ.

| Máy tính | Điện thoại |
| --- | --- |
| ![Tuần trên máy tính](docs/screenshots/tuan-may-tinh.jpg) | ![Tuần trên điện thoại](docs/screenshots/tuan-dien-thoai.jpg) |

Các ảnh khác (nền tối, máy tính bảng, đăng nhập, sửa việc, tài khoản) nằm trong [`docs/screenshots`](docs/screenshots). Ảnh chụp dùng một tài khoản mẫu tên “Minh An” với dữ liệu minh họa.

## Tính năng

- **Nhiều tài khoản:** đăng ký, đăng nhập, đăng xuất, đổi mật khẩu. Mỗi người chỉ thấy dữ liệu của mình.
- **Ghi nhớ đăng nhập:** chọn thì giữ đăng nhập 30 ngày trên thiết bị đó (tự gia hạn khi còn dùng); không chọn thì thoát khi đóng trình duyệt, hoặc sau 24 giờ.
- **Mã mời (tùy chọn):** đặt biến `INVITE_CODE` thì người mới phải nhập đúng mã mới đăng ký được.
- **Tuần từ Thứ Hai đến Chủ Nhật:** chuyển tuần trước, tuần sau, quay về tuần này. Số tuần theo chuẩn ISO.
- **Việc trong ngày:** thêm việc kèm giờ bắt đầu; sửa tên, ngày, giờ bắt đầu và kết thúc; tích xong; xóa có nút **Hoàn tác** trong 8 giây.
- **Trạng thái:** Xong, Trễ (đã qua giờ hoặc qua ngày mà chưa xong, tính theo giờ Việt Nam), Sắp tới.
- **Tiến độ tuần:** phần trăm việc đã xong, kèm kết quả tuần trước.
- **Mục tiêu và ghi chú tuần:** tự lưu khi bạn ngừng gõ, khi rời ô nhập và khi đóng trang.
- **Sao lưu:** tải toàn bộ dữ liệu ra file JSON; nhập lại file (kể cả file của bản kế hoạch tuần một file cũ). Nhập file chỉ **thêm** dữ liệu, bỏ qua việc trùng, không xóa hay ghi đè gì.
- **Sáng/tối:** theo máy hoặc chọn hẳn, lưu theo tài khoản.
- **Điện thoại:** một ngày một trang, chọn ngày bằng dải 7 ô; sửa việc trong khung trượt từ dưới lên.

Thiết kế chi tiết (sơ đồ trang, luồng sử dụng, wireframe, màu, chữ, kiến trúc component, API): [`docs/thiet-ke.md`](docs/thiet-ke.md).

## Chạy trên máy

Cần Node.js 20.9 trở lên và PostgreSQL (14 trở lên).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Sửa `DATABASE_URL` trong `.env.local` cho đúng cơ sở dữ liệu của bạn, rồi tạo bảng:

```bash
npm run db:migrate
```

```bash
npm run dev
```

Mở http://localhost:3000.

## Đưa lên mạng (Vercel + Neon, gói miễn phí)

1. Tạo tài khoản ở [neon.tech](https://neon.tech), tạo một project (chọn vùng Singapore cho gần Việt Nam). Neon cho bạn chuỗi kết nối `postgres://…`.
2. Tạo tài khoản ở [vercel.com](https://vercel.com) bằng GitHub, chọn **Add New → Project** và chọn repo `Ai-planner`.
3. Trong **Environment Variables**, thêm:
   - `DATABASE_URL`: chuỗi kết nối của Neon (bản có `-pooler`).
   - `DATABASE_URL_UNPOOLED`: chuỗi kết nối trực tiếp của Neon (không có `-pooler`), dùng để tạo bảng.
   - `INVITE_CODE` (tùy chọn): mã mời. Bỏ trống thì ai có đường link cũng đăng ký được.
   - Có thể dùng tích hợp Neon sẵn trong Vercel (**Storage → Neon**); nó tự thêm hai biến cơ sở dữ liệu.
4. Bấm **Deploy**. Lệnh build tự tạo hoặc cập nhật bảng trước khi build (`scripts/migrate.mjs`). Máy chủ chạy ở vùng Singapore (`vercel.json`).

Không cần khóa bí mật nào khác. Đừng đưa chuỗi kết nối hay mã mời vào mã nguồn.

## Kiểm thử

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm test
```

Kiểm thử với PostgreSQL thật. Bài test **xóa dữ liệu**, nên chỉ chạy trên cơ sở dữ liệu có tên kết thúc bằng `_test`:

```bash
TEST_DATABASE_URL=postgres://planner:planner@localhost:5432/ai_planner_test npm run test:integration
```

Kiểm thử trên trình duyệt (cần build trước; gồm máy tính, điện thoại và quét lỗi truy cập WCAG ở nền sáng lẫn nền tối):

```bash
npm run build
```

```bash
npm run test:e2e
```

GitHub Actions chạy tất cả các bước trên cho mỗi pull request (`.github/workflows/ci.yml`).

**Kết quả đo lần gần nhất** (ngày 25/11/2026, Lighthouse 12.6.1, bản build production chạy trên máy kiểm thử, chưa đo trên Vercel):

| Trang | Thiết bị | Hiệu năng | Truy cập | Thực hành tốt | SEO |
| --- | --- | --- | --- | --- | --- |
| Đăng nhập | Điện thoại | 91–93 | 100 | 100 | 100 |
| Tuần | Điện thoại | 91–96 | 100 | 100 | 100 |
| Tài khoản | Điện thoại | 90 | 100 | 100 | 100 |
| Đăng nhập, Tuần, Tài khoản | Máy tính | 100 | 100 | 100 | 100 |

## Bảo mật

- Mật khẩu băm bằng scrypt; cơ sở dữ liệu chỉ lưu mã băm SHA-256 của phiên đăng nhập.
- Cookie phiên `httpOnly`, `SameSite=Lax`, tiền tố `__Host-` khi chạy thật. Không chọn “Ghi nhớ đăng nhập” thì đó là cookie phiên (hết khi đóng trình duyệt) và máy chủ chỉ chấp nhận trong 24 giờ, không gia hạn.
- Chặn yêu cầu thay đổi dữ liệu từ trang web khác (kiểm tra `Origin`); giới hạn số lần đăng nhập, đăng ký, đổi mật khẩu, nhập file.
- Mọi truy vấn đều lọc theo người đang đăng nhập; việc của người khác luôn trả về “không tìm thấy”.
- Content-Security-Policy, HSTS và chặn nhúng trang khi chạy thật.

## Cấu trúc

```
src/app            trang (login, signup, week, account) và API (src/app/api)
src/components     giao diện: auth, week, account, header
src/lib            ngày tháng và giờ Việt Nam, trạng thái việc, kiểm tra dữ liệu, đọc file sao lưu
src/server         kết nối cơ sở dữ liệu, đăng nhập, phiên, giới hạn tần suất, các dịch vụ
drizzle            file tạo bảng (SQL)
tests              kiểm thử với PostgreSQL và trên trình duyệt
docs               thiết kế và ảnh chụp màn hình
```
