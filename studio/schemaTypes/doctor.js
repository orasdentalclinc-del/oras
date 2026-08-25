export default {
  name: 'doctor',
  title: 'الأطباء',
  type: 'document',
  fields: [
    {name: 'name', title: 'الاسم', type: 'string', validation: (R) => R.required()},
    {name: 'role', title: 'التخصص', type: 'string'},
    {name: 'bio', title: 'نبذة', type: 'text', rows: 3},
    {name: 'badge', title: 'وسام / شارة', type: 'string', description: 'مثال: خبرة 12 سنة'},
    {
      name: 'photo',
      title: 'الصورة الشخصية',
      type: 'image',
      options: {hotspot: true},
      description: 'اختيارية — إن تُركت فارغة يظهر الحرف الأول بتصميم ذهبي',
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0},
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'role', media: 'photo', order: 'order'},
    prepare: ({title, subtitle, media, order}) => ({
      title: `${order ?? '—'}. ${title}`,
      subtitle,
      media,
    }),
  },
}
