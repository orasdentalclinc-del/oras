export default {
  name: 'heroSlide',
  title: 'شرائح الواجهة',
  type: 'document',
  description:
    'صور الواجهة المتحركة أعلى الموقع — تتنقل بالسحب وتعود للأولى تلقائياً. إن لم توجد أي شريحة مفعّلة يستخدم الموقع صورة الواجهة مع صور «نشاط العيادة» تلقائياً.',
  fields: [
    {
      name: 'image',
      title: 'الصورة',
      type: 'image',
      options: {hotspot: true},
      validation: (R) => R.required(),
    },
    {
      name: 'alt',
      title: 'وصف الصورة (نص بديل)',
      type: 'string',
      description: 'مثال: استقبال العيادة — يُستخدم للوصولية وتحسين محركات البحث',
    },
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
    select: {title: 'alt', media: 'image', order: 'order'},
    prepare: ({title, media, order}) => ({
      title: `${order ?? '—'}. ${title || 'شريحة'}`,
      media,
    }),
  },
}
