(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════════
  // FRAME ARRAY BUILDERS
  // ══════════════════════════════════════════════════════════════════════════════

  function buildHeroFrames() {
    const frames = [];
    // hero folder: 001-055, then 087-153 (056-086 do not exist)
    for (let i = 1;  i <= 55;  i++) frames.push('hero/ezgif-frame-' + pad(i) + '.jpg');
    for (let i = 87; i <= 153; i++) frames.push('hero/ezgif-frame-' + pad(i) + '.jpg');
    return frames; // 122 frames total
  }

  function buildExplosionFrames() {
    const frames = [];
    for (let i = 1; i <= 153; i++) frames.push('sction1/ezgif-frame-' + pad(i) + '.jpg');
    return frames; // 153 frames total
  }

  function pad(n) {
    return String(n).padStart(3, '0');
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILE VIEWPORT HEIGHT — must run BEFORE scrubbers so canvas sizes correctly
  // ══════════════════════════════════════════════════════════════════════════════

  function setVH() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', (h * 0.01) + 'px');
  }

  // Run immediately so --vh is set before FrameScrubber._setupCanvas() reads it
  setVH();

  window.addEventListener('resize', setVH, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setVH, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DOM REFS
  // ══════════════════════════════════════════════════════════════════════════════

  const loader      = document.getElementById('loader');
  const loaderBar   = document.getElementById('loader-bar');
  const loaderPct   = document.getElementById('loader-pct');
  const navbar      = document.getElementById('navbar');
  const heroZone    = document.getElementById('hero-zone');
  const explZone    = document.getElementById('explosion-zone');
  const heroContent = document.querySelector('.hero-content');
  const heroCta     = document.getElementById('hero-cta-wrap');
  const heroHint    = document.getElementById('hero-scroll-hint');
  const explText    = document.getElementById('explosion-text');

  // ══════════════════════════════════════════════════════════════════════════════
  // SCRUBBER SETUP
  // ══════════════════════════════════════════════════════════════════════════════

  // Media query — used to toggle mobile-specific behaviour in scroll handler
  const mqMobile = window.matchMedia('(max-width: 768px)');

  const heroFrames  = buildHeroFrames();
  const explFrames  = buildExplosionFrames();
  const totalFrames = heroFrames.length + explFrames.length;

  let heroLoaded = 0;
  let explLoaded = 0;
  let pageRevealed = false;

  function onProgress() {
    const loaded = heroLoaded + explLoaded;
    const pct    = Math.round((loaded / totalFrames) * 100);
    if (loaderBar) loaderBar.style.width = pct + '%';
    if (loaderPct) loaderPct.textContent  = pct + '%';
  }

  const heroScrubber = new FrameScrubber({
    canvas: document.getElementById('hero-canvas'),
    frames: heroFrames,
    onProgress: (loaded) => { heroLoaded = loaded; onProgress(); },
    onReady:    () => { revealPage(); }
  });

  const explScrubber = new FrameScrubber({
    canvas: document.getElementById('explosion-canvas'),
    frames: explFrames,
    onProgress: (loaded) => { explLoaded = loaded; onProgress(); },
    onReady:    () => {}
  });

  // Start loading — hero first frame triggers page reveal
  heroScrubber.preload();
  explScrubber.preload();

  // Hard timeout: show page after 6s regardless (slow connections)
  setTimeout(revealPage, 6000);

  // ══════════════════════════════════════════════════════════════════════════════
  // PAGE REVEAL
  // ══════════════════════════════════════════════════════════════════════════════

  function revealPage() {
    if (pageRevealed) return;
    pageRevealed = true;

    loader.classList.add('hidden');
    document.body.style.overflow = '';

    // Staggered hero text entrance
    requestAnimationFrame(() => {
      setTimeout(() => document.getElementById('hero-eyebrow')
        .classList.add('visible'), 300);
      setTimeout(() => {
        document.querySelectorAll('.hero-headline .line')
          .forEach(l => l.classList.add('visible'));
      }, 500);
      setTimeout(() => document.getElementById('hero-sub')
        .classList.add('visible'), 750);
      setTimeout(() => heroHint.classList.add('visible'), 1200);
    });

    initIntersectionObserver();
    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once immediately in case page is loaded mid-scroll
    onScroll();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INTERSECTION OBSERVER — static sections
  // ══════════════════════════════════════════════════════════════════════════════

  function initIntersectionObserver() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target); // fire once
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-reveal], [data-reveal-card], .author-text')
      .forEach(el => io.observe(el));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SCROLL ZONE PROGRESS UTILITY
  // ══════════════════════════════════════════════════════════════════════════════

  function viewportH() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  function zoneProgress(zone) {
    const rect       = zone.getBoundingClientRect();
    const scrollable = zone.offsetHeight - viewportH();
    return Math.max(0, Math.min(1, -rect.top / scrollable));
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SCROLL HANDLER
  // ══════════════════════════════════════════════════════════════════════════════

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(tick);
      ticking = true;
    }
  }

  function tick() {
    ticking = false;
    const sy = window.scrollY;

    // ── Navbar ────────────────────────────────────────────────────────────────
    navbar.classList.toggle('visible', sy > 80);

    // ── Hero scroll zone ──────────────────────────────────────────────────────
    if (heroZone) {
      const p = zoneProgress(heroZone);
      heroScrubber.setProgress(p);

      // Text: fade out near end of zone (book fully exploded)
      const contentFade = p > 0.75 ? Math.max(0, 1 - ((p - 0.75) / 0.2)) : 1;
      heroContent.style.opacity = contentFade;

      if (mqMobile.matches) {
        // Mobile: CSS controls position (top: Xpx). Clear any JS transform so
        // the CSS `transform: none` override is not blocked by an inline style.
        heroContent.style.transform = '';
      } else {
        // Desktop: shift text leftward as book opens (p 0.25 → 0.65)
        const shift = p > 0.25
          ? Math.min((p - 0.25) / 0.4, 1) * -40
          : 0;
        heroContent.style.transform = `translateY(-50%) translateX(${shift}px)`;
      }

      // CTA + scroll hint
      if (p > 0.52 && p < 0.85) {
        heroCta.classList.add('visible');
        heroHint.classList.remove('visible');
      } else if (p <= 0.05) {
        heroHint.classList.add('visible');
        heroCta.classList.remove('visible');
      } else if (p >= 0.85) {
        heroCta.classList.remove('visible');
      }
    }

    // ── Explosion scroll zone ─────────────────────────────────────────────────
    if (explZone) {
      const p = zoneProgress(explZone);
      explScrubber.setProgress(p);

      if (p > 0.12 && p < 0.82) {
        explText.classList.add('visible');
        // Smooth fade-in handled by CSS transition
        explText.style.opacity = '';
      } else if (p >= 0.82) {
        const fade = Math.max(0, 1 - ((p - 0.82) / 0.15));
        explText.style.opacity = fade;
        explText.classList.add('visible');
      } else {
        explText.classList.remove('visible');
        explText.style.opacity = '';
      }
    }
  }

  // Also re-size canvases when visual viewport changes (iOS address bar show/hide)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      heroScrubber._setupCanvas();
      explScrubber._setupCanvas();
    }, { passive: true });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HAMBURGER / MOBILE NAV
  // ══════════════════════════════════════════════════════════════════════════════

  const hamburger   = document.getElementById('nav-hamburger');
  const mobileNav   = document.getElementById('nav-mobile');
  const mobileClose = document.getElementById('nav-mobile-close');

  function openMobileNav() {
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.classList.add('active');
    // Prevent body scroll while menu is open
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMobileNav);
  mobileClose.addEventListener('click', closeMobileNav);

  // Close on any nav link tap
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMobileNav);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileNav();
  });

  // Prevent scroll before page is revealed
  document.body.style.overflow = 'hidden';

})();
