/**
 * نشاط العيادة — بطاقة في قسم «نشاط العيادة» + ألبوم صور + نص تعريفي.
 * عند الضغط على البطاقة في الموقع تفتح نافذة الألبوم فوق الموقع (مع ضباب في الخلف):
 * النص التعريفي في الأعلى، ثم صور النشاط.
 *
 * الحقول التي يقرأها الموقع في oras-sanity.js:
 *   caption      → اسم النشاط (على البطاقة وكترويسة للألبوم)
 *   description  → النص التعريفي الذي يظهر أعلى صور الألبوم
 *   image        → صورة الغلاف (اختيارية — تُستخدم أول صورة من الألبوم إن تُركت فارغة)
 *   images       → ألبوم الصور (أكثر من صورة، ولكل صورة تعليق اختياري)
 */
export default {
  name: 'galleryItem',
  title: 'نشاط العيادة',
  type: 'document',
  description:
    'نشاط من داخل العيادة: صورة غلاف + ألبوم صور + نص تعريفي — يظهر في قسم «نشاط العيادة»، وبالضغط عليه يفتح ألبومه داخل نافذة فوق الموقع.',
  fields: [
    {
      name: 'caption',
      title: 'اسم النشاط',
      type: 'string',
      description: 'يظهر على البطاقة في الموقع، وكترويسة لألبوم الصور. مثال: ورشة التعقيم اليومي',
      validation: (R) => R.required(),
    },
    {
      name: 'description',
      title: 'النص التعريفي بالنشاط',
      type: 'text',
      rows: 4,
      description: 'يظهر أعلى صور الألبوم عند الضغط على النشاط في الموقع (فقرة أو فقرتان).',
    },
    {
      name: 'image',
      title: 'صورة الغلاف',
      type: 'image',
      options: {hotspot: true},
      description:
        'الصورة التي تظهر داخل شبكة القسم. اختيارية — إن تُركت فارغة تُستخدم أول صورة من الألبوم.',
    },
    {
      name: 'images',
      title: 'ألبوم الصور (يمكن إضافة أكثر من صورة)',
      type: 'array',
      description:
        'كل صور هذا النشاط. الصورة الغلاف تُعرض أولاً تلقائياً ثم بقية الصور بالترتيب الذي تضعه هنا.',
      of: [
        {
          type: 'image',
          name: 'albumPhoto',
          title: 'صورة',
          options: {hotspot: true},
          fields: [
            {
              name: 'caption',
              title: 'تعليق الصورة (اختياري)',
              type: 'string',
              description: 'يظهر أسفل الصورة داخل الألبوم',
            },
          ],
        },
      ],
      validation: (R) => R.max(24).warning('٢٤ صورة تكفي — كلما قلّت الصور كان الألبوم أسرع'),
    },
    {
      name: 'isActive',
      title: 'مفعّلة (تظهر في الموقع)',
      type: 'boolean',
      initialValue: true,
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0},
  ],
  /* لا بد من صورة واحدة على الأقل: إما الغلاف أو صورة داخل الألبوم */
  validation: (R) =>
    R.custom((doc) => {
      if (!doc) return true
      const hasCover = Boolean(doc.image && (doc.image.asset || doc.image._ref))
      const hasAlbum = Array.isArray(doc.images) && doc.images.length > 0
      return hasCover || hasAlbum
        ? true
        : 'أضف صورة الغلاف أو صورة واحدة على الأقل داخل «ألبوم الصور»'
    }),
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {
      title: 'caption',
      media: 'image',
      firstPhoto: 'images.0',
      photos: 'images',
      order: 'order',
    },
    prepare: ({title, media, firstPhoto, photos, order}) => {
      const count = Array.isArray(photos) ? photos.length : 0
      return {
        title: `${order ?? '—'}. ${title || 'نشاط'}`,
        subtitle: count ? `ألبوم: ${count} ${count === 1 ? 'صورة' : 'صور'}` : 'بدون ألبوم',
        media: media || firstPhoto,
      }
    },
  },
}
