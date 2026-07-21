import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database and file paths relative to project root
const dbPath = path.resolve(__dirname, "..", "brain.db");
const publicIndexPath = path.resolve(__dirname, "..", "public", "index.html");

const server = new McpServer({
  name: "my-business",
  version: "1.0.0",
});

// Helper to query SQLite
function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) return reject(err);
    });

    db.all(sql, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// 1. Tool: biz__get_today_orders
server.tool(
  "biz__get_today_orders",
  "Báo cáo danh sách đơn hàng và tổng doanh thu phát sinh trong ngày hôm nay.",
  {},
  async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const sql = "SELECT * FROM orders WHERE created_at LIKE ?";
      const rows = await queryDb(sql, [`${todayStr}%`]);

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: `Không có đơn hàng nào phát sinh hôm nay (${todayStr}).` }],
        };
      }

      let totalRevenue = 0;
      let ordersText = `Danh sách đơn hàng ngày ${todayStr}:\n`;
      rows.forEach((row, i) => {
        totalRevenue += row.amount;
        ordersText += `${i + 1}. Khách: ${row.customer_name} - SĐT: ${row.customer_phone} - Gói: ${row.product_name} - Số tiền: ${row.amount.toLocaleString("vi-VN")}đ - Trạng thái: ${row.status}\n`;
      });

      ordersText += `\nTổng doanh thu trong ngày: ${totalRevenue.toLocaleString("vi-VN")}đ`;

      return {
        content: [{ type: "text", text: ordersText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Lỗi khi đọc dữ liệu đơn hàng: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// 2. Tool: biz__list_waitlist
server.tool(
  "biz__list_waitlist",
  "Hiển thị danh sách khách hàng mới đăng ký tư vấn gần đây (Waitlist) từ database.",
  {
    limit: z.number().optional().default(10).describe("Số lượng khách hàng cần lấy"),
  },
  async ({ limit }) => {
    try {
      const sql = "SELECT * FROM customers ORDER BY created_at DESC LIMIT ?";
      const rows = await queryDb(sql, [limit]);

      if (rows.length === 0) {
        return {
          content: [{ type: "text", text: "Danh sách khách hàng đang trống." }],
        };
      }

      let customersText = `Danh sách ${rows.length} khách hàng đăng ký gần nhất:\n`;
      rows.forEach((row, i) => {
        const dateStr = row.created_at ? row.created_at.substring(0, 16).replace("T", " ") : "N/A";
        customersText += `${i + 1}. Tên: ${row.name} - SĐT: ${row.phone} - Email: ${row.email} - Đăng ký lúc: ${dateStr}\n`;
      });

      return {
        content: [{ type: "text", text: customersText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Lỗi khi đọc dữ liệu khách hàng: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// 3. Tool: biz__update_hero_title
server.tool(
  "biz__update_hero_title",
  "Cập nhật nội dung tiêu đề chính (thẻ h1) ở phần Hero section trên Landing Page.",
  {
    newTitle: z.string().describe("Nội dung tiêu đề mới, có thể chứa thẻ HTML cơ bản như <span class=\"hl\">chữ nổi bật</span>"),
  },
  async ({ newTitle }) => {
    try {
      if (!fs.existsSync(publicIndexPath)) {
        return {
          content: [{ type: "text", text: `Lỗi: Không tìm thấy file index.html tại ${publicIndexPath}` }],
          isError: true,
        };
      }

      let html = fs.readFileSync(publicIndexPath, "utf8");

      // Replace <h1>...</h1> in index.html
      const h1Regex = /<h1>[\s\S]*?<\/h1>/;
      if (!h1Regex.test(html)) {
        return {
          content: [{ type: "text", text: "Lỗi: Không tìm thấy thẻ h1 trong file index.html." }],
          isError: true,
        };
      }

      const updatedHtml = html.replace(h1Regex, `<h1>${newTitle}</h1>`);
      fs.writeFileSync(publicIndexPath, updatedHtml, "utf8");

      return {
        content: [{ type: "text", text: `Cập nhật tiêu đề trang chủ thành công!\nTiêu đề mới: "${newTitle}"` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Lỗi khi cập nhật tiêu đề: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Setup Express server to host the Streamable HTTP transport
const app = express();
app.use(express.json());

app.all("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport();
  
  res.on("close", () => {
    transport.close().catch(console.error);
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[MCP Server] running on http://0.0.0.0:${PORT}/mcp`);
});
