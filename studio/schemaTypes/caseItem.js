export default {
  name: 'caseItem',
  title: 'الحالات (قبل / بعد)',
  type: 'document',
  fields: [
    {name: 'title', title: 'عنوان الحالة', type: 'string', validation: (R) => R.required()},
    {name: 'description', title: 'الوصف', type: 'text', rows: 3},
    {
      name: 'beforeImage',
      title: 'صورة قبل',
      type: 'image',
      options: {hotspot: true},
      validation: (R) => R.required(),
    },
    {
      name: 'afterImage',
      title: 'صورة بعد',
      type: 'image',
      options: {hotspot: true},
      validation: (R) => R.required(),
    },
    {
      name: 'chips',
      title: 'وسوم صغيرة',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      description: 'مثال: جلسة واحدة — بدون ألم — نتيجة فورية',
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0},
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'description', media: 'afterImage', order: 'order'},
    prepare: ({title, subtitle, media, order}) => ({
      title: `${order ?? '—'}. ${title}`,
      subtitle,
      media,
    }),
  },
}
