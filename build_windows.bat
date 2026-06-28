@echo off
echo ========================================================
echo Empaquetando Sistema Multirepuestos Ramos para Windows
echo ========================================================

echo 1. Construyendo frontend...
call npm install
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1

echo 2. Instalando dependencias de Python...
pip install -r backend/requirements.txt
pip install pyinstaller
if errorlevel 1 exit /b 1

echo 3. Empaquetando backend con PyInstaller...
cd backend
call pyinstaller --noconfirm Sistema_POS.spec
cd ..

echo 4. Preparando carpeta de distribucion final...
if not exist "Sistema_POS_Final" mkdir "Sistema_POS_Final"

echo Copiando ejecutable...
copy /Y "backend\dist\Sistema_POS.exe" "Sistema_POS_Final\"

echo Copiando base de datos (si existe)...
if exist "backend\autoparts.db" copy /Y "backend\autoparts.db" "Sistema_POS_Final\"

echo Copiando carpeta de imagenes de evidencia (si existe)...
if exist "backend\uploads\" xcopy /E /I /Y "backend\uploads" "Sistema_POS_Final\uploads"

echo Copiando copias de seguridad (si existen)...
if exist "backend\backups\" xcopy /E /I /Y "backend\backups" "Sistema_POS_Final\backups"

echo ========================================================
echo Terminado! 
echo.
echo Ve a la carpeta "Sistema_POS_Final" que acaba de ser creada.
echo AHI DENTRO esta TODO lo que necesitas para ejecutar el programa
echo en cualquier computadora.
echo.
echo Solo tienes que hacer doble clic en Sistema_POS.exe
echo y abrir http://localhost:5000 en tu navegador.
echo ========================================================
pause
