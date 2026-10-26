const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const compression = require('compression');

// ===== Auto-Migrate (Safe) =====
try {
  db.exec(`CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`);
  db.exec(`CREATE TABLE IF NOT EXISTS game_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, game_name TEXT NOT NULL)`);

  const gamesCols = db.prepare("PRAGMA table_info(games)").all().map(c => c.name);
  const addGameCol = (col, type) => { if (!gamesCols.includes(col)) db.exec(`ALTER TABLE games ADD COLUMN ${col} ${type}`); };
  addGameCol('name_ar', 'TEXT'); addGameCol('slug', 'TEXT'); addGameCol('image_url', 'TEXT'); addGameCol('banner_url', 'TEXT');
  addGameCol('developer', 'TEXT'); addGameCol('description', 'TEXT'); addGameCol('instructions', 'TEXT');
  addGameCol('delivery_time', 'TEXT'); addGameCol('refund_policy', 'TEXT'); addGameCol('is_active', 'INTEGER DEFAULT 1');
  addGameCol('sort_order', 'INTEGER DEFAULT 0'); addGameCol('created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  const pkgCols = db.prepare("PRAGMA table_info(game_packages)").all().map(c => c.name);
  const addPkgCol = (col, type) => { if (!pkgCols.includes(col)) db.exec(`ALTER TABLE game_packages ADD COLUMN ${col} ${type}`); };
  addPkgCol('package_name', 'TEXT'); addPkgCol('price', 'REAL'); addPkgCol('is_active', 'INTEGER DEFAULT 1'); addPkgCol('sort_order', 'INTEGER DEFAULT 0'); addPkgCol('created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP');

  try {
    const orderCols = db.prepare("PRAGMA table_info(topup_orders)").all().map(c => c.name);
    if (!orderCols.includes('payment_method')) db.exec("ALTER TABLE topup_orders ADD COLUMN payment_method TEXT DEFAULT 'manual'");
  } catch(e) {}

  try {
    const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!userCols.includes('balance')) db.exec("ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0");
  } catch(e) {}

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS wallet_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_phone TEXT NOT NULL,
      amount_usd REAL NOT NULL, amount_syp REAL NOT NULL,
      transfer_ref TEXT, receipt_image TEXT, status TEXT DEFAULT 'pending',
      rejection_reason TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch(e) {}

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, ip TEXT, user_agent TEXT, path TEXT, user_phone TEXT, device_type TEXT, country TEXT, city TEXT, visitor_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    const vCols = db.prepare("PRAGMA table_info(visits)").all().map(c => c.name);
    if (!vCols.includes('country')) db.exec("ALTER TABLE visits ADD COLUMN country TEXT");
    if (!vCols.includes('city')) db.exec("ALTER TABLE visits ADD COLUMN city TEXT");
    if (!vCols.includes('visitor_id')) db.exec("ALTER TABLE visits ADD COLUMN visitor_id TEXT");
  } catch(e) {}

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, visitor_id TEXT NOT NULL,
      sender TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS chat_sessions (
      visitor_id TEXT PRIMARY KEY, status TEXT DEFAULT 'open', rating INTEGER DEFAULT 0,
      feedback TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch(e) {}

  const gameCount = db.prepare('SELECT COUNT(*) c FROM games').get().c;
  if (gameCount === 0) {
    const seed = [
      ['PUBG Mobile','ببجي موبايل','pubg-mobile','Tencent Games','شحن شدات ببجي موبايل (UC) بشكل فوري وآمن.','أدخل Player ID الظاهر في ملفك الشخصي داخل اللعبة.','خلال 5-15 دقيقة','لا يمكن استرداد الطلب بعد الشحن.',1],
      ['Free Fire','فري فاير','free-fire','Garena','شحن جواهر فري فاير بأفضل الأسعار وأسرع وقت.','أدخل Player ID من داخل اللعبة.','خلال 5-15 دقيقة','استرداد كامل في حال عدم وصول الجواهر.',2],
      ['Call of Duty Mobile','كول أوف ديوتي','cod-mobile','Activision','شحن CP لكول أوف ديوتي موبايل بشكل رسمي وآمن.','أدخل UID الظاهر في إعدادات اللعبة.','خلال 10-30 دقيقة','استرداد في حال عدم وصول الشحن.',3],
      ['Jawaker','جواكر','jawaker','Jawaker','شحن توكنز جواكر لجميع الألعاب.','أدخل رقم هاتفك المسجل في جواكر.','فوري','استرداد في حال عدم وصول التوكنز.',4],
      ['Google Play','جوجل بلاي','google-play','Google','بطاقات جوجل بلاي بفئات متعددة.','سيتم إرسال كود البطاقة عبر الإشعارات بعد الدفع.','فوري','لا يمكن استرداد البطاقات بعد إرسال الكود.',5],
      ['iTunes','آي تيونز','itunes','Apple','بطاقات iTunes بفئات متعددة.','سيتم إرسال الكود عبر الإشعارات.','فوري','لا يمكن استرداد البطاقات بعد إرسال الكود.',6],
      ['Roblox','روبلوكس','roblox','Roblox Corporation','شحن روبوكس (Robux) لحسابك.','أدخل اسم المستخدم (Username).','خلال 30 دقيقة - ساعة','استرداد في حال عدم وصول الروبوكس.',7],
      ['eFootball','إي فوتبول','efootball','Konami','شحن عملات eFootball لحسابك.','أدخل معرف اللعبة (User ID).','خلال 10-30 دقيقة','استرداد في حال عدم وصول العملات.',8]
    ];
    const ins = db.prepare('INSERT INTO games (name, name_ar, slug, developer, description, instructions, delivery_time, refund_policy, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    seed.forEach(g => ins.run(...g));
  }
} catch(e) { console.error('Migration Error:', e.message); }

// ===== Telegram Setup =====
const TELEGRAM_TOKEN = '8953449632:AAEimtiSqDpeBnse6bnTKyU1xAhkvIvltsg';
const TELEGRAM_CHAT_ID = '5785915708';

async function sendTelegram(message) {
  try {
    console.log('Sending Telegram notification...');
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram API Error:', data.description);
    else console.log('Telegram sent successfully');
  } catch(err) { console.error('Telegram Fetch Error:', err.message); }
}

const app = express();
const PORT = 3000;

app.use(compression());
app.use(session({ secret: 'apex-secret', resave: false, saveUninitialized: true, cookie: { maxAge: 86400000 } }));

const uploadDir = './public/uploads';
const privateDir = './private_docs';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(privateDir)) fs.mkdirSync(privateDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage, limits: { files: 8 } });

const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, privateDir),
  filename: (req, file, cb) => cb(null, 'doc-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const uploadPrivate = multer({ storage: privateStorage });

app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/uploads', express.static('public/uploads', { maxAge: '30d', immutable: true }));
app.use('/css', express.static('public/css', { maxAge: '7d' }));
app.use(express.static('public'));

// ===== Visitor Tracking (Silent) =====
app.use((req, res, next) => {
  if (req.path.startsWith('/css') || req.path.startsWith('/uploads') || req.path.startsWith('/admin') || req.path === '/favicon.ico') return next();
  try {
    const ipHeader = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    let cleanIp = ipHeader.split(',')[0].trim().replace('::ffff:', '');
    let isLocal = false;
    if (cleanIp === '::1' || cleanIp.startsWith('127.') || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) isLocal = true;

    const ua = req.headers['user-agent'] || 'Unknown';
    let device = 'كمبيوتر'; if (/mobile/i.test(ua)) device = 'هاتف'; if (/tablet|ipad/i.test(ua)) device = 'تابلت';
    let os = 'غير معروف'; if (/android/i.test(ua)) os = 'Android'; else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'; else if (/windows/i.test(ua)) os = 'Windows'; else if (/mac/i.test(ua)) os = 'Mac';

    let visitorId = null;
    if (req.headers.cookie) {
      const cookies = req.headers.cookie.split(';');
      for (let c of cookies) { if (c.trim().startsWith('apex_visitor_id=')) { visitorId = c.split('=')[1]; break; } }
    }
    if (!visitorId) {
      visitorId = 'VIS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      res.setHeader('Set-Cookie', 'apex_visitor_id=' + visitorId + '; Max-Age=31536000; Path=/;');
    }

    const stmt = db.prepare('INSERT INTO visits (ip, user_agent, path, device_type, visitor_id) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(cleanIp, ua, req.path, device + ' / ' + os, visitorId);
    const visitId = info.lastInsertRowid;

    if (isLocal) {
      db.prepare('UPDATE visits SET country = ?, city = ? WHERE id = ?').run('سوريا (محلي)', 'دمشق', visitId);
    } else {
      fetch('https://ipwho.is/' + cleanIp).then(r => r.json()).then(data => {
        if (data && data.success) db.prepare('UPDATE visits SET country = ?, city = ? WHERE id = ?').run(data.country || 'غير معروف', data.city || 'غير معروف', visitId);
      }).catch(() => {});
    }
  } catch(e) { }
  next();
});

// ===== AI Chatbot (Mimo) - Robust Version =====


app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, user_phone, visitor_id } = req.body;
    if (!message) return res.status(400).json({ reply: 'الرجاء كتابة رسالة.' });

    const phones = db.prepare("SELECT name, brand, price, description FROM phones WHERE status = 'approved' LIMIT 10").all();
    
    let systemPrompt = `أنت "ميمو" (Mimo)، وكيل مبيعات محترف وذكي في متجر Apex Phone Syria.
شخصيتك: خبير، ودود جداً، مقنع، وتتحدث بأسلوب راقٍ.
مهمتك: مساعدة الزبون في اختيار هاتف وبناء الثقة.

⚠️ قواعد صارمة:
1. لا تقل أبداً "أنا ذكاء اصطناعي".
2. إجاباتك مختصرة وذكية.
3. إذا أراد الزبون شراء هاتف، رشح له الأنسب من القائمة، واسأله إن كان يناسبه.
4. إذا وافق الزبون على جهاز معين، اطلب منه تزويدك بـ:
   أ) الاسم الثلاثي.
   ب) رقم الهاتف.
   ج) مكان التسليم (المحافظة والمنطقة).
5. بمجرد أن يعطيك الزبون هذه المعلومات الثلاثة، قل له: "تم تسجيل طلبك بنجاح يا [اسم الزبون]! سيتواصل معك فريقنا قريباً لتأكيد التفاصيل." 
6. **هام جداً:** في نهاية رسالتك (بعد كلمة النجاح)، يجب أن تضيف هذا الوسم المخفي بالضبط:
   [[NEW_ORDER|Name: الاسم_الثلاثي|Phone: رقم_الهاتف|Address: مكان_التسليم|Product: اسم_الهاتف]]
7. لا تضع هذا الوسم إلا إذا أعطاك الزبون المعلومات الثلاثة كاملة.

الهواتف المتاحة:
${phones.map(p => `- ${p.name} بسعر $${p.price}`).join('\n')}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ reply: '⚠️ المفتاح غير موجود في السيرفر.' });

    let contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => { contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }); });
    }
    contents.push({ role: 'user', parts: [{ text: systemPrompt + "\n\nرسالة الزبون الآن: " + message }] });

    async function fetchGemini(modelName) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: contents })
      });
    }

    let rawReply = null;
    
    try {
      let response = await fetchGemini('gemini-2.0-flash');
      let data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        rawReply = data.candidates[0].content.parts[0].text;
      }
    } catch(e) { }

    if (!rawReply) {
      try {
        let fbResponse = await fetchGemini('gemini-3.5-flash-lite');
        let fbData = await fbResponse.json();
        if (fbData.candidates && fbData.candidates[0] && fbData.candidates[0].content) {
          rawReply = fbData.candidates[0].content.parts[0].text;
        }
      } catch(e) { }
    }

    if (!rawReply) {
      return res.json({ reply: 'أعتذر منك، هناك ضغط كبير على الخوادم حالياً. يرجى المحاولة بعد قليل. 🙏' });
    }

    // فحص وجود طلب جديد في رد ميمو
    let cleanReply = rawReply;
    const orderRegex = /\[\[NEW_ORDER\|Name:\s*(.*?)\|Phone:\s*(.*?)\|Address:\s*(.*?)\|Product:\s*(.*?)\]\]/;
    const match = rawReply.match(orderRegex);

    if (match) {
      const [fullMatch, name, phone, address, product] = match;
      cleanReply = rawReply.replace(fullMatch, '').trim(); // إزالة الوسم من الرسالة التي تظهر للزبون
      
      const orderMessage = `🤖 **طلب جديد من ميمو (الذكاء الاصطناعي):**\n👤 الاسم: ${name}\n📞 الرقم: ${phone}\n📍 المكان: ${address}\n📱 المنتج: ${product}`;
      
      // حفظ الطلب في الدردشة الحية لكي يظهر لك أنت
      if (visitor_id) {
        db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'visitor', ?)").run(visitor_id, orderMessage);
      }
      
      // إرسال إشعار تيليجرام لك
      sendTelegram(`🛒 <b>طلب هاتف جديد عبر ميمو!</b>\n\n👤 الاسم: ${name}\n📞 الهاتف: ${phone}\n📍 العنوان: ${address}\n📱 الجهاز: ${product}`);
    }

    res.json({ reply: cleanReply });

  } catch (e) {
    console.error(e);
    res.json({ reply: 'عذراً، حدث خطأ مؤقت. يرجى المحاولة لاحقاً.' });
  }
});

// ===== Live Chat API =====
app.post('/api/human-chat/init', (req, res) => {
  try {
    const { visitor_id } = req.body;
    if (!visitor_id) return res.status(400).json({ error: 'Missing ID' });
    let session = db.prepare("SELECT status FROM chat_sessions WHERE visitor_id = ?").get(visitor_id);
    if (!session || session.status === 'closed') {
      if (!session) db.prepare("INSERT INTO chat_sessions (visitor_id, status) VALUES (?, 'open')").run(visitor_id);
      else {
        db.prepare("UPDATE chat_sessions SET status = 'open' WHERE visitor_id = ?").run(visitor_id);
        db.prepare("DELETE FROM chat_messages WHERE visitor_id = ?").run(visitor_id); 
      }
      const welcomeMsg = "مرحباً بك في دعم Apex Phone! 👋\\nتم استلام طلبك بنجاح، ونحن الآن نبحث لك عن أحد المطورين للرد عليك في أسرع وقت. يرجى البقاء معنا... ⏳";
      db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'admin', ?)").run(visitor_id, welcomeMsg);
      sendTelegram(`🔔 <b>زبون بدأ محادثة جديدة!</b>\\nالزائر: ${visitor_id}`);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/human-chat/send', (req, res) => {
  try {
    const { visitor_id, message } = req.body;
    if (!visitor_id || !message) return res.status(400).json({ error: 'بيانات ناقصة' });
    
    let session = db.prepare("SELECT status FROM chat_sessions WHERE visitor_id = ?").get(visitor_id);
    if (!session) {
      db.prepare("INSERT INTO chat_sessions (visitor_id, status) VALUES (?, 'open')").run(visitor_id);
    } else if (session.status === 'closed') {
      db.prepare("UPDATE chat_sessions SET status = 'open' WHERE visitor_id = ?").run(visitor_id);
      const welcomeMsg = "مرحباً بك مجدداً! 👋\\nجاري البحث عن وكيل جديد للرد عليك... ⏳";
      db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'admin', ?)").run(visitor_id, welcomeMsg);
      sendTelegram(`🔔 <b>زبون بدأ محادثة جديدة!</b>\\nالزائر: ${visitor_id}`);
    }
    
    db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'visitor', ?)").run(visitor_id, message);
    
    // إرسال الإشعار بقوة
    sendTelegram(`💬 <b>رسالة جديدة في الدردشة الحية!</b>\\nالزائر: ${visitor_id}\\nالرسالة: ${message}`);
    
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/human-chat/messages/:visitorId', (req, res) => {
  try {
    const msgs = db.prepare("SELECT * FROM chat_messages WHERE visitor_id = ? ORDER BY id ASC").all(req.params.visitorId);
    const session = db.prepare("SELECT status, rating FROM chat_sessions WHERE visitor_id = ?").get(req.params.visitorId) || { status: 'open', rating: 0 };
    res.json({ messages: msgs, status: session.status, rating: session.rating });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/human-chat/rate', (req, res) => {
  try {
    const { visitor_id, rating, feedback } = req.body;
    db.prepare("UPDATE chat_sessions SET rating = ?, feedback = ? WHERE visitor_id = ?").run(rating, feedback || '', visitor_id);
    sendTelegram(`⭐ <b>تقييم جديد!</b>\\nالزائر: ${visitor_id}\\nالتقييم: ${'⭐'.repeat(rating)}\\nملاحظات: ${feedback || 'لا يوجد'}`);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/chat/close/:visitorId', requireAuth, (req, res) => {
  try {
    db.prepare("UPDATE chat_sessions SET status = 'closed' WHERE visitor_id = ?").run(req.params.visitorId);
    const closeMsg = "شكراً لتواصلك مع الدعم! 🌟\\nهل تريد بدء محادثة جديدة مع وكيل آخر؟";
    db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'system', ?)").run(req.params.visitorId, closeMsg);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/chat/messages/:visitorId', requireAuth, (req, res) => {
  db.prepare("UPDATE chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender = 'visitor'").run(req.params.visitorId);
  const msgs = db.prepare("SELECT * FROM chat_messages WHERE visitor_id = ? ORDER BY id ASC").all(req.params.visitorId);
  const session = db.prepare("SELECT * FROM chat_sessions WHERE visitor_id = ?").get(req.params.visitorId) || { status: 'open', rating: 0, feedback: '' };
  res.json({ messages: msgs, session });
});

app.post('/api/admin/chat/send', requireAuth, (req, res) => {
  try {
    const { visitor_id, message } = req.body;
    db.prepare("INSERT INTO chat_messages (visitor_id, sender, message) VALUES (?, 'admin', ?)").run(visitor_id, message);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ===== Admin Chat Routes =====
app.get('/admin/chats', requireAuth, (req, res) => {
  try {
    const chats = db.prepare(`
      SELECT c.visitor_id, MAX(c.created_at) as last_time,
      (SELECT COUNT(*) FROM chat_messages c2 WHERE c2.visitor_id = c.visitor_id AND c2.sender = 'visitor' AND c2.is_read = 0) as unread,
      (SELECT message FROM chat_messages c3 WHERE c3.visitor_id = c.visitor_id ORDER BY id DESC LIMIT 1) as last_msg,
      COALESCE(s.status, 'open') as status, COALESCE(s.rating, 0) as rating
      FROM chat_messages c LEFT JOIN chat_sessions s ON c.visitor_id = s.visitor_id
      GROUP BY c.visitor_id ORDER BY last_time DESC
    `).all();
    res.render('admin-chats', { chats });
  } catch (err) { res.send("حدث خطأ في تحميل الدردشات: " + err.message); }
});

app.get('/admin/chats/:visitorId', requireAuth, (req, res) => {
  db.prepare("UPDATE chat_messages SET is_read = 1 WHERE visitor_id = ? AND sender = 'visitor'").run(req.params.visitorId);
  const session = db.prepare("SELECT * FROM chat_sessions WHERE visitor_id = ?").get(req.params.visitorId) || { status: 'open', rating: 0, feedback: '' };
  res.render('admin-chat-room', { visitorId: req.params.visitorId, session });
});

// ===== Notifications & Balance API =====
app.post('/api/notifications/welcome', (req, res) => {
  const { phone } = req.body; if (!phone) return res.json({ success: false });
  const existing = db.prepare("SELECT id FROM notifications WHERE phone = ? AND message LIKE '%أهلاً بك%'").get(phone);
  if (!existing) db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone, '👑 أهلاً بك في Apex فون!');
  res.json({ success: true });
});
app.get('/api/notifications/:phone', (req, res) => { res.json(db.prepare('SELECT * FROM notifications WHERE phone = ? ORDER BY id DESC').all(req.params.phone)); });
app.post('/api/notifications/read/:phone', (req, res) => { db.prepare('UPDATE notifications SET is_read = 1 WHERE phone = ?').run(req.params.phone); res.json({ success: true }); });

app.get('/api/user-balance/:phone', (req, res) => {
  try {
    const user = db.prepare('SELECT balance FROM users WHERE phone = ?').get(req.params.phone);
    res.json({ balance: user ? user.balance : 0 });
  } catch(e) { res.json({ balance: 0 }); }
});

function generateUserCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = 'APX-';
  for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
function getOrCreateUser(name, phone) {
  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (user) return user;
  let code; do { code = generateUserCode(); } while (db.prepare('SELECT id FROM users WHERE user_code = ?').get(code));
  db.prepare('INSERT INTO users (user_code, name, phone) VALUES (?, ?, ?)').run(code, name || '', phone);
  return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

// ===== Home & SEO =====
app.get('/', (req, res) => {
  let query = "SELECT * FROM phones WHERE status = 'approved'"; const params = [];
  query += " AND (is_admin = 1 OR seller_phone NOT IN (SELECT phone FROM users WHERE is_banned = 1))";
  if (req.query.search) { query += ' AND (name LIKE ? OR brand LIKE ?)'; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  if (req.query.brand) { query += ' AND brand = ?'; params.push(req.query.brand); }
  let sort = req.query.sort || 'default';
  if (sort === 'price_asc') query += ' ORDER BY price ASC'; else if (sort === 'price_desc') query += ' ORDER BY price DESC'; else if (sort === 'newest') query += ' ORDER BY id DESC'; else query += ' ORDER BY is_featured DESC, is_admin DESC, id DESC';
  const isViewAll = req.query.view === 'all'; if (!isViewAll && !req.query.search) query += ' LIMIT 12';
  const phones = db.prepare(query).all(...params);
  const totalPhonesCount = db.prepare("SELECT COUNT(*) as count FROM phones WHERE status = 'approved'").get().count;
  const brands = db.prepare("SELECT DISTINCT brand FROM phones WHERE status = 'approved'").all().map(b => b.brand);
  const verifiedPhones = db.prepare("SELECT phone FROM users WHERE is_verified = 1").all().map(v => v.phone);
  const banners = db.prepare('SELECT * FROM banners ORDER BY id DESC').all();
  res.render('index', { phones, brands, verifiedPhones, banners, search: req.query.search || '', activeBrand: req.query.brand || '', currentSort: sort, isViewAll, totalPhonesCount });
});

app.get('/sitemap.xml', (req, res) => {
  const phones = db.prepare("SELECT id FROM phones WHERE status = 'approved'").all();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <url><loc>https://apexphonesyria.online/</loc><priority>1.0</priority></url>\n';
  phones.forEach(p => { xml += `  <url><loc>https://apexphonesyria.online/phone/${p.id}</loc><priority>0.8</priority></url>\n`; });
  xml += '</urlset>'; res.header('Content-Type', 'application/xml'); res.send(xml);
});
app.get('/robots.txt', (req, res) => { res.type('text/plain'); res.send("User-agent: *\nAllow: /\nSitemap: https://apexphonesyria.online/sitemap.xml"); });

app.get('/phone/:id', (req, res) => {
  const phone = db.prepare('SELECT * FROM phones WHERE id = ?').get(req.params.id);
  if (!phone || phone.status !== 'approved') return res.redirect('/');
  const reviews = db.prepare("SELECT * FROM reviews WHERE phone_id = ? AND status = 'approved' ORDER BY id DESC").all(req.params.id);
  const isVerified = db.prepare("SELECT id FROM users WHERE phone = ? AND is_verified = 1").get(phone.seller_phone);
  res.render('details', { phone, reviews, isVerified });
});
app.post('/phone/:id/review', (req, res) => {
  const { reviewer_name, rating, comment } = req.body;
  db.prepare("INSERT INTO reviews (phone_id, reviewer_name, rating, comment) VALUES (?, ?, ?, ?)").run(req.params.id, reviewer_name, rating, comment);
  res.redirect('/phone/' + req.params.id + '?review=success');
});

app.get('/verify-account', (req, res) => { res.render('verify-account'); });
app.post('/verify-account', uploadPrivate.fields([{ name: 'id_front', maxCount: 1 }, { name: 'id_back', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), (req, res) => {
  const b = req.body; const f = req.files;
  if (f['id_front'] && f['id_back'] && f['selfie']) {
    const user = getOrCreateUser(b.name, b.phone);
    db.prepare(`INSERT INTO verifications (name, phone, id_front, id_back, selfie) VALUES (?, ?, ?, ?, ?)`).run(b.name, b.phone, f['id_front'][0].filename, f['id_back'][0].filename, f['selfie'][0].filename);
    res.render('verify-success', { userCode: user.user_code, phone: b.phone });
  } else { res.redirect('/verify-account'); }
});

app.get('/post-ad', (req, res) => { res.render('post-ad'); });
app.post('/post-ad', upload.array('images', 8), (req, res) => {
  const b = req.body;
  const banned = db.prepare('SELECT id FROM users WHERE phone = ? AND is_banned = 1').get(b.seller_phone);
  if (banned) return res.send('<div style="text-align:center;padding:50px;"><h2>🚫 حسابك محظور</h2><a href="/">العودة</a></div>');
  const user = getOrCreateUser(b.seller_name, b.seller_phone);
  const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
  db.prepare(`INSERT INTO phones (name, brand, price, description, images, availability, is_admin, status, seller_name, seller_phone) VALUES (?, ?, ?, ?, ?, 'متوفر', 0, 'pending', ?, ?)`).run(b.name, b.brand, b.price, b.description, JSON.stringify(images), b.seller_name, b.seller_phone);
  res.render('ad-success', { sellerPhone: b.seller_phone, userCode: user.user_code });
});
app.get('/policy', (req, res) => { res.render('policy'); });

// ===== Games =====
app.get('/games', (req, res) => {
  const games = db.prepare(`SELECT g.*, (SELECT COUNT(*) FROM game_packages p WHERE p.game_name = g.name AND p.is_active = 1) as packages_count FROM games g WHERE g.is_active = 1 ORDER BY g.sort_order ASC, g.id ASC`).all();
  res.render('games', { games });
});
app.get('/games/:gameName', (req, res) => {
  const gameName = req.params.gameName;
  const game = db.prepare("SELECT * FROM games WHERE name = ? OR slug = ?").get(gameName, gameName);
  if (!game) return res.redirect('/games');
  const packages = db.prepare("SELECT * FROM game_packages WHERE game_name = ? AND is_active = 1 ORDER BY sort_order ASC, price ASC").all(game.name);
  res.render('game-details', { game, packages });
});
app.post('/games/:gameName/order', (req, res) => {
  const { player_id, package_name, price, user_phone, payment_method } = req.body;
  const priceNum = parseFloat(price);
  const gameName = req.params.gameName;
  try {
    if (payment_method === 'wallet') {
      const user = db.prepare('SELECT balance FROM users WHERE phone = ?').get(user_phone);
      if (!user) return res.status(400).json({ success: false, message: 'رقم الهاتف غير مسجل. يرجى شحن رصيدك أولاً.' });
      if (user.balance < priceNum) return res.status(400).json({ success: false, message: 'عذراً، رصيدك غير كافٍ لإتمام الطلب.' });
      db.prepare('UPDATE users SET balance = balance - ? WHERE phone = ?').run(priceNum, user_phone);
      db.prepare(`INSERT INTO topup_orders (game_name, package_name, player_id, price, user_phone, payment_method, status) VALUES (?, ?, ?, ?, ?, 'wallet', 'pending')`).run(gameName, package_name, player_id, priceNum, user_phone);
      db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user_phone, `💳 تم خصم $${priceNum} من محفظتك لطلب ${package_name} في ${gameName}`);
      sendTelegram(`🎮 <b>طلب شحن (محفظة)!</b>\nاللعبة: ${gameName}\nالباقة: ${package_name}\nالهاتف: ${user_phone}\nالسعر: $${priceNum}`);
      res.json({ success: true, message: 'تم الدفع من المحفظة بنجاح!' });
    } else {
      db.prepare(`INSERT INTO topup_orders (game_name, package_name, player_id, price, user_phone, payment_method) VALUES (?, ?, ?, ?, ?, 'manual')`).run(gameName, package_name, player_id, priceNum, user_phone);
      sendTelegram(`🎮 <b>طلب شحن (يدوي)!</b>\nاللعبة: ${gameName}\nالباقة: ${package_name}\nالهاتف: ${user_phone}\nالسعر: $${priceNum}`);
      res.json({ success: true, message: 'تم إرسال الطلب بنجاح' });
    }
  } catch(e) { res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر' }); }
});
app.get('/api/topup-orders/:phone', (req, res) => { res.json(db.prepare("SELECT * FROM topup_orders WHERE user_phone = ? ORDER BY id DESC LIMIT 10").all(req.params.phone)); });

// ===== Wallet Topup =====
app.get('/topup-balance', (req, res) => {
  let userBalance = 0;
  if (req.query.phone) {
    const user = db.prepare('SELECT balance FROM users WHERE phone = ?').get(req.query.phone);
    if (user) userBalance = user.balance;
  }
  res.render('topup-balance', { userBalance, phoneQuery: req.query.phone || '', success: req.query.success });
});

app.post('/topup-balance', upload.single('receipt'), (req, res) => {
  const { phone, amount_usd, transfer_ref } = req.body;
  const amount_syp = parseFloat(amount_usd) * 142;
  const receipt_image = req.file ? '/uploads/' + req.file.filename : null;
  let user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
  if (!user) db.prepare('INSERT INTO users (user_code, name, phone) VALUES (?, ?, ?)').run(generateUserCode(), 'زبون', phone);
  db.prepare(`INSERT INTO wallet_deposits (user_phone, amount_usd, amount_syp, transfer_ref, receipt_image) VALUES (?, ?, ?, ?, ?)`).run(phone, amount_usd, amount_syp, transfer_ref, receipt_image);
  sendTelegram(`💰 <b>طلب إيداع جديد!</b>\nالهاتف: ${phone}\nالمبلغ: $${amount_usd}`);
  res.redirect('/topup-balance?phone=' + phone + '&success=1');
});

// ===== Admin Login =====
const ADMIN_PASSWORD = "0962730078@0962";
app.get('/admin/login', (req, res) => { if (req.session.isAdmin) return res.redirect('/admin'); res.render('admin-login', { error: null }); });
app.post('/admin/login', (req, res) => { if (req.body.password === ADMIN_PASSWORD) { req.session.isAdmin = true; return res.redirect('/admin'); } res.render('admin-login', { error: '❌ كلمة المرور غير صحيحة.' }); });
app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
function requireAuth(req, res, next) { if (req.session.isAdmin) return next(); res.redirect('/admin/login'); }

// ===== Admin Dashboard =====
app.get('/admin', requireAuth, (req, res) => {
  const phones = db.prepare('SELECT * FROM phones ORDER BY id DESC LIMIT 100').all();
  let pendingDeposits = [];
  try { pendingDeposits = db.prepare("SELECT * FROM wallet_deposits WHERE status = 'pending' ORDER BY id DESC").all(); } catch(e) {}
  const stats = {
    adminPhonesCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE is_admin=1 AND status='approved'").get().c,
    userAdsCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE is_admin=0 AND status='approved'").get().c,
    pendingCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE status='pending'").get().c,
    soldCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE availability='تم البيع'").get().c,
    verificationsCount: db.prepare("SELECT COUNT(*) c FROM verifications WHERE status='pending'").get().c,
    reviewsCount: db.prepare("SELECT COUNT(*) c FROM reviews WHERE status='pending'").get().c,
    usersCount: db.prepare("SELECT COUNT(*) c FROM users").get().c,
    topupsCount: db.prepare("SELECT COUNT(*) c FROM topup_orders WHERE status='pending'").get().c,
    pendingDepositsCount: pendingDeposits.length
  };
  res.render('admin', { phones, stats, pendingDeposits });
});

// ===== Admin Visits =====
app.get('/admin/visits', requireAuth, (req, res) => {
  try {
    const visits = db.prepare('SELECT * FROM visits ORDER BY id DESC LIMIT 300').all();
    const stats = {
      totalVisits: db.prepare('SELECT COUNT(*) c FROM visits').get().c,
      uniqueVisitors: db.prepare('SELECT COUNT(DISTINCT visitor_id) c FROM visits WHERE visitor_id IS NOT NULL').get().c,
      todayVisits: db.prepare("SELECT COUNT(*) c FROM visits WHERE date(created_at) = date('now', 'localtime')").get().c,
      todayUnique: db.prepare("SELECT COUNT(DISTINCT visitor_id) c FROM visits WHERE visitor_id IS NOT NULL AND date(created_at) = date('now', 'localtime')").get().c
    };
    res.render('admin-visits', { visits, stats });
  } catch(e) { res.send('Error: ' + e.message); }
});

// ===== Admin Deposits =====
app.get('/admin/deposits', requireAuth, (req, res) => {
  const deposits = db.prepare('SELECT * FROM wallet_deposits ORDER BY status ASC, id DESC').all();
  const messages = { approved: '✅ تم الموافقة وإضافة الرصيد', rejected: '❌ تم رفض الطلب' };
  res.render('admin-deposits', { deposits, message: messages[req.query.msg] || null });
});
app.post('/admin/deposits/approve/:id', requireAuth, (req, res) => {
  const deposit = db.prepare('SELECT * FROM wallet_deposits WHERE id = ?').get(req.params.id);
  if (deposit && deposit.status === 'pending') {
    db.prepare("UPDATE wallet_deposits SET status = 'approved' WHERE id = ?").run(req.params.id);
    let user = db.prepare('SELECT id FROM users WHERE phone = ?').get(deposit.user_phone);
    if (!user) db.prepare('INSERT INTO users (user_code, name, phone, balance) VALUES (?, ?, ?, ?)').run(generateUserCode(), 'زبون', deposit.user_phone, deposit.amount_usd);
    else db.prepare('UPDATE users SET balance = balance + ? WHERE phone = ?').run(deposit.amount_usd, deposit.user_phone);
    db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(deposit.user_phone, `✅ تمت الموافقة على إيداع رصيد بقيمة $${deposit.amount_usd}. رصيدك جاهز.`);
  }
  res.redirect('/admin/deposits?msg=approved');
});
app.post('/admin/deposits/reject/:id', requireAuth, (req, res) => {
  const { reason } = req.body;
  const deposit = db.prepare('SELECT * FROM wallet_deposits WHERE id = ?').get(req.params.id);
  if (deposit && deposit.status === 'pending') {
    db.prepare("UPDATE wallet_deposits SET status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason || 'بدون سبب', req.params.id);
    db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(deposit.user_phone, `❌ تم رفض طلب الإيداع. السبب: ${reason || 'بدون سبب'}`);
  }
  res.redirect('/admin/deposits?msg=rejected');
});

// ===== Admin Pending & Verifications & Reviews =====
app.get('/admin/pending', requireAuth, (req, res) => { res.render('admin-pending', { ads: db.prepare("SELECT * FROM phones WHERE status='pending' ORDER BY id DESC").all() }); });
app.post('/admin/approve/:id', requireAuth, (req, res) => { const phone = db.prepare('SELECT seller_phone, name FROM phones WHERE id = ?').get(req.params.id); db.prepare("UPDATE phones SET status = 'approved' WHERE id = ?").run(req.params.id); if (phone && phone.seller_phone) db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone.seller_phone, `✅ تمت الموافقة على إعلانك: ${phone.name}`); res.redirect('/admin/pending'); });
app.post('/admin/reject/:id', requireAuth, (req, res) => { const phone = db.prepare('SELECT seller_phone, name FROM phones WHERE id = ?').get(req.params.id); if (phone && phone.seller_phone) db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone.seller_phone, `❌ تم رفض إعلانك: ${phone.name}`); db.prepare("DELETE FROM phones WHERE id = ?").run(req.params.id); res.redirect('/admin/pending'); });

app.get('/admin/verifications', requireAuth, (req, res) => { res.render('admin-verifications', { docs: db.prepare("SELECT * FROM verifications ORDER BY status ASC, id DESC").all() }); });
app.get('/admin/view-doc/:filename', requireAuth, (req, res) => { const p = path.resolve(privateDir, req.params.filename); if (fs.existsSync(p)) res.sendFile(p); else res.status(404).send('Not found'); });
app.post('/admin/verify/approve/:id', requireAuth, (req, res) => { const doc = db.prepare('SELECT phone, name FROM verifications WHERE id = ?').get(req.params.id); db.prepare("UPDATE verifications SET status='approved' WHERE id=?").run(req.params.id); if (doc && doc.phone) { getOrCreateUser(doc.name, doc.phone); db.prepare('UPDATE users SET is_verified = 1 WHERE phone = ?').run(doc.phone); db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(doc.phone, '✅ تم توثيق حسابك بنجاح!'); } res.redirect('/admin/verifications'); });
app.post('/admin/verify/reject/:id', requireAuth, (req, res) => { const doc = db.prepare('SELECT phone FROM verifications WHERE id = ?').get(req.params.id); if (doc && doc.phone) db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(doc.phone, '❌ تم رفض طلب التوثيق.'); db.prepare("DELETE FROM verifications WHERE id=?").run(req.params.id); res.redirect('/admin/verifications'); });

app.get('/admin/reviews', requireAuth, (req, res) => { res.render('admin-reviews', { reviews: db.prepare("SELECT reviews.*, phones.name as phone_name FROM reviews LEFT JOIN phones ON reviews.phone_id = phones.id ORDER BY status ASC, id DESC").all() }); });
app.post('/admin/review/approve/:id', requireAuth, (req, res) => { db.prepare("UPDATE reviews SET status='approved' WHERE id=?").run(req.params.id); res.redirect('/admin/reviews'); });
app.post('/admin/review/delete/:id', requireAuth, (req, res) => { db.prepare("DELETE FROM reviews WHERE id=?").run(req.params.id); res.redirect('/admin/reviews'); });

// ===== Admin Users =====
app.get('/admin/users', requireAuth, (req, res) => { const search = req.query.q || ''; let users; if (search) users = db.prepare('SELECT * FROM users WHERE user_code LIKE ? OR phone LIKE ? OR name LIKE ? ORDER BY id DESC').all(`%${search}%`, `%${search}%`, `%${search}%`); else users = db.prepare('SELECT * FROM users ORDER BY id DESC').all(); res.render('admin-users', { users, search }); });
app.post('/admin/users/verify/:id', requireAuth, (req, res) => { const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); if (user) { db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.params.id); db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '✅ تم توثيق حسابك بنجاح!'); } res.redirect('/admin/users'); });
app.post('/admin/users/unverify/:id', requireAuth, (req, res) => { db.prepare('UPDATE users SET is_verified = 0 WHERE id = ?').run(req.params.id); res.redirect('/admin/users'); });
app.post('/admin/users/ban/:id', requireAuth, (req, res) => { const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); if (user) { db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(req.params.id); db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '🚫 تم حظر حسابك.'); } res.redirect('/admin/users'); });
app.post('/admin/users/unban/:id', requireAuth, (req, res) => { const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id); if (user) { db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(req.params.id); db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '✅ تم إلغاء الحظر.'); } res.redirect('/admin/users'); });

// ===== Admin Phones & Banners =====
app.post('/admin/feature/:id', requireAuth, (req, res) => { const phone = db.prepare('SELECT is_featured FROM phones WHERE id = ?').get(req.params.id); db.prepare("UPDATE phones SET is_featured = ? WHERE id = ?").run(phone.is_featured === 1 ? 0 : 1, req.params.id); res.redirect('/admin'); });
app.get('/admin/add', requireAuth, (req, res) => { res.render('add-phone'); });
app.post('/admin/add', requireAuth, upload.array('images', 8), (req, res) => { const b = req.body; const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : []; db.prepare(`INSERT INTO phones (name, brand, price, description, images, cpu, ram, storage, screen, camera, battery, availability, is_admin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')`).run(b.name, b.brand, b.price, b.description, JSON.stringify(images), b.cpu, b.ram, b.storage, b.screen, b.camera, b.battery, b.availability || 'متوفر'); res.redirect('/admin'); });
app.post('/admin/sold-out/:id', requireAuth, (req, res) => { db.prepare("UPDATE phones SET availability='تم البيع' WHERE id=?").run(req.params.id); res.redirect('/admin'); });
app.post('/admin/delete/:id', requireAuth, (req, res) => { db.prepare("DELETE FROM phones WHERE id=?").run(req.params.id); res.redirect('/admin'); });
app.get('/admin/edit/:id', requireAuth, (req, res) => { res.render('edit-phone', { phone: db.prepare('SELECT * FROM phones WHERE id=?').get(req.params.id) }); });
app.post('/admin/edit/:id', requireAuth, upload.array('images', 8), (req, res) => { const b = req.body; const existing = db.prepare('SELECT images FROM phones WHERE id=?').get(req.params.id); let imgs = JSON.parse(existing.images || '[]'); if (req.files && req.files.length > 0) imgs = req.files.map(f => '/uploads/' + f.filename); db.prepare(`UPDATE phones SET name=?, brand=?, price=?, description=?, images=?, cpu=?, ram=?, storage=?, screen=?, camera=?, battery=?, availability=? WHERE id=?`).run(b.name, b.brand, b.price, b.description, JSON.stringify(imgs), b.cpu, b.ram, b.storage, b.screen, b.camera, b.battery, b.availability, req.params.id); res.redirect('/admin'); });

app.get('/admin/banners', requireAuth, (req, res) => { res.render('admin-banners', { banners: db.prepare('SELECT * FROM banners ORDER BY id DESC').all() }); });
app.post('/admin/banners/add', requireAuth, upload.single('banner_image'), (req, res) => { if (req.file) db.prepare('INSERT INTO banners (image_url) VALUES (?)').run('/uploads/' + req.file.filename); res.redirect('/admin/banners'); });
app.post('/admin/banners/delete/:id', requireAuth, (req, res) => { const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id); if (banner && banner.image_url) { const p = '.' + banner.image_url; if (fs.existsSync(p)) fs.unlinkSync(p); } db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id); res.redirect('/admin/banners'); });

// ===== Admin Games =====
app.get('/admin/games', requireAuth, (req, res) => { const games = db.prepare(`SELECT g.*, (SELECT COUNT(*) FROM game_packages p WHERE p.game_name = g.name) as packages_count FROM games g ORDER BY g.sort_order ASC, g.id ASC`).all(); const messages = { created: '✅ تم إنشاء اللعبة', deleted: '🗑️ تم حذف اللعبة' }; res.render('admin-games', { games, message: messages[req.query.msg] || null }); });
app.get('/admin/games/new', requireAuth, (req, res) => { res.render('admin-game-form', { game: null, isEdit: false, packages: [], error: null }); });
app.post('/admin/games/new', requireAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => { const b = req.body; const logoUrl = (req.files && req.files.logo) ? '/uploads/' + req.files.logo[0].filename : null; const bannerUrl = (req.files && req.files.banner) ? '/uploads/' + req.files.banner[0].filename : null; const slug = (b.slug && b.slug.trim()) ? b.slug.trim().toLowerCase().replace(/\s+/g, '-') : null; try { db.prepare(`INSERT INTO games (name, name_ar, slug, image_url, banner_url, developer, description, instructions, delivery_time, refund_policy, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(b.name, b.name_ar || null, slug, logoUrl, bannerUrl, b.developer || null, b.description || null, b.instructions || null, b.delivery_time || null, b.refund_policy || null, b.is_active === 'on' ? 1 : 0, parseInt(b.sort_order) || 0); res.redirect('/admin/games?msg=created'); } catch (e) { res.render('admin-game-form', { game: b, isEdit: false, packages: [], error: 'خطأ: ' + e.message }); } });
app.get('/admin/games/:id/edit', requireAuth, (req, res) => { const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id); if (!game) return res.redirect('/admin/games'); const packages = db.prepare('SELECT * FROM game_packages WHERE game_name = ? ORDER BY sort_order ASC, price ASC').all(game.name); const messages = { saved: '✅ تم حفظ التعديلات' }; res.render('admin-game-form', { game, isEdit: true, packages, error: null, message: messages[req.query.msg] || null }); });
app.post('/admin/games/:id/edit', requireAuth, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), (req, res) => { const b = req.body; const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id); if (!existing) return res.redirect('/admin/games'); const logoUrl = (req.files && req.files.logo) ? '/uploads/' + req.files.logo[0].filename : existing.image_url; const bannerUrl = (req.files && req.files.banner) ? '/uploads/' + req.files.banner[0].filename : existing.banner_url; const oldName = existing.name; const newName = b.name; const slug = (b.slug && b.slug.trim()) ? b.slug.trim().toLowerCase().replace(/\s+/g, '-') : existing.slug; try { db.prepare(`UPDATE games SET name=?, name_ar=?, slug=?, image_url=?, banner_url=?, developer=?, description=?, instructions=?, delivery_time=?, refund_policy=?, is_active=?, sort_order=? WHERE id=?`).run(newName, b.name_ar || null, slug, logoUrl, bannerUrl, b.developer || null, b.description || null, b.instructions || null, b.delivery_time || null, b.refund_policy || null, b.is_active === 'on' ? 1 : 0, parseInt(b.sort_order) || 0, req.params.id); if (oldName !== newName) db.prepare('UPDATE game_packages SET game_name = ? WHERE game_name = ?').run(newName, oldName); res.redirect('/admin/games/' + req.params.id + '/edit?msg=saved'); } catch (e) { res.render('admin-game-form', { game: existing, isEdit: true, packages: [], error: 'خطأ: ' + e.message }); } });
app.post('/admin/games/:id/delete', requireAuth, (req, res) => { const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id); if (game) { db.prepare('DELETE FROM game_packages WHERE game_name = ?').run(game.name); db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id); } res.redirect('/admin/games?msg=deleted'); });
app.post('/admin/games/:id/toggle', requireAuth, (req, res) => { const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id); if (game) db.prepare('UPDATE games SET is_active = ? WHERE id = ?').run(game.is_active === 1 ? 0 : 1, req.params.id); res.redirect('/admin/games'); });
app.post('/admin/packages/add', requireAuth, (req, res) => { const { game_name, package_name, price, sort_order } = req.body; db.prepare("INSERT INTO game_packages (game_name, package_name, price, sort_order) VALUES (?, ?, ?, ?)").run(game_name, package_name, price, parseInt(sort_order) || 0); res.redirect(req.get('referer') || '/admin/games'); });
app.post('/admin/packages/delete/:id', requireAuth, (req, res) => { db.prepare("DELETE FROM game_packages WHERE id = ?").run(req.params.id); res.redirect(req.get('referer') || '/admin/games'); });

// ===== Admin Topups =====
app.get('/admin/topups', requireAuth, (req, res) => { const orders = db.prepare("SELECT * FROM topup_orders ORDER BY id DESC").all(); res.render('admin-topups', { orders }); });
app.post('/admin/topups/approve/:id', requireAuth, (req, res) => { const order = db.prepare("SELECT * FROM topup_orders WHERE id = ?").get(req.params.id); db.prepare("UPDATE topup_orders SET status = 'approved' WHERE id = ?").run(req.params.id); if (order && order.user_phone) db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(order.user_phone, `✅ تمت الموافقة على طلب شحن ${order.package_name}`); res.redirect('/admin/topups'); });
app.post('/admin/topups/reject/:id', requireAuth, (req, res) => {
  const { reason } = req.body;
  const order = db.prepare("SELECT * FROM topup_orders WHERE id = ?").get(req.params.id);
  db.prepare("UPDATE topup_orders SET status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason, req.params.id);
  if (order) {
    if (order.payment_method === 'wallet') {
      db.prepare('UPDATE users SET balance = balance + ? WHERE phone = ?').run(order.price, order.user_phone);
      db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(order.user_phone, `💸 تم إعادة $${order.price} إلى محفظتك بسبب رفض الطلب.`);
    } else if (order.user_phone) {
      db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(order.user_phone, `❌ تم رفض طلب الشحن: ${reason}`);
    }
  }
  res.redirect('/admin/topups');
});

app.get('/api/test-telegram', (req, res) => {
  sendTelegram('🚀 هذه رسالة تجريبية من موقع Apex! إذا وصلتك، فالإشعارات تعمل بنجاح.');
  res.send('تم إرسال الرسالة التجريبية إلى تيليجرام. افحص هاتفك!');
});

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 يعمل الآن: http://localhost:${PORT}`); });
