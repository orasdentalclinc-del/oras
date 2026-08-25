import {CogIcon} from '@sanity/icons'

export default {
  name: 'siteSettings',
  title: 'إعدادات الموقع',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'brand', title: 'الهوية'},
    {name: 'hero', title: 'الواجهة'},
    {name: 'about', title: 'من نحن'},
    {name: 'titles', title: 'عناوين الأقسام'},
    {name: 'contact', title: 'الاتصال والموقع'},
  ],
  fields: [
    // ===== الهوية =====
    {
      name: 'clinicFullName',
      title: 'الاسم الكامل للعيادة',
      type: 'string',
      group: 'brand',
      initialValue: 'عيادة أوراس لطب الأسنان',
      description: 'يظهر في عنوان الصفحة وحقوق النشر ورسائل واتساب',
    },
    {
      name: 'clinicShortName',
      title: 'الاسم المختصر (في الشعار)',
      type: 'string',
      group: 'brand',
      initialValue: 'أوراس',
    },
    {
      name: 'clinicSubName',
      title: 'السطر الصغير تحت الشعار',
      type: 'string',
      group: 'brand',
      initialValue: 'لطب الأسنان',
    },
    {
      name: 'footDesc',
      title: 'نبذة في التذييل',
      type: 'text',
      rows: 3,
      group: 'brand',
    },

    // ===== الواجهة =====
    {name: 'heroBadge', title: 'الشارة العلوية', type: 'string', group: 'hero'},
    {name: 'heroTitle1', title: 'العنوان الرئيسي — السطر الأول', type: 'string', group: 'hero'},
    {name: 'heroTitle2', title: 'العنوان الرئيسي — السطر المميّز (ذهبي)', type: 'string', group: 'hero'},
    {name: 'heroSub', title: 'النص التعريفي', type: 'text', rows: 3, group: 'hero'},
    {
      name: 'heroImage',
      title: 'صورة الواجهة',
      type: 'image',
      options: {hotspot: true},
      group: 'hero',
      description: 'يُفضّل صورة عمودية عالية الجودة (مثلاً 900×1200)',
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
    {name: 'aboutText1', title: 'الفقرة الأولى', type: 'text', rows: 4, group: 'about'},
    {name: 'aboutText2', title: 'الفقرة الثانية', type: 'text', rows: 4, group: 'about'},
    {name: 'aboutYears', title: 'رقم سنوات الخبرة', type: 'string', group: 'about'},
    {name: 'aboutYearsLabel', title: 'وصف سنوات الخبرة', type: 'string', group: 'about'},
    {name: 'aboutImage', title: 'صورة قسم من نحن', type: 'image', options: {hotspot: true}, group: 'about'},

    // ===== عناوين الأقسام =====
    {name: 'servicesTitle', title: 'عنوان الخدمات', type: 'string', group: 'titles'},
    {name: 'servicesTitleHi', title: 'عنوان الخدمات — الجزء الذهبي', type: 'string', group: 'titles'},
    {name: 'servicesLead', title: 'وصف الخدمات', type: 'text', rows: 2, group: 'titles'},

    {name: 'casesTitle', title: 'عنوان الحالات', type: 'string', group: 'titles'},
    {name: 'casesTitleHi', title: 'عنوان الحالات — الجزء الذهبي', type: 'string', group: 'titles'},
    {name: 'casesLead', title: 'وصف الحالات', type: 'text', rows: 2, group: 'titles'},

    {name: 'galleryTitle', title: 'عنوان المعرض', type: 'string', group: 'titles'},
    {name: 'galleryTitleHi', title: 'عنوان المعرض — الجزء الذهبي', type: 'string', group: 'titles'},
    {name: 'galleryLead', title: 'وصف المعرض', type: 'text', rows: 2, group: 'titles'},

    {name: 'doctorsTitle', title: 'عنوان الأطباء', type: 'string', group: 'titles'},
    {name: 'doctorsTitleHi', title: 'عنوان الأطباء — الجزء الذهبي', type: 'string', group: 'titles'},
    {name: 'doctorsLead', title: 'وصف الأطباء', type: 'text', rows: 2, group: 'titles'},

    {name: 'bookingTitle', title: 'عنوان الحجز', type: 'string', group: 'titles'},
    {name: 'bookingTitleHi', title: 'عنوان الحجز — الجزء الذهبي', type: 'string', group: 'titles'},
    {name: 'bookingLead', title: 'وصف الحجز', type: 'text', rows: 2, group: 'titles'},

    // ===== الاتصال =====
    {
      name: 'whatsapp',
      title: 'رقم واتساب',
      type: 'string',
      group: 'contact',
      description: 'بصيغة دولية بدون + وبدون مسافات. مثال: 249912345678',
      validation: (R) =>
        R.regex(/^[0-9]{8,15}$/, {name: 'أرقام فقط'}).warning('اكتب أرقاماً فقط بدون + أو مسافات'),
    },
    {
      name: 'phone',
      title: 'رقم الهاتف (للعرض)',
      type: 'string',
      group: 'contact',
      description: 'كما تريد ظهوره على الموقع. مثال: ‎+249 91 234 5678',
    },
    {name: 'email', title: 'البريد الإلكتروني', type: 'string', group: 'contact'},

    {name: 'addressTitle', title: 'العنوان — السطر الأول', type: 'string', group: 'contact'},
    {name: 'addressSub', title: 'العنوان — السطر الثاني', type: 'string', group: 'contact'},
    {name: 'addressFull', title: 'العنوان الكامل (التذييل)', type: 'string', group: 'contact'},
    {
      name: 'mapQuery',
      title: 'موقع الخريطة',
      type: 'string',
      group: 'contact',
      description: 'اسم المكان أو الإحداثيات. مثال: 15.5527,32.5599 أو: عيادة أوراس شارع الستين الخرطوم',
    },
    {name: 'mapNote', title: 'ملاحظة أسفل الخريطة', type: 'string', group: 'contact'},

    {name: 'hoursWeekLabel', title: 'أيام الدوام — التسمية', type: 'string', group: 'contact'},
    {name: 'hoursWeek', title: 'أيام الدوام — الوقت', type: 'string', group: 'contact'},
    {name: 'hoursFriLabel', title: 'يوم العطلة — التسمية', type: 'string', group: 'contact'},
    {name: 'hoursFri', title: 'يوم العطلة — الوقت', type: 'string', group: 'contact'},
    {name: 'footHours', title: 'الدوام في التذييل', type: 'string', group: 'contact'},
  ],
  preview: {
    prepare: () => ({title: 'إعدادات الموقع'}),
  },
}
