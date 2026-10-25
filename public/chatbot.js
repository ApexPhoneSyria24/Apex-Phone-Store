(function() {
  const chatHTML = `
    <div id="chat-widget" style="position:fixed; bottom:20px; right:20px; z-index:9999; font-family:'Cairo', sans-serif;" dir="rtl">
      <button id="chat-toggle" style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; box-shadow:0 4px 15px rgba(0,243,255,0.4); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:24px; transition:transform 0.2s;">
        <i class="fa-solid fa-comment-dots"></i>
      </button>
      <div id="chat-window" style="display:none; position:absolute; bottom:80px; right:0; width:320px; height:450px; background:#0a0a0a; border:1px solid #00f3ff; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.8); overflow:hidden; flex-direction:column;">
        <div style="background:#111; padding:15px; border-bottom:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
          <div style="color:white; font-weight:bold; font-size:14px;"><i class="fa-solid fa-robot" style="color:#00f3ff; margin-left:5px;"></i> مساعد Apex</div>
          <button id="chat-close" style="background:none; border:none; color:#888; cursor:pointer; font-size:18px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="chat-messages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
          <div style="background:#1e293b; color:#e2e8f0; padding:10px 15px; border-radius:10px 10px 0 10px; font-size:13px; align-self:flex-start; max-width:85%;">
            مرحباً بك في Apex Phone! كيف يمكنني مساعدتك اليوم؟ 🚀
          </div>
        </div>
        <div style="padding:10px; border-top:1px solid #222; background:#111; display:flex; gap:10px;">
          <input id="chat-input" type="text" placeholder="اكتب رسالتك..." style="flex:1; background:#000; border:1px solid #333; border-radius:20px; padding:10px 15px; color:white; font-size:13px; outline:none;">
          <button id="chat-send" style="background:#00f3ff; color:#000; border:none; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-paper-plane"></i></button>
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

    toggleBtn.onclick = () => {
      windowEl.style.display = windowEl.style.display === 'none' ? 'flex' : 'none';
    };

    closeBtn.onclick = () => { windowEl.style.display = 'none'; };

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;

      messagesEl.innerHTML += `<div style="background:#00f3ff; color:#000; padding:10px 15px; border-radius:10px 10px 10px 0; font-size:13px; align-self:flex-end; max-width:85%;">${text}</div>`;
      inputEl.value = '';
      messagesEl.scrollTop = messagesEl.scrollHeight;

      const loadingId = 'loading-' + Date.now();
      messagesEl.innerHTML += `<div id="${loadingId}" style="color:#888; font-size:12px; align-self:flex-start;">جاري الكتابة... <i class="fa-solid fa-spinner fa-spin"></i></div>`;
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const data = await res.json();
        document.getElementById(loadingId).remove();

        if (data.reply) {
          messagesEl.innerHTML += `<div style="background:#1e293b; color:#e2e8f0; padding:10px 15px; border-radius:10px 10px 0 10px; font-size:13px; align-self:flex-start; max-width:85%;">${data.reply}</div>`;
        } else {
          messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start;">حدث خطأ، يرجى المحاولة لاحقاً.</div>`;
        }
      } catch(e) {
        document.getElementById(loadingId).remove();
        messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start;">حدث خطأ في الاتصال.</div>`;
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  });
})();
