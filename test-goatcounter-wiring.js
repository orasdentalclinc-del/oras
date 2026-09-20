/**
 * يتحقق أن الإعداد الحقيقي الموجود في index.html ينتج وسمة GoatCounter الصحيحة
 * لموقع oras-dental — يُشغّل oras-analytics.js الفعلي ويقرأ window.ORAS_GOATCOUNTER
 * من index.html نفسه (لا قيمة مكتوبة يدوياً هنا).
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function makeEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), attrs: {}, children: [], dataset: {}, style: {},
    hidden: false, innerHTML: '', textContent: '', handlers: {},
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return null; }, closest() { return null; },
    focus() {}, scrollIntoView() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
  };
}

const html = fs.readFileSync('index.html', 'utf8');

// 1) نستخرج كتلة الإعداد الحقيقية من index.html
const m = /window\.ORAS_GOATCOUNTER\s*=\s*(\{[\s\S]*?\});/.exec(html);
assert.ok(m, 'لم تُعثر على كتلة window.ORAS_GOATCOUNTER في index.html');
const config = vm.runInNewContext('(' + m[1].replace(/\/\*[\s\S]*?\*\//g, '') + ')');
console.log('الإعداد المقروء من index.html:', JSON.stringify(config));
assert.strictEqual(config.code, 'oras-dental', 'الكود في index.html يجب أن يكون oras-dental');

// 2) نتحقق أن index.html يحمّل oras-analytics.js
assert.ok(/<script src="oras-analytics\.js[^"]*" defer><\/script>/.test(html),
  'index.html يجب أن يحمّل oras-analytics.js');
// وألا يكون فيه وسم GoatCounter مكرر (منع عدّ مزدوج)
assert.ok(!/<script[^>]*data-goatcounter=/.test(html),
  'لا يجب وجود وسم <script data-goatcounter> ثابت في index.html — السكربت يبنيه ديناميكياً');

// 3) نشغّل oras-analytics.js الحقيقي بهذا الإعداد
const head = makeEl('head');
const created = [];
const document = {
  readyState: 'complete', head, documentElement: makeEl('html'),
  createElement: (t) => { const e = makeEl(t); created.push(e); return e; },
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}
};
const win = {
  document, XMLHttpRequest: function () { this.open = () => {}; this.send = () => {}; },
  location: { hostname: 'orasdentalclinic.com', pathname: '/', hash: '' },
  ORAS_GOATCOUNTER: config,
  addEventListener() {}, open() { return {}; }, opened: []
};
win.window = win;
vm.createContext(win);
vm.runInContext(fs.readFileSync('oras-analytics.js', 'utf8'), win, { filename: 'oras-analytics.js' });

const tag = created.find((e) => e.tagName === 'SCRIPT');
assert.ok(tag, 'ينشئ وسم السكربت');
console.log('data-goatcounter =', tag.attrs['data-goatcounter']);
console.log('src              =', tag.src);
console.log('async            =', tag.async);

assert.strictEqual(tag.attrs['data-goatcounter'], 'https://oras-dental.goatcounter.com/count');
assert.strictEqual(tag.src, '//gc.zgo.at/count.js');
assert.strictEqual(tag.async, true);
assert.strictEqual(head.children[0], tag, 'الوسم مُضاف إلى <head>');

// 4) الأحداث تُرسل إلى نفس الموقع
const sent = [];
win.goatcounter = { count: (p) => sent.push(p) };
tag.onload();
assert.strictEqual(win.ORAS_ANALYTICS.enabled(), true);
assert.strictEqual(win.ORAS_ANALYTICS.track('booking_confirmed', { hour: '10:00' }), true);
assert.strictEqual(sent[sent.length - 1].path, '/event/booking_confirmed');

// 5) رابط العدّاد العلني لنفس الموقع
let url = '';
win.XMLHttpRequest = function () { this.open = (meth, u) => { url = u; }; this.send = () => {}; };
win.ORAS_ANALYTICS.getCount('TOTAL');
assert.strictEqual(url, 'https://oras-dental.goatcounter.com/counter/TOTAL.json');
console.log('counter URL      =', url);

console.log('\n✅ الإعداد الحقيقي في index.html يعمل مع oras-dental');
