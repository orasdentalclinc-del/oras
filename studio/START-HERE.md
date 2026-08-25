# 🚀 ابدأ من هنا — تشغيل لوحة التحكم

مشروعك: **`j4rqm0i8`** — المعرف مضبوط مسبقاً في كل الملفات، لا تحتاج تعديله.

---

## المتطلب الوحيد: Node.js

تأكد أنه مثبّت (يلزم إصدار 18 أو أحدث):

```bash
node -v
```

إن لم يظهر رقم إصدار، نزّله من <https://nodejs.org> (اختر LTS).

---

## الخطوات (٤ أوامر)

افتح **Terminal** (أو **PowerShell** على ويندوز) داخل مجلد `studio`:

```bash
cd studio
npm install
npx sanity login
npm run dev
```

- `npm install` — تحميل المكتبات (٢-٣ دقائق، مرة واحدة فقط)
- `npx sanity login` — يفتح المتصفح لتسجيل دخولك
- `npm run dev` — تشغيل اللوحة

ثم افتح: **<http://localhost:3333>**

> **اختصار:** بدل الأوامر الأربعة يمكنك تشغيل `./start.sh`
> (على ويندوز: انقر مرّتين على `start.bat`)

---

## ⚠️ خطوتان مهمتان قبل أن يعمل الموقع

اللوحة ستعمل فوراً، لكن **الموقع لن يقرأ منها** حتى تضبط هذين الإعدادين
من <https://sanity.io/manage> (مرة واحدة فقط):

### 1. اجعل البيانات عامة للقراءة

**مشروعك → Datasets → `production` → Visibility → Public**

> آمن تماماً: القراءة فقط للمحتوى المنشور. التعديل يبقى محمياً بتسجيل الدخول.
> بدونها يظهر خطأ `403` في الموقع.

### 2. اسمح لنطاقات موقعك (CORS)

**API → CORS origins → Add origin** — أضف كل سطر على حدة
(**بدون** تفعيل `Allow credentials`):

```
https://orasdentalclinic.com
https://www.orasdentalclinic.com
https://orasdentalclinc-del.github.io
http://localhost:3333
```

---

## تعبئة المحتوى الافتراضي (اختياري)

لنقل محتوى الموقع الحالي إلى اللوحة دفعة واحدة بدل كتابته يدوياً:

1. أنشئ توكن من **sanity.io/manage → API → Tokens** بصلاحية **Editor**
2. شغّل:

```bash
SANITY_WRITE_TOKEN=توكنك npm run seed
```

على ويندوز (PowerShell):

```powershell
$env:SANITY_WRITE_TOKEN="توكنك"; npm run seed
```

---

## نشر اللوحة على الإنترنت

بدل تشغيلها على جهازك كل مرة:

```bash
npm run deploy
```

تختار اسماً وتصبح اللوحة على `https://الاسم.sanity.studio` — تفتحها من الجوال
أو أي جهاز. لدعوة موظفي العيادة: **sanity.io/manage → Members → Invite**.

---

## طريقة الاستخدام اليومية

1. افتح اللوحة → عدّل المحتوى أو ارفع صوراً
2. اضغط **Publish** (وليس الحفظ فقط)
3. انتظر دقيقة ← يتحدّث الموقع تلقائياً بدون رفع أي ملف

> تعديلات المحتوى **لا** تحتاج `git push`. فقط تعديلات `index.html` تحتاجه.
