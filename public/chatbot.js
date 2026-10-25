(function() {
  // --- محرك الأصوات ---
  let audioCtx;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'receive') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
      }
    } catch(e) {}
  }

  const chatHTML = `
    <div id="chat-widget" style="position:fixed; bottom:20px; right:20px; z-index:99999; font-family:'Cairo', sans-serif;" dir="rtl">
      <button id="chat-toggle" style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:2px solid rgba(255,255,255,0.2); box-shadow:0 4px 20px rgba(0,243,255,0.5); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:26px; transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🤖</button>
      
      <div id="chat-window" style="display:none; position:absolute; bottom:75px; right:0; width:calc(100vw - 40px); max-width:360px; height:calc(100vh - 120px); max-height:550px; background:rgba(10,10,10,0.95); backdrop-filter:blur(15px); border:1px solid rgba(0,243,255,0.3); border-radius:20px; box-shadow:0 20px 40px rgba(0,0,0,0.8); overflow:hidden; flex-direction:column; transform-origin: bottom right; animation: chatPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
        
        <!-- رأس النافذة -->
        <div style="background:linear-gradient(90deg, #0f172a, #1e293b); padding:15px; border-bottom:1px solid rgba(0,243,255,0.2); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:35px; height:35px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px;">🤖</div>
            <div>
              <div style="color:white; font-weight:900; font-size:15px;">ميمو (Mimo)</div>
              <div style="color:#00f3ff; font-size:11px; display:flex; align-items:center; gap:5px;"><span style="display:inline-block; width:6px; height:6px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
            </div>
          </div>
          <button id="chat-close" style="background:none; border:none; color:#888; cursor:pointer; font-size:22px; transition:0.2s;" onmouseover="this.style.color='white'">✕</button>
        </div>

        <!-- الرسائل -->
        <div id="chat-messages" style="flex:1; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; background-image:radial-gradient(circle at 50% 0%, rgba(0,243,255,0.05), transparent 70%);">
          <div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13.5px; align-self:flex-start; max-width:88%; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 10px rgba(0,0,0,0.2); line-height:1.6;">
            أهلاً بك في <b>Apex Phone Syria</b>! 🥰<br>أنا <b>ميمو</b>. كيف يمكنني مساعدتك اليوم؟
          </div>
        </div>

        <!-- الإدخال -->
        <div style="padding:12px; border-top:1px solid rgba(0,243,255,0.1); background:rgba(15,23,42,0.9); display:flex; gap:10px; align-items:center; flex-shrink:0;">
          <input id="chat-input" type="text" placeholder="اكتب رسالتك هنا..." style="flex:1; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1); border-radius:25px; padding:12px 16px; color:white; font-size:13.5px; outline:none; transition:border 0.3s;" onfocus="this.style.borderColor='#00f3ff'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
          <button id="chat-send" style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; width:42px; height:42px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 4px 15px rgba(0,243,255,0.3); transition:0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><i class="fa-solid fa-paper-plane"></i></button>
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

      // تشغيل صوت الإرسال
      playSound('send');

      // إضافة رسالة الزبون
      messagesEl.innerHTML += `<div style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; padding:12px 16px; border-radius:15px 15px 15px 0; font-size:13.5px; align-self:flex-end; max-width:88%; box-shadow:0 4px 10px rgba(0,243,255,0.2); line-height:1.5;">${text}</div>`;
      inputEl.value = '';
      messagesEl.scrollTop = messagesEl.scrollHeight;

      // مؤشر الكتابة
      const loadingId = 'loading-' + Date.now();
      messagesEl.innerHTML += `
        <div id="${loadingId}" style="display:flex; align-items:center; gap:5px; background:rgba(30,41,59,0.8); padding:12px 16px; border-radius:15px 15px 0 15px; align-self:flex-start; width:fit-content;">
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animation: pulse 1s infinite;"></span>
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animation: pulse 1s infinite 0.2s;"></span>
          <span style="width:6px; height:6px; background:#00f3ff; border-radius:50%; animation: pulse 1s infinite 0.4s;"></span>
        </div>`;
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
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
        document.getElementById(loadingId)?.remove();

        if (data.reply) {
          // تشغيل صوت الاستلام
          playSound('receive');
          messagesEl.innerHTML += `<div style="background:rgba(30,41,59,0.8); color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:13.5px; align-self:flex-start; max-width:88%; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 10px rgba(0,0,0,0.2); line-height:1.6;">${data.reply}</div>`;
        } else {
          messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">حدث خطأ، يرجى المحاولة لاحقاً.</div>`;
        }
      } catch(e) {
        document.getElementById(loadingId)?.remove();
        if (e.name === 'AbortError') {
           messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">السيرفر استغرق وقتاً طويلاً. يرجى المحاولة لاحقاً.</div>`;
        } else {
           messagesEl.innerHTML += `<div style="color:#ef4444; font-size:12px; align-self:flex-start; padding:10px; background:rgba(239,68,68,0.1); border-radius:10px;">حدث خطأ في الاتصال.</div>`;
        }
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  });

  // إضافة الأنيميشن
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes chatPop { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes pulse { 0% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.3; transform: scale(0.8); } }
    #chat-messages::-webkit-scrollbar { width: 4px; }
    #chat-messages::-webkit-scrollbar-track { background: transparent; }
    #chat-messages::-webkit-scrollbar-thumb { background: rgba(0,243,255,0.3); border-radius: 10px; }
  `;
  document.head.appendChild(style);
})();
