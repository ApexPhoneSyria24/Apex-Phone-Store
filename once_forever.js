const fs = require('fs');
let content = fs.readFileSync('views/index.ejs', 'utf8');

const scriptStart = content.lastIndexOf('<script>');
const scriptEnd = content.lastIndexOf('</script>') + 9;

const newScript = `
<script>
  function playClick() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  }

  let audioPlayed = false;
  function playWelcomeVoice() {
    if (audioPlayed) return;
    audioPlayed = true;
    const audio = new Audio('https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=Welcome%20to%20Apex%20Phone%20Syria');
    audio.volume = 1.0;
    audio.play().catch(e => {});
  }

  window.addEventListener('touchstart', playWelcomeVoice, { once: true, capture: true });
  window.addEventListener('mousedown', playWelcomeVoice, { once: true, capture: true });

  document.addEventListener("DOMContentLoaded", function() {
    const preloader = document.getElementById('preloader');
    
    // التحقق مما إذا كان الزبون قد زار الموقع من قبل (باستخدام localStorage)
    const hasVisited = localStorage.getItem('apex_visited');
    // التحقق مما إذا كان الزبون يبحث أو يصنف (وجود علامة استفهام في الرابط)
    const isSearchOrFilter = window.location.search.length > 0;

    if (hasVisited === 'true' || isSearchOrFilter) {
        // إذا زار الموقع من قبل، أو كان يبحث/يصنف: أخفِ التحميل فوراً ولا تظهر النوافذ
        if (preloader) preloader.style.display = 'none';
    } else {
        // إذا كانت أول زيارة: أظهر التحميل لمدة ثانيتين
        setTimeout(function() {
            if (preloader) preloader.classList.add('hidden'); // يبدأ التلاشي (1.5 ثانية)
            
            playWelcomeVoice(); // تشغيل الصوت مع بداية التلاشي

            // إظهار النوافذ الملكية بعد انتهاء التلاشي
            setTimeout(() => {
                const modal = document.getElementById('fraudModal');
                const content = document.getElementById('modalContent');
                if(modal) {
                    modal.classList.remove('hidden'); 
                    modal.classList.add('flex');
                    setTimeout(() => {
                        content.classList.remove('opacity-0', 'translate-y-4');
                        content.classList.add('opacity-100', 'translate-y-0');
                    }, 50);
                }
            }, 1500); // وقت التلاشي
            
            // سجل أن الزبون زار الموقع (للأبد)
            localStorage.setItem('apex_visited', 'true');
        }, 2000); // مدة بقاء شاشة التحميل (ثانيتان)
    }
  });

  function closeFraudModal() {
    playClick();
    const modal = document.getElementById('fraudModal'); const content = document.getElementById('modalContent');
    content.classList.remove('opacity-100', 'translate-y-0'); content.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => {
      modal.classList.add('hidden'); modal.classList.remove('flex');
      const sModal = document.getElementById('servicesModal'); const sContent = document.getElementById('servicesContent');
      if(sModal) {
        sModal.classList.remove('hidden'); sModal.classList.add('flex');
        setTimeout(() => { sContent.classList.remove('opacity-0', 'translate-y-4'); sContent.classList.add('opacity-100', 'translate-y-0'); }, 100);
      }
    }, 300);
  }

  function closeServicesModal() {
    playClick();
    const modal = document.getElementById('servicesModal'); const content = document.getElementById('servicesContent');
    content.classList.remove('opacity-100', 'translate-y-0'); content.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
  }

  var bannerSwiper = new Swiper(".banner-swiper", {
    loop: true, autoplay: { delay: 3000, disableOnInteraction: false }, pagination: { el: ".swiper-pagination", clickable: true },
  });

  if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }
</script>
`;

content = content.substring(0, scriptStart) + newScript;
fs.writeFileSync('views/index.ejs', content);
console.log('✅ تم برمجة الشاشة لتعمل مرة واحدة فقط في العمر!');
