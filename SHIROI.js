/* ============================================
   白井市PR動画コンテスト LP — script.js
   GSAP + ScrollTrigger + 桜花びらアニメーション
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const ENTRIES_URL = '/data/entries.json';

  /* ------------------------------------------
     GSAP & ScrollTrigger 初期化
     ------------------------------------------ */
  function initAnimations() {
    if (typeof gsap === 'undefined') return; // GSAP未読込み時はフォールバック（全要素表示）

    // GSAP準備完了フラグ → opacity:0 を有効化
    document.body.classList.add('gsap-ready');

    gsap.registerPlugin(ScrollTrigger);

    // ヒーロー：フェードイン
    gsap.to('.fade-in-down', {
      opacity: 1, y: 0, duration: 0.8,
      delay: 0.2, ease: 'power2.out'
    });
    gsap.set('.fade-in-down', { y: -30 });

    gsap.to('.fade-in', {
      opacity: 1, duration: 1.2,
      delay: 0.5, ease: 'power2.out'
    });

    gsap.to('.fade-in-up', {
      opacity: 1, y: 0, duration: 0.8,
      delay: 0.8, ease: 'power2.out',
      stagger: 0.15
    });
    gsap.set('.fade-in-up', { y: 30 });

    // セクション内要素：スクロール連動
    gsap.utils.toArray('.slide-up').forEach(el => {
      gsap.set(el, { y: 40 });
      gsap.to(el, {
        y: 0, opacity: 1,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      });
    });
  }

  /* ------------------------------------------
     桜の花びらアニメーション
     ------------------------------------------ */
  function createPetals(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement('div');
      petal.classList.add('petal');

      // ランダム配置
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 10;
      const duration = 6 + Math.random() * 8;
      const delay = Math.random() * duration;
      const hue = Math.random() > 0.3
        ? `hsl(340, ${60 + Math.random() * 30}%, ${80 + Math.random() * 15}%)`  // ピンク系
        : `hsl(0, 0%, ${92 + Math.random() * 6}%)`; // 白系

      petal.style.cssText = `
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        background: ${hue};
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
      container.appendChild(petal);
    }
  }

  createPetals('petals', 25);
  createPetals('cta-petals', 15);

  /* ------------------------------------------
     公開作品の件数と最新作品をLPに反映
     ------------------------------------------ */
  async function loadEntries() {
    const res = await fetch(ENTRIES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`entries fetch failed: ${res.status}`);
    const data = await res.json();
    const entries = Array.isArray(data.entries) ? data.entries.slice() : [];

    entries.sort((a, b) => {
      const da = new Date(a.submittedAt || 0).getTime();
      const db = new Date(b.submittedAt || 0).getTime();
      return db - da;
    });

    return entries;
  }

  function setContestStats(entries) {
    const countEl = document.getElementById('hero-entry-count');
    const statusEl = document.getElementById('hero-entry-status');
    const latestEl = document.getElementById('hero-latest-entries');
    const galleryMetaEl = document.getElementById('gallery-cta-meta');

    if (!entries.length) {
      if (galleryMetaEl) galleryMetaEl.textContent = '公開作品は随時追加中です。';
      return;
    }

    if (countEl) countEl.textContent = `現在 ${entries.length} 作品を公開中`;
    if (statusEl) {
      statusEl.textContent = '公開中の作品を参考にしながら、あなたらしい切り口で応募できます。';
    }
    if (galleryMetaEl) {
      galleryMetaEl.textContent = `現在 ${entries.length} 作品をギャラリー公開中`;
    }

    if (!latestEl) return;

    latestEl.innerHTML = '';
    entries.slice(0, 2).forEach((entry) => {
      const item = document.createElement('a');
      item.href = '/gallery';
      item.className = 'hero-proof-item';

      const title = document.createElement('strong');
      title.textContent = entry.title || '公開作品';

      const creator = document.createElement('span');
      creator.textContent = `by ${entry.creator || '応募者'}`;

      item.append(title, creator);
      latestEl.appendChild(item);
    });
  }

  async function initContestStats() {
    try {
      const entries = await loadEntries();
      setContestStats(entries);
    } catch (error) {
      console.warn('contest stats error:', error);
    }
  }

  /* ------------------------------------------
     スムーススクロール
     ------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  initAnimations();
  initContestStats();

});
