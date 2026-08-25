#!/usr/bin/env bash
# تشغيل لوحة تحكم عيادة أوراس — لينكس / ماك
set -e
cd "$(dirname "$0")"

echo "🦷 لوحة تحكم عيادة أوراس"
echo "═══════════════════════════"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js غير مثبّت. نزّله من https://nodejs.org (اختر LTS)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ تم إنشاء .env"
fi

if [ ! -d node_modules ]; then
  echo "📦 تحميل المكتبات (٢-٣ دقائق، مرة واحدة فقط)..."
  npm install
fi

# اختيار منفذ حر تلقائياً إن كان 3333 مشغولاً
PORT=3333
while node -e "require('net').createServer().listen($PORT).on('error',()=>process.exit(1)).on('listening',function(){this.close();process.exit(0)})" 2>/dev/null; [ $? -ne 0 ]; do
  PORT=$((PORT+1))
  [ "$PORT" -gt 3350 ] && { echo "❌ لا يوجد منفذ متاح"; exit 1; }
done

echo ""
echo "🔑 إن طُلب منك تسجيل الدخول شغّل:  npx sanity login"
echo "🚀 اللوحة على: http://localhost:$PORT"
echo "   (للإيقاف اضغط Ctrl+C)"
echo ""
npx sanity dev --port "$PORT"
