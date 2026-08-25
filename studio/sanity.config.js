import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

// معرف المشروع يُقرأ من ملف .env (SANITY_STUDIO_PROJECT_ID)
const projectId = process.env.SANITY_STUDIO_PROJECT_ID
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
            S.documentTypeListItem('service').title('🦷 الخدمات'),
            S.documentTypeListItem('caseItem').title('✨ الحالات (قبل / بعد)'),
            S.documentTypeListItem('galleryItem').title('🖼️ معرض الصور'),
            S.documentTypeListItem('doctor').title('👩‍⚕️ الأطباء'),
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
