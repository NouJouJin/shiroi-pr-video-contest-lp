/* ============================================
   作品ギャラリー — gallery.js
   - data/entries.json から作品を読み込み描画
   - カードクリックでモーダル表示
   - いいね機能 (Vercel KV経由 /api/like)
   ============================================ */

(function () {
  'use strict';

  const ENTRIES_URL = '/data/entries.json';
  const LIKE_API = '/api/like';
  const LS_PREFIX = 'shiroi_liked_';

  const $grid = document.getElementById('gl-grid');
  const $meta = document.getElementById('gl-meta');
  const $empty = document.getElementById('gl-empty');
  const $modal = document.getElementById('gl-modal');
  const $modalIframe = document.getElementById('gl-modal-iframe');
  const $modalTitle = document.getElementById('gl-modal-title');
  const $modalCreator = document.getElementById('gl-modal-creator');
  const $modalMessage = document.getElementById('gl-modal-message');
  const $modalLike = document.getElementById('gl-modal-like');
  const $modalLikeCount = document.getElementById('gl-modal-like-count');
  const $modalDetails = document.getElementById('gl-modal-details');
  const $modalFullMsgWrap = document.getElementById('gl-modal-full-message-wrap');
  const $modalFullMsg = document.getElementById('gl-modal-full-message');
  const $modalPrev = document.getElementById('gl-modal-prev');
  const $modalNext = document.getElementById('gl-modal-next');
  const $modalAiWrap = document.getElementById('gl-modal-ai-wrap');
  const $modalAiList = document.getElementById('gl-modal-ai-tools');
  const $modalMusicWrap = document.getElementById('gl-modal-music-wrap');
  const $modalMusic = document.getElementById('gl-modal-music');
  const $modalProcessWrap = document.getElementById('gl-modal-process-wrap');
  const $modalProcess = document.getElementById('gl-modal-process');
  const $modalCommentWrap = document.getElementById('gl-modal-comment-wrap');
  const $modalComment = document.getElementById('gl-modal-comment');

  let entries = [];
  let likeCounts = {}; // { id: count }
  let currentEntry = null;
  let currentEntryIndex = -1;
  let lastFocusedEl = null;

  // ----- ユーティリティ -----
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  function ytThumb(id) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  }

  function ytEmbed(id) {
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&autoplay=1`;
  }

  function truncateText(str, maxLength = 68) {
    if (!str) return '作品に込めた想いは、モーダルから詳しくご覧いただけます。';
    const normalized = String(str).replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength).trimEnd()}…`;
  }

  function isLiked(id) {
    try {
      return localStorage.getItem(LS_PREFIX + id) === '1';
    } catch (e) {
      return false;
    }
  }

  function markLiked(id) {
    try {
      localStorage.setItem(LS_PREFIX + id, '1');
    } catch (e) {
      /* noop */
    }
  }

  // ----- データ取得 -----
  async function loadEntries() {
    const res = await fetch(ENTRIES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`entries fetch failed: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.entries) ? data.entries : [];
    // 新着順（submittedAt降順）
    list.sort((a, b) => {
      const da = new Date(a.submittedAt || 0).getTime();
      const db = new Date(b.submittedAt || 0).getTime();
      return db - da;
    });
    return list;
  }

  async function loadLikeCounts() {
    try {
      const res = await fetch(LIKE_API, { cache: 'no-cache' });
      if (!res.ok) return {};
      const data = await res.json();
      return data && typeof data.counts === 'object' ? data.counts : {};
    } catch (e) {
      // APIが未デプロイ/ローカルでも壊さない
      return {};
    }
  }

  async function postLike(id) {
    const res = await fetch(LIKE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`like failed: ${res.status}`);
    const data = await res.json();
    return typeof data.count === 'number' ? data.count : null;
  }

  function renderSkeletons(count = 6) {
    $empty.hidden = true;
    $meta.textContent = '作品を読み込み中…';
    $grid.innerHTML = Array.from({ length: count }, () => `
      <article class="gl-card gl-card--skeleton" aria-hidden="true">
        <div class="gl-card__thumb"></div>
        <div class="gl-card__body">
          <div class="gl-skeleton gl-skeleton--title"></div>
          <div class="gl-skeleton gl-skeleton--text"></div>
          <div class="gl-skeleton gl-skeleton--text gl-skeleton--short"></div>
          <div class="gl-card__footer">
            <div class="gl-skeleton gl-skeleton--meta"></div>
            <div class="gl-skeleton gl-skeleton--meta gl-skeleton--tiny"></div>
          </div>
        </div>
      </article>
    `).join('');
  }

  // ----- 描画 -----
  function renderGrid() {
    if (!entries.length) {
      $grid.innerHTML = '';
      $empty.hidden = false;
      $meta.textContent = '';
      return;
    }
    $empty.hidden = true;
    $meta.textContent = `全 ${entries.length} 作品（新着順）`;

    const html = entries
      .map((e) => {
        const count = likeCounts[e.id] || 0;
        const excerpt = truncateText(e.message);
        return `
          <article class="gl-card" data-id="${escapeHtml(e.id)}" tabindex="0" role="button" aria-label="${escapeHtml(e.title)} を再生">
            <div class="gl-card__thumb">
              <img src="${ytThumb(e.youtubeId)}" alt="" loading="lazy" />
              <div class="gl-card__play" aria-hidden="true"></div>
            </div>
            <div class="gl-card__body">
              <h2 class="gl-card__title">${escapeHtml(e.title)}</h2>
              <p class="gl-card__creator">by ${escapeHtml(e.creator)}</p>
              <p class="gl-card__excerpt">${escapeHtml(excerpt)}</p>
              <div class="gl-card__footer">
                <span class="gl-card__likes" data-like-count="${escapeHtml(e.id)}">♥ ${count}</span>
                <span class="gl-card__date">${escapeHtml(formatDate(e.submittedAt))}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    $grid.innerHTML = html;
  }

  function updateCardLike(id, count) {
    const el = $grid.querySelector(`[data-like-count="${CSS.escape(id)}"]`);
    if (el) el.textContent = `♥ ${count}`;
  }

  function updateModalPager() {
    if (!$modalPrev || !$modalNext) return;
    const hasPrev = currentEntryIndex > 0;
    const hasNext = currentEntryIndex >= 0 && currentEntryIndex < entries.length - 1;
    $modalPrev.disabled = !hasPrev;
    $modalNext.disabled = !hasNext;
  }

  function openEntryByIndex(index) {
    if (index < 0 || index >= entries.length) return;
    openModal(entries[index]);
  }

  // ----- モーダル -----
  function openModal(entry) {
    currentEntry = entry;
    currentEntryIndex = entries.findIndex((item) => item.id === entry.id);
    lastFocusedEl = document.activeElement;

    $modalTitle.textContent = entry.title;
    $modalCreator.textContent = entry.creator;
    $modalMessage.textContent = entry.message || '';
    $modalIframe.src = ytEmbed(entry.youtubeId);

    // ----- 詳細セクション -----
    if ($modalDetails) $modalDetails.open = false;

    // 作品コンセプト（全文）
    if (entry.fullMessage && $modalFullMsgWrap && $modalFullMsg) {
      $modalFullMsg.textContent = entry.fullMessage;
      $modalFullMsgWrap.hidden = false;
    } else if ($modalFullMsgWrap) {
      $modalFullMsgWrap.hidden = true;
    }

    // 制作プロセスの工夫
    if (entry.productionProcess && $modalProcessWrap && $modalProcess) {
      $modalProcess.textContent = entry.productionProcess;
      $modalProcessWrap.hidden = false;
    } else if ($modalProcessWrap) {
      $modalProcessWrap.hidden = true;
    }

    // 使用した生成AI
    if (Array.isArray(entry.aiTools) && entry.aiTools.length && $modalAiWrap && $modalAiList) {
      $modalAiList.innerHTML = entry.aiTools
        .map((t) => {
          const name = typeof t === 'string' ? t : (t && t.name) || '';
          const role = typeof t === 'string' ? '' : (t && t.role) || '';
          if (!name) return '';
          return `<li><strong>${escapeHtml(name)}</strong>${role ? ` <span class="gl-modal__detail-role">— ${escapeHtml(role)}</span>` : ''}</li>`;
        })
        .join('');
      $modalAiWrap.hidden = false;
    } else if ($modalAiWrap) {
      $modalAiWrap.hidden = true;
    }

    // 音源提供
    if (entry.musicSource && $modalMusicWrap && $modalMusic) {
      const src = entry.musicSource;
      if (Array.isArray(src)) {
        $modalMusic.innerHTML = src
          .map((item) => {
            if (typeof item === 'string') return escapeHtml(item);
            if (item && item.url) {
              return `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name || item.url)}</a>`;
            }
            return escapeHtml((item && item.name) || '');
          })
          .filter(Boolean)
          .join('<br />');
      } else if (typeof src === 'string') {
        $modalMusic.textContent = src;
      } else if (src.url) {
        $modalMusic.innerHTML = `<a href="${escapeHtml(src.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(src.name || src.url)}</a>`;
      } else {
        $modalMusic.textContent = src.name || '';
      }
      $modalMusicWrap.hidden = false;
    } else if ($modalMusicWrap) {
      $modalMusicWrap.hidden = true;
    }

    // クリエイターからのコメント
    if (entry.creatorComment && $modalCommentWrap && $modalComment) {
      $modalComment.textContent = entry.creatorComment;
      $modalCommentWrap.hidden = false;
    } else if ($modalCommentWrap) {
      $modalCommentWrap.hidden = true;
    }

    // 詳細セクション自体の表示/非表示（全項目なければ隠す）
    if ($modalDetails) {
      const hasDetails = Boolean(entry.fullMessage) ||
        Boolean(entry.productionProcess) ||
        (Array.isArray(entry.aiTools) && entry.aiTools.length) ||
        Boolean(entry.musicSource) ||
        Boolean(entry.creatorComment);
      $modalDetails.hidden = !hasDetails;
    }

    const count = likeCounts[entry.id] || 0;
    $modalLikeCount.textContent = String(count);
    $modalLike.disabled = isLiked(entry.id);
    $modalLike.classList.remove('is-loading', 'is-pulse');
    updateModalPager();

    $modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if ($modalPrev && !$modalPrev.disabled) {
        $modalPrev.focus();
        return;
      }
      $modalLike.focus();
    }, 50);
  }

  function closeModal() {
    if ($modal.hidden) return;
    $modal.hidden = true;
    $modalIframe.src = ''; // 動画停止
    document.body.style.overflow = '';
    currentEntry = null;
    currentEntryIndex = -1;
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus();
    }
  }

  // ----- いいねハンドラ -----
  async function handleLikeClick() {
    if (!currentEntry) return;
    if (isLiked(currentEntry.id)) return;

    const id = currentEntry.id;
    $modalLike.classList.add('is-loading');

    try {
      const newCount = await postLike(id);
      const finalCount = newCount != null ? newCount : (likeCounts[id] || 0) + 1;
      likeCounts[id] = finalCount;
      $modalLikeCount.textContent = String(finalCount);
      updateCardLike(id, finalCount);
      markLiked(id);
      $modalLike.disabled = true;
      $modalLike.classList.add('is-pulse');
    } catch (err) {
      console.warn('like API error:', err);
    } finally {
      $modalLike.classList.remove('is-loading');
    }
  }

  function handlePrevClick() {
    if (currentEntryIndex <= 0) return;
    openEntryByIndex(currentEntryIndex - 1);
  }

  function handleNextClick() {
    if (currentEntryIndex >= entries.length - 1) return;
    openEntryByIndex(currentEntryIndex + 1);
  }

  // ----- イベント -----
  function bindEvents() {
    // カードクリック / Enter
    $grid.addEventListener('click', (e) => {
      const card = e.target.closest('.gl-card');
      if (!card) return;
      const id = card.dataset.id;
      const entry = entries.find((x) => x.id === id);
      if (entry) openModal(entry);
    });
    $grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.gl-card');
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.id;
      const entry = entries.find((x) => x.id === id);
      if (entry) openModal(entry);
    });

    // モーダルクローズ
    $modal.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if ($modal.hidden) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') handlePrevClick();
      if (e.key === 'ArrowRight') handleNextClick();
    });

    // いいね
    $modalLike.addEventListener('click', handleLikeClick);
    if ($modalPrev) $modalPrev.addEventListener('click', handlePrevClick);
    if ($modalNext) $modalNext.addEventListener('click', handleNextClick);
  }

  // ----- 初期化 -----
  async function init() {
    bindEvents();
    renderSkeletons(6);
    try {
      const [list, counts] = await Promise.all([loadEntries(), loadLikeCounts()]);
      entries = list;
      likeCounts = counts;
      renderGrid();
    } catch (err) {
      console.error(err);
      $meta.textContent = '';
      $grid.innerHTML = '';
      $empty.hidden = false;
      $empty.innerHTML = '<p>作品の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
