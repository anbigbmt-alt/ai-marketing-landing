# Hướng dẫn Triển khai Dự án AI Marketing Landing Page

Tài liệu này hướng dẫn cách cấu hình, sao lưu dữ liệu và triển khai (deploy) ứng dụng Node.js (Express + SQLite) của bạn lên máy chủ thực tế (Production).

---

## 1. Cấu hình Biến Môi Trường (Environment Variables)

Ứng dụng sử dụng gói `dotenv` để quản lý các thông tin cấu hình nhạy cảm. Bạn **không được** đẩy file `.env` lên các kho lưu trữ công khai như GitHub.

### Các bước cấu hình:
1. Sao chép file `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` và điền đầy đủ các thông tin:
   * **`PORT`**: Cổng chạy ứng dụng (Mặc định: `3000`).
   * **`RESEND_API_KEY`**: API Key của Resend dùng để gửi email tự động xác nhận đơn hàng/chăm sóc khách hàng.
   * **`ADMIN_USERNAME`**: Tài khoản đăng nhập trang quản trị CRM (ví dụ: `admin`).
   * **`ADMIN_PASSWORD`**: Mật khẩu bảo mật trang quản trị CRM.
   * **`ADMIN_SESSION_TOKEN`**: Một chuỗi ký tự ngẫu nhiên bảo mật dùng làm cookie token cho phiên làm việc của admin (ví dụ: một chuỗi hash MD5/SHA256).

---

## 2. Sao lưu Dữ liệu SQLite (`brain.db`)

Dữ liệu của hệ thống (sản phẩm, khách hàng, đơn hàng, email lên lịch) được lưu trong file SQLite có tên là `brain.db` ở thư mục gốc của dự án.

* **Sao lưu thủ công**: 
  Chỉ cần sao chép file `brain.db` sang một thư mục khác hoặc đổi tên thành dạng backup, ví dụ:
  ```bash
  cp brain.db brain_backup_$(date +%F).db
  ```
* **Lưu ý quan trọng**: File `brain_backup.db` và các định dạng `*.db.bak` đã được cấu hình trong `.gitignore` để tránh bị đẩy lên Git công khai.

---

## 3. Quy trình Triển khai lên VPS (Khuyên dùng)

Đây là phương án tối ưu nhất dành cho ứng dụng Express + SQLite vì SQLite cần một ổ đĩa cục bộ ổn định và không bị xóa dữ liệu khi khởi động lại ứng dụng.

### Bước 3.1. Cài đặt các công cụ cần thiết trên Server (Ubuntu/Debian)
Cập nhật hệ thống và cài đặt Node.js, NPM, Nginx và Git:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
```

### Bước 3.2. Clone code và Cài đặt dependencies
1. Clone dự án về VPS:
   ```bash
   git clone <URL_KHO_LƯU_TRỮ_CỦA_BẠN> /var/www/ai-marketing
   cd /var/www/ai-marketing
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install --production
   ```
3. Tạo file `.env` và cấu hình đầy đủ như ở **Mục 1**.

### Bước 3.3. Quản lý tiến trình bằng PM2
Sử dụng `pm2` để chạy ứng dụng trong nền và tự động khởi động lại nếu server bị reboot.
1. Cài đặt PM2 toàn cục:
   ```bash
   sudo npm install -g pm2
   ```
2. Khởi chạy ứng dụng:
   ```bash
   pm2 start server.js --name "ai-marketing"
   ```
3. Cấu hình PM2 tự khởi chạy cùng hệ thống:
   ```bash
   pm2 startup
   # Chạy lệnh sudo env... được PM2 hiển thị trên màn hình
   pm2 save
   ```

### Bước 3.4. Cấu hình Nginx làm Reverse Proxy
1. Mở file cấu hình Nginx mới:
   ```bash
   sudo nano /etc/nginx/sites-available/ai-marketing
   ```
2. Dán nội dung cấu hình sau vào (thay thế `yourdomain.com` bằng tên miền thật của bạn):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000; # PORT chạy ứng dụng Node.js
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```
3. Kích hoạt cấu hình và restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/ai-marketing /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Bước 3.5. Cài đặt SSL miễn phí với Let's Encrypt (HTTPS)
Để đảm bảo bảo mật thông tin đăng nhập admin và thông tin khách hàng:
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
*Chọn tự động chuyển hướng HTTP sang HTTPS (Redirect).*

---

## 4. Triển khai lên các nền tảng PaaS (Render / Railway / Fly.io)

Nếu sử dụng các dịch vụ cloud PaaS, bạn cần cấu hình thêm **Persistent Volume (Disk)** vì mặc định ổ đĩa của các dịch vụ này là tạm thời (ephemeral) - dữ liệu SQLite trong file `brain.db` sẽ bị mất sạch mỗi khi ứng dụng restart hoặc deploy bản mới.

### Lưu ý khi cấu hình:
1. **Môi trường**: Chọn runtime là **Node.js**.
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**: Thêm các biến môi trường trực tiếp trên trang quản trị của Render/Railway/Fly.io (tương ứng với các dòng trong file `.env`).
5. **Persistent Disk (Bắt buộc)**:
   * Tạo 1 volume gắn vào thư mục chứa database (ví dụ: mount volume vào `/data`).
   * Cập nhật biến môi trường hoặc cấu hình đường dẫn file database SQLite trong code chuyển sang `/data/brain.db` thay vì nằm trực tiếp ở thư mục gốc của dự án.
