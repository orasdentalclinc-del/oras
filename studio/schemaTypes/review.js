import {StarIcon} from '@sanity/icons'

/**
 * تقييمات المرضى — تُدار من هذه اللوحة:
 * • «معتمد» = يظهر التقييم على الموقع فوراً في قسم آراء المرضى.
 * • «قيد المراجعة» = لا يظهر على الموقع حتى اعتماده.
 * تصل التقييمات الجديدة من الموقع عبر واتساب، ثم يُضيفها صاحب العيادة هنا.
 */
const STATUS_OPTIONS = [
  {title: '⏳ قيد المراجعة (غير منشور)', value: 'pending'},
  {title: '✅ معتمد (منشور على الموقع)', value: 'approved'},
  {title: '🚫 مرفوض', value: 'rejected'},
]

export default {
  name: 'review',
  title: 'آراء المرضى',
  type: 'document',
  icon: StarIcon,
  fields: [
    {name: 'name', title: 'اسم المريض', type: 'string', validation: (R) => R.required()},
    {
      name: 'rating',
      title: 'التقييم (1 إلى 5 نجوم)',
      type: 'number',
      validation: (R) => R.required().min(1).max(5),
      options: {list: [1, 2, 3, 4, 5], layout: 'radio'},
    },
    {
      name: 'comment',
      title: 'التعليق',
      type: 'text',
      rows: 4,
      description: 'رأي المريض عن الخدمة — يظهر على الموقع',
    },
    {name: 'service', title: 'الخدمة (اختياري)', type: 'string', description: 'مثال: تبييض الأسنان'},
    {
      name: 'surveyAnswers',
      title: 'إجابات الاستبيان (5 أسئلة)',
      description: 'تُنسخ من رسالة واتساب المريض عند إضافة التقييم',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'answer',
          fields: [
            {name: 'question', title: 'السؤال', type: 'string'},
            {
              name: 'score',
              title: 'الدرجة (1-5)',
              type: 'number',
              options: {list: [1, 2, 3, 4, 5], layout: 'radio'},
            },
          ],
          preview: {
            select: {title: 'question', score: 'score'},
            prepare: ({title, score}) => ({
              title: title || 'سؤال',
              subtitle: score ? `${score}/5 ${'★'.repeat(score)}` : '—',
            }),
          },
        },
      ],
    },
    {
      name: 'status',
      title: 'الحالة',
      type: 'string',
      options: {list: STATUS_OPTIONS, layout: 'radio'},
      initialValue: 'pending',
      validation: (R) => R.required(),
      description: 'فقط التقييمات «المعتمدة» تظهر على الموقع',
    },
    {
      name: 'featured',
      title: 'مميّز',
      type: 'boolean',
      initialValue: false,
      description: 'التقييمات المميزة تظهر أولاً على الموقع',
    },
    {
      name: 'source',
      title: 'المصدر',
      type: 'string',
      initialValue: 'website',
      readOnly: true,
      description: 'من أين وصل التقييم — للإحصاء فقط',
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0, description: 'الأصغر يظهر أولاً'},
  ],
  orderings: [
    {
      title: 'الأولوية ثم التاريخ',
      name: 'orderAsc',
      by: [{field: 'order', direction: 'asc'}, {field: '_createdAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {name: 'name', rating: 'rating', comment: 'comment', status: 'status', featured: 'featured'},
    prepare: ({name, rating, comment, status, featured}) => {
      const stars = rating ? '★'.repeat(Math.max(1, Math.min(5, rating))) : '—'
      const statusLabel =
        status === 'approved' ? '✅ منشور' : status === 'rejected' ? '🚫 مرفوض' : '⏳ قيد المراجعة'
      return {
        title: `${stars} ${name || 'بدون اسم'}${featured ? '  ·  ⭐ مميّز' : ''}`,
        subtitle: `${statusLabel} — ${comment || 'بدون تعليق'}`.slice(0, 80),
      }
    },
  },
}
