const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Phục vụ các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Trả về trang chủ cho bất kỳ URL nào không khớp
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server Node.js đang chạy tại cổng ${PORT}`);
});
