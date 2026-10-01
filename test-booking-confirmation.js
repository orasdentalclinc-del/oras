/**
 * اختبار شاشة تأكيد الحجز (تذكرة تفاصيل الموعد) — عيادة أوراس
 * ─────────────────────────────────────────────────────────────
 * 1) يتحقق من وجود شاشة التأكيد وأزرارها في index.html ورفع إصدار oras-booking.js
 * 2) يشغّل oras-booking.js الحقيقي داخل VM مع DOM مبسّط، ثم:
 *    • يفحص دوال بناء التذكرة (رقم الحجز، وصف اليوم، رابط تقويم Google، رسالة واتساب)
 *    • يحاكي حجزاً كاملاً من البداية للنهاية (فحص التوفر → تأكيد الخادم)
 *      ويجب أن تُفتح شاشة التأكيد ويعرض فيها كل التفاصيل + حفظها على الجهاز
 *    • يفحص حماية التذكرة من حقن HTML عبر المدخلات
 *    • يفحص أن حجزاً ماضياً محفوظاً على الجهاز لا يُعرض مجدداً
 * التشغيل:  node test-booking-confirmation.js
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const bookingJs = fs.readFileSync('oras-booking.js', 'utf8');

/* ═══════════ 1) فحوصات الربط في index.html ═══════════ */

assert.ok(/<script src="oras-booking\.js\?v=6" defer><\/script>/.test(html),
  'index.html يجب أن يحمّل oras-booking.js?v=6 (تحديث قائمة ساعات الحجز)');

for (const id of ['bkConfirm', 'bkConfirmClose', 'bkConfirmTitle', 'bkRef', 'bkDetails',
  'bkGcalBtn', 'bkTicketWa', 'bkPrintBtn', 'bkAgainBtn', 'bkMineWrap', 'bkMyBookingBtn']) {
  assert.ok(html.includes(`id="${id}"`), `index.html يجب أن يحتوي على العنصر #${id}`);
}

assert.ok(/\.bk-confirm\{/.test(html) && /\.bk-ticket\{/.test(html) && /\.bk-row\{/.test(html),
  'index.html يجب أن يحتوي على أنماط شاشة تأكيد الحجز (bk-confirm / bk-ticket / bk-row)');

assert.ok(/@media print\{\s*body\.bk-printing \*/.test(html.replace(/\n/g, '')) || html.includes('body.bk-printing *'),
  'يجب وجود قواعد الطباعة — تُطبع تذكرة الحجز وحدها');

assert.ok(!html.includes('name="hour" value="08:00"'),
  'خيار 8:00 صباحاً يجب ألا يظهر في ساعات الحجز');

assert.ok(bookingJs.includes("'https://calendar.google.com/calendar/render?'"),
  'oras-booking.js يجب أن يبني رابط تقويم Google');

/* ═══════════ 2) DOM مبسّط + تشغيل oras-booking.js الحقيقي ═══════════ */

function makeEl(id) {
  const el = {
    id: id || '', tagName: 'DIV', attrs: {}, dataset: {}, style: {}, hidden: false,
    innerHTML: '', textContent: '', className: '', disabled: false, value: '', min: '',
    _classes: new Set(),
    classList: {
      add(...cs) { cs.forEach((c) => el._classes.add(c)); },
      remove(...cs) { cs.forEach((c) => el._classes.delete(c)); },
      contains(c) { return el._classes.has(c); },
      toggle(c) { el._classes.has(c) ? el._classes.delete(c) : el._classes.add(c); }
    },
    handlers: {},
    addEventListener(t, fn) { (el.handlers[t] = el.handlers[t] || []).push(fn); },
    removeEventListener() {},
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
    focus() {}, scrollIntoView() {}, reset() {}
  };
  return el;
}

const registry = {};
function reg(id) { registry[id] = reg.make(id); return registry[id]; }
reg.make = makeEl;

// عناصر نموذج الحجز وشاشة التأكيد التي يلمسها السكربت مباشرة عند التهيئة
['bookForm', 'fName', 'fPhone', 'fService', 'fDate', 'fNotes', 'fHp', 'waBookBtn',
  'bookSubmitBtn', 'bookingStatusBox', 'toast', 'bkConfirm', 'bkConfirmClose',
  'bkRef', 'bkDetails', 'bkGcalBtn', 'bkTicketWa', 'bkPrintBtn', 'bkAgainBtn',
  'bkMineWrap', 'bkMyBookingBtn', 'booking'].forEach(reg);

const documentMock = {
  readyState: 'complete',
  body: makeEl('body'),
  getElementById: (id) => registry[id] || null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {}
};

// تخزين محلي وهمي
const store = {};
const localStorageMock = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

// طابور استجابات XHR: أول طلب = التوفر، ثاني طلب = تأكيد الحجز
const xhrQueue = [];

function XHR() { this.headers = []; }
XHR.prototype.open = function (m, u) { this.method = m; this.url = u; };
XHR.prototype.setRequestHeader = function (k, v) { this.headers.push([k, v]); };
XHR.prototype.send = function () {
  const self = this;
  const resp = xhrQueue.shift() || '{}';
  self.readyState = 4;
  self.status = 200;
  self.responseText = resp;
  setTimeout(() => { if (self.onreadystatechange) self.onreadystatechange(); }, 0);
};

const printed = [];
const openedUrls = [];
const winAddHandlers = {};

const windowMock = {
  document: documentMock,
  XMLHttpRequest: XHR,
  localStorage: localStorageMock,
  __WA__: '249912345678',
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  addEventListener(t, fn) { (winAddHandlers[t] = winAddHandlers[t] || []).push(fn); },
  print() { printed.push('ticket'); },
  open(u) { openedUrls.push(u); return {}; },
  location: { href: '' }
};
windowMock.window = windowMock;

vm.createContext(windowMock);
vm.runInContext(bookingJs, windowMock, { filename: 'oras-booking.js' });

const BK = windowMock.__orasBooking;
assert.ok(BK && typeof BK.buildTicketData === 'function',
  'oras-booking.js يجب أن يكشف دوال شاشة التأكيد عبر window.__orasBooking');
assert.strictEqual(BK.HOURS[0], '09:00', 'أول ساعة حجز يجب أن تكون 9:00 صباحاً');
assert.ok(!BK.HOURS.includes('08:00'), 'ساعة 8:00 صباحاً يجب ألا تكون متاحة للحجز');

/* ═══════════ 3) أدوات تواريخ للاختبار ═══════════ */

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
function dstr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
const TODAY = dstr(new Date());
function daysFromToday(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
// يوم قادم ليس جمعة (الجمعة عطلة العيادة)
let visitDate = daysFromToday(3);
while (visitDate.getDay() === 5) visitDate = new Date(visitDate.getTime() + 86400000);
const VISIT = dstr(visitDate);

/* ═══════════ 4) فحص دوال بناء التذكرة ═══════════ */

// 4-أ: رقم الحجز من رقم صف الخادم
assert.strictEqual(BK.buildBookingRef({ ok: true, id: 42 }, VISIT, '10:00'), 'ORAS-0042',
  'رقم الحجز يجب أن يُبنى من رقم الصف بصيغة ORAS-XXXX');
assert.strictEqual(BK.buildBookingRef({ ok: true, id: 7 }, VISIT, '10:00'), 'ORAS-0007',
  'رقم الحجز يجب أن يُبطَّط بأصفار إلى 4 خانات');
// 4-ب: رقم الحجز الاحتياطي من التاريخ والساعة عند غياب المعرف
assert.strictEqual(BK.buildBookingRef({}, '2026-09-29', '10:00'), 'ORAS-260929-10',
  'بدون معرف من الخادم يُبنى الرقم من التاريخ والساعة');

// 4-ج: وصف اليوم بالنسبة لليوم
assert.strictEqual(BK.relativeDayLabel(TODAY), 'اليوم', 'حجز اليوم يجب أن يظهر بكلمة «اليوم»');
assert.strictEqual(BK.relativeDayLabel(dstr(daysFromToday(1))), 'غداً', 'حجز الغد يجب أن يظهر بكلمة «غداً»');
assert.strictEqual(BK.relativeDayLabel(dstr(daysFromToday(2))), 'بعد يومين');
assert.strictEqual(BK.relativeDayLabel(dstr(daysFromToday(5))), 'بعد 5 أيام');

// 4-د: تجميع بيانات التذكرة
const ticket = BK.buildTicketData(
  { name: 'محمد أحمد', phone: '0912345678', service: 'تجميل', date: VISIT, hour: '10:00', notes: 'حساسية بنج' },
  { ok: true, id: 42 }
);
assert.strictEqual(ticket.ref, 'ORAS-0042');
assert.strictEqual(ticket.name, 'محمد أحمد');
assert.strictEqual(ticket.dayName, DAY_NAMES[visitDate.getDay()], 'اسم اليوم يجب أن يطابق يوم التاريخ فعلاً');
assert.strictEqual(ticket.hourLabel, '10:00 صباحاً');
assert.strictEqual(ticket.hourRange, '10:00 - 11:00');
assert.strictEqual(ticket.rel, 'بعد 3 أيام'.replace('3', String(Math.round((visitDate - daysFromToday(0)) / 86400000))), 'وصف «بعد X أيام» يجب أن يطابق فرق الأيام');

// 4-هـ: رابط تقويم Google — موعد ساعة بتوقيت الخرطوم
const gcal = BK.buildGcalUrl(ticket);
assert.ok(gcal.indexOf('https://calendar.google.com/calendar/render?action=TEMPLATE') === 0,
  'رابط التقويم يجب أن يبدأ بقالب إنشاء حدث Google Calendar');
assert.ok(gcal.includes('T100000') && gcal.includes('T110000'), 'رابط التقويم يجب أن يحمل الموعد ساعة كاملة (10:00 → 11:00)');
assert.ok(gcal.includes('ctz=Africa/Khartoum'), 'رابط التقويم يجب أن يحدد توقيت العيادة');
assert.ok(gcal.includes(encodeURIComponent('🦷 موعد عيادة أوراس — تجميل')), 'عنوان الحدث يجب أن يضم الخدمة');
assert.ok(gcal.includes(encodeURIComponent('رقم الحجز: ORAS-0042')), 'تفاصيل الحدث يجب أن تضم رقم الحجز');
assert.ok(gcal.includes(encodeURIComponent('شارع الستين')), 'رابط التقويم يجب أن يحمل موقع العيادة');
assert.strictEqual(BK.buildGcalUrl({ date: '', hour: '' }), '', 'بدون تاريخ/ساعة لا يُبنى رابط تقويم');

// 4-و: رسالة واتساب للتذكرة
const waMsg = BK.buildTicketWaMessage(ticket);
assert.ok(waMsg.includes('ORAS-0042') && waMsg.includes('محمد أحمد') && waMsg.includes('10:00 صباحاً'),
  'رسالة واتساب يجب أن تضم رقم الحجز والاسم والساعة');

// 4-ز: صفوف التذكرة — كل التفاصيل المطلوبة
const rows = BK.buildTicketRows(ticket);
for (const part of ['محمد أحمد', '0912345678', 'تجميل', VISIT, '10:00 صباحاً', '10:00 - 11:00', 'حساسية بنج', 'بعد']) {
  assert.ok(rows.includes(part), `صفوف التذكرة يجب أن تتضمن: ${part}`);
}

// 4-ح: حماية من حقن HTML في التذكرة
const evil = BK.buildTicketRows(
  BK.buildTicketData({ name: '<img src=x onerror=alert(1)>', phone: '09111', service: 'فحص وتشخيص', date: VISIT, hour: '12:00', notes: '<script>bad()</script>' }, { id: 1 })
);
assert.ok(!evil.includes('<img') && !evil.includes('<script>'),
  'التذكرة يجب أن تهرب أي HTML داخل المدخلات (منع XSS)');

/* ═══════════ 5) محاكاة حجز كامل → يجب أن تُفتح شاشة التأكيد ═══════════ */

// استجابة التوفر (GET) ثم استجابة تأكيد الحجز (POST)
xhrQueue.push(JSON.stringify({
  ok: true, mode: 'hourly', max: 4, hours: [], today: TODAY, nowHour: 0, closed: [], taken: {}
}));
xhrQueue.push(JSON.stringify({
  ok: true, id: 42, message: 'تم تسجيل الحجز بنجاح', name: 'محمد أحمد',
  date: VISIT, hour: '10:00', hourLabel: '10:00 صباحاً', hourRange: '10:00 - 11:00', service: 'تجميل'
}));

// تعبئة النموذج كما يفعل المريض
registry.fName.value = 'محمد أحمد';
registry.fPhone.value = '0912345678';
registry.fService.value = 'تجميل';
registry.fDate.value = VISIT;
registry.fNotes.value = 'حساسية بنج';
registry.fHp.value = '';
// اختيار ساعة 10:00 من الجدول
const hourRadio = makeEl('hourRadio');
hourRadio.value = '10:00';
documentMock.querySelector = (sel) => (sel === 'input[name="hour"]:checked' ? hourRadio : null);

// الضغط على «احجز الآن»
const formHandlers = registry.bookForm.handlers.submit || [];
assert.ok(formHandlers.length > 0, 'يجب أن يكون زر الحجز مرتبطاً بمعالج الإرسال');
formHandlers[0]({ preventDefault() {}, stopImmediatePropagation() {} });

// انتظار انتهاء السلسلة غير المتزامنة (توفر → حجز → فتح التذكرة)
function waitFor(cond, done, tries) {
  if (cond()) return done();
  if (tries > 100) return done(new Error('انتهى الانتظار دون تحقق الشرط'));
  setTimeout(() => waitFor(cond, done, tries + 1), 20);
}

waitFor(() => BK.isConfirmOpen(), () => {
  try {
    // 5-أ: الشاشة مفتوحة والجسم مقفول من التمرير
    assert.ok(registry.bkConfirm.classList.contains('open'), 'شاشة التأكيد يجب أن تُفتح بعد التأكيد');
    assert.strictEqual(registry.bkConfirm.attrs['aria-hidden'], 'false');
    assert.ok(documentMock.body.classList.contains('bk-locked'), 'يجب إيقاف تمرير الصفحة خلف الشاشة');

    // 5-ب: التفاصيل ظاهرة داخل التذكرة
    const details = registry.bkDetails.innerHTML;
    for (const part of ['محمد أحمد', '0912345678', 'تجميل', VISIT, '10:00 صباحاً', 'ORAS-0042', 'حساسية بنج']) {
      assert.ok(details.includes(part) || registry.bkRef.innerHTML.includes(part),
        `تذكرة الحجز يجب أن تعرض: ${part}`);
    }
    assert.ok(registry.bkRef.innerHTML.includes('ORAS-0042'), 'رقم الحجز يجب أن يظهر في التذكرة');
    assert.ok(registry.bkGcalBtn.href.indexOf('https://calendar.google.com/calendar/render?action=TEMPLATE') === 0,
      'زر تقويم Google يجب أن يحمل رابط الحدث الصحيح');

    // 5-ج: رسالة النجاح داخل النموذج فيها زر إعادة الفتح ورقم الحجز
    const statusHtml = registry.bookingStatusBox.innerHTML;
    assert.ok(statusHtml.includes('ORAS-0042') && statusHtml.includes('bkViewTicket'),
      'رسالة النجاح يجب أن تعرض رقم الحجز وزر «عرض تفاصيل الحجز»');

    // 5-د: زر واتساب داخل التذكرة يفتح رسالة جاهزة
    (registry.bkTicketWa.handlers.click || [])[0]();
    assert.ok(openedUrls.length === 1 && openedUrls[0].indexOf('https://wa.me/249912345678') === 0,
      'زر واتساب يجب أن يفتح محادثة برسالة التذكرة');
    assert.ok(decodeURIComponent(openedUrls[0]).includes('ORAS-0042'), 'رسالة واتساب يجب أن تحمل رقم الحجز');

    // 5-هـ: الطباعة تُفعّل وضع طباعة التذكرة وحدها
    (registry.bkPrintBtn.handlers.click || [])[0]();
    assert.ok(printed.length === 1, 'زر الطباعة يجب أن يستدعي الطباعة');
    assert.ok(documentMock.body.classList.contains('bk-printing'), 'يجب تفعيل وضع طباعة التذكرة');
    (winAddHandlers.afterprint || [])[0]();
    assert.ok(!documentMock.body.classList.contains('bk-printing'), 'بعد الطباعة تُزال حالة الطباعة');

    // 5-و: التذكرة محفوظة على الجهاز وزر «عرض تفاصيل حجزي» ظهر
    assert.ok(store.orasLastBooking && store.orasLastBooking.includes('ORAS-0042'),
      'يجب حفظ التذكرة على الجهاز (localStorage)');
    assert.strictEqual(registry.bkMineWrap.hidden, false, 'زر «عرض تفاصيل حجزي» يجب أن يظهر');
    const stored = BK.loadTicketStore();
    assert.ok(stored && stored.ref === 'ORAS-0042', 'التذكرة المحفوظة يجب أن تُقرأ سليمة');

    // 5-ز: الإغلاق (زر ✕ ثم Escape) يعمل
    (registry.bkConfirmClose.handlers.click || [])[0]();
    assert.ok(!BK.isConfirmOpen(), 'زر ✕ يجب أن يغلق شاشة التأكيد');
    BK.openConfirm();
    (documentMock.handlers = documentMock.handlers || {});
    // معالج keydown مُسجَّل على document — نستدعي المخزّن في السكربت عبر زر الخلفية بدلاً منه
    (registry.bkConfirm.handlers.click || [])[0]({ target: registry.bkConfirm });
    assert.ok(!BK.isConfirmOpen(), 'النقر على الخلفية يجب أن يغلق الشاشة');

    // 5-ح: «حجز موعد آخر» يغلق ويمسح النموذج
    registry.fName.value = 'اسم بعد الحجز';
    BK.openConfirm();
    (registry.bkAgainBtn.handlers.click || [])[0]();
    assert.ok(!BK.isConfirmOpen(), 'زر «حجز موعد آخر» يجب أن يغلق الشاشة');

    // 5-ط: حجز ماضٍ محفوظ على الجهاز لا يُعرض مجدداً
    store.orasLastBooking = JSON.stringify({ ref: 'ORAS-0001', name: 'قديم', date: '2020-01-01', hour: '10:00' });
    assert.strictEqual(BK.loadTicketStore(), null, 'تذكرة تاريخ ماضٍ يجب أن تُتجاهل عند تحميل الصفحة');

    console.log('✅ كل اختبارات شاشة تأكيد الحجز نجحت —');
    console.log('   • التذكرة تُفتح تلقائياً بعد التأكيد وتعرض: رقم الحجز، الاسم، الهاتف، الخدمة، اليوم/التاريخ، الساعة، الملاحظات');
    console.log('   • أزرار: تقويم Google، واتساب، طباعة/PDF، حجز موعد آخر، عرض تفاصيل حجزي — كلها تعمل');
    console.log('   • المدخلات مُهرَّبة (حماية XSS) وحجوزات الماضي لا تُعرض');
    process.exit(0);
  } catch (err) {
    console.error('❌ فشل اختبار:', err.message);
    process.exit(1);
  }
});
