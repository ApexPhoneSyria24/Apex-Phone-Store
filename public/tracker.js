(function() {
  const phone = localStorage.getItem('apex_user_phone');
  if (phone) {
    // إرسال رقم الهاتف بصمت في الخلفية
    fetch('/api/track-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    }).catch(() => {});
  }
})();
