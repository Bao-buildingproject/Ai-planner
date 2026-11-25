# Ai Planner (bản web tĩnh)

Nhánh này chứa trang web chạy trên GitHub Pages: https://bao-buildingproject.github.io/Ai-planner/

- **Nhiều tài khoản trên một máy:** tạo tài khoản, đăng nhập, đăng xuất, đổi mật khẩu, xóa tài khoản. Mỗi tài khoản có kế hoạch riêng.
- **Xem theo tuần hoặc theo ngày:** chế độ Ngày có dòng thời gian theo giờ (khối việc có giờ bắt đầu và kết thúc, việc trùng giờ xếp cạnh nhau, vạch giờ hiện tại), danh sách việc chưa có giờ và tiến độ trong ngày.
- **Nhắc nhở:** mỗi việc có giờ bắt đầu có thể nhắc trước 0, 5, 10, 15, 30 hoặc 60 phút. Thẻ nhắc hiện trên trang (Đã xong, Báo lại 5 phút, Đóng), thêm thông báo trình duyệt khi đang ở tab khác nếu bạn cho phép. Chỉ nhắc khi trang đang mở (kể cả tab nền); đóng trình duyệt thì không nhắc.
- **Ghi nhớ đăng nhập:** chọn thì giữ đăng nhập 30 ngày trên máy đó; không chọn thì thoát khi đóng tab.
- Tài khoản và kế hoạch lưu trong trình duyệt của từng máy, không gửi đi đâu, nên điện thoại và máy tính không tự đồng bộ. Mật khẩu chỉ ngăn người dùng chung máy mở nhầm, không mã hóa dữ liệu, và không khôi phục được khi quên.
- Nút "Tải bản sao lưu" và "Nhập từ file" dùng để chuyển dữ liệu sang máy khác hoặc sang bản có máy chủ.
- Bản có máy chủ thật (đồng bộ giữa các thiết bị, Next.js + PostgreSQL) nằm ở nhánh `claude/ai-planner-v2`.
