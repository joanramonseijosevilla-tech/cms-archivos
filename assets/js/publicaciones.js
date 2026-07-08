const POSTS_JSON_API_URL = 'https://api.github.com/repos/joanramonseijosevilla-tech/cms-archivos/contents/data/publicaciones.json';
const POSTS_JSON_FALLBACK_URL = 'data/publicaciones.json';
const RAW_GITHUB_BASE_URL = 'https://github.com/joanramonseijosevilla-tech/cms-archivos/raw/HEAD/';
const POST_CATEGORIES = [
  { value: 'galeria', label: 'Galería' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'novedades', label: 'Novedades' }
];
const DEFAULT_POST_CATEGORY = 'galeria';
const RICH_COLOR_PALETTE = [
  { value: 'blue', className: 'rich-color-blue', hex: '#93c5fd', rgb: [147, 197, 253] },
  { value: 'green', className: 'rich-color-green', hex: '#86efac', rgb: [134, 239, 172] },
  { value: 'orange', className: 'rich-color-orange', hex: '#fdba74', rgb: [253, 186, 116] },
  { value: 'red', className: 'rich-color-red', hex: '#fca5a5', rgb: [252, 165, 165] }
];
const RICH_COLOR_CLASSES = RICH_COLOR_PALETTE.map((color) => color.className);

const postsGrid = document.querySelector('#posts-grid');
const postsCategoryFilters = document.querySelector('#posts-category-filters');
const postsStatus = document.querySelector('#posts-status');
const yearNode = document.querySelector('#year');

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

let currentCategoryFilter = 'all';

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

function getManualOrderValue(item) {
  const order = Number(item?.order);
  return Number.isFinite(order) ? order : null;
}

function getCreatedAtTime(item) {
  const time = Date.parse(item?.createdAt || '');
  return Number.isNaN(time) ? 0 : time;
}

function isValidPostCategory(category) {
  return POST_CATEGORIES.some((item) => item.value === category);
}

function getItemCategory(item) {
  return isValidPostCategory(item?.category) ? item.category : DEFAULT_POST_CATEGORY;
}

function getCategoryLabel(categoryOrItem) {
  const category = typeof categoryOrItem === 'string' ? categoryOrItem : getItemCategory(categoryOrItem);
  return POST_CATEGORIES.find((item) => item.value === category)?.label || 'Galería';
}

function hasManualOrder(items) {
  return items.some((item) => getManualOrderValue(item) !== null);
}

function getOrderedItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const manualOrder = hasManualOrder(safeItems);

  return safeItems
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (manualOrder) {
        const orderA = getManualOrderValue(a.item);
        const orderB = getManualOrderValue(b.item);
        const normalizedOrderA = orderA === null ? Number.MAX_SAFE_INTEGER : orderA;
        const normalizedOrderB = orderB === null ? Number.MAX_SAFE_INTEGER : orderB;

        if (normalizedOrderA !== normalizedOrderB) return normalizedOrderA - normalizedOrderB;
      }

      const dateDifference = getCreatedAtTime(b.item) - getCreatedAtTime(a.item);
      if (dateDifference !== 0) return dateDifference;

      return a.index - b.index;
    })
    .map(({ item }) => item);
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

function isDeletedItem(item) {
  return item?.deleted === true || item?.status === 'deleted';
}

function isPublishedItem(item) {
  return !isDeletedItem(item) && item?.status !== 'hidden' && item?.status !== 'draft';
}

function getCategoryCounts(items) {
  const safeItems = Array.isArray(items) ? items : [];
  return POST_CATEGORIES.reduce((counts, category) => {
    counts[category.value] = safeItems.filter((item) => getItemCategory(item) === category.value).length;
    return counts;
  }, { all: safeItems.length });
}

function renderCategoryFilters(publishedItems) {
  if (!postsCategoryFilters) return;

  postsCategoryFilters.replaceChildren();

  const counts = getCategoryCounts(publishedItems);
  const filters = [
    { value: 'all', label: 'Todas' },
    ...POST_CATEGORIES
  ];

  filters.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = filter.value === currentCategoryFilter ? 'button button-small' : 'button button-small button-secondary';
    button.textContent = `${filter.label} (${counts[filter.value] || 0})`;
    button.setAttribute('aria-pressed', String(filter.value === currentCategoryFilter));
    button.addEventListener('click', () => {
      currentCategoryFilter = filter.value;
      renderPosts(publishedItems);
    });
    postsCategoryFilters.append(button);
  });
}

function itemMatchesCategoryFilter(item) {
  if (currentCategoryFilter === 'all') return true;
  return getItemCategory(item) === currentCategoryFilter;
}

function escapeHtml(text) {
  const span = document.createElement('span');
  span.textContent = String(text || '');
  return span.innerHTML;
}

function looksLikeRichHtml(value) {
  return /<\/?(p|br|strong|b|em|i|ul|ol|li|div|span|font|h[1-6])\b/i.test(String(value || ''));
}

function mapRichTag(sourceTag) {
  if (sourceTag === 'b') return 'strong';
  if (sourceTag === 'i') return 'em';
  if (sourceTag === 'font') return 'span';
  if (sourceTag === 'h1' || sourceTag === 'h2') return 'h2';
  if (sourceTag === 'h3') return 'h3';
  if (sourceTag === 'h4' || sourceTag === 'h5' || sourceTag === 'h6') return 'h4';
  return sourceTag;
}

function convertPlainTextToRichHtml(value) {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  const blocks = text.split(/\n{2,}/);

  return blocks.map((block) => {
    const lines = block.split('\n').filter((line) => line.trim());
    if (!lines.length) return '';

    const isBulletList = lines.every((line) => /^\s*[-*•]\s+/.test(line));
    const isNumberedList = lines.every((line) => /^\s*\d+[.)]\s+/.test(line));

    if (isBulletList) {
      return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    }

    if (isNumberedList) {
      return `<ol>${lines.map((line) => `<li>${escapeHtml(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    }

    if (lines.length === 1) {
      const headingMatch = lines[0].match(/^\s*(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const headingTag = headingMatch[1].length === 1 ? 'h2' : headingMatch[1].length === 2 ? 'h3' : 'h4';
        return `<${headingTag}>${escapeHtml(headingMatch[2])}</${headingTag}>`;
      }
    }

    return `<p>${lines.map(escapeHtml).join('<br>')}</p>`;
  }).filter(Boolean).join('');
}

function getSafeTextAlign(value) {
  const align = String(value || '').toLowerCase().trim();
  return ['left', 'center', 'right', 'justify'].includes(align) ? align : '';
}

function getNodeTextAlign(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
  const styleAlign = getSafeTextAlign(node.style?.textAlign);
  if (styleAlign) return styleAlign;
  return getSafeTextAlign(node.getAttribute('align'));
}

function parseCssLengthToPx(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (!raw) return null;

  if (['small', 'x-small'].includes(raw)) return 12;
  if (['medium', 'normal'].includes(raw)) return 16;
  if (raw === 'large') return 19;
  if (raw === 'x-large') return 24;
  if (raw === 'xx-large') return 30;

  const match = raw.match(/^(-?\d+(?:\.\d+)?)(px|pt|em|rem|%)?$/);
  if (!match) return null;

  const number = Number.parseFloat(match[1]);
  if (!Number.isFinite(number) || number <= 0) return null;

  const unit = match[2] || 'px';
  if (unit === 'pt') return number * 1.333;
  if (unit === 'em' || unit === 'rem') return number * 16;
  if (unit === '%') return (number / 100) * 16;
  return number;
}

function getNodeFontSizePx(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

  const styleSize = parseCssLengthToPx(node.style?.fontSize);
  if (styleSize) return styleSize;

  if (node.tagName.toLowerCase() === 'font') {
    const fontSize = Number.parseInt(node.getAttribute('size') || '', 10);
    if (Number.isFinite(fontSize)) {
      if (fontSize <= 2) return 13;
      if (fontSize === 4) return 18;
      if (fontSize === 5) return 22;
      if (fontSize >= 6) return 26;
    }
  }

  return null;
}

function parseColorToRgb(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'inherit' || raw === 'initial' || raw === 'transparent') return null;

  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split('').map((char) => char + char).join('')
      : hexMatch[1];
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  }

  const rgbMatch = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every((part) => Number.isFinite(part))) {
      return parts.slice(0, 3).map((part) => Math.min(255, Math.max(0, Math.round(part))));
    }
  }

  const probe = document.createElement('span');
  probe.style.color = raw;
  if (!probe.style.color || probe.style.color === raw) return null;
  return parseColorToRgb(probe.style.color);
}

function isNeutralRichColor(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return true;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return (max - min) <= 22 || max <= 45 || min >= 235;
}

function getNearestRichColorClass(rgb) {
  if (isNeutralRichColor(rgb)) return '';

  let bestColor = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  RICH_COLOR_PALETTE.forEach((color) => {
    const distance = color.rgb.reduce((sum, channel, index) => {
      const delta = channel - rgb[index];
      return sum + (delta * delta);
    }, 0);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestColor = color;
    }
  });

  return bestColor?.className || '';
}

function getNodeColorClass(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
  const existingColorClass = Array.from(node.classList || []).find((className) => RICH_COLOR_CLASSES.includes(className));
  if (existingColorClass) return existingColorClass;

  const colorValue = node.style?.color || node.getAttribute('color') || '';
  const rgb = parseColorToRgb(colorValue);
  return getNearestRichColorClass(rgb);
}

function getSafeSizeClass(node, mappedTag) {
  if (['h2', 'h3', 'h4'].includes(mappedTag)) return '';
  const px = getNodeFontSizePx(node);
  if (!px) return '';
  if (px <= 13) return 'rich-size-small';
  if (px >= 24) return 'rich-size-xlarge';
  if (px >= 18) return 'rich-size-large';
  return '';
}

function getSafeIndentClass(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
  const marginPx = parseCssLengthToPx(node.style?.marginLeft);
  const paddingPx = parseCssLengthToPx(node.style?.paddingLeft);
  const indentPx = parseCssLengthToPx(node.style?.textIndent);
  const px = Math.max(marginPx || 0, paddingPx || 0, indentPx || 0);

  if (px < 14) return '';
  const level = Math.min(4, Math.max(1, Math.round(px / 32)));
  return `rich-indent-${level}`;
}

function getSafeExistingRichClasses(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return [];
  return Array.from(node.classList || []).filter((className) => (
    ['rich-align-center', 'rich-align-right', 'rich-align-justify', 'rich-size-small', 'rich-size-large', 'rich-size-xlarge', 'rich-indent-1', 'rich-indent-2', 'rich-indent-3', 'rich-indent-4', ...RICH_COLOR_CLASSES].includes(className)
  ));
}

function getSafeRichClasses(node, mappedTag) {
  const classes = new Set(getSafeExistingRichClasses(node));
  const align = getNodeTextAlign(node);
  const sizeClass = getSafeSizeClass(node, mappedTag);
  const indentClass = getSafeIndentClass(node);
  const colorClass = getNodeColorClass(node);

  if (align === 'center' || align === 'right' || align === 'justify') {
    classes.add(`rich-align-${align}`);
  }

  if (sizeClass) classes.add(sizeClass);
  if (indentClass) classes.add(indentClass);
  if (colorClass) classes.add(colorClass);

  return Array.from(classes);
}

function isNodeBold(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  const weight = String(node.style?.fontWeight || '').toLowerCase();
  return weight === 'bold' || Number.parseInt(weight, 10) >= 600;
}

function isNodeItalic(node) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
  return String(node.style?.fontStyle || '').toLowerCase() === 'italic';
}

function appendCleanChildren(target, node) {
  Array.from(node.childNodes).forEach((child) => {
    const cleanChild = cleanRichNode(child);
    if (cleanChild) target.append(cleanChild);
  });
}

function cleanRichNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const sourceTag = node.tagName.toLowerCase();
  const mappedTag = mapRichTag(sourceTag);
  const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'div', 'span', 'h2', 'h3', 'h4'];

  if (mappedTag === 'br') {
    return document.createElement('br');
  }

  if (!allowedTags.includes(mappedTag)) {
    const fragment = document.createDocumentFragment();
    appendCleanChildren(fragment, node);
    return fragment;
  }

  const safeClasses = getSafeRichClasses(node, mappedTag);
  const shouldWrapBold = isNodeBold(node) && mappedTag !== 'strong';
  const shouldWrapItalic = isNodeItalic(node) && mappedTag !== 'em';

  if (mappedTag === 'span' && !safeClasses.length && !shouldWrapBold && !shouldWrapItalic) {
    const fragment = document.createDocumentFragment();
    appendCleanChildren(fragment, node);
    return fragment;
  }

  const cleanNode = document.createElement(mappedTag);
  if (safeClasses.length) cleanNode.className = safeClasses.join(' ');

  let childTarget = cleanNode;

  if (shouldWrapBold) {
    const strong = document.createElement('strong');
    cleanNode.append(strong);
    childTarget = strong;
  }

  if (shouldWrapItalic) {
    const em = document.createElement('em');
    childTarget.append(em);
    childTarget = em;
  }

  appendCleanChildren(childTarget, node);
  return cleanNode;
}

function sanitizeRichText(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const sourceHtml = looksLikeRichHtml(raw) ? raw : convertPlainTextToRichHtml(raw);
  const template = document.createElement('template');
  template.innerHTML = sourceHtml;
  const output = document.createElement('div');

  Array.from(template.content.childNodes).forEach((node) => {
    const cleanNode = cleanRichNode(node);
    if (cleanNode) output.append(cleanNode);
  });

  if (!output.textContent.trim()) return '';
  return output.innerHTML;
}

function richTextToPlainText(value) {
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichText(value);
  return template.content.textContent.trim();
}

function renderRichText(container, value, fallback = '') {
  const cleanHtml = sanitizeRichText(value);
  container.replaceChildren();

  if (cleanHtml) {
    container.innerHTML = cleanHtml;
    return;
  }

  container.textContent = fallback;
}

function renderPosts(items) {
  postsGrid.replaceChildren();

  const publishedItems = getOrderedItems(items).filter(isPublishedItem);
  const displayedItems = publishedItems.filter(itemMatchesCategoryFilter);

  renderCategoryFilters(publishedItems);

  if (!publishedItems.length) {
    postsStatus.textContent = 'Todavía no hay publicaciones.';
    return;
  }

  if (!displayedItems.length) {
    postsStatus.textContent = 'No hay publicaciones publicadas en esta categoría.';
    return;
  }

  postsStatus.textContent = currentCategoryFilter === 'all'
    ? ''
    : `Mostrando categoría: ${getCategoryLabel(currentCategoryFilter)}`;

  const fragment = document.createDocumentFragment();

  displayedItems.forEach((item) => {
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

    const category = document.createElement('span');
    category.className = 'post-date';
    category.textContent = getCategoryLabel(item);

    const title = document.createElement('h3');
    title.textContent = item.title || 'Publicación sin título';

    const description = document.createElement('div');
    description.className = 'post-card-description rich-text-content';
    renderRichText(description, item.description || '');

    body.append(date, category, title, description);
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
