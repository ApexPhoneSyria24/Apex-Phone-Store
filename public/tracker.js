(function() {
  // إدارة معرف الزائر الفريد
  let visitorId = localStorage.getItem('apex_visitor_id');
  if (!visitorId) {
    visitorId = '#APX-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('apex_visitor_id', visitorId);
  }

  // إرسال بيانات الزيارة للسيرفر
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

  // ربط الزيارة برقم الهاتف إذا وجد
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
