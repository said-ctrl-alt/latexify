# LaTeXify — Guía de despliegue completa

## Archivos del proyecto

```
latexify/
├── index.html          → Landing page con precios
├── login.html          → Registro e inicio de sesión
├── editor.html         → Editor LaTeX completo
├── admin.html          → Panel para activar usuarios Premium
├── firebase-config.js  → Configuración (referencia, ver paso 2)
└── README.md           → Esta guía
```

---

## PASO 1: Crear cuenta en Firebase (gratis)

1. Ve a https://console.firebase.google.com
2. Haz clic en **"Crear un proyecto"**
3. Nombre: `latexify` (o el que quieras)
4. Deshabilita Google Analytics (no lo necesitas)
5. Clic en **"Crear proyecto"**

---

## PASO 2: Activar Authentication

1. En el menú izquierdo → **Authentication** → **Comenzar**
2. Pestaña **"Sign-in method"**
3. Activa **"Correo electrónico/contraseña"** → Guardar

---

## PASO 3: Activar Firestore Database

1. En el menú izquierdo → **Firestore Database** → **Crear base de datos**
2. Selecciona **"Modo de producción"**
3. Elige la región más cercana (ej: `us-east1`)
4. Clic en **"Habilitar"**

### Configurar reglas de Firestore:
1. Ve a **Firestore → Reglas**
2. Reemplaza el contenido con esto y haz clic en **Publicar**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## PASO 4: Obtener credenciales de Firebase

1. En Firebase → **Configuración del proyecto** (ícono ⚙️)
2. Baja hasta **"Tus aplicaciones"** → haz clic en **`</>`** (Web)
3. Nombre: `latexify-web`
4. **NO** actives Firebase Hosting
5. Copia el objeto `firebaseConfig` que aparece

### Pegar credenciales en los 3 archivos:
Abre `login.html`, `editor.html` y `admin.html` con un editor de texto (Notepad, VS Code, etc.)
Busca esta sección en cada archivo:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROYECTO.firebaseapp.com",
  ...
```

Reemplaza los valores `"TU_..."` con los de tu proyecto Firebase.

---

## PASO 5: Configurar tus datos de pago

En `editor.html`, busca esta línea y cambia el número:

```javascript
const PAYMENT_NUM = "TU_NUMERO_NEQUI";   // ej: "3001234567"
```

En `index.html`, busca `id="nequi-num"` y actualiza la sección de pagos con tu número real.

---

## PASO 6: Configurar el Admin

En `admin.html`, busca esta línea y agrega tu correo:

```javascript
const ADMIN_EMAILS = ["tu@correo.com"];
```

Este correo podrá acceder al panel de administración.
**Primero regístrate como usuario normal**, luego ve a Firebase → Firestore → users → tu documento → cambia `role` de `"user"` a `"admin"`.

---

## PASO 7: Subir a internet (Netlify — gratis)

### Opción A: Arrastrar y soltar (más fácil)
1. Ve a https://app.netlify.com
2. Crea una cuenta gratis (con Google o GitHub)
3. En el dashboard → arrastra toda la carpeta `latexify/` a la zona de drop
4. ¡Listo! Netlify te da una URL como `https://latexify-abc123.netlify.app`

### Opción B: GitHub + Netlify (recomendado para actualizaciones)
1. Sube la carpeta a GitHub (nuevo repositorio)
2. En Netlify → **"Import from Git"** → selecciona el repositorio
3. Build command: (dejar vacío)
4. Publish directory: `.`
5. Deploy → obtienes una URL

### Opción C: GitHub Pages (también gratis)
1. Crea un repositorio en GitHub
2. Sube los archivos
3. Ve a Settings → Pages → selecciona rama `main` → `/root`
4. URL: `https://tu-usuario.github.io/nombre-repo`

---

## PASO 8: Dominio personalizado (opcional)

Si quieres usar un dominio como `latexify.co`:
- Dominios `.co` cuestan ~$15.000 COP/año en namecheap.com o hostgator.com.co
- En Netlify → Domain settings → Add custom domain
- Sigue las instrucciones para apuntar el DNS

---

## Flujo de pago manual (cómo activar un usuario)

1. El estudiante te paga por **Nequi o Daviplata**
2. Te envía captura de pantalla + su correo registrado por WhatsApp
3. Tú vas a `tu-sitio.netlify.app/admin.html`
4. En el campo **"Activar Premium por correo"** escribes su correo
5. Seleccionas el período (1 mes, 6 meses)
6. Clic en **"Activar Premium"**
7. El usuario ve su badge cambiar a PREMIUM inmediatamente

---

## Precios sugeridos

| Plan | Precio | Descripción |
|------|--------|-------------|
| Gratuito | $0 | 5 compilaciones/día, 2 plantillas |
| Premium mensual | $8.000 COP | Ilimitado, todas las plantillas |
| Premium semestral | $40.000 COP | Ahorro de $8.000 vs mensual |

---

## Solución de problemas frecuentes

**"Firebase no configurado"** → Verifica que pegaste las credenciales correctamente en los 3 archivos.

**"Acceso denegado" en admin.html** → Tu correo no está en `ADMIN_EMAILS` o tu campo `role` en Firestore no dice `admin`.

**El PDF no compila** → El servicio latexonline.cc puede estar lento. Verifica que el código LaTeX no tenga errores de sintaxis.

**Los usuarios no se guardan** → Verifica las reglas de Firestore y que hayas habilitado la base de datos.

---

## Costos totales estimados

| Servicio | Costo |
|----------|-------|
| Firebase (hasta 50.000 usuarios) | **GRATIS** |
| Netlify (hosting) | **GRATIS** |
| latexonline.cc (compilador) | **GRATIS** |
| Dominio personalizado (opcional) | ~$15.000 COP/año |
| **Total para empezar** | **$0 COP** |

---

*LaTeXify — Hecho para estudiantes universitarios*
