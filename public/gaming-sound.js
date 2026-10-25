(function() {
  'use strict';
  let ctx = null;
  let enabled = localStorage.getItem('apex_sound_enabled') !== '0';
  let lastPlay = 0;

  function initAudio() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playClick() {
    if (!enabled) return;
    const c = initAudio(); if (!c) return;
    const now = c.currentTime;
    // Layer 1: bright digital tick
    const o1 = c.createOscillator(), g1 = c.createGain();
    o1.type = 'square';
    o1.frequency.setValueAtTime(2800, now);
    o1.frequency.exponentialRampToValueAtTime(1000, now + 0.03);
    g1.gain.setValueAtTime(0.07, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    o1.connect(g1); g1.connect(c.destination);
    o1.start(now); o1.stop(now + 0.04);
    // Layer 2: subtle bass thump
    const o2 = c.createOscillator(), g2 = c.createGain();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(160, now);
    o2.frequency.exponentialRampToValueAtTime(60, now + 0.06);
    g2.gain.setValueAtTime(0.08, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    o2.connect(g2); g2.connect(c.destination);
    o2.start(now); o2.stop(now + 0.08);
    // Layer 3: tiny high-frequency texture
    const bs = c.sampleRate * 0.02;
    const buf = c.createBuffer(1, bs, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const nz = c.createBufferSource(); nz.buffer = buf;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.02, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 3000;
    nz.connect(fl); fl.connect(ng); ng.connect(c.destination);
    nz.start(now);
  }

  function playSelect() {
    if (!enabled) return;
    const c = initAudio(); if (!c) return;
    const now = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(880, now);
    o.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
    g.gain.setValueAtTime(0.05, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.connect(g); g.connect(c.destination);
    o.start(now); o.stop(now + 0.15);
  }

  function debounced(fn) {
    return function() {
      const now = Date.now();
      if (now - lastPlay < 40) return;
      lastPlay = now;
      fn();
    };
  }
  const clickH = debounced(playClick);
  const selectH = debounced(playSelect);

  function attach(el, handler) {
    if (!el || el.dataset.soundAttached) return;
    el.dataset.soundAttached = '1';
    if (window.PointerEvent) {
      el.addEventListener('pointerdown', handler);
    } else {
      el.addEventListener('mousedown', handler);
      el.addEventListener('touchstart', handler, { passive: true });
    }
  }

  function attachAll() {
    document.querySelectorAll('.game-card, a[href^="/games/"]').forEach(el => attach(el, selectH));
    document.querySelectorAll('button, a, input[type="submit"], .package-btn, select').forEach(el => attach(el, clickH));
  }

  function createToggle() {
    const btn = document.createElement('button');
    btn.id = 'gaming-sound-toggle';
    btn.type = 'button';
    btn.innerHTML = enabled ? '🔊' : '🔇';
    btn.title = 'كتم/تشغيل صوت النقرات';
    btn.setAttribute('aria-label', 'كتم/تشغيل الصوت');
    btn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:9999;width:48px;height:48px;border-radius:50%;background:rgba(0,243,255,0.15);border:1px solid rgba(0,243,255,0.5);color:#00f3ff;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:all 0.2s;box-shadow:0 0 15px rgba(0,243,255,0.3);display:flex;align-items:center;justify-content:center;padding:0;';
    btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(0,243,255,0.3)'; btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(0,243,255,0.15)'; btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      enabled = !enabled;
      localStorage.setItem('apex_sound_enabled', enabled ? '1' : '0');
      btn.innerHTML = enabled ? '🔊' : '🔇';
      if (enabled) playClick();
    });
    document.body.appendChild(btn);
  }

  window.GamingSound = {
    enable: () => { enabled = true; localStorage.setItem('apex_sound_enabled', '1'); },
    disable: () => { enabled = false; localStorage.setItem('apex_sound_enabled', '0'); },
    toggle: () => { enabled = !enabled; localStorage.setItem('apex_sound_enabled', enabled ? '1' : '0'); return enabled; },
    play: playClick,
    select: playSelect
  };

  const unlock = () => { initAudio(); };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });

  function ready() { attachAll(); createToggle(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
