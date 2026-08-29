/**
 * نظام الحجز الآلي بالساعة ومنع تعارض المواعيد — عيادة أوراس لطب الأسنان
 * Google Apps Script Web App Backend
 *
 * الحجز بالساعة: 12 ساعة متواصلة من 8:00 صباحاً حتى 8:00 مساءً
 * (ساعات الحجز: 08:00 ، 09:00 ، ... ، 19:00 — كل ساعة فترة مستقلة بسعتها الخاصة)
 */

var CONFIG = {
  SHEET_NAME: 'حجوزات',
  MAX_PER_HOUR: 4,               // أقصى عدد حجوزات لكل ساعة
  OPEN_HOUR: 8,                  // بداية الدوام: 8:00 صباحاً
  CLOSE_HOUR: 20,                // نهاية الدوام: 8:00 مساءً (آخر ساعة حجز 19:00 - 20:00)
  TIMEZONE: 'Africa/Khartoum',   // التوقيت المعتمد للعيادة
  CALENDAR_ID: 'primary',        // معرّف تقويم جوجل
  CLINIC_NAME: 'عيادة أوراس لطب الأسنان',
  CLINIC_LOCATION: 'شارع الستين، الخرطوم، السودان',
  NOTIFICATION_EMAIL: ''         // إيميل العيادة للإشعارات الفورية (اختياري)
};

var DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * قائمة ساعات الحجز: من ساعة الفتح حتى ساعة الإغلاق
 * مثال: 08:00 ، 09:00 ، ... ، 19:00  (12 ساعة متواصلة)
 */
function getBookingHours() {
  var hours = [];
  for (var h = CONFIG.OPEN_HOUR; h < CONFIG.CLOSE_HOUR; h++) {
    hours.push(hourValue(h));
  }
  return hours;
}

function hourValue(h) {
  return (h < 10 ? '0' : '') + h + ':00';
}

/**
 * "14:00" → "2:00 مساءً"
 */
function hourLabel(hourVal) {
  var hh = parseInt(hourVal, 10);
  if (isNaN(hh)) return String(hourVal);
  if (hh < 12) return hh + ':00 صباحاً';
  if (hh === 12) return '12:00 ظهراً';
  return (hh - 12) + ':00 مساءً';
}

/**
 * "14:00" → "14:00 - 15:00"
 */
function hourRange(hourVal) {
  var hh = parseInt(hourVal, 10);
  if (isNaN(hh) || hh < 0 || hh > 23) return String(hourVal);
  return hourVal + ' - ' + hourValue(hh + 1);
}

/**
 * هل النص ساعة صالحة ضمن دوام العيادة؟
 */
function isValidHour(hourVal) {
  if (!hourVal || typeof hourVal !== 'string') return false;
  var m = hourVal.match(/^(\d{1,2}):00$/);
  if (!m) return false;
  var h = parseInt(m[1], 10);
  return h >= CONFIG.OPEN_HOUR && h < CONFIG.CLOSE_HOUR;
}

/**
 * الحصول على ورقة الحجوزات وتهيئتها بالترويسات إن كانت جديدة
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
  }

  // إذا كانت الورقة فارغة، ننشئ الترويسات
  if (sheet.getLastRow() === 0) {
    var headers = [
      'الطابع الزمني',
      'الاسم الكامل',
      'رقم الهاتف',
      'الخدمة المطلوبة',
      'تاريخ الحجز',
      'الساعة',
      'ملاحظات',
      'المصدر',
      'الحالة',
      'معرّف حدث التقويم'
    ];
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#C9A227');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * تنسيق التاريخ كـ YYYY-MM-DD حسب المنطقة الزمنية للعيادة
 */
function formatDateStr(dateObj) {
  return Utilities.formatDate(dateObj, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

/**
 * الحصول على تاريخ اليوم بنسق YYYY-MM-DD (حسب توقيت العيادة)
 */
function getTodayStr() {
  return formatDateStr(new Date());
}

/**
 * ساعة الآن (0-23) حسب توقيت العيادة
 */
function getCurrentHour() {
  return parseInt(Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'HH'), 10);
}

/**
 * تحويل نص YYYY-MM-DD إلى كائن Date
 */
function parseDateString(str) {
  if (!str) return null;
  var parts = String(str).trim().split('-');
  if (parts.length !== 3) return null;
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1;
  var d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

/**
 * معرفة يوم الأسبوع (0 للأحد، 5 للجمعة)
 */
function getDayOfWeek(dateStr) {
  var d = parseDateString(dateStr);
  return d ? d.getDay() : -1;
}

/**
 * فحص ما إذا كان التاريخ يوم جمعة
 */
function isFriday(dateStr) {
  return getDayOfWeek(dateStr) === 5;
}

/**
 * هل الساعة بدأت أو انتهت اليوم؟
 */
function isHourPast(dateStr, hourVal) {
  if (dateStr !== getTodayStr()) return false;
  return parseInt(hourVal, 10) <= getCurrentHour();
}

/**
 * قراءة خريطة الحجوزات الحالية من جدول البيانات
 * ترجع كائناً بصيغة { "YYYY-MM-DD|HH:00": count }
 * ملاحظة: الحجوزات القديمة (صباحية/مسائية) لا تتقاطع مع مفاتيح الساعات
 */
function getTakenMap(sheet) {
  sheet = sheet || getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  var taken = {};

  if (lastRow <= 1) {
    return taken;
  }

  // قراءة الأعمدة: التاريخ (عمود 5)، الساعة (عمود 6)، الحالة (عمود 9)
  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[4];
    var hourVal = String(row[5] || '').trim();
    var statusVal = String(row[8] || '').trim();

    // تجاهل المواعيد الملغاة
    if (statusVal === 'ملغي' || statusVal === 'cancelled') {
      continue;
    }

    var dateStr = '';
    if (dateVal instanceof Date) {
      dateStr = formatDateStr(dateVal);
    } else if (typeof dateVal === 'string') {
      dateStr = dateVal.trim();
    }

    if (dateStr && hourVal) {
      // القيمة المخزنة "14:00 - 15:00" → المفتاح على بداية الساعة "14:00"
      var startHour = hourVal.split(' - ')[0].trim();
      var key = dateStr + '|' + startHour;
      taken[key] = (taken[key] || 0) + 1;
    }
  }

  return taken;
}

/**
 * عدد الحجوزات في ساعة معينة
 */
function getHourCount(takenMap, dateStr, hourVal) {
  var key = dateStr + '|' + hourVal;
  return takenMap[key] ? parseInt(takenMap[key], 10) || 0 : 0;
}

/**
 * الساعات الشاغرة في يوم معيّن (مع استبعاد ساعات اليوم المنقضية)
 */
function freeHoursForDate(takenMap, dateStr) {
  var free = [];
  var hours = getBookingHours();
  for (var i = 0; i < hours.length; i++) {
    var hr = hours[i];
    if (getHourCount(takenMap, dateStr, hr) < CONFIG.MAX_PER_HOUR && !isHourPast(dateStr, hr)) {
      free.push(hr);
    }
  }
  return free;
}

/**
 * إيجاد مواعيد بديلة ذكية عند امتلاء الساعة أو مصادفة عطلة:
 * ساعات لاحقة في نفس اليوم أولاً، ثم أقرب الأيام التالية
 */
function findAlternatives(startDateStr, preferredHour, takenMap, count) {
  count = count || 3;
  takenMap = takenMap || {};
  var list = [];

  var todayObj = parseDateString(getTodayStr());
  var cur = parseDateString(startDateStr);
  if (!cur || (todayObj && cur < todayObj)) {
    cur = new Date(todayObj.getTime());
  }

  // 1) ساعات شاغرة لاحقة في نفس اليوم
  var sameDay = freeHoursForDate(takenMap, formatDateStr(cur));
  for (var s = 0; s < sameDay.length && list.length < count; s++) {
    if (!preferredHour || sameDay[s] > preferredHour) {
      list.push(makeAlt(formatDateStr(cur), sameDay[s]));
    }
  }

  // 2) أقرب الأيام التالية (تجاوز الجمعة)
  var attempts = 0;
  while (list.length < count && attempts < 35) {
    attempts++;
    cur.setDate(cur.getDate() + 1);
    var ds = formatDateStr(cur);
    var dayIndex = cur.getDay();

    if (dayIndex === 5) continue; // الجمعة عطلة

    var dayFree = freeHoursForDate(takenMap, ds);
    for (var j = 0; j < dayFree.length && list.length < count; j++) {
      list.push(makeAlt(ds, dayFree[j]));
    }
  }
  return list;
}

function makeAlt(dateStr, hourVal) {
  var d = parseDateString(dateStr);
  var dayName = d ? DAY_NAMES_AR[d.getDay()] : '';
  return {
    date: dateStr,
    hour: hourVal,
    label: dayName + ' ' + dateStr + ' — ' + hourLabel(hourVal)
  };
}

/**
 * إنشاء حدث في تقويم جوجل (مدة الموعد: ساعة واحدة)
 */
function createCalendarEvent(booking) {
  try {
    var calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    if (!calendar) return '';

    var d = parseDateString(booking.date);
    if (!d) return '';

    var startHour = parseInt(booking.hour, 10);
    if (isNaN(startHour)) return '';

    var startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, 0, 0);
    var endTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour + 1, 0, 0);

    var title = '🦷 موعد: ' + booking.name + ' — ' + booking.service + ' (' + hourLabel(booking.hour) + ')';
    var desc =
      'تفاصيل الحجز من موقع العيادة:\n' +
      '────────────────────────────\n' +
      'الاسم: ' + booking.name + '\n' +
      'الهاتف: ' + booking.phone + '\n' +
      'الخدمة: ' + booking.service + '\n' +
      'التاريخ: ' + booking.date + '\n' +
      'الساعة: ' + hourRange(booking.hour) + ' (' + hourLabel(booking.hour) + ')\n' +
      'ملاحظات: ' + (booking.notes || '—') + '\n' +
      'المصدر: ' + (booking.source || 'الموقع الإلكتروني');

    var event = calendar.createEvent(title, startTime, endTime, {
      description: desc,
      location: CONFIG.CLINIC_LOCATION
    });

    return event ? event.getId() : '';
  } catch (e) {
    Logger.log('تحذير: تعذر إنشاء حدث التقويم: ' + e.toString());
    return '';
  }
}

/**
 * إرسال إشعار بالبريد الإلكتروني للعيادة (اختياري)
 */
function sendNotificationEmail(booking) {
  if (!CONFIG.NOTIFICATION_EMAIL) return;
  try {
    var subject = '🦷 حجز جديد: ' + booking.name + ' (' + booking.date + ' - ' + hourLabel(booking.hour) + ')';
    var body =
      'وصل حجز موعد جديد عبر موقع العيادة:\n\n' +
      '• الاسم: ' + booking.name + '\n' +
      '• الهاتف: ' + booking.phone + '\n' +
      '• الخدمة: ' + booking.service + '\n' +
      '• التاريخ: ' + booking.date + '\n' +
      '• الساعة: ' + hourRange(booking.hour) + ' (' + hourLabel(booking.hour) + ')\n' +
      '• ملاحظات: ' + booking.notes + '\n\n' +
      'تم تسجيل الموعد بنجاح في جدول الحجوزات وتقويم العيادة.';
    MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
  } catch (e) {
    Logger.log('تحذير: تعذر إرسال الإيميل: ' + e.toString());
  }
}

/**
 * إرجاع استجابة JSON
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * معالجة طلبات GET — جلب حالة التوفر الحالية
 */
function doGet(e) {
  try {
    var sheet = getOrCreateSheet();
    var takenMap = getTakenMap(sheet);

    var response = {
      ok: true,
      mode: 'hourly',
      max: CONFIG.MAX_PER_HOUR,
      openHour: hourValue(CONFIG.OPEN_HOUR),
      closeHour: hourValue(CONFIG.CLOSE_HOUR),
      hours: getBookingHours(),
      today: getTodayStr(),
      nowHour: getCurrentHour(),
      closed: [], // يمكن تخصيص تواريخ إضافية هنا
      taken: takenMap,
      timestamp: new Date().getTime()
    };

    return jsonResponse(response);
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err.toString()
    });
  }
}

/**
 * معالجة طلبات POST — تسجيل الحجز ومنع التعارض باستخدام LockService
 */
function doPost(e) {
  var lock = LockService.getScriptLock();

  // محاولة الحصول على القفل لمدة تصل إلى 30 ثانية لمنع تعارض الحجوزات المتزامنة
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({
      ok: false,
      conflict: true,
      reason: 'الخادم مشغول حالياً بمعالجة حجز آخر، يرجى المحاولة بعد لحظات.'
    });
  }

  try {
    var raw = '';
    if (e && e.postData && e.postData.contents) {
      raw = e.postData.contents;
    }

    var data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (ex) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var name = String(data.name || '').trim();
    var phone = String(data.phone || '').trim();
    var service = String(data.service || 'فحص وتشخيص عام').trim();
    var date = String(data.date || '').trim();
    var hour = String(data.hour || data.period || '').trim();
    var notes = String(data.notes || '').trim();
    var source = String(data.source || 'موقع عيادة أوراس').trim();

    if (!name || !phone) {
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        error: 'الاسم الكامل ورقم الهاتف حقول مطلوبة.'
      });
    }

    var todayStr = getTodayStr();

    // إذا لم يحدد المستخدم تاريخاً، نعتمد تاريخ اليوم إن لم يكن جمعة
    if (!date) {
      date = isFriday(todayStr) ? formatDateStr(new Date(new Date().getTime() + 86400000)) : todayStr;
    }

    var sheet = getOrCreateSheet();
    var takenMap = getTakenMap(sheet);

    // 1. التحقق من التواريخ السابقة
    if (date < todayStr) {
      var altsPast = findAlternatives(todayStr, hour, takenMap, 3);
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        conflict: true,
        reason: 'تاريخ الحجز المختار قد مضى، يرجى اختيار تاريخ قادم.',
        alternatives: altsPast
      });
    }

    // 2. التحقق من يوم الجمعة (عطلة رسمية)
    if (isFriday(date)) {
      var altsFri = findAlternatives(date, hour, takenMap, 3);
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        conflict: true,
        reason: 'يوم الجمعة عطلة رسمية وراحة للعيادة.',
        alternatives: altsFri
      });
    }

    // 3. تدقيق الساعة
    var assignedHour = hour;
    if (!isValidHour(assignedHour)) {
      // إن لم تُحدَّد ساعة صالحة نختار أول ساعة متاحة في ذلك اليوم
      var freeOfDay = freeHoursForDate(takenMap, date);
      if (freeOfDay.length === 0) {
        var altsNoHour = findAlternatives(date, '', takenMap, 3);
        lock.releaseLock();
        return jsonResponse({
          ok: false,
          conflict: true,
          reason: 'جميع ساعات هذا اليوم ممتلئة أو منتهية.',
          alternatives: altsNoHour
        });
      }
      assignedHour = freeOfDay[0];
    }

    // 4. ساعة اليوم بدأت بالفعل
    if (isHourPast(date, assignedHour)) {
      var altsPastHour = findAlternatives(date, assignedHour, takenMap, 3);
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        conflict: true,
        reason: 'ساعة ' + hourLabel(assignedHour) + ' بدأت أو انتهت بالفعل اليوم، اختر ساعة قادمة.',
        alternatives: altsPastHour
      });
    }

    // 5. التحقق من سعة الساعة الواحدة
    var hourCount = getHourCount(takenMap, date, assignedHour);
    if (hourCount >= CONFIG.MAX_PER_HOUR) {
      var altsFull = findAlternatives(date, assignedHour, takenMap, 3);
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        conflict: true,
        reason: 'ساعة ' + hourLabel(assignedHour) + ' يوم ' + date + ' ممتلئة بالكامل.',
        alternatives: altsFull
      });
    }

    // 6. تسجيل الحجز في جدول البيانات
    var timestamp = new Date();
    var bookingRecord = {
      name: name,
      phone: phone,
      service: service,
      date: date,
      hour: assignedHour,
      notes: notes,
      source: source
    };

    // إضافة الحدث في تقويم جوجل
    var calEventId = createCalendarEvent(bookingRecord);

    var newRow = [
      timestamp,
      name,
      phone,
      service,
      date,
      hourRange(assignedHour),
      notes,
      source,
      'مؤكد',
      calEventId
    ];
    sheet.appendRow(newRow);
    var rowId = sheet.getLastRow();

    // إرسال إيميل إشعار إن كان مفعلاً
    sendNotificationEmail(bookingRecord);

    // تحرير القفل
    lock.releaseLock();

    return jsonResponse({
      ok: true,
      id: rowId,
      message: 'تم تسجيل الحجز بنجاح',
      name: name,
      date: date,
      hour: assignedHour,
      hourLabel: hourLabel(assignedHour),
      hourRange: hourRange(assignedHour),
      service: service
    });

  } catch (error) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
    return jsonResponse({
      ok: false,
      error: 'حدث خطأ أثناء معالجة الحجز: ' + error.toString()
    });
  }
}

/**
 * دالة تجريبية لاختبار المنطق البرمجي داخل Apps Script
 */
function testBooking() {
  Logger.log('=== بدء اختبار نظام الحجز بالساعة ومنع التعارض ===');

  // 1. اختبار جلب التوفر
  var availRes = doGet({ parameter: { action: 'availability' } });
  Logger.log('1. اختبار التوفر (doGet): ' + availRes.getContent());

  // 2. محاكاة حجز سليم في يوم قادم غير الجمعة
  var testDate = '2026-09-01'; // الثلاثاء
  var postSuccess = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'تجربة حجز تلقائي',
        phone: '0912345678',
        service: 'فحص وتشخيص عام',
        date: testDate,
        hour: '10:00'
      })
    }
  });
  Logger.log('2. اختبار حجز ساعة 10:00 صباحاً: ' + postSuccess.getContent());

  // 3. اختبار رفض حجز يوم الجمعة
  var fridayDate = '2026-09-04'; // الجمعة
  var postFriday = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'تجربة جمعة',
        phone: '0912345678',
        date: fridayDate,
        hour: '10:00'
      })
    }
  });
  Logger.log('3. اختبار رفض الجمعة: ' + postFriday.getContent());

  // 4. اختبار رفض تاريخ ماضٍ
  var postPast = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'تجربة تاريخ ماضٍ',
        phone: '0912345678',
        date: '2025-01-01',
        hour: '10:00'
      })
    }
  });
  Logger.log('4. اختبار رفض تاريخ ماضٍ: ' + postPast.getContent());

  Logger.log('=== انتهى الاختبار — راجع ورقة الحجوزات ثم احذف صفوف التجربة ===');
}
