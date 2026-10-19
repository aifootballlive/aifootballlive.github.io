@echo off
setlocal EnableExtensions
chcp 65001 >nul
title AI Football TikTok Hediye Baglantisi
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js bilgisayarda bulunamadi. Once Node.js LTS kurun: https://nodejs.org/
 pause
 exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
 echo npm bilgisayarda bulunamadi. Node.js LTS kurulumunu kontrol edin.
 pause
 exit /b 1
)
if not exist "node_modules\tiktok-live-connector" (
 echo TikTok baglanti kutuphanesi kuruluyor...
 call npm install
 if errorlevel 1 (
  echo Kutuphane yuklenemedi. Internet baglantinizi kontrol edin.
  pause
  exit /b 1
 )
)
echo.
echo TikTok LIVE hediyelerini futbol macina baglar.
echo Canli yayin TikTok kullanici adinizi girin.
echo Kullanici adi @ ile veya @ olmadan yazilabilir.
set /p "TIKTOK_NAME=TikTok kullanici adi: "
if "%TIKTOK_NAME%"=="" (
 echo Kullanici adi bos birakilamaz.
 pause
 exit /b 2
)
echo.
echo Oyunun yonetici sayfasini bu bilgisayarda MFA ile acik tutun.
echo Kopruyu durdurmak icin Ctrl+C kullanin.
echo.
call npm run tiktok:bridge -- --username "%TIKTOK_NAME%"
echo.
echo Baglanti kapandi. Yeniden baslatmak icin dosyaya cift tiklayin.
pause
