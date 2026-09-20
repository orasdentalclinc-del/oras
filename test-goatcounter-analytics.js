/**
 * اختبار سلوكي لملفات الإحصاءات — يُشغّل الكود الحقيقي (لا نسخة منه) داخل vm بـDOM وهمي:
 *  1) oras-analytics.js — معطّل تماماً بلا كود.
 *  2) oras-analytics.js — مع كود: يحمّل count.js، يرصّ الأحداث ثم يرسلها، يتتبّع النقرات، العدّاد.
 *  3) oras-analytics.js — التطوير المحلي لا يُحتسب.
 *  4) oras-booking.js   — booking_submit + booking_confirmed + whatsapp_click من مسار الحجز الحقيقي.
 *
 * التشغيل:  node test-goatcounter-analytics.js
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function makeEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    attrs: {}, children: [], dataset: {}, style: {}, hidden: false, innerHTML: '', textContent: '',
    handlers: {}, value: '', checked: false, disabled: false, min: '',
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); },
    fire(t, ev) { (this.handlers[t] || []).forEach((fn) => fn.call(this, ev)); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return null; }, closest() { return null; },
    focus() {}, scrollIntoView() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}

function makeCtx(opts) {
  const listeners = {};
  const created = [];
  const byId = opts.byId || {};
  const document = {
    readyState: 'complete',
    head: makeEl('head'),
    documentElement: makeEl('html'),
    createElement: (t) => { const e = makeEl(t); created.push(e); return e; },
    getElementById: (id) => {
      if (id in byId) return byId[id];
      // يدعم العناصر التي يبنيها الكود ويحقنها بـ innerHTML ثم يبحث عنها بالمعرف
      for (const host of Object.values(byId)) {
        const m = /id="([^"]+)"/.exec(host.innerHTML || '');
        if (m && m[1] === id) {
          const e = makeEl('span');
          host.injected = host.injected || {};
          host.injected[id] = e;
          return e;
        }
      }
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (t, fn) => { (listeners['doc:' + t] = listeners['doc:' + t] || []).push(fn); },
    fire(t, ev) { (listeners['doc:' + t] || []).forEach((fn) => fn(ev)); }
  };
  const xhrs = [];
  function XHR() {
    this.readyState = 0; this.status = 0; this.responseText = ''; this.timeout = 0;
    this.open = (m, u) => { this.method = m; this.url = u; };
    this.setRequestHeader = () => {};
    this.send = (body) => {
      this.body = body;
      xhrs.push(this);
      const reply = (ctx.xhrReply && ctx.xhrReply(this)) || '';
      this.readyState = 4; this.status = 200; this.responseText = reply;
      if (this.onreadystatechange) this.onreadystatechange();
      if (this.onload) this.onload();
    };
  }
  const win = {
    document, XMLHttpRequest: XHR,
    location: { hostname: 'orasdentalclinic.com', pathname: '/', hash: '' },
    ORAS_GOATCOUNTER: opts.config,
    addEventListener: (t, fn) => { (listeners['win:' + t] = listeners['win:' + t] || []).push(fn); },
    fire(t, ev) { (listeners['win:' + t] || []).forEach((fn) => fn(ev)); },
    open: (u) => { win.opened.push(u); return {}; },
    opened: [],
    setTimeout: (...a) => setTimeout(...a),
    clearTimeout: (...a) => clearTimeout(...a),
    setInterval: (...a) => setInterval(...a),
    clearInterval: (...a) => clearInterval(...a)
  };
  win.window = win;
  vm.createContext(win);
  // ctx هو نفس الكائن المُعاد — حتى يعمل تعيين c.xhrReply بعد makeCtx
  const ctx = Object.assign({}, opts, { win, document, created, xhrs, listeners });
  return ctx;
}

function run(file, ctx) { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx.win, { filename: file }); }

// ─────────── 1) بلا كود: لا يفعل شيئاً ───────────
{
  const c = makeCtx({ config: { code: '' } });
  run('oras-analytics.js', c);
  assert.strictEqual(c.win.ORAS_ANALYTICS.enabled(), false, 'يجب أن يكون معطلاً بلا كود');
  assert.strictEqual(c.created.filter((e) => e.tagName === 'SCRIPT').length, 0, 'لا يُنشئ أي <script> بلا كود');
  assert.strictEqual(c.xhrs.length, 0, 'لا يرسل أي طلب بلا كود');
  assert.strictEqual(c.win.ORAS_ANALYTICS.track('booking_confirmed'), false, 'track يرجع false بلا كود');
  console.log('PASS 1 — معطّل تماماً عندما يكون الكود فارغاً (لا script، لا طلبات)');
}

// ─────────── 2) مع كود: يحمّل ويرسل ───────────
async function test2() {
  const counterEl = makeEl('div');
  const c = makeCtx({
    config: { code: 'oras-dental', showVisitorCounter: true },
    byId: { gcVisitorCount: counterEl },
    xhrReply: (x) => (/\/counter\//.test(x.url || '') ? JSON.stringify({ count: '1,234' }) : '')
  });
  run('oras-analytics.js', c);
  assert.strictEqual(c.win.ORAS_ANALYTICS.enabled(), true, 'يجب أن يكون مفعّلاً');

  const tag = c.created.find((e) => e.tagName === 'SCRIPT');
  assert.ok(tag, 'ينشئ <script> لتحميل count.js');
  assert.strictEqual(tag.attrs['data-goatcounter'], 'https://oras-dental.goatcounter.com/count');
  assert.strictEqual(tag.src, '//gc.zgo.at/count.js');
  assert.strictEqual(c.document.head.children[0], tag, 'يُضاف السكربت إلى <head>');

  // حدث قبل جهوز count.js → يُرصّ في قائمة الانتظار
  assert.strictEqual(c.win.ORAS_ANALYTICS.track('whatsapp_click', { to: '+249912345678' }), false, 'قبل التحميل يرجع false');
  assert.strictEqual(c.win.ORAS_ANALYTICS.track('call_click'), false);

  // محاكاة: count.js حمّل فعلاً وعرّف window.goatcounter
  const sent = [];
  c.win.goatcounter = { count: (p) => sent.push(p) };
  tag.onload();
  assert.strictEqual(sent.length, 2, 'يُرسل الحدثين المرصوصين بعد جهوز count.js، وصل: ' + sent.length);
  assert.strictEqual(sent[0].path, '/event/whatsapp_click');
  assert.strictEqual(sent[0].event, true);
  assert.deepEqual(JSON.parse(sent[0].campaign), { to: '+249912345678' });

  // بعد الجهوز: إرسال مباشر
  assert.strictEqual(c.win.ORAS_ANALYTICS.track('booking_confirmed', { service: 'تبييض', hour: '10:00' }), true, 'بعد التحميل يرجع true');
  assert.strictEqual(sent[2].path, '/event/booking_confirmed');
  assert.deepEqual(JSON.parse(sent[2].campaign), { service: 'تبييض', hour: '10:00' });

  // النقر على رابط واتساب → يُتتبَّع تلقائياً (بالتفويض)
  const waLink = makeEl('a'); waLink.setAttribute('href', 'https://wa.me/249912345678?text=x'); waLink.id = 'footWa';
  c.document.fire('click', { target: { closest: (sel) => (sel === 'a[href]' ? waLink : null) } });
  assert.strictEqual(sent[sent.length - 1].path, '/event/whatsapp_click');
  assert.deepEqual(JSON.parse(sent[sent.length - 1].campaign), { to: '+249912345678', where: 'footWa' });

  // النقر على tel: → يُتتبَّع
  const telLink = makeEl('a'); telLink.setAttribute('href', 'tel:+249912345678'); telLink.id = 'footPhone';
  c.document.fire('click', { target: { closest: (sel) => (sel === 'a[href]' ? telLink : null) } });
  assert.strictEqual(sent[sent.length - 1].path, '/event/call_click');
  assert.deepEqual(JSON.parse(sent[sent.length - 1].campaign), { to: '+249912345678', where: 'footPhone' });

  // العدّاد العلني (الوعد يُحسم في microtask — ننتظره)
  await new Promise((r) => setImmediate(r));
  const counterXhr = c.xhrs.find((x) => /\/counter\//.test(x.url || ''));
  assert.ok(counterXhr, 'يطلب /counter/...json للعدّاد الظاهر');
  assert.strictEqual(counterXhr.url, 'https://oras-dental.goatcounter.com/counter/TOTAL.json');
  assert.strictEqual(counterEl.hidden, false, 'يُظهر عنصر العدّاد بعد وصول الرقم');
  assert.ok(/gc-num/.test(counterEl.innerHTML) && /زيارة للموقع/.test(counterEl.innerHTML),
    'يبني بنية العدّاد: ' + JSON.stringify(counterEl.innerHTML));
  const numEl = counterEl.injected && counterEl.injected.gcVisitorNumber;
  assert.ok(numEl, 'يجد عنصر الرقم #gcVisitorNumber');
  assert.strictEqual(numEl.textContent, '1,234', 'يكتب الرقم القادم من GoatCounter');
  console.log('PASS 2 — يحمّل count.js، يرصّ الأحداث ثم يرسلها، يتتبّع واتساب/الاتصال، ويعرض العدّاد');
}

// ─────────── 3) التطوير المحلي لا يُحسب ───────────
{
  const c = makeCtx({ config: { code: 'oras-dental' } });
  c.win.location.hostname = 'localhost';
  run('oras-analytics.js', c);
  assert.strictEqual(c.win.ORAS_ANALYTICS.enabled(), false, 'localhost لا يُحسب');
  assert.strictEqual(c.created.filter((e) => e.tagName === 'SCRIPT').length, 0, 'لا يحمّل count.js محلياً');
  console.log('PASS 3 — التطوير المحلي (localhost) لا يُحتسب ولا يحمّل السكربت');
}

// ─────────── 4) oras-booking.js — الأحداث من مسار الحجز الحقيقي ───────────
{
  const tracked = [];
  function field(v) { const e = makeEl('input'); e.value = v; return e; }
  const byId = {
    bookForm: makeEl('form'),
    waBookBtn: makeEl('button'),
    toast: makeEl('div'),
    bookSubmitBtn: makeEl('button'),
    bookingStatusBox: makeEl('div'),
    fName: field('أحمد'),
    fPhone: field('0912345678'),
    fService: field('تبييض الأسنان'),
    fDate: field('2026-10-05'),
    fNotes: field(''),
    fHp: field('')
  };
  const hourRadio = makeEl('input'); hourRadio.value = '10:00'; hourRadio.checked = true;

  const c = makeCtx({ config: { code: '' } });
  c.document.getElementById = (id) => (id in byId ? byId[id] : null);
  c.document.querySelector = (sel) => (sel === 'input[name="hour"]:checked' ? hourRadio : null);
  c.document.querySelectorAll = () => [];
  // الخادم: الموعد متاح (GET) ثم الحجز مؤكد (POST)
  c.xhrReply = (x) => (x.method === 'GET'
    ? JSON.stringify({ ok: true, max: 4, closed: [], taken: {}, today: '2026-09-20', nowHour: 9 })
    : JSON.stringify({ ok: true }));
  c.win.ORAS_ANALYTICS = { track: (n, d) => { tracked.push([n, d]); return true; } };

  run('oras-booking.js', c);

  assert.ok(byId.bookForm.handlers.submit, 'initBooking ربط مستمع submit على #bookForm');
  assert.ok(byId.waBookBtn.handlers.click, 'initBooking ربط مستمع click على #waBookBtn');

  // 4a) ضغط زر «احجز الآن» → booking_submit ثم booking_confirmed
  byId.bookForm.fire('submit', { preventDefault() {}, stopImmediatePropagation() {} });
  const names = tracked.map((t) => t[0]);
  assert.ok(names.includes('booking_submit'), 'يُرسل booking_submit — وصل: ' + JSON.stringify(names));
  assert.deepEqual(tracked.find((t) => t[0] === 'booking_submit')[1],
    { service: 'تبييض الأسنان', date: '2026-10-05', hour: '10:00' });
  assert.ok(names.includes('booking_confirmed'), 'يُرسل booking_confirmed بعد تأكيد الخادم — وصل: ' + JSON.stringify(names));
  assert.deepEqual(tracked.find((t) => t[0] === 'booking_confirmed')[1],
    { service: 'تبييض الأسنان', date: '2026-10-05', hour: '10:00' });

  // العدّ المزدوج: ضغط ثانٍ فوراً لا يكرر الأحداث
  const before = tracked.length;
  byId.bookForm.fire('submit', { preventDefault() {}, stopImmediatePropagation() {} });
  assert.strictEqual(tracked.length, before, 'لا يعدّ الضغط المتتالي مرتين (خلال 1.5 ثانية)');

  // 4b) زر «حجز عبر واتساب» → يفتح واتساب + يرسل whatsapp_click
  byId.waBookBtn.fire('click', {});
  assert.strictEqual(c.win.opened.length, 1, 'يفتح رابط واتساب مرة واحدة');
  assert.ok(/^https:\/\/wa\.me\/249912345678\?text=/.test(c.win.opened[0]), 'الرابط: ' + c.win.opened[0].slice(0, 40));
  const waEvent = tracked.find((t) => t[0] === 'whatsapp_click');
  assert.ok(waEvent, 'يُرسل حدث whatsapp_click');
  assert.deepEqual(waEvent[1], { to: '+249912345678', where: 'booking-form' });

  console.log('PASS 4 — oras-booking.js (الكود الحقيقي): booking_submit + booking_confirmed + whatsapp_click، ومنع العدّ المزدوج');
}

test2().then(() => console.log('\n✅ كل الاختبارات نجحت')).catch((e) => { console.error(e); process.exit(1); });
