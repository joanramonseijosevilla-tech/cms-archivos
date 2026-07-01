# Flujo completo en Make

## Variables recomendadas en Make

Guardar como variables, no en el frontend:

- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH` = `main`
- `GITHUB_TOKEN`
- `CMS_PASSWORD`
- `COMMITTER_NAME` = `CMS Bot`
- `COMMITTER_EMAIL` = `cms-bot@example.com`

## Escenario único: CMS Webhook

### Módulo 1 — Webhooks > Custom webhook

Recibe JSON con esta forma:

```json
{
  "action": "create",
  "password": "contraseña-escrita-por-el-cliente",
  "payload": {
    "title": "Título",
    "description": "Descripción",
    "alt": "Texto alternativo",
    "image": {
      "fileName": "foto.webp",
      "mimeType": "image/webp",
      "base64": "BASE64..."
    }
  }
}
```

Acciones posibles:

- `create`
- `update`
- `delete`

### Módulo 2 — Validación de contraseña

Filtro obligatorio:

```txt
password == CMS_PASSWORD
```

Si falla:

Responder:

```json
{
  "ok": false,
  "error": "No autorizado"
}
```

### Módulo 3 — Router por acción

Ramas:

- Crear publicación: `action = create`
- Editar publicación: `action = update`
- Eliminar publicación: `action = delete`

---

# Rama CREATE

## 1. Generar ID

Ejemplo de ID:

```txt
pub_{{formatDate(now; "YYYYMMDDHHmmss")}}_{{substring(replace(uuid; "-"; ""); 0; 8)}}
```

## 2. Calcular extensión

Según `payload.image.mimeType`:

- `image/jpeg` → `jpg`
- `image/png` → `png`
- `image/webp` → `webp`

Ruta final:

```txt
assets/uploads/{{formatDate(now; "YYYY")}}/{{formatDate(now; "MM")}}/{{id}}.{{extension}}
```

## 3. HTTP > Make a request — Subir imagen

Method:

```txt
PUT
```

URL:

```txt
https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/contents/{{imagePath}}
```

Headers:

```txt
Accept: application/vnd.github+json
Authorization: Bearer {{GITHUB_TOKEN}}
X-GitHub-Api-Version: 2026-03-10
Content-Type: application/json
```

Body JSON:

```json
{
  "message": "cms: upload image",
  "content": "{{payload.image.base64}}",
  "branch": "{{GITHUB_BRANCH}}",
  "committer": {
    "name": "{{COMMITTER_NAME}}",
    "email": "{{COMMITTER_EMAIL}}"
  }
}
```

## 4. HTTP > Make a request — Leer publicaciones.json

Method:

```txt
GET
```

URL:

```txt
https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/contents/data/publicaciones.json?ref={{GITHUB_BRANCH}}
```

Guardar:

- `jsonSha` = `sha`
- `jsonContent` = decodificar `content` desde Base64

## 5. Parse JSON

Convertir `jsonContent` a objeto.

## 6. Añadir item

Nuevo item:

```json
{
  "id": "{{id}}",
  "title": "{{payload.title}}",
  "description": "{{payload.description}}",
  "image": {
    "src": "{{imagePath}}",
    "path": "{{imagePath}}",
    "alt": "{{payload.alt}}"
  },
  "status": "published",
  "createdAt": "{{now}}",
  "updatedAt": "{{now}}"
}
```

Actualizar:

- `updatedAt` del documento.
- `items`: añadir el nuevo item al principio o al final.

## 7. Codificar JSON actualizado a Base64

El resultado debe ser JSON bonito o compacto, pero válido.

## 8. HTTP > Make a request — Actualizar publicaciones.json

Method:

```txt
PUT
```

URL:

```txt
https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/contents/data/publicaciones.json
```

Body JSON:

```json
{
  "message": "cms: create publication",
  "content": "{{base64JsonActualizado}}",
  "sha": "{{jsonSha}}",
  "branch": "{{GITHUB_BRANCH}}",
  "committer": {
    "name": "{{COMMITTER_NAME}}",
    "email": "{{COMMITTER_EMAIL}}"
  }
}
```

## 9. Webhook response

```json
{
  "ok": true,
  "action": "create"
}
```

---

# Rama UPDATE

## 1. Leer publicaciones.json

Igual que en CREATE.

## 2. Buscar item por `payload.id`

Si no existe, responder error.

## 3. Si viene nueva imagen

- Generar nueva ruta.
- Subir nueva imagen con `PUT`.
- Guardar `oldImagePath`.
- Reemplazar `image.src`, `image.path`, `image.alt`.

Si no viene nueva imagen:

- Mantener `image.src` y `image.path`.
- Actualizar `image.alt` si se ha cambiado.

## 4. Actualizar campos

- `title`
- `description`
- `updatedAt`

## 5. Guardar publicaciones.json con PUT

Enviar `sha` actual del JSON.

## 6. Si había imagen antigua y se subió una nueva

- Leer imagen antigua para obtener `sha`.
- Eliminar imagen antigua con `DELETE`.

## 7. Responder OK

```json
{
  "ok": true,
  "action": "update"
}
```

---

# Rama DELETE

## 1. Leer publicaciones.json

Igual que en CREATE.

## 2. Buscar item por `payload.id`

Guardar `image.path`.

## 3. Eliminar registro del array

Actualizar `items` y `updatedAt`.

## 4. Guardar publicaciones.json con PUT

Enviar `sha` actual del JSON.

## 5. Eliminar imagen del repositorio

Leer imagen para obtener `sha`:

```txt
GET https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/contents/{{imagePath}}?ref={{GITHUB_BRANCH}}
```

Eliminar:

```txt
DELETE https://api.github.com/repos/{{GITHUB_OWNER}}/{{GITHUB_REPO}}/contents/{{imagePath}}
```

Body:

```json
{
  "message": "cms: delete image",
  "sha": "{{imageSha}}",
  "branch": "{{GITHUB_BRANCH}}",
  "committer": {
    "name": "{{COMMITTER_NAME}}",
    "email": "{{COMMITTER_EMAIL}}"
  }
}
```

## 6. Responder OK

```json
{
  "ok": true,
  "action": "delete"
}
```

---

# Control de errores recomendado

- Si falla la subida de imagen, no tocar el JSON.
- Si falla el guardado del JSON, responder error y no borrar imágenes antiguas.
- Si falla el borrado de imagen antigua, no bloquear la edición: dejarlo como limpieza manual posterior.
- Evitar ejecuciones en paralelo. GitHub puede devolver conflicto si varias escrituras pisan el mismo archivo.
- Añadir reintento en errores `409` después de volver a leer el SHA actual del JSON.
