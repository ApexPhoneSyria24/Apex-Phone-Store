(function() {
  let audioCtx;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;
      if (type === 'send') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1); }
      else if (type === 'receive') { osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1); }
      else if (type === 'pop') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15); }
      gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } catch(e) {}
  }

  document.addEventListener('click', () => { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } }, { once: true });

  let visitorId = localStorage.getItem('apex_visitor_id');
  if (!visitorId) {
    visitorId = 'VIS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('apex_visitor_id', visitorId);
  }

  const mimoImageUrl = 'https://cdn-icons-png.flaticon.com/512/4712/4712035.png';

  const widgetHTML = `
    <!-- Teaser -->
    <div id="mimo-teaser" style="display:none; position:fixed; bottom:90px; right:25px; z-index:999999; background:rgba(17,34,64,0.95); backdrop-filter:blur(10px); border:1px solid #00f3ff; border-radius:20px 20px 0 20px; padding:15px; width:270px; box-shadow:0 10px 30px rgba(0,243,255,0.3); font-family:'Cairo', sans-serif; transform-origin: bottom right; opacity: 0; transition: opacity 0.5s ease, transform 0.5s ease; transform: translateY(20px);" dir="rtl">
      <button id="mimo-close-teaser" style="position:absolute; top:-10px; left:-10px; background:#ef4444; color:white; border:none; width:24px; height:24px; border-radius:50%; cursor:pointer; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.3);">✕</button>
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <div style="width:45px; height:45px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid #00f3ff; box-shadow:0 0 15px rgba(0,243,255,0.5);">
          <img src="${mimoImageUrl}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div>
          <h4 style="color:#e6f1ff; margin:0; font-size:16px; font-weight:900;">ميمو (Mimo)</h4>
          <span style="color:#39ff14; font-size:11px; font-weight:bold;">مساعدك الذكي</span>
        </div>
      </div>
      <p style="color:#a8b2c1; font-size:13px; margin:0 0 12px 0; line-height:1.6;">أهلاً بك في <b>Apex Phone</b>! 🥰<br>هل تحتاج مساعدة في اختيار جهازك أو شحن ألعابك؟</p>
      <button id="mimo-teaser-btn" style="width:100%; background:linear-gradient(135deg, #00f3ff, #0055ff); color:white; border:none; padding:10px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 4px 10px rgba(0,243,255,0.3);">تحدث معي الآن 💬</button>
    </div>

    <button id="chat-toggle" style="position:fixed; bottom:25px; right:25px; width:55px; height:55px; border-radius:50%; background:#112240; color:white; border:3px solid #00f3ff; box-shadow:0 6px 25px rgba(0,243,255,0.6); cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:22px; z-index:999998; transition:transform 0.3s; overflow:hidden;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      <img src="${mimoImageUrl}" style="width:100%; height:100%; object-fit:cover; background:#fff;">
    </button>
    
    <div id="chat-window" style="display:none; position:fixed; top:0; left:0; width:100%; height:100vh; background:#0a192f; z-index:999999; font-family:'Cairo', sans-serif; flex-direction:column; overflow:hidden;" dir="rtl">
      
      <div style="background:#112240; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-shadow:0 2px 5px rgba(0,0,0,0.2);">
        <div style="display:flex; align-items:center; gap:12px;">
          <button id="chat-back-btn" style="display:none; background:none; border:none; color:#00f3ff; font-size:20px; cursor:pointer; padding:0 5px;"><i class="fa-solid fa-arrow-right"></i></button>
          <div style="width:40px; height:40px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; border:2px solid #00f3ff;">
            <img src="${mimoImageUrl}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <div>
            <div id="chat-title" style="color:#e6f1ff; font-weight:900; font-size:16px;">دعم Apex</div>
            <div style="color:#39ff14; font-size:11px; font-weight:bold; display:flex; align-items:center; gap:5px;"><span style="width:6px; height:6px; background:#39ff14; border-radius:50%;"></span> متصل الآن</div>
          </div>
        </div>
        <button id="chat-close" style="background:none; border:none; color:#a8b2c1; width:35px; height:35px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:20px;"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div id="chat-messages" style="flex:1; min-height:0; padding:15px; overflow-y:auto; display:flex; flex-direction:column; gap:5px; background-color:#0a192f;">
        
        <div id="choice-screen" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:20px; text-align:center;">
          <div style="width:80px; height:80px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; border:3px solid #00f3ff; box-shadow:0 0 30px rgba(0,243,255,0.4);">
             <img src="${mimoImageUrl}" style="width:100%; height:100%; object-fit:cover;">
          </div>
          <h3 style="color:#e6f1ff; font-size:20px; font-weight:900; margin:0; line-height:1.5;">أهلاً بك في <span style="color:#00f3ff;">Apex Phone</span>! 👑</h3>
          <p style="color:#8892b0; font-size:13px; margin:0; max-width:280px; line-height:1.8;">
            المتجر الأول والموثوق في سوريا لبيع الهواتف الذكية الأصلية وشحن الألعاب.<br>
            أنا <b>ميمو</b>، مساعدك الشخصي الذكي. كيف يمكنني أن أخدمك اليوم؟ ✨
          </p>
          
          <button id="btn-ai" style="width:100%; max-width:300px; background:#112240; border:2px solid #00f3ff; color:#e6f1ff; padding:15px; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;">
            <i class="fa-solid fa-robot text-xl text-[#00f3ff]"></i> التحدث مع ميمو (ذكاء اصطناعي)
          </button>
          
          <button id="btn-human" style="width:100%; max-width:300px; background:#112240; border:1px solid #334155; color:#e6f1ff; padding:15px; border-radius:12px; font-weight:bold; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px;">
            <i class="fa-solid fa-user-headset text-xl text-[#8892b0]"></i> التحدث مع الدعم البشري
          </button>
        </div>

        <div id="ai-chat" style="display:none; flex-direction:column; gap:8px; width:100%;"></div>
        <div id="human-chat" style="display:none; flex-direction:column; gap:5px; width:100%;"></div>
        
        <div id="new-chat-options" style="display:none; flex-direction:column; gap:10px; margin-top:15px; align-items:center;">
          <button id="btn-yes-new" style="background:#00f3ff; color:#000; border:none; padding:10px 30px; border-radius:20px; font-weight:bold; font-size:14px; cursor:pointer; width:80%;">نعم، أريد محادثة جديدة</button>
          <button id="btn-no-new" style="background:#112240; color:#e6f1ff; border:1px solid #334155; padding:10px 30px; border-radius:20px; font-weight:bold; font-size:14px; cursor:pointer; width:80%;">لا، شكراً</button>
        </div>
      </div>

      <div id="input-area" style="display:none; padding:10px 12px; background:#112240; gap:10px; align-items:center; flex-shrink:0;">
        <input id="chat-input" type="text" placeholder="اكتب رسالة..." style="flex:1; background:#0a192f; border:none; border-radius:20px; padding:12px 15px; color:#e6f1ff; font-size:14px; outline:none;">
        <button id="chat-send" style="background:#00f3ff; color:#000; border:none; width:42px; height:42px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px;"><i class="fa-solid fa-paper-plane"></i></button>
      </div>

      <div id="rating-screen" style="display:none; padding:20px; background:#0a192f; text-align:center; flex-direction:column; justify-content:center; align-items:center; height:100%; position:absolute; inset:0; z-index:10;">
        <h3 style="color:#e6f1ff; font-size:20px; font-weight:900; margin-bottom:10px;">تم إغلاق المحادثة</h3>
        <div style="display:flex; gap:8px; margin:15px 0;" id="stars-container">
          <i class="fa-solid fa-star star-btn text-3xl text-slate-600 cursor-pointer transition" data-val="1"></i>
          <i class="fa-solid fa-star star-btn text-3xl text-slate-600 cursor-pointer transition" data-val="2"></i>
          <i class="fa-solid fa-star star-btn text-3xl text-slate-600 cursor-pointer transition" data-val="3"></i>
          <i class="fa-solid fa-star star-btn text-3xl text-slate-600 cursor-pointer transition" data-val="4"></i>
          <i class="fa-solid fa-star star-btn text-3xl text-slate-600 cursor-pointer transition" data-val="5"></i>
        </div>
        <button id="submit-rating" style="background:#00f3ff; color:#000; border:none; padding:10px 30px; border-radius:30px; font-weight:bold;">إرسال التقييم</button>
      </div>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    const div = document.createElement('div');
    div.innerHTML = widgetHTML;
    document.body.appendChild(div);

    const teaser = document.getElementById('mimo-teaser');
    const closeTeaser = document.getElementById('mimo-close-teaser');
    const teaserBtn = document.getElementById('mimo-teaser-btn');
    const toggleBtn = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('chat-close');
    const backBtn = document.getElementById('chat-back-btn');
    const chatTitle = document.getElementById('chat-title');
    
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
    let chatIsClosed = false;

    function handleVisualViewport() {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      const adjust = () => {
        if (chatWindow.style.display === 'flex') {
          chatWindow.style.height = vv.height + 'px';
          chatWindow.style.top = vv.offsetTop + 'px';
          if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      };
      vv.addEventListener('resize', adjust);
      vv.addEventListener('scroll', adjust);
    }
    handleVisualViewport();

    setTimeout(() => {
      if (chatWindow.style.display === 'none') {
        teaser.style.display = 'block';
        localStorage.setItem('mimo_teaser_seen_v10', 'true');
        localStorage.setItem('mimo_teaser_seen_v10_v10', 'true');
        localStorage.setItem('mimo_teaser_seen_v10_v10_v9', 'true');
        localStorage.setItem('mimo_teaser_shown_once', 'true');
        setTimeout(() => { teaser.style.opacity = '1'; teaser.style.transform = 'translateY(0)'; }, 50);
        playSound('pop');
      }
    }, 2000);

    closeTeaser.onclick = () => { teaser.style.display = 'none'; localStorage.setItem('mimo_teaser_seen_v10_v10_v9_v8', 'true'); };

    teaserBtn.onclick = () => { localStorage.setItem('mimo_teaser_seen_v10_v10_v9_v8', 'true');
      playSound('send');
      teaser.style.display = 'none';
      chatWindow.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      if (window.visualViewport) {
        chatWindow.style.height = window.visualViewport.height + 'px';
        chatWindow.style.top = window.visualViewport.offsetTop + 'px';
      }
    };

    toggleBtn.onclick = () => { 
      playSound('send');
      chatWindow.style.display = 'flex'; 
      teaser.style.display = 'none';
      document.body.style.overflow = 'hidden';
      if (window.visualViewport) {
        chatWindow.style.height = window.visualViewport.height + 'px';
        chatWindow.style.top = window.visualViewport.offsetTop + 'px';
      }
    };
    
    closeBtn.onclick = () => { chatWindow.style.display = 'none'; document.body.style.overflow = ''; };

    backBtn.onclick = () => {
      playSound('send');
      choiceScreen.style.display = 'flex';
      aiChat.style.display = 'none';
      humanChat.style.display = 'none';
      inputArea.style.display = 'none';
      backBtn.style.display = 'none';
      chatTitle.innerText = 'دعم Apex';
      isHumanMode = false;
      newChatOptions.style.display = 'none';
      ratingScreen.style.display = 'none';
    };

    btnAI.onclick = () => { 
      playSound('send'); 
      choiceScreen.style.display = 'none'; 
      aiChat.style.display = 'flex'; 
      inputArea.style.display = 'flex'; 
      chatTitle.innerText = 'ميمو ( Mimo ) 🥰';
      backBtn.style.display = 'block';
      isHumanMode = false;
      inputEl.focus(); 
    };

    btnHuman.onclick = async () => {
      playSound('send');
      choiceScreen.style.display = 'none';
      humanChat.style.display = 'flex';
      inputArea.style.display = 'flex';
      chatTitle.innerText = 'المطور (الدعم البشري)';
      backBtn.style.display = 'block';
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
          chatIsClosed = true;
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
          chatIsClosed = false;
          inputArea.style.display = 'flex';
          newChatOptions.style.display = 'none';
          ratingScreen.style.display = 'none';
          isClosedDismissed = false;
        }

        humanChat.innerHTML = data.messages.map(m => {
          const isAdmin = m.sender === 'admin';
          const isSystem = m.sender === 'system';
          
          if (isSystem) {
            return `<div style="text-align:center; color:#ef4444; font-size:11px; margin:8px 0; background:rgba(239,68,68,0.1); padding:5px; border-radius:5px; white-space: pre-wrap;">${m.message}</div>`;
          }
          
          const tick = m.sender === 'visitor' ? (m.is_read ? '<i class="fa-solid fa-check-double" style="color:#00f3ff; font-size:10px; margin-right:4px;"></i>' : '<i class="fa-solid fa-check" style="color:#8892b0; font-size:10px; margin-right:4px;"></i>') : '';
          
          return `<div style="background:${isAdmin ? '#112240' : '#0055ff'}; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-${isAdmin ? 'left' : 'right'}-radius:0; font-size:13px; align-self:${isAdmin ? 'flex-start' : 'flex-end'}; max-width:85%; box-shadow:0 1px 2px rgba(0,0,0,0.3); position:relative; margin-bottom:2px; word-break: break-word;">
            ${m.message}
            <div style="font-size:9px; color:#8892b0; text-align:left; margin-top:3px;">${tick} ${m.created_at.split(' ')[1].substring(0,5)}</div>
          </div>`;
        }).join('');
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch(e) {}
    }
    setInterval(checkHumanChat, 3000);

    document.getElementById('btn-yes-new').onclick = async () => {
      playSound('send');
      isClosedDismissed = false;
      newChatOptions.style.display = 'none';
      ratingScreen.style.display = 'none';
      humanChat.innerHTML = ''; 
      await fetch('/api/human-chat/init', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId })
      });
      checkHumanChat();
    };
    
    document.getElementById('btn-no-new').onclick = () => {
      playSound('send');
      isClosedDismissed = true;
      newChatOptions.style.display = 'none';
      inputArea.style.display = 'flex';
    };

    let selectedRating = 0;
    document.querySelectorAll('.star-btn').forEach(star => {
      star.onclick = function() {
        playSound('pop');
        selectedRating = parseInt(this.getAttribute('data-val'));
        document.querySelectorAll('.star-btn').forEach(s => {
          s.style.color = parseInt(s.getAttribute('data-val')) <= selectedRating ? '#fbbf24' : '#475569';
        });
      };
    });

    document.getElementById('submit-rating').onclick = async () => {
      if (selectedRating === 0) return alert('يرجى اختيار النجوم أولاً');
      playSound('send');
      await fetch('/api/human-chat/rate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: visitorId, rating: selectedRating, feedback: '' })
      });
      ratingScreen.style.display = 'none';
      humanChat.innerHTML = '<div style="color:#00f3ff; text-align:center; margin-top:20px; font-weight:bold;">شكراً لتقييمك! ⭐</div>';
    };

    async function sendMessage() {
      if (chatIsClosed) {
        playSound('pop');
        inputArea.style.display = 'none';
        newChatOptions.style.display = 'flex';
        return; 
      }

      const text = inputEl.value.trim();
      if (!text) return;
      playSound('send');
      inputEl.value = '';

      if (isHumanMode) {
        humanChat.innerHTML += `<div style="background:#0055ff; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-right-radius:0; font-size:13px; align-self:flex-end; max-width:85%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px; word-break: break-word;">
          ${text}
          <div style="font-size:9px; color:#8892b0; text-align:left; margin-top:3px;"><i class="fa-solid fa-check" style="color:#8892b0; font-size:10px; margin-right:4px;"></i> الآن</div>
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
      aiChat.innerHTML += `<div style="background:#0055ff; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-right-radius:0; font-size:13px; align-self:flex-end; max-width:85%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px; word-break: break-word;">${text}</div>`;
      chatHistory.push({ role: 'user', text: text });
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      const loadingId = 'ai-loading-' + Date.now();
      aiChat.innerHTML += `
        <div id="${loadingId}" style="display:flex; align-items:center; gap:4px; background:#112240; padding:12px 16px; border-radius:8px; border-top-left-radius:0; align-self:flex-start; width:fit-content; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px;">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>`;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: chatHistory, user_phone: localStorage.getItem('apex_user_phone'), visitor_id: visitorId })
        });
        const data = await res.json();
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        
        if (data.reply) {
          playSound('receive');
          chatHistory.push({ role: 'model', text: data.reply });
          aiChat.innerHTML += `<div style="background:#112240; color:#e6f1ff; padding:8px 12px; border-radius:8px; border-top-left-radius:0; font-size:13px; align-self:flex-start; max-width:85%; box-shadow:0 1px 2px rgba(0,0,0,0.3); margin-bottom:2px; word-break: break-word;">${data.reply}</div>`;
        }
      } catch(e) {
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  });

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .typing-dot {
      width: 8px; height: 8px; background-color: #00f3ff; border-radius: 50%;
      display: inline-block; animation: bounce 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .typing-dot:nth-child(2) { animation-delay: -0.16s; }
  `;
  document.head.appendChild(style);
})();
