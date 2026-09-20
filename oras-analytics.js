/**
 * إحصاءات الزوار — عيادة أوراس لطب الأسنان (GoatCounter)
 * ─────────────────────────────────────────────────────────────────
 * • يحمّل سكربت الإحصاء تلقائياً فقط إذا ضُبط «كود الموقع» في index.html:
 *       window.ORAS_GOATCOUNTER = { code: 'orasdentalclinic' };
 * • بدون الكود: الملف لا يفعل أي شيء إطلاقاً — لا طلبات شبكة، لا رسائل خطأ،
 *   ولا أي تأثير على سرعة الموقع أو على نظام الحجز.
 * • يتتبّع الأحداث المهمة (أحداث = Events في لوحة GoatCounter):
 *       booking_confirmed   → حجز تأكد فعلاً على الخادم
 *       booking_submit      → ضغط زر «احجز الآن»
 *       review_submitted    → إرسال تقييم من الموقع
 *       whatsapp_click      → أي زر/رابط واتساب (يُرسل رقم الوجهة)
 *       call_click          → أي زر اتصال مباشر tel: (يُرسل الرقم)
 *       path_change         → تغيير القسم داخل الصفحة الواحدة (#الخدمات)
 * • العدّاد الظاهر في الموقع: فعّله بـ showVisitorCounter: true، ويلزم تفعيل
 *   «Allow adding visitor counts on your website» من إعدادات موقعك في
 *   GoatCounter (الخاصية مقفولة افتراضياً). الأرقام تُخبَّأ حتى 4 ساعات.
 */

(function () {
  'use strict';

  var config = window.ORAS_GOATCOUNTER || {};
  /* الكود: الجزء الأول من رابط موقعك في GoatCounter — MYCODE.goatcounter.com */
  var code = String(config.code || config.site || '').trim();
  if (code) code = code.replace(/^https?:\/\//, '').replace(/\.goatcounter\.com.*$/, '').replace(/\/+$/, '');

  /* التطوير المحلي لا يُحسب — حتى لا تتلوّث الأرقام الحقيقية بزياراتك أنت */
  var host = location.hostname;
  var isDev = host === 'localhost' || host === '127.0.0.1' || host === '' || /\.local$/.test(host);
  if (config.trackLocal === true) isDev = false;

  var base = code ? 'https://' + code + '.goatcounter.com' : '';
  var ready = false;

  /* أحداث وصلت قبل تحميل count.js — تُرسل فور جهوزه حتى لا نفقد نقرات */
  var pending = [];

  var exposed = {
    enabled: function () { return !!base && !isDev; },
    config: { code: code, base: base, isDev: isDev, trackLocal: config.trackLocal === true },

    /** إرسال حدث إلى GoatCounter — آمن الاستدعاء دائماً (لا يفعل شيئاً إن لم يُضبط الكود) */
    track: function (name, data) {
      if (!base) return false;
      if (isDev) return false;
      if (!name) return false;
      var payload = {
        path: '/event/' + String(name),
        title: String(name),
        event: true,
        referrer: ''
      };
      var extra = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(function (k) {
          var v = data[k];
          if (v === undefined || v === null || v === '') return;
          extra[k] = String(v);
        });
      }
      /* GoatCounter يجمع الحقول الإضافية في «الحملات» داخل اللوحة */
      if (Object.keys(extra).length) payload.campaign = JSON.stringify(extra);

      if (!ready || !window.goatcounter || typeof window.goatcounter.count !== 'function') {
        if (pending.length < 50) pending.push(payload);
        return false;
      }
      try { window.goatcounter.count(payload); } catch (e) {}
      return true;
    },

    /** عدد زوار صفحة (أو TOTAL لكل الموقع) عبر واجهة العدّاد العلنية */
    getCount: function (path) {
      return new Promise(function (resolve) {
        if (!base) { resolve(null); return; }
        var p = path || 'TOTAL';
        try {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', base + '/counter/' + encodeURIComponent(p) + '.json', true);
          xhr.timeout = 8000;
          xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status < 200 || xhr.status >= 300) { resolve(null); return; }
            try {
              var res = JSON.parse(xhr.responseText);
              resolve(res && (res.count !== undefined ? res.count : res.count_unique));
            } catch (e) { resolve(null); }
          };
          xhr.onerror = function () { resolve(null); };
          xhr.ontimeout = function () { resolve(null); };
          xhr.send();
        } catch (e) { resolve(null); }
      });
    }
  };

  window.ORAS_ANALYTICS = exposed;

  // ─── تحميل سكربت GoatCounter ───
  function loadCounter() {
    if (!base || isDev) return;
    if (document.querySelector('script[data-goatcounter]')) return;
    var s = document.createElement('script');
    s.setAttribute('data-goatcounter', base + '/count');
    s.async = true;
    s.src = '//gc.zgo.at/count.js';
    s.onload = function () {
      ready = true;
      /* تفريغ قائمة الانتظار */
      var queue = pending.slice();
      pending.length = 0;
      queue.forEach(function (p) {
        try { window.goatcounter.count(p); } catch (e) {}
      });
      /* العدّاد الظاهر (اختياري) */
      if (config.showVisitorCounter === true) attachVisitorCounter();
    };
    s.onerror = function () { /* فشل الإحصاء لا يجب أن يكسر الموقع أبداً */ };
    (document.head || document.documentElement).appendChild(s);
  }

  // ─── عدّاد الزوار الظاهر في الموقع (اختياري) ───
  function attachVisitorCounter() {
    var mount = document.getElementById('gcVisitorCount');
    if (!mount) return;
    exposed.getCount(config.visitorCountPath || 'TOTAL').then(function (n) {
      if (n === null || n === undefined) { mount.hidden = true; return; }
      mount.hidden = false;
      mount.innerHTML = '<span class="gc-num" id="gcVisitorNumber"></span>' +
        '<span class="gc-label">' + (config.visitorCountLabel || 'زيارة للموقع') + '</span>';
      var num = document.getElementById('gcVisitorNumber');
      if (num) num.textContent = String(n);
    });
  }

  // ─── تتبّع الأزرار: واتساب والاتصال (بالتفويض — يعمل مع الأزرار التي تبنيها اللوحة) ───
  function bindButtonTracking() {
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!el) return;
      var href = el.getAttribute('href') || '';
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(href)) {
        var m = href.match(/wa\.me\/(\d+)/) || href.match(/(?:phone=|wa\.me%2F)(\d+)/);
        exposed.track('whatsapp_click', { to: m ? '+' + m[1] : '', where: el.id || '' });
        return;
      }
      if (/^tel:/i.test(href)) {
        exposed.track('call_click', { to: href.replace(/^tel:/i, ''), where: el.id || '' });
      }
    }, true);
  }

  // ─── تتبّع تغيير الأقسام داخل الصفحة الواحدة ───
  function bindPathTracking() {
    var last = location.hash;
    function onChange() {
      if (location.hash === last) return;
      last = location.hash;
      if (last) exposed.track('path_change', { section: last.replace(/^#/, '') });
    }
    window.addEventListener('hashchange', onChange, true);
  }

  function init() {
    bindButtonTracking();
    bindPathTracking();
    loadCounter();
    /* إن ضُبط العدّاد الظاهر لكن count.js لم يُحمَّل (تطوير محلي) — لا نظهر شيئاً */
    var mount = document.getElementById('gcVisitorCount');
    if (mount && (!base || isDev)) mount.hidden = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
