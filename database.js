const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('phones.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, brand TEXT NOT NULL, price REAL NOT NULL,
    description TEXT, images TEXT DEFAULT '[]', cpu TEXT DEFAULT '', ram TEXT DEFAULT '', storage TEXT DEFAULT '',
    screen TEXT DEFAULT '', camera TEXT DEFAULT '', battery TEXT DEFAULT '', availability TEXT DEFAULT 'متوفر',
    is_admin INTEGER DEFAULT 1, status TEXT DEFAULT 'approved', seller_name TEXT DEFAULT '', seller_phone TEXT DEFAULT '',
    is_featured INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
    id_front TEXT NOT NULL, id_back TEXT NOT NULL, selfie TEXT NOT NULL, status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, phone_id INTEGER NOT NULL, reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL, comment TEXT, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT, image_url TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_code TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    phone TEXT UNIQUE NOT NULL,
    is_verified INTEGER DEFAULT 0,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// إضافة الأعمدة الناقصة للجداول القديمة
const cols = ['is_featured INTEGER DEFAULT 0', "availability TEXT DEFAULT 'متوفر'", "seller_name TEXT DEFAULT ''", "seller_phone TEXT DEFAULT ''"];
cols.forEach(c => { try { db.exec(`ALTER TABLE phones ADD COLUMN ${c}`); } catch (e) {} });

console.log('✅ قاعدة البيانات جاهزة - مع نظام المستخدمين الكامل');
module.exports = db;
