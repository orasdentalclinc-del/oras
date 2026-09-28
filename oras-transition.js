/*!
 * أوراس لطب الأسنان — انتقال سينمائي بين الصفحات
 * ─────────────────────────────────────────────
 * عند الضغط على أي رابط يحمل data-pt:
 *   ١) دائرة بلون الهوية البصرية (ذهبي) تتوسّع من المركز حتى تملأ الشاشة،
 *   ٢) سنّ يخرج من منتصف الدائرة بحركة مرحة،
 *   ٣) ثم تُفتح الصفحة الجديدة، وينعكس الأثر هناك: يعود السنّ داخل الدائرة
 *      وتنكمش الدائرة حتى تختفي كاشفةً محتوى الصفحة.
 *
 * الاستخدام:
 *   <script src="oras-transition.js?v=1"></script>   ← في <head> بدون defer
 *   <a href="education.html" data-pt>أوراس التعليمية</a>
 *
 * يحترم إعداد «تقليل الحركة» (prefers-reduced-motion) لدى المستخدم.
 */
(function () {
  'use strict';

  var FLAG = 'oras-pt';
  var SIZE = 140; /* قطر الدائرة الأساس بالبكسل */
  var COVER_MS = 1150; /* مدة التغطية قبل فتح الصفحة */
  var REVEAL_MS = 1400; /* مدة الانعكاس عند فتح الصفحة */
  var busy = false;

  var reduce =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── نمط الطبقة الزائلة ── */
  var CSS = [
    '.pt-overlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;pointer-events:auto;overflow:hidden}',
    '.pt-overlay.on{display:flex}',
    /* الدائرة الذهبية — حالتها الافتراضية: تملأ الشاشة */
    '.pt-circle{position:absolute;left:50%;top:50%;width:' + SIZE + 'px;height:' + SIZE + 'px;margin:' + -SIZE / 2 + 'px 0 0 ' + -SIZE / 2 + 'px;border-radius:50%;' +
      'background:radial-gradient(circle at 34% 26%,#F9EDBF 0%,#EFD98F 34%,#D9AE35 68%,#C9A227 100%);' +
      'transform:scale(var(--pt-scale,30));will-change:transform}',
    /* حلقة صدمة خفيفة تنتشر مع الدائرة */
    '.pt-ring{position:absolute;left:50%;top:50%;width:' + SIZE + 'px;height:' + SIZE + 'px;margin:' + -SIZE / 2 + 'px 0 0 ' + -SIZE / 2 + 'px;border-radius:50%;' +
      'border:3px solid rgba(255,255,255,.65);transform:scale(var(--pt-scale,30));opacity:0;pointer-events:none}',
    /* السنّ — يطفو في منتصف الدائرة */
    '.pt-tooth{position:relative;width:92px;height:92px;line-height:0;filter:drop-shadow(0 14px 26px rgba(105,78,12,.38))}',
    '.pt-tooth svg{width:100%;height:100%;display:block}',

    /* بداية التغطية: دائرة مصغّرة والسنّ مخفي داخلها */
    '.pt-overlay.enter .pt-circle{transform:scale(0)}',
    '.pt-overlay.enter .pt-ring{transform:scale(0);opacity:.9}',
    '.pt-overlay.enter .pt-tooth{transform:translateY(46px) scale(.12);opacity:0}',

    /* الحركة أثناء التغطية (للخارج) */
    '.pt-overlay.go .pt-circle{transition:transform .95s cubic-bezier(.65,0,.35,1)}',
    '.pt-overlay.go .pt-ring{transition:transform .95s cubic-bezier(.2,.75,.3,1) .12s,opacity .8s ease .25s}',
    '.pt-overlay.go .pt-tooth{transition:transform .6s cubic-bezier(.34,1.56,.64,1) .32s,opacity .35s ease .32s}',

    /* الانعكاس عند فتح الصفحة: السنّ يعود أولاً إلى الدائرة، ثم تنكمش الدائرة */
    '.pt-overlay.out .pt-circle{transform:scale(0);transition:transform .9s cubic-bezier(.65,0,.35,1) .4s}',
    '.pt-overlay.out .pt-tooth{transform:translateY(46px) scale(.12);opacity:0;transition:transform .42s cubic-bezier(.5,0,.75,0) .08s,opacity .3s ease .1s}',

    '@media (prefers-reduced-motion:reduce){.pt-overlay{display:none!important}}'
  ].join('\n');

  function scaleFactor() {
    var d = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
    return Math.ceil(d / SIZE) + 2;
  }

  function injectStyle() {
    if (document.getElementById('ptStyle')) return;
    var s = document.createElement('style');
    s.id = 'ptStyle';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  var TOOTH_SVG =
    '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="#FFFDF6" d="M32 12c-5 0-6.5 3-10.5 3-5.5 0-8 4-8 9.5 0 10 4.8 15 6.8 25 .9 4.8 7 4.7 7.9-.2.7-3.4 1.6-7 3.8-7s3.1 3.6 3.8 7c.9 4.9 7 5 7.9.2 2-10 6.8-15 6.8-25 0-5.5-2.5-9.5-8-9.5-4 0-5.5-3-10.5-3z"/>' +
    '<path fill="rgba(201,162,39,.35)" d="M32 12c-5 0-6.5 3-10.5 3-5.5 0-8 4-8 9.5 0 2.2.4 4.2 1.1 6.1 1.6-4.7 5-8 9.8-8 3.9 0 6.6 2.6 9.1 2.6s5.2-2.6 9.1-2.6c4.8 0 8.2 3.3 9.8 8 .7-1.9 1.1-3.9 1.1-6.1 0-5.5-2.5-9.5-8-9.5-4 0-5.5-3-10.5-3z"/>' +
    '</svg>';

  function overlay() {
    var el = document.getElementById('ptOverlay');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'ptOverlay';
    el.className = 'pt-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="pt-circle"></div><div class="pt-ring"></div><div class="pt-tooth">' + TOOTH_SVG + '</div>';
    /* body قد لا يكون جاهزاً بعد — fixed positioning يعمل مهما كان الأب */
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  /* ── التغطية: عند الضغط على الزر ── */
  function cover(url) {
    if (busy) return;
    busy = true;
    try {
      sessionStorage.setItem(FLAG, 'reveal');
    } catch (e) {}

    if (reduce) {
      location.href = url;
      return;
    }

    injectStyle();
    var el = overlay();
    el.className = 'pt-overlay on enter';
    el.style.setProperty('--pt-scale', scaleFactor());
    void el.offsetWidth; /* إعادة احتساب التخطيط قبل بدء الحركة */
    el.classList.add('go');
    el.classList.remove('enter');

    setTimeout(function () {
      location.href = url;
    }, COVER_MS);
  }

  /* ── الانعكاس: عند فتح الصفحة التالية ── */
  function reveal() {
    injectStyle();
    var el = overlay();
    el.className = 'pt-overlay on'; /* الحالة الافتراضية = الدائرة تملأ الشاشة */
    el.style.setProperty('--pt-scale', scaleFactor());

    var start = function () {
      requestAnimationFrame(function () {
        setTimeout(function () {
          el.classList.add('go', 'out');
          setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
            busy = false;
          }, REVEAL_MS);
        }, 120);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  /* ── تفعيل الانعكاس عند الوصول بعلامة من صفحة سابقة ── */
  var pending = false;
  try {
    pending = sessionStorage.getItem(FLAG) === 'reveal';
    if (pending) sessionStorage.removeItem(FLAG);
  } catch (e) {}

  if (pending && !reduce) {
    reveal();
  }

  /* ── اعتراض الضغطات على الروابط ذات data-pt ── */
  document.addEventListener('click', function (e) {
    if (reduce) return;
    var node = e.target;
    var a = node && node.closest ? node.closest('a[data-pt]') : null;
    if (!a) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    e.preventDefault();
    cover(href);
  });
})();
