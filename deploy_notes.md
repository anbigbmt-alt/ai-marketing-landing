# Tài liệu Hướng dẫn Triển khai Web (Production)

## Các biến môi trường (.env) cần cấu hình trên VPS:
* `PORT=3000` - Cổng chạy ứng dụng Web
* `RESEND_API_KEY=re_...` - Khóa API của Resend để gửi email
* `ADMIN_USERNAME=admin` - Tài khoản quản trị viên website
* `ADMIN_PASSWORD=...` - Mật khẩu đăng nhập quản trị
* `ADMIN_SESSION_TOKEN=...` - Token phiên làm việc của admin (mã bảo mật)

## Lệnh để khởi chạy Website trên VPS:
1. Cài đặt các thư viện:
   ```bash
   npm install --production
   ```
2. Khởi chạy thông qua systemd service:
   ```bash
   sudo systemctl start mywebsite
   ```

## Cổng dịch vụ:
* Website chạy tại cổng: `3000`
