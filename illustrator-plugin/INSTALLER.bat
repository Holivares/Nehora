@echo off
echo ============================================
echo  Nehora — Installation du plugin Illustrator
echo ============================================
echo.

:: Destination CEP
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.nehora.gridit"

:: Copier le plugin
echo Installation dans : %DEST%
if not exist "%DEST%" mkdir "%DEST%"
xcopy /E /I /Y "%~dp0com.nehora.gridit" "%DEST%"

echo.
echo Activation du mode debug CEP pour extensions non signees...

:: Activer PlayerDebugMode pour CEP 11 (CC 2024) et 12 (CC 2025)
reg add "HKCU\SOFTWARE\Adobe\CSXS.11" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.12" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.10" /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1
reg add "HKCU\SOFTWARE\Adobe\CSXS.9"  /v "PlayerDebugMode" /t REG_SZ /d "1" /f >nul 2>&1

echo.
echo ============================================
echo  Installation terminee !
echo ============================================
echo.
echo Etapes suivantes :
echo  1. Redemarrez Adobe Illustrator
echo  2. Menu Fenetre ^> Extensions ^> Nehora — Logo Grid
echo.
pause
