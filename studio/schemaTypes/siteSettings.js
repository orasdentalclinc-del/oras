import {CogIcon} from '@sanity/icons'

/**
 * إعدادات الموقع — مستند واحد فقط (singleton).
 * أسماء الحقول هنا تطابق تماماً ما يقرؤه الموقع في oras-sanity.js —
 * لا تغيّر أسماء الحقول إلا مع تعديل الملف المقابل في الموقع.
 */
export default {
  name: 'siteSettings',
  title: 'إعدادات الموقع',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'brand', title: 'الهوية', default: true},
    {name: 'hero', title: 'الواجهة'},
    {name: 'about', title: 'من نحن'},
    {name: 'contact', title: 'الاتصال ومواقع التواصل'},
    {name: 'backgrounds', title: 'خلفيات الأقسام'},
    {name: 'survey', title: 'استبيان الزوار'},
    {name: 'headings', title: 'عناوين الأقسام'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    // ===== الهوية =====
    {name: 'clinicName', title: 'اسم العيادة', type: 'string', group: 'brand',
      description: 'يظهر في التذييل وفي رسائل واتساب'},
    {name: 'tagline', title: 'الوصف المختصر (الشارة العلوية)', type: 'string', group: 'brand'},
    {
      name: 'logo',
      title: 'الشعار',
      type: 'image',
      options: {hotspot: true},
      group: 'brand',
    },

    // ===== الواجهة =====
    {name: 'heroTitle', title: 'العنوان الرئيسي', type: 'string', group: 'hero'},
    {name: 'heroSubtitle', title: 'النص التعريفي', type: 'text', rows: 3, group: 'hero'},
    {
      name: 'heroImage',
      title: 'صورة الواجهة',
      type: 'image',
      options: {hotspot: true},
      group: 'hero',
      description: 'يُفضّل صورة عمودية عالية الجودة (مثلاً 900×1200)',
    },
    {
      name: 'heroHighlights',
      title: 'نقاط الثقة (أعلى الصفحة)',
      description: 'مثال: تعقيم بمعايير عالمية — أحدث التقنيات الرقمية…',
      type: 'array',
      of: [{type: 'string'}],
      group: 'hero',
    },
    {
      name: 'stats',
      title: 'شريط الأرقام',
      type: 'array',
      group: 'hero',
      of: [
        {
          type: 'object',
          name: 'stat',
          fields: [
            {name: 'value', title: 'الرقم', type: 'string', validation: (R) => R.required()},
            {name: 'label', title: 'الوصف', type: 'string', validation: (R) => R.required()},
          ],
          preview: {select: {title: 'value', subtitle: 'label'}},
        },
      ],
    },

    // ===== من نحن =====
    {name: 'aboutTitle', title: 'عنوان قسم من نحن', type: 'string', group: 'about'},
    {
      name: 'aboutBody',
      title: 'نص قسم من نحن',
      type: 'array',
      of: [{type: 'block'}],
      group: 'about',
    },
    {
      name: 'aboutImage',
      title: 'صورة قسم من نحن',
      type: 'image',
      options: {hotspot: true},
      group: 'about',
      description: 'تُستخدم كشريحة وحيدة إن لم تُضف شرائح في الحقل أدناه.',
    },
    {
      name: 'aboutSlides',
      title: 'شرائح «من نحن» (صورة + عنوان + وصف)',
      type: 'array',
      group: 'about',
      description:
        'تظهر في قسم «من نحن» كشرائح تتحرك عكس اتجاه صور الواجهة، وتحت كل صورة عنوانها ووصفها. إن تُركت فارغة تُستخدم الصور الافتراضية.',
      of: [
        {
          type: 'object',
          name: 'aboutSlide',
          fields: [
            {name: 'image', title: 'الصورة', type: 'image', options: {hotspot: true}},
            {name: 'title', title: 'العنوان', type: 'string', validation: (R) => R.required()},
            {name: 'description', title: 'الوصف', type: 'text', rows: 2},
          ],
          preview: {select: {title: 'title', subtitle: 'description', media: 'image'}},
        },
      ],
    },

    // ===== الاتصال =====
    {
      name: 'phone',
      title: 'رقم الهاتف (للعرض والاتصال المباشر)',
      type: 'string',
      group: 'contact',
      description: 'كما تريد ظهوره. مثال: ‎+249 91 234 5678 — يُستخدم في كل أزرار الاتصال tel:',
    },
    {
      name: 'whatsapp',
      title: 'رقم واتساب',
      type: 'string',
      group: 'contact',
      description: 'بصيغة دولية بدون + وبدون مسافات. مثال: 249912345678',
      validation: (R) =>
        R.regex(/^[0-9]{8,15}$/, {name: 'أرقام فقط'}).warning('اكتب أرقاماً فقط بدون + أو مسافات'),
    },
    {name: 'email', title: 'البريد الإلكتروني', type: 'string', group: 'contact'},
    {
      name: 'addressLine',
      title: 'العنوان',
      type: 'text',
      rows: 2,
      group: 'contact',
      description: 'السطر الأول ثم (اختيارياً) سطر ثانٍ للتفاصيل',
    },
    {
      name: 'mapEmbedUrl',
      title: 'رابط تضمين الخريطة (Embed)',
      type: 'url',
      group: 'contact',
      description: 'رابط google.com/maps بتنسيق output=embed — إن تُرك فارعاً يُبنى من العنوان',
    },
    {
      name: 'mapsUrl',
      title: 'رابط الاتجاهات',
      type: 'url',
      group: 'contact',
      description: 'يُفتح عند الضغط على «فتح الاتجاهات» — إن تُرك فارعاً يُبنى من العنوان',
    },
    {
      name: 'openingHours',
      title: 'أوقات العمل',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'hoursRow',
          fields: [
            {name: 'days', title: 'الأيام', type: 'string'},
            {name: 'hours', title: 'التوقيت', type: 'string'},
          ],
          preview: {select: {title: 'days', subtitle: 'hours'}},
        },
      ],
      group: 'contact',
    },
    {
      name: 'socialLinks',
      title: 'روابط مواقع التواصل الاجتماعي',
      description:
        'تظهر هذه الروابط في أيقونات التذييل وفي القائمة العائمة (فيسبوك، انستغرام، تيك توك). ملاحظة: واتساب يُدار من حقل «رقم واتساب»، والاتصال المباشر من حقل «رقم الهاتف» أعلاه.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'socialLink',
          fields: [
            {
              name: 'label',
              title: 'المنصة',
              type: 'string',
              options: {
                list: [
                  {title: 'فيسبوك', value: 'فيسبوك'},
                  {title: 'انستغرام', value: 'انستغرام'},
                  {title: 'تيك توك', value: 'تيك توك'},
                  {title: 'يوتيوب', value: 'يوتيوب'},
                  {title: 'إكس (تويتر)', value: 'تويتر'},
                  {title: 'سناب شات', value: 'سناب شات'},
                  {title: 'لينكد إن', value: 'لينكد إن'},
                  {title: 'تيليجرام', value: 'تيليجرام'},
                ],
                layout: 'dropdown',
              },
              validation: (R) => R.required(),
            },
            {
              name: 'url',
              title: 'الرابط',
              type: 'url',
              validation: (R) => R.required(),
            },
          ],
          preview: {select: {title: 'label', subtitle: 'url'}},
        },
      ],
      group: 'contact',
    },

    // ===== خلفيات الأقسام =====
    {
      name: 'sectionBackgrounds',
      title: 'صور خلفية الأقسام',
      description:
        'صورة خلفية اختيارية لكل قسم من أقسام الموقع. تُعرض خلف المحتوى مع ضبابية خفيفة وطبقة كريمية شفافة لإبقاء النصوص مقروءة. أي قسم يُترك فارغاً يستخدم الصورة الافتراضية. يُفضّل صور أفقية عالية الجودة (مثلاً 1600×900) بدون أشخاص.',
      type: 'object',
      group: 'backgrounds',
      options: {collapsible: true, collapsed: false},
      fields: [
        {
          name: 'hero',
          title: 'الرئيسية (الواجهة)',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'about',
          title: 'من نحن',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'services',
          title: 'خدماتنا',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'cases',
          title: 'الحالات',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'gallery',
          title: 'نشاط العيادة',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'reviews',
          title: 'آراء المرضى',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'doctors',
          title: 'الأطباء',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'partners',
          title: 'الشراكات',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'booking',
          title: 'الحجز',
          type: 'image',
          options: {hotspot: true},
        },
        {
          name: 'location',
          title: 'الموقع',
          type: 'image',
          options: {hotspot: true},
        },
      ],
    },

    // ===== استبيان الزوار (5 أسئلة) =====
    {
      name: 'surveyQuestions',
      title: 'أسئلة استبيان التقييم (5 أسئلة)',
      description:
        'تظهر هذه الأسئلة داخل نافذة «أضف تقييمك» في الموقع. اكتب حتى 5 أسئلة — وإن تُركت فارغة تُستخدم الأسئلة الافتراضية.',
      type: 'array',
      of: [{type: 'string'}],
      validation: (R) => R.max(5).warning('الاستبيان مصمم لـ 5 أسئلة كحد أقصى'),
      initialValue: [
        'ما مدى رضاك عن نظافة العيادة وتعقيم الأدوات؟',
        'كيف قيّم تعامل الطبيب وشرحه لحالتك؟',
        'ما مدى رضاك عن سرعة إنجاز الإجراء ودقته؟',
        'كيف وجدت سهولة الحجز والتنسيق للمواعيد؟',
        'ما مدى احتمالية ترشيح العيادة لأصدقائك؟',
      ],
      group: 'survey',
    },

    // ===== عناوين الأقسام =====
    {
      name: 'sectionHeadings',
      title: 'عناوين ووصف الأقسام',
      type: 'object',
      group: 'headings',
      fields: [
        {name: 'servicesTitle', title: 'الخدمات — العنوان', type: 'string'},
        {name: 'servicesIntro', title: 'الخدمات — الوصف', type: 'text', rows: 2},
        {name: 'casesTitle', title: 'الحالات — العنوان', type: 'string'},
        {name: 'casesIntro', title: 'الحالات — الوصف', type: 'text', rows: 2},
        {
          name: 'galleryTitle',
          title: 'نشاط العيادة — العنوان',
          type: 'string',
          description: 'هذا القسم كان يُسمى سابقاً «معرض العيادة»',
        },
        {name: 'galleryIntro', title: 'نشاط العيادة — الوصف', type: 'text', rows: 2},
        {name: 'reviewsTitle', title: 'آراء المرضى — العنوان', type: 'string'},
        {name: 'reviewsIntro', title: 'آراء المرضى — الوصف', type: 'text', rows: 2},
        {name: 'partnersTitle', title: 'الشراكات — العنوان', type: 'string'},
        {name: 'partnersIntro', title: 'الشراكات — الوصف', type: 'text', rows: 2},
        {name: 'doctorsTitle', title: 'الأطباء — العنوان', type: 'string'},
        {name: 'doctorsIntro', title: 'الأطباء — الوصف', type: 'text', rows: 2},
        {name: 'appointmentTitle', title: 'الحجز — العنوان', type: 'string'},
        {name: 'appointmentIntro', title: 'الحجز — الوصف', type: 'text', rows: 2},
      ],
    },

    // ===== SEO =====
    {
      name: 'seo',
      title: 'إعدادات محركات البحث',
      type: 'object',
      group: 'seo',
      fields: [
        {name: 'metaTitle', title: 'عنوان الصفحة (Title)', type: 'string'},
        {name: 'metaDescription', title: 'الوصف (Description)', type: 'text', rows: 2},
      ],
    },
  ],
  preview: {
    prepare: () => ({title: 'إعدادات الموقع'}),
  },
}
