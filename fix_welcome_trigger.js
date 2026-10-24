const fs = require('fs');
let content = fs.readFileSync('views/index.ejs', 'utf8');

// البحث عن الكود القديم واستبداله بالكود الجديد
const oldLogic = `    let userPhone = localStorage.getItem('apex_user_phone');
    if (!userPhone) {
        // إنشاء معرف زائر جديد لأول مرة
        userPhone = 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('apex_user_phone', userPhone);
        
        // إرسال طلب الترحيب للخادم (مرة واحدة فقط)
        fetch('/api/notifications/welcome', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ phone: userPhone }) 
        }).then(() => checkNotifications());
    }`;

const newLogic = `    // الإشعارات
    let userPhone = localStorage.getItem('apex_user_phone');
    if (!userPhone) {
        userPhone = 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('apex_user_phone', userPhone);
    }

    // إرسال إشعار الترحيب إذا لم يتم إرساله لهذا المتصفح من قبل
    if (!localStorage.getItem('apex_welcome_sent')) {
        fetch('/api/notifications/welcome', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ phone: userPhone }) 
        }).then(res => res.json()).then(() => {
            localStorage.setItem('apex_welcome_sent', 'true');
            checkNotifications(); // تحديث العداد فوراً
        }).catch(e => console.log(e));
    }`;

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    fs.writeFileSync('views/index.ejs', content);
    console.log('✅ تم إصلاح كود الإشعار الترحيبي بنجاح!');
} else {
    console.log('⚠️ لم يتم العثور على الكود القديم، يرجى إبلاغي.');
}
