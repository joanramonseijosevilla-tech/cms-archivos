# Mini CMS Nexautia — GitHub Pages + JSON + Make

Proyecto base para una web corporativa estática alojada en GitHub Pages, con contenido generado dinámicamente desde `data/publicaciones.json` y panel de administración preparado para conectarse a un webhook de Make.

## Cambios de esta versión

- Paleta adaptada a Nexautia:
  - Azul principal: `#2563eb`
  - Azul oscuro: `#1d4ed8`
  - Azul claro: `#60a5fa`
  - Fondo oscuro: `#07111f`
  - Superficies oscuras: `#0f172a`
- Diseño más oscuro y con mayor contraste para evitar bloques blancos demasiado claros.
- Logo de Nexautia añadido en:
  - Cabecera pública.
  - Footer.
  - Pantalla de acceso del panel.
  - Topbar del panel.
- Login aclarado para pruebas: en modo demo puedes poner cualquier contraseña, por ejemplo `1234`.
- Corregida la previsualización local de imágenes en el panel cuando se selecciona un archivo antes de enviarlo a Make.

## Cómo probar

1. Abre la carpeta con Visual Studio Code.
2. Ejecuta Live Server sobre `index.html`.
3. Entra en `/admin/`.
4. Escribe cualquier contraseña, por ejemplo `1234`.
5. Podrás ver el panel y probar la interfaz.

## Importante

Guardar, editar y eliminar publicaciones todavía requiere conectar Make. Hasta que no pegues la URL del webhook en `admin/cms.config.js`, el panel mostrará un aviso indicando que falta configurar Make.

```js
window.CMS_CONFIG = {
  MAKE_WEBHOOK_URL: 'PEGAR_AQUI_WEBHOOK_DE_MAKE',
  PUBLIC_JSON_URL: '../data/publicaciones.json',
  MAX_IMAGE_MB: 4,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
};
```

## Estructura

```txt
mini-cms-github-pages/
├── index.html
├── admin/
│   ├── index.html
│   ├── admin.js
│   └── cms.config.js
├── assets/
│   ├── css/
│   │   ├── styles.css
│   │   └── admin.css
│   ├── img/
│   │   └── logo.svg
│   ├── js/
│   │   └── publicaciones.js
│   └── uploads/
├── data/
│   └── publicaciones.json
└── docs/
```
