import {SERVICE_ICONS} from './serviceIcons'

export default {
  name: 'service',
  title: 'الخدمات',
  type: 'document',
  fields: [
    {name: 'title', title: 'اسم الخدمة', type: 'string', validation: (R) => R.required()},
    {name: 'summary', title: 'الوصف المختصر', type: 'text', rows: 3},
    {
      name: 'icon',
      title: 'الأيقونة',
      type: 'string',
      options: {list: SERVICE_ICONS, layout: 'dropdown'},
      initialValue: 'tooth',
      description: 'الأيقونات مرسومة داخل الموقع — اختر الأقرب للخدمة (إن رفعّت شعاراً بصورة فهو يتقدم عليها)',
    },
    {
      name: 'image',
      title: 'لوغو الخدمة (صورة)',
      type: 'image',
      options: {hotspot: false},
      description: 'اختياري — ارفع شعار الخدمة (يُفضّل صورة مربعة بخلفية شفافة PNG/SVG). إن تُرك فارغاً تظهر الأيقونة أعلاه.',
    },
    {
      name: 'isActive',
      title: 'مفعّلة (تظهر في الموقع)',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'showInBookingForm',
      title: 'تظهر في قائمة نموذج الحجز',
      type: 'boolean',
      initialValue: true,
    },
    {name: 'price', title: 'السعر', type: 'string', description: 'مثال: 150,000 SDG'},
    {name: 'priceNote', title: 'ملاحظة السعر', type: 'string', description: 'مثال: يبدأ من… حسب الحالة'},
    {name: 'duration', title: 'مدة الجلسة', type: 'string', description: 'مثال: 45 دقيقة'},
    {name: 'sessionsCount', title: 'عدد الجلسات', type: 'string', description: 'مثال: جلسة إلى جلستين'},
    {
      name: 'details',
      title: 'التفاصيل',
      type: 'array',
      of: [{type: 'block'}],
      description: 'تظهر في نافذة تفاصيل الخدمة عند الضغط على البطاقة',
    },
    {
      name: 'includes',
      title: 'ماذا تشمل الخدمة',
      type: 'array',
      of: [{type: 'string'}],
    },
    {
      name: 'order',
      title: 'الترتيب',
      type: 'number',
      description: 'الأصغر يظهر أولاً',
      initialValue: 0,
    },
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'summary', order: 'order', media: 'image'},
    prepare: ({title, subtitle, order, media}) => ({
      title: `${order ?? '—'}. ${title}`,
      subtitle,
      media,
    }),
  },
}
