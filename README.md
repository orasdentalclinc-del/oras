# موقع عيادة أوراس لطب الأسنان

موقع ثابت (صفحة واحدة) + لوحة تحكم Sanity لإدارة المحتوى بدون لمس الكود.

```
oras/
├── index.html          ← الموقع (يُنشر على GitHub Pages)
├── CNAME               ← orasdentalclinic.com
└── studio/             ← لوحة التحكم (Sanity Studio)
    ├── sanity.config.js
    ├── sanity.cli.js
    ├── schemaTypes/    ← تعريف الحقول
    └── scripts/seed.mjs ← تعبئة المحتوى الافتراضي
```

## كيف يعمل الربط

الموقع صفحة HTML واحدة تحتوي على محتوى افتراضي مكتوب بداخلها. عند فتحها تطلب
المحتوى من Sanity وتستبدل النصوص والصور. **إذا فشل الاتصال أو لم يُضبط المعرف،
يبقى المحتوى الافتراضي ظاهراً** — الموقع لا ينكسر أبداً.

```
لوحة التحكم  ──نشر──▶  Sanity  ──استعلام GROQ──▶  index.html
```

---

## خطوات التشغيل

### 1) إنشاء مشروع Sanity

```bash
cd studio
npm install
npx sanity login          # سجّل دخولك (Google / GitHub / بريد)
npx sanity init --create-project "Oras Dental" --dataset production
```

انسخ **Project ID** الذي يظهر (مثل `k3f8s2m1`). تجده أيضاً في
<https://sanity.io/manage>.

### 2) ربط اللوحة بالمشروع

```bash
cp .env.example .env
```

ثم افتح `.env` وضع المعرف:

```
SANITY_STUDIO_PROJECT_ID=k3f8s2m1
SANITY_STUDIO_DATASET=production
```

### 3) ⚠️ ربط الموقع بالمشروع (الخطوة الأهم)

افتح `index.html` وابحث عن `CONFIG` (قرابة السطر 826) وضع نفس المعرف:

```js
const CONFIG = {
  sanity: {
    projectId: 'k3f8s2m1',   // ← ضع المعرف هنا
    dataset: 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
  },
  ...
};
```

> بدون هذه الخطوة ستعمل اللوحة لكن الموقع لن يقرأ منها.

### 4) جعل البيانات قابلة للقراءة علناً

الموقع يقرأ بدون توكن، لذا يجب أن يكون الـ dataset عاماً:

**sanity.io/manage → مشروعك → Datasets → production → Visibility → Public**

> هذا آمن: يجعل المحتوى المنشور فقط قابلاً للقراءة — لا أحد يستطيع التعديل
> بدون تسجيل دخول.

### 5) السماح لنطاق موقعك (CORS)

**sanity.io/manage → API → CORS origins → Add origin**

أضف (بدون تفعيل `Allow credentials`):

| النطاق | الغرض |
|---|---|
| `https://orasdentalclinic.com` | الموقع المباشر |
| `https://www.orasdentalclinic.com` | نسخة www |
| `https://orasdentalclinc-del.github.io` | نطاق GitHub Pages |
| `http://localhost:3333` | التطوير المحلي |

### 6) تشغيل اللوحة

```bash
cd studio
npm run dev        # http://localhost:3333
```

### 7) تعبئة المحتوى الافتراضي (اختياري)

بدل كتابة كل شيء يدوياً، انقل محتوى الموقع الحالي إلى اللوحة دفعة واحدة.
أنشئ توكن **Editor** من: sanity.io/manage → API → Tokens

```bash
SANITY_WRITE_TOKEN=توكنك npm run seed
```

### 8) نشر اللوحة على الإنترنت

```bash
npm run deploy
```

تختار اسماً وتصبح اللوحة على `https://الاسم.sanity.studio` — يفتحها أي شخص
تدعوه من **sanity.io/manage → Members → Invite**.

---

## أقسام اللوحة

| القسم | النوع | ماذا يتحكم |
|---|---|---|
| ⚙️ إعدادات الموقع | `siteSettings` | الاسم، الواجهة، من نحن، الأرقام، العناوين، الهاتف، واتساب، الخريطة، الدوام |
| 🦷 الخدمات | `service` | بطاقات الخدمات + قائمة الخدمات في نموذج الحجز |
| ✨ الحالات | `caseItem` | صور قبل/بعد بالفاصل المتحرك |
| 🖼️ معرض الصور | `galleryItem` | جولة العيادة |
| 👩‍⚕️ الأطباء | `doctor` | بطاقات الفريق الطبي |

**الترتيب:** كل عنصر فيه حقل «الترتيب» — الرقم الأصغر يظهر أولاً.

**رقم واتساب:** يُكتب بالصيغة الدولية بدون `+` وبدون مسافات — `249912345678`.
هذا الرقم يستقبل طلبات الحجز من النموذج.

---

## ملاحظات مهمة

**التغييرات لا تظهر فوراً؟** الموقع يستخدم كاش Sanity CDN لمدة ~60 ثانية.
اضغط **Publish** في اللوحة (وليس حفظ المسودة فقط) وانتظر دقيقة.
للتحديث الفوري اجعل `useCdn: false` في `index.html` (أبطأ قليلاً).

**الصور** تُحسَّن تلقائياً عبر Sanity CDN (`auto=format` + تحجيم مناسب)،
فارفع صوراً عالية الجودة دون قلق من حجم الصفحة.

**النشر:** أي تعديل على `index.html` يحتاج `git push` لتحديث الموقع.
أما تعديلات المحتوى من اللوحة فتظهر مباشرة بدون نشر.

---

## استكشاف الأخطاء

افتح **Console** في المتصفح (F12) — الموقع يطبع سبب المشكلة بوضوح.

| المشكلة | الحل |
|---|---|
| `HTTP 404` | `projectId` أو اسم الـ dataset خاطئ |
| `HTTP 403` | الـ dataset ليس Public (الخطوة 4) |
| خطأ CORS | أضف نطاقك في CORS origins (الخطوة 5) |
| `ℹ️ Sanity غير مفعّل` | لم تضع `projectId` في `index.html` (الخطوة 3) |
| المحتوى الافتراضي يظهر | لم تضغط **Publish**، أو الكاش لم ينتهِ بعد |
