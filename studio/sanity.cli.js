import {defineCliConfig} from 'sanity/cli'

// معرف المشروع مكتوب مباشرة هنا عن قصد:
// أوامر sanity (deploy/build) تقرأ هذا الملف قبل تحميل .env،
// لذا الاعتماد على process.env يسبب خطأ "does not contain a project identifier".
// المعرف ليس سرياً — يظهر أصلاً في كود الموقع وفي روابط الصور.
export default defineCliConfig({
  api: {
    projectId: 'upxb9w10',
    dataset: 'production',
  },

  // false = يستخدم النسخة المثبّتة في node_modules (أسرع وأكثر ثباتاً)
  autoUpdates: false,

  // يسمح بفتح اللوحة أثناء التطوير عبر نطاق خارجي (لا يؤثر على النشر)
  vite: (config) => ({
    ...config,
    server: {...config.server, host: true, allowedHosts: true},
  }),
})
