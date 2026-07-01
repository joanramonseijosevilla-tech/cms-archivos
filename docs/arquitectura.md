# Arquitectura del mini CMS con GitHub Pages + Make

## Objetivo

Crear una web corporativa estática alojada en GitHub Pages, cuyo contenido editable se genera desde `data/publicaciones.json`. El panel de administración envía las altas, ediciones y eliminaciones a Make. Make actúa como backend seguro y escribe en GitHub mediante la API REST.

## Componentes

1. **Frontend público**
   - `index.html`
   - `assets/css/styles.css`
   - `assets/js/publicaciones.js`
   - Lee `data/publicaciones.json` con `fetch()`.
   - Renderiza tarjetas dinámicas.

2. **Panel de administración**
   - `admin/index.html`
   - `admin/admin.js`
   - `admin/cms.config.js`
   - No contiene el token de GitHub.
   - Envía `create`, `update` y `delete` a un webhook de Make.

3. **Make**
   - Recibe los datos del panel.
   - Valida contraseña.
   - Sube imágenes al repositorio.
   - Lee y actualiza `data/publicaciones.json`.
   - Elimina imágenes antiguas o publicaciones eliminadas.

4. **GitHub**
   - Aloja la web en GitHub Pages.
   - Guarda las imágenes en `assets/uploads/`.
   - Guarda el contenido estructurado en `data/publicaciones.json`.

## Flujo recomendado

### Crear publicación

1. El cliente rellena título, descripción e imagen.
2. El panel envía `action=create` a Make.
3. Make valida la contraseña.
4. Make genera un `id` único.
5. Make sube la imagen a `assets/uploads/YYYY/MM/id.ext`.
6. Make lee `data/publicaciones.json`.
7. Make añade el nuevo registro.
8. Make actualiza `data/publicaciones.json`.
9. La web pública carga el JSON y muestra la publicación.

### Editar publicación

1. El cliente edita título, descripción o imagen.
2. El panel envía `action=update`.
3. Make valida la contraseña.
4. Make lee el JSON actual.
5. Si hay imagen nueva, Make la sube primero.
6. Make actualiza el registro en el JSON.
7. Make actualiza `data/publicaciones.json`.
8. Si había imagen anterior y la nueva ya funciona, Make elimina la anterior.

### Eliminar publicación

1. El cliente pulsa eliminar.
2. El panel envía `action=delete`.
3. Make valida la contraseña.
4. Make lee el JSON actual.
5. Make elimina el registro del JSON.
6. Make actualiza `data/publicaciones.json`.
7. Make elimina la imagen asociada.

> Recomendación senior: aunque el flujo conceptual diga “eliminar imagen y luego JSON”, es más seguro actualizar primero el JSON. Así se evita que la web muestre una tarjeta con imagen rota si falla el segundo paso.

## Seguridad

- El token de GitHub solo debe estar en Make.
- El panel estático no puede ser 100% privado por sí solo.
- La validación real debe hacerse en Make.
- Para seguridad fuerte, proteger `/admin/` con Cloudflare Access, Basic Auth externo o un proveedor de identidad.
- Para proyectos pequeños, puede bastar con contraseña validada en Make + URL de administración no indexada + `robots noindex`.

## Límite práctico

Adecuado para clientes que publican entre 1 y 20 contenidos al mes. No es un WordPress ni un CMS multiusuario completo. Es una solución ligera, barata y mantenible.

## Personalización Nexautia

La versión actual usa la paleta visual de Nexautia y evita fondos blancos dominantes. El objetivo es mantener más contraste visual, especialmente en paneles, formularios y tarjetas.
