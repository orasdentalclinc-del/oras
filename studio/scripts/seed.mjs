/**
 * تعبئة اللوحة بالمحتوى الافتراضي الموجود حالياً في الموقع.
 * التشغيل:  npx sanity login   ثم   npm run seed
 * آمن للتكرار: يستخدم createIfNotExists / createOrReplace بمعرفات ثابتة.
 */
import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

// قراءة .env يدوياً (بدون تبعيات إضافية)
try {
  const env = readFileSync(join(here, '..', '.env'), 'utf8')
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '')
  }
} catch {
  /* لا يوجد .env — سنعتمد على متغيرات البيئة */
}

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const token = process.env.SANITY_AUTH_TOKEN || process.env.SANITY_WRITE_TOKEN

if (!projectId) {
  console.error('❌ لم يتم العثور على SANITY_STUDIO_PROJECT_ID. أنشئ ملف studio/.env أولاً.')
  process.exit(1)
}
if (!token) {
  console.error(
    '❌ يلزم توكن كتابة.\n' +
      '   أنشئه من: https://sanity.io/manage → API → Tokens (صلاحية Editor)\n' +
      '   ثم شغّل:  SANITY_WRITE_TOKEN=xxx npm run seed',
  )
  process.exit(1)
}

const client = createClient({projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false})

const settings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  clinicFullName: 'عيادة أوراس لطب الأسنان',
  clinicShortName: 'أوراس',
  clinicSubName: 'لطب الأسنان',
  footDesc: 'عيادة متكاملة لطب وتجميل الأسنان في قلب الخرطوم — رعاية دقيقة بأحدث الأجهزة وأيدٍ خبيرة.',
  heroBadge: 'نستقبل الحالات اليوم',
  heroTitle1: 'ابتسامتك تستحق',
  heroTitle2: 'عناية استثنائية',
  heroSub:
    'في عيادة أوراس نجمع بين أحدث تقنيات طب الأسنان ولمسة إنسانية دافئة — لتخرج بابتسامة تثق بها.',
  aboutTitle: 'من نحن',
  aboutText1:
    'عيادة أوراس لطب الأسنان في شارع الستين بالخرطوم، نقدم رعاية شاملة للأسنان تجمع بين الدقة العلمية وراحة المريض.',
  aboutText2:
    'فريقنا من الأطباء المتخصصين يستخدم أحدث الأجهزة والتعقيم القياسي لضمان تجربة علاجية آمنة ومريحة.',
  aboutYears: '+12',
  aboutYearsLabel: 'سنة من الخبرة',
  stats: [
    {_key: 's1', value: '+5000', label: 'مريض سعيد'},
    {_key: 's2', value: '+12', label: 'سنة خبرة'},
    {_key: 's3', value: '9', label: 'خدمة متخصصة'},
    {_key: 's4', value: '4.9', label: 'تقييم المرضى'},
  ],
  servicesTitle: 'خدماتنا',
  servicesTitleHi: 'المتكاملة',
  servicesLead: 'كل ما تحتاجه أسنانك تحت سقف واحد وبأعلى معايير الجودة.',
  casesTitle: 'حالات',
  casesTitleHi: 'قبل وبعد',
  casesLead: 'نتائج حقيقية من عيادتنا — اسحب الفاصل لمشاهدة الفرق.',
  galleryTitle: 'جولة في',
  galleryTitleHi: 'العيادة',
  galleryLead: 'بيئة نظيفة ومريحة مجهزة بأحدث الأجهزة.',
  doctorsTitle: 'فريقنا',
  doctorsTitleHi: 'الطبي',
  doctorsLead: 'أطباء متخصصون يهتمون بأدق التفاصيل.',
  bookingTitle: 'احجز',
  bookingTitleHi: 'موعدك',
  bookingLead: 'املأ النموذج وسنصلك عبر واتساب لتأكيد الموعد.',
  whatsapp: '249912345678',
  phone: '+249 91 234 5678',
  email: 'info@orasdentalclinic.com',
  addressTitle: 'شارع الستين',
  addressSub: 'الخرطوم — السودان',
  addressFull: 'شارع الستين، الخرطوم، السودان',
  mapQuery: 'شارع الستين الخرطوم',
  mapNote: 'موقعنا على الخريطة — اضغط للحصول على الاتجاهات',
  hoursWeekLabel: 'السبت — الخميس',
  hoursWeek: '9:00 ص — 9:00 م',
  hoursFriLabel: 'الجمعة',
  hoursFri: '4:00 م — 9:00 م',
  footHours: 'السبت — الخميس: 9 ص — 9 م',
}

const services = [
  ['تبييض الأسنان', 'تبييض احترافي بجلسة واحدة بنتائج فورية وآمنة على المينا.', 'whitening'],
  ['تقويم الأسنان', 'تقويم معدني وشفاف لتصحيح اصطفاف الأسنان وإطباق الفكين.', 'braces'],
  ['زراعة الأسنان', 'زراعات بمواد عالمية لتعويض الأسنان المفقودة بثبات دائم.', 'implant'],
  ['التركيبات والتيجان', 'تيجان زيركون وفينير بمظهر طبيعي ومتانة عالية.', 'crown'],
  ['علاج جذور الأسنان', 'علاج عصب دقيق وغير مؤلم للحفاظ على سنّك الطبيعي.', 'root'],
  ['تنظيف وتلميع', 'إزالة الجير والتصبغات مع تلميع يعيد لمعان الأسنان.', 'cleaning'],
  ['الحشوات التجميلية', 'حشوات بلون السن لعلاج التسوس دون التأثير على المظهر.', 'filling'],
  ['أسنان الأطفال', 'رعاية لطيفة ومحببة للأطفال في بيئة مريحة وآمنة.', 'kids'],
]

async function run() {
  console.log(`📡 المشروع: ${projectId} / ${dataset}`)

  await client.createOrReplace(settings)
  console.log('✅ إعدادات الموقع')

  const tx = client.transaction()
  services.forEach(([title, description, icon], i) => {
    tx.createIfNotExists({
      _id: `service-${i + 1}`,
      _type: 'service',
      title,
      description,
      icon,
      order: i + 1,
    })
  })
  await tx.commit()
  console.log(`✅ ${services.length} خدمات`)

  console.log('\n🎉 تم. افتح اللوحة بـ npm run dev وأضف الصور والحالات والأطباء.')
}

run().catch((e) => {
  console.error('❌ فشل:', e.message)
  process.exit(1)
})
