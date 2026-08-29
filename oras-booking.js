/**
 * نظام الحجز الآلي بالساعة — عيادة أوراس لطب الأسنان
 * ─────────────────────────────────────────────────────
 * • الحجز بالساعة: 12 ساعة متواصلة من 8:00 صباحاً حتى 8:00 مساءً.
 * • رسالة «متاح / غير متاح» تظهر فقط بعد الضغط على زر «احجز الآن».
 * • زر الحجز الآلي منفصل تماماً عن زر واتساب (مسارين مستقلين).
 */

var ENDPOINT = 'https://script.google.com/macros/s/AKfycby8lxyjADZwmM_YVFxklEEtjhNwY691C-rNv5aaOrPoWnH4OFY2iIHDzpI-k8Tq3Jo8Ow/exec';

(function () {
  'use strict';

  // التحقق من صحة رابط الأتمتة
  if (!ENDPOINT || typeof ENDPOINT !== 'string' || ENDPOINT.indexOf('https://script.google') !== 0) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('oras-booking: رابط الخدمة غير صالح، تم إيقاف النظام الآلي.');
    }
    return;
  }

  // ─── إعدادات الدوام: 12 ساعة متواصلة من 8 صباحاً حتى 8 مساءً ───
  var OPEN_HOUR = 8;    // أول ساعة حجز تبدأ 08:00
  var CLOSE_HOUR = 20;  // الإغلاق 20:00 (آخر ساعة حجز 19:00 - 20:00)
  var DEFAULT_MAX = 4;  // السعة الافتراضية للساعة الواحدة (يُحدَّث من الخادم)

  // حالة التوفر — تُجلب عند الضغط على زر الحجز فقط
  var state = {
    max: DEFAULT_MAX,
    closed: [],
    taken: {},
    today: '',
    nowHour: -1,
    lastFetch: 0
  };

  var busy = false; // قفل يمنع النقر المزدوج أثناء التحقق/الحجز

  var dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // ─── أدوات الساعات ───
  function hourValue(h) {
    return (h < 10 ? '0' : '') + h + ':00';
  }

  var HOURS = [];
  (function () {
    for (var h = OPEN_HOUR; h < CLOSE_HOUR; h++) HOURS.push(hourValue(h));
  })();

  // "14:00" → "2:00 مساءً"
  function hourLabel(hourVal) {
    var hh = parseInt(hourVal, 10);
    if (isNaN(hh)) return hourVal;
    if (hh < 12) return hh + ':00 صباحاً';
    if (hh === 12) return '12:00 ظهراً';
    return (hh - 12) + ':00 مساءً';
  }

  // "14:00" → "14:00 - 15:00"
  function hourRange(hourVal) {
    var hh = parseInt(hourVal, 10);
    if (isNaN(hh) || hh < 0 || hh > 23) return hourVal;
    return hourVal + ' - ' + hourValue(hh + 1);
  }

  // ─── أدوات التاريخ ───
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function getTodayStr() {
    if (state.today) return state.today; // تاريخ اليوم حسب توقيت الخادم
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }

  function parseDateObj(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    var parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function isPastDate(dateStr) {
    if (!dateStr) return false;
    return dateStr < getTodayStr();
  }

  function isFriday(dateStr) {
    var d = parseDateObj(dateStr);
    return d ? d.getDay() === 5 : false;
  }

  function isClosedDate(dateStr) {
    if (!dateStr) return false;
    if (isFriday(dateStr)) return true;
    return Array.isArray(state.closed) && state.closed.indexOf(dateStr) !== -1;
  }

  // هل الساعة بدأت أو انتهت اليوم؟ (مقارنة بتوقيت الخادم، وإن لم يتوفر فتوقيت الجهاز)
  function isHourPast(dateStr, hourVal) {
    if (dateStr !== getTodayStr()) return false;
    var nowH = state.nowHour >= 0 ? state.nowHour : new Date().getHours();
    return parseInt(hourVal, 10) <= nowH;
  }

  // ─── حساب الإشغال بالساعة ───
  function hourKey(dateStr, hourVal) {
    return dateStr + '|' + hourVal;
  }

  function getTakenCount(dateStr, hourVal) {
    if (!dateStr || !hourVal) return 0;
    var k = hourKey(dateStr, hourVal);
    return (state.taken && state.taken[k]) ? parseInt(state.taken[k], 10) || 0 : 0;
  }

  function isHourFull(dateStr, hourVal) {
    if (!dateStr || !hourVal) return false;
    return getTakenCount(dateStr, hourVal) >= (state.max || DEFAULT_MAX);
  }

  // الساعات الشاغرة في يوم معيّن
  function freeHoursForDate(dateStr) {
    var out = [];
    if (!dateStr) return out;
    for (var i = 0; i < HOURS.length; i++) {
      var hr = HOURS[i];
      if (!isHourFull(dateStr, hr) && !isHourPast(dateStr, hr)) out.push(hr);
    }
    return out;
  }

  // بحث عن بدائل: ساعات لاحقة في نفس اليوم أولاً، ثم أقرب الأيام التالية
  function findAlternatives(dateStr, hourVal, count) {
    count = count || 3;
    var list = [];
    var todayObj = parseDateObj(getTodayStr());
    var cur = parseDateObj(dateStr);
    if (!cur || cur < todayObj) cur = new Date(todayObj.getTime());

    // 1) ساعات شاغرة لاحقة في نفس اليوم
    var sameDay = freeHoursForDate(dateStr);
    for (var i = 0; i < sameDay.length && list.length < count; i++) {
      if (!hourVal || sameDay[i] > hourVal) {
        list.push(makeAlt(dateStr, sameDay[i]));
      }
    }

    // 2) أقرب الأيام التالية (مع تجاوز الجمعة والأيام المغلقة وساعات اليوم المنقضية)
    var checkedDays = 0;
    while (list.length < count && checkedDays < 30) {
      checkedDays++;
      cur.setDate(cur.getDate() + 1);
      var ds = cur.getFullYear() + '-' + pad2(cur.getMonth() + 1) + '-' + pad2(cur.getDate());
      if (isClosedDate(ds)) continue;
      var dayFree = freeHoursForDate(ds);
      for (var j = 0; j < dayFree.length && list.length < count; j++) {
        list.push(makeAlt(ds, dayFree[j]));
      }
    }
    return list;
  }

  function makeAlt(dateStr, hourVal) {
    var d = parseDateObj(dateStr);
    var dayName = d ? dayNames[d.getDay()] : '';
    return {
      date: dateStr,
      hour: hourVal,
      label: dayName + ' ' + dateStr + ' — ' + hourLabel(hourVal)
    };
  }

  // ─── صندوق رسالة التوفر (لا يظهر إلا بعد الضغط على زر الحجز) ───
  function getStatusBox() {
    return document.getElementById('bookingStatusBox');
  }

  function showStatus(kind, html) {
    var box = getStatusBox();
    if (!box) return;
    box.className = 'booking-status ' + (kind || 'info');
    box.innerHTML = html;
    box.style.display = 'block';
    try { box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  }

  function hideStatus() {
    var box = getStatusBox();
    if (box) {
      box.style.display = 'none';
      box.innerHTML = '';
    }
  }

  function renderAlts(alts) {
    var html = '<div style="margin-top:6px;font-weight:800">أقرب المواعيد المتاحة:</div><div style="margin-top:4px">';
    for (var i = 0; i < alts.length; i++) {
      html += '<button type="button" class="booking-alt-btn" data-date="' + alts[i].date + '" data-hour="' + alts[i].hour + '">' + alts[i].label + '</button>';
    }
    html += '</div>';
    return html;
  }

  function bindAltButtons() {
    var box = getStatusBox();
    if (!box) return;
    var btns = box.querySelectorAll('.booking-alt-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var d = this.getAttribute('data-date');
        var h = this.getAttribute('data-hour');
        var dateInput = document.getElementById('fDate');
        if (dateInput && d) dateInput.value = d;
        if (h) {
          var r = document.querySelector('input[name="hour"][value="' + h + '"]');
          if (r) r.checked = true;
        }
        // الضغط على بديل = إعادة تشغيل فحص التوفر والحجز فوراً
        runAutoBooking();
      });
    }
  }

  // ─── قراءة بيانات النموذج ───
  function readForm() {
    var nameInput = document.getElementById('fName');
    var phoneInput = document.getElementById('fPhone');
    var serviceInput = document.getElementById('fService');
    var dateInput = document.getElementById('fDate');
    var notesInput = document.getElementById('fNotes');
    var hourRadio = document.querySelector('input[name="hour"]:checked');
    return {
      name: nameInput ? nameInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      service: serviceInput ? serviceInput.value : 'فحص وتشخيص عام',
      date: dateInput ? dateInput.value : '',
      hour: hourRadio ? hourRadio.value : '',
      notes: notesInput ? notesInput.value.trim() : '',
      nameInput: nameInput,
      phoneInput: phoneInput,
      dateInput: dateInput
    };
  }

  function showToastMsg(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('show'); }, 4500);
  }

  // ─── جلب حالة التوفر من الخادم ───
  function fetchAvailability(callback) {
    var sep = ENDPOINT.indexOf('?') === -1 ? '?' : '&';
    var url = ENDPOINT + sep + 'action=availability&_t=' + new Date().getTime();

    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      if (ok) state.lastFetch = new Date().getTime();
      if (typeof callback === 'function') callback(ok);
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 12000;
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status >= 200 && xhr.status < 400) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.ok) {
              if (typeof data.max === 'number') state.max = data.max;
              if (Array.isArray(data.closed)) state.closed = data.closed;
              if (data.taken && typeof data.taken === 'object') state.taken = data.taken;
              if (typeof data.today === 'string' && data.today) state.today = data.today;
              if (typeof data.nowHour === 'number') state.nowHour = data.nowHour;
              finish(true);
              return;
            }
          } catch (e) {}
        }
        finish(false);
      };
      xhr.onerror = function () { finish(false); };
      xhr.ontimeout = function () { finish(false); };
      xhr.send();
    } catch (e) {
      finish(false);
    }
  }

  // ─── تسجيل الحجز على الخادم (الحجز الآلي) ───
  function submitBooking(payload, onDone) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    xhr.timeout = 15000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 400) {
        try {
          var res = JSON.parse(xhr.responseText);
          if (res) {
            onDone(res);
            return;
          }
        } catch (e) {}
      }
      onDone({ ok: false, networkError: true });
    };
    xhr.onerror = function () { onDone({ ok: false, networkError: true }); };
    xhr.ontimeout = function () { onDone({ ok: false, networkError: true }); };

    try {
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      onDone({ ok: false, networkError: true });
    }
  }

  // ─── زر واتساب المنفصل: تجهيز الرسالة وفتح واتساب مباشرة ───
  function openWhatsApp(payload) {
    var brandEl = document.querySelector('.brandShort');
    var clinic = (brandEl && brandEl.textContent) ? brandEl.textContent.trim() : 'أوراس';
    var msg =
      '🦷 طلب حجز موعد — ' + clinic + ' لطب الأسنان\n' +
      '────────────────\n' +
      '👤 الاسم: ' + (payload.name || '') + '\n' +
      '📞 الهاتف: ' + (payload.phone || '') + '\n' +
      '🩺 الخدمة: ' + (payload.service || 'فحص وتشخيص عام') + '\n' +
      '📅 التاريخ: ' + (payload.date || 'أي يوم مناسب') + '\n' +
      '🕐 الساعة: ' + (payload.hour ? hourLabel(payload.hour) + ' (' + hourRange(payload.hour) + ')' : 'أي ساعة تناسبكم') + '\n' +
      '📝 ملاحظات: ' + (payload.notes || '—') + '\n' +
      '────────────────\n' +
      'أُرسل من موقع العيادة';

    var waNum = window.__WA__ || '249912345678';
    var url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);
    var win = window.open(url, '_blank');
    if (!win) window.location.href = url;
    showToastMsg('✅ تم تجهيز طلبك — أكمل الإرسال من واتساب');
  }

  // زر واتساب: مسار مستقل تماماً — لا فحص توفر ولا تسجيل آلي
  function handleWhatsAppClick() {
    var f = readForm();
    if (!f.name || !f.phone) {
      showToastMsg('من فضلك أدخل الاسم ورقم الهاتف');
      if (!f.name && f.nameInput) f.nameInput.focus();
      else if (!f.phone && f.phoneInput) f.phoneInput.focus();
      return;
    }
    openWhatsApp(f);
  }

  // ─── المسار الآلي: فحص التوفر يبدأ فقط بعد الضغط على زر الحجز ───
  function handleFormSubmit(e) {
    if (e) {
      e.preventDefault();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
    runAutoBooking();
  }

  function runAutoBooking() {
    if (busy) return;

    var f = readForm();

    // 1) التحقق من الحقول
    if (!f.name || !f.phone) {
      showStatus('warn', '⚠️ <span>من فضلك أدخل الاسم الكامل ورقم الهاتف أولاً.</span>');
      showToastMsg('من فضلك أدخل الاسم ورقم الهاتف');
      if (!f.name && f.nameInput) f.nameInput.focus();
      else if (!f.phone && f.phoneInput) f.phoneInput.focus();
      return;
    }
    if (!f.date) {
      showStatus('warn', '📅 <span>اختر <b>تاريخ الزيارة</b> أولاً ليتحقق النظام من توفر الساعة.</span>');
      if (f.dateInput) f.dateInput.focus();
      return;
    }
    if (!f.hour) {
      showStatus('warn', '🕐 <span>اختر <b>ساعة الحجز</b> من الجدول (من 8:00 صباحاً حتى 7:00 مساءً).</span>');
      return;
    }

    // 2) رسالة «جاري التحقق» — أول رسالة تظهر بعد الضغط على الزر
    busy = true;
    setSubmitBusy(true);
    showStatus('info', '⏳ <span>جاري التحقق من توفر موعد <b>' + hourLabel(f.hour) + '</b> يوم <b>' + f.date + '</b> …</span>');

    // 3) جلب حالة التوفر الحالية من الخادم ثم الفحص
    fetchAvailability(function (available_ok) {
      if (!available_ok) {
        busy = false;
        setSubmitBusy(false);
        showStatus('err', '📡 <span><b>تعذر التحقق من التوفر الآن.</b><br>تحقق من اتصال الإنترنت وحاول مرة أخرى، أو استخدم زر <b>«حجز عبر واتساب»</b>.</span>');
        return;
      }
      evaluateAndBook(f);
    });
  }

  // فحص التاريخ والساعة وعرض «متاح / غير متاح» ثم الحجز إن كانت متاحة
  function evaluateAndBook(f) {
    var dateStr = f.date;
    var hourStr = f.hour;
    var dateWord = dayNames[parseDateObj(dateStr) ? parseDateObj(dateStr).getDay() : 0] + ' ' + dateStr;

    // تاريخ ماضٍ
    if (isPastDate(dateStr)) {
      finishFlow(function () {
        showStatus('err', '⚠️ <span><b>غير متاح</b> — هذا التاريخ قد مضى. يرجى اختيار تاريخ ابتداءً من اليوم.</span>');
      });
      return;
    }

    // الجمعة / يوم مغلق
    if (isClosedDate(dateStr)) {
      var altsClosed = findAlternatives(dateStr, hourStr, 3);
      finishFlow(function () {
        showStatus('err',
          (isFriday(dateStr) ? '🏖️ <span><b>غير متاح</b> — الجمعة عطلة رسمية وراحة للعيادة.</span>'
                             : '⛔ <span><b>غير متاح</b> — العيادة مغلقة في هذا اليوم.</span>')
          + renderAlts(altsClosed));
        bindAltButtons();
      });
      return;
    }

    // ساعة اليوم بدأت بالفعل
    if (isHourPast(dateStr, hourStr)) {
      var altsPastHour = findAlternatives(dateStr, hourStr, 3);
      finishFlow(function () {
        showStatus('err', '⌛ <span><b>غير متاح</b> — ساعة ' + hourLabel(hourStr) + ' بدأت أو انتهت بالفعل اليوم. اختر ساعة قادمة.</span>' + renderAlts(altsPastHour));
        bindAltButtons();
      });
      return;
    }

    // الساعة ممتلئة
    if (isHourFull(dateStr, hourStr)) {
      var remaining = Math.max(0, (state.max || DEFAULT_MAX) - getTakenCount(dateStr, hourStr));
      var altsFull = findAlternatives(dateStr, hourStr, 3);
      finishFlow(function () {
        showStatus('err',
          '❌ <span><b>غير متاح</b> — ساعة ' + hourLabel(hourStr) + ' يوم ' + dateWord + ' ممتلئة بالكامل (المتبقي: ' + remaining + ' من ' + (state.max || DEFAULT_MAX) + ').</span>'
          + renderAlts(altsFull));
        bindAltButtons();
      });
      return;
    }

    // ✅ متاح — عرض الرسالة ثم تأكيد الحجز آلياً
    var freeAfter = (state.max || DEFAULT_MAX) - getTakenCount(dateStr, hourStr);
    showStatus('ok', '✅ <span><b>الموعد متاح!</b> ساعة ' + hourLabel(hourStr) + ' يوم ' + dateWord + ' — جاري تأكيد حجزك الآن …</span>');

    submitBooking({
      name: f.name,
      phone: f.phone,
      service: f.service,
      date: dateStr,
      hour: hourStr,
      notes: f.notes || '—',
      source: 'موقع عيادة أوراس'
    }, function (res) {
      busy = false;
      setSubmitBusy(false);

      if (res && res.ok) {
        // تحديث الإشغال محلياً
        var k = hourKey(dateStr, hourStr);
        state.taken[k] = (state.taken[k] || 0) + 1;
        showStatus('ok',
          '🎉 <span><b>تم تأكيد حجزك بنجاح!</b><br>📅 ' + dateWord + ' — 🕐 ' + hourLabel(hourStr) + ' (' + hourRange(hourStr) + ')<br>سنتواصل معك على الرقم ' + f.phone + ' لتأكيد التفاصيل. مراجعة الحجز عبر واتساب اختيارية:</span>'
          + '<div style="margin-top:8px"><button type="button" class="booking-alt-btn" id="waAfterBook">إرسال تفاصيل الحجز عبر واتساب</button></div>');
        var waAfter = document.getElementById('waAfterBook');
        if (waAfter) waAfter.addEventListener('click', function () { openWhatsApp(f); });
        showToastMsg('🎉 تم تأكيد حجزك بنجاح — نراك قريباً!');
        return;
      }

      if (res && res.conflict) {
        var alts = (Array.isArray(res.alternatives) && res.alternatives.length > 0)
          ? res.alternatives.map(function (a) {
              return { date: a.date, hour: a.hour, label: a.label || (a.date + ' — ' + hourLabel(a.hour)) };
            })
          : findAlternatives(dateStr, hourStr, 3);
        showStatus('err', '⚠️ <span><b>غير متاح</b> — ' + (res.reason || 'الموعد المطلوب محجوز وممتلئ') + '</span>' + renderAlts(alts));
        bindAltButtons();
        showToastMsg('⚠️ الموعد لم يعد متاحاً — اختر أحد البدائل المقترحة');
        return;
      }

      // خطأ شبكة أو استجابة غير متوقعة
      showStatus('err', '📡 <span><b>تعذر إتمام تسجيل الحجز آلياً الآن.</b><br>حاول مرة أخرى، أو أرسل طلبك فوراً عبر زر <b>«حجز عبر واتساب»</b>.</span>');
    });
  }

  function finishFlow(showFn) {
    busy = false;
    setSubmitBusy(false);
    showFn();
  }

  function setSubmitBusy(isBusy) {
    var btn = document.getElementById('bookSubmitBtn');
    if (!btn) return;
    if (isBusy) {
      btn.dataset.origText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '⏳ جاري التحقق من التوفر…';
    } else {
      btn.disabled = false;
      if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    }
  }

  // ─── التهيئة ───
  function initBooking() {
    var form = document.getElementById('bookForm');
    var dateInput = document.getElementById('fDate');
    var waBtn = document.getElementById('waBookBtn');

    if (dateInput) {
      dateInput.min = getTodayStr();
      // لا فحص مباشر عند تغيير التاريخ — التحقق يبدأ فقط بعد ضغط زر الحجز
      dateInput.addEventListener('change', function () { if (!busy) hideStatus(); });
    }

    // إخفاء أي رسالة سابقة عند تغيير الساعة (التحقق يتم عند الضغط فقط)
    var hourRadios = document.querySelectorAll('input[name="hour"]');
    for (var i = 0; i < hourRadios.length; i++) {
      hourRadios[i].addEventListener('change', function () { if (!busy) hideStatus(); });
    }

    // زر الحجز الآلي (submit) — مسار مستقل
    if (form) {
      form.addEventListener('submit', handleFormSubmit, true);
    }

    // زر واتساب — مسار منفصل تماماً
    if (waBtn) {
      waBtn.addEventListener('click', handleWhatsAppClick);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooking);
  } else {
    initBooking();
  }

  // خطاف اختباري خفيف (لا يؤثر على السلوك)
  if (typeof window !== 'undefined') {
    window.__orasBooking = {
      HOURS: HOURS,
      state: state,
      hourLabel: hourLabel,
      hourRange: hourRange,
      isHourFull: isHourFull,
      isHourPast: isHourPast,
      freeHoursForDate: freeHoursForDate,
      findAlternatives: findAlternatives
    };
  }
})();
