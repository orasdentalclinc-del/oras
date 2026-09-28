/* اختبار عارض ملفات أوراس التعليمية (oras-edu.js) بدون متصفح:
   يحاكي: جلب الملفات من لوحة التحكم، عرض البطاقات، والحالة الفارغة، وفشل الشبكة */
'use strict';

const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'oras-edu.js'), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error('✗ ' + msg); failed++; }
  else console.log('✓ ' + msg);
}

/* ── DOM مصغّر ── */
function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(),
    className: '', textContent: '', innerHTML: '', href: '', target: '', rel: '', loading: '',
    attrs: {}, children: [], parentNode: null,
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k] !== undefined ? el.attrs[k] : null; },
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); c.parentNode = null; return c; },
  };
  Object.defineProperty(el, 'childNodes', { get() { return el.children; } });
  return el;
}

let fetchImpl = null;
global.window = {
  ORAS_SANITY_CONFIG: { projectId: 'upxb9w10', dataset: 'production' },
};
global.fetch = (...a) => fetchImpl(...a);

function setupDom(audience) {
  const empty = makeEl('div');
  empty.id = 'eduEmpty';
  const grid = makeEl('div');
  grid.id = 'eduFiles';
  grid.setAttribute('data-audience', audience);
  grid.appendChild(empty);
  const doc = {
    readyState: 'complete',
    getElementById: (id) => (id === 'eduFiles' ? grid : id === 'eduEmpty' ? empty : null),
    createElement: (t) => makeEl(t),
    addEventListener: () => {},
  };
  global.document = doc;
  return { grid, empty };
}

function okJson(result) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) });
}

async function run() {
  /* ── ١) عرض ملفات المرضى ── */
  let dom = setupDom('patients');
  let capturedUrl = '';
  fetchImpl = (url) => { capturedUrl = String(url); return okJson([
    {
      _id: 'a1', title: 'دليل العناية بعد التبييض', description: 'خطوات بسيطة', category: 'ما بعد العلاج',
      fileUrl: 'https://cdn.sanity.io/files/x/y/z/guide.pdf', fileSize: 245000,
      ext: 'pdf', mime: 'application/pdf', publishedAt: '2026-09-01T10:00:00Z', thumbUrl: null,
    },
    {
      _id: 'a2', title: 'روابط مفيدة', description: '', category: '',
      linkUrl: 'https://example.com/links', fileUrl: null, thumbUrl: 'https://cdn.sanity.io/images/x/y/z/img.jpg',
      publishedAt: '', ext: '', mime: '',
    },
  ]); };
  eval(src);
  await new Promise((r) => setTimeout(r, 60));

  assert(capturedUrl.includes('educationFile'), 'الاستعلام يطلب مستندات educationFile');
  assert(capturedUrl.includes('patients') && !capturedUrl.includes('dentists'), 'الاستعلام يفلتر حسب قسم المرضى');
  assert(dom.grid.children.length === 2, 'عُرضت بطاقتان (الأولى ملف، والثانية رابط)');
  assert(dom.empty.parentNode === null, 'أُزيلت رسالة «قريباً» بعد وصول الملفات');
  const card1 = dom.grid.children[0];
  const card2 = dom.grid.children[1];
  assert(card1.href === 'https://cdn.sanity.io/files/x/y/z/guide.pdf', 'بطاقة الملف تشير إلى ملف الـ PDF');
  assert(card1.target === '_blank', 'الملف يُفتح في تبويب جديد');
  const body1 = card1.children[1];
  assert(card1.children.length === 2, 'البطاقة تحتوي صورة/أيقونة ومتن');
  assert(body1.children.some((n) => n.textContent === 'دليل العناية بعد التبييض'), 'عنوان الملف يظهر على البطاقة');
  assert(body1.children.some((n) => n.className === 'file-meta'), 'تظهر معلومات الملف (التصنيف/الحجم/التاريخ)');
  assert(card2.href === 'https://example.com/links', 'بطاقة الرابط تشير إلى الرابط الخارجي');
  const thumb2 = card2.children[0];
  assert(thumb2.children.some((n) => n.tagName === 'IMG'), 'الصورة المصغّرة تظهر إن وُجدت');
  assert(thumb2.children.some((n) => n.className === 'ext-badge' && n.textContent === 'رابط'), 'شارة «رابط» تظهر للبطاقة الخارجية');

  /* ── ٢) لا توجد ملفات → تبقى رسالة «قريباً» ── */
  dom = setupDom('dentists');
  fetchImpl = () => okJson([]);
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.grid.children.length === 1 && dom.empty.parentNode === dom.grid, 'بدون ملفات تبقى رسالة «قريباً» ظاهرة');

  /* ── ٣) فشل الشبكة → لا تنكسر الصفحة وتبقى الرسالة ── */
  dom = setupDom('patients');
  fetchImpl = () => Promise.reject(new Error('network down'));
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.grid.children.length === 1 && dom.empty.parentNode === dom.grid, 'عند فشل الاتصال تبقى الحالة الافتراضية');

  /* ── ٤) فشل HTTP (403) → نفس السلوك ── */
  dom = setupDom('patients');
  fetchImpl = () => Promise.resolve({ ok: false, status: 403 });
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.empty.parentNode === dom.grid, 'عند رفض الخادم تبقى الحالة الافتراضية');

  console.log(failed ? `\n${failed} اختبارات فشلت` : '\nاكتمل اختبار عارض الملفات بنجاح.');
  process.exit(failed ? 1 : 0);
}

run();
