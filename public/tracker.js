(function() {
  // البحث عن رقم الهاتف في ذاكرة المتصفح (يتم حفظه تلقائياً عند أي طلب شحن)
  const phone = localStorage.getItem('apex_user_phone');
  if (phone) {
    // إرسال رقم الهاتف بصمت في الخلفية
    fetch('/api/track-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    }).catch(() => {});
  }
})();

// حفظ رقم الهاتف تلقائياً إذا أدخله المستخدم في أي حقل
document.addEventListener('change', function(e) {
  if (e.target && e.target.type === 'tel' && e.target.value.length > 8) {
    localStorage.setItem('apex_user_phone', e.target.value);
    fetch('/api/track-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: e.target.value })
    }).catch(() => {});
  }
});
