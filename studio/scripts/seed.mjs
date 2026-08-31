/**
 * تهيئة لوحة التحكم بالمحتوى الافتراضي لموقع عيادة أوراس.
 * التشغيل:  npx sanity login   ثم   npm run seed
 *
 * آمن تماماً على المحتوى الموجود:
 *  • يستخدم setIfMissing — لا يستبدل أي قيمة أدخلتها أنت، يملأ الفراغات فقط.
 *  • لا ينشئ خدمات/حالات تجريبية لتجنب التكرار.
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

/* يُملأ كل حقل فقط إن كان فارغاً — لا يطغى على محتواك الحالي */
const defaults = {
  clinicName: 'عيادة أوراس لطب الأسنان',
  tagline: 'شارع الستين — الخرطوم',
  heroTitle: 'ابتسامتك تستحق عناية ذهبية',
  heroSubtitle:
    'رعاية متكاملة لأسنانك بأحدث الأجهزة الرقمية، وأطباء استشاريين، وبيئة هادئة نظيفة تشعر فيها بالاطمئنان من أول لحظة.',
  heroHighlights: ['تعقيم بمعايير عالمية', 'أحدث التقنيات الرقمية', 'حجز سهل خلال دقيقة'],
  aboutTitle: 'عيادة تشعر فيها بالراحة… قبل أن تجلس على الكرسي',
  phone: '+249 91 234 5678',
  whatsapp: '249912345678',
  email: 'info@orasdentalclinic.com',
  addressLine: 'شارع الستين\nالخرطوم، السودان',
  openingHours: [
    {days: 'السبت — الخميس', hours: '9:00 صباحاً — 9:00 مساءً'},
    {days: 'الجمعة', hours: 'حالات الطوارئ عبر الهاتف'},
  ],
  sectionHeadings: {
    galleryTitle: 'نشاط العيادة',
    reviewsTitle: 'تجارب مرضانا أثمن ما نملك',
    partnersTitle: 'نفخر بشراكات تخدم مرضانا',
  },
  surveyQuestions: [
    'ما مدى رضاك عن نظافة العيادة وتعقيم الأدوات؟',
    'كيف قيّم تعامل الطبيب وشرحه لحالتك؟',
    'ما مدى رضاك عن سرعة إنجاز الإجراء ودقته؟',
    'كيف وجدت سهولة الحجز والتنسيق للمواعيد؟',
    'ما مدى احتمالية ترشيح العيادة لأصدقائك؟',
  ],
  seo: {
    metaTitle: 'عيادة أوراس لطب الأسنان | شارع الستين — الخرطوم',
    metaDescription:
      'عيادة أوراس لطب الأسنان في شارع الستين بالخرطوم — تبييض، تقويم، زراعة، تركيبات وعناية متكاملة بأسنانك.',
  },
}

async function run() {
  console.log(`📡 المشروع: ${projectId} / ${dataset}`)

  await client
    .patch('siteSettings')
    .setIfMissing(defaults)
    .commit({autoGenerateArrayKeys: true})
    .then(() => console.log('✅ إعدادات الموقع — تم ملء الحقول الفارغة فقط'))
    .catch((e) => {
      if (String(e.message).includes('not found') || e.statusCode === 404) {
        return client
          .create({_id: 'siteSettings', _type: 'siteSettings', ...defaults}, {autoGenerateArrayKeys: true})
          .then(() => console.log('✅ إعدادات الموقع — أُنشئت من جديد'))
      }
      throw e
    })

  console.log('\n🎉 تم. افتح اللوحة بـ npm run dev ثم:')
  console.log('   • أضف صور الواجهة المتحركة من قسم «🎠 شرائح الواجهة» (ترتيب وتفعيل ووصف).')
  console.log('   • أضف الصور (الواجهة، من نحن) والخدمات والحالات والأطباء.')
  console.log('   • أضف الشركاء من قسم «🤝 الشراكات» ليظهر القسم على الموقع.')
  console.log('   • اعتمد التقييمات الواردة من «⭐ آراء المرضى» لتنشرها.')
  console.log('   • لا تنسَ الضغط على Publish بعد كل تعديل.')
}

run().catch((e) => {
  console.error('❌ فشل:', e.message)
  process.exit(1)
})
