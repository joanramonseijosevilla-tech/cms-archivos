# Llamadas API de GitHub

Sustituir:

- `OWNER`: usuario u organización de GitHub.
- `REPO`: nombre del repositorio.
- `BRANCH`: normalmente `main`.
- `PATH`: ruta del archivo dentro del repositorio.

Headers comunes:

```http
Accept: application/vnd.github+json
Authorization: Bearer TU_TOKEN
X-GitHub-Api-Version: 2026-03-10
Content-Type: application/json
```

## Leer un archivo

```http
GET https://api.github.com/repos/OWNER/REPO/contents/data/publicaciones.json?ref=BRANCH
```

Respuesta relevante:

```json
{
  "content": "eyJ2ZXJzaW9uIjox...",
  "encoding": "base64",
  "sha": "SHA_DEL_ARCHIVO"
}
```

En Make hay que limpiar saltos de línea de `content` antes de decodificar si aparecen.

## Crear o actualizar una imagen

```http
PUT https://api.github.com/repos/OWNER/REPO/contents/assets/uploads/2026/07/pub_xxx.webp
```

Body:

```json
{
  "message": "cms: upload image pub_xxx",
  "content": "BASE64_DE_LA_IMAGEN",
  "branch": "main",
  "committer": {
    "name": "CMS Bot",
    "email": "cms-bot@example.com"
  }
}
```

Para crear una imagen nueva no hace falta `sha`. Para reemplazar exactamente el mismo archivo, primero hay que leerlo y enviar su `sha`.

## Actualizar publicaciones.json

Primero leer el archivo para obtener su `sha`.

```http
PUT https://api.github.com/repos/OWNER/REPO/contents/data/publicaciones.json
```

Body:

```json
{
  "message": "cms: update publicaciones.json",
  "content": "BASE64_DEL_JSON_ACTUALIZADO",
  "sha": "SHA_ACTUAL_DE_PUBLICACIONES_JSON",
  "branch": "main",
  "committer": {
    "name": "CMS Bot",
    "email": "cms-bot@example.com"
  }
}
```

## Eliminar una imagen

Primero leer la imagen para obtener su `sha`.

```http
DELETE https://api.github.com/repos/OWNER/REPO/contents/assets/uploads/2026/07/pub_xxx.webp
```

Body:

```json
{
  "message": "cms: delete image pub_xxx",
  "sha": "SHA_DE_LA_IMAGEN",
  "branch": "main",
  "committer": {
    "name": "CMS Bot",
    "email": "cms-bot@example.com"
  }
}
```
