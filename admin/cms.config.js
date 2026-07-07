window.CMS_CONFIG = {
  // Pega aquí la URL del webhook de Make. Ejemplo:
  // https://hook.eu2.make.com/xxxxxxxxxxxxxxxxxxxxxxxx
  MAKE_WEBHOOK_URL: 'https://hook.eu2.make.com/q1xfipdqrfrhucups0tqbgahkaobf5yj',

  // Fuente principal de lectura: GitHub API pública, sin token, para evitar retrasos de GitHub Pages.
  GITHUB_JSON_API_URL: 'https://api.github.com/repos/joanramonseijosevilla-tech/cms-archivos/contents/data/publicaciones.json',

  // Fallback público desde /admin/index.html si GitHub API no responde.
  PUBLIC_JSON_URL: '../data/publicaciones.json',

  // Tamaño máximo del archivo ya optimizado que se enviará a Make.
  MAX_IMAGE_MB: 4,

  // Tamaño máximo permitido para la imagen original antes de optimizarla en el navegador.
  MAX_SOURCE_IMAGE_MB: 20,

  // Optimización automática antes de subir a GitHub.
  IMAGE_MAX_SIDE_PX: 1600,
  IMAGE_WEBP_QUALITY: 0.85,

  // Extensiones permitidas por el panel.
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
};
