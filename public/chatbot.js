(function() {
  // 1. النافذة الترحيبية (تظهر بعد 3 ثواني)
  const teaserHTML = `
    <div id="mimo-teaser" style="display:none; position:fixed; bottom:90px; right:20px; z-index:9998; background:rgba(15,23,42,0.95); backdrop-filter:blur(10px); border:1px solid #00f3ff; border-radius:15px; padding:15px; width:250px; box-shadow:0 10px 25px rgba(0,243,255,0.2); font-family:'Cairo', sans-serif;" dir="rtl">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <div style="width:40px; height:40px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 15px rgba(0,243,255,0.5);">🤖</div>
        <div>
          <h4 style="color:white; margin:0; font-size:15px; font-weight:900;">ميمو (Mimo)</h4>
          <span style="color:#00f3ff; font-size:10px; font-weight:bold;">مساعدك الذكي</span>
        </div>
      </div>
      <p style="color:#cbd5e1; font-size:12px; margin:0 0 10px 0; line-height:1.5;">مرحباً بك في <b>Apex Phone</b>! أنا ميمو. 🤖<br>المتجر الأول والموثوق في سوريا. هل تحتاج مساعدة في اختيار جهاز أو شحن لعبة؟</p>
      <button id="mimo-teaser-btn" style="width:100%; background:#00f3ff; color:#000; border:none; padding:8px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px; transition:0.2s;">تحدث معي الآن 💬</button>
      <button id="mimo-close-teaser" style="position:absolute; top:-10px; left:-10px; background:#ef4444; color:white; border:none; width:20px; height:20px; border-radius:50%; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;">✕</button>
    </div>
  `;

  // 2. نافذة المحادثة الرئيسية
  const chatHTML = `
    <div id="chat-widget" style="position:fixed; bottom:20px; right:20px; z-index:9999; font-family:'Cairo', sans-serif;" dir="rtl">
      <button id="chat-toggle" style="width:65px; height:65px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:2px solid rgba(255,255,255,0.2); box-shadow:0 4px 20px rgba(0,243,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:28px; transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🤖</button>
      
      <div id="chat-window" style="display:none; position:absolute; bottom:85px; right:0; width:340px; height:500px; background:rgba(10,10,10,0.95); backdrop-filter:blur(15px); border:1px solid rgba(0,243,255,0.3); border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.8); overflow:hidden; flex-direction:column;">
        
        <!-- رأس النافذة -->
        <div style="background:linear-gradient(90deg, #0f172a, #1e293b); padding:15px; border-bottom:1px solid rgba(0,243,255,0.2); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:35px; height:35px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px;">🤖</div>
            <div>
              <div style="color:white; font-weight:900; font-size:14px;">ميمو (Mimo)</div>
              <div style="color:#00f3ff; font-size:10px; display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:6px; height:6px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
            </div>
          </div>
          <button id="chat-close" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px; transition:0.2s;" onmouseover="this.style.color='white'">✕</button>
        </div>

        <!-- الرسائل -->
        <div id="chat-messages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background-image:radial-gradient(circle at 50% 0%, rgba(0,243,255,0.05), transparent 70%);">
          <div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13px; align-self:flex-start; max-width:85%; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 10px rgba(0,0,0,0.2);">
            أهلاً بك في متجر <b>Apex Phone Syria</b>! 🥰<br>أنا <b>ميمو</b>، مساعدك الشخصي الذكي. نحن المتجر الأول والموثوق في سوريا. كيف يمكنني أن أخدمك اليوم؟ ✨
          </div>
        </div>

        <!-- الإدخال -->
        <div style="padding:12px; border-top:1px solid rgba(0,243,255,0.1); background:rgba(15,23,42,0.9); display:flex; gap:10px; align-items:center;">
          <input id="chat-input" type="text" placeholder="اكتب رسالتك لميمو..." style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:25px; padding:12px 18px; color:white; font-size:13px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#00f3ff'">
          <button id="chat-send" style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; width:45px; height:45px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 4px 15px rgba(0,243,255,0.3); transition:0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    // إضافة النوافذ إلى الصفحة
    const div = document.createElement('div');
    div.innerHTML = teaserHTML + chatHTML;
    document.body.appendChild(div);

    const teaser = document.getElementById('mimo-teaser');
    const teaserBtn = document.getElementById('mimo-teaser-btn');
    const closeTeaser = document.getElementById('mimo-close-teaser');
    const toggleBtn = document.getElementById('chat-toggle');
    const closeBtn = document.getElementById('chat-close');
    const windowEl = document.getElementById('chat-window');
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const messagesEl = document.getElementById('chat-messages');

    // إظهار النافذة الترحيبية بعد 3 ثواني (إذا لم يفتح المحادثة)
    setTimeout(() => {
      if (windowEl.style.display === 'none' && !localStorage.getItem('mimo_teaser_closed')) {
        teaser.style.display = 'block';
        teaser.style.animation = 'slideUp 0.5s ease-out';
      }
    }, 3000);

    // إغلاق النافذة الترحيبية
    closeTeaser.onclick = () => {
      teaser.style.display = 'none';
      localStorage.setItem('mimo_teaser_closed', 'true');
    };

    // فتح المحادثة من النافذة الترحيبية
    teaserBtn.onclick = () => {
      teaser.style.display = 'none';
      windowEl.style.display = 'flex';
      windowEl.style.animation = 'slideUp 0.3s ease-out';
    };

    toggleBtn.onclick = () => {
      if (windowEl.style.display === 'none') {
        windowEl.style.display = 'flex';
        teaser.style.display = 'none';
        windowEl.style.animation = 'slideUp 0.3s ease-out';
      } else {
        windowEl.style.display = 'none';
      }
    };

    closeBtn.onclick = () => { windowEl.style.display = 'none'; };

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;

      // إضافة رسالة الزبون
      messagesEl.innerHTML += `<div style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; padding:12px 16px; border-radius:15px 15px 15px 0; font-size:13px; align-self:flex-end; max-width:85%; box-shadow:0 4px 10px rgba(0,243,255,0.2);">${text}</div>`;
      inputEl.value = '';
      messagesEl.scrollTop = messagesEl.scrollHeight;

      // مؤشر الكتابة
      const loadingId = 'loading-' + Date.now();
      messagesEl.innerHTML += `
        <div id="${loadingId}" style="display:flex; align-items:center; gap:5px; background:rgba(30,41,59,0.8); padding:10px 15px; border-radius:15px 15px 0 15px; align-self:flex-start; width:fit-content;">
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animate:pulse 1s infinite;"></span>
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animate:pulse 1s infinite 0.2s;"></span>
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animate:pulse 1s infinite 0.4s;"></span>
        </div>`;
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 ثواني
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        document.getElementById(loadingId).remove();

        if (data.reply) {
          messagesEl.innerHTML += `<div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13px; align-self:flex-start; max-width:85%; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 10px rgba(0,0,0,0.2);">${data.reply}</div>`;
        } else {
          messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">حدث خطأ، يرجى المحاولة لاحقاً.</div>`;
        }
      } catch(e) {
        if (e.name === 'AbortError') {
           document.getElementById(loadingId).remove();
           messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">السيرفر استغرق وقتاً طويلاً. يرجى المحاولة لاحقاً.</div>`;
           return;
        }
        document.getElementById(loadingId).remove();
        messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">حدث خطأ في الاتصال.</div>`;
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  });

  // إضافة حركات الأنيميشن
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.3; transform: scale(0.8); } }
    #chat-messages::-webkit-scrollbar { width: 5px; }
    #chat-messages::-webkit-scrollbar-track { background: transparent; }
    #chat-messages::-webkit-scrollbar-thumb { background: rgba(0,243,255,0.3); border-radius: 10px; }
  `;
  document.head.appendChild(style);
})();
