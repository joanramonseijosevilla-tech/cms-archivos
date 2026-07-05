window.CMS_CONFIG = {
  // Pega aquí la URL del webhook de Make. Ejemplo:
  // https://hook.eu2.make.com/xxxxxxxxxxxxxxxxxxxxxxxx
  MAKE_WEBHOOK_URL: 'PEGAR_AQUI_WEBHOOK_DE_MAKE',

  // Fuente principal de lectura: GitHub API pública, sin token, para evitar retrasos de GitHub Pages.
  GITHUB_JSON_API_URL: 'https://api.github.com/repos/joanramonseijosevilla-tech/cms-archivos/contents/data/publicaciones.json',

  // Fallback público desde /admin/index.html si GitHub API no responde.
  PUBLIC_JSON_URL: '../data/publicaciones.json',

  // Tamaño máximo recomendado antes de enviar a Make.
  MAX_IMAGE_MB: 4,

  // Extensiones permitidas por el panel.
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp']
};
