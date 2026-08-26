/* royceai.com i18n engine — English / 한국어 / 中文 (built & maintained by translation_bot)
 * Injects the language switcher (🇺🇸 EN / 🇰🇷 KO / 🇨🇳 ZH), translates the page by
 * exact-match dictionary lookup against /i18n/ko.json and /i18n/zh.json.
 * Static text, JS-rendered text (MutationObserver), titles, meta, placeholders,
 * aria-labels and data-i18n template elements are all covered.
 * Choice persists in localStorage; ?lang=ko|zh|en overrides once.
 */
(function () {
  'use strict';
  if (window.__royceaiI18n) return;
  window.__royceaiI18n = 1;

  var NAMES = { en: 'English', ko: '한국어', zh: '中文' };
  var FLAGS = { en: '🇺🇸', ko: '🇰🇷', zh: '🇨🇳' };
  var SHORT = { en: 'EN', ko: 'KO', zh: 'ZH' };
  var STORE = 'royceai_lang';
  var dict = { ko: null, zh: null };
  var cur = 'en';
  var busy = false;

  var CSS = '.royceai-lang{position:relative;flex:none;margin-left:8px;order:99}.royceai-lang-btn{display:inline-flex;align-items:center;gap:6px;background:var(--bg-elevated,#15151b);border:1px solid var(--border,rgba(255,255,255,.09));color:var(--text,#eeeef0);font-family:inherit;font-size:.8rem;font-weight:600;padding:7px 12px;border-radius:9px;cursor:pointer;transition:all .2s;line-height:1}.royceai-lang-btn:hover{border-color:var(--accent,#7c5cfc);background:var(--accent-bg,rgba(124,92,252,.08))}.royceai-lang-menu{position:absolute;top:calc(100%+8px);right:0;min-width:152px;background:var(--bg-elevated,#15151b);border:1px solid var(--border,rgba(255,255,255,.12));border-radius:12px;padding:6px;display:none;flex-direction:column;gap:2px;z-index:2000;box-shadow:0 12px 40px rgba(0,0,0,.5)}.royceai-lang.open .royceai-lang-menu{display:flex}.royceai-lang-menu button{display:flex;align-items:center;gap:8px;background:transparent;border:0;color:var(--text-secondary,#88889a);font-family:inherit;font-size:.85rem;font-weight:500;padding:9px 12px;border-radius:8px;cursor:pointer;text-align:left;transition:all .15s;white-space:nowrap}.royceai-lang-menu button:hover{color:var(--text,#fff);background:var(--accent-bg,rgba(124,92,252,.1))}.royceai-lang-menu button.active{color:var(--accent-light,#a78bfa)}.royceai-lang-mobile{display:flex;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));margin-bottom:6px}@media(max-width:640px){.royceai-lang{margin-left:4px}.royceai-lang-btn{padding:6px 9px}}';

  function el(id) { return document.getElementById(id); }

  function isNoise(t) {
    if (!t || t.length < 2) return true;
    if (/^[\d\s.,%$€£¥:;!?()\/\\\-–—+*#'"&@_=<>~^|\[\]{}`´’'"]*$/.test(t)) return true;
    if (/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]*$/u.test(t)) return true;
    if (/^[A-Z0-9][A-Z0-9\-_.]{1,30}$/.test(t)) return true; // ids / codes / GA ids
    if (/^https?:\/\//i.test(t) || /^www\./i.test(t) || /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return true;
    return false;
  }

  function skipNode(n) {
    var p = n.parentElement;
    if (!p) return true;
    var tag = p.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE' || tag === 'TEXTAREA' || tag === 'IFRAME') return true;
    if (p.closest && p.closest('#royceaiLang, #royceaiLangMobile, [data-i18n-skip]')) return true;
    return false;
  }

  function translateTextNode(n) {
    var raw = n.nodeValue;
    if (!raw) return;
    var t = raw.replace(/\s+/g, ' ').trim();
    if (isNoise(t)) return;
    if (!n.dataset) n.dataset = {};
    if (!n.dataset.i18nOriginal) n.dataset.i18nOriginal = raw;
    var out = (cur === 'en') ? n.dataset.i18nOriginal : (dict[cur] && dict[cur][t]);
    if (out && out !== raw) n.nodeValue = out;
  }

  // data-i18n="Template {n} of {m}" — translate with param substitution
  function translateDataI18n(scope) {
    var list = (scope.querySelectorAll ? scope.querySelectorAll('[data-i18n]') : []);
    for (var i = 0; i < list.length; i++) {
      var elm = list[i];
      var key = elm.getAttribute('data-i18n');
      if (!key) continue;
      if (!elm.dataset.i18nOriginal) elm.dataset.i18nOriginal = elm.textContent;
      var tpl = (cur === 'en') ? null : (dict[cur] && dict[cur][key]);
      if (cur === 'en') {
        elm.textContent = elm.dataset.i18nOriginal;
      } else if (tpl) {
        var params = key.match(/\{(\w+)\}/g) || [];
        if (params.length) {
          var orig = elm.dataset.i18nOriginal || '';
          var reSrc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '(.*?)');
          var m = orig.match(new RegExp('^' + reSrc + '$'));
          var out = tpl;
          for (var j = 0; j < params.length; j++) {
            var v = (m && m[j + 1] !== undefined) ? m[j + 1] : '';
            out = out.split(params[j]).join(v);
          }
          if (out && out !== elm.textContent) elm.textContent = out;
        } else if (tpl !== elm.textContent) {
          elm.textContent = tpl;
        }
      }
    }
  }

  function translateAttrs(scope) {
    if (!scope.querySelectorAll) return;
    var sel = '[placeholder],[aria-label],[title],[alt]';
    if (scope === document.body || scope === document) sel = 'input[placeholder],textarea[placeholder],[aria-label],[title],img[alt],input[value],button[value]';
    var list = scope.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.closest && e.closest('[data-i18n-skip], #royceaiLang, #royceaiLangMobile')) continue;
      ['placeholder', 'aria-label', 'title', 'alt', 'value'].forEach(function (attr) {
        if (!e.hasAttribute(attr)) return;
        var v = e.getAttribute(attr).trim();
        if (isNoise(v) || !e.dataset || e.dataset['i18nAttr' + attr] !== undefined) return;
        if (cur === 'en') {
          if (e.dataset['i18nAttr' + attr]) e.setAttribute(attr, e.dataset['i18nAttr' + attr]);
        } else if (dict[cur] && dict[cur][v]) {
          e.dataset['i18nAttr' + attr] = e.getAttribute(attr);
          e.setAttribute(attr, dict[cur][v]);
        }
      });
    }
  }

  function walkScope(scope) {
    if (!scope) return;
    if (scope.nodeType === 3) { translateTextNode(scope); return; }
    if (scope.nodeType !== 1) return;
    if (scope.closest && scope.closest('[data-i18n-skip], #royceaiLang, #royceaiLangMobile')) return;
    translateDataI18n(scope);
    translateAttrs(scope);
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return (n.parentElement && !skipNode(n)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) translateTextNode(n);
  }

  function apply() {
    busy = true;
    try {
      document.documentElement.lang = cur;
      walkScope(document.body);
      // title + meta description
      var titleEl = document.querySelector('title');
      if (titleEl && titleEl.textContent) {
        var tt = titleEl.textContent.replace(/\s+/g, ' ').trim();
        if (cur === 'en') { if (titleEl.dataset.i18nOriginal) titleEl.textContent = titleEl.dataset.i18nOriginal; }
        else if (dict[cur] && dict[cur][tt]) {
          if (!titleEl.dataset.i18nOriginal) titleEl.dataset.i18nOriginal = titleEl.textContent;
          titleEl.textContent = dict[cur][tt];
        }
      }
      var md = document.querySelector('meta[name="description"]');
      if (md && md.content) {
        var dc = md.content.replace(/\s+/g, ' ').trim();
        if (cur === 'en') { if (md.dataset.i18nOriginal) md.content = md.dataset.i18nOriginal; }
        else if (dict[cur] && dict[cur][dc]) {
          if (!md.dataset.i18nOriginal) md.dataset.i18nOriginal = md.content;
          md.content = dict[cur][dc];
        }
      }
      var btn = el('royceaiLangBtn');
      if (btn) btn.innerHTML = FLAGS[cur] + ' <span>' + SHORT[cur] + '</span> <span style="opacity:.6;font-size:.7em">▾</span>';
      document.querySelectorAll('.royceai-lang-menu button[data-lang]').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-lang') === cur);
      });
    } catch (err) {
      try { window.__i18nLastError = String((err && err.stack) || err); } catch (e) {}
    } finally { busy = false; }
  }

  // debug hook: window.__i18nDebug() → {cur, ko: n keys, zh: n keys}
  window.__i18nDebug = function () {
    return {
      cur: cur,
      ko: dict.ko ? Object.keys(dict.ko).length : null,
      zh: dict.zh ? Object.keys(dict.zh).length : null,
      lastError: window.__i18nLastError || null
    };
  };

  function buildSwitcher() {
    var wrap = document.createElement('div');
    wrap.className = 'royceai-lang';
    wrap.id = 'royceaiLang';
    wrap.innerHTML = '<button class="royceai-lang-btn" id="royceaiLangBtn" aria-label="Language">🇺🇸 <span>EN</span> <span style="opacity:.6;font-size:.7em">▾</span></button>' +
      '<div class="royceai-lang-menu" role="menu">' +
      '<button data-lang="en" role="menuitem">🇺🇸 English</button>' +
      '<button data-lang="ko" role="menuitem">🇰🇷 한국어</button>' +
      '<button data-lang="zh" role="menuitem">🇨🇳 中文</button>' +
      '</div>';
    var nav = document.querySelector('nav');
    if (nav) {
      var burger = el('navBurger');
      if (burger && burger.parentNode === nav) nav.insertBefore(wrap, burger);
      else nav.appendChild(wrap);
    } else {
      // no <nav> (unlikely) — pin top-right
      wrap.style.cssText = 'position:fixed;top:12px;right:12px;z-index:3000';
      document.body.appendChild(wrap);
    }
    var btn = el('royceaiLangBtn');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      wrap.classList.toggle('open');
    });
    wrap.querySelectorAll('.royceai-lang-menu button').forEach(function (b) {
      b.addEventListener('click', function () {
        setLang(b.getAttribute('data-lang'));
        wrap.classList.remove('open');
      });
    });
    document.addEventListener('click', function () { wrap.classList.remove('open'); });

    // mobile drawer copy (waits for drawer population)
    function addMobile() {
      var menu = el('mobileMenu');
      if (!menu || el('royceaiLangMobile')) return;
      var copy = wrap.cloneNode(true);
      copy.id = 'royceaiLangMobile';
      copy.className = 'royceai-lang royceai-lang-mobile';
      copy.style.cssText = 'position:static;margin:0';
      var cbtn = copy.querySelector('#royceaiLangBtn');
      if (cbtn) cbtn.id = 'royceaiLangBtnM';
      var cwrap = copy;
      copy.querySelector('.royceai-lang-menu button').forEach = Array.prototype.forEach;
      copy.querySelectorAll('.royceai-lang-menu button').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          setLang(b.getAttribute('data-lang'));
          cwrap.classList.remove('open');
        });
      });
      var cbtnEl = el('royceaiLangBtnM');
      if (cbtnEl) cbtnEl.addEventListener('click', function (e) { e.stopPropagation(); cwrap.classList.toggle('open'); });
      menu.insertBefore(copy, menu.firstChild);
      // if drawer never got its anchor clones (clone guard saw our node), clone them now
      setTimeout(function () {
        var links = document.querySelector('.nav-links');
        if (menu.children.length === 1 && links) {
          links.querySelectorAll('a:not(.nav-cta)').forEach(function (a) { menu.appendChild(a.cloneNode(true)); });
        }
      }, 400);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addMobile);
    else addMobile();
  }

  function setLang(l) {
    if (!dict[l] && l !== 'en') return; // dict not loaded yet — allow en
    cur = l;
    try { localStorage.setItem(STORE, l); } catch (e) {}
    apply();
  }

  function init() {
    var st = null;
    try { st = localStorage.getItem(STORE); } catch (e) {}
    var q = (location.search.match(/[?&]lang=(en|ko|zh)/i) || [])[1];
    cur = (q || st || 'en').toLowerCase();
    if (!NAMES[cur]) cur = 'en';

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    buildSwitcher();

    var remaining = 2;
    var appliedOnce = false;
    function maybeApply() {
      remaining--;
      if (remaining <= 0) {
        appliedOnce = true;
        apply();
      }
    }
    function load(lang, attempt) {
      attempt = attempt || 0;
      fetch('/i18n/' + lang + '.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          var wasApplied = appliedOnce;
          dict[lang] = j || {};
          maybeApply();
          // self-heal: if an earlier apply ran with an empty dict, re-apply now
          if (wasApplied) apply();
        })
        .catch(function () {
          // GitHub Pages CDN edge lag — retry with backoff before giving up
          dict[lang] = dict[lang] || {};
          if (attempt < 4) {
            setTimeout(function () { load(lang, attempt + 1); }, 1500 * Math.pow(2, attempt));
          } else {
            try { console.warn('[i18n] failed to load /i18n/' + lang + '.json after retries'); } catch (e) {}
            maybeApply();
          }
        });
    }
    load('ko');
    load('zh');

    // observe late-rendered content (restaurant cards, quiz UI, dashboards)
    var timer = null;
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        if (busy) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          for (var i = 0; i < muts.length; i++) {
            var added = muts[i].addedNodes;
            for (var j = 0; j < added.length; j++) walkScope(added[j]);
          }
        }, 120);
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
