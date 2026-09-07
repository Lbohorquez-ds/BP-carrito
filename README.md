# NDB Sanitarios - Firebase

Versión preparada para Firebase + GitHub Pages.

## Firebase configurado
- Proyecto: `CarritoNDB`
- Authentication: email/contraseña
- Firestore: `usuarios`, `productos`, `pedidos`
- Roles: `admin` y `cliente`

## Funciones principales
- Inicio de sesión con Firebase Authentication.
- Redirección automática según rol.
- El administrador puede crear clientes sin cerrar su propia sesión.
- Al crear un cliente se crea su cuenta de Authentication y su documento `usuarios/{uid}` con `rol: cliente`.
- El administrador puede crear y actualizar productos en `productos`.
- Los clientes autenticados pueden ver productos y generar pedidos.
- Pedidos guardados en Firestore y PDF descargable.
- El cliente puede modificar pedidos en `pendiente` y `preparacion`.

## Reglas
El archivo `firebase.rules` contiene las reglas recomendadas. Pegarlas en Firebase Console > Firestore > Reglas y publicar.

## GitHub Pages
Subir el contenido de esta carpeta al repositorio. No hace falta Firebase Hosting.
