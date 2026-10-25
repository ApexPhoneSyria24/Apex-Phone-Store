(function() {
  const chatHTML = `
    <div id="chat-widget" style="position:fixed; bottom:20px; right:20px; z-index:9999; font-family:'Cairo', sans-serif;" dir="rtl">
      <button id="chat-toggle" style="width:65px; height:65px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:2px solid rgba(255,255,255,0.2); box-shadow:0 4px 20px rgba(0,243,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:28px; transition:transform 0.3s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🤖</button>
      
      <div id="chat-window" style="display:none; position:absolute; bottom:85px; right:0; width:340px; height:500px; background:rgba(10,10,10,0.95); backdrop-filter:blur(15px); border:1px solid rgba(0,243,255,0.3); border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.8); overflow:hidden; flex-direction:column;">
        <div style="background:linear-gradient(90deg, #0f172a, #1e293b); padding:15px; border-bottom:1px solid rgba(0,243,255,0.2); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:35px; height:35px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px;">🤖</div>
            <div>
              <div style="color:white; font-weight:900; font-size:14px;">ميمو (Mimo)</div>
              <div style="color:#00f3ff; font-size:10px; display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:6px; height:6px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
            </div>
          </div>
          <button id="chat-close" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px;">✕</button>
        </div>

        <div id="chat-messages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background-image:radial-gradient(circle at 50% 0%, rgba(0,243,255,0.05), transparent 70%);">
          <div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13px; align-self:flex-start; max-width:85%; border:1px solid rgba(255,255,255,0.05);">
            أهلاً بك في متجر <b>Apex Phone Syria</b>! 🥰<br>أنا <b>ميمو</b>، مساعدك الشخصي الذكي. نحن المتجر الأول والموثوق في سوريا. كيف يمكنني أن أخدمك اليوم؟ ✨
          </div>
        </div>

        <div style="padding:12px; border-top:1px solid rgba(0,243,255,0.1); background:rgba(15,23,42,0.9); display:flex; gap:10px; align-items:center;">
          <input id="chat-input" type="text" placeholder="اكتب رسالتك لميمو..." style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:25px; padding:12px 18px; color:white; font-size:13px; outline:none;">
          <button id="chat-send" style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; width:45px; height:45px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px;"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const div = document.createElement('div');
    div.innerHTML = chatHTML;
    document.body.appendChild(div.firstElementChild);

    const toggleBtn = document.getElementById('chat-toggle');
    const closeBtn = document.getElementById('chat-close');
    const windowEl = document.getElementById('chat-window');
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const messagesEl = document.getElementById('chat-messages');

    toggleBtn.onclick = () => { windowEl.style.display = windowEl.style.display === 'none' ? 'flex' : 'none'; };
    closeBtn.onclick = () => { windowEl.style.display = 'none'; };

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;

      messagesEl.innerHTML += `<div style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; padding:12px 16px; border-radius:15px 15px 15px 0; font-size:13px; align-self:flex-end; max-width:85%;">${text}</div>`;
      inputEl.value = '';
      messagesEl.scrollTop = messagesEl.scrollHeight;

      const loadingId = 'loading-' + Date.now();
      messagesEl.innerHTML += `<div id="${loadingId}" style="color:#888; font-size:12px; align-self:flex-start;">جاري الكتابة... ⏳</div>`;
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        // إضافة مؤقت 10 ثواني
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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
          messagesEl.innerHTML += `<div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13px; align-self:flex-start; max-width:85%;">${data.reply}</div>`;
        } else {
          messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start;">حدث خطأ.</div>`;
        }
      } catch(e) {
        document.getElementById(loadingId)?.remove();
        if (e.name === 'AbortError') {
           messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start;">السيرفر استغرق وقتاً طويلاً. يرجى المحاولة لاحقاً.</div>`;
        } else {
           messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start;">حدث خطأ في الاتصال.</div>`;
        }
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  });
})();
