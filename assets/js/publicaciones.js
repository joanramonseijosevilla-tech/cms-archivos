const POSTS_JSON_URL = 'data/publicaciones.json';

const postsGrid = document.querySelector('#posts-grid');
const postsStatus = document.querySelector('#posts-status');
const yearNode = document.querySelector('#year');

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function normalizeSrc(src) {
  if (!src) return '';
  return src.startsWith('/') ? src.slice(1) : src;
}

function renderPosts(items) {
  postsGrid.replaceChildren();

  const publishedItems = items
    .filter((item) => item.status !== 'draft')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (!publishedItems.length) {
    postsStatus.textContent = 'Todavía no hay publicaciones.';
    return;
  }

  postsStatus.textContent = '';

  const fragment = document.createDocumentFragment();

  publishedItems.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'post-card';

    const img = document.createElement('img');
    img.className = 'post-card-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = normalizeSrc(item.image?.src);
    img.alt = item.image?.alt || item.title || 'Imagen de publicación';

    const body = document.createElement('div');
    body.className = 'post-card-body';

    const date = document.createElement('span');
    date.className = 'post-date';
    date.textContent = formatDate(item.createdAt);

    const title = document.createElement('h3');
    title.textContent = item.title || 'Publicación sin título';

    const description = document.createElement('p');
    description.textContent = item.description || '';

    body.append(date, title, description);
    article.append(img, body);
    fragment.append(article);
  });

  postsGrid.append(fragment);
}

async function loadPosts() {
  try {
    const response = await fetch(`${POSTS_JSON_URL}?v=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`No se pudo leer el JSON (${response.status})`);
    }

    const data = await response.json();
    renderPosts(Array.isArray(data.items) ? data.items : []);
  } catch (error) {
    postsStatus.textContent = 'No se han podido cargar las publicaciones.';
    console.error(error);
  }
}

loadPosts();
