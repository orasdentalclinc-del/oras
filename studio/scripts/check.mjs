/**
 * فحص شامل للربط بين الموقع ولوحة التحكم.
 * التشغيل من داخل مجلد studio:   npm run check
 * لا يحتاج توكن ولا تسجيل دخول — يفحص ما يراه الموقع بالضبط.
 */

const PROJECT = process.env.SANITY_STUDIO_PROJECT_ID || 'upxb9w10'
const DATASET = process.env.SANITY_STUDIO_DATASET || 'production'
const API = '2024-01-01'

const ok = (m) => console.log('  \x1b[32m✅\x1b[0m ' + m)
const no = (m) => console.log('  \x1b[31m❌\x1b[0m ' + m)
const inf = (m) => console.log('  \x1b[36mℹ️\x1b[0m  ' + m)
const hdr = (m) => console.log('\n\x1b[1m' + m + '\x1b[0m')

console.log('\n╔══════════════════════════════════════════╗')
console.log('║   فحص ربط موقع أوراس بلوحة التحكم       ║')
console.log('╚══════════════════════════════════════════╝')
console.log(`\nالمشروع: ${PROJECT}   |   البيانات: ${DATASET}`)

let fatal = false

// ─── 1) الاتصال بالإنترنت ───
hdr('1) الاتصال بالإنترنت')
try {
  await fetch('https://www.sanity.io', {method: 'HEAD', signal: AbortSignal.timeout(10000)})
  ok('الاتصال بـ sanity.io يعمل')
} catch {
  no('لا يوجد اتصال بالإنترنت — تحقق من الشبكة أو الجدار الناري')
  process.exit(1)
}

// ─── 2) وجود المشروع والـ dataset ───
hdr('2) المشروع وقاعدة البيانات')
const q = encodeURIComponent('count(*[])')
const url = `https://${PROJECT}.api.sanity.io/v${API}/data/query/${DATASET}?query=${q}`
let res
try {
  res = await fetch(url, {signal: AbortSignal.timeout(15000)})
} catch (e) {
  no('فشل الاتصال: ' + e.message)
  process.exit(1)
}

if (res.status === 404) {
  no(`غير موجود (404) — المعرف "${PROJECT}" أو الـ dataset "${DATASET}" خاطئ`)
  inf('تحقق من الاسم في: https://sanity.io/manage')
  fatal = true
} else if (res.status === 401 || res.status === 403) {
  no(`الـ dataset ليس عاماً (${res.status}) — الموقع لا يستطيع القراءة`)
  console.log('')
  console.log('  \x1b[33m⚡ هذا هو سبب عدم ظهور تعديلاتك على الموقع!\x1b[0m')
  console.log('')
  inf('الحل: https://sanity.io/manage → مشروعك → Datasets')
  inf(`      → ${DATASET} → Visibility → \x1b[1mPublic\x1b[0m`)
  fatal = true
} else if (res.ok) {
  ok('المشروع موجود والبيانات قابلة للقراءة علناً')
} else {
  no('استجابة غير متوقعة: HTTP ' + res.status)
  fatal = true
}

if (fatal) {
  console.log('\n\x1b[31m✖ أصلح ما سبق ثم أعد الفحص.\x1b[0m\n')
  process.exit(1)
}

// ─── 3) المحتوى المنشور ───
hdr('3) المحتوى المنشور (ما يراه الموقع فعلياً)')
const groq = `{"settings": *[_type == "siteSettings"][0],
 "services": *[_type == "service"] | order(order asc),
 "cases": *[_type == "caseStudy"] | order(order asc),
 "gallery": *[_type == "galleryItem"] | order(order asc),
 "doctors": *[_type == "doctor"] | order(order asc),
 "reviews": *[_type == "review"] | order(_createdAt desc),
 "approvedReviews": count(*[_type == "review" && status == "approved"]),
 "partners": *[_type == "partner" && isActive != false] | order(order asc),
 "surveyQ": *[_type == "siteSettings"][0].surveyQuestions,
 "drafts": count(*[_id in path("drafts.**")])}`

const r2 = await fetch(
  `https://${PROJECT}.api.sanity.io/v${API}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`,
)
const {result} = await r2.json()

const counts = [
  ['إعدادات الموقع', result.settings ? 1 : 0],
  ['الخدمات', result.services?.length || 0],
  ['الحالات', result.cases?.length || 0],
  ['صور نشاط العيادة', result.gallery?.length || 0],
  ['الأطباء', result.doctors?.length || 0],
  ['التقييمات (الكل)', result.reviews?.length || 0],
  ['التقييمات المنشورة', result.approvedReviews || 0],
  ['الشراكات', result.partners?.length || 0],
]

let empty = true
for (const [name, n] of counts) {
  if (n > 0) { ok(`${name}: ${n}`); empty = false }
  else no(`${name}: لا يوجد محتوى منشور`)
}

// ─── 3.5) التقييمات والاستبيان ───
hdr('4) التقييمات والاستبيان')
const pending = (result.reviews || []).filter((r) => r.status === 'pending').length
if (result.reviews?.length) {
  ok(`التقييمات: ${result.reviews.length} — منها ${result.approvedReviews || 0} منشورة`)
  if (pending > 0) {
    inf(`${pending} تقييم قيد المراجعة — اعتمده من اللوحة ليظهر على الموقع`)
  }
} else {
  inf('لا توجد تقييمات بعد — تُدار من قسم «⭐ آراء المرضى» في اللوحة')
}
if (Array.isArray(result.surveyQ) && result.surveyQ.length) {
  ok(`أسئلة الاستبيان مضبوطة من اللوحة (${result.surveyQ.length} أسئلة)`)
} else {
  inf('أسئلة الاستبيان فارغة — الموقع يستخدم الأسئلة الافتراضية')
}

// ─── 5) المسوّدات غير المنشورة ───
hdr('4) المسوّدات')
if (result.drafts > 0) {  no(`يوجد ${result.drafts} مسوّدة غير منشورة`)
  console.log('')
  console.log('  \x1b[33m⚡ الموقع يعرض المحتوى المنشور فقط — وليس المسوّدات!\x1b[0m')
  console.log('')
  inf('الحل: افتح كل مستند في اللوحة واضغط زر \x1b[1mPublish\x1b[0m الأخضر')
  inf('      (الحفظ التلقائي ينشئ مسوّدة فقط، لا ينشر)')
} else if (empty) {
  inf('لا توجد مسوّدات ولا محتوى — اللوحة فارغة تماماً')
  inf('أضف محتوى من اللوحة ثم اضغط Publish')
} else {
  ok('لا توجد مسوّدات معلّقة — كل شيء منشور')
}

// ─── 5) إعدادات CORS ───
hdr('5) نطاقات CORS المسموح بها')
inf('لا يمكن فحصها بدون تسجيل دخول. تأكد يدوياً من وجود:')
console.log('     https://orasdentalclinic.com')
console.log('     https://www.orasdentalclinic.com')
console.log('     http://localhost:3333')
inf('من: https://sanity.io/manage → API → CORS origins')

// ─── الخلاصة ───
hdr('الخلاصة')
if (empty) {
  console.log('  اللوحة تعمل لكنها \x1b[1mفارغة\x1b[0m — الموقع يعرض المحتوى الافتراضي.')
  console.log('  أضف محتوى واضغط Publish.')
} else if (result.drafts > 0) {
  console.log('  يوجد محتوى، لكن بعضه \x1b[1mغير منشور\x1b[0m — اضغط Publish.')
} else {
  console.log('  \x1b[32mكل شيء سليم.\x1b[0m إن لم تظهر التعديلات على الموقع:')
  console.log('  • انتظر دقيقة (كاش CDN)  • أفرغ كاش المتصفح (Ctrl+Shift+R)')
  console.log('  • تأكد أن نطاقك مضاف في CORS')
}
console.log('')
