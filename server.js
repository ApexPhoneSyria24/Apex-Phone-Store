const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const compression = require('compression');

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

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function generateUserCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'APX-';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function getOrCreateUser(name, phone) {
    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (user) return user;
    let code;
    do { code = generateUserCode(); } while (db.prepare('SELECT id FROM users WHERE user_code = ?').get(code));
    db.prepare('INSERT INTO users (user_code, name, phone) VALUES (?, ?, ?)').run(code, name || '', phone);
    return db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
}

app.use('/uploads', express.static('public/uploads', { maxAge: '30d', immutable: true }));
app.use('/css', express.static('public/css', { maxAge: '7d' }));
app.use(express.static('public'));

// ===== Notifications =====
app.post('/api/notifications/welcome', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.json({ success: false });
    const existing = db.prepare("SELECT id FROM notifications WHERE phone = ? AND message LIKE '%أهلاً بك%'").get(phone);
    if (!existing) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone, '👑 أهلاً بك في Apex فون! استكشف أفخم الهواتف الذكية الأصلية بضمان محلي وأسعار منافسة.');
    }
    res.json({ success: true });
});

app.get('/api/notifications/:phone', (req, res) => {
    res.json(db.prepare('SELECT * FROM notifications WHERE phone = ? ORDER BY id DESC').all(req.params.phone));
});

app.post('/api/notifications/read/:phone', (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE phone = ?').run(req.params.phone);
    res.json({ success: true });
});

// ===== Home =====
app.get('/', (req, res) => {
    let query = "SELECT * FROM phones WHERE status = 'approved'";
    const params = [];
    query += " AND (is_admin = 1 OR seller_phone NOT IN (SELECT phone FROM users WHERE is_banned = 1))";

    if (req.query.search) {
        query += ' AND (name LIKE ? OR brand LIKE ?)';
        params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }
    if (req.query.brand) { query += ' AND brand = ?'; params.push(req.query.brand); }

    let sort = req.query.sort || 'default';
    if (sort === 'price_asc') query += ' ORDER BY price ASC';
    else if (sort === 'price_desc') query += ' ORDER BY price DESC';
    else if (sort === 'newest') query += ' ORDER BY id DESC';
    else query += ' ORDER BY is_featured DESC, is_admin DESC, id DESC';

    const isViewAll = req.query.view === 'all';
    if (!isViewAll && !req.query.search) query += ' LIMIT 12';

    const phones = db.prepare(query).all(...params);
    const totalPhonesCount = db.prepare("SELECT COUNT(*) as count FROM phones WHERE status = 'approved'").get().count;
    const brands = db.prepare("SELECT DISTINCT brand FROM phones WHERE status = 'approved'").all().map(b => b.brand);
    const verifiedPhones = db.prepare("SELECT phone FROM users WHERE is_verified = 1").all().map(v => v.phone);
    const banners = db.prepare('SELECT * FROM banners ORDER BY id DESC').all();

    res.render('index', { phones, brands, verifiedPhones, banners, search: req.query.search || '', activeBrand: req.query.brand || '', currentSort: sort, isViewAll, totalPhonesCount });
});

// ===== SEO =====
app.get('/sitemap.xml', (req, res) => {
    const phones = db.prepare("SELECT id FROM phones WHERE status = 'approved'").all();
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    xml += '  <url><loc>https://apexphonesyria.online/</loc><priority>1.0</priority></url>\n';
    phones.forEach(p => { xml += `  <url><loc>https://apexphonesyria.online/phone/${p.id}</loc><priority>0.8</priority></url>\n`; });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\nSitemap: https://apexphonesyria.online/sitemap.xml");
});

// ===== Phone Details =====
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

// ===== Verification =====
app.get('/verify-account', (req, res) => { res.render('verify-account'); });
app.post('/verify-account', uploadPrivate.fields([{ name: 'id_front', maxCount: 1 }, { name: 'id_back', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), (req, res) => {
    const b = req.body; const f = req.files;
    if (f['id_front'] && f['id_back'] && f['selfie']) {
        const user = getOrCreateUser(b.name, b.phone);
        db.prepare(`INSERT INTO verifications (name, phone, id_front, id_back, selfie) VALUES (?, ?, ?, ?, ?)`)
          .run(b.name, b.phone, f['id_front'][0].filename, f['id_back'][0].filename, f['selfie'][0].filename);
        res.render('verify-success', { userCode: user.user_code, phone: b.phone });
    } else { res.redirect('/verify-account'); }
});

// ===== Post Ad =====
app.get('/post-ad', (req, res) => { res.render('post-ad'); });
app.post('/post-ad', upload.array('images', 8), (req, res) => {
    const b = req.body;
    const banned = db.prepare('SELECT id FROM users WHERE phone = ? AND is_banned = 1').get(b.seller_phone);
    if (banned) {
        return res.send('<div style="text-align:center;padding:50px;font-family:sans-serif;"><h2>🚫 عذراً، حسابك محظور</h2><p>لا يمكنك نشر إعلانات جديدة. يرجى التواصل مع الإدارة.</p><a href="/">العودة</a></div>');
    }
    const user = getOrCreateUser(b.seller_name, b.seller_phone);
    const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    db.prepare(`INSERT INTO phones (name, brand, price, description, images, availability, is_admin, status, seller_name, seller_phone) VALUES (?, ?, ?, ?, ?, 'متوفر', 0, 'pending', ?, ?)`)
      .run(b.name, b.brand, b.price, b.description, JSON.stringify(images), b.seller_name, b.seller_phone);
    res.render('ad-success', { sellerPhone: b.seller_phone, userCode: user.user_code });
});

app.get('/policy', (req, res) => { res.render('policy'); });

// ===== Games (Public) =====
app.get('/games', (req, res) => {
    const dbGames = db.prepare("SELECT * FROM games").all();
    const packages = db.prepare('SELECT * FROM game_packages WHERE is_active = 1').all();
    const existingGames = [...new Set(packages.map(p => p.game_name))];
    const games = existingGames.map(name => {
        const dbGame = dbGames.find(g => g.name === name);
        return dbGame || { name: name, image_url: null };
    });
    res.render('games', { games });
});

app.get('/games/:gameName', (req, res) => {
    const gameName = req.params.gameName;
    const game = db.prepare("SELECT * FROM games WHERE name = ?").get(gameName) || { name: gameName, image_url: null };
    const packages = db.prepare("SELECT * FROM game_packages WHERE game_name = ? AND is_active = 1 ORDER BY price").all(gameName);
    res.render('game-details', { game, packages });
});

app.post('/games/:gameName/order', (req, res) => {
    const { player_id, package_name, price, user_phone } = req.body;
    db.prepare(`INSERT INTO topup_orders (game_name, package_name, player_id, price, user_phone) VALUES (?, ?, ?, ?, ?)`)
      .run(req.params.gameName, package_name, player_id, price, user_phone);
    res.json({ success: true });
});

app.get('/api/topup-orders/:phone', (req, res) => {
    const orders = db.prepare("SELECT * FROM topup_orders WHERE user_phone = ? ORDER BY id DESC LIMIT 10").all(req.params.phone);
    res.json(orders);
});

// ===== Admin Login =====
const ADMIN_PASSWORD = "0962730078@0962";
app.get('/admin/login', (req, res) => { if (req.session.isAdmin) return res.redirect('/admin'); res.render('admin-login', { error: null }); });
app.post('/admin/login', (req, res) => { if (req.body.password === ADMIN_PASSWORD) { req.session.isAdmin = true; return res.redirect('/admin'); } res.render('admin-login', { error: '❌ كلمة المرور غير صحيحة.' }); });
app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
function requireAuth(req, res, next) { if (req.session.isAdmin) return next(); res.redirect('/admin/login'); }

// ===== Admin Dashboard =====
app.get('/admin', requireAuth, (req, res) => {
    const phones = db.prepare('SELECT * FROM phones ORDER BY id DESC').all();
    const stats = {
        adminPhonesCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE is_admin=1 AND status='approved'").get().c,
        userAdsCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE is_admin=0 AND status='approved'").get().c,
        pendingCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE status='pending'").get().c,
        soldCount: db.prepare("SELECT COUNT(*) c FROM phones WHERE availability='تم البيع'").get().c,
        verificationsCount: db.prepare("SELECT COUNT(*) c FROM verifications WHERE status='pending'").get().c,
        reviewsCount: db.prepare("SELECT COUNT(*) c FROM reviews WHERE status='pending'").get().c,
        usersCount: db.prepare("SELECT COUNT(*) c FROM users").get().c,
        topupsCount: db.prepare("SELECT COUNT(*) c FROM topup_orders WHERE status='pending'").get().c
    };
    res.render('admin', { phones, stats });
});

// ===== Admin Pending Ads =====
app.get('/admin/pending', requireAuth, (req, res) => { res.render('admin-pending', { ads: db.prepare("SELECT * FROM phones WHERE status='pending' ORDER BY id DESC").all() }); });
app.post('/admin/approve/:id', requireAuth, (req, res) => {
    const phone = db.prepare('SELECT seller_phone, name FROM phones WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE phones SET status = 'approved' WHERE id = ?").run(req.params.id);
    if (phone && phone.seller_phone) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone.seller_phone, `✅ تمت الموافقة على إعلانك: ${phone.name}`);
    }
    res.redirect('/admin/pending');
});
app.post('/admin/reject/:id', requireAuth, (req, res) => {
    const phone = db.prepare('SELECT seller_phone, name FROM phones WHERE id = ?').get(req.params.id);
    if (phone && phone.seller_phone) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(phone.seller_phone, `❌ تم رفض إعلانك: ${phone.name}`);
    }
    db.prepare("DELETE FROM phones WHERE id = ?").run(req.params.id);
    res.redirect('/admin/pending');
});

// ===== Admin Verifications =====
app.get('/admin/verifications', requireAuth, (req, res) => { res.render('admin-verifications', { docs: db.prepare("SELECT * FROM verifications ORDER BY status ASC, id DESC").all() }); });
app.get('/admin/view-doc/:filename', requireAuth, (req, res) => { const p = path.resolve(privateDir, req.params.filename); if (fs.existsSync(p)) res.sendFile(p); else res.status(404).send('Not found'); });
app.post('/admin/verify/approve/:id', requireAuth, (req, res) => {
    const doc = db.prepare('SELECT phone, name FROM verifications WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE verifications SET status='approved' WHERE id=?").run(req.params.id);
    if (doc && doc.phone) {
        getOrCreateUser(doc.name, doc.phone);
        db.prepare('UPDATE users SET is_verified = 1 WHERE phone = ?').run(doc.phone);
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(doc.phone, '✅ تم توثيق حسابك بنجاح! أصبحت الآن بائعاً موثوقاً.');
    }
    res.redirect('/admin/verifications');
});
app.post('/admin/verify/reject/:id', requireAuth, (req, res) => {
    const doc = db.prepare('SELECT phone FROM verifications WHERE id = ?').get(req.params.id);
    if (doc && doc.phone) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(doc.phone, '❌ تم رفض طلب التوثيق. يرجى التأكد من وضوح الصور والمعلومات.');
    }
    db.prepare("DELETE FROM verifications WHERE id=?").run(req.params.id);
    res.redirect('/admin/verifications');
});

// ===== Admin Reviews =====
app.get('/admin/reviews', requireAuth, (req, res) => { res.render('admin-reviews', { reviews: db.prepare("SELECT reviews.*, phones.name as phone_name FROM reviews LEFT JOIN phones ON reviews.phone_id = phones.id ORDER BY status ASC, id DESC").all() }); });
app.post('/admin/review/approve/:id', requireAuth, (req, res) => { db.prepare("UPDATE reviews SET status='approved' WHERE id=?").run(req.params.id); res.redirect('/admin/reviews'); });
app.post('/admin/review/delete/:id', requireAuth, (req, res) => { db.prepare("DELETE FROM reviews WHERE id=?").run(req.params.id); res.redirect('/admin/reviews'); });

// ===== Admin Users =====
app.get('/admin/users', requireAuth, (req, res) => {
    const search = req.query.q || '';
    let users;
    if (search) {
        users = db.prepare('SELECT * FROM users WHERE user_code LIKE ? OR phone LIKE ? OR name LIKE ? ORDER BY id DESC').all(`%${search}%`, `%${search}%`, `%${search}%`);
    } else {
        users = db.prepare('SELECT * FROM users ORDER BY id DESC').all();
    }
    res.render('admin-users', { users, search });
});
app.post('/admin/users/verify/:id', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (user) {
        db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(req.params.id);
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '✅ تم توثيق حسابك بنجاح!');
    }
    res.redirect('/admin/users');
});
app.post('/admin/users/unverify/:id', requireAuth, (req, res) => { db.prepare('UPDATE users SET is_verified = 0 WHERE id = ?').run(req.params.id); res.redirect('/admin/users'); });
app.post('/admin/users/ban/:id', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (user) {
        db.prepare('UPDATE users SET is_banned = 1 WHERE id = ?').run(req.params.id);
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '🚫 تم حظر حسابك.');
    }
    res.redirect('/admin/users');
});
app.post('/admin/users/unban/:id', requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (user) {
        db.prepare('UPDATE users SET is_banned = 0 WHERE id = ?').run(req.params.id);
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(user.phone, '✅ تم إلغاء الحظر عن حسابك.');
    }
    res.redirect('/admin/users');
});

// ===== Admin Feature =====
app.post('/admin/feature/:id', requireAuth, (req, res) => {
    const phone = db.prepare('SELECT is_featured FROM phones WHERE id = ?').get(req.params.id);
    db.prepare("UPDATE phones SET is_featured = ? WHERE id = ?").run(phone.is_featured === 1 ? 0 : 1, req.params.id);
    res.redirect('/admin');
});

// ===== Admin Phones =====
app.get('/admin/add', requireAuth, (req, res) => { res.render('add-phone'); });
app.post('/admin/add', requireAuth, upload.array('images', 8), (req, res) => {
    const b = req.body; const images = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];
    db.prepare(`INSERT INTO phones (name, brand, price, description, images, cpu, ram, storage, screen, camera, battery, availability, is_admin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')`).run(b.name, b.brand, b.price, b.description, JSON.stringify(images), b.cpu, b.ram, b.storage, b.screen, b.camera, b.battery, b.availability || 'متوفر');
    res.redirect('/admin');
});
app.post('/admin/sold-out/:id', requireAuth, (req, res) => { db.prepare("UPDATE phones SET availability='تم البيع' WHERE id=?").run(req.params.id); res.redirect('/admin'); });
app.post('/admin/delete/:id', requireAuth, (req, res) => { db.prepare("DELETE FROM phones WHERE id=?").run(req.params.id); res.redirect('/admin'); });
app.get('/admin/edit/:id', requireAuth, (req, res) => { res.render('edit-phone', { phone: db.prepare('SELECT * FROM phones WHERE id=?').get(req.params.id) }); });
app.post('/admin/edit/:id', requireAuth, upload.array('images', 8), (req, res) => {
    const b = req.body;
    const existing = db.prepare('SELECT images FROM phones WHERE id=?').get(req.params.id);
    let imgs = JSON.parse(existing.images || '[]');
    if (req.files && req.files.length > 0) imgs = req.files.map(f => '/uploads/' + f.filename);
    db.prepare(`UPDATE phones SET name=?, brand=?, price=?, description=?, images=?, cpu=?, ram=?, storage=?, screen=?, camera=?, battery=?, availability=? WHERE id=?`).run(b.name, b.brand, b.price, b.description, JSON.stringify(imgs), b.cpu, b.ram, b.storage, b.screen, b.camera, b.battery, b.availability, req.params.id);
    res.redirect('/admin');
});

// ===== Admin Banners =====
app.get('/admin/banners', requireAuth, (req, res) => { res.render('admin-banners', { banners: db.prepare('SELECT * FROM banners ORDER BY id DESC').all() }); });
app.post('/admin/banners/add', requireAuth, upload.single('banner_image'), (req, res) => { if (req.file) db.prepare('INSERT INTO banners (image_url) VALUES (?)').run('/uploads/' + req.file.filename); res.redirect('/admin/banners'); });
app.post('/admin/banners/delete/:id', requireAuth, (req, res) => {
    const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(req.params.id);
    if (banner && banner.image_url) { const p = '.' + banner.image_url; if (fs.existsSync(p)) fs.unlinkSync(p); }
    db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
    res.redirect('/admin/banners');
});

// ===== Admin Games =====
app.get('/admin/games', requireAuth, (req, res) => {
    const games = db.prepare("SELECT * FROM games").all();
    const packages = db.prepare("SELECT * FROM game_packages ORDER BY game_name, price").all();
    const groupedPackages = {};
    packages.forEach(p => {
        if (!groupedPackages[p.game_name]) groupedPackages[p.game_name] = [];
        groupedPackages[p.game_name].push(p);
    });
    res.render('admin-games', { games, groupedPackages });
});

app.post('/admin/games/add', requireAuth, upload.single('game_image'), (req, res) => {
    const { game_name } = req.body;
    const imageUrl = req.file ? '/uploads/' + req.file.filename : '';
    try {
        db.prepare("INSERT INTO games (name, image_url) VALUES (?, ?)").run(game_name, imageUrl);
    } catch(e) {
        if (imageUrl) db.prepare("UPDATE games SET image_url = ? WHERE name = ?").run(imageUrl, game_name);
    }
    res.redirect('/admin/games');
});

app.post('/admin/packages/add', requireAuth, (req, res) => {
    const { game_name, package_name, price } = req.body;
    db.prepare("INSERT INTO game_packages (game_name, package_name, price) VALUES (?, ?, ?)").run(game_name, package_name, price);
    res.redirect('/admin/games');
});

app.post('/admin/packages/delete/:id', requireAuth, (req, res) => {
    db.prepare("DELETE FROM game_packages WHERE id = ?").run(req.params.id);
    res.redirect('/admin/games');
});

// ===== Admin Topups =====
app.get('/admin/topups', requireAuth, (req, res) => {
    const orders = db.prepare("SELECT * FROM topup_orders ORDER BY id DESC").all();
    res.render('admin-topups', { orders });
});

app.post('/admin/topups/approve/:id', requireAuth, (req, res) => {
    const order = db.prepare("SELECT * FROM topup_orders WHERE id = ?").get(req.params.id);
    db.prepare("UPDATE topup_orders SET status = 'approved' WHERE id = ?").run(req.params.id);
    if (order && order.user_phone) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(order.user_phone, `✅ تمت الموافقة على طلب شحن ${order.package_name} للعبة ${order.game_name}`);
    }
    res.redirect('/admin/topups');
});

app.post('/admin/topups/reject/:id', requireAuth, (req, res) => {
    const { reason } = req.body;
    const order = db.prepare("SELECT * FROM topup_orders WHERE id = ?").get(req.params.id);
    db.prepare("UPDATE topup_orders SET status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason, req.params.id);
    if (order && order.user_phone) {
        db.prepare('INSERT INTO notifications (phone, message) VALUES (?, ?)').run(order.user_phone, `❌ تم رفض طلب الشحن: ${reason}`);
    }
    res.redirect('/admin/topups');
});

app.listen(PORT, '0.0.0.0', () => { console.log(`🚀 يعمل الآن: http://localhost:${PORT}`); });
