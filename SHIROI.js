/* ============================================
   白井市PR動画コンテスト LP — script.js
   GSAP + ScrollTrigger + 桜花びらアニメーション
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ------------------------------------------
     GSAP & ScrollTrigger 初期化
     ------------------------------------------ */
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

});