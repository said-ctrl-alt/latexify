# LaTeXify - Guia de despliegue

## Archivos del proyecto

```text
latexify/
|-- index.html
|-- login.html
|-- editor.html
|-- admin.html
|-- firebase-config.js
`-- README.md
```

- `index.html`: landing publica.
- `login.html`: registro e inicio de sesion.
- `editor.html`: editor principal.
- `admin.html`: panel de monitoreo de usuarios.
- `firebase-config.js`: configuracion compartida del proyecto.

## Modelo actual del producto

LaTeXify quedo en modo de acceso abierto:

- Todas las cuentas entran con el editor habilitado.
- Todas las plantillas estan disponibles.
- El guardado en la nube esta disponible para todos.
- Ya no existe flujo de pago ni activacion manual de acceso.

## Paso 1: Crear proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Crea un proyecto nuevo.
3. Activa Authentication con Email/Password.
4. Activa Firestore Database.

## Paso 2: Configurar credenciales

Abre `firebase-config.js` y actualiza `window.FIREBASE_CONFIG` con los datos de tu proyecto.

Ese archivo ahora es la fuente compartida para:

- `login.html`
- `editor.html`
- `admin.html`

## Paso 3: Configurar acceso admin

En `firebase-config.js`, edita:

```js
window.LATEXIFY_ADMIN_EMAILS = ["tu@correo.com"];
```

Agrega ahi los correos que pueden abrir `admin.html`.

## Paso 4: Reglas de Firestore

Necesitas permitir que cada usuario lea y actualice su propio documento. Si mantienes un panel admin 100% cliente, revisa con cuidado la estrategia de permisos antes de abrir acceso global a la coleccion `users`.

Como minimo, asegurate de no dejar campos sensibles editables desde cualquier cliente.

## Paso 5: Desplegar

Puedes publicar la carpeta completa en:

- Netlify
- GitHub Pages
- cualquier hosting estatico

No necesitas build command. La carpeta de publicacion es la raiz del proyecto.

## Paso 6: Flujo esperado

1. La persona crea su cuenta.
2. Entra al editor.
3. Usa cualquier plantilla.
4. Guarda y retoma su proyecto desde la nube.

## Notas

- `admin.html` ya no activa cuentas; ahora sirve para monitoreo.
- `firebase-config.js` centraliza la configuracion compartida.
- Si cambias de proyecto Firebase, actualiza solo ese archivo.
