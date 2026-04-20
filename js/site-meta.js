(function () {
  'use strict';

  const body = document.body;
  if (!body) return;

  const page = body.dataset.page;
  const ogImage = 'https://metagri-labo.com/wp-content/uploads/2026/04/914e8faa6d3c8a6659f16a7e6610390e.png';
  const pages = {
    contest: {
      title: '白井市PR動画コンテスト ｜ Metagri研究所 presents',
      description: '白井市 × Metagri研究所による地域PR動画コンテスト。動画生成AIを活用し、白井市の暮らしの魅力を30〜60秒のショート動画で発信。グランプリ作品は白井市公式PR動画として採用。',
      path: '/'
    },
    gallery: {
      title: '作品ギャラリー | 白井市PR動画コンテスト',
      description: '白井市PR動画コンテストの応募作品一覧。クリエイターの想いとともに、白井市の魅力を映像でお楽しみください。',
      path: '/gallery'
    }
  };

  const current = pages[page];
  if (!current) return;

  function upsertMeta(attrName, attrValue, content) {
    let meta = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attrName, attrValue);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }

  function upsertLink(rel, href) {
    let link = document.head.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  const canonicalUrl = new URL(current.path, window.location.origin).toString();

  document.title = current.title;
  upsertMeta('name', 'description', current.description);
  upsertMeta('name', 'robots', 'index,follow');
  upsertMeta('name', 'theme-color', '#fffaf5');
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', '白井市PR動画コンテスト');
  upsertMeta('property', 'og:locale', 'ja_JP');
  upsertMeta('property', 'og:title', current.title);
  upsertMeta('property', 'og:description', current.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:image:alt', '白井市PR動画コンテストのキービジュアル');
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', current.title);
  upsertMeta('name', 'twitter:description', current.description);
  upsertMeta('name', 'twitter:url', canonicalUrl);
  upsertMeta('name', 'twitter:image', ogImage);
  upsertMeta('name', 'twitter:image:alt', '白井市PR動画コンテストのキービジュアル');
  upsertLink('canonical', canonicalUrl);
})();
