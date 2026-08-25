export default {
  name: 'galleryItem',
  title: 'معرض الصور',
  type: 'document',
  fields: [
    {
      name: 'image',
      title: 'الصورة',
      type: 'image',
      options: {hotspot: true},
      validation: (R) => R.required(),
    },
    {name: 'caption', title: 'التعليق', type: 'string'},
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
