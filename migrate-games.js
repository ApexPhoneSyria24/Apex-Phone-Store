const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const DB = './phones.db';
const backup = `./phones.db.backup-mig-${Date.now()}`;
fs.copyFileSync(DB, backup);
console.log('✅ Backup:', backup);

const db = new DatabaseSync(DB);

const existing = db.prepare("SELECT sql FROM sqlite_master WHERE name='games'").get();
if (existing && existing.sql && existing.sql.includes('banner_url')) {
  console.log('⚠️ Schema already migrated. Exit.');
  process.exit(0);
}

db.exec('DROP TABLE IF EXISTS games');
db.exec('DROP TABLE IF EXISTS game_packages');
console.log('✅ Dropped old tables');

db.exec(`
  CREATE TABLE games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    name_ar TEXT,
    slug TEXT UNIQUE,
    image_url TEXT,
    banner_url TEXT,
    developer TEXT,
    description TEXT,
    instructions TEXT,
    delivery_time TEXT,
    refund_policy TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ Created games table');

db.exec(`
  CREATE TABLE game_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_name TEXT NOT NULL,
    package_name TEXT NOT NULL,
    price REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log('✅ Created game_packages table');

const seed = [
  { name: 'PUBG Mobile', name_ar: 'ببجي موبايل', slug: 'pubg-mobile', developer: 'Tencent Games', description: 'شحن شدات ببجي موبايل (UC) بشكل فوري وآمن.', instructions: 'أدخل Player ID الظاهر في ملفك الشخصي داخل اللعبة.', delivery_time: 'خلال 5-15 دقيقة', refund_policy: 'لا يمكن استرداد الطلب بعد الشحن. إن لم يصل الشحن تواصل مع الدعم.', sort_order: 1 },
  { name: 'Free Fire', name_ar: 'فري فاير', slug: 'free-fire', developer: 'Garena', description: 'شحن جواهر فري فاير بأفضل الأسعار وأسرع وقت.', instructions: 'أدخل Player ID من داخل اللعبة (اضغط على صورتك في الأعلى).', delivery_time: 'خلال 5-15 دقيقة', refund_policy: 'استرداد كامل في حال عدم وصول الجواهر.', sort_order: 2 },
  { name: 'Call of Duty Mobile', name_ar: 'كول أوف ديوتي', slug: 'cod-mobile', developer: 'Activision', description: 'شحن CP لكول أوف ديوتي موبايل بشكل رسمي وآمن.', instructions: 'أدخل UID الظاهر في إعدادات اللعبة.', delivery_time: 'خلال 10-30 دقيقة', refund_policy: 'استرداد في حال عدم وصول الشحن.', sort_order: 3 },
  { name: 'Jawaker', name_ar: 'جواكر', slug: 'jawaker', developer: 'Jawaker', description: 'شحن توكنز جواكر لجميع الألعاب (طرنيب، بلوت، وغيرها).', instructions: 'أدخل رقم هاتفك المسجل في جواكر.', delivery_time: 'فوري', refund_policy: 'استرداد في حال عدم وصول التوكنز.', sort_order: 4 },
  { name: 'Google Play', name_ar: 'جوجل بلاي', slug: 'google-play', developer: 'Google', description: 'بطاقات جوجل بلاي بفئات متعددة.', instructions: 'سيتم إرسال كود البطاقة عبر الإشعارات بعد الدفع.', delivery_time: 'فوري', refund_policy: 'لا يمكن استرداد البطاقات بعد إرسال الكود.', sort_order: 5 },
  { name: 'iTunes', name_ar: 'آي تيونز', slug: 'itunes', developer: 'Apple', description: 'بطاقات iTunes (App Store & Apple Music) بفئات متعددة.', instructions: 'سيتم إرسال كود البطاقة عبر الإشعارات بعد الدفع.', delivery_time: 'فوري', refund_policy: 'لا يمكن استرداد البطاقات بعد إرسال الكود.', sort_order: 6 },
  { name: 'Roblox', name_ar: 'روبلوكس', slug: 'roblox', developer: 'Roblox Corporation', description: 'شحن روبوكس (Robux) لحسابك في روبلوكس.', instructions: 'أدخل اسم المستخدم (Username) الخاص بك.', delivery_time: 'خلال 30 دقيقة - ساعة', refund_policy: 'استرداد في حال عدم وصول الروبوكس.', sort_order: 7 },
  { name: 'eFootball', name_ar: 'إي فوتبول', slug: 'efootball', developer: 'Konami', description: 'شحن عملات eFootball (eFootball Coins) لحسابك.', instructions: 'أدخل معرف اللعبة (User ID) من داخل اللعبة.', delivery_time: 'خلال 10-30 دقيقة', refund_policy: 'استرداد في حال عدم وصول العملات.', sort_order: 8 }
];

const ins = db.prepare(`INSERT INTO games (name, name_ar, slug, developer, description, instructions, delivery_time, refund_policy, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const g of seed) ins.run(g.name, g.name_ar, g.slug, g.developer, g.description, g.instructions, g.delivery_time, g.refund_policy, g.sort_order);
console.log(`✅ Seeded ${seed.length} games`);

console.log('\n🎉 DONE — games:', db.prepare('SELECT COUNT(*) c FROM games').get().c, '| packages:', db.prepare('SELECT COUNT(*) c FROM game_packages').get().c);
