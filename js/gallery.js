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

  // 投票候補（最大3作品まで、ローカルストレージで保持）
  const VOTE_MAX = 3;
  const VOTE_LS_KEY = 'shiroi_vote_candidates_v1';
  const CTA_DISMISS_LS_KEY = 'shiroi_vote_cta_dismissed_v1';

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

  // 投票候補UI要素
  const $modalVoteAdd = document.getElementById('gl-modal-vote-add');
  const $modalVoteAddLabel = document.getElementById('gl-modal-vote-add-label');
  const $modalVoteHint = document.getElementById('gl-modal-vote-hint');
  const $navVoteCount = document.getElementById('gl-nav-vote-count');
  const $navVoteBadge = document.getElementById('gl-nav-vote-badge');
  const $voteCandidatesWrap = document.getElementById('gl-vote-candidates-wrap');
  const $voteCandidatesList = document.getElementById('gl-vote-candidates-list');
  const $voteCandidatesCount = document.getElementById('gl-vote-candidates-count');
  const $voteCandidatesClear = document.getElementById('gl-vote-candidates-clear');
  const $voteCta = document.getElementById('gl-vote-cta');
  const $voteCtaDesc = document.getElementById('gl-vote-cta-desc');
  const $voteCtaGo = document.getElementById('gl-vote-cta-go');
  const $voteCtaClose = document.getElementById('gl-vote-cta-close');
  const $toast = document.getElementById('gl-toast');

  let entries = [];
  let likeCounts = {}; // { id: count }
  let currentEntry = null;
  let currentEntryIndex = -1;
  let lastFocusedEl = null;
  let toastTimer = null;

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

  function entryNumber(id) {
    const num = Number.parseInt(id, 10);
    return Number.isFinite(num) ? num : id;
  }

  function formatEntryNo(id) {
    return `No.${entryNumber(id)}`;
  }

  function ytThumb(id) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  }

  function ytEmbed(id) {
    return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&autoplay=1`;
  }

  function hasYoutube(entry) {
    return Boolean(entry && entry.youtubeId && String(entry.youtubeId).trim());
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

  function trackGalleryEvent(eventName, entry, params = {}) {
    if (!entry || typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, {
      event_category: 'gallery',
      entry_id: String(entry.id || ''),
      entry_no: String(entryNumber(entry.id)),
      entry_title: entry.title || '',
      creator: entry.creator || '',
      youtube_id: entry.youtubeId || '',
      ...params,
    });
  }

  function trackVoteEvent(eventName, params = {}) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, {
      event_category: 'vote_candidate',
      ...params,
    });
  }

  // ----- 投票候補管理（LocalStorage） -----
  function getCandidates() {
    try {
      const raw = localStorage.getItem(VOTE_LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function setCandidates(list) {
    try {
      localStorage.setItem(VOTE_LS_KEY, JSON.stringify(list));
    } catch (e) {
      /* noop */
    }
    updateVoteUI();
  }

  function addCandidate(entry) {
    const id = String(entry.id);
    const list = getCandidates();
    if (list.includes(id)) return { ok: false, reason: 'duplicate', list };
    if (list.length >= VOTE_MAX) return { ok: false, reason: 'full', list };
    list.push(id);
    setCandidates(list);
    trackGalleryEvent('vote_candidate_add', entry, {
      candidate_count: list.length,
      candidates_list: list.join(','),
    });
    if (list.length === VOTE_MAX) {
      showVoteCta('auto');
    } else {
      showToast(`「${entry.title}」を候補に追加しました（${list.length}/${VOTE_MAX}）`);
    }
    return { ok: true, list };
  }

  function removeCandidate(entry) {
    const id = String(entry.id);
    const list = getCandidates().filter((x) => x !== id);
    setCandidates(list);
    trackGalleryEvent('vote_candidate_remove', entry, {
      candidate_count: list.length,
      candidates_list: list.join(','),
    });
    showToast(`「${entry.title}」を候補から外しました（${list.length}/${VOTE_MAX}）`);
  }

  function clearCandidates() {
    const before = getCandidates();
    setCandidates([]);
    trackVoteEvent('vote_candidate_clear', { before_count: before.length });
    showToast('投票候補をすべてクリアしました');
    hideVoteCta();
  }

  // ----- 投票候補UIの更新 -----
  function updateVoteUI() {
    const list = getCandidates();
    const count = list.length;

    if ($navVoteCount) $navVoteCount.textContent = String(count);
    if ($navVoteBadge) {
      $navVoteBadge.classList.toggle('is-active', count > 0);
      $navVoteBadge.classList.toggle('is-full', count >= VOTE_MAX);
    }

    if (currentEntry && $modalVoteAdd) {
      const inList = list.includes(String(currentEntry.id));
      const full = !inList && count >= VOTE_MAX;
      $modalVoteAdd.classList.toggle('is-added', inList);
      $modalVoteAdd.classList.toggle('is-disabled', full);
      $modalVoteAdd.disabled = false;
      $modalVoteAdd.setAttribute('aria-pressed', String(inList));
      if ($modalVoteAddLabel) {
        if (inList) {
          $modalVoteAddLabel.textContent = '候補から外す';
        } else if (full) {
          $modalVoteAddLabel.textContent = '候補は3作品まで（フォームへ）';
        } else {
          $modalVoteAddLabel.textContent = `投票候補に追加（${count}/${VOTE_MAX}）`;
        }
      }
    }

    renderCandidatesSection(list);
  }

  function renderCandidatesSection(list) {
    if (!$voteCandidatesWrap || !$voteCandidatesList) return;
    if (!list.length) {
      $voteCandidatesWrap.hidden = true;
      $voteCandidatesList.innerHTML = '';
      return;
    }
    $voteCandidatesWrap.hidden = false;
    if ($voteCandidatesCount) $voteCandidatesCount.textContent = String(list.length);
    const html = list
      .map((id) => {
        const entry = entries.find((e) => String(e.id) === String(id));
        if (!entry) return '';
        const no = formatEntryNo(entry.id);
        return `
          <li class="gl-vote__candidate" data-id="${escapeHtml(entry.id)}">
            <img src="${ytThumb(entry.youtubeId)}" alt="" loading="lazy" class="gl-vote__candidate-thumb" />
            <div class="gl-vote__candidate-body">
              <p class="gl-vote__candidate-no">${escapeHtml(no)}</p>
              <p class="gl-vote__candidate-title">${escapeHtml(entry.title)}</p>
              <p class="gl-vote__candidate-creator">by ${escapeHtml(entry.creator)}</p>
            </div>
            <button class="gl-vote__candidate-remove" type="button" data-remove-id="${escapeHtml(entry.id)}" aria-label="${escapeHtml(entry.title)}を候補から外す">外す</button>
          </li>
        `;
      })
      .join('');
    $voteCandidatesList.innerHTML = html;
  }

  // ----- 投票CTAバナー（3票揃った時） -----
  function shouldHideCta() {
    try {
      return localStorage.getItem(CTA_DISMISS_LS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function markCtaDismissed() {
    try {
      localStorage.setItem(CTA_DISMISS_LS_KEY, '1');
    } catch (e) {
      /* noop */
    }
  }
  function showVoteCta(trigger) {
    if (!$voteCta) return;
    if (shouldHideCta() && trigger !== 'reopen') return;
    $voteCta.hidden = false;
    $voteCta.classList.add('is-visible');
    if ($voteCtaDesc) {
      $voteCtaDesc.textContent = trigger === 'auto'
        ? 'おつかれさまでした！下のボタンから投票フォームへ進めます。'
        : 'いつでも投票フォームへ進めます。';
    }
    trackVoteEvent('vote_cta_view', { trigger: trigger || 'auto' });
  }
  function hideVoteCta() {
    if (!$voteCta) return;
    $voteCta.hidden = true;
    $voteCta.classList.remove('is-visible');
  }

  // ----- トースト通知 -----
  function showToast(message) {
    if (!$toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    $toast.textContent = message;
    $toast.hidden = false;
    void $toast.offsetWidth;
    $toast.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      $toast.classList.remove('is-visible');
      setTimeout(() => { $toast.hidden = true; }, 280);
    }, 2400);
  }

  // ----- データ取得 -----
  async function loadEntries() {
    const res = await fetch(ENTRIES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`entries fetch failed: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.entries) ? data.entries : [];
    // エントリーNo順（id昇順）
    list.sort((a, b) => {
      const na = Number.parseInt(a.id, 10);
      const nb = Number.parseInt(b.id, 10);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a.id || '').localeCompare(String(b.id || ''), 'ja');
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
    $meta.textContent = `全 ${entries.length} 作品（エントリーNo順）`;

    const html = entries
      .map((e) => {
        const count = likeCounts[e.id] || 0;
        const excerpt = truncateText(e.message);
        const entryNo = formatEntryNo(e.id);
        const playable = hasYoutube(e);
        const media = playable
          ? `<img src="${ytThumb(e.youtubeId)}" alt="" loading="lazy" /><div class="gl-card__play" aria-hidden="true"></div>`
          : `<div class="gl-card__pending" aria-hidden="true">動画リンク準備中</div>`;
        const actionLabel = playable ? 'を再生' : 'の詳細を表示';
        return `
          <article class="gl-card" data-id="${escapeHtml(e.id)}" tabindex="0" role="button" aria-label="${escapeHtml(entryNo)} ${escapeHtml(e.title)} ${actionLabel}">
            <div class="gl-card__thumb">
              ${media}
              <span class="gl-card__entry-no">${escapeHtml(entryNo)}</span>
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

  function openEntryByIndex(index, method = 'pager') {
    if (index < 0 || index >= entries.length) return;
    openModal(entries[index], { method });
  }

  function openEntryFromCard(entry, method) {
    trackGalleryEvent('gallery_thumbnail_click', entry, { method });
    openModal(entry, { method });
  }

  // ----- モーダル -----
  function openModal(entry, options = {}) {
    currentEntry = entry;
    currentEntryIndex = entries.findIndex((item) => item.id === entry.id);
    lastFocusedEl = document.activeElement;

    $modalTitle.textContent = `${formatEntryNo(entry.id)} ${entry.title}`;
    $modalCreator.textContent = entry.creator;
    $modalMessage.textContent = entry.message || '';
    if (hasYoutube(entry)) {
      $modalIframe.parentElement.classList.remove('is-pending');
      $modalIframe.hidden = false;
      $modalIframe.src = ytEmbed(entry.youtubeId);
      trackGalleryEvent('gallery_video_play', entry, {
        method: options.method || 'modal_open',
      });
    } else {
      $modalIframe.src = '';
      $modalIframe.hidden = true;
      $modalIframe.parentElement.classList.add('is-pending');
    }

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
    updateVoteUI();

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
      trackGalleryEvent('gallery_like', currentEntry, {
        method: 'like_button',
        like_count: finalCount,
      });
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
    openEntryByIndex(currentEntryIndex - 1, 'prev_button');
  }

  function handleNextClick() {
    if (currentEntryIndex >= entries.length - 1) return;
    openEntryByIndex(currentEntryIndex + 1, 'next_button');
  }

  // ----- 投票候補ボタンハンドラ -----
  function handleVoteAddClick() {
    if (!currentEntry) return;
    const list = getCandidates();
    const id = String(currentEntry.id);

    if (list.includes(id)) {
      removeCandidate(currentEntry);
      return;
    }
    if (list.length >= VOTE_MAX) {
      trackVoteEvent('vote_candidate_full_prompt', { candidate_count: list.length });
      showToast('投票候補は3作品までです。投票フォームへ進めます。');
      closeModal();
      window.location.hash = 'vote';
      const target = document.getElementById('vote');
      if (target && typeof target.scrollIntoView === 'function') {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 80);
      }
      return;
    }
    addCandidate(currentEntry);
  }

  // ----- イベント -----
  function bindEvents() {
    // カードクリック / Enter
    $grid.addEventListener('click', (e) => {
      const card = e.target.closest('.gl-card');
      if (!card) return;
      const id = card.dataset.id;
      const entry = entries.find((x) => x.id === id);
      if (entry) openEntryFromCard(entry, 'click');
    });
    $grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.gl-card');
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.id;
      const entry = entries.find((x) => x.id === id);
      if (entry) openEntryFromCard(entry, e.key === ' ' ? 'space_key' : 'enter_key');
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

    // 投票候補追加ボタン
    if ($modalVoteAdd) $modalVoteAdd.addEventListener('click', handleVoteAddClick);

    // 投票候補リスト「外す」
    if ($voteCandidatesList) {
      $voteCandidatesList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-id]');
        if (!btn) return;
        const id = btn.getAttribute('data-remove-id');
        const entry = entries.find((x) => String(x.id) === String(id));
        if (entry) removeCandidate(entry);
      });
    }
    if ($voteCandidatesClear) {
      $voteCandidatesClear.addEventListener('click', clearCandidates);
    }

    // 投票CTAバナー
    if ($voteCtaGo) {
      $voteCtaGo.addEventListener('click', () => {
        trackVoteEvent('vote_cta_click', { candidate_count: getCandidates().length });
      });
    }
    if ($voteCtaClose) {
      $voteCtaClose.addEventListener('click', () => {
        hideVoteCta();
        markCtaDismissed();
        trackVoteEvent('vote_cta_dismiss', { candidate_count: getCandidates().length });
      });
    }

    // ナビの「投票」リンク
    const navVote = document.getElementById('gl-nav-vote');
    if (navVote) {
      navVote.addEventListener('click', () => {
        trackVoteEvent('vote_nav_click', { candidate_count: getCandidates().length });
      });
    }
  }

  // ----- 初期化 -----
  async function init() {
    bindEvents();
    renderSkeletons(6);
    updateVoteUI(); // ナビバッジを初期化
    try {
      const [list, counts] = await Promise.all([loadEntries(), loadLikeCounts()]);
      entries = list;
      likeCounts = counts;
      renderGrid();
      updateVoteUI(); // entries読込後に候補リストを再描画
      if (getCandidates().length >= VOTE_MAX) {
        showVoteCta('reopen');
      }
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
