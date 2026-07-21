# Hướng dẫn triển khai MCP Server

MCP Server này kết nối trực tiếp với database `brain.db` và tệp tin giao diện `public/index.html` của website để cung cấp các "cánh tay" điều khiển AI qua HTTP.

## Chạy thử nghiệm ở local
1. Chạy lệnh:
   ```bash
   node mcp/index.mjs
   ```
2. Server sẽ lắng nghe tại `http://127.0.0.1:3001/mcp`.

---

## Cấu hình Systemd Service trên VPS Ubuntu (Chạy ngầm 24/7)

1. Tạo file cấu hình dịch vụ `/etc/systemd/system/mcp-server.service`:
   ```ini
   [Unit]
   Description=GoClaw MCP Server for Website
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/my-website
   ExecStart=/usr/bin/node mcp/index.mjs
   Restart=always
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```

2. Nạp lại systemd daemon và kích hoạt dịch vụ:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mcp-server
   sudo systemctl start mcp-server
   ```

3. Kiểm tra trạng thái dịch vụ:
   ```bash
   sudo systemctl status mcp-server
   ```
