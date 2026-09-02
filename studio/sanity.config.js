import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// المعرف مكتوب مباشرة ليعمل دائماً حتى بدون ملف .env،
// وهو نفس المعرف المضبوط في index.html — لا تغيّره إلا في المكانين معاً.
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'upxb9w10'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

export default defineConfig({
  name: 'oras',
  title: 'لوحة تحكم عيادة أوراس',
  projectId,
  dataset,

  plugins: [
    structureTool({
      title: 'المحتوى',
      structure: (S) =>
        S.list()
          .title('المحتوى')
          .items([
            // إعدادات الموقع كمستند واحد فقط (singleton)
            S.listItem()
              .title('⚙️ إعدادات الموقع')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
                  .title('إعدادات الموقع'),
              ),
            S.divider(),
            S.documentTypeListItem('heroSlide').title('🎠 شرائح الواجهة'),
            S.documentTypeListItem('service').title('🦷 الخدمات'),
            S.documentTypeListItem('caseStudy').title('✨ الحالات (قبل / بعد)'),
            S.documentTypeListItem('galleryItem').title('🖼️ نشاط العيادة'),
            S.documentTypeListItem('doctor').title('👩‍⚕️ الأطباء'),
            S.divider(),
            S.documentTypeListItem('review').title('⭐ آراء المرضى (التقييمات)'),
            S.documentTypeListItem('partner').title('🤝 الشراكات'),
          ]),
    }),
    visionTool({defaultApiVersion: '2024-01-01'}),
  ],

  schema: {
    types: schemaTypes,
    // منع إنشاء نسخ متعددة من الإعدادات
    templates: (prev) => prev.filter((t) => t.schemaType !== 'siteSettings'),
  },

  document: {
    // إخفاء أوامر الحذف/النسخ من مستند الإعدادات
    actions: (input, {schemaType}) =>
      schemaType === 'siteSettings'
        ? input.filter(({action}) => !['unpublish', 'delete', 'duplicate'].includes(action))
        : input,
  },
})
