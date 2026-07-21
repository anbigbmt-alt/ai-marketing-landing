require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load config from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'anvoai247';
const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN || 'authenticated_secret_token';

// Read Resend API Key (prioritize environment variable, fallback to resend_config.txt)
let resendApiKey = process.env.RESEND_API_KEY || '';
if (!resendApiKey) {
  try {
    const configPath = path.join(__dirname, 'resend_config.txt');
    if (fs.existsSync(configPath)) {
      resendApiKey = fs.readFileSync(configPath, 'utf8').trim();
      console.log('Loaded Resend API Key from resend_config.txt:', resendApiKey ? 'Yes' : 'Empty');
    } else {
      console.log('RESEND_API_KEY environment variable not set, and resend_config.txt not found. Resend will run in Mock Mode.');
    }
  } catch (err) {
    console.error('Error reading resend_config.txt:', err);
  }
} else {
  console.log('Loaded Resend API Key from environment variable.');
}

// Generate Email HTML Templates
function getEmailTemplate(type, name, data = {}) {
  const productName = data.product_name || 'Khóa học AI Marketing Thực Chiến';
  const amount = data.amount || 0;
  const status = data.status || 'success';
  const formattedAmount = Number(amount).toLocaleString('vi-VN') + ' đ';
  const statusText = status === 'success' ? 'Đã thanh toán thành công (Thành viên chính thức)' : 'Chờ thanh toán (Đang xử lý)';
  
  let instructions = '';
  if (status === 'success') {
    if (productName.includes('Cơ bản') || productName.toLowerCase().includes('coban')) {
      instructions = 'Hệ thống đã kích hoạt quyền truy cập của bạn vào gói <b>Cơ bản</b>. Bạn sẽ nhận được email hướng dẫn đăng nhập học qua video 8 module và link tải các mẫu Prompts marketing thực chiến trong vòng 5-10 phút nữa nhé.';
    } else if (productName.includes('Tiêu chuẩn') || productName.toLowerCase().includes('tieu-chuan') || productName.toLowerCase().includes('tieuchuan')) {
      instructions = 'Hệ thống đã kích hoạt quyền truy cập gói <b>Tiêu chuẩn</b>. Bạn hãy kết nối Zalo trực tiếp với An qua số 0905184871 để An gửi tài khoản học qua video, link tham gia live Q&A hàng tuần và duyệt bạn vào nhóm hỗ trợ học viên nhé.';
    } else if (productName.includes('Cao cấp') || productName.toLowerCase().includes('caocap')) {
      instructions = 'Chúc mừng bạn đã sở hữu gói kèm cặp <b>1-1 đặc quyền</b> từ Võ An. Vui lòng kết nối Zalo với An qua số 0905184871 ngay để chúng ta đặt lịch Zoom buổi đầu tiên, bắt đầu phân tích và tối ưu hóa hệ thống marketing riêng cho shop của bạn nhé.';
    } else {
      instructions = 'Hệ thống đã kích hoạt đơn hàng của bạn thành công. Vui lòng kết nối trực tiếp qua Zalo với An qua số 0905184871 để nhận tài liệu học tập và hướng dẫn kích hoạt tài khoản của bạn nhé.';
    }
  } else {
    instructions = 'Đơn hàng của bạn đang ở trạng thái chờ thanh toán. Vui lòng hoàn tất chuyển khoản theo hướng dẫn thanh toán để An kích hoạt tài khoản học cho bạn nhé. Nếu bạn cần hỗ trợ gì thêm, cứ nhắn Zalo trực tiếp cho An qua số 0905184871, An rep liền.';
  }

  const templates = {
    welcome: {
      subject: `Alo ${name} ơi, An nghe nè! 💬`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #1b2733; line-height: 1.6; max-width: 600px;">
          <p>Chào <b>${name}</b> nha, An đây!</p>
          <p>Cảm ơn bạn đã tin tưởng đăng ký nhận tư vấn và tài liệu về khóa học AI Marketing Thực Chiến của An.</p>
          <p>Thật ra, nhiều bạn trước khi đến với An hay than thở là "mù công nghệ", k biết bắt đầu từ đâu, rồi sợ văn AI viết nghe sáo rỗng, công nghiệp.</p>
          <p>Nhưng đơn giản thôi bạn ơi! Nếu bạn nhắn tin Zalo hay lướt Facebook được là bạn học được. Trong khóa học, An chỉ dạy đúng 3 thứ thiết yếu: viết content ra đơn, làm hình đẹp và chạy ads k đốt tiền. Mỗi ngày chỉ tốn dưới 30 phút, chi phí gần như bằng 0.</p>
          <p>An sẽ gửi thêm một số mẹo thực chiến cực hay vào email cho bạn trong 1-2 ngày tới. Cứ đợi thư An nha!</p>
          <p>Cần gì gấp cứ nhắn tin Zalo trực tiếp cho An qua số 0905184871 hen. An sẽ ib tư vấn lộ trình phù hợp nhất cho shop của bạn.</p>
          <hr style="border: none; border-top: 1px solid #e3e9f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #5b6b7c;">Học viện AI Marketing — Võ An (0905184871)</p>
        </div>
      `
    },
    nurture: {
      subject: `Đừng viết content kiểu "văn mẫu" nữa... (Mẹo viết bài như người thật) ✍️`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #1b2733; line-height: 1.6; max-width: 600px;">
          <p>Alo <b>${name}</b> ơi, An đây!</p>
          <p>Hôm nay An chia sẻ nhanh cho bạn 1 mẹo nhỏ mà An hay làm để dạy AI viết bài y hệt như người thật viết, k bị giả tạo hay mang giọng "công nghiệp" nha.</p>
          <p>Bình thường mọi người hay lên mạng gõ đại: "Viết bài giới thiệu sản phẩm A". Kết quả là AI sẽ phun ra một đống từ sáo rỗng như: "chào mừng bạn đến với", "tối ưu hóa trải nghiệm", "chúng tôi tự hào"... Khách hàng đọc phát biết ngay AI viết, họ lướt qua liền!</p>
          <p>Cách làm của An đơn giản thế này:</p>
          <p>Trước khi bắt AI viết, bạn hãy gửi cho nó 2-3 bài viết cũ mà bạn tự viết (hoặc bài bạn thấy hay) và ra lệnh cho nó:</p>
          <blockquote style="border-left: 4px solid #1f6feb; padding-left: 15px; margin: 15px 0; color: #5b6b7c;">
            "Đây là phong cách viết của tôi. Hãy đọc kỹ cách dùng từ, cách ngắt câu và xưng hô. Sau đó, viết bài mới dựa theo đúng phong cách này."
          </blockquote>
          <p>Chỉ một mẹo nhỏ vậy thôi nhưng văn phong AI viết ra sẽ tự nhiên, đời thường và giống giọng của bạn đến 90%. Bạn thử xem nha!</p>
          <p>Hẹn gặp lại bạn ở email tiếp theo, An sẽ chỉ cho bạn cách làm ảnh sản phẩm cực đẹp bằng AI mà k tốn 1 cắc thuê thiết kế.</p>
          <hr style="border: none; border-top: 1px solid #e3e9f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #5b6b7c;">Học viện AI Marketing — Võ An (0905184871)</p>
        </div>
      `
    },
    closing: {
      subject: `Bỏ 3.5 triệu 1 lần, dùng cả đời — thay vì thuê ngoài tốn kém? 💰`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #1b2733; line-height: 1.6; max-width: 600px;">
          <p>Alo <b>${name}</b> ơi, lại là An đây!</p>
          <p>Mấy hôm nay An chia sẻ chắc bạn cũng thấy làm marketing bằng AI k hề phức tạp đúng k?</p>
          <p>Thay vì bạn tốn 5-10 triệu/tháng thuê người làm content hay chạy ads, bạn hoàn toàn có thể tự làm 1 mình nhờ AI hỗ trợ.</p>
          <p>An khuyên bạn nên chọn <b>Gói Tiêu chuẩn (3.500.000đ)</b> — gói này được nhiều chủ shop chọn nhất vì có An đi cùng giải đáp Q&A hàng tuần và cộng đồng học viên hỗ trợ. Trả tiền 1 lần, dùng cả đời, k phát sinh chi phí.</p>
          <p>Bạn bấm vào đây để đăng ký giữ suất học ưu đãi giảm giá 50% nha:</p>
          <p style="margin: 25px 0;">
            <a href="https://aiwithsme.com/thanh-toan.html?goi=tieu-chuan" target="_blank" style="background: linear-gradient(135deg, #ff6b35, #ff8c42); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(255,107,53,0.35);">👉 ĐĂNG KÝ HỌC NGAY</a>
          </p>
          <p>Cần An tư vấn thêm gói nào phù hợp nhất cho shop của bạn thì cứ Zalo trực tiếp cho An (0905184871) nha, An rep liền.</p>
          <p>Chúc shop của bạn luôn bão đơn!</p>
          <hr style="border: none; border-top: 1px solid #e3e9f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #5b6b7c;">Học viện AI Marketing — Võ An (0905184871)</p>
        </div>
      `
    },
    order_success: {
      subject: status === 'success' ? `Xác nhận đăng ký học thành công! 🎉 (AI Marketing Thực Chiến)` : `Xác nhận đơn hàng đang xử lý ⏳ (AI Marketing Thực Chiến)`,
      html: `
        <div style="font-family: sans-serif; font-size: 15px; color: #1b2733; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #e3e9f0; padding: 30px; border-radius: 12px; background-color: #ffffff;">
          <p>Chào <b>${name}</b> nha, Võ An đây! 👋</p>
          <p>Cảm ơn bạn rất nhiều vì đã tin tưởng đăng ký tham gia khóa học AI Marketing Thực Chiến của An. Hệ thống của An đã ghi nhận đơn hàng của bạn thành công rồi hen.</p>
          
          <p>Dưới đây là thông tin chi tiết đơn hàng của bạn:</p>
          <div style="background: #f6f8fb; border: 1px solid #e3e9f0; padding: 18px; border-radius: 12px; margin: 18px 0;">
            <p style="margin: 4px 0;"><b>Học viên:</b> ${name}</p>
            <p style="margin: 4px 0;"><b>Khóa học:</b> ${productName}</p>
            <p style="margin: 4px 0;"><b>Học phí:</b> <span style="color: #ff6b35; font-weight: bold;">${formattedAmount}</span></p>
            <p style="margin: 4px 0;"><b>Trạng thái:</b> ${statusText}</p>
          </div>

          <h3 style="color: #2c3e50; margin-top: 25px;">🚀 Hướng dẫn nhận học liệu và kích hoạt:</h3>
          <p>${instructions}</p>

          <p style="margin: 25px 0; text-align: center;">
            <a href="https://zalo.me/0905184871" target="_blank" style="background: #1f9d55; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(31,157,85,0.3);">💬 LIÊN HỆ ZALO AN NGAY: 0905184871</a>
          </p>

          <p>An tin rằng với sự hỗ trợ của AI, việc viết bài ra đơn hay thiết kế ảnh sản phẩm của shop bạn sẽ nhanh và nhàn hơn rất nhiều. Hẹn gặp bạn trong lớp học nhé!</p>
          <p>Chúc shop của bạn luôn bão đơn!</p>
          <hr style="border: none; border-top: 1px solid #e3e9f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #5b6b7c;">Học viện AI Marketing — Võ An (0905184871)</p>
        </div>
      `
    }
  };
  return templates[type];
}

// Send Email via Resend REST API
async function sendEmail({ to, subject, html }) {
  if (!resendApiKey || resendApiKey.includes('placeholder') || resendApiKey.startsWith('re_12')) {
    console.log(`[Resend Mock Mode] Sending Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Preview): ${html.substring(0, 100).replace(/<[^>]*>/g, '')}...`);
    return { success: true, mock: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Võ An <hi@aiwithsme.com>',
        to,
        subject,
        html
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`Email sent successfully via Resend to ${to}:`, data);
      return { success: true, id: data.id };
    } else {
      console.error(`Resend API Error sending to ${to}:`, data);
      return { success: false, error: data };
    }
  } catch (err) {
    console.error(`Fetch error sending email to ${to}:`, err);
    return { success: false, error: err.message };
  }
}

// Trigger Single Scheduled Email
async function triggerScheduledEmail(row) {
  const template = getEmailTemplate(row.email_type, row.name);
  if (!template) {
    db.run("UPDATE scheduled_emails SET status = 'failed' WHERE id = ?", [row.id]);
    return;
  }
  
  const res = await sendEmail({
    to: row.email,
    subject: template.subject,
    html: template.html
  });
  
  const status = res.success ? 'sent' : 'failed';
  const sent_at = new Date().toISOString();
  db.run("UPDATE scheduled_emails SET status = ?, sent_at = ? WHERE id = ?", [status, sent_at, row.id]);
}

// Trigger Order Success Confirmation Email
function triggerOrderSuccessEmail(orderId) {
  db.get('SELECT customer_name, customer_phone, customer_email, product_name, amount, status FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order || !order.customer_email) return;
    
    console.log(`Triggering order email to ${order.customer_email} for order ${orderId}`);
    const t = getEmailTemplate('order_success', order.customer_name, {
      product_name: order.product_name,
      amount: order.amount,
      status: order.status
    });
    sendEmail({
      to: order.customer_email,
      subject: t.subject,
      html: t.html
    });

    // Automatically enroll customer in the email sequence
    const email = order.customer_email;
    const phone = order.customer_phone || '';
    const name = order.customer_name;
    const created_at = new Date().toISOString();

    db.get('SELECT id FROM customers WHERE email = ?', [email], (custErr, customer) => {
      if (custErr) return;

      const setupSequence = (customerId) => {
        // Check if they already have scheduled emails to avoid duplicate enrollment
        db.get('SELECT id FROM scheduled_emails WHERE customer_id = ?', [customerId], (schedErr, sched) => {
          if (!schedErr && !sched) {
            if (email.toLowerCase().includes('+test')) {
              console.log(`[Resend Test Mode] Triggering sequence instantly for customer ${customerId}: ${email}`);
              
              // Welcome instantly
              const wT = getEmailTemplate('welcome', name);
              sendEmail({ to: email, subject: wT.subject, html: wT.html });

              // Nurture 2s later
              setTimeout(() => {
                const nT = getEmailTemplate('nurture', name);
                sendEmail({ to: email, subject: nT.subject, html: nT.html });
              }, 2000);

              // Closing 4s later
              setTimeout(() => {
                const cT = getEmailTemplate('closing', name);
                sendEmail({ to: email, subject: cT.subject, html: cT.html });
              }, 4000);
            } else {
              // Normal Mode: Welcome instantly
              const wT = getEmailTemplate('welcome', name);
              sendEmail({ to: email, subject: wT.subject, html: wT.html });

              // Schedule Nurture (2 days later)
              const twoDaysLater = new Date();
              twoDaysLater.setDate(twoDaysLater.getDate() + 2);

              // Schedule Closing (3 days later - which is 1 day after Nurture)
              const threeDaysLater = new Date();
              threeDaysLater.setDate(threeDaysLater.getDate() + 3);

              db.run("INSERT INTO scheduled_emails (customer_id, email_type, scheduled_at) VALUES (?, 'nurture', ?)", [customerId, twoDaysLater.toISOString()]);
              db.run("INSERT INTO scheduled_emails (customer_id, email_type, scheduled_at) VALUES (?, 'closing', ?)", [customerId, threeDaysLater.toISOString()]);
            }
          }
        });
      };

      if (customer) {
        setupSequence(customer.id);
      } else {
        // Create new customer record
        db.run('INSERT INTO customers (name, phone, zalo, email, created_at) VALUES (?, ?, ?, ?, ?)',
          [name, phone, phone, email, created_at],
          function (insertErr) {
            if (!insertErr) {
              setupSequence(this.lastID);
            }
          }
        );
      }
    });
  });
}

// Background scheduler interval (checks every 1 minute)
setInterval(() => {
  const now = new Date().toISOString();
  db.all(
    "SELECT s.id, s.customer_id, s.email_type, c.name, c.email FROM scheduled_emails s JOIN customers c ON s.customer_id = c.id WHERE s.status = 'pending' AND s.scheduled_at <= ?",
    [now],
    (err, rows) => {
      if (err) {
        console.error('Error checking scheduled emails:', err);
        return;
      }
      
      rows.forEach(row => {
        // Mark as in-progress / sending to prevent double-sends
        db.run("UPDATE scheduled_emails SET status = 'sending' WHERE id = ?", [row.id], (updateErr) => {
          if (updateErr) return;
          triggerScheduledEmail(row);
        });
      });
    }
  );
}, 60000);

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple custom cookie parser middleware (avoids installing node modules)
app.use((req, res, next) => {
  req.cookies = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      req.cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  next();
});

// Intercept direct admin.html requests to prevent bypassing authentication
app.use((req, res, next) => {
  if (req.path === '/admin.html') {
    return res.redirect('/admin');
  }
  next();
});

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to SQLite database
const dbPath = path.join(__dirname, 'brain.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database:', err);
  } else {
    console.log('Connected to SQLite database: brain.db');
    // Ensure scheduled_emails table exists for Day 11 sequence email marketing
    db.run(`
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        email_type TEXT,
        scheduled_at TEXT,
        sent_at TEXT,
        status TEXT DEFAULT 'pending'
      )
    `);
  }
});

// Serve Admin Panel with authentication protection
app.get('/admin', (req, res) => {
  if (req.cookies.admin_session === ADMIN_SESSION_TOKEN) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

// Admin Login API
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.cookie('admin_session', ADMIN_SESSION_TOKEN, {
      path: '/',
      httpOnly: true,
      maxAge: 86400 * 1000, // 24 hours
      sameSite: 'strict'
    });
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false, error: 'Sai tài khoản hoặc mật khẩu' });
  }
});

// Admin Logout API
app.post('/api/admin/logout', (req, res) => {
  res.cookie('admin_session', '', {
    path: '/',
    expires: new Date(0),
    httpOnly: true
  });
  res.json({ success: true });
});

// Middleware to protect admin dashboard API endpoints
const requireAdminAuth = (req, res, next) => {
  const urlPath = req.originalUrl.split('?')[0];
  // Allow checkout and order status check to be public
  if (urlPath === '/api/orders' && req.method === 'POST') {
    return next();
  }
  if (urlPath === '/api/orders/status') {
    return next();
  }
  // Allow public waitlist registrations
  if (urlPath === '/api/customers' && req.method === 'POST') {
    return next();
  }
  
  // Check cookie authentication
  if (req.cookies.admin_session === ADMIN_SESSION_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Bạn cần đăng nhập admin' });
  }
};

// Apply auth protection for selective API routes
app.use('/api/products', requireAdminAuth);
app.use('/api/customers', requireAdminAuth);
app.use('/api/orders', requireAdminAuth);

// ================= API PRODUCTS =================
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', (req, res) => {
  const { name, type, price, description, quantity } = req.body;
  const sql = 'INSERT INTO products (name, type, price, description, quantity) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, type, price, description, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, type, price, description, quantity });
  });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, price, description, quantity } = req.body;
  const sql = 'UPDATE products SET name = ?, type = ?, price = ?, description = ?, quantity = ? WHERE id = ?';
  db.run(sql, [name, type, price, description, quantity, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM products WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API CUSTOMERS =================
app.get('/api/customers', (req, res) => {
  db.all('SELECT * FROM customers ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/customers', (req, res) => {
  const { name, phone, zalo, email } = req.body;
  
  // Server-side input validation
  const phoneRegex = /^(0[3|5|7|8|9][0-9]{8})$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Họ và tên không được để trống' });
  }
  if (!phone || !phoneRegex.test(phone.trim())) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ (yêu cầu số di động Việt Nam gồm 10 chữ số)' });
  }
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Địa chỉ email không hợp lệ (ví dụ: name@example.com)' });
  }
  
  const created_at = new Date().toISOString();
  const sql = 'INSERT INTO customers (name, phone, zalo, email, created_at) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name, phone, zalo, email, created_at], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const customerId = this.lastID;

    if (email) {
      // Check for +test email trigger
      if (email.toLowerCase().includes('+test')) {
        console.log(`[Resend Test Mode] Triggering sequence instantly for: ${email}`);
        
        // Welcome instantly
        const wT = getEmailTemplate('welcome', name);
        sendEmail({ to: email, subject: wT.subject, html: wT.html });

        // Nurture 2s later
        setTimeout(() => {
          const nT = getEmailTemplate('nurture', name);
          sendEmail({ to: email, subject: nT.subject, html: nT.html });
        }, 2000);

        // Closing 4s later
        setTimeout(() => {
          const cT = getEmailTemplate('closing', name);
          sendEmail({ to: email, subject: cT.subject, html: cT.html });
        }, 4000);

      } else {
        // Normal Mode: Welcome instantly
        const wT = getEmailTemplate('welcome', name);
        sendEmail({ to: email, subject: wT.subject, html: wT.html });

        // Schedule Nurture (2 days later)
        const twoDaysLater = new Date();
        twoDaysLater.setDate(twoDaysLater.getDate() + 2);

        // Schedule Closing (3 days later - which is 1 day after Nurture)
        const threeDaysLater = new Date();
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);

        db.run("INSERT INTO scheduled_emails (customer_id, email_type, scheduled_at) VALUES (?, 'nurture', ?)", [customerId, twoDaysLater.toISOString()]);
        db.run("INSERT INTO scheduled_emails (customer_id, email_type, scheduled_at) VALUES (?, 'closing', ?)", [customerId, threeDaysLater.toISOString()]);
      }
    }

    res.json({ id: customerId, name, phone, zalo, email, created_at });
  });
});

app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, zalo, email } = req.body;
  const sql = 'UPDATE customers SET name = ?, phone = ?, zalo = ?, email = ? WHERE id = ?';
  db.run(sql, [name, phone, zalo, email, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM customers WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API ORDERS =================
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Check order payment status
app.get('/api/orders/status', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing order id' });
  db.get('SELECT status FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Order not found' });
    res.json({ status: row.status });
  });
});

// Helper function to handle product inventory subtraction
function subtractInventory(productName, quantityToSubtract) {
  db.get('SELECT id, type, quantity FROM products WHERE name = ?', [productName], (err, product) => {
    if (!err && product && product.type === 'physical') {
      const newQty = Math.max(0, (product.quantity || 0) - quantityToSubtract);
      db.run('UPDATE products SET quantity = ? WHERE id = ?', [newQty, product.id]);
    }
  });
}

// Create new order (Frontend checkout or Admin manual)
app.post('/api/orders', (req, res) => {
  const { customer_name, customer_phone, customer_email, product_name, amount, status = 'pending' } = req.body;
  
  // Server-side input validation
  const phoneRegex = /^(0[3|5|7|8|9][0-9]{8})$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!customer_name || !customer_name.trim()) {
    return res.status(400).json({ error: 'Họ và tên không được để trống' });
  }
  if (!customer_phone || !phoneRegex.test(customer_phone.trim())) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ (yêu cầu số di động Việt Nam gồm 10 chữ số)' });
  }
  if (!customer_email || !emailRegex.test(customer_email.trim())) {
    return res.status(400).json({ error: 'Địa chỉ email không hợp lệ (ví dụ: name@example.com)' });
  }
  if (!product_name || !product_name.trim()) {
    return res.status(400).json({ error: 'Tên sản phẩm không được để trống' });
  }
  if (!amount) {
    return res.status(400).json({ error: 'Số tiền không được để trống' });
  }
  
  const created_at = new Date().toISOString();
  
  // 1. Insert order first to get ID
  const sqlOrder = 'INSERT INTO orders (customer_name, customer_phone, customer_email, product_name, amount, status, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.run(sqlOrder, [customer_name, customer_phone, customer_email, product_name, amount, status, '', created_at], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    const orderId = this.lastID;
    
    // 2. Generate unique memo: AImar + Gói học + 4 số đuôi sđt
    let pkgSuffix = 'TIEUCHUAN';
    if (product_name.includes('Cơ bản') || product_name.toLowerCase().includes('coban')) {
      pkgSuffix = 'COBAN';
    } else if (product_name.includes('Cao cấp') || product_name.toLowerCase().includes('caocap')) {
      pkgSuffix = 'CAOCAP';
    }
    const cleanPhone = (customer_phone || '').trim().replace(/\s+/g, '');
    const last4 = cleanPhone.slice(-4) || '0000';
    const memo = `AIMAR${pkgSuffix}${last4}`;
    
    db.run('UPDATE orders SET memo = ? WHERE id = ?', [memo, orderId], (updateErr) => {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      // 3. Subtract inventory if adding directly as a successful physical order
      if (status === 'success') {
        subtractInventory(product_name, 1);
      }

      // Trigger email if the order is success OR if the order was created by the admin
      const isAdmin = req.cookies.admin_session === ADMIN_SESSION_TOKEN;
      if (status === 'success' || isAdmin) {
        triggerOrderSuccessEmail(orderId);
      }
      
      // 4. Save/update customer info in parallel if phone is provided
      if (customer_phone) {
        db.get('SELECT id FROM customers WHERE phone = ?', [customer_phone], (custErr, row) => {
          if (!custErr && !row) {
            db.run('INSERT INTO customers (name, phone, email, created_at) VALUES (?, ?, ?, ?)', 
              [customer_name, customer_phone, customer_email, created_at]);
          }
        });
      }

      res.json({ id: orderId, customer_name, customer_phone, customer_email, product_name, amount, status, memo, created_at });
    });
  });
});

// Update order (Admin manual triggers / status changes)
app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, product_name, amount, status, memo } = req.body;
  
  // Get current status of order to check if we transition to success
  db.get('SELECT status, product_name FROM orders WHERE id = ?', [id], (getErr, oldOrder) => {
    if (getErr || !oldOrder) return res.status(500).json({ error: getErr ? getErr.message : 'Order not found' });
    
    const sql = 'UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, product_name = ?, amount = ?, status = ?, memo = ? WHERE id = ?';
    db.run(sql, [customer_name, customer_phone, customer_email, product_name, amount, status, memo, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // If order transitions to success from non-success, subtract inventory & email customer
      if (status === 'success' && oldOrder.status !== 'success') {
        subtractInventory(product_name, 1);
        triggerOrderSuccessEmail(id);
      }
      
      res.json({ success: true });
    });
  });
});

app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM orders WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ================= API SEPAY WEBHOOK =================
app.post('/api/sepay-webhook', (req, res) => {
  const { content, transferAmount, transferType } = req.body;
  
  console.log('Received Sepay Webhook:', { content, transferAmount, transferType });
  
  if (transferType !== 'in') {
    return res.json({ success: true, message: 'Not an incoming payment' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: 'Missing transaction content' });
  }

  // Normalize transaction content to find matching memo (e.g., content contains AIMAR12)
  const normalizedContent = content.toUpperCase().replace(/\s+/g, '');
  
  // Query all pending orders
  db.all("SELECT id, memo, product_name, status FROM orders WHERE status = 'pending'", [], (err, rows) => {
    if (err) {
      console.error('Error fetching pending orders:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    let matchedOrder = null;
    for (const row of rows) {
      if (row.memo) {
        const normalizedMemo = row.memo.toUpperCase().replace(/\s+/g, '');
        if (normalizedContent.includes(normalizedMemo)) {
          matchedOrder = row;
          break;
        }
      }
    }

    if (matchedOrder) {
      console.log(`Matched order ID ${matchedOrder.id} for memo: ${matchedOrder.memo}`);
      
      // Update order status to success
      db.run("UPDATE orders SET status = 'success' WHERE id = ?", [matchedOrder.id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating order:', updateErr);
          return res.status(500).json({ success: false, error: updateErr.message });
        }
        
        // Subtract inventory if physical product
        subtractInventory(matchedOrder.product_name, 1);
        triggerOrderSuccessEmail(matchedOrder.id);
        
        return res.json({ success: true, message: `Order ${matchedOrder.id} marked as success` });
      });
    } else {
      console.log('No matching pending order found for content:', content);
      return res.json({ success: false, message: 'No matching pending order' });
    }
  });
});

// Trả về trang chủ cho bất kỳ URL nào không khớp (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Node.js đang chạy tại cổng ${PORT}`);
});
