const POSTS_JSON_API_URL = 'https://api.github.com/repos/joanramonseijosevilla-tech/cms-archivos/contents/data/publicaciones.json';
const POSTS_JSON_FALLBACK_URL = 'data/publicaciones.json';
const RAW_GITHUB_BASE_URL = 'https://github.com/joanramonseijosevilla-tech/cms-archivos/raw/HEAD/';

const postsGrid = document.querySelector('#posts-grid');
const postsStatus = document.querySelector('#posts-status');
const yearNode = document.querySelector('#year');

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

function addCacheBuster(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}

function decodeBase64Json(content) {
  const cleanContent = String(content || '').replace(/\s/g, '');
  const binary = atob(cleanContent);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return JSON.parse(new TextDecoder().decode(bytes));
}

function normalizePublicacionesJson(data) {
  return {
    version: data?.version || 1,
    updatedAt: data?.updatedAt || '',
    items: Array.isArray(data?.items) ? data.items : []
  };
}

async function fetchFromGitHubApi() {
  const response = await fetch(addCacheBuster(POSTS_JSON_API_URL), {
    cache: 'no-store',
    headers: { 'Accept': 'application/vnd.github+json' }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer GitHub API (${response.status})`);
  }

  const data = await response.json();
  if (!data || typeof data.content !== 'string') {
    throw new Error('GitHub API no devolvió el contenido esperado.');
  }

  return normalizePublicacionesJson(decodeBase64Json(data.content));
}

async function fetchFromPagesFallback() {
  const response = await fetch(addCacheBuster(POSTS_JSON_FALLBACK_URL), {
    cache: 'no-store',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer el JSON público (${response.status})`);
  }

  return normalizePublicacionesJson(await response.json());
}

async function loadPublicacionesJson() {
  try {
    return await fetchFromGitHubApi();
  } catch (apiError) {
    console.warn('No se pudo leer desde GitHub API. Se usa fallback de GitHub Pages:', apiError);
    return fetchFromPagesFallback();
  }
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

function cleanRelativePath(src) {
  return String(src || '')
    .replace(/^\.\.\//, '')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function isUploadedAssetPath(src) {
  return cleanRelativePath(src).startsWith('assets/uploads/');
}

function getRawGithubAssetUrl(src) {
  return `${RAW_GITHUB_BASE_URL}${cleanRelativePath(src)}`;
}

function getPagesAssetUrl(src) {
  return cleanRelativePath(src);
}

function normalizeSrc(src) {
  if (!src) return '';
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  if (src.startsWith('http')) return addCacheBuster(src);
  if (isUploadedAssetPath(src)) return addCacheBuster(getRawGithubAssetUrl(src));
  return addCacheBuster(getPagesAssetUrl(src));
}

function setImageSrc(img, src) {
  const primarySrc = normalizeSrc(src);
  const fallbackSrc = isUploadedAssetPath(src) ? addCacheBuster(getPagesAssetUrl(src)) : '';

  if (!primarySrc) return;

  img.dataset.fallbackTried = 'false';
  img.onerror = () => {
    if (fallbackSrc && img.dataset.fallbackTried !== 'true') {
      img.dataset.fallbackTried = 'true';
      img.src = fallbackSrc;
    }
  };
  img.src = primarySrc;
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
    setImageSrc(img, item.image?.src);
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
    const data = await loadPublicacionesJson();
    renderPosts(data.items);
  } catch (error) {
    postsStatus.textContent = 'No se han podido cargar las publicaciones.';
    console.error(error);
  }
}

loadPosts();
