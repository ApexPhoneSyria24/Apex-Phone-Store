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

  let visitorId = localStorage.getItem('apex_visitor_id');
  if (!visitorId) {
    visitorId = 'VIS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('apex_visitor_id', visitorId);
  }

  const widgetHTML = `
    <button id="chat-toggle" style="position:fixed; bottom:25px; right:25px; width:65px; height:65px; border-radius:50%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:3px solid rgba(255,255,255,0.15); box-shadow:0 6px 25px rgba(0,243,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:28px; z-index:99999; transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <i class="fa-solid fa-comment-dots" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>
    </button>
    
    <div id="chat-window" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:#0a192f; z-index:100000; font-family:'Cairo', sans-serif; flex-direction:column; overflow:hidden;" dir="rtl">
      
      <div style="background:#112240; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
        <div style="display:flex; align-items:center; gap:15px;">
          <div style="width:45px; height:45px; background:#00f3ff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px;">
            <i class="fa-solid fa-robot text-black"></i>
          </div>
          <div>
            <div style="color:#e6f1ff; font-weight:900; font-size:18px;">دعم Apex</div>
            <div style="color:#39ff14; font-size:12px; font-weight:bold; display:flex; align-items:center; gap:5px;"><span style="width:8px; height:8px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
          </div>
        </div>
        <button id="chat-close" style="background:none; border:none; color:#a8b2c1; width:40px; height:40px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div id="chat-messages" style="flex:1; min-height:0; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:5px; background-color:#0a192f;">
        
        <div id="choice-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:25px; text-align:center;">
          <div style="width:100px; height:100px; background:#00f3ff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:50px;">
            <i class="fa-solid fa-headset text-black"></i>
          </div>
          <h3 style="color:#e6f1ff; font-size:22px; font-weight:900; margin:0;">مرحباً بك! 🥰</h3>
          <p style="color:#8892b0; font-size:15px; margin:0; max-width:300px;">كيف تفضل أن نخدمك اليوم؟</p>
          
          <button id="btn-ai" style="width:100%; max-width:320px; background:#112240; border:2px solid #00f3ff; color:#e6f1ff; padding:18px; border-radius:15px; font-weight:bold; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:15px;">
            <i class="fa-solid fa-robot text-2xl text-[#00f3ff]"></i> التحدث مع ميمو (ذكاء اصطناعي)
          </button>
          
          <button id="btn-human" style="width:100%; max-width:320px; background:#112240; border:1px solid #334155; color:#e6f1ff; padding:18px; border-radius:15px; font-weight:bold; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:15px;">
            <i class="fa-solid fa-user-headset text-2xl text-[#8892b0]"></i> التحدث مع الدعم البشري
          </button>
        </div>

        <div id="ai-chat" style="display:none; flex-direction:column; gap:10px; width:100%;"></div>
        <div id="human-chat" style="display:none; flex-direction:column; gap:5px; width:100%;"></div>
        
        <div id="new-chat-options" style="display:none; flex-direction:column; gap:10px; margin-top:15px; align-items:center;">
          <button id="btn-yes-new" style="background:#00f3ff; color:#000; border:none; padding:10px 30px; border-radius:20px; font-weight:bold; font-size:14px; cursor:pointer; width:80%;">نعم، أريد محادثة جديدة</button>
          <button id="btn-no-new" style="background:#112240; color:#e6f1ff; border:1px solid #334155; padding:10px 30px; border-radius:20px; font-weight:bold; font-size:14px; cursor:pointer; width:80%;">لا، شكراً</button>
        </div>
      </div>

      <div id="input-area" style="display:none; padding:10px 15px; background:#112240; gap:10px; align-items:center; flex-shrink:0;">
        <input id="chat-input" type="text" placeholder="اكتب رسالة..." style="flex:1; background:#0a192f; border:none; border-radius:20px; padding:14px 20px; color:#e6f1ff; font-size:15px; outline:none;">
        <button id="chat-send" style="background:#00f3ff; color:#000; border:none; width:48px; height:48px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid fa-paper-plane"></i></button>
      </div>

      <div id="rating-screen" style="display:none; padding:30px; background:#0a192f; text-align:center; flex-direction:column; justify-content:center; align-items:center; height:100%; position:absolute; inset:0; z-index:10;">
        <h3 style="color:#e6f1ff; font-size:22px; font-weight:900; margin-bottom:10px;">تم إغلاق المحادثة</h3>
        <div style="display:flex; gap:10px; margin:20px 0;" id="stars-container">
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="1"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="2"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="3"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="4"></i>
          <i class="fa-solid fa-star star-btn text-4xl text-slate-600 cursor-pointer transition" data-val="5"></i>
        </div>
        <button id="submit-rating" style="background:#00f3ff; color:#000; border:none; padding:12px 40px; border-radius:30px; font-weight:bold;">إرسال التقييم</button>
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
    const messagesContainer = document.getElementById('chat-messages');
    const newChatOptions = document.getElementById('new-chat-options');
    
    let chatHistory = [];
    let isHumanMode = false;
    let isClosedDismissed = false;

    if (window.visualViewport) {
      const adjustViewport = () => {
        if (chatWindow.style.display === 'flex') {
          chatWindow.style.height = window.visualViewport.height + 'px';
          chatWindow.style.top = window.visualViewport.offsetTop + 'px';
          if(messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      };
      window.visualViewport.addEventListener('resize', adjustViewport);
      window.visualViewport.addEventListener('scroll', adjustViewport);
    }

    toggleBtn.onclick = () => { 
      chatWindow.style.display = 'flex'; 
      document.body.style.overflow = 'hidden';
      if (window.visualViewport) chatWindow.style.height = window.visualViewport.height + 'px';
    };
    closeBtn.onclick = () => { chatWindow.style.display = 'none'; document.body.style.overflow = ''; };

    btnAI.onclick = () => { choiceScreen.style.display = 'none'; aiChat.style.display = 'flex'; inputArea.style.display = 'flex'; inputEl.focus(); };

    btnHuman.onclick = async () => {
      choiceScreen.style.display = 'none';
      humanChat.style.display = 'flex';
      inputArea.style.display = 'flex';
      isHumanMode = true;
      isClosedDismissed = false;
      inputEl.focus();
      
      try {
        await fetch('/api/human-chat/init', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor_id: visitorId })
        });
      } catch(e) {}
      checkHumanChat();
    };

    async function checkHumanChat() {
      if (!isHumanMode) return;
      try {
        const res = await fetch('/api/human-chat/messages/' + visitorId);
        const data = await res.json();
        
        if (data.status === 'closed') {
          if (!isClosedDismissed) {
            inputArea.style.display = 'none';
            newChatOptions.style.display = 'flex';
          } else {
            inputArea.style.display = 'flex';
            newChatOptions.style.display = 'none';
          }
          if (data.rating > 0) {
            humanChat.innerHTML = '<div style="color:#00f3ff; text-align:center; margin-top:20px; font-weight:bold;">شكراً لتقييمك! ⭐</div>';
          } else {
            ratingScreen.style.display = 'flex';
          }
        } else {
          inputArea.style.display = 'flex';
          newChatOptions.style.display = 'none';
          ratingScreen.style.display = 'none'; // إخفاء شاشة التقييم عند بدء محادثة جديدة
          isClosedDismissed = false;
        }

        humanChat.innerHTML = data.messages.map(m => {
          const isAdmin = m.sender === 'admin';
          const isSystem = m.sender === 'system';
          
          if (isSystem) {
            return `<div style="text-align:center; color:#ef4444; font-size:12px; margin:10px 0; background:rgba(239,68,68,0.1); padding:5px; border-radius:5px; white-space: pre-wrap;">${m.message}</div>`;
          }
          
          const tick = m.sender === 'visitor' ? (m.is_read ? '<i class="fa-solid fa-check-double" style="color:#00f3ff; font-size:10px; margin-right:4px;"></i>' : '<i class="fa-solid fa-check" style="color:#8892b0; font-size:10px; margin-right:4px;"></i>') : '';
          
          return `<div style="background:${isAdmin ? '#112240' : '#0055ff'}; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-${isAdmin ? 'left' : 'right'}-radius:0; font-size:14px; align-self:${isAdmin ? 'flex-start' : 'flex-end'}; max-width:80%; box-shadow:0 1px 2px rgba(0,0,0,0.3); position:relative; margin-bottom:2px;">
            ${m.message}
            <div style="font-size:10px; color:#8892b0; text-align:left; margin-top:3px;">${tick} ${m.created_at.split(' ')[1].substring(0,5)}</div>
          </div>`;
        }).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch(e) {}
    }
    setInterval(checkHumanChat, 3000);

    document.getElementById('btn-yes-new').onclick = async () => {
      isClosedDismissed = false;
      newChatOptions.style.display = 'none';
      ratingScreen.style.display = 'none'; // إخفاء شاشة التقييم
      humanChat.innerHTML = ''; 
      await fetch('/api/human-chat/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId })
      });
      checkHumanChat();
    };
    
    document.getElementById('btn-no-new').onclick = () => {
      isClosedDismissed = true;
      newChatOptions.style.display = 'none';
      inputArea.style.display = 'flex';
    };

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
      await fetch('/api/human-chat/rate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, rating: selectedRating, feedback: '' })
      });
      ratingScreen.style.display = 'none';
      humanChat.innerHTML = '<div style="color:#00f3ff; text-align:center; margin-top:20px; font-weight:bold;">شكراً لتقييمك! ⭐</div>';
    };

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;
      playSound('send');
      inputEl.value = '';

      if (isHumanMode) {
        humanChat.innerHTML += `<div style="background:#0055ff; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-right-radius:0; font-size:14px; align-self:flex-end; max-width:80%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px;">
          ${text}
          <div style="font-size:10px; color:#8892b0; text-align:left; margin-top:3px;"><i class="fa-solid fa-check" style="color:#8892b0; font-size:10px; margin-right:4px;"></i> الآن</div>
        </div>`;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
          await fetch('/api/human-chat/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitor_id: visitorId, message: text })
          });
        } catch(e) {}
        return;
      }

      // AI Mode
      aiChat.innerHTML += `<div style="background:#0055ff; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-right-radius:0; font-size:14px; align-self:flex-end; max-width:80%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px;">${text}</div>`;
      chatHistory.push({ role: 'user', text: text });
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: chatHistory })
        });
        const data = await res.json();
        if (data.reply) {
          playSound('receive');
          chatHistory.push({ role: 'model', text: data.reply });
          aiChat.innerHTML += `<div style="background:#112240; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-left-radius:0; font-size:14px; align-self:flex-start; max-width:80%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px;">${data.reply}</div>`;
        }
      } catch(e) {}
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  });
})();
