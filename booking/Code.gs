/**
 * نظام الحجز الآلي ومنع تعارض المواعيد — عيادة أوراس لطب الأسنان
 * Google Apps Script Web App Backend
 */

var CONFIG = {
  SHEET_NAME: 'حجوزات',
  MAX_PER_SLOT: 4,               // أقصى عدد حجوزات لكل فترة في اليوم
  PERIODS: ['صباحية', 'مسائية'],
  TIMEZONE: 'Africa/Khartoum',    // التوقيت المعتمد للعيادة
  MORNING_HOUR: 9,               // بداية الفترة الصباحية: 09:00 ص
  MORNING_DURATION_HOURS: 4,     // مدة الفترة الصباحية (9ص - 1ظ)
  EVENING_HOUR: 17,              // بداية الفترة المسائية: 05:00 م
  EVENING_DURATION_HOURS: 4,     // مدة الفترة المسائية (5م - 9م)
  CALENDAR_ID: 'primary',        // معرّف تقويم جوجل
  CLINIC_NAME: 'عيادة أوراس لطب الأسنان',
  CLINIC_LOCATION: 'شارع الستين، الخرطوم، السودان',
  NOTIFICATION_EMAIL: ''         // إيميل العيادة للإشعارات الفورية (اختياري)
};

var DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

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
      'الفترة',
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
 * الحصول على تاريخ اليوم بنسق YYYY-MM-DD
 */
function getTodayStr() {
  return formatDateStr(new Date());
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
 * قراءة خريطة الحجوزات الحالية من جدول البيانات
 * ترجع كائناً بصيغة { "YYYY-MM-DD|فترة": count }
 */
function getTakenMap(sheet) {
  sheet = sheet || getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  var taken = {};

  if (lastRow <= 1) {
    return taken;
  }

  // قراءة الأعمدة: التاريخ (عمود 5)، الفترة (عمود 6)، الحالة (عمود 9)
  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[4];
    var periodVal = String(row[5] || '').trim();
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

    if (dateStr && periodVal) {
      var key = dateStr + '|' + periodVal;
      taken[key] = (taken[key] || 0) + 1;
    }
  }

  return taken;
}

/**
 * إيجاد 3 مواعيد بديلة ذكية عند امتلاء الموعد أو مصادفة عطلة
 */
function findAlternatives(startDateStr, preferredPeriod, takenMap, count) {
  count = count || 3;
  takenMap = takenMap || {};
  var list = [];

  var startObj = parseDateString(startDateStr);
  var todayObj = parseDateString(getTodayStr());

  var cur = (startObj && startObj >= todayObj) ? new Date(startObj.getTime()) : new Date(todayObj.getTime());
  var attempts = 0;

  var candidatePeriods = (preferredPeriod === 'مسائية')
    ? ['مسائية', 'صباحية']
    : (preferredPeriod === 'صباحية' ? ['صباحية', 'مسائية'] : ['صباحية', 'مسائية']);

  while (list.length < count && attempts < 35) {
    attempts++;
    var ds = formatDateStr(cur);
    var dayIndex = cur.getDay();

    // استبعاد يوم الجمعة (5)
    if (dayIndex !== 5) {
      for (var p = 0; p < candidatePeriods.length; p++) {
        var per = candidatePeriods[p];
        var key = ds + '|' + per;
        var curCount = takenMap[key] || 0;

        if (curCount < CONFIG.MAX_PER_SLOT) {
          list.push({
            date: ds,
            period: per,
            dayName: DAY_NAMES_AR[dayIndex],
            label: DAY_NAMES_AR[dayIndex] + ' ' + ds + ' (' + per + ')'
          });
          if (list.length >= count) break;
        }
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

/**
 * إنشاء حدث في تقويم جوجل
 */
function createCalendarEvent(booking) {
  try {
    var calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID) || CalendarApp.getDefaultCalendar();
    if (!calendar) return '';

    var d = parseDateString(booking.date);
    if (!d) return '';

    var startHour = booking.period === 'مسائية' ? CONFIG.EVENING_HOUR : CONFIG.MORNING_HOUR;
    var duration = booking.period === 'مسائية' ? CONFIG.EVENING_DURATION_HOURS : CONFIG.MORNING_DURATION_HOURS;

    var startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour, 0, 0);
    var endTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour + duration, 0, 0);

    var title = '🦷 موعد: ' + booking.name + ' — ' + booking.service + ' (' + booking.period + ')';
    var desc =
      'تفاصيل الحجز من موقع العيادة:\n' +
      '────────────────────────────\n' +
      'الاسم: ' + booking.name + '\n' +
      'الهاتف: ' + booking.phone + '\n' +
      'الخدمة: ' + booking.service + '\n' +
      'التاريخ: ' + booking.date + '\n' +
      'الفترة: ' + booking.period + '\n' +
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
    var subject = '🦷 حجز جديد: ' + booking.name + ' (' + booking.date + ' - ' + booking.period + ')';
    var body =
      'وصل حجز موعد جديد عبر موقع العيادة:\n\n' +
      '• الاسم: ' + booking.name + '\n' +
      '• الهاتف: ' + booking.phone + '\n' +
      '• الخدمة: ' + booking.service + '\n' +
      '• التاريخ: ' + booking.date + '\n' +
      '• الفترة: ' + booking.period + '\n' +
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
      max: CONFIG.MAX_PER_SLOT,
      periods: CONFIG.PERIODS,
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
    var period = String(data.period || 'صباحية').trim();
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
      var altsPast = findAlternatives(todayStr, period, takenMap, 3);
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
      var altsFri = findAlternatives(date, period, takenMap, 3);
      lock.releaseLock();
      return jsonResponse({
        ok: false,
        conflict: true,
        reason: 'يوم الجمعة عطلة رسمية وراحة للعيادة.',
        alternatives: altsFri
      });
    }

    // 3. تحديد الفترة وتدقيق السعة
    var assignedPeriod = period;
    if (period === 'أي فترة تناسبكم' || period === 'أي فترة') {
      var mornCount = takenMap[date + '|صباحية'] || 0;
      var eveCount = takenMap[date + '|مسائية'] || 0;

      if (mornCount < CONFIG.MAX_PER_SLOT) {
        assignedPeriod = 'صباحية';
      } else if (eveCount < CONFIG.MAX_PER_SLOT) {
        assignedPeriod = 'مسائية';
      } else {
        var altsAny = findAlternatives(date, 'صباحية', takenMap, 3);
        lock.releaseLock();
        return jsonResponse({
          ok: false,
          conflict: true,
          reason: 'جميع فترات هذا اليوم ممتلئة بالكامل.',
          alternatives: altsAny
        });
      }
    } else {
      var slotCount = takenMap[date + '|' + period] || 0;
      if (slotCount >= CONFIG.MAX_PER_SLOT) {
        var altsSlot = findAlternatives(date, period, takenMap, 3);
        lock.releaseLock();
        return jsonResponse({
          ok: false,
          conflict: true,
          reason: 'الفترة الـ' + period + ' ممتلئة بالكامل في تاريخ ' + date + '.',
          alternatives: altsSlot
        });
      }
    }

    // 4. تسجيل الحجز في جدول البيانات
    var timestamp = new Date();
    var bookingRecord = {
      name: name,
      phone: phone,
      service: service,
      date: date,
      period: assignedPeriod,
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
      assignedPeriod,
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
      period: assignedPeriod,
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
  Logger.log('=== بدء اختبار نظام الحجز ومنع التعارض ===');

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
        period: 'صباحية',
        notes: 'فحص تجريبي',
        source: 'اختبار برمجي'
      })
    }
  });
  Logger.log('2. نتيجة حجز سليم: ' + postSuccess.getContent());

  // 3. اختبار رفض حجز يوم الجمعة
  var fridayDate = '2026-09-04'; // الجمعة
  var postFriday = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'تجربة يوم الجمعة',
        phone: '0912345678',
        service: 'تنظيف وتلميع',
        date: fridayDate,
        period: 'صباحية',
        notes: 'يجب أن يُرفض'
      })
    }
  });
  Logger.log('3. نتيجة حجز الجمعة (مرفوض مع بدائل): ' + postFriday.getContent());

  // 4. اختبار رفض تاريخ ماضٍ
  var postPast = doPost({
    postData: {
      contents: JSON.stringify({
        name: 'تجربة تاريخ ماض',
        phone: '0912345678',
        service: 'تبييض الأسنان',
        date: '2020-01-01',
        period: 'صباحية'
      })
    }
  });
  Logger.log('4. نتيجة حجز تاريخ ماض (مرفوض مع بدائل): ' + postPast.getContent());

  Logger.log('=== اكتمل الاختبار بنجاح ===');
}
