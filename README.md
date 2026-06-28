# Manual Operativo - Sistema POS Multirepuestos Ramos

Este documento contiene la información crítica necesaria para operar, respaldar y recuperar el sistema en caso de fallos. **Guarde este documento en un lugar seguro.**

## 1. Inicio y Parada del Sistema

**Entorno de Desarrollo / Código Fuente:**
1. Abre una terminal en la carpeta raíz del proyecto (`Proyecto_Respuestos`).
2. Construye el frontend (solo la primera vez o tras cambios en la interfaz):
   ```bash
   npm install
   npm run build
   ```
3. Activa el entorno virtual:
   - Linux/Mac: `source backend/venv/bin/activate`
   - Windows: `backend\venv\Scripts\activate`
4. Instala dependencias del backend:
   ```bash
   pip install -r backend/requirements.txt
   ```
5. Configura la clave secreta (obligatorio en producción):
   - Copia `backend/.env.example` a `backend/.env` y edita `SECRET_KEY`.
6. Inicia el servidor de producción:
   ```bash
   cd backend
   export FLASK_ENV=production   # Linux/Mac
   set FLASK_ENV=production      # Windows
   python app.py
   ```
7. Accede desde tu navegador a `http://localhost:5000` (o la IP de esta PC en la red local).
8. Verifica que el sistema responde: `http://localhost:5000/api/health`

**Versión Empaquetada (Windows):**
1. Ejecuta `build_windows.bat` **en una PC con Windows** (compila frontend + backend).
2. Ejecuta `backend\dist\Sistema_POS.exe`.
3. Se abrirá una ventana de consola negra (no la cierres).
4. El sistema estará corriendo en `http://localhost:5000`.
5. La base de datos se crea automáticamente junto al `.exe` si no existe (usuario inicial `admin` / `admin123` — cámbiela de inmediato).

> **Nota:** El binario debe compilarse en el mismo sistema operativo donde se usará. Un ejecutable generado en Linux no funciona en Windows.

## 2. Respaldos y Restauración

**Copias de Seguridad Automáticas:**
- El sistema crea una copia al iniciar y luego una cada 24 horas mientras esté encendido.
- Se retienen las últimas 30 copias.
- Las copias se guardan en la carpeta `backend/backups` con el nombre `autoparts_backup_YYYYMMDD_HHMMSS.db`.

**¿Cómo restaurar un respaldo si la base de datos se daña?**
1. Cierra el sistema por completo.
2. Ve a la carpeta `backend/`. Si el archivo `autoparts.db` existe, renómbralo a `autoparts_corrupto.db`.
3. Entra a la carpeta `backend/backups/`.
4. Copia el respaldo más reciente que sepas que funciona y pégalo en la carpeta `backend/`.
5. Renombra este archivo respaldado exactamente a `autoparts.db`.
6. Vuelve a iniciar el sistema.

**Respaldo Externo (Recomendado):**
- Copie la carpeta `backend/backups/` y el archivo `backend/autoparts.db` semanalmente a una memoria USB o nube.
- El sistema solo guarda localmente; si el disco duro falla, los respaldos se perderán con él.

## 3. Seguridad y Contraseñas

- El sistema usa autenticación por tokens (JWT, válidos 24 horas).
- Las contraseñas están encriptadas. Ni siquiera el administrador puede leerlas.
- **Cambiar contraseña propia:** Admin → Usuarios → "Cambiar mi contraseña".
- **Restablecer contraseña de otro usuario:** Admin → Usuarios → icono de editar (lápiz) en la fila del usuario.
- Las claves del servidor (`SECRET_KEY`) se guardan en `backend/.env`. **No comparta este archivo públicamente**.
- Si alguna vez cree que el sistema fue vulnerado, cambie la `SECRET_KEY`, reinicie el servidor y todos los usuarios tendrán que volver a iniciar sesión.

## 4. Solución de Problemas Frecuentes

**El sistema está muy lento:**
1. Verifica el archivo de registro `backend/pos_app.log`.
2. Puede que la base de datos sea inmensa. Considera exportar datos antiguos y purgar.
3. El archivo de registro tiene límite de 5 MB y se crearán hasta 5 archivos (`pos_app.log.1`, `.2`, etc.).

**No puedo entrar desde otra PC:**
1. Asegúrate de que las computadoras estén en la misma red Wi-Fi o cableada.
2. Asegúrate de que el Firewall de Windows permita conexiones entrantes al puerto 5000.
3. Ingresa usando la IP de la computadora servidor: Ej. `http://192.168.1.15:5000`.

**El servidor no responde:**
1. Abre `http://localhost:5000/api/health` — debe devolver `"status": "ok"`.
2. Si `"database": "missing"`, reinicia el servidor; se creará la base de datos automáticamente.

---
*Fin de la guía operativa.*
# sistema-pos
