(function() {
  let audioCtx;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      if (type === 'send') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1); }
      else { osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1); }
      gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } catch(e) {}
  }

  // ضمان وجود معرف للزائر حتى لو لم يضعه السيرفر بعد
  let visitorId = document.cookie.split('; ').find(row => row.startsWith('apex_vid='))?.split('=')[1];
  if (!visitorId) {
    visitorId = 'VIS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    document.cookie = "apex_vid=" + visitorId + "; path=/; max-age=31536000";
  }

  const widgetHTML = `
    <button id="chat-toggle" style="position:fixed; bottom:25px; right:25px; width:65px; height:65px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:3px solid rgba(255,255,255,0.15); box-shadow:0 6px 25px rgba(0,243,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:28px; z-index:99999; transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <i class="fa-solid fa-comment-dots" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
    </button>
    
    <!-- تحسين الشاشة لتتناسب مع الكيبورد -->
    <div id="chat-window" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100dvh; background:#0b1120; z-index:100000; font-family:'Cairo', sans-serif; flex-direction:column; overflow:hidden;" dir="rtl">
      
      <div style="background:rgba(30,41,59,0.95); padding:15px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; box-shadow:0 4px 20px rgba(0,0,0,0.4); flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:15px;">
          <div style="width:45px; height:45px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; box-shadow:0 0 20px rgba(0,243,255,0.4);">
            <i class="fa-solid fa-robot text-white"></i>
          </div>
          <div>
            <div style="color:white; font-weight:900; font-size:18px;">دعم Apex</div>
            <div style="color:#39ff14; font-size:12px; font-weight:bold; display:flex; align-items:center; gap:5px;"><span style="width:8px; height:8px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
          </div>
        </div>
        <button id="chat-close" style="background:#334155; border:none; color:#94a3b8; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px;" onmouseover="this.style.background='#ef4444'; this.style.color='white'"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <!-- min-height:0 ضروري جداً لكي لا ينكسر التصميم مع الكيبورد -->
      <div id="chat-messages" style="flex:1; min-height:0; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:15px; background-image:radial-gradient(circle at 50% 0%, rgba(0,243,255,0.05), transparent 70%);">
        
        <div id="choice-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:25px; text-align:center;">
          <div style="width:100px; height:100px; background:linear-gradient(135deg, #00f3ff, #0055ff); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:50px; box-shadow:0 0 40px rgba(0,243,255,0.4);">
            <i class="fa-solid fa-headset text-white"></i>
          </div>
          <h3 style="color:white; font-size:22px; font-weight:900; margin:0;">مرحباً بك في المتجر الأول! 🥰</h3>
          <p style="color:#94a3b8; font-size:15px; margin:0; max-width:300px;">كيف تفضل أن نخدمك اليوم؟ اختر طريقة التواصل:</p>
          
          <button id="btn-ai" style="width:100%; max-width:320px; background:linear-gradient(135deg, #0f172a, #1e293b); border:2px solid #00f3ff; color:white; padding:18px; border-radius:15px; font-weight:bold; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:15px; transition:0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fa-solid fa-robot text-2xl text-cyan-400"></i> التحدث مع ميمو (ذكاء اصطناعي)
          </button>
          
          <button id="btn-human" style="width:100%; max-width:320px; background:#1e293b; border:1px solid #334155; color:white; padding:18px; border-radius:15px; font-weight:bold; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:15px; transition:0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
            <i class="fa-solid fa-user-headset text-2xl text-slate-400"></i> التحدث مع الدعم البشري
          </button>
        </div>

        <div id="ai-chat" style="display:none; flex-direction:column; gap:15px; width:100%;">
          <div style="background:#1e293b; color:#e2e8f0; padding:15px; border-radius:15px 15px 0 15px; font-size:15px; align-self:flex-start; max-width:88%; border:1px solid rgba(255,255,255,0.05);">
            مرحباً بك! أنا ميمو. كيف يمكنني مساعدتك في اختيار هاتفك أو شحن ألعابك؟ ✨
          </div>
        </div>

        <div id="human-chat" style="display:none; flex-direction:column; gap:15px; width:100%;"></div>
      </div>

      <div id="input-area" style="display:none; padding:15px; background:#1e293b; border-top:1px solid #334155; gap:10px; align-items:center; flex-shrink:0;">
        <input id="chat-input" type="text" placeholder="اكتب رسالتك هنا..." style="flex:1; background:#0f172a; border:1px solid #334155; border-radius:30px; padding:14px 20px; color:white; font-size:15px; outline:none; transition:0.3s;" onfocus="this.style.borderColor='#00f3ff'">
        <button id="chat-send" style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; width:50px; height:50px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 4px 15px rgba(0,243,255,0.3);"><i class="fa-solid fa-paper-plane"></i></button>
      </div>

      <div id="rating-screen" style="display:none; padding:30px; background:#0b1120; text-align:center; flex-direction:column; justify-content:center; align-items:center; height:100%; position:absolute; inset:0; z-index:10;">
        <h3 style="color:white; font-size:22px; font-weight:900; margin-bottom:10px;">تم إغلاق المحادثة</h3>
        <p style="color:#94a3b8; margin-bottom:30px;">كيف كانت تجربتك مع الدعم؟</p>
        <div style="display:flex; gap:10px; margin-bottom:30px;" id="stars-container">
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="1"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="2"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="3"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="4"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="5"></i>
        </div>
        <textarea id="rating-feedback" placeholder="أضف ملاحظاتك (اختياري)..." style="width:100%; max-width:300px; background:#1e293b; border:1px solid #334155; border-radius:12px; padding:15px; color:white; margin-bottom:20px; outline:none; resize:none;" rows="3"></textarea>
        <button id="submit-rating" style="background:#00f3ff; color:#000; border:none; padding:12px 40px; border-radius:30px; font-weight:bold; font-size:16px; cursor:pointer;">إرسال التقييم</button>
      </div>

    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const div = document.createElement('div');
    div.innerHTML = widgetHTML;
    document.body.appendChild(div);

    const toggleBtn = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('chat-close');
    
    const choiceScreen = document.getElementById('choice-screen');
    const aiChat = document.getElementById('ai-chat');
    const humanChat = document.getElementById('human-chat');
    const inputArea = document.getElementById('input-area');
    const ratingScreen = document.getElementById('rating-screen');
    
    const btnAI = document.getElementById('btn-ai');
    const btnHuman = document.getElementById('btn-human');

    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    
    let chatHistory = [];
    let isHumanMode = false;

    // منع تمرير الصفحة الخلفية عند فتح المحادثة
    toggleBtn.onclick = () => { 
      chatWindow.style.display = 'flex'; 
      document.body.style.overflow = 'hidden'; 
    };
    closeBtn.onclick = () => { 
      chatWindow.style.display = 'none'; 
      document.body.style.overflow = ''; 
    };

    btnAI.onclick = () => {
      choiceScreen.style.display = 'none';
      aiChat.style.display = 'flex';
      inputArea.style.display = 'flex';
      inputEl.focus();
    };

    btnHuman.onclick = () => {
      choiceScreen.style.display = 'none';
      humanChat.style.display = 'flex';
      inputArea.style.display = 'flex';
      isHumanMode = true;
      inputEl.focus();
      checkHumanChat();
    };

    async function checkHumanChat() {
      if (!isHumanMode) return;
      try {
        const res = await fetch('/api/human-chat/messages/' + visitorId);
        const data = await res.json();
        
        if (data.status === 'closed') {
          inputArea.style.display = 'none';
          if (data.rating > 0) {
            humanChat.innerHTML = '<div style="color:#39ff14; text-align:center; margin-top:20px; font-weight:bold;">شكراً لتقييمك! ⭐</div>';
          } else {
            ratingScreen.style.display = 'flex';
          }
        }

        // تحديث الرسائل مع الحفاظ على الرسائل التي أرسلها المستخدم للتو
        const renderedMessages = data.messages.map(m => {
          const isAdmin = m.sender === 'admin';
          const isSystem = m.sender === 'system';
          if (isSystem) return `<div style="text-align:center; color:#ef4444; font-size:12px; margin:10px 0;">${m.message}</div>`;
          return `<div style="background:${isAdmin ? '#1e293b' : 'linear-gradient(135deg, #00f3ff, #0055ff)'}; color:${isAdmin ? '#e2e8f0' : 'white'}; padding:12px 16px; border-radius:15px ${isAdmin ? '15px 0 15px' : '15px 15px 0'}; font-size:14px; align-self:${isAdmin ? 'flex-start' : 'flex-end'}; max-width:85%; box-shadow:0 2px 5px rgba(0,0,0,0.2);">${m.message}</div>`;
        }).join('');
        
        humanChat.innerHTML = renderedMessages;
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch(e) {}
    }
    setInterval(checkHumanChat, 3000);

    let selectedRating = 0;
    document.querySelectorAll('.star-btn').forEach(star => {
      star.onclick = function() {
        selectedRating = parseInt(this.getAttribute('data-val'));
        document.querySelectorAll('.star-btn').forEach(s => {
          s.style.color = parseInt(s.getAttribute('data-val')) <= selectedRating ? '#fbbf24' : '#475569';
        });
      };
    });

    document.getElementById('submit-rating').onclick = async () => {
      if (selectedRating === 0) return alert('يرجى اختيار النجوم أولاً');
      const feedback = document.getElementById('rating-feedback').value;
      await fetch('/api/human-chat/rate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, rating: selectedRating, feedback })
      });
      ratingScreen.style.display = 'none';
      humanChat.innerHTML = '<div style="color:#39ff14; text-align:center; margin-top:20px; font-weight:bold;">شكراً لتقييمك! ⭐</div>';
    };

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      playSound('send');
      inputEl.value = '';

      if (isHumanMode) {
        // إضافة الرسالة فوراً للشاشة لكي لا يظن المستخدم أنها لم ترسل
        humanChat.innerHTML += `<div style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; padding:12px 16px; border-radius:15px 15px 15px 0; font-size:14px; align-self:flex-end; max-width:85%; box-shadow:0 2px 5px rgba(0,0,0,0.2);">${text}</div>`;
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
          await fetch('/api/human-chat/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitor_id: visitorId, message: text })
          });
        } catch(e) {}
        return;
      }

      aiChat.innerHTML += `<div style="background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; padding:12px 16px; border-radius:15px 15px 15px 0; font-size:14px; align-self:flex-end; max-width:85%;">${text}</div>`;
      chatHistory.push({ role: 'user', text: text });
      const messagesContainer = document.getElementById('chat-messages');
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      const loadingId = 'loading-' + Date.now();
      aiChat.innerHTML += `<div id="${loadingId}" style="color:#888; font-size:12px; align-self:flex-start;">جاري الكتابة... ⏳</div>`;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: chatHistory })
        });
        const data = await res.json();
        document.getElementById(loadingId)?.remove();
        if (data.reply) {
          playSound('receive');
          chatHistory.push({ role: 'model', text: data.reply });
          aiChat.innerHTML += `<div style="background:#1e293b; color:#e2e8f0; padding:12px 16px; border-radius:15px 15px 0 15px; font-size:14px; align-self:flex-start; max-width:85%; border:1px solid rgba(255,255,255,0.05);">${data.reply}</div>`;
        }
      } catch(e) {}
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  });
})();
