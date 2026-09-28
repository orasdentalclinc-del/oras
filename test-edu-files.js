/* اختبار عارض ملفات أوراس التعليمية (oras-edu.js) بدون متصفح:
   يحاكي: جلب الملفات مرة واحدة وتوزيعها على قسمي المرضى والأطباء،
   والحالة الفارغة، وفشل الشبكة */
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
    querySelector(sel) {
      if (sel === '.edu-empty') return el.children.find((c) => c.className === 'edu-empty') || null;
      return null;
    },
  };
  Object.defineProperty(el, 'childNodes', { get() { return el.children; } });
  return el;
}

let fetchImpl = null;
global.window = {
  ORAS_SANITY_CONFIG: { projectId: 'upxb9w10', dataset: 'production' },
};
global.fetch = (...a) => fetchImpl(...a);

/* يبني صفحة بشبكتين: المرضى والأطباء */
function setupDom() {
  const mkGrid = (audience) => {
    const empty = makeEl('div');
    empty.className = 'edu-empty';
    const grid = makeEl('div');
    grid.setAttribute('data-audience', audience);
    grid.appendChild(empty);
    return { grid, empty };
  };
  const p = mkGrid('patients');
  const d = mkGrid('dentists');
  global.document = {
    readyState: 'complete',
    querySelectorAll: (sel) => (sel === '.file-grid[data-audience]' ? [p.grid, d.grid] : []),
    createElement: (t) => makeEl(t),
    addEventListener: () => {},
  };
  return { p, d };
}

function okJson(result) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve({ result }) });
}

async function run() {
  /* ── ١) توزيع الملفات على القسمين من طلب واحد ── */
  let dom = setupDom();
  let capturedUrl = '';
  fetchImpl = (url) => {
    capturedUrl = String(url);
    return okJson([
      {
        _id: 'p1', title: 'دليل العناية بعد التبييض', description: 'خطوات بسيطة', category: 'ما بعد العلاج',
        audience: 'patients', fileUrl: 'https://cdn.sanity.io/files/x/y/z/guide.pdf', fileSize: 245000,
        ext: 'pdf', mime: 'application/pdf', publishedAt: '2026-09-01T10:00:00Z', thumbUrl: null,
      },
      {
        _id: 'd1', title: 'بروتوكول التصميم الرقمي', description: '', category: 'تدريب مهاري',
        audience: 'dentists', linkUrl: 'https://example.com/cad', fileUrl: null,
        thumbUrl: 'https://cdn.sanity.io/images/x/y/z/img.jpg', publishedAt: '', ext: '', mime: '',
      },
      {
        _id: 'p2', title: 'نصائح أسنان الأطفال', description: '', category: '',
        audience: 'patients', fileUrl: 'https://cdn.sanity.io/files/x/y/z/kids.pdf', fileSize: 900000,
        ext: 'pdf', mime: 'application/pdf', publishedAt: '', thumbUrl: null,
      },
    ]);
  };
  eval(src);
  await new Promise((r) => setTimeout(r, 60));

  assert(capturedUrl.includes('educationFile'), 'الاستعلام يطلب مستندات educationFile');
  assert(dom.p.grid.children.length === 2, 'قسم المرضى استلم بطاقتيه');
  assert(dom.d.grid.children.length === 1, 'قسم الأطباء استلم بطاقته');
  assert(dom.p.empty.parentNode === null, 'أُزيلت رسالة «قريباً» من قسم المرضى');
  assert(dom.d.empty.parentNode === null, 'أُزيلت رسالة «قريباً» من قسم الأطباء');
  const pCard = dom.p.grid.children[0];
  assert(pCard.href === 'https://cdn.sanity.io/files/x/y/z/guide.pdf', 'بطاقة الملف تشير إلى ملف الـ PDF');
  assert(pCard.target === '_blank', 'الملف يُفتح في تبويب جديد');
  assert(pCard.children[1].children.some((n) => n.textContent === 'دليل العناية بعد التبييض'), 'عنوان الملف يظهر على البطاقة');
  assert(pCard.children[1].children.some((n) => n.className === 'file-meta'), 'تظهر معلومات الملف (التصنيف/الحجم/التاريخ)');
  const dCard = dom.d.grid.children[0];
  assert(dCard.href === 'https://example.com/cad', 'بطاقة الرابط تشير إلى الرابط الخارجي');
  assert(dCard.children[0].children.some((n) => n.tagName === 'IMG'), 'الصورة المصغّرة تظهر إن وُجدت');
  assert(dCard.children[0].children.some((n) => n.className === 'ext-badge' && n.textContent === 'رابط'), 'شارة «رابط» تظهر للبطاقة الخارجية');

  /* ── ٢) قسم بلا ملفات → تبقى رسالة «قريباً» ── */
  dom = setupDom();
  fetchImpl = () => okJson([
    { _id: 'p1', title: 'ملف', audience: 'patients', fileUrl: 'https://x/f.pdf', ext: 'pdf' },
  ]);
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.p.grid.children.length === 1, 'قسم المرضى استلم ملفه');
  assert(dom.d.grid.children.length === 1 && dom.d.empty.parentNode === dom.d.grid, 'قسم الأطباء بلا ملفات تبقى رسالته ظاهرة');

  /* ── ٣) لا توجد ملفات إطلاقاً → تبقى الرسائل ── */
  dom = setupDom();
  fetchImpl = () => okJson([]);
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.p.empty.parentNode === dom.p.grid && dom.d.empty.parentNode === dom.d.grid, 'بدون ملفات تبقى رسائل «قريباً» ظاهرة');

  /* ── ٤) فشل الشبكة → لا تنكسر الصفحة وتبقى الرسائل ── */
  dom = setupDom();
  fetchImpl = () => Promise.reject(new Error('network down'));
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.p.empty.parentNode === dom.p.grid && dom.d.empty.parentNode === dom.d.grid, 'عند فشل الاتصال تبقى الحالة الافتراضية');

  /* ── ٥) فشل HTTP (403) → نفس السلوك ── */
  dom = setupDom();
  fetchImpl = () => Promise.resolve({ ok: false, status: 403 });
  eval(src);
  await new Promise((r) => setTimeout(r, 60));
  assert(dom.p.empty.parentNode === dom.p.grid && dom.d.empty.parentNode === dom.d.grid, 'عند رفض الخادم تبقى الحالة الافتراضية');

  console.log(failed ? `\n${failed} اختبارات فشلت` : '\nاكتمل اختبار عارض الملفات بنجاح.');
  process.exit(failed ? 1 : 0);
}

run();
