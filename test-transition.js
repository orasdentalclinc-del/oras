/* اختبار مبخر لحركة الانتقال (oras-transition.js) بدون متصفح:
   يحاكي: الضغط على الزر → التغطية → وضع العلامة → فتح الصفحة → الانعكاس */
'use strict';

const byId = {};
const listeners = {};
const store = {};

function attach(parent, child) {
  child.parentNode = parent;
  parent.children.push(child);
  if (child.id) byId[child.id] = child;
  return child;
}

function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: '', innerHTML: '', textContent: '',
    style: { setProperty(k, v) { el._ptScale = v; } },
    attrs: {}, children: [], parentNode: null, _ptScale: null, target: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); },
      contains(c) { return this._s.has(c); },
    },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) {
      if (k === 'href') return el.attrs.href !== undefined ? el.attrs.href : el.href;
      return el.attrs[k] !== undefined ? el.attrs[k] : null;
    },
    hasAttribute(k) { return el.attrs[k] !== undefined; },
    appendChild(c) { return attach(el, c); },
    removeChild(c) {
      el.children = el.children.filter((x) => x !== c);
      c.parentNode = null;
      if (c.id && byId[c.id] === c) delete byId[c.id];
      return c;
    },
    closest() { return null; },
    get offsetWidth() { return 100; },
  };
  /* className ↔ classList متزامنان كما في المتصفح الحقيقي */
  Object.defineProperty(el, 'className', {
    get() { return [...el.classList._s].join(' '); },
    set(v) { el.classList._s = new Set(String(v).split(/\s+/).filter(Boolean)); },
  });
  if (tag === 'style' || tag === 'script') {
    Object.defineProperty(el, 'id', {
      get() { return el._id || ''; },
      set(v) { el._id = v; byId[v] = el; },
    });
  }
  return el;
}

const head = makeEl('head');
const html = makeEl('html');
const body = makeEl('body');
attach(html, head);
attach(html, body);

global.sessionStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
global.location = { href: 'about:blank', hostname: 'localhost' };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.window = {
  innerWidth: 1280, innerHeight: 800,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
};
global.document = {
  readyState: 'complete',
  head, body, documentElement: html,
  getElementById: (id) => byId[id] || null,
  createElement: (tag) => makeEl(tag),
  addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
};

const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, 'oras-transition.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) { console.error('✗ ' + msg); process.exitCode = 1; }
  else { console.log('✓ ' + msg); }
}

/* ── ١) وصول مباشر بلا علامة: لا توجد طبقة ── */
eval(src);
assert(!document.getElementById('ptOverlay'), 'زيارة مباشرة: لا تُعرض أي طبقة انتقال');

/* ── ٢) الضغط على زر data-pt → تغطية + علامة ── */
const clickFn = listeners.click && listeners.click[0];
assert(typeof clickFn === 'function', 'مستمع الضغط مسجّل');

const link = makeEl('a');
link.attrs.href = 'education.html';
link.attrs['data-pt'] = '';
link.closest = (sel) => (sel === 'a[data-pt]' ? link : null);

clickFn({
  target: link, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false,
  defaultPrevented: false, preventDefault() { this._pd = true; },
});

const ov1 = document.getElementById('ptOverlay');
assert(!!ov1, 'الضغط على الزر ينشئ طبقة الانتقال');
assert(ov1.classList.contains('on') && ov1.classList.contains('go'), 'الطبقة في حالة «تغطية» نشطة');
assert(!ov1.classList.contains('enter'), 'بدأ الانتقال من الحالة المصغّرة');
assert(store['oras-pt'] === 'reveal', 'وُضعت علامة الانعكاس في sessionStorage');
assert(ov1._ptScale && Number(ov1._ptScale) > 10, 'معامل التكبير يملأ الشاشة (scale=' + ov1._ptScale + ')');
assert(String(ov1.innerHTML).includes('pt-circle') && String(ov1.innerHTML).includes('pt-tooth'), 'الطبقة تحتوي الدائرة والسنّ');

/* ── ٣) الانتقال يحدث بعد اكتمال التغطية ── */
setTimeout(() => {
  assert(location.href === 'education.html', 'يتم فتح الصفحة بعد حركة التغطية');

  /* ── ٤) فتح الصفحة التالية بعلامة → انعكاس الحركة ── */
  if (byId.ptOverlay) delete byId.ptOverlay;
  store['oras-pt'] = 'reveal';
  eval(src); /* تشغيل السكربت من جديد كأن الصفحة الجديدة فُتحت */
  const ov2 = document.getElementById('ptOverlay');
  assert(!!ov2, 'عند فتح الصفحة توجد الطبقة جاهزة');
  assert(ov2.classList.contains('on') && !ov2.classList.contains('out'), 'تبدأ مغطيةً للشاشة (قبل الانعكاس)');
  assert(!('oras-pt' in store), 'العلامة أُزيلت بعد الاستهلاك');

  setTimeout(() => {
    assert(ov2.classList.contains('out'), 'الحركة تنقلب: السنّ يعود والدائرة تنكمش');
    setTimeout(() => {
      assert(!document.getElementById('ptOverlay'), 'تُزال الطبقة بعد اكتمال الانعكاس');
      console.log('\nاكتمل اختبار حركة الانتقال بنجاح.');
    }, 1500);
  }, 250);
}, 1300);
