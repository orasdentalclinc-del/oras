/**
 * أوراس التعليمية — الملفات والأدلة التعليمية.
 * كل مستند = ملف واحد (PDF/Word/صورة…) أو رابط خارجي، يُعرض على الزوار
 * في صفحة «دليل مرضى أوراس» أو «دليل أطباء الأسنان» حسب حقل «القسم».
 *
 * الحقول التي يقرأها الموقع في oras-edu.js:
 *   title        → اسم الملف (عنوان البطاقة)
 *   audience     → القسم: patients (دليل المرضى) أو dentists (دليل الأطباء)
 *   description  → وصف مختصر يظهر تحت العنوان
 *   category     → تصنيف اختياري يظهر كشارة صغيرة
 *   file         → الملف المرفوع (PDF/Word/صورة…) — يفتحه الزائر أو يحمّله
 *   linkUrl      → بديل: رابط خارجي (مثل Google Drive) إن لم يُرفع ملف
 *   thumbnail    → صورة مصغّرة اختيارية للبطاقة
 *   isActive     → يظهر في الموقع فقط إذا كان مفعّلاً
 *   order        → الترتيب (الأصغر أولاً)
 *   publishedAt  → تاريخ النشر (يُعرض على البطاقة)
 */
export default {
  name: 'educationFile',
  title: 'أوراس التعليمية — الملفات',
  type: 'document',
  description:
    'ملف تعليمي يُعرض في صفحات «أوراس التعليمية»: ارفع الملف (PDF/Word/صورة…) أو ضع رابطاً خارجياً، واختر القسم (المرضى أو الأطباء).',
  fields: [
    {
      name: 'title',
      title: 'اسم الملف',
      type: 'string',
      description: 'العنوان الذي يراه الزائر على البطاقة. مثال: دليل العناية بعد التبييض',
      validation: (R) => R.required(),
    },
    {
      name: 'audience',
      title: 'القسم',
      type: 'string',
      description: 'أين يظهر هذا الملف؟',
      options: {
        layout: 'radio',
        list: [
          {title: '🙂 دليل مرضى أوراس', value: 'patients'},
          {title: '🦷 دليل أطباء الأسنان', value: 'dentists'},
        ],
      },
      initialValue: 'patients',
      validation: (R) => R.required(),
    },
    {
      name: 'description',
      title: 'الوصف المختصر',
      type: 'text',
      rows: 3,
      description: 'سطر أو سطران يظهران تحت العنوان لتعريف الزائر بمحتوى الملف.',
    },
    {
      name: 'category',
      title: 'التصنيف (اختياري)',
      type: 'string',
      description: 'شارة صغيرة على البطاقة. مثال: العناية اليومية، ما بعد العلاج، تدريب مهاري، تحديثات علمية.',
    },
    {
      name: 'file',
      title: 'الملف',
      type: 'file',
      description: 'ارفع الملف هنا (PDF أو Word أو PowerPoint أو صورة…). الزائر يفتحه أو يحمّله مباشرة.',
      validation: (R) =>
        R.custom((value, context) => {
          const parent = context.parent || {}
          if (!value && !parent.linkUrl) return 'ارفع ملفاً هنا أو ضع رابطاً خارجياً في الحقل أدناه — واحد منهما مطلوب'
          return true
        }),
    },
    {
      name: 'linkUrl',
      title: 'رابط خارجي (اختياري)',
      type: 'url',
      description: 'بديل عن رفع الملف: رابط خارجي (مثل رابط Google Drive أو فيديو). إن وُضع الملف أعلاه يُتجاهل الرابط.',
      validation: (R) =>
        R.custom((value, context) => {
          const parent = context.parent || {}
          if (!value && !parent.file) return 'ضع رابطاً خارجياً هنا أو ارفع ملفاً في الحقل أعلاه — واحد منهما مطلوب'
          return true
        }),
    },
    {
      name: 'thumbnail',
      title: 'صورة مصغّرة (اختياري)',
      type: 'image',
      options: {hotspot: false},
      description: 'صورة تظهر أعلى البطاقة. إن تُركت فارغة تظهر أيقونة حسب نوع الملف.',
    },
    {
      name: 'isActive',
      title: 'مفعّل (يظهر في الموقع)',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'order',
      title: 'الترتيب',
      type: 'number',
      initialValue: 0,
      description: 'الأصغر يظهر أولاً.',
    },
    {
      name: 'publishedAt',
      title: 'تاريخ النشر',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      description: 'يُعرض على البطاقة (يمكن تغييره يدوياً).',
    },
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      audience: 'audience',
      media: 'thumbnail',
      order: 'order',
      isActive: 'isActive',
    },
    prepare: ({title, category, audience, media, order, isActive}) => {
      const aud = audience === 'dentists' ? '🦷 أطباء' : '🙂 مرضى'
      const off = isActive === false ? ' — مخفي' : ''
      return {
        title: `${order ?? '—'}. ${title}`,
        subtitle: `${aud}${category ? ' — ' + category : ''}${off}`,
        media,
      }
    },
  },
}
