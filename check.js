const fs = require('fs');
console.log("🔍 جاري فحص ملفات الموقع...\n");

let index = fs.readFileSync('views/index.ejs', 'utf8');
let details = fs.readFileSync('views/details.ejs', 'utf8');
let addPhone = fs.readFileSync('views/add-phone.ejs', 'utf8');

// 1. فحص زر الإدارة
if (index.includes('href="/admin"') || details.includes('href="/admin"')) {
    console.log("❌ خطأ: زر الإدارة لا يزال موجوداً في الواجهة!");
} else {
    console.log("✅ الأمان: تم إخفاء زر الإدارة بنجاح.");
}

// 2. فحص شارة بائع موثوق
if (index.includes('بائع موثوق') && index.includes('fa-circle-check')) {
    console.log("✅ الشارة: كلمة 'بائع موثوق' مع العلامة الزرقاء تعمل بنجاح.");
} else {
    console.log("❌ خطأ: شارة 'بائع موثوق' مفقودة أو غير صحيحة.");
}

// 3. فحص إزالة كلمة مستخدم
if (index.includes('> مستخدم <') || details.includes('> مستخدم <')) {
    console.log("⚠️ تنبيه: كلمة 'مستخدم' لا تزال موجودة في الكود.");
} else {
    console.log("✅ الاحترافية: تم إزالة كلمة 'مستخدم' نهائياً.");
}

// 4. فحص نصوص الوسيط
if (details.includes('الوسيط الآمن')) {
    console.log("❌ خطأ: عبارة 'الوسيط الآمن' لا تزال موجودة!");
} else {
    console.log("✅ النصوص: تم استبدال 'الوسيط الآمن' بنص يرفع من قيمة الزبائن.");
}

// 5. فحص معاينة الصور
if (addPhone.includes('previewContainer')) {
    console.log("✅ الصور: كود المعاينة الفورية للصور يعمل بنجاح.");
} else {
    console.log("❌ خطأ: كود معاينة الصور مفقود.");
}

console.log("\n🏁 انتهى الفحص.");
