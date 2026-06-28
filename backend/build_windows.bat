@echo off
echo ==============================================
echo   COMPILADOR DE SISTEMA POS PARA WINDOWS
echo ==============================================
echo.

echo 1. Instalando requerimientos de Python...
pip install Flask flask-cors pyinstaller
if %errorlevel% neq 0 (
    echo Error al instalar dependencias de Python. Verifica que Python este instalado y agregado al PATH.
    pause
    exit /b %errorlevel%
)
echo Dependencias instaladas con exito.
echo.

echo 2. Generando el archivo .exe (Sistema_POS.exe)...
pyinstaller Sistema_POS.spec
if %errorlevel% neq 0 (
    echo Error al empaquetar con PyInstaller.
    pause
    exit /b %errorlevel%
)

echo.
echo ==============================================
echo  COMPILACION FINALIZADA CON EXITO
echo ==============================================
echo Puedes encontrar tu ejecutable en: dist\Sistema_POS.exe
echo.
pause
