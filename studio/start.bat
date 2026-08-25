@echo off
REM تشغيل لوحة تحكم عيادة أوراس - ويندوز
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   لوحة تحكم عيادة أوراس
echo   ==========================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js غير مثبّت. نزّله من https://nodejs.org
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [OK] تم إنشاء ملف .env
)

if not exist "node_modules" (
  echo [..] تحميل المكتبات ^(٢-٣ دقائق، مرة واحدة فقط^)...
  call npm install
)

REM اختيار منفذ حر تلقائياً إن كان 3333 مشغولاً
set PORT=3333
for /l %%i in (3333,1,3350) do (
  netstat -an | find ":%%i " | find "LISTENING" >nul 2>nul
  if errorlevel 1 (
    set PORT=%%i
    goto :found
  )
)
:found

echo.
echo   إن طُلب تسجيل الدخول شغّل:  npx sanity login
echo   اللوحة على: http://localhost:%PORT%
echo   ^(للإيقاف اضغط Ctrl+C^)
echo.
call npx sanity dev --port %PORT%
pause
