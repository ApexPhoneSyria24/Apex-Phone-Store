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
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' })
    });
    const data = await res.json();
    if (!data.ok) console.error('Telegram Error:', data.description);
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
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ reply: 'الرجاء كتابة رسالة.' });

    const phones = db.prepare("SELECT name, brand, price FROM phones WHERE status = 'approved' LIMIT 8").all();
    const games = db.prepare("SELECT name FROM games WHERE is_active = 1 LIMIT 8").all();

    // هندسة الشخصية الاحترافية (Prompt Engineering)
    let systemPrompt = `أنت "ميمو" (Mimo)، خبير المبيعات والمساعد الذكي لمتجر Apex Phone Syria (المتجر الأول والموثوق في سوريا).
شخصيتك: خبير محترف، ودود، سريع البديهة، تستخدم الإيموجي بذكاء، وتتحدث بأسلوب راقٍ ومقنع.
قواعد صارمة يجب الالتزام بها حرفياً:
1. ممنوع منعاً باتاً أن تقول "أنا ذكاء اصطناعي" أو "كذكاء اصطناعي". أنت مستشار مبيعات في المتجر.
2. إجاباتك مختصرة، مباشرة، ومقنعة (سطرين إلى ثلاثة كحد أقصى).
3. لا تضع المتجر في موقف محرج أبداً. إذا لم تعرف إجابة أو سُئلت عن شيء غير موجود، اعتذر بلطف واقترح التحدث مع الدعم البشري.
4. لا تخترع منتجات أو أسعاراً غير موجودة في القائمة أدناه.
5. معلومات المتجر: نبيع هواتف أصلية بضمان، ونشحن ألعاب فورية (PUBG, Free Fire, Jawaker)، والدفع عبر سيريتل كاش.
6. ممنوع تكرار الترحيب إذا لم تكن أول رسالة.

الهواتف المتاحة حالياً: ${phones.map(p => `${p.name} ($${p.price})`).join(', ') || 'غير متوفر حالياً'}.
الألعاب المتاحة: ${games.map(g => g.name).join(', ') || 'غير متوفر حالياً'}.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ reply: '⚠️ المفتاح غير موجود في السيرفر.' });

    let contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => { contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }); });
    }
    contents.push({ role: 'user', parts: [{ text: systemPrompt + "\n\nرسالة الزبون: " + message }] });

    // دالة داخلية لمحاولة الاتصال بجوجل
    async function fetchGemini(modelName) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      return await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: contents })
      });
    }

    let reply = null;
    let googleError = '';

    // المحاولة 1: النموذج الأساسي السريع
    try {
      let response = await fetchGemini('gemini-2.0-flash');
      let data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        reply = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        googleError = data.error.message;
        console.log('Primary model error:', googleError);
      }
    } catch(e) { googleError = e.message; }

    // المحاولة 2: النموذج الاحتياطي (إذا كان هناك ضغط)
    if (!reply) {
      try {
        console.log('Trying fallback model...');
        let fbResponse = await fetchGemini('gemini-3.5-flash-lite');
        let fbData = await fbResponse.json();
        
        if (fbData.candidates && fbData.candidates[0] && fbData.candidates[0].content) {
          reply = fbData.candidates[0].content.parts[0].text;
        }
      } catch(e) { console.log('Fallback error:', e.message); }
    }

    // إذا نجحنا في الحصول على رد
    if (reply) {
      return res.json({ reply: reply });
    }

    // إذا فشلت كل المحاولات (منعاً للمواقف المحرجة، نرسل رداً ودوداً)
    if (googleError.includes('high demand') || googleError.includes('quota')) {
      return res.json({ reply: 'أعتذر منك جداً، يبدو أن هناك ضغطاً كبيراً على الخوادم حالياً. يرجى المحاولة بعد قليل أو التحدث مع الدعم البشري. 🙏' });
    }

    res.json({ reply: 'عذراً، أواجه صعوبة في الاتصال بالشبكة. يرجى إعادة المحاولة لاحقاً. 🌸' });

  } catch (e) {
    res.json({ reply: 'عذراً، حدث خطأ مؤقت. يرجى المحاولة لاحقاً.' });
  }
});

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 يعمل الآن: http://localhost:${PORT}`); });
