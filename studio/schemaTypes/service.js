export const SERVICE_ICONS = [
  {title: '🦷 تبييض', value: 'whitening'},
  {title: '😬 تقويم', value: 'braces'},
  {title: '🔩 زراعة', value: 'implant'},
  {title: '👑 تركيبات / تيجان', value: 'crown'},
  {title: '🩺 علاج جذور', value: 'root'},
  {title: '✨ تنظيف', value: 'cleaning'},
  {title: '🧱 حشوات', value: 'filling'},
  {title: '🧒 أسنان الأطفال', value: 'kids'},
  {title: '🦷 عام (افتراضي)', value: 'tooth'},
]

export default {
  name: 'service',
  title: 'الخدمات',
  type: 'document',
  fields: [
    {name: 'title', title: 'اسم الخدمة', type: 'string', validation: (R) => R.required()},
    {name: 'description', title: 'الوصف', type: 'text', rows: 3},
    {
      name: 'icon',
      title: 'الأيقونة',
      type: 'string',
      options: {list: SERVICE_ICONS, layout: 'dropdown'},
      initialValue: 'tooth',
      description: 'الأيقونات مرسومة داخل الموقع — اختر الأقرب للخدمة',
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
    select: {title: 'title', subtitle: 'description', order: 'order'},
    prepare: ({title, subtitle, order}) => ({
      title: `${order ?? '—'}. ${title}`,
      subtitle,
    }),
  },
}
