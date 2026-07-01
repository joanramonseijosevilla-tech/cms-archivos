# Modelo de datos JSON

Archivo principal:

```txt
data/publicaciones.json
```

Estructura:

```json
{
  "version": 1,
  "updatedAt": "2026-07-01T00:00:00.000Z",
  "items": [
    {
      "id": "pub_20260701_abc123",
      "title": "Título de la publicación",
      "description": "Descripción visible en la web.",
      "image": {
        "src": "assets/uploads/2026/07/pub_20260701_abc123.webp",
        "path": "assets/uploads/2026/07/pub_20260701_abc123.webp",
        "alt": "Texto alternativo de la imagen"
      },
      "status": "published",
      "createdAt": "2026-07-01T09:30:00.000Z",
      "updatedAt": "2026-07-01T09:30:00.000Z"
    }
  ]
}
```

## Campos

- `version`: versión del esquema.
- `updatedAt`: fecha de última actualización del JSON.
- `items`: array de publicaciones.
- `id`: identificador único y estable.
- `title`: título de la publicación.
- `description`: descripción visible.
- `image.src`: ruta pública que usa la web.
- `image.path`: ruta interna del repositorio que usa GitHub API.
- `image.alt`: texto alternativo.
- `status`: `published` o `draft`.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de última modificación.

## Reglas

- No usar HTML dentro de `title` ni `description`.
- Mantener rutas relativas sin dominio para facilitar cambios de dominio.
- No borrar imágenes antes de que el JSON haya quedado actualizado correctamente.

## Diseño visual

El JSON no incluye estilos. Los colores, tarjetas, fondos y logo se controlan desde `assets/css/styles.css`, `assets/css/admin.css` y `assets/img/logo.svg`.
