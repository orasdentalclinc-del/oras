import {UsersIcon} from '@sanity/icons'

/**
 * الشراكات — شعارات وتفاصيل الشركاء.
 * يظهر قسم الشراكات في الموقع تلقائياً بعد إضافة أول شريك وضغط Publish.
 */
export default {
  name: 'partner',
  title: 'الشراكات',
  type: 'document',
  icon: UsersIcon,
  fields: [
    {name: 'name', title: 'اسم الشريك', type: 'string', validation: (R) => R.required()},
    {
      name: 'logo',
      title: 'الشعار',
      type: 'image',
      options: {hotspot: false},
      description: 'يُفضّل شعار بخلفية شفافة (PNG/SVG مربّع)',
    },
    {
      name: 'description',
      title: 'نبذة عن الشراكة',
      type: 'text',
      rows: 3,
      description: 'مثال: مورد معتمد لمواد التركيبات، أو مخبر أسنان شريك…',
    },
    {name: 'url', title: 'رابط الموقع (اختياري)', type: 'url'},
    {
      name: 'isActive',
      title: 'مفعّل (يظهر في الموقع)',
      type: 'boolean',
      initialValue: true,
    },
    {name: 'order', title: 'الترتيب', type: 'number', initialValue: 0, description: 'الأصغر يظهر أولاً'},
  ],
  orderings: [{title: 'الترتيب', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'description', media: 'logo', order: 'order'},
    prepare: ({title, subtitle, media, order}) => ({
      title: `${order ?? '—'}. ${title}`,
      subtitle,
      media,
    }),
  },
}
