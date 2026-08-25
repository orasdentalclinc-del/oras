import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  // false = يستخدم النسخة المثبّتة في node_modules (أسرع وأكثر ثباتاً)
  autoUpdates: false,

  // يسمح بفتح اللوحة أثناء التطوير عبر نطاق معاينة خارجي.
  // لا يؤثر على النسخة المنشورة عبر sanity deploy.
  vite: (config) => ({
    ...config,
    server: {...config.server, host: true, allowedHosts: true},
  }),
})
