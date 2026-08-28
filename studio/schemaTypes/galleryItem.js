export default {
  name: 'galleryItem',
  title: 'نشاط العيادة',
  type: 'document',
  description: 'صور من داخل العيادة — تظهر في قسم «نشاط العيادة» (المعروف سابقاً بمعرض العيادة)',
  fields: [
    {
      name: 'image',
      title: 'الصورة',
      type: 'image',
      options: {hotspot: true},
      validation: (R) => R.required(),
    },
    {name: 'caption', title: 'التعليق', type: 'string'},
    {
      name: 'isActive',
      title: 'مفعّلة (تظهر في الموقع)',
      type: 'boolean',
      initialValue: true,
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0},
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'caption', media: 'image', order: 'order'},
    prepare: ({title, media, order}) => ({
      title: `${order ?? '—'}. ${title || 'صورة'}`,
      media,
    }),
  },
}
