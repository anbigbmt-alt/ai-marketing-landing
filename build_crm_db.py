import sqlite3
import os
import json
from datetime import datetime

db_path = 'brain.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Create products table
cursor.execute('''
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('physical', 'digital', 'service')) NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    quantity INTEGER -- Can be NULL for digital/service
)
''')

# 2. Create customers table
cursor.execute('''
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    zalo TEXT,
    email TEXT,
    created_at TEXT
)
''')

# 3. Create orders table
cursor.execute('''
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    product_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'success', 'failed')) DEFAULT 'pending',
    memo TEXT,
    created_at TEXT
)
''')

# Insert sample products if empty
cursor.execute("SELECT COUNT(*) FROM products")
if cursor.fetchone()[0] == 0:
    sample_products = [
        ("Khóa học AI Marketing - Gói Cơ bản", "digital", 1500000, "Tự học qua video 8 module, nhận file prompts thực chiến.", None),
        ("Khóa học AI Marketing - Gói Tiêu chuẩn", "digital", 3500000, "Học qua video + Tham gia live Q&A hàng tuần với An + Group hỗ trợ.", None),
        ("Khóa học AI Marketing - Gói Cao cấp 1 kèm 1", "service", 7500000, "Võ An kèm riêng 1-1 qua Zoom/Zalo, review và tối ưu riêng cho shop.", None)
    ]
    cursor.executemany("INSERT INTO products (name, type, price, description, quantity) VALUES (?, ?, ?, ?, ?)", sample_products)
    print("Inserted sample products.")

# Import waitlist.json if exists, else import sample customers
imported_count = 0
waitlist_path = 'waitlist.json'
if os.path.exists(waitlist_path):
    try:
        with open(waitlist_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data:
                name = item.get('name', '')
                phone = item.get('phone', '')
                email = item.get('email', '')
                zalo = item.get('zalo', phone) # fallback to phone
                created_at = item.get('created_at', datetime.now().isoformat())
                
                # Check for duplicates
                cursor.execute("SELECT id FROM customers WHERE phone = ? OR email = ?", (phone, email))
                if not cursor.fetchone():
                    cursor.execute("INSERT INTO customers (name, phone, zalo, email, created_at) VALUES (?, ?, ?, ?, ?)",
                                   (name, phone, zalo, email, created_at))
                    imported_count += 1
        print(f"Imported {imported_count} customers from waitlist.json.")
    except Exception as e:
        print(f"Error reading waitlist.json: {e}")
else:
    # Populating sample customers to make CRM look realistic
    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        sample_customers = [
            ("Nguyễn Thị Huyền", "0912345678", "0912345678", "huyen.tiemhoa@gmail.com", datetime.now().isoformat()),
            ("Trần Văn Minh", "0987654321", "0987654321", "minh.anvat@gmail.com", datetime.now().isoformat()),
            ("Lê Quỳnh Trang", "0903334445", "0903334445", "trang.spa@gmail.com", datetime.now().isoformat()),
            ("Phạm Minh Đức", "0977888999", "0977888999", "duc.banhkem@gmail.com", datetime.now().isoformat())
        ]
        cursor.executemany("INSERT INTO customers (name, phone, zalo, email, created_at) VALUES (?, ?, ?, ?, ?)", sample_customers)
        print("No waitlist.json found. Inserted 4 sample customers from success stories.")

# Insert a sample order to make CRM look real
cursor.execute("SELECT COUNT(*) FROM orders")
if cursor.fetchone()[0] == 0:
    sample_orders = [
        ("Nguyễn Thị Huyền", "0912345678", "huyen.tiemhoa@gmail.com", "Khóa học AI Marketing - Gói Tiêu chuẩn", 3500000, "success", "AIMAR1", datetime.now().isoformat()),
        ("Trần Văn Minh", "0987654321", "minh.anvat@gmail.com", "Khóa học AI Marketing - Gói Cơ bản", 1500000, "pending", "AIMAR2", datetime.now().isoformat())
    ]
    cursor.executemany("INSERT INTO orders (customer_name, customer_phone, customer_email, product_name, amount, status, memo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", sample_orders)
    print("Inserted sample orders.")

conn.commit()
conn.close()
print("CRM tables created and populated successfully in brain.db.")
