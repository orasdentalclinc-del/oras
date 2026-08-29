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

  // حالة التوفر العامة
  var state = {
    max: 4,
    closed: [],
    periods: ['صباحية', 'مسائية'],
    taken: {},
    lastFetch: 0
  };

  var dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // دوال التاريخ المساعدة
  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function getTodayStr() {
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

  function getSlotCount(dateStr, period) {
    if (!dateStr || !period) return 0;
    var key = dateStr + '|' + period;
    return (state.taken && state.taken[key]) ? parseInt(state.taken[key], 10) || 0 : 0;
  }

  function isPeriodFull(dateStr, period) {
    if (!dateStr || !period) return false;
    return getSlotCount(dateStr, period) >= state.max;
  }

  // البحث عن 3 مواعيد بديلة ذكية
  function findAlternatives(startDateStr, preferredPeriod, count) {
    count = count || 3;
    var list = [];
    var startObj = parseDateObj(startDateStr);
    var todayObj = parseDateObj(getTodayStr());

    var cur = startObj && startObj >= todayObj ? new Date(startObj.getTime()) : new Date(todayObj.getTime());
    var checkedDays = 0;

    var candidatePeriods = (preferredPeriod === 'مسائية')
      ? ['مسائية', 'صباحية']
      : (preferredPeriod === 'صباحية' ? ['صباحية', 'مسائية'] : ['صباحية', 'مسائية']);

    while (list.length < count && checkedDays < 30) {
      checkedDays++;
      var ds = cur.getFullYear() + '-' + pad2(cur.getMonth() + 1) + '-' + pad2(cur.getDate());
      var dayIndex = cur.getDay();

      if (dayIndex !== 5 && (!state.closed || state.closed.indexOf(ds) === -1)) {
        for (var p = 0; p < candidatePeriods.length; p++) {
          var per = candidatePeriods[p];
          if (!isPeriodFull(ds, per)) {
            list.push({
              date: ds,
              period: per,
              dayName: dayNames[dayIndex],
              label: dayNames[dayIndex] + ' ' + ds + ' (' + per + ')'
            });
            if (list.length >= count) break;
          }
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }

  // عرض الإشعارات للمستخدم
  function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      toast.classList.remove('show');
    }, 4500);
  }

  // تجهيز عنصر حالة الحجز أسفل الفترات
  function getOrCreateStatusBox() {
    var box = document.getElementById('bookingStatusBox');
    if (box) return box;

    var seg = document.querySelector('.seg');
    if (!seg) return null;

    box = document.createElement('div');
    box.id = 'bookingStatusBox';
    box.style.cssText = 'margin-top:12px;padding:12px 14px;border-radius:14px;font-size:0.9rem;font-weight:700;line-height:1.6;transition:all .3s ease;display:none;';
    
    // إدراج المربع أسفل اختيار الفترات
    if (seg.parentNode) {
      seg.parentNode.appendChild(box);
    }

    // إضافة نمط خفيف للخيارات المعطلة
    if (!document.getElementById('bookingDynamicStyle')) {
      var st = document.createElement('style');
      st.id = 'bookingDynamicStyle';
      st.textContent =
        '.seg label input:disabled + .seg-btn {' +
        '  opacity: 0.45 !important;' +
        '  cursor: not-allowed !important;' +
        '  background: #f1ede2 !important;' +
        '  border-color: #dcd0b8 !important;' +
        '  color: #a89a80 !important;' +
        '  text-decoration: line-through;' +
        '  box-shadow: none !important;' +
        '}' +
        '.booking-alt-btn {' +
        '  display: inline-block;' +
        '  margin: 4px 4px 0 0;' +
        '  padding: 5px 10px;' +
        '  background: #fff;' +
        '  border: 1.5px solid #C9A227;' +
        '  border-radius: 8px;' +
        '  color: #8A6D1F;' +
        '  font-size: 0.82rem;' +
        '  font-weight: 800;' +
        '  cursor: pointer;' +
        '  transition: all .2s ease;' +
        '}' +
        '.booking-alt-btn:hover {' +
        '  background: #C9A227;' +
        '  color: #fff;' +
        '}';
      document.head.appendChild(st);
    }

    return box;
  }

  // تحديث واجهة التوفر وحالة الفترات
  function updateAvailabilityUI() {
    var dateInput = document.getElementById('fDate');
    var box = getOrCreateStatusBox();
    if (!box) return;

    var morningRadio = document.querySelector('input[name="period"][value="صباحية"]');
    var eveningRadio = document.querySelector('input[name="period"][value="مسائية"]');
    var anyRadio = document.querySelector('input[name="period"][value="أي فترة تناسبكم"]');
    var checkedRadio = document.querySelector('input[name="period"]:checked');
    var selectedPeriod = checkedRadio ? checkedRadio.value : 'صباحية';

    var dateVal = dateInput ? dateInput.value : '';

    // حالة 1: لم يتم اختيار تاريخ بعد
    if (!dateVal) {
      if (morningRadio) morningRadio.disabled = false;
      if (eveningRadio) eveningRadio.disabled = false;
      if (anyRadio) anyRadio.disabled = false;
      box.style.display = 'block';
      box.style.background = 'rgba(201,162,39,0.08)';
      box.style.border = '1px solid #EFE4C4';
      box.style.color = '#6F6448';
      box.innerHTML = '💡 <span>اختر تاريخ الزيارة المفضل لمعرفة الأوقات المتاحة فوراً.</span>';
      return;
    }

    // حالة 2: تاريخ ماضٍ
    if (isPastDate(dateVal)) {
      if (morningRadio) morningRadio.disabled = true;
      if (eveningRadio) eveningRadio.disabled = true;
      if (anyRadio) anyRadio.disabled = true;
      box.style.display = 'block';
      box.style.background = '#fef2f2';
      box.style.border = '1px solid #fca5a5';
      box.style.color = '#b91c1c';
      box.innerHTML = '⚠️ <span>هذا التاريخ قد مضى. يرجى اختيار تاريخ ابتداءً من اليوم.</span>';
      return;
    }

    // حالة 3: يوم الجمعة (عطلة أسبوعية)
    if (isFriday(dateVal)) {
      if (morningRadio) morningRadio.disabled = true;
      if (eveningRadio) eveningRadio.disabled = true;
      if (anyRadio) anyRadio.disabled = true;
      box.style.display = 'block';
      box.style.background = '#fffbeb';
      box.style.border = '1px solid #fde68a';
      box.style.color = '#92400e';

      var altsFri = findAlternatives(dateVal, selectedPeriod, 3);
      var friHtml = '🏖️ <b>الجمعة عطلة وراحة للعيادة.</b><div style="margin-top:6px;font-weight:600">أقرب الأيام المتاحة:</div><div style="margin-top:4px">';
      for (var i = 0; i < altsFri.length; i++) {
        friHtml += '<button type="button" class="booking-alt-btn" data-date="' + altsFri[i].date + '" data-period="' + altsFri[i].period + '">' + altsFri[i].label + '</button>';
      }
      friHtml += '</div>';
      box.innerHTML = friHtml;
      bindAltButtons(box);
      return;
    }

    // حالة 4: يوم مغلق مخصص
    if (isClosedDate(dateVal)) {
      if (morningRadio) morningRadio.disabled = true;
      if (eveningRadio) eveningRadio.disabled = true;
      if (anyRadio) anyRadio.disabled = true;
      box.style.display = 'block';
      box.style.background = '#fffbeb';
      box.style.border = '1px solid #fde68a';
      box.style.color = '#92400e';

      var altsCls = findAlternatives(dateVal, selectedPeriod, 3);
      var clsHtml = '⛔ <b>العيادة مغلقة في هذا اليوم.</b><div style="margin-top:6px;font-weight:600">المواعيد البديلة المقترحة:</div><div style="margin-top:4px">';
      for (var c = 0; c < altsCls.length; c++) {
        clsHtml += '<button type="button" class="booking-alt-btn" data-date="' + altsCls[c].date + '" data-period="' + altsCls[c].period + '">' + altsCls[c].label + '</button>';
      }
      clsHtml += '</div>';
      box.innerHTML = clsHtml;
      bindAltButtons(box);
      return;
    }

    // فحص الفترات
    var morningFull = isPeriodFull(dateVal, 'صباحية');
    var eveningFull = isPeriodFull(dateVal, 'مسائية');

    if (morningRadio) morningRadio.disabled = morningFull;
    if (eveningRadio) eveningRadio.disabled = eveningFull;
    if (anyRadio) anyRadio.disabled = (morningFull && eveningFull);

    // إذا كانت الفترة المختارة ممتلئة، التحويل تلقائياً لفترة متاحة إن وجدت
    if (selectedPeriod === 'صباحية' && morningFull && !eveningFull && eveningRadio) {
      eveningRadio.checked = true;
      selectedPeriod = 'مسائية';
    } else if (selectedPeriod === 'مسائية' && eveningFull && !morningFull && morningRadio) {
      morningRadio.checked = true;
      selectedPeriod = 'صباحية';
    }

    // حالة 5: اليوم ممتلئ بالكامل في الفترتين
    if (morningFull && eveningFull) {
      box.style.display = 'block';
      box.style.background = '#fef2f2';
      box.style.border = '1px solid #fca5a5';
      box.style.color = '#b91c1c';

      var altsFull = findAlternatives(dateVal, selectedPeriod, 3);
      var fullHtml = '❌ <b>جميع فترات هذا اليوم ممتلئة بالكامل.</b><div style="margin-top:6px;font-weight:600">أقرب مواعيد بديلة متاحة:</div><div style="margin-top:4px">';
      for (var k = 0; k < altsFull.length; k++) {
        fullHtml += '<button type="button" class="booking-alt-btn" data-date="' + altsFull[k].date + '" data-period="' + altsFull[k].period + '">' + altsFull[k].label + '</button>';
      }
      fullHtml += '</div>';
      box.innerHTML = fullHtml;
      bindAltButtons(box);
      return;
    }

    // حالة 6: الفترة المختارة ممتلئة ولكن الفترة الأخرى متاحة
    if ((selectedPeriod === 'صباحية' && morningFull) || (selectedPeriod === 'مسائية' && eveningFull)) {
      var otherPeriod = selectedPeriod === 'صباحية' ? 'مسائية' : 'صباحية';
      box.style.display = 'block';
      box.style.background = '#fffbeb';
      box.style.border = '1px solid #fde68a';
      box.style.color = '#92400e';

      var altsP = findAlternatives(dateVal, selectedPeriod, 3);
      var pHtml = '⚠️ <b>الفترة الـ' + selectedPeriod + ' ممتلئة.</b> تتوفر الفترة الـ<b>' + otherPeriod + '</b> في نفس اليوم، أو المواعيد التالية:<div style="margin-top:4px">';
      pHtml += '<button type="button" class="booking-alt-btn" data-date="' + dateVal + '" data-period="' + otherPeriod + '">نفس اليوم (' + otherPeriod + ')</button>';
      for (var j = 0; j < altsP.length; j++) {
        pHtml += '<button type="button" class="booking-alt-btn" data-date="' + altsP[j].date + '" data-period="' + altsP[j].period + '">' + altsP[j].label + '</button>';
      }
      pHtml += '</div>';
      box.innerHTML = pHtml;
      bindAltButtons(box);
      return;
    }

    // حالة 7: متاح
    var morningCount = getSlotCount(dateVal, 'صباحية');
    var eveningCount = getSlotCount(dateVal, 'مسائية');
    var maxVal = state.max || 4;

    box.style.display = 'block';
    box.style.background = '#f0fdf4';
    box.style.border = '1px solid #bbf7d0';
    box.style.color = '#166534';
    box.innerHTML = '✅ <span>الموعد متاح للحجز! (الصباحية: ' + (maxVal - morningCount) + ' شاغر | المسائية: ' + (maxVal - eveningCount) + ' شاغر)</span>';
  }

  // تفعيل النقر على المواعيد البديلة
  function bindAltButtons(container) {
    if (!container) return;
    var btns = container.querySelectorAll('.booking-alt-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var d = this.getAttribute('data-date');
        var p = this.getAttribute('data-period');
        var dateInput = document.getElementById('fDate');
        if (dateInput && d) {
          dateInput.value = d;
        }
        if (p) {
          var r = document.querySelector('input[name="period"][value="' + p + '"]');
          if (r) r.checked = true;
        }
        updateAvailabilityUI();
      });
    }
  }

  // جلب التوفر من الرابط
  function fetchAvailability(callback) {
    var sep = ENDPOINT.indexOf('?') === -1 ? '?' : '&';
    var url = ENDPOINT + sep + 'action=availability&_t=' + new Date().getTime();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 12000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 400) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.ok) {
              if (typeof data.max === 'number') state.max = data.max;
              if (Array.isArray(data.closed)) state.closed = data.closed;
              if (Array.isArray(data.periods)) state.periods = data.periods;
              if (data.taken && typeof data.taken === 'object') state.taken = data.taken;
              state.lastFetch = new Date().getTime();
            }
          } catch (e) {}
        }
        updateAvailabilityUI();
        if (typeof callback === 'function') callback();
      }
    };
    xhr.onerror = function () {
      updateAvailabilityUI();
      if (typeof callback === 'function') callback();
    };
    xhr.ontimeout = function () {
      updateAvailabilityUI();
      if (typeof callback === 'function') callback();
    };
    xhr.send();
  }

  // فتح واتساب بالرسالة المنسقة
  function openWhatsApp(payload, successNote) {
    var brandEl = document.querySelector('.brandShort');
    var clinic = (brandEl && brandEl.textContent) ? brandEl.textContent.trim() : 'أوراس';
    var msg =
      '🦷 طلب حجز موعد — ' + clinic + ' لطب الأسنان\n' +
      '────────────────\n' +
      '👤 الاسم: ' + (payload.name || '') + '\n' +
      '📞 الهاتف: ' + (payload.phone || '') + '\n' +
      '🩺 الخدمة: ' + (payload.service || 'فحص وتشخيص عام') + '\n' +
      '📅 التاريخ المفضل: ' + (payload.date || 'أي يوم مناسب') + '\n' +
      '🕐 الفترة: ' + (payload.period || 'أي فترة تناسبكم') + '\n' +
      '📝 ملاحظات: ' + (payload.notes || '—') + '\n' +
      '────────────────\n' +
      'أُرسل من موقع العيادة';

    var waNum = window.__WA__ || '249912345678';
    var url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);
    var win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
    showToast(successNote || '✅ تم تجهيز حجزك — أكمل الإرسال من واتساب');
  }

  // معالجة إرسال النموذج باعتراض مرحلة الالتقاط
  function handleFormSubmit(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    var form = document.getElementById('bookForm');
    if (!form) return;

    var nameInput = document.getElementById('fName');
    var phoneInput = document.getElementById('fPhone');
    var serviceInput = document.getElementById('fService');
    var dateInput = document.getElementById('fDate');
    var notesInput = document.getElementById('fNotes');
    var periodRadio = document.querySelector('input[name="period"]:checked');

    var name = nameInput ? nameInput.value.trim() : '';
    var phone = phoneInput ? phoneInput.value.trim() : '';
    var service = serviceInput ? serviceInput.value : 'فحص وتشخيص عام';
    var date = dateInput ? dateInput.value : '';
    var period = periodRadio ? periodRadio.value : 'صباحية';
    var notes = notesInput ? notesInput.value.trim() : '';

    if (!name || !phone) {
      showToast('من فضلك أدخل الاسم ورقم الهاتف');
      if (!name && nameInput) nameInput.focus();
      else if (!phone && phoneInput) phoneInput.focus();
      return;
    }

    // التحقق من صلاحية التاريخ
    if (date && isPastDate(date)) {
      showToast('⚠️ لا يمكن الحجز في تاريخ ماضٍ، يرجى اختيار تاريخ قادم');
      if (dateInput) dateInput.focus();
      return;
    }

    if (date && isFriday(date)) {
      showToast('⚠️ يوم الجمعة عطلة رسمية للعيادة، يرجى اختيار يوم آخر');
      updateAvailabilityUI();
      return;
    }

    if (date && isPeriodFull(date, period) && period !== 'أي فترة تناسبكم') {
      showToast('⚠️ الفترة المحددة ممتلئة، يرجى اختيار فترة أو يوم آخر');
      updateAvailabilityUI();
      return;
    }

    var payload = {
      name: name,
      phone: phone,
      service: service,
      date: date || '',
      period: period,
      notes: notes || '—',
      source: 'موقع عيادة أوراس'
    };

    var submitBtn = form.querySelector('button[type="submit"]');
    var originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ جاري تأكيد الحجز ومنع التعارض...';
    }

    // إرسال الحجز للسيرفر
    var xhr = new XMLHttpRequest();
    xhr.open('POST', ENDPOINT, true);
    xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
    xhr.timeout = 15000;

    function restoreButton() {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        restoreButton();

        if (xhr.status >= 200 && xhr.status < 400) {
          try {
            var res = JSON.parse(xhr.responseText);

            if (res && res.ok) {
              // نجاح الحجز
              if (date && res.period) {
                var k = date + '|' + res.period;
                state.taken[k] = (state.taken[k] || 0) + 1;
              }
              updateAvailabilityUI();
              openWhatsApp(payload, '✅ تم تأكيد حجزك بنجاح! جاري تحويلك لواتساب للتواصل المباشر');
              return;
            }

            if (res && res.conflict) {
              // تعارض في الموعد
              var box = getOrCreateStatusBox();
              if (box) {
                box.style.display = 'block';
                box.style.background = '#fef2f2';
                box.style.border = '1px solid #fca5a5';
                box.style.color = '#b91c1c';

                var altList = Array.isArray(res.alternatives) && res.alternatives.length > 0
                  ? res.alternatives
                  : findAlternatives(date || getTodayStr(), period, 3);

                var msgHtml = '⚠️ <b>' + (res.reason || 'الموعد المطلوب محجوز وممتلئ') + '</b><div style="margin-top:6px;font-weight:600">اختر أحد المواعيد البديلة المتاحة:</div><div style="margin-top:4px">';
                for (var a = 0; a < altList.length; a++) {
                  var item = altList[a];
                  var label = item.label || (item.date + ' (' + item.period + ')');
                  msgHtml += '<button type="button" class="booking-alt-btn" data-date="' + item.date + '" data-period="' + item.period + '">' + label + '</button>';
                }
                msgHtml += '</div>';
                box.innerHTML = msgHtml;
                bindAltButtons(box);
              }
              showToast('⚠️ الموعد ممتلئ! اختر موعداً من البدائل المقترحة');
              fetchAvailability();
              return;
            }
          } catch (err) {}
        }

        // فشل الشبكة أو استجابة غير متوقعة: التحويل لواتساب لضمان عدم ضياع الحجز
        openWhatsApp(payload, '⚠️ تم تجهيز حجزك — يتم تحويلك إلى واتساب لإتمام الحجز');
      }
    };

    xhr.onerror = function () {
      restoreButton();
      // عند فشل الشبكة: تحويل لواتساب حتى لا يضيع الحجز
      openWhatsApp(payload, '⚠️ تعذر الاتصال بالخادم — يتم فتح واتساب لإتمام الحجز');
    };

    xhr.ontimeout = function () {
      restoreButton();
      openWhatsApp(payload, '⚠️ استغرق الاتصال وقتاً أطول — يتم فتح واتساب لإتمام الحجز');
    };

    try {
      xhr.send(JSON.stringify(payload));
    } catch (e) {
      restoreButton();
      openWhatsApp(payload, '⚠️ يتم فتح واتساب لإتمام حجزك مباشرة');
    }
  }

  // التهيئة عند تحميل الصفحة
  function initBooking() {
    var form = document.getElementById('bookForm');
    var dateInput = document.getElementById('fDate');

    if (dateInput) {
      dateInput.min = getTodayStr();
      dateInput.addEventListener('change', updateAvailabilityUI);
      dateInput.addEventListener('input', updateAvailabilityUI);
    }

    var radios = document.querySelectorAll('input[name="period"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', updateAvailabilityUI);
    }

    if (form) {
      // اعتراض مرحلة الالتقاط (Capture Phase) بأولوية قصوى لمنع التكرار
      form.addEventListener('submit', handleFormSubmit, true);
    }

    // جلب التوفر الأولي وتحديث الواجهة
    fetchAvailability();

    // تحديث التوفر دورياً كل 3 دقائق
    setInterval(function () {
      fetchAvailability();
    }, 3 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooking);
  } else {
    initBooking();
  }
})();
