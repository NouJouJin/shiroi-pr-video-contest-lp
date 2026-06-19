(function () {
  'use strict';

  const body = document.body;
  if (!body) return;

  const page = body.dataset.page;
  const defaultOgImage = 'https://metagri-labo.com/wp-content/uploads/2026/04/914e8faa6d3c8a6659f16a7e6610390e.png';
  const pages = {
    contest: {
      title: '白井市PR動画コンテスト ｜ Metagri研究所 presents',
      description: '白井市 × Metagri研究所による地域PR動画コンテスト。応募受付・コミュニティ投票は終了し、応募作品をアーカイブとして公開しています。',
      path: '/SHIROI'
    },
    gallery: {
      title: '作品アーカイブ | 白井市PR動画コンテスト',
      description: '白井市PR動画コンテストの応募作品アーカイブ。投票に参加してくださった皆さまへの感謝とともに、全作品を公開しています。',
      path: '/gallery'
    },
    awards: {
      title: '受賞作品 | 白井市PR動画コンテスト',
      description: '白井市PR動画コンテストの受賞作品を発表。グランプリ、準グランプリ、Metagri研究所賞、農情人賞、白井市特別賞に選ばれた作品を紹介します。',
      path: '/awards',
      ogImage: 'https://i.ytimg.com/vi/-QzFBNrApH0/hqdefault.jpg',
      ogImageAlt: 'グランプリ作品 No.19 白井市クエスト'
    },
    seminar: {
      title: '地域の魅力を、AIで映像に。｜受賞クリエイターが語る地域PR動画制作の舞台裏',
      description: '地域の魅力をどう見つけ、AIで映像や物語へ変えていくのか。受賞クリエイター2名が企画、生成、調整の舞台裏を語るオンラインセミナーです。2026年7月4日開催。一般参加無料。',
      path: '/seminar',
      ogImage: 'https://cdn.peatix.com/event/5055531/cover-WX0eJBm5VlF4awChKQHHjOl4GSbDlVw4.png',
      ogImageAlt: '地域の魅力を、AIで映像に。オンラインセミナー'
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
  const ogImage = new URL(current.ogImage || defaultOgImage, window.location.origin).toString();
  const ogImageAlt = current.ogImageAlt || '白井市PR動画コンテストのキービジュアル';

  document.title = current.title;
  upsertMeta('name', 'description', current.description);
  upsertMeta('name', 'robots', current.robots || 'index,follow');
  upsertMeta('name', 'theme-color', '#fffaf5');
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:site_name', '白井市PR動画コンテスト');
  upsertMeta('property', 'og:locale', 'ja_JP');
  upsertMeta('property', 'og:title', current.title);
  upsertMeta('property', 'og:description', current.description);
  upsertMeta('property', 'og:url', canonicalUrl);
  upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:image:alt', ogImageAlt);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', current.title);
  upsertMeta('name', 'twitter:description', current.description);
  upsertMeta('name', 'twitter:url', canonicalUrl);
  upsertMeta('name', 'twitter:image', ogImage);
  upsertMeta('name', 'twitter:image:alt', ogImageAlt);
  upsertLink('canonical', canonicalUrl);
})();
