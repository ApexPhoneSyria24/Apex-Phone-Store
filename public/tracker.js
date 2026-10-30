(function() {
  // 1. إدارة معرف الزائر الفريد (visitor_id)
  let visitorId = localStorage.getItem('apex_visitor_id');
  if (!visitorId) {
    visitorId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'v-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('apex_visitor_id', visitorId);
  }

  // 2. إرسال بيانات الزيارة للسيرفر
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
  fetch('/api/track-visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: visitorId,
      path: window.location.pathname,
      device_type: isMobile
    })
  }).catch(() => {});

  // 3. البحث عن رقم الهاتف في ذاكرة المتصفح (لربطه بالزيارة)
  const phone = localStorage.getItem('apex_user_phone');
  if (phone) {
    fetch('/api/track-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    }).catch(() => {});
  }
})();

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
