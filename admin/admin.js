const config = window.CMS_CONFIG;
const ADMIN_LOCAL_SNAPSHOT_KEY = 'cmsPublicacionesSnapshot';
const RAW_GITHUB_BASE_URL = 'https://github.com/joanramonseijosevilla-tech/cms-archivos/raw/HEAD/';
const RAW_GITHUB_DOWNLOAD_BASE_URL = 'https://raw.githubusercontent.com/joanramonseijosevilla-tech/cms-archivos/HEAD/';
const POST_CATEGORIES = [
  { value: 'galeria', label: 'Galería' },
  { value: 'proyectos', label: 'Proyectos' },
  { value: 'novedades', label: 'Novedades' }
];
const DEFAULT_POST_CATEGORY = 'galeria';
const RICH_BASE_COLOR = { value: 'base', label: 'Color', className: 'rich-color-base', hex: '#cbd5e1', rgb: [203, 213, 225] };
const RICH_COLOR_PALETTE = [
  { value: 'blue', label: 'Azul', className: 'rich-color-blue', hex: '#3b82f6', rgb: [59, 130, 246] },
  { value: 'green', label: 'Verde', className: 'rich-color-green', hex: '#22c55e', rgb: [34, 197, 94] },
  { value: 'orange', label: 'Naranja', className: 'rich-color-orange', hex: '#f59e0b', rgb: [245, 158, 11] },
  { value: 'red', label: 'Rojo', className: 'rich-color-red', hex: '#ef4444', rgb: [239, 68, 68] }
];
const RICH_COLOR_OPTIONS = [RICH_BASE_COLOR, ...RICH_COLOR_PALETTE];
const RICH_COLOR_CLASSES = RICH_COLOR_OPTIONS.map((color) => color.className);
const IMAGE_OUTPUT_MIME_TYPE = 'image/webp';
const IMAGE_OUTPUT_EXTENSION = 'webp';
const DEFAULT_IMAGE_MAX_SIDE_PX = 1600;
const DEFAULT_IMAGE_WEBP_QUALITY = 0.85;
const DEFAULT_MAX_SOURCE_IMAGE_MB = 20;
const ADMIN_PAGE_SIZE_OPTIONS = [10, 25, 50];
const DEFAULT_ADMIN_PAGE_SIZE = 10;

const state = {
  items: [],
  publicacionesUpdatedAt: '',
  password: sessionStorage.getItem('cmsPassword') || '',
  orderDirty: false,
  orderOriginalItems: null,
  previewObjectUrl: '',
  searchQuery: '',
  statusFilter: 'all',
  categoryFilter: 'all',
  formBaseline: '',
  selectedIds: new Set(),
  expandedDescriptionIds: new Set(),
  currentPage: 1,
  pageSize: DEFAULT_ADMIN_PAGE_SIZE,
  bulkCategoryEditorOpen: false,
  bulkCategoryDraft: {},
  lastFeedbackScope: 'global',
  backupRecovery: null
};

const loginView = document.querySelector('#login-view');
const adminView = document.querySelector('#admin-view');
const loginForm = document.querySelector('#login-form');
const loginPassword = document.querySelector('#login-password');
const logoutButton = document.querySelector('#logout-button');
const postForm = document.querySelector('#post-form');
const postId = document.querySelector('#post-id');
const postTitle = document.querySelector('#post-title');
const postDescription = document.querySelector('#post-description');
const postDescriptionEditor = document.querySelector('#post-description-editor');
const richTextButtons = document.querySelectorAll('[data-rich-command]');
const richColorButtons = document.querySelectorAll('[data-rich-color]');
const richColorToggle = document.querySelector('#rich-color-toggle');
const richColorMenu = document.querySelector('#rich-color-menu');
const richColorCurrentSwatch = document.querySelector('#rich-color-current-swatch');
const richColorCurrentLabel = document.querySelector('#rich-color-current-label');
const richFormatSelect = document.querySelector('#rich-format-select');
const postImage = document.querySelector('#post-image');
const postAlt = document.querySelector('#post-alt');
const postStatus = document.querySelector('#post-status');
const postCategory = document.querySelector('#post-category');
const currentImagePath = document.querySelector('#current-image-path');
const currentImageSrc = document.querySelector('#current-image-src');
const adminPosts = document.querySelector('#admin-posts');
const adminStatus = document.querySelector('#admin-status');
const adminAlert = document.querySelector('#admin-alert');
const formFeedback = document.querySelector('#form-feedback');
const listFeedback = document.querySelector('#list-feedback');
const formTitle = document.querySelector('#form-title');
const saveButton = document.querySelector('#save-button');
const cancelEditButton = document.querySelector('#cancel-edit-button');
const refreshButton = document.querySelector('#refresh-button');
const imagePreview = document.querySelector('#image-preview');
const postSearch = document.querySelector('#post-search');
const postStatusFilter = document.querySelector('#post-status-filter');
const postCategoryFilter = document.querySelector('#post-category-filter');
const clearSearchButton = document.querySelector('#clear-search-button');
const mobileMenuButton = document.querySelector('#mobile-menu-button');
const mobileQuickMenu = document.querySelector('#mobile-quick-menu');
const mobileNavButtons = document.querySelectorAll('[data-mobile-scroll]');
const helpOpenButtons = document.querySelectorAll('[data-open-help]');
const helpModal = document.querySelector('#admin-help-modal');
const helpCloseButtons = document.querySelectorAll('[data-help-close]');
const exportBackupButton = document.querySelector('#export-backup-button');
const verifyBackupFile = document.querySelector('#verify-backup-file');
const verifyBackupButton = document.querySelector('#verify-backup-button');
const backupVerifyResult = document.querySelector('#backup-verify-result');
const recoverBackupFile = document.querySelector('#recover-backup-file');
const analyzeRecoverBackupButton = document.querySelector('#analyze-recover-backup-button');
const backupRecoverResult = document.querySelector('#backup-recover-result');
const toolsFeedback = document.querySelector('#tools-feedback');
let richEditorSavedRange = null;
let richEditorActiveColorValue = 'base';

function getFriendlyErrorMessage(message) {
  const rawMessage = String(message || '').trim();

  if (!rawMessage) {
    return 'No se ha podido completar la operación. Inténtalo de nuevo. Código técnico: CMS-ERROR-GENERICO.';
  }

  if (rawMessage.includes('Falta configurar la URL del webhook')) {
    return 'El panel no está configurado correctamente. Código técnico: CMS-CONFIG-01.';
  }

  if (rawMessage.includes('Make no confirmó') || rawMessage.includes('Respuesta vacía de Make')) {
    return 'No se ha podido confirmar el guardado. Revisa la conexión e inténtalo de nuevo. Código técnico: CMS-GUARDADO-01.';
  }

  if (rawMessage.includes('Make respondió con error')) {
    const statusMatch = rawMessage.match(/error\s+(\d+)/i);
    const statusCode = statusMatch?.[1] || 'HTTP';
    return `No se ha podido completar la operación. Código técnico: CMS-GUARDADO-${statusCode}.`;
  }

  if (rawMessage.includes('GitHub API') || rawMessage.includes('data/publicaciones.json')) {
    return 'No se han podido leer los datos publicados. Inténtalo de nuevo en unos segundos. Código técnico: CMS-LECTURA-01.';
  }

  if (rawMessage.includes('GitHub') && rawMessage.includes('imagen')) {
    return 'La publicación se ha enviado, pero la imagen todavía no se ha podido comprobar. Código técnico: CMS-IMAGEN-01.';
  }

  if (rawMessage.includes('Make confirmó la subida') || rawMessage.includes('No se ha podido comprobar la imagen subida')) {
    return 'La publicación se ha guardado, pero la imagen puede tardar unos segundos en estar disponible. Código técnico: CMS-IMAGEN-02.';
  }

  return rawMessage;
}

function getFeedbackElement(scope) {
  if (scope === 'form' && formFeedback) return formFeedback;
  if (scope === 'list' && listFeedback) return listFeedback;
  if (scope === 'tools' && toolsFeedback) return toolsFeedback;
  return adminAlert;
}

function hideFeedbackElement(element) {
  if (!element) return;
  element.classList.add('hidden');
  element.textContent = '';
}

function hideOtherFeedbackElements(activeElement) {
  [adminAlert, formFeedback, listFeedback, toolsFeedback].forEach((element) => {
    if (element && element !== activeElement) hideFeedbackElement(element);
  });
}

function showAlert(message, type = 'success', options = {}) {
  const scope = options.scope || state.lastFeedbackScope || 'global';
  const target = getFeedbackElement(scope);
  const displayMessage = type === 'error' ? getFriendlyErrorMessage(message) : String(message || '');

  if (type === 'error' && displayMessage !== String(message || '')) {
    console.warn('Detalle técnico del error CMS:', message);
  }

  hideOtherFeedbackElements(target);
  target.textContent = displayMessage;
  target.className = `admin-alert admin-inline-alert ${type === 'error' ? 'error' : ''}`.trim();
  target.classList.remove('hidden');

  if (options.scroll === true) {
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    });
  }

  window.clearTimeout(target._hideTimer);
  target._hideTimer = window.setTimeout(() => target.classList.add('hidden'), type === 'error' ? 9000 : 5600);
}

function setBusy(isBusy) {
  saveButton.disabled = isBusy;
  saveButton.textContent = isBusy
    ? 'Guardando…'
    : postId.value
      ? 'Guardar cambios'
      : formTitle.textContent === 'Duplicar publicación'
        ? 'Guardar copia'
        : 'Guardar publicación';
}

function showAdmin() {
  loginView.classList.add('hidden');
  adminView.classList.remove('hidden');
  loadAdminPosts();
}

function showLogin() {
  adminView.classList.add('hidden');
  loginView.classList.remove('hidden');
}


function openAdminHelp() {
  if (!helpModal) return;
  closeMobileQuickMenu();
  helpModal.classList.remove('hidden');
  document.body.classList.add('admin-help-is-open');
  const firstSummary = helpModal.querySelector('summary');
  window.setTimeout(() => firstSummary?.focus?.(), 0);
}

function closeAdminHelp() {
  if (!helpModal) return;
  helpModal.classList.add('hidden');
  document.body.classList.remove('admin-help-is-open');
}

function closeMobileQuickMenu() {
  if (!mobileQuickMenu || !mobileMenuButton) return;
  mobileQuickMenu.classList.add('hidden');
  mobileMenuButton.setAttribute('aria-expanded', 'false');
}

function toggleMobileQuickMenu() {
  if (!mobileQuickMenu || !mobileMenuButton) return;
  const willOpen = mobileQuickMenu.classList.contains('hidden');
  mobileQuickMenu.classList.toggle('hidden', !willOpen);
  mobileMenuButton.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function getMobileScrollTarget(targetName) {
  if (targetName === 'form') return document.querySelector('#admin-form-section') || postForm;
  if (targetName === 'list') return document.querySelector('#admin-list-section') || adminPosts;
  if (targetName === 'filters') return document.querySelector('#admin-list-filters') || postSearch;
  if (targetName === 'bulk') return document.querySelector('.admin-bulk-actions') || document.querySelector('#admin-list-section') || adminPosts;
  if (targetName === 'tools') return document.querySelector('#admin-tools-section') || document.querySelector('#admin-list-section') || adminPosts;
  return document.querySelector('.admin-topbar') || adminView;
}

function scrollToAdminArea(targetName) {
  const target = getMobileScrollTarget(targetName);
  if (!target) return;

  closeMobileQuickMenu();

  const extraOffset = window.matchMedia?.('(max-width: 760px)').matches ? 76 : 16;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - extraOffset;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
}

function rememberFeedbackScopeFromEvent(event) {
  if (event.target.closest?.('#post-form')) {
    state.lastFeedbackScope = 'form';
    return;
  }

  if (
    event.target.closest?.('#admin-posts') ||
    event.target.closest?.('.admin-bulk-actions') ||
    event.target.closest?.('.admin-bulk-category-panel') ||
    event.target.closest?.('#refresh-button') ||
    event.target.closest?.('#post-search') ||
    event.target.closest?.('#post-status-filter') ||
    event.target.closest?.('#post-category-filter') ||
    event.target.closest?.('#clear-search-button') ||
    event.target.closest?.('[data-mobile-scroll]') ||
    event.target.closest?.('#mobile-menu-button') ||
    event.target.closest?.('[data-open-help]') ||
    event.target.closest?.('#admin-help-modal') ||
    event.target.closest?.('#admin-tools-section') ||
    event.target.closest?.('#export-backup-button') ||
    event.target.closest?.('#verify-backup-button') ||
    event.target.closest?.('#recover-backup-file') ||
    event.target.closest?.('#analyze-recover-backup-button') ||
    event.target.closest?.('#backup-recover-result')
  ) {
    state.lastFeedbackScope = 'list';
    return;
  }

  state.lastFeedbackScope = 'global';
}

document.addEventListener('click', rememberFeedbackScopeFromEvent, true);
document.addEventListener('submit', rememberFeedbackScopeFromEvent, true);


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
  const cleanPath = cleanRelativePath(src);
  return `${RAW_GITHUB_BASE_URL}${cleanPath}`;
}

function getPagesAssetUrl(src) {
  const cleanPath = cleanRelativePath(src);
  return `../${cleanPath}`;
}

function normalizeSrc(src) {
  if (!src) return '';
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  if (src.startsWith('http')) return src;
  if (isUploadedAssetPath(src)) return getRawGithubAssetUrl(src);
  if (src.startsWith('/')) return `..${src}`;
  return `../${src}`;
}

function setImageSrc(img, src) {
  const primarySrc = addAdminCacheBuster(src);
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

function addCacheBuster(src) {
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${Date.now()}`;
}

function addAdminCacheBuster(src) {
  const normalizedSrc = normalizeSrc(src);
  if (!normalizedSrc || normalizedSrc.startsWith('blob:') || normalizedSrc.startsWith('data:')) return normalizedSrc;
  return addCacheBuster(normalizedSrc);
}

function getAdminImageSrc(item) {
  return addAdminCacheBuster(item?.image?.src);
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function loadImageOnce(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error('La imagen todavía no está disponible.'));
    img.src = src;
  });
}

async function waitForImageReady(imagePath, maxAttempts = 10, delayMs = 800) {
  const imageUrl = normalizeSrc(imagePath);

  if (!imageUrl || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
    throw new Error('No se ha podido comprobar la imagen subida.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const cacheBustedUrl = addCacheBuster(imageUrl);

    try {
      await loadImageOnce(cacheBustedUrl);
      return cacheBustedUrl;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error('Make confirmó la subida, pero la imagen todavía no está disponible en GitHub.');
      }

      await wait(delayMs);
    }
  }

  throw new Error('No se ha podido comprobar la imagen subida.');
}

function stripPanelOnlyFields(item) {
  if (!item || typeof item !== 'object') return item;
  const { _localPreviewSrc, ...publicItem } = item;
  return publicItem;
}

function truncate(text, max = 120) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function formatDate(dateString) {
  const date = new Date(dateString || '');
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function isItemDeleted(item) {
  return item?.deleted === true || item?.status === 'deleted';
}

function getItemStatus(item) {
  if (isItemDeleted(item)) return 'deleted';
  if (item?.status === 'hidden' || item?.status === 'draft') return 'hidden';
  if (item?.status === 'published') return 'published';
  if (item?.published === false) return 'hidden';
  return 'published';
}

function getStatusLabel(item) {
  if (isItemDeleted(item)) return 'Papelera';
  return getItemStatus(item) === 'hidden' ? 'Oculto' : 'Publicado';
}

function getFormStatus() {
  return postStatus?.value === 'hidden' ? 'hidden' : 'published';
}

function isItemPublished(item) {
  return !isItemDeleted(item) && getItemStatus(item) === 'published';
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

function getFormCategory() {
  return isValidPostCategory(postCategory?.value) ? postCategory.value : DEFAULT_POST_CATEGORY;
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

function getEditorRawHtml() {
  return postDescriptionEditor ? postDescriptionEditor.innerHTML : postDescription.value;
}

function getDescriptionSnapshotValue() {
  return sanitizeRichText(getEditorRawHtml());
}

function getCleanDescriptionForSave() {
  const cleanHtml = sanitizeRichText(getEditorRawHtml());
  if (postDescriptionEditor) postDescriptionEditor.innerHTML = cleanHtml;
  postDescription.value = cleanHtml;
  return cleanHtml;
}

function setDescriptionEditorContent(value) {
  const cleanHtml = sanitizeRichText(value);
  if (postDescriptionEditor) postDescriptionEditor.innerHTML = cleanHtml;
  postDescription.value = cleanHtml;
}

function syncDescriptionFieldFromEditor() {
  if (!postDescriptionEditor) return;
  postDescription.value = postDescriptionEditor.innerHTML;
}

function saveRichEditorSelection() {
  if (!postDescriptionEditor) return;
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  if (!postDescriptionEditor.contains(range.commonAncestorContainer)) return;
  richEditorSavedRange = range.cloneRange();
}

function restoreRichEditorSelection() {
  if (!postDescriptionEditor || !richEditorSavedRange) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(richEditorSavedRange);
}

function insertHtmlAtCursor(html) {
  postDescriptionEditor?.focus();

  if (document.queryCommandSupported?.('insertHTML')) {
    document.execCommand('insertHTML', false, html);
    return;
  }

  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  const lastChild = fragment.lastChild;
  range.insertNode(fragment);

  if (lastChild) {
    range.setStartAfter(lastChild);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function handleRichTextPaste(event) {
  event.preventDefault();
  const html = event.clipboardData?.getData('text/html') || '';
  const text = event.clipboardData?.getData('text/plain') || '';
  const cleanHtml = sanitizeRichText(html || text);
  insertHtmlAtCursor(cleanHtml || escapeHtml(text));
  syncDescriptionFieldFromEditor();
  updateLivePreview();
}

function runRichTextCommand(command) {
  if (!command || !postDescriptionEditor) return;
  postDescriptionEditor.focus();
  restoreRichEditorSelection();
  document.execCommand(command, false, null);
  syncDescriptionFieldFromEditor();
  updateLivePreview();
  updateRichFormatControl();
}

function applyRichTextBlockFormat(blockTag) {
  if (!postDescriptionEditor) return;
  const safeBlockTag = ['p', 'h2', 'h3', 'h4'].includes(blockTag) ? blockTag : 'p';
  postDescriptionEditor.focus();
  restoreRichEditorSelection();
  document.execCommand('formatBlock', false, `<${safeBlockTag}>`);
  syncDescriptionFieldFromEditor();
  updateLivePreview();
  updateRichFormatControl();
}

function getRichColorOption(value) {
  return RICH_COLOR_OPTIONS.find((item) => item.value === value) || RICH_BASE_COLOR;
}

function setRichColorMenuOpen(isOpen) {
  if (!richColorMenu || !richColorToggle) return;
  richColorMenu.classList.toggle('hidden', !isOpen);
  richColorToggle.setAttribute('aria-expanded', String(isOpen));
}

function getSelectionRangeInEditor() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !postDescriptionEditor) return null;

  const range = selection.getRangeAt(0);
  return postDescriptionEditor.contains(range.commonAncestorContainer) ? range : null;
}

function getColorValueFromClassName(className) {
  return RICH_COLOR_OPTIONS.find((item) => item.className === className)?.value || '';
}

function applyRichTextColor(colorValue) {
  if (!postDescriptionEditor) return;
  const color = getRichColorOption(colorValue);

  postDescriptionEditor.focus();
  restoreRichEditorSelection();

  try {
    document.execCommand('styleWithCSS', false, true);
  } catch (error) {
    // Algunos navegadores pueden ignorar styleWithCSS. foreColor sigue funcionando.
  }

  document.execCommand('foreColor', false, color.hex);
  richEditorActiveColorValue = color.value;

  syncDescriptionFieldFromEditor();
  saveRichEditorSelection();
  updateLivePreview();
  updateRichFormatControl();
  updateRichColorControl(color.value);
  setRichColorMenuOpen(false);
}

function getCurrentRichColorValue() {
  const selection = window.getSelection();
  const selectionNode = selection?.anchorNode;

  if (!selectionNode || !postDescriptionEditor?.contains(selectionNode)) {
    return richEditorActiveColorValue || 'base';
  }

  let node = selectionNode.nodeType === Node.ELEMENT_NODE ? selectionNode : selectionNode.parentElement;
  while (node && node !== postDescriptionEditor) {
    const colorClass = Array.from(node.classList || []).find((className) => RICH_COLOR_CLASSES.includes(className));
    if (colorClass) return getColorValueFromClassName(colorClass) || 'base';

    const colorFromStyle = getNodeColorClass(node);
    if (colorFromStyle) return getColorValueFromClassName(colorFromStyle) || 'base';

    node = node.parentElement;
  }

  return richEditorActiveColorValue || 'base';
}

function updateRichColorControl(forcedColorValue = '') {
  if (!richColorToggle) return;
  const currentColor = getRichColorOption(forcedColorValue || getCurrentRichColorValue());
  richEditorActiveColorValue = currentColor.value;

  if (richColorCurrentLabel) {
    richColorCurrentLabel.textContent = currentColor.value === 'base' ? 'Color' : currentColor.label;
  }

  if (richColorCurrentSwatch) {
    richColorCurrentSwatch.className = `rich-color-swatch rich-color-swatch-${currentColor.value}`;
  }

  richColorButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.richColor === currentColor.value);
  });
}

function getCurrentRichBlockTag() {
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode || !postDescriptionEditor?.contains(selection.anchorNode)) return 'p';

  let node = selection.anchorNode.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode.parentElement;
  while (node && node !== postDescriptionEditor) {
    const tag = node.tagName?.toLowerCase();
    if (['h2', 'h3', 'h4', 'p'].includes(tag)) return tag;
    node = node.parentElement;
  }

  return 'p';
}

function updateRichFormatControl() {
  if (richFormatSelect) {
    const currentBlockTag = getCurrentRichBlockTag();
    if (richFormatSelect.value !== currentBlockTag) richFormatSelect.value = currentBlockTag;
  }
  updateRichColorControl();
}

function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function itemMatchesSearch(item, query) {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return true;

  const searchableText = normalizeSearchText([
    item?.title,
    richTextToPlainText(item?.description),
    getCategoryLabel(item)
  ].join(' '));

  return searchableText.includes(cleanQuery);
}

function getSearchQuery() {
  return normalizeSearchText(state.searchQuery);
}

function hasActiveSearch() {
  return Boolean(getSearchQuery());
}

function getStatusFilter() {
  return ['published', 'hidden', 'trash'].includes(state.statusFilter)
    ? state.statusFilter
    : 'all';
}

function hasActiveStatusFilter() {
  return getStatusFilter() !== 'all';
}

function getCategoryFilter() {
  return isValidPostCategory(state.categoryFilter) ? state.categoryFilter : 'all';
}

function hasActiveCategoryFilter() {
  return getCategoryFilter() !== 'all';
}

function hasActiveListFilter() {
  return hasActiveSearch() || hasActiveStatusFilter() || hasActiveCategoryFilter();
}

function itemMatchesStatusFilter(item) {
  const filter = getStatusFilter();

  if (filter === 'trash') return isItemDeleted(item);
  if (isItemDeleted(item)) return false;
  if (filter === 'all') return true;
  if (filter === 'published') return isItemPublished(item);
  return !isItemPublished(item);
}

function itemMatchesCategoryFilter(item) {
  const filter = getCategoryFilter();
  if (filter === 'all') return true;
  return getItemCategory(item) === filter;
}

function getPostStats(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const activeItems = safeItems.filter((item) => !isItemDeleted(item));
  const deleted = safeItems.length - activeItems.length;
  const published = activeItems.filter((item) => isItemPublished(item)).length;
  const hidden = activeItems.length - published;
  const categoryCounts = POST_CATEGORIES.reduce((counts, category) => {
    counts[category.value] = activeItems.filter((item) => getItemCategory(item) === category.value).length;
    return counts;
  }, {});

  return {
    total: activeItems.length,
    published,
    hidden,
    deleted,
    categories: categoryCounts
  };
}

function buildStatusText(displayedCount, fullItems) {
  const stats = getPostStats(fullItems);
  const filterActive = hasActiveListFilter();
  const parts = [
    `Total: ${stats.total}`,
    `Publicadas: ${stats.published}`,
    `Ocultas: ${stats.hidden}`,
    `Papelera: ${stats.deleted}`,
    `Galería: ${stats.categories.galeria || 0}`,
    `Proyectos: ${stats.categories.proyectos || 0}`,
    `Novedades: ${stats.categories.novedades || 0}`
  ];

  if (filterActive) {
    parts.push(`Mostrando: ${displayedCount}`);
  }

  return parts.join(' · ');
}

function updateSearchControls() {
  if (postStatusFilter && postStatusFilter.value !== getStatusFilter()) {
    postStatusFilter.value = getStatusFilter();
  }

  if (postCategoryFilter && postCategoryFilter.value !== getCategoryFilter()) {
    postCategoryFilter.value = getCategoryFilter();
  }

  if (!clearSearchButton) return;
  clearSearchButton.classList.toggle('hidden', !hasActiveListFilter());
}


function cleanSelectedPosts() {
  const existingIds = new Set((Array.isArray(state.items) ? state.items : []).map((item) => item.id));
  state.selectedIds = new Set([...state.selectedIds].filter((id) => existingIds.has(id)));
}

function getSelectedItems() {
  cleanSelectedPosts();
  return getOrderedItems(state.items).filter((item) => state.selectedIds.has(item.id));
}

function getSelectedActiveItems() {
  return getSelectedItems().filter((item) => !isItemDeleted(item));
}

function getSelectedDeletedItems() {
  return getSelectedItems().filter((item) => isItemDeleted(item));
}

function clearPostSelection() {
  state.selectedIds.clear();
  closeBulkCategoryEditor(false);
  renderAdminPosts();
}

function togglePostSelection(id, isSelected) {
  if (!id) return;

  if (isSelected) {
    state.selectedIds.add(id);
  } else {
    state.selectedIds.delete(id);
  }

  renderAdminPosts();
}

function setVisiblePostsSelection(items, isSelected) {
  const visibleIds = (Array.isArray(items) ? items : [])
    .map((item) => item.id)
    .filter(Boolean);

  visibleIds.forEach((id) => {
    if (isSelected) {
      state.selectedIds.add(id);
    } else {
      state.selectedIds.delete(id);
    }
  });

  renderAdminPosts();
}

function createBulkActionOption(value, label, disabled = false) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  option.disabled = disabled;
  return option;
}

function getPostCountLabel(count) {
  return `${count} publicación${count === 1 ? '' : 'es'}`;
}

function getBulkToggleStatusLabel(publishedCount, hiddenCount) {
  const parts = [];

  if (hiddenCount > 0) {
    parts.push(`Publicar ${hiddenCount} oculta${hiddenCount === 1 ? '' : 's'}`);
  }

  if (publishedCount > 0) {
    parts.push(`ocultar ${publishedCount} publicada${publishedCount === 1 ? '' : 's'}`);
  }

  if (!parts.length) return 'Cambiar estado de seleccionadas';
  return parts.join(' y ');
}

function getBulkCategoryActions(selectedActiveItems) {
  const safeItems = Array.isArray(selectedActiveItems) ? selectedActiveItems : [];

  return POST_CATEGORIES
    .map((category) => {
      const changeCount = safeItems.filter((item) => getItemCategory(item) !== category.value).length;

      if (!changeCount) return null;

      return {
        value: `category:${category.value}`,
        label: `Pasar ${changeCount} seleccionada${changeCount === 1 ? '' : 's'} a ${category.label}`
      };
    })
    .filter(Boolean);
}

function createBulkActionsBar(displayedItems) {
  cleanSelectedPosts();

  const selectedItems = getSelectedItems();
  const selectedActiveItems = selectedItems.filter((item) => !isItemDeleted(item));
  const selectedDeletedItems = selectedItems.filter((item) => isItemDeleted(item));
  const selectedPublishedItems = selectedActiveItems.filter((item) => getItemStatus(item) === 'published');
  const selectedHiddenItems = selectedActiveItems.filter((item) => getItemStatus(item) === 'hidden');
  const visibleIds = (Array.isArray(displayedItems) ? displayedItems : [])
    .map((item) => item.id)
    .filter(Boolean);
  const visibleSelectedCount = visibleIds.filter((id) => state.selectedIds.has(id)).length;
  const isTrashContext = getStatusFilter() === 'trash' || (selectedDeletedItems.length > 0 && selectedActiveItems.length === 0);
  const hasSelection = selectedItems.length > 0;

  const availableActions = [];

  if (isTrashContext) {
    if (selectedDeletedItems.length) {
      availableActions.push(
        {
          value: 'restore',
          label: `Restaurar ${getPostCountLabel(selectedDeletedItems.length)}`
        },
        {
          value: 'delete_forever',
          label: `Eliminar definitivamente ${getPostCountLabel(selectedDeletedItems.length)}`
        }
      );
    }
  } else {
    if (selectedActiveItems.length) {
      availableActions.push({
        value: 'toggle_status',
        label: getBulkToggleStatusLabel(selectedPublishedItems.length, selectedHiddenItems.length)
      });

      availableActions.push({
        value: 'category_editor',
        label: `Cambiar categoría de ${selectedActiveItems.length} seleccionada${selectedActiveItems.length === 1 ? '' : 's'}...`
      });

      availableActions.push({
        value: 'trash',
        label: `Mover ${selectedActiveItems.length} seleccionada${selectedActiveItems.length === 1 ? '' : 's'} a papelera`
      });
    }
  }

  const bar = document.createElement('div');
  bar.className = 'admin-bulk-actions';

  const selectionLabel = document.createElement('label');
  selectionLabel.className = 'admin-bulk-selection';

  const selectVisibleCheckbox = document.createElement('input');
  selectVisibleCheckbox.type = 'checkbox';
  selectVisibleCheckbox.disabled = !visibleIds.length;
  selectVisibleCheckbox.checked = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  selectVisibleCheckbox.indeterminate = visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;
  selectVisibleCheckbox.addEventListener('change', () => {
    setVisiblePostsSelection(displayedItems, selectVisibleCheckbox.checked);
  });

  const selectionText = document.createElement('span');
  selectionText.textContent = 'Seleccionar mostradas';

  selectionLabel.append(selectVisibleCheckbox, selectionText);

  const selectionCount = document.createElement('span');
  selectionCount.className = 'admin-bulk-count';
  selectionCount.textContent = hasSelection
    ? `${selectedItems.length} seleccionada${selectedItems.length === 1 ? '' : 's'}`
    : 'Ninguna seleccionada';

  const controls = document.createElement('div');
  controls.className = 'admin-bulk-controls';

  const actionSelect = document.createElement('select');
  actionSelect.className = 'admin-bulk-action-select';
  actionSelect.setAttribute('aria-label', 'Acciones por lote');
  actionSelect.disabled = !hasSelection || state.orderDirty || !availableActions.length;

  actionSelect.append(createBulkActionOption('', availableActions.length ? 'Acciones por lote' : 'Sin acciones disponibles'));

  availableActions.forEach((action) => {
    actionSelect.append(createBulkActionOption(action.value, action.label, Boolean(action.disabled)));
  });

  const applyActionButton = document.createElement('button');
  applyActionButton.type = 'button';
  applyActionButton.className = 'button button-small';
  applyActionButton.textContent = 'Aplicar';
  applyActionButton.disabled = !hasSelection || state.orderDirty || !availableActions.length;
  applyActionButton.addEventListener('click', async () => {
    state.lastFeedbackScope = 'list';
    const action = actionSelect.value;

    if (!action) {
      showAlert('Elige una acción por lote antes de aplicar.', 'error');
      return;
    }

    if (action === 'toggle_status') await toggleSelectedPostsStatus();
    if (action === 'category_editor') openBulkCategoryEditor();
    if (action === 'trash') await moveSelectedPostsToTrash();
    if (action === 'restore') await restoreSelectedPosts();
    if (action === 'delete_forever') await deleteSelectedPostsForever();
  });

  const clearSelectionButton = document.createElement('button');
  clearSelectionButton.type = 'button';
  clearSelectionButton.className = 'button button-small button-secondary';
  clearSelectionButton.textContent = 'Limpiar selección';
  clearSelectionButton.disabled = !hasSelection;
  clearSelectionButton.addEventListener('click', clearPostSelection);

  controls.append(actionSelect, applyActionButton, clearSelectionButton);
  bar.append(selectionLabel, selectionCount, controls);

  return bar;
}

function getBulkCategoryDraftForSelectedItems(selectedItems) {
  const safeItems = Array.isArray(selectedItems) ? selectedItems : [];
  const selectedIdSet = new Set(safeItems.map((item) => item.id));
  const nextDraft = {};

  safeItems.forEach((item) => {
    const draftCategory = state.bulkCategoryDraft?.[item.id];
    nextDraft[item.id] = isValidPostCategory(draftCategory) ? draftCategory : getItemCategory(item);
  });

  Object.keys(state.bulkCategoryDraft || {}).forEach((id) => {
    if (!selectedIdSet.has(id)) delete state.bulkCategoryDraft[id];
  });

  state.bulkCategoryDraft = nextDraft;
  return nextDraft;
}

function getBulkCategoryChangeCount(selectedItems) {
  const draft = getBulkCategoryDraftForSelectedItems(selectedItems);
  return selectedItems.filter((item) => draft[item.id] && draft[item.id] !== getItemCategory(item)).length;
}

function closeBulkCategoryEditor(shouldRender = true) {
  state.bulkCategoryEditorOpen = false;
  state.bulkCategoryDraft = {};
  if (shouldRender) renderAdminPosts();
}

function openBulkCategoryEditor() {
  if (blockIfPendingOrder()) return;

  const selectedItems = getSelectedActiveItems();
  if (!selectedItems.length) {
    showAlert('Selecciona publicaciones activas para cambiar su categoría.', 'error');
    return;
  }

  getBulkCategoryDraftForSelectedItems(selectedItems);
  state.bulkCategoryEditorOpen = true;
  renderAdminPosts();
}

function setBulkCategoryDraft(id, category) {
  if (!id || !isValidPostCategory(category)) return;
  state.bulkCategoryDraft = {
    ...(state.bulkCategoryDraft || {}),
    [id]: category
  };
  renderAdminPosts();
}

function setBulkCategoryDraftForAll(category) {
  if (!isValidPostCategory(category)) return;

  const selectedItems = getSelectedActiveItems();
  const nextDraft = {};

  selectedItems.forEach((item) => {
    nextDraft[item.id] = category;
  });

  state.bulkCategoryDraft = nextDraft;
  renderAdminPosts();
}

function createCategorySelect(value, onChange) {
  const select = document.createElement('select');
  select.className = 'admin-bulk-category-select';

  POST_CATEGORIES.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.value;
    option.textContent = category.label;
    select.append(option);
  });

  select.value = isValidPostCategory(value) ? value : DEFAULT_POST_CATEGORY;
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function createBulkCategoryPanel() {
  const selectedItems = getSelectedActiveItems();
  const panel = document.createElement('section');
  panel.className = 'admin-bulk-category-panel';

  const title = document.createElement('h3');
  title.textContent = 'Cambiar categoría por lotes';

  if (!selectedItems.length) {
    const emptyText = document.createElement('p');
    emptyText.textContent = 'No hay publicaciones activas seleccionadas.';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'button button-secondary button-small';
    closeButton.textContent = 'Cerrar';
    closeButton.addEventListener('click', () => closeBulkCategoryEditor());

    panel.append(title, emptyText, closeButton);
    return panel;
  }

  const draft = getBulkCategoryDraftForSelectedItems(selectedItems);
  const changeCount = getBulkCategoryChangeCount(selectedItems);

  const intro = document.createElement('p');
  intro.className = 'admin-bulk-category-intro';
  intro.textContent = `${selectedItems.length} seleccionada${selectedItems.length === 1 ? '' : 's'}. Puedes poner una misma categoría a todas o ajustar cada una antes de guardar.`;

  const quickRow = document.createElement('div');
  quickRow.className = 'admin-bulk-category-quick';

  const quickLabel = document.createElement('span');
  quickLabel.textContent = 'Poner todas en:';

  const quickSelect = createCategorySelect(DEFAULT_POST_CATEGORY, () => {});

  const quickButton = document.createElement('button');
  quickButton.type = 'button';
  quickButton.className = 'button button-small button-secondary';
  quickButton.textContent = 'Aplicar a la selección';
  quickButton.addEventListener('click', () => setBulkCategoryDraftForAll(quickSelect.value));

  quickRow.append(quickLabel, quickSelect, quickButton);

  const list = document.createElement('div');
  list.className = 'admin-bulk-category-list';

  selectedItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'admin-bulk-category-row';

    const itemInfo = document.createElement('div');
    itemInfo.className = 'admin-bulk-category-item';

    const itemTitle = document.createElement('strong');
    itemTitle.textContent = item.title || 'Sin título';

    const currentCategory = document.createElement('span');
    currentCategory.textContent = `Actual: ${getCategoryLabel(item)}`;

    itemInfo.append(itemTitle, currentCategory);

    const arrow = document.createElement('span');
    arrow.className = 'admin-bulk-category-arrow';
    arrow.textContent = '→';

    const categorySelect = createCategorySelect(draft[item.id] || getItemCategory(item), (nextCategory) => {
      setBulkCategoryDraft(item.id, nextCategory);
    });

    row.append(itemInfo, arrow, categorySelect);
    list.append(row);
  });

  const status = document.createElement('p');
  status.className = 'admin-bulk-category-status';
  status.textContent = changeCount
    ? `${changeCount} cambio${changeCount === 1 ? '' : 's'} de categoría pendiente${changeCount === 1 ? '' : 's'}.`
    : 'No hay cambios de categoría pendientes.';

  const actions = document.createElement('div');
  actions.className = 'admin-bulk-category-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'button button-small';
  saveButton.textContent = 'Guardar categorías';
  saveButton.disabled = !changeCount;
  saveButton.addEventListener('click', saveBulkCategoryChanges);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'button button-small button-secondary';
  cancelButton.textContent = 'Cancelar';
  cancelButton.addEventListener('click', () => closeBulkCategoryEditor());

  actions.append(saveButton, cancelButton);
  panel.append(title, intro, quickRow, list, status, actions);

  return panel;
}

async function saveBulkCategoryChanges() {
  if (blockIfPendingOrder()) return;

  const selectedItems = getSelectedActiveItems();
  if (!selectedItems.length) {
    showAlert('No hay publicaciones activas seleccionadas para cambiar de categoría.', 'error');
    closeBulkCategoryEditor();
    return;
  }

  const draft = getBulkCategoryDraftForSelectedItems(selectedItems);
  const changes = selectedItems
    .map((item) => ({
      id: item.id,
      from: getItemCategory(item),
      to: isValidPostCategory(draft[item.id]) ? draft[item.id] : getItemCategory(item)
    }))
    .filter((change) => change.to !== change.from);

  if (!changes.length) {
    showAlert('No hay cambios de categoría para guardar.');
    return;
  }

  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de guardar categorías por lote, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  const confirmed = window.confirm(`¿Guardar ${changes.length} cambio${changes.length === 1 ? '' : 's'} de categoría? Se hará una sola actualización.`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const changesById = changes.reduce((map, change) => {
      map[change.id] = change.to;
      return map;
    }, {});
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        const nextCategory = changesById[currentItem.id];
        if (!nextCategory) return currentItem;
        return {
          ...currentItem,
          category: nextCategory,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_category_editor',
      changes
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    closeBulkCategoryEditor(false);
    setStateFromPublicacionesJson(nextPublicacionesJson);
    resetAdminPagination();
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${changes.length} cambio${changes.length === 1 ? '' : 's'} de categoría guardado${changes.length === 1 ? '' : 's'} correctamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

function getManualOrderValue(item) {
  const order = Number(item?.order);
  return Number.isFinite(order) ? order : null;
}

function getCreatedAtTime(item) {
  const time = Date.parse(item?.createdAt || '');
  return Number.isNaN(time) ? 0 : time;
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

function normalizeItemsWithOrder(items) {
  return getOrderedItems(items).map((item, index) => ({
    ...item,
    category: getItemCategory(item),
    order: index
  }));
}

function normalizePublicacionesJson(data) {
  return {
    version: data?.version || 1,
    updatedAt: data?.updatedAt || '',
    items: normalizeItemsWithOrder(Array.isArray(data?.items) ? data.items : [])
  };
}

function getUpdatedAtTime(data) {
  const time = Date.parse(data?.updatedAt || '');
  return Number.isNaN(time) ? 0 : time;
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

function readLocalSnapshot() {
  try {
    const raw = localStorage.getItem(ADMIN_LOCAL_SNAPSHOT_KEY);
    if (!raw) return null;
    return normalizePublicacionesJson(JSON.parse(raw));
  } catch (error) {
    console.warn('No se pudo leer la copia local del panel:', error);
    return null;
  }
}

function saveLocalSnapshot(publicacionesJson) {
  try {
    localStorage.setItem(ADMIN_LOCAL_SNAPSHOT_KEY, JSON.stringify(normalizePublicacionesJson(publicacionesJson)));
  } catch (error) {
    console.warn('No se pudo guardar la copia local del panel:', error);
  }
}

function chooseNewestPublicacionesJson(remoteJson, localJson) {
  if (localJson && getUpdatedAtTime(localJson) > getUpdatedAtTime(remoteJson)) {
    return localJson;
  }

  return remoteJson;
}

function setStateFromPublicacionesJson(publicacionesJson) {
  const normalized = normalizePublicacionesJson(publicacionesJson);
  state.items = normalized.items;
  state.publicacionesUpdatedAt = normalized.updatedAt;
  cleanSelectedPosts();
}

function clearPendingOrder() {
  state.orderDirty = false;
  state.orderOriginalItems = null;
}

function blockIfPendingOrder() {
  if (!state.orderDirty) return false;
  showAlert('Tienes cambios de orden pendientes. Pulsa Guardar orden o Cancelar cambios antes de hacer otra acción.', 'error');
  return true;
}

function getSelectedImageSignature() {
  const file = postImage.files[0];
  if (!file) return '';

  return [file.name, file.size, file.type, file.lastModified].join('|');
}

function getFormSnapshot() {
  return JSON.stringify({
    id: postId.value || '',
    title: postTitle.value || '',
    description: getDescriptionSnapshotValue(),
    alt: postAlt.value || '',
    status: getFormStatus(),
    category: getFormCategory(),
    currentImagePath: currentImagePath.value || '',
    currentImageSrc: currentImageSrc.value || '',
    image: getSelectedImageSignature()
  });
}

function updateFormBaseline() {
  state.formBaseline = getFormSnapshot();
}

function hasUnsavedFormChanges() {
  return Boolean(state.formBaseline) && getFormSnapshot() !== state.formBaseline;
}

function confirmDiscardFormChanges(message = 'Tienes cambios sin guardar en el formulario. ¿Quieres descartarlos?') {
  if (!hasUnsavedFormChanges()) return true;
  return window.confirm(message);
}

function blockIfUnsavedFormChanges(message) {
  if (confirmDiscardFormChanges(message)) return false;
  showAlert('Acción cancelada. Guarda la publicación o cancela los cambios antes de continuar.', 'error');
  return true;
}

function confirmAndDiscardFormChangesBeforeBulkAction(message) {
  if (!hasUnsavedFormChanges()) return true;

  if (!confirmDiscardFormChanges(message)) {
    showAlert('Acción cancelada. Guarda la publicación o cancela los cambios antes de continuar.', 'error');
    return false;
  }

  resetForm();
  return true;
}

function hasReusableCurrentImage() {
  return Boolean(currentImagePath.value || currentImageSrc.value);
}

function getReusableCurrentImage(title, alt) {
  const imagePath = currentImagePath.value || cleanRelativePath(currentImageSrc.value || '');
  const imageSrc = currentImageSrc.value || imagePath;

  if (!imagePath && !imageSrc) {
    throw new Error('La publicación duplicada no tiene imagen reutilizable. Selecciona una imagen nueva.');
  }

  return {
    src: imageSrc,
    path: imagePath || cleanRelativePath(imageSrc),
    alt: alt || title
  };
}

function validateRequiredPostFields(isEdit, file) {
  const title = postTitle.value.trim();
  const description = getCleanDescriptionForSave();
  const descriptionText = richTextToPlainText(description);
  const alt = postAlt.value.trim();
  const allowMissingImage = isEdit || hasReusableCurrentImage();

  if (!title) {
    postTitle.focus();
    throw new Error('El título es obligatorio.');
  }

  if (!descriptionText) {
    postDescriptionEditor?.focus();
    throw new Error('La descripción es obligatoria.');
  }

  validateImage(file, allowMissingImage);

  return { title, description, alt };
}

async function fetchPublicacionesJsonFromGitHubApi() {
  if (!config.GITHUB_JSON_API_URL) {
    throw new Error('No hay URL de GitHub API configurada.');
  }

  const response = await fetch(addCacheBuster(config.GITHUB_JSON_API_URL), {
    cache: 'no-store',
    headers: { 'Accept': 'application/vnd.github+json' }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer GitHub API (${response.status}).`);
  }

  const data = await response.json();
  if (!data || typeof data.content !== 'string') {
    throw new Error('GitHub API no devolvió el contenido esperado.');
  }

  return normalizePublicacionesJson(decodeBase64Json(data.content));
}

async function fetchPublicacionesJsonFromPages() {
  const response = await fetch(addCacheBuster(config.PUBLIC_JSON_URL), {
    cache: 'no-store',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer data/publicaciones.json (${response.status}).`);
  }

  return normalizePublicacionesJson(await response.json());
}

async function loadPublicacionesJsonForPanel() {
  try {
    return await fetchPublicacionesJsonFromGitHubApi();
  } catch (apiError) {
    console.warn('No se pudo leer desde GitHub API. Se usa fallback de GitHub Pages:', apiError);
    return fetchPublicacionesJsonFromPages();
  }
}

async function loadPublicacionesJsonForMake() {
  return loadPublicacionesJsonForPanel();
}

async function loadAdminPosts() {
  adminStatus.textContent = 'Cargando publicaciones…';
  adminPosts.replaceChildren();

  try {
    const remoteJson = await loadPublicacionesJsonForPanel();
    const localJson = readLocalSnapshot();
    const newestJson = chooseNewestPublicacionesJson(remoteJson, localJson);

    setStateFromPublicacionesJson(newestJson);
    clearPendingOrder();

    if (newestJson === remoteJson) {
      saveLocalSnapshot(remoteJson);
    }

    renderAdminPosts();
  } catch (error) {
    const localJson = readLocalSnapshot();

    if (localJson) {
      setStateFromPublicacionesJson(localJson);
      clearPendingOrder();
      renderAdminPosts();
      console.warn('Se muestra la última versión confirmada en este navegador porque no se pudo leer el JSON remoto:', error);
      return;
    }

    adminStatus.textContent = 'No se han podido cargar las publicaciones.';
    console.error(error);
  }
}


function shouldCollapseAdminDescription(value) {
  const cleanHtml = sanitizeRichText(value || '');
  if (!cleanHtml) return false;

  const template = document.createElement('template');
  template.innerHTML = cleanHtml;
  const plainText = template.content.textContent.trim();
  const blockCount = template.content.querySelectorAll('p, div, li, h2, h3, h4, ul, ol').length;

  return plainText.length > 260 || blockCount > 4;
}

function toggleAdminDescription(postId) {
  if (!postId) return;

  if (state.expandedDescriptionIds.has(postId)) {
    state.expandedDescriptionIds.delete(postId);
  } else {
    state.expandedDescriptionIds.add(postId);
  }

  renderAdminPosts();
}


function getSafePageSize() {
  const numericPageSize = Number(state.pageSize);
  return ADMIN_PAGE_SIZE_OPTIONS.includes(numericPageSize) ? numericPageSize : DEFAULT_ADMIN_PAGE_SIZE;
}

function getMaxPage(totalItems) {
  const pageSize = getSafePageSize();
  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

function clampCurrentPage(totalItems) {
  const maxPage = getMaxPage(totalItems);
  const numericCurrentPage = Number(state.currentPage);
  state.currentPage = Number.isFinite(numericCurrentPage)
    ? Math.min(Math.max(1, Math.floor(numericCurrentPage)), maxPage)
    : 1;
  return state.currentPage;
}

function resetAdminPagination() {
  state.currentPage = 1;
}

function getPaginatedItems(items) {
  const safeItems = Array.isArray(items) ? items : [];
  const pageSize = getSafePageSize();
  const currentPage = clampCurrentPage(safeItems.length);
  const startIndex = (currentPage - 1) * pageSize;
  return safeItems.slice(startIndex, startIndex + pageSize);
}

function getPaginationRange(totalItems) {
  const total = Math.max(0, totalItems);
  if (!total) {
    return { start: 0, end: 0, total, currentPage: 1, maxPage: 1 };
  }

  const pageSize = getSafePageSize();
  const currentPage = clampCurrentPage(total);
  const start = ((currentPage - 1) * pageSize) + 1;
  const end = Math.min(start + pageSize - 1, total);
  return { start, end, total, currentPage, maxPage: getMaxPage(total) };
}

function scrollToAdminList() {
  const target = adminPosts || adminStatus;
  if (!target) return;
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function setAdminPage(nextPage, shouldScroll = true) {
  const maxPage = getMaxPage(getFilteredAdminItems().length);
  const numericNextPage = Number(nextPage);
  state.currentPage = Number.isFinite(numericNextPage)
    ? Math.min(Math.max(1, Math.floor(numericNextPage)), maxPage)
    : 1;
  renderAdminPosts();
  if (shouldScroll) scrollToAdminList();
}

function setAdminPageSize(nextPageSize) {
  const numericPageSize = Number(nextPageSize);
  state.pageSize = ADMIN_PAGE_SIZE_OPTIONS.includes(numericPageSize) ? numericPageSize : DEFAULT_ADMIN_PAGE_SIZE;
  resetAdminPagination();
  renderAdminPosts();
  scrollToAdminList();
}

function getFilteredAdminItems() {
  const fullOrderedItems = getOrderedItems(state.items);
  return fullOrderedItems.filter((item) => (
    itemMatchesSearch(item, state.searchQuery) && itemMatchesStatusFilter(item) && itemMatchesCategoryFilter(item)
  ));
}

function createPaginationControls(totalItems, options = {}) {
  const range = getPaginationRange(totalItems);
  const compact = Boolean(options.compact);
  const pagination = document.createElement('div');
  pagination.className = `admin-pagination${compact ? ' admin-pagination-compact' : ''}`;

  const info = document.createElement('p');
  info.className = 'admin-pagination-info';
  info.textContent = range.total
    ? `Mostrando ${range.start}–${range.end} de ${range.total}`
    : 'No hay publicaciones para mostrar.';

  const controls = document.createElement('div');
  controls.className = 'admin-pagination-controls';

  if (!compact) {
    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.className = 'admin-page-size';

    const pageSizeText = document.createElement('span');
    pageSizeText.textContent = 'Mostrar';

    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.setAttribute('aria-label', 'Publicaciones por página');

    ADMIN_PAGE_SIZE_OPTIONS.forEach((optionValue) => {
      const option = document.createElement('option');
      option.value = String(optionValue);
      option.textContent = String(optionValue);
      option.selected = optionValue === getSafePageSize();
      pageSizeSelect.append(option);
    });

    pageSizeSelect.addEventListener('change', () => setAdminPageSize(pageSizeSelect.value));

    const pageSizeSuffix = document.createElement('span');
    pageSizeSuffix.textContent = 'por página';

    pageSizeLabel.append(pageSizeText, pageSizeSelect, pageSizeSuffix);
    controls.append(pageSizeLabel);
  }

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'button button-small button-secondary';
  prevButton.textContent = 'Anterior';
  prevButton.disabled = range.currentPage <= 1 || !range.total;
  prevButton.addEventListener('click', () => setAdminPage(range.currentPage - 1));

  const pageLabel = document.createElement('span');
  pageLabel.className = 'admin-pagination-page';
  pageLabel.textContent = `Página ${range.currentPage} de ${range.maxPage}`;

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'button button-small button-secondary';
  nextButton.textContent = 'Siguiente';
  nextButton.disabled = range.currentPage >= range.maxPage || !range.total;
  nextButton.addEventListener('click', () => setAdminPage(range.currentPage + 1));

  controls.append(prevButton, pageLabel, nextButton);
  pagination.append(info, controls);

  return pagination;
}


function renderAdminPosts() {
  adminPosts.replaceChildren();
  updateSearchControls();

  if (!state.items.length) {
    adminStatus.textContent = 'Todavía no hay publicaciones.';
    return;
  }

  const fullOrderedItems = getOrderedItems(state.items);
  const activeOrderedItems = fullOrderedItems.filter((item) => !isItemDeleted(item));
  const filterActive = hasActiveListFilter();
  const displayedItems = getFilteredAdminItems();

  clampCurrentPage(displayedItems.length);
  const paginatedItems = getPaginatedItems(displayedItems);

  adminStatus.textContent = buildStatusText(displayedItems.length, fullOrderedItems);

  const fragment = document.createDocumentFragment();

  cleanSelectedPosts();

  if (state.orderDirty) {
    const orderNotice = document.createElement('div');
    orderNotice.className = 'admin-alert';
    orderNotice.textContent = 'Orden cambiado en pantalla. Pulsa Guardar orden para publicarlo o Cancelar cambios para deshacerlo.';

    const orderActions = document.createElement('div');
    orderActions.className = 'admin-post-actions';

    const saveOrderButton = document.createElement('button');
    saveOrderButton.type = 'button';
    saveOrderButton.className = 'button';
    saveOrderButton.textContent = 'Guardar orden';
    saveOrderButton.addEventListener('click', saveManualOrder);

    const cancelOrderButton = document.createElement('button');
    cancelOrderButton.type = 'button';
    cancelOrderButton.className = 'button button-secondary';
    cancelOrderButton.textContent = 'Cancelar cambios';
    cancelOrderButton.addEventListener('click', cancelManualOrder);

    orderActions.append(saveOrderButton, cancelOrderButton);
    fragment.append(orderNotice, orderActions);
  }

  if (displayedItems.length) {
    fragment.append(createPaginationControls(displayedItems.length));
  }

  fragment.append(createBulkActionsBar(paginatedItems));

  if (state.bulkCategoryEditorOpen) {
    fragment.append(createBulkCategoryPanel());
  }

  paginatedItems
    .forEach((item) => {
      const fullIndex = fullOrderedItems.findIndex((orderedItem) => orderedItem.id === item.id);
      const card = document.createElement('article');
      card.className = 'admin-post';

      const img = document.createElement('img');
      setImageSrc(img, item.image?.src);
      img.alt = item.image?.alt || item.title || 'Imagen de publicación';
      img.loading = 'lazy';

      if (state.selectedIds.has(item.id)) {
        card.classList.add('is-selected');
      }

      const content = document.createElement('div');

      const selectLabel = document.createElement('label');
      selectLabel.className = 'admin-post-select';

      const selectCheckbox = document.createElement('input');
      selectCheckbox.type = 'checkbox';
      selectCheckbox.checked = state.selectedIds.has(item.id);
      selectCheckbox.addEventListener('change', () => togglePostSelection(item.id, selectCheckbox.checked));

      const selectText = document.createElement('span');
      selectText.textContent = 'Seleccionar';

      selectLabel.append(selectCheckbox, selectText);

      const title = document.createElement('h3');
      title.textContent = item.title || 'Sin título';

      const meta = document.createElement('div');
      meta.className = 'admin-post-meta';

      const date = document.createElement('p');
      date.className = 'admin-post-date';
      date.textContent = formatDate(item.createdAt);

      const status = document.createElement('p');
      status.className = `admin-post-status ${isItemPublished(item) ? '' : 'hidden-status'}`.trim();
      status.textContent = getStatusLabel(item);

      const category = document.createElement('p');
      category.className = 'admin-post-status';
      category.textContent = getCategoryLabel(item);

      meta.append(date, status, category);

      const description = document.createElement('div');
      description.className = 'admin-post-description rich-text-content';
      renderRichText(description, item.description || '');

      const descriptionNeedsToggle = shouldCollapseAdminDescription(item.description || '');
      const descriptionExpanded = state.expandedDescriptionIds.has(item.id);

      if (descriptionNeedsToggle && !descriptionExpanded) {
        description.classList.add('is-collapsed');
      }

      const descriptionToggle = document.createElement('button');
      descriptionToggle.type = 'button';
      descriptionToggle.className = 'admin-description-toggle';
      descriptionToggle.textContent = descriptionExpanded ? 'Ver menos' : 'Ver más';
      descriptionToggle.setAttribute('aria-expanded', descriptionExpanded ? 'true' : 'false');
      descriptionToggle.addEventListener('click', () => toggleAdminDescription(item.id));

      const actions = document.createElement('div');
      actions.className = 'admin-post-actions';

      if (isItemDeleted(item)) {
        const restoreButton = document.createElement('button');
        restoreButton.type = 'button';
        restoreButton.className = 'button button-secondary';
        restoreButton.textContent = 'Restaurar';
        restoreButton.addEventListener('click', () => restorePost(item));

        const deleteForeverButton = document.createElement('button');
        deleteForeverButton.type = 'button';
        deleteForeverButton.className = 'button button-danger';
        deleteForeverButton.textContent = 'Eliminar definitivamente';
        deleteForeverButton.addEventListener('click', () => deletePostForever(item));

        actions.append(restoreButton, deleteForeverButton);
      } else {
        const activeIndex = activeOrderedItems.findIndex((orderedItem) => orderedItem.id === item.id);

        const moveUpButton = document.createElement('button');
        moveUpButton.type = 'button';
        moveUpButton.className = 'button button-secondary';
        moveUpButton.textContent = 'Subir';
        moveUpButton.disabled = filterActive || activeIndex === 0;
        moveUpButton.title = filterActive ? 'Limpia la búsqueda y los filtros para cambiar el orden.' : '';
        moveUpButton.addEventListener('click', () => movePost(item, -1));

        const moveDownButton = document.createElement('button');
        moveDownButton.type = 'button';
        moveDownButton.className = 'button button-secondary';
        moveDownButton.textContent = 'Bajar';
        moveDownButton.disabled = filterActive || activeIndex === activeOrderedItems.length - 1;
        moveDownButton.title = filterActive ? 'Limpia la búsqueda y los filtros para cambiar el orden.' : '';
        moveDownButton.addEventListener('click', () => movePost(item, 1));

        const toggleStatusButton = document.createElement('button');
        toggleStatusButton.type = 'button';
        toggleStatusButton.className = 'button button-secondary';
        toggleStatusButton.textContent = isItemPublished(item) ? 'Ocultar' : 'Publicar';
        toggleStatusButton.addEventListener('click', () => togglePostStatus(item));

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'button button-secondary';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => startEdit(item));

        const duplicateButton = document.createElement('button');
        duplicateButton.type = 'button';
        duplicateButton.className = 'button button-secondary';
        duplicateButton.textContent = 'Duplicar';
        duplicateButton.title = 'Crear una copia editable de esta publicación';
        duplicateButton.addEventListener('click', () => startDuplicate(item));

        const trashButton = document.createElement('button');
        trashButton.type = 'button';
        trashButton.className = 'button button-danger button-with-icon button-trash';
        trashButton.innerHTML = '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg><span>Papelera</span>';
        trashButton.title = 'Mover a papelera';
        trashButton.addEventListener('click', () => movePostToTrash(item));

        actions.append(moveUpButton, moveDownButton, toggleStatusButton, editButton, duplicateButton, trashButton);
      }
      content.append(selectLabel, title, meta, description);

      if (descriptionNeedsToggle) {
        content.append(descriptionToggle);
      }

      content.append(actions);
      card.append(img, content);
      fragment.append(card);
    });

  if (!displayedItems.length) {
    const emptySearch = document.createElement('p');
    emptySearch.className = 'status';
    emptySearch.textContent = filterActive
      ? 'No hay publicaciones que coincidan con la búsqueda o el filtro seleccionado.'
      : 'No hay publicaciones activas. Revisa la papelera si esperabas ver contenido.';
    fragment.append(emptySearch);
  }

  if (displayedItems.length && getMaxPage(displayedItems.length) > 1) {
    fragment.append(createPaginationControls(displayedItems.length, { compact: true }));
  }

  adminPosts.append(fragment);
}

function startEdit(item) {
  if (blockIfPendingOrder()) return;
  if (blockIfUnsavedFormChanges('Tienes cambios sin guardar en el formulario. Si editas otra publicación, se perderán. ¿Continuar?')) return;
  postId.value = item.id;
  postTitle.value = item.title || '';
  setDescriptionEditorContent(item.description || '');
  postAlt.value = item.image?.alt || '';
  if (postStatus) postStatus.value = getItemStatus(item);
  if (postCategory) postCategory.value = getItemCategory(item);
  currentImagePath.value = item.image?.path || '';
  currentImageSrc.value = item.image?.src || '';
  formTitle.textContent = 'Editar publicación';
  saveButton.textContent = 'Guardar cambios';
  cancelEditButton.classList.remove('hidden');
  postImage.required = false;
  clearPreviewObjectUrl();
  updateLivePreview();
  updateFormBaseline();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function startDuplicate(item) {
  if (blockIfPendingOrder()) return;
  if (blockIfUnsavedFormChanges('Tienes cambios sin guardar en el formulario. Si duplicas otra publicación, se perderán. ¿Continuar?')) return;

  postForm.reset();
  postId.value = '';
  postTitle.value = `Copia de ${item.title || 'publicación sin título'}`;
  setDescriptionEditorContent(item.description || '');
  postAlt.value = item.image?.alt || item.title || '';
  if (postStatus) postStatus.value = 'hidden';
  if (postCategory) postCategory.value = getItemCategory(item);
  currentImagePath.value = item.image?.path || '';
  currentImageSrc.value = item.image?.src || '';
  formTitle.textContent = 'Duplicar publicación';
  saveButton.textContent = 'Guardar copia';
  cancelEditButton.classList.remove('hidden');
  postImage.required = false;
  clearPreviewObjectUrl();
  updateLivePreview();
  updateFormBaseline();
  showAlert('Copia preparada en el formulario. Revisa los cambios y pulsa Guardar copia para crear la nueva publicación.');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearPreviewObjectUrl() {
  if (state.previewObjectUrl) {
    URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = '';
  }
}

function resetForm() {
  postForm.reset();
  setDescriptionEditorContent('');
  postId.value = '';
  currentImagePath.value = '';
  currentImageSrc.value = '';
  if (postStatus) postStatus.value = 'published';
  if (postCategory) postCategory.value = DEFAULT_POST_CATEGORY;
  formTitle.textContent = 'Nueva publicación';
  saveButton.textContent = 'Guardar publicación';
  cancelEditButton.classList.add('hidden');
  postImage.required = false;
  clearPreviewObjectUrl();
  updateLivePreview();
  updateFormBaseline();
}

function getEditingItem() {
  if (!postId.value) return null;
  return state.items.find((item) => item.id === postId.value) || null;
}

function getPreviewCreatedAt() {
  return getEditingItem()?.createdAt || new Date().toISOString();
}

function getPreviewImageSrc() {
  return state.previewObjectUrl || currentImageSrc.value || currentImagePath.value || '';
}

function createPreviewImage(src, alt) {
  const imageWrap = document.createElement('div');
  imageWrap.className = 'post-preview-image-wrap';

  if (!src) {
    const placeholder = document.createElement('span');
    placeholder.className = 'post-preview-placeholder';
    placeholder.textContent = 'Selecciona una imagen para ver la vista previa.';
    imageWrap.append(placeholder);
    return imageWrap;
  }

  const img = document.createElement('img');
  img.className = 'post-preview-image';
  img.alt = alt;
  setImageSrc(img, src);
  imageWrap.append(img);
  return imageWrap;
}

function updateLivePreview() {
  const title = postTitle.value.trim();
  const description = getDescriptionSnapshotValue();
  const status = getFormStatus();
  const category = getFormCategory();
  const imageSrc = getPreviewImageSrc();
  const alt = postAlt.value.trim() || title || 'Vista previa de la publicación';

  imagePreview.replaceChildren();

  const heading = document.createElement('p');
  heading.className = 'post-live-preview-title';
  heading.textContent = 'Vista previa antes de guardar';

  const card = document.createElement('article');
  card.className = 'post-preview-card';

  const body = document.createElement('div');
  body.className = 'post-preview-body';

  const meta = document.createElement('div');
  meta.className = 'post-preview-meta';

  const date = document.createElement('span');
  date.className = 'post-date';
  date.textContent = formatDate(getPreviewCreatedAt()) || 'Fecha al guardar';

  const statusBadge = document.createElement('span');
  statusBadge.className = `admin-post-status ${status === 'hidden' ? 'hidden-status' : ''}`.trim();
  statusBadge.textContent = status === 'hidden' ? 'Oculto' : 'Publicado';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'admin-post-status';
  categoryBadge.textContent = getCategoryLabel(category);

  const titleNode = document.createElement('h3');
  titleNode.textContent = title || 'Título de la publicación';

  const descriptionNode = document.createElement('div');
  descriptionNode.className = 'post-preview-description rich-text-content';
  renderRichText(descriptionNode, description, 'La descripción aparecerá aquí.');

  meta.append(date, statusBadge, categoryBadge);
  body.append(meta, titleNode, descriptionNode);
  card.append(createPreviewImage(imageSrc, alt), body);
  imagePreview.append(heading, card);
  imagePreview.classList.remove('hidden');
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function getConfigNumber(key, fallback) {
  const value = Number(config?.[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function validateImage(file, isEdit) {
  if (!file && !isEdit) {
    throw new Error('Selecciona una fotografía.');
  }
  if (!file) return;
  if (!config.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
  }

  const maxSourceMb = getConfigNumber('MAX_SOURCE_IMAGE_MB', DEFAULT_MAX_SOURCE_IMAGE_MB);
  const sizeMb = file.size / 1024 / 1024;
  if (sizeMb > maxSourceMb) {
    throw new Error(`La imagen original pesa demasiado. Máximo permitido: ${maxSourceMb} MB.`);
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo procesar la imagen seleccionada.'));
    };

    image.src = objectUrl;
  });
}

function calculateOptimizedImageSize(width, height, maxSide) {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;

  if (safeWidth <= 0 || safeHeight <= 0) {
    throw new Error('La imagen seleccionada no tiene dimensiones válidas.');
  }

  const largestSide = Math.max(safeWidth, safeHeight);

  if (largestSide <= maxSide) {
    return { width: safeWidth, height: safeHeight };
  }

  const ratio = maxSide / largestSide;
  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio))
  };
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('El navegador no pudo convertir la imagen a WebP.'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

async function optimizeImageForUpload(file, date) {
  const maxSide = Math.round(getConfigNumber('IMAGE_MAX_SIDE_PX', DEFAULT_IMAGE_MAX_SIDE_PX));
  const quality = Math.min(1, Math.max(0.1, getConfigNumber('IMAGE_WEBP_QUALITY', DEFAULT_IMAGE_WEBP_QUALITY)));
  const image = await loadImageFromFile(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  const nextSize = calculateOptimizedImageSize(originalWidth, originalHeight, maxSide);
  const canvas = document.createElement('canvas');

  canvas.width = nextSize.width;
  canvas.height = nextSize.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('El navegador no pudo preparar la imagen para optimizarla.');
  }

  context.drawImage(image, 0, 0, nextSize.width, nextSize.height);

  const optimizedBlob = await canvasToBlob(canvas, IMAGE_OUTPUT_MIME_TYPE, quality);
  if (!optimizedBlob.type || optimizedBlob.type !== IMAGE_OUTPUT_MIME_TYPE) {
    throw new Error('El navegador no pudo generar una imagen WebP válida.');
  }

  const maxOptimizedMb = getConfigNumber('MAX_IMAGE_MB', 4);
  const optimizedSizeMb = optimizedBlob.size / 1024 / 1024;
  if (optimizedSizeMb > maxOptimizedMb) {
    throw new Error(`La imagen optimizada sigue pesando demasiado (${optimizedSizeMb.toFixed(2)} MB). Máximo: ${maxOptimizedMb} MB.`);
  }

  const imagePath = buildFinalImagePath(file, date, IMAGE_OUTPUT_EXTENSION);
  const imageBase64 = await fileToBase64(optimizedBlob);

  return {
    fileName: imagePath.split('/').pop(),
    originalFileName: file.name,
    originalMimeType: file.type,
    originalSize: file.size,
    originalWidth,
    originalHeight,
    mimeType: IMAGE_OUTPUT_MIME_TYPE,
    base64: imageBase64,
    path: imagePath,
    width: nextSize.width,
    height: nextSize.height,
    optimizedSize: optimizedBlob.size,
    optimized: true
  };
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function buildTimestamp(date, separator = '') {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const hours = padNumber(date.getHours());
  const minutes = padNumber(date.getMinutes());
  const seconds = padNumber(date.getSeconds());
  return `${year}${month}${day}${separator}${hours}${minutes}${seconds}`;
}

function slugifyFileName(name) {
  const cleanName = String(name || 'imagen')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleanName || 'imagen';
}

function getImageExtension(file) {
  const name = file?.name || '';
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex > -1 && dotIndex < name.length - 1) {
    return name.slice(dotIndex + 1).toLowerCase();
  }

  const mimeExtensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };

  return mimeExtensions[file?.type] || 'jpg';
}

function getImageBaseName(file) {
  const name = file?.name || 'imagen';
  const dotIndex = name.lastIndexOf('.');
  const baseName = dotIndex > -1 ? name.slice(0, dotIndex) : name;
  return slugifyFileName(baseName);
}

function buildFinalImageName(file, date, forcedExtension) {
  const datePart = buildTimestamp(date, '-');
  const baseName = getImageBaseName(file);
  const extension = forcedExtension || getImageExtension(file);
  return `${datePart}-${baseName}.${extension}`;
}

function buildFinalImagePath(file, date, forcedExtension) {
  return `assets/uploads/${buildFinalImageName(file, date, forcedExtension)}`;
}

function encodeJsonToBase64(data) {
  const jsonString = JSON.stringify(data, null, 2);
  const bytes = new TextEncoder().encode(jsonString);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return {
    jsonString,
    base64: btoa(binary)
  };
}

function attachPublicacionesPayload(payload, publicacionesJson) {
  const encoded = encodeJsonToBase64(publicacionesJson);
  payload.publicacionesJson = publicacionesJson;
  payload.publicacionesBase64 = encoded.base64;
  return payload;
}

async function sendToMake(action, payload) {
  if (!config.MAKE_WEBHOOK_URL || config.MAKE_WEBHOOK_URL.includes('PEGAR_AQUI')) {
    throw new Error('Falta configurar la URL del webhook de Make en admin/cms.config.js.');
  }

  const response = await fetch(config.MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      password: state.password,
      payload
    })
  });

  const text = await response.text();
  let data;

  try {
    if (!text.trim()) throw new Error('Respuesta vacía de Make.');
    data = JSON.parse(text);
  } catch {
    throw new Error(
      response.ok
        ? 'Make no confirmó la operación con un JSON válido { "ok": true }.'
        : `Make respondió con error ${response.status}.`
    );
  }

  if (!response.ok || data.ok !== true) {
    throw new Error(data.error || data.message || 'Make no confirmó la operación con { "ok": true }.');
  }

  return data;
}

async function savePost(event) {
  event.preventDefault();
  state.lastFeedbackScope = 'form';
  if (blockIfPendingOrder()) return;
  setBusy(true);

  try {
    const isEdit = Boolean(postId.value);
    const file = postImage.files[0];
    const { title, description, alt } = validateRequiredPostFields(isEdit, file);
    const status = getFormStatus();
    const category = getFormCategory();
    const now = new Date();
    const nowIso = now.toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    let nextPublicacionesJson;
    const payload = {
      id: postId.value || undefined,
      title,
      description,
      alt,
      currentImagePath: currentImagePath.value || undefined,
      currentImageSrc: currentImageSrc.value || undefined,
      category
    };

    if (!isEdit) {
      let nextImage;

      if (file) {
        const optimizedImage = await optimizeImageForUpload(file, now);
        const imagePath = optimizedImage.path;
        payload.image = optimizedImage;
        nextImage = {
          src: imagePath,
          path: imagePath,
          alt: alt || title
        };
      } else {
        nextImage = getReusableCurrentImage(title, alt);
        payload.reusedImage = nextImage;
      }

      const newItem = {
        id: `pub_${buildTimestamp(now)}`,
        title,
        description,
        image: nextImage,
        status,
        published: status === 'published',
        category,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      payload.id = newItem.id;

      nextPublicacionesJson = {
        version: 1,
        updatedAt: nowIso,
        items: [newItem, ...currentItems].map((item, index) => ({
          ...item,
          order: index
        }))
      };
    } else {
      let nextImage = null;

      if (file) {
        const optimizedImage = await optimizeImageForUpload(file, now);
        const imagePath = optimizedImage.path;
        payload.image = optimizedImage;
        nextImage = {
          src: imagePath,
          path: imagePath,
          alt: alt || title
        };
      }

      nextPublicacionesJson = {
        version: 1,
        updatedAt: nowIso,
        items: normalizeItemsWithOrder(currentItems.map((item) => {
          if (item.id !== postId.value) return item;
          return {
            ...item,
            title,
            description,
            image: nextImage || {
              ...item.image,
              alt: alt || item.image?.alt || title
            },
            status,
            published: status === 'published',
            category,
            updatedAt: nowIso
          };
        }))
      };
    }

    attachPublicacionesPayload(payload, nextPublicacionesJson);

    await sendToMake(isEdit ? 'update' : 'create', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    const successMessage = isEdit ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.';
    resetForm();
    showAlert(successMessage, 'success', { scope: 'form', scroll: true });

    if (payload.image?.path) {
      waitForImageReady(payload.image.path).catch((error) => {
        console.warn('La imagen todavía no está disponible en GitHub:', error);
      });
    }
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  } finally {
    setBusy(false);
  }
}

function movePost(item, direction) {
  const currentItems = normalizeItemsWithOrder(
    Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
  );
  const activeItems = currentItems.filter((currentItem) => !isItemDeleted(currentItem));
  const deletedItems = currentItems.filter((currentItem) => isItemDeleted(currentItem));
  const currentIndex = activeItems.findIndex((currentItem) => currentItem.id === item.id);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= activeItems.length) return;

  if (!state.orderDirty) {
    state.orderOriginalItems = currentItems.map((currentItem) => ({ ...currentItem }));
  }

  const reorderedItems = activeItems.slice();
  const [movedItem] = reorderedItems.splice(currentIndex, 1);
  reorderedItems.splice(nextIndex, 0, movedItem);

  state.items = [...reorderedItems, ...deletedItems].map((currentItem, index) => ({
    ...currentItem,
    order: index
  }));
  state.orderDirty = true;
  renderAdminPosts();
}

async function saveManualOrder() {
  if (!state.orderDirty) return;

  try {
    setBusy(true);
    const nowIso = new Date().toISOString();
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(
        Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
      )
    };
    const payload = attachPublicacionesPayload({
      action: 'reorder'
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    clearPendingOrder();
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert('Orden guardado correctamente.');
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  } finally {
    setBusy(false);
  }
}

function cancelManualOrder() {
  if (!state.orderDirty) return;

  if (Array.isArray(state.orderOriginalItems)) {
    state.items = normalizeItemsWithOrder(state.orderOriginalItems);
  }

  clearPendingOrder();
  renderAdminPosts();
  showAlert('Cambios de orden cancelados.');
}


async function toggleSelectedPostsStatus() {
  if (blockIfPendingOrder()) return;
  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de cambiar el estado de publicaciones, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  const selectedItems = getSelectedActiveItems();
  if (!selectedItems.length) {
    showAlert('No hay publicaciones activas seleccionadas para cambiar el estado.', 'error');
    return;
  }

  const selectedPublishedItems = selectedItems.filter((selectedItem) => getItemStatus(selectedItem) === 'published');
  const selectedHiddenItems = selectedItems.filter((selectedItem) => getItemStatus(selectedItem) === 'hidden');
  const actionLabel = getBulkToggleStatusLabel(selectedPublishedItems.length, selectedHiddenItems.length);
  const confirmed = window.confirm(`¿${actionLabel}?`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(selectedItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (!selectedIdSet.has(currentItem.id)) return currentItem;
        const nextStatus = getItemStatus(currentItem) === 'published' ? 'hidden' : 'published';
        return {
          ...currentItem,
          status: nextStatus,
          published: nextStatus === 'published',
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_toggle_status',
      ids: [...selectedIdSet],
      publishIds: selectedHiddenItems.map((selectedItem) => selectedItem.id),
      hideIds: selectedPublishedItems.map((selectedItem) => selectedItem.id)
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${actionLabel} correctamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function setSelectedPostsStatus(nextStatus) {
  if (blockIfPendingOrder()) return;
  const status = nextStatus === 'hidden' ? 'hidden' : 'published';
  const actionInfinitive = status === 'hidden' ? 'ocultar' : 'publicar';
  const actionPast = status === 'hidden' ? 'ocultada' : 'publicada';

  if (!confirmAndDiscardFormChangesBeforeBulkAction(`Tienes cambios sin guardar en el formulario. Antes de ${actionInfinitive} publicaciones, guarda o descarta esos cambios. ¿Descartarlos ahora?`)) return;

  const selectedItems = getSelectedActiveItems();
  const targetItems = selectedItems.filter((selectedItem) => getItemStatus(selectedItem) !== status);

  if (!selectedItems.length) {
    showAlert('No hay publicaciones activas seleccionadas para cambiar el estado.', 'error');
    return;
  }

  if (!targetItems.length) {
    showAlert(`Las publicaciones seleccionadas ya están ${status === 'hidden' ? 'ocultas' : 'publicadas'}.`);
    return;
  }

  const confirmed = window.confirm(`¿${status === 'hidden' ? 'Ocultar' : 'Publicar'} ${targetItems.length} publicación${targetItems.length === 1 ? '' : 'es'} seleccionada${targetItems.length === 1 ? '' : 's'}?`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(targetItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (!selectedIdSet.has(currentItem.id)) return currentItem;
        return {
          ...currentItem,
          status,
          published: status === 'published',
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_status',
      status,
      ids: [...selectedIdSet]
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${targetItems.length} publicación${targetItems.length === 1 ? '' : 'es'} ${actionPast}${targetItems.length === 1 ? '' : 's'} correctamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function setSelectedPostsCategory(nextCategory) {
  if (blockIfPendingOrder()) return;

  if (!isValidPostCategory(nextCategory)) {
    showAlert('La categoría seleccionada no es válida.', 'error');
    return;
  }

  const categoryLabel = getCategoryLabel(nextCategory);

  if (!confirmAndDiscardFormChangesBeforeBulkAction(`Tienes cambios sin guardar en el formulario. Antes de cambiar la categoría de publicaciones, guarda o descarta esos cambios. ¿Descartarlos ahora?`)) return;

  const selectedItems = getSelectedActiveItems();
  const targetItems = selectedItems.filter((selectedItem) => getItemCategory(selectedItem) !== nextCategory);

  if (!selectedItems.length) {
    showAlert('No hay publicaciones activas seleccionadas para cambiar de categoría.', 'error');
    return;
  }

  if (!targetItems.length) {
    showAlert(`Las publicaciones seleccionadas ya están en ${categoryLabel}.`);
    return;
  }

  const confirmed = window.confirm(`¿Pasar ${targetItems.length} publicación${targetItems.length === 1 ? '' : 'es'} seleccionada${targetItems.length === 1 ? '' : 's'} a ${categoryLabel}?`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(targetItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (!selectedIdSet.has(currentItem.id)) return currentItem;
        return {
          ...currentItem,
          category: nextCategory,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_category',
      category: nextCategory,
      ids: [...selectedIdSet]
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${targetItems.length} publicación${targetItems.length === 1 ? '' : 'es'} movida${targetItems.length === 1 ? '' : 's'} a ${categoryLabel}.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function moveSelectedPostsToTrash() {
  if (blockIfPendingOrder()) return;
  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de mover publicaciones a la papelera, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  const selectedItems = getSelectedActiveItems();
  if (!selectedItems.length) {
    showAlert('No hay publicaciones activas seleccionadas para mover a papelera.', 'error');
    return;
  }

  const confirmed = window.confirm(`¿Mover ${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} seleccionada${selectedItems.length === 1 ? '' : 's'} a la papelera? Podrás restaurar después.`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(selectedItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (!selectedIdSet.has(currentItem.id)) return currentItem;
        return {
          ...currentItem,
          deleted: true,
          deletedAt: nowIso,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_trash',
      ids: [...selectedIdSet]
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    const editingPostWasSelected = Boolean(postId.value && selectedIdSet.has(postId.value));
    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    if (editingPostWasSelected) resetForm();
    renderAdminPosts();
    showAlert(`${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} movida${selectedItems.length === 1 ? '' : 's'} a la papelera.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function restoreSelectedPosts() {
  if (blockIfPendingOrder()) return;
  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de restaurar publicaciones, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  const selectedItems = getSelectedDeletedItems();
  if (!selectedItems.length) {
    showAlert('No hay publicaciones de la papelera seleccionadas para restaurar.', 'error');
    return;
  }

  const confirmed = window.confirm(`¿Restaurar ${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} seleccionada${selectedItems.length === 1 ? '' : 's'}?`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(selectedItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (!selectedIdSet.has(currentItem.id)) return currentItem;
        const { deleted, deletedAt, ...restoredItem } = currentItem;
        return {
          ...restoredItem,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_restore',
      ids: [...selectedIdSet]
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} restaurada${selectedItems.length === 1 ? '' : 's'} correctamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function deleteSelectedPostsForever() {
  if (blockIfPendingOrder()) return;
  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de eliminar publicaciones definitivamente, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  const selectedItems = getSelectedDeletedItems();
  if (!selectedItems.length) {
    showAlert('No hay publicaciones de la papelera seleccionadas para eliminar definitivamente.', 'error');
    return;
  }

  const confirmed = window.confirm(`¿Eliminar definitivamente ${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} seleccionada${selectedItems.length === 1 ? '' : 's'}? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const selectedIdSet = new Set(selectedItems.map((selectedItem) => selectedItem.id));
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.filter((currentItem) => !selectedIdSet.has(currentItem.id)))
    };
    const payload = attachPublicacionesPayload({
      action: 'bulk_delete_forever',
      ids: [...selectedIdSet],
      imagePaths: selectedItems.map((selectedItem) => selectedItem.image?.path).filter(Boolean)
    }, nextPublicacionesJson);

    await sendToMake('delete', payload);

    state.selectedIds.clear();
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`${selectedItems.length} publicación${selectedItems.length === 1 ? '' : 'es'} eliminada${selectedItems.length === 1 ? '' : 's'} definitivamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function togglePostStatus(item) {
  if (blockIfPendingOrder()) return;
  const nextStatus = isItemPublished(item) ? 'hidden' : 'published';
  const actionLabel = nextStatus === 'hidden' ? 'ocultada' : 'publicada';

  try {
    const nowIso = new Date().toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) return currentItem;
        return {
          ...currentItem,
          status: nextStatus,
          published: nextStatus === 'published',
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      id: item.id,
      status: nextStatus
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert(`Publicación ${actionLabel} correctamente.`);
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function movePostToTrash(item) {
  if (blockIfPendingOrder()) return;
  const confirmed = window.confirm(`¿Mover "${item.title || 'esta publicación'}" a la papelera? Podrás restaurarla después.`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) return currentItem;
        return {
          ...currentItem,
          deleted: true,
          deletedAt: nowIso,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'trash',
      id: item.id
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert('Publicación movida a la papelera.');
    if (postId.value === item.id) resetForm();
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function restorePost(item) {
  if (blockIfPendingOrder()) return;

  try {
    const nowIso = new Date().toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) return currentItem;
        const { deleted, deletedAt, ...restoredItem } = currentItem;
        return {
          ...restoredItem,
          updatedAt: nowIso
        };
      }))
    };
    const payload = attachPublicacionesPayload({
      action: 'restore',
      id: item.id
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert('Publicación restaurada correctamente.');
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}

async function deletePostForever(item) {
  if (blockIfPendingOrder()) return;
  const confirmed = window.confirm(`¿Eliminar definitivamente "${item.title || 'esta publicación'}"? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder(currentItems.filter((currentItem) => currentItem.id !== item.id))
    };
    const payload = attachPublicacionesPayload({
      action: 'delete_forever',
      id: item.id,
      imagePath: item.image?.path
    }, nextPublicacionesJson);

    await sendToMake('delete', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert('Publicación eliminada definitivamente.');
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  }
}


function encodePathForRawUrl(path) {
  return cleanRelativePath(path)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function getBackupImagePath(item) {
  const image = item?.image || {};
  const candidates = [image.path, image.src].filter(Boolean);

  for (const candidate of candidates) {
    const value = String(candidate || '');
    const uploadIndex = value.indexOf('assets/uploads/');
    const relativePath = uploadIndex >= 0 ? value.slice(uploadIndex) : cleanRelativePath(value);

    if (isUploadedAssetPath(relativePath)) {
      return cleanRelativePath(relativePath);
    }
  }

  return '';
}

function getBackupImagePaths(items) {
  const paths = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const imagePath = getBackupImagePath(item);
    if (imagePath) paths.add(imagePath);
  });

  return [...paths].sort((a, b) => a.localeCompare(b, 'es'));
}

function getBackupPublicacionesJson() {
  return {
    version: 1,
    updatedAt: state.publicacionesUpdatedAt || new Date().toISOString(),
    items: normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    )
  };
}

function getBackupFileName() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');

  return `cms-copia-completa-${stamp}.zip`;
}

async function fetchBackupImage(path) {
  const rawUrl = `${RAW_GITHUB_DOWNLOAD_BASE_URL}${encodePathForRawUrl(path)}`;
  const response = await fetch(addCacheBuster(rawUrl), { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen ${path} (${response.status}).`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function createTextEntry(name, text) {
  return {
    name,
    data: new TextEncoder().encode(text),
    lastModified: new Date()
  };
}

function createBinaryEntry(name, data) {
  return {
    name: cleanRelativePath(name),
    data,
    lastModified: new Date()
  };
}

let zipCrcTable = null;

function getZipCrcTable() {
  if (zipCrcTable) return zipCrcTable;

  zipCrcTable = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    zipCrcTable[index] = value >>> 0;
  }

  return zipCrcTable;
}

function getZipCrc32(bytes) {
  const table = getZipCrcTable();
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getZipDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function writeZipUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

function writeZipUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

function createZipBlob(entries) {
  const textEncoder = new TextEncoder();
  const fileParts = [];
  const centralParts = [];
  let offset = 0;

  entries.forEach((entry) => {
    const name = cleanRelativePath(entry.name);
    const nameBytes = textEncoder.encode(name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data || []);
    const crc = getZipCrc32(data);
    const size = data.byteLength;
    const { dosTime, dosDate } = getZipDosDateTime(entry.lastModified || new Date());
    const generalPurposeFlag = 0x0800;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeZipUint32(localView, 0, 0x04034b50);
    writeZipUint16(localView, 4, 20);
    writeZipUint16(localView, 6, generalPurposeFlag);
    writeZipUint16(localView, 8, 0);
    writeZipUint16(localView, 10, dosTime);
    writeZipUint16(localView, 12, dosDate);
    writeZipUint32(localView, 14, crc);
    writeZipUint32(localView, 18, size);
    writeZipUint32(localView, 22, size);
    writeZipUint16(localView, 26, nameBytes.length);
    writeZipUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeZipUint32(centralView, 0, 0x02014b50);
    writeZipUint16(centralView, 4, 20);
    writeZipUint16(centralView, 6, 20);
    writeZipUint16(centralView, 8, generalPurposeFlag);
    writeZipUint16(centralView, 10, 0);
    writeZipUint16(centralView, 12, dosTime);
    writeZipUint16(centralView, 14, dosDate);
    writeZipUint32(centralView, 16, crc);
    writeZipUint32(centralView, 20, size);
    writeZipUint32(centralView, 24, size);
    writeZipUint16(centralView, 28, nameBytes.length);
    writeZipUint16(centralView, 30, 0);
    writeZipUint16(centralView, 32, 0);
    writeZipUint16(centralView, 34, 0);
    writeZipUint16(centralView, 36, 0);
    writeZipUint32(centralView, 38, 0);
    writeZipUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);

    fileParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + size;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.byteLength, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  writeZipUint32(endView, 0, 0x06054b50);
  writeZipUint16(endView, 4, 0);
  writeZipUint16(endView, 6, 0);
  writeZipUint16(endView, 8, entries.length);
  writeZipUint16(endView, 10, entries.length);
  writeZipUint32(endView, 12, centralSize);
  writeZipUint32(endView, 16, centralOffset);
  writeZipUint16(endView, 20, 0);

  return new Blob([...fileParts, ...centralParts, endHeader], { type: 'application/zip' });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function buildBackupReadme(publicacionesJson, imagePaths, missingImages) {
  const lines = [
    'Copia completa del Mini CMS',
    '=============================',
    '',
    `Fecha de exportación: ${new Date().toLocaleString('es-ES')}`,
    `Publicaciones incluidas: ${publicacionesJson.items.length}`,
    `Imágenes detectadas: ${imagePaths.length}`,
    `Imágenes no incluidas por error: ${missingImages.length}`,
    '',
    'Contenido del ZIP:',
    '- data/publicaciones.json: datos del CMS.',
    '- assets/uploads/: imágenes usadas por las publicaciones.',
    '',
    'Esta descarga solo guarda una copia; no cambia tus publicaciones.',
    'Para recuperar publicaciones desde una copia, usa la herramienta de recuperación del panel.'
  ];

  if (missingImages.length) {
    lines.push('', 'Avisos:', ...missingImages.map((path) => `- No se pudo incluir: ${path}`));
  }

  return `${lines.join('\n')}\n`;
}

async function exportCompleteBackup() {
  state.lastFeedbackScope = 'tools';

  if (!Array.isArray(state.items)) {
    showAlert('No hay datos cargados para generar la copia.', 'error', { scope: 'tools', scroll: true });
    return;
  }

  const publicacionesJson = getBackupPublicacionesJson();
  const imagePaths = getBackupImagePaths(publicacionesJson.items);
  const missingImages = [];
  const entries = [
    createTextEntry('data/publicaciones.json', `${JSON.stringify(publicacionesJson, null, 2)}\n`)
  ];

  try {
    if (exportBackupButton) {
      exportBackupButton.disabled = true;
      exportBackupButton.textContent = 'Preparando copia…';
    }

    showAlert(
      imagePaths.length
        ? `Preparando copia completa. Descargando 0 de ${imagePaths.length} imágenes…`
        : 'Preparando copia completa de datos. No hay imágenes asociadas.',
      'success',
      { scope: 'tools', scroll: true }
    );

    for (let index = 0; index < imagePaths.length; index += 1) {
      const imagePath = imagePaths[index];

      try {
        const imageData = await fetchBackupImage(imagePath);
        entries.push(createBinaryEntry(imagePath, imageData));
      } catch (error) {
        missingImages.push(imagePath);
        console.warn('No se pudo incluir una imagen en la copia completa:', error);
      }

      showAlert(
        `Preparando copia completa. Descargando ${index + 1} de ${imagePaths.length} imágenes…`,
        'success',
        { scope: 'tools' }
      );
    }

    entries.push(createTextEntry('LEEME-copia-completa.txt', buildBackupReadme(publicacionesJson, imagePaths, missingImages)));

    if (missingImages.length) {
      entries.push(createTextEntry('imagenes-no-incluidas.txt', `${missingImages.join('\n')}\n`));
    }

    const backupBlob = createZipBlob(entries);
    downloadBlob(backupBlob, getBackupFileName());

    showAlert(
      missingImages.length
        ? `Copia generada con avisos: ${missingImages.length} imagen${missingImages.length === 1 ? '' : 'es'} no se han podido incluir.`
        : `Copia completa descargada correctamente. Incluye ${publicacionesJson.items.length} publicación${publicacionesJson.items.length === 1 ? '' : 'es'} y ${imagePaths.length} imagen${imagePaths.length === 1 ? '' : 'es'}.`,
      'success',
      { scope: 'tools', scroll: true }
    );
  } catch (error) {
    showAlert(error.message || 'No se ha podido generar la copia completa.', 'error', { scope: 'tools', scroll: true });
    console.error(error);
  } finally {
    if (exportBackupButton) {
      exportBackupButton.disabled = false;
      exportBackupButton.textContent = 'Descargar copia completa';
    }
  }
}


function findZipEndOfCentralDirectory(bytes) {
  const minOffset = Math.max(0, bytes.length - 0x10000 - 22);

  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }

  return -1;
}

function decodeZipText(bytes) {
  return new TextDecoder('utf-8').decode(bytes);
}

function parseZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const endOffset = findZipEndOfCentralDirectory(bytes);

  if (endOffset < 0) {
    throw new Error('El archivo seleccionado no parece un ZIP válido.');
  }

  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);
  const entries = new Map();
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('No se ha podido leer el índice interno del ZIP.');
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const fileNameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const fileNameBytes = bytes.slice(cursor + 46, cursor + 46 + fileNameLength);
    const fileName = cleanRelativePath(decodeZipText(fileNameBytes));

    if (!fileName.endsWith('/')) {
      if (compressionMethod !== 0) {
        throw new Error('Este verificador solo puede leer copias generadas por este panel. El ZIP está comprimido con otro método.');
      }

      if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        throw new Error(`No se ha podido leer el archivo ${fileName} dentro del ZIP.`);
      }

      const localNameLength = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
      const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.slice(dataOffset, dataOffset + compressedSize);

      entries.set(fileName, {
        name: fileName,
        data,
        size: uncompressedSize
      });
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipTextEntry(entries, fileName) {
  const entry = entries.get(cleanRelativePath(fileName));
  if (!entry) return '';
  return new TextDecoder('utf-8').decode(entry.data);
}

function showBackupVerifyResult(lines, type = 'success') {
  if (!backupVerifyResult) return;
  backupVerifyResult.textContent = lines.join('\n');
  backupVerifyResult.className = `backup-verify-result ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`.trim();
  backupVerifyResult.classList.remove('hidden');
}

function getCurrentBackupExpectedImagePaths(publicacionesJson) {
  return getBackupImagePaths(Array.isArray(publicacionesJson?.items) ? publicacionesJson.items : []);
}

async function verifyCompleteBackup() {
  state.lastFeedbackScope = 'tools';

  const file = verifyBackupFile?.files?.[0];

  if (!file) {
    showAlert('Selecciona primero un archivo ZIP de copia completa.', 'error', { scope: 'tools', scroll: true });
    return;
  }

  try {
    if (verifyBackupButton) {
      verifyBackupButton.disabled = true;
      verifyBackupButton.textContent = 'Verificando…';
    }

    if (backupVerifyResult) {
      backupVerifyResult.classList.add('hidden');
      backupVerifyResult.textContent = '';
    }

    showAlert('Verificando copia completa…', 'success', { scope: 'tools', scroll: true });

    const entries = parseZipEntries(await file.arrayBuffer());
    const publicacionesText = readZipTextEntry(entries, 'data/publicaciones.json');

    if (!publicacionesText) {
      throw new Error('La copia no contiene data/publicaciones.json.');
    }

    let publicacionesJson;

    try {
      publicacionesJson = JSON.parse(publicacionesText);
    } catch (error) {
      throw new Error('El archivo data/publicaciones.json de la copia no se puede leer correctamente.');
    }

    if (!publicacionesJson || !Array.isArray(publicacionesJson.items)) {
      throw new Error('La copia contiene datos, pero no tienen el formato esperado del CMS.');
    }

    const imagePaths = getCurrentBackupExpectedImagePaths(publicacionesJson);
    const missingImages = imagePaths.filter((path) => !entries.has(cleanRelativePath(path)));
    const includedImages = imagePaths.length - missingImages.length;
    const extraUploadFiles = [...entries.keys()].filter((name) => name.startsWith('assets/uploads/') && !imagePaths.includes(name));
    const readmeIncluded = entries.has('LEEME-copia-completa.txt');
    const lines = [
      missingImages.length ? 'Copia revisada con avisos.' : 'Copia revisada correctamente.',
      '',
      `Archivo: ${file.name}`,
      `Publicaciones encontradas: ${publicacionesJson.items.length}`,
      `Imágenes esperadas: ${imagePaths.length}`,
      `Imágenes incluidas: ${includedImages}`,
      `Imágenes faltantes: ${missingImages.length}`,
      `Archivo de instrucciones incluido: ${readmeIncluded ? 'sí' : 'no'}`
    ];

    if (publicacionesJson.updatedAt) {
      lines.splice(3, 0, `Fecha interna de datos: ${publicacionesJson.updatedAt}`);
    }

    if (extraUploadFiles.length) {
      lines.push('', `Aviso: el ZIP incluye ${extraUploadFiles.length} imagen${extraUploadFiles.length === 1 ? '' : 'es'} adicional${extraUploadFiles.length === 1 ? '' : 'es'} no referenciada${extraUploadFiles.length === 1 ? '' : 's'} por publicaciones.json.`);
    }

    if (missingImages.length) {
      lines.push('', 'Imágenes que faltan:', ...missingImages.slice(0, 12).map((path) => `- ${path}`));

      if (missingImages.length > 12) {
        lines.push(`- … y ${missingImages.length - 12} más.`);
      }
    }

    showBackupVerifyResult(lines, missingImages.length ? 'warning' : 'success');
    showAlert(
      missingImages.length
        ? `Copia verificada con avisos: faltan ${missingImages.length} imagen${missingImages.length === 1 ? '' : 'es'}.`
        : 'Copia verificada correctamente. No se han detectado imágenes faltantes.',
      missingImages.length ? 'error' : 'success',
      { scope: 'tools', scroll: true }
    );
  } catch (error) {
    showBackupVerifyResult([
      'No se ha podido verificar la copia.',
      '',
      error.message || 'El archivo seleccionado no parece una copia completa válida.'
    ], 'error');
    showAlert(error.message || 'No se ha podido verificar la copia.', 'error', { scope: 'tools', scroll: true });
    console.error(error);
  } finally {
    if (verifyBackupButton) {
      verifyBackupButton.disabled = false;
      verifyBackupButton.textContent = 'Verificar copia';
    }
  }
}


function showBackupRecoverResult(elementOrLines, type = 'success') {
  if (!backupRecoverResult) return;
  backupRecoverResult.replaceChildren();
  backupRecoverResult.className = `backup-recover-result ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`.trim();

  if (Array.isArray(elementOrLines)) {
    backupRecoverResult.textContent = elementOrLines.join('\n');
  } else if (elementOrLines instanceof Node) {
    backupRecoverResult.append(elementOrLines);
  } else {
    backupRecoverResult.textContent = String(elementOrLines || '');
  }

  backupRecoverResult.classList.remove('hidden');
}

function getBackupActiveItems(publicacionesJson) {
  return normalizePublicacionesJson(publicacionesJson).items.filter((item) => item?.id && !isItemDeleted(item));
}

function getCurrentItemIds() {
  return new Set((Array.isArray(state.items) ? state.items : []).map((item) => item.id).filter(Boolean));
}

function hasImageEntryInBackup(entries, item) {
  const imagePath = getBackupImagePath(item);
  if (!imagePath) return true;
  return entries.has(cleanRelativePath(imagePath));
}

function getRecoverableItemsFromBackup(publicacionesJson, entries) {
  const currentIds = getCurrentItemIds();
  return getBackupActiveItems(publicacionesJson)
    .filter((item) => !currentIds.has(item.id))
    .map((item) => ({
      item,
      imagePath: getBackupImagePath(item),
      imageIncluded: hasImageEntryInBackup(entries, item)
    }));
}

function clearBackupRecoveryResult() {
  state.backupRecovery = null;

  if (backupRecoverResult) {
    backupRecoverResult.classList.add('hidden');
    backupRecoverResult.replaceChildren();
  }
}

function setBackupRecoverySelected(id, isSelected) {
  if (!state.backupRecovery || !id) return;

  if (isSelected) {
    state.backupRecovery.selectedIds.add(id);
  } else {
    state.backupRecovery.selectedIds.delete(id);
  }

  renderBackupRecoveryPanel();
}

function setAllBackupRecoverySelected(isSelected) {
  if (!state.backupRecovery) return;

  state.backupRecovery.selectedIds = isSelected
    ? new Set(state.backupRecovery.recoverableItems.map(({ item }) => item.id))
    : new Set();

  renderBackupRecoveryPanel();
}

function renderBackupRecoveryPanel() {
  if (!state.backupRecovery) return;

  const { fileName, publicacionesUpdatedAt, recoverableItems, selectedIds } = state.backupRecovery;
  const selectedCount = selectedIds.size;
  const missingImageCount = recoverableItems.filter(({ imageIncluded }) => !imageIncluded).length;
  const panel = document.createElement('div');
  panel.className = 'backup-recover-panel';

  const title = document.createElement('h4');
  title.textContent = recoverableItems.length
    ? `${recoverableItems.length} publicación${recoverableItems.length === 1 ? '' : 'es'} recuperable${recoverableItems.length === 1 ? '' : 's'}`
    : 'No hay publicaciones eliminadas para recuperar';

  const summary = document.createElement('p');
  summary.className = 'backup-recover-summary';
  summary.textContent = recoverableItems.length
    ? `Copia analizada: ${fileName}${publicacionesUpdatedAt ? ` · Fecha interna: ${publicacionesUpdatedAt}` : ''}`
    : 'Todas las publicaciones activas de esta copia ya existen actualmente en el panel.';

  panel.append(title, summary);

  if (!recoverableItems.length) {
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'button button-small button-secondary';
    closeButton.textContent = 'Cerrar resultado';
    closeButton.addEventListener('click', clearBackupRecoveryResult);
    panel.append(closeButton);
    showBackupRecoverResult(panel);
    return;
  }

  if (missingImageCount) {
    const warning = document.createElement('p');
    warning.className = 'backup-recover-warning';
    warning.textContent = `${missingImageCount} publicación${missingImageCount === 1 ? '' : 'es'} no tiene su imagen dentro de la copia. Podrás recuperarla, pero revisa la imagen después.`;
    panel.append(warning);
  }

  const selectAllLabel = document.createElement('label');
  selectAllLabel.className = 'backup-recover-select-all';

  const selectAllCheckbox = document.createElement('input');
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.checked = selectedCount === recoverableItems.length;
  selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < recoverableItems.length;
  selectAllCheckbox.addEventListener('change', () => setAllBackupRecoverySelected(selectAllCheckbox.checked));

  const selectAllText = document.createElement('span');
  selectAllText.textContent = selectedCount
    ? `${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}`
    : 'Seleccionar recuperables';

  selectAllLabel.append(selectAllCheckbox, selectAllText);
  panel.append(selectAllLabel);

  const list = document.createElement('div');
  list.className = 'backup-recover-list';

  recoverableItems.forEach(({ item, imagePath, imageIncluded }) => {
    const row = document.createElement('label');
    row.className = 'backup-recover-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedIds.has(item.id);
    checkbox.addEventListener('change', () => setBackupRecoverySelected(item.id, checkbox.checked));

    const text = document.createElement('span');
    text.className = 'backup-recover-item-text';

    const itemTitle = document.createElement('strong');
    itemTitle.textContent = item.title || 'Sin título';

    const meta = document.createElement('span');
    const imageStatus = imagePath
      ? imageIncluded ? 'imagen incluida' : 'revisar imagen'
      : 'sin imagen';
    meta.textContent = `${getCategoryLabel(item)} · ${getStatusLabel(item)} · ${formatDate(item.createdAt) || 'sin fecha'} · ${imageStatus}`;

    text.append(itemTitle, meta);
    row.append(checkbox, text);
    list.append(row);
  });

  const actions = document.createElement('div');
  actions.className = 'backup-recover-actions';

  const recoverButton = document.createElement('button');
  recoverButton.type = 'button';
  recoverButton.className = 'button';
  recoverButton.textContent = selectedCount
    ? `Recuperar ${selectedCount} seleccionada${selectedCount === 1 ? '' : 's'}`
    : 'Recuperar seleccionadas';
  recoverButton.disabled = selectedCount === 0;
  recoverButton.addEventListener('click', recoverSelectedPostsFromBackup);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'button button-secondary';
  cancelButton.textContent = 'Cancelar';
  cancelButton.addEventListener('click', clearBackupRecoveryResult);

  actions.append(recoverButton, cancelButton);
  panel.append(list, actions);
  showBackupRecoverResult(panel, missingImageCount ? 'warning' : 'success');
}

async function analyzeBackupForRecovery() {
  state.lastFeedbackScope = 'tools';

  const file = recoverBackupFile?.files?.[0];

  if (!file) {
    showAlert('Selecciona primero un archivo ZIP de copia completa.', 'error', { scope: 'tools', scroll: true });
    return;
  }

  try {
    if (analyzeRecoverBackupButton) {
      analyzeRecoverBackupButton.disabled = true;
      analyzeRecoverBackupButton.textContent = 'Analizando…';
    }

    clearBackupRecoveryResult();
    showAlert('Buscando publicaciones recuperables…', 'success', { scope: 'tools', scroll: true });

    const entries = parseZipEntries(await file.arrayBuffer());
    const publicacionesText = readZipTextEntry(entries, 'data/publicaciones.json');

    if (!publicacionesText) {
      throw new Error('La copia no contiene los datos necesarios para recuperar publicaciones.');
    }

    let publicacionesJson;

    try {
      publicacionesJson = JSON.parse(publicacionesText);
    } catch (error) {
      throw new Error('Los datos de esta copia no se pueden leer correctamente.');
    }

    if (!publicacionesJson || !Array.isArray(publicacionesJson.items)) {
      throw new Error('La copia contiene datos, pero no tienen el formato esperado del panel.');
    }

    const recoverableItems = getRecoverableItemsFromBackup(publicacionesJson, entries);

    state.backupRecovery = {
      fileName: file.name,
      publicacionesUpdatedAt: publicacionesJson.updatedAt || '',
      recoverableItems,
      selectedIds: new Set(recoverableItems.map(({ item }) => item.id))
    };

    renderBackupRecoveryPanel();
    showAlert(
      recoverableItems.length
        ? `Se han encontrado ${recoverableItems.length} publicación${recoverableItems.length === 1 ? '' : 'es'} que puedes recuperar.`
        : 'No se han encontrado publicaciones eliminadas para recuperar.',
      'success',
      { scope: 'tools', scroll: true }
    );
  } catch (error) {
    showBackupRecoverResult([
      'No se ha podido analizar la copia.',
      '',
      error.message || 'El archivo seleccionado no parece una copia válida.'
    ], 'error');
    showAlert(error.message || 'No se ha podido analizar la copia.', 'error', { scope: 'tools', scroll: true });
    console.error(error);
  } finally {
    if (analyzeRecoverBackupButton) {
      analyzeRecoverBackupButton.disabled = false;
      analyzeRecoverBackupButton.textContent = 'Buscar recuperables';
    }
  }
}

async function recoverSelectedPostsFromBackup() {
  state.lastFeedbackScope = 'tools';
  if (blockIfPendingOrder()) return;
  if (!confirmAndDiscardFormChangesBeforeBulkAction('Tienes cambios sin guardar en el formulario. Antes de recuperar publicaciones, guarda o descarta esos cambios. ¿Descartarlos ahora?')) return;

  if (!state.backupRecovery) {
    showAlert('Primero analiza una copia completa.', 'error', { scope: 'tools', scroll: true });
    return;
  }

  const currentIds = getCurrentItemIds();
  const selectedIds = new Set(state.backupRecovery.selectedIds || []);
  const selectedRecoveryItems = state.backupRecovery.recoverableItems
    .filter(({ item }) => selectedIds.has(item.id) && !currentIds.has(item.id));

  if (!selectedRecoveryItems.length) {
    showAlert('No hay publicaciones seleccionadas pendientes de recuperar.', 'error', { scope: 'tools', scroll: true });
    return;
  }

  const missingImageCount = selectedRecoveryItems.filter(({ imageIncluded }) => !imageIncluded).length;
  const warningText = missingImageCount
    ? `\n\nAviso: ${missingImageCount} publicación${missingImageCount === 1 ? '' : 'es'} no tiene su imagen dentro de la copia. Revisa esas publicaciones después de recuperarlas.`
    : '';
  const confirmed = window.confirm(`¿Recuperar ${selectedRecoveryItems.length} publicación${selectedRecoveryItems.length === 1 ? '' : 'es'} seleccionada${selectedRecoveryItems.length === 1 ? '' : 's'}? Se añadirán al panel actual y se conservarán las publicaciones que ya tienes.${warningText}`);

  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    const currentItems = normalizeItemsWithOrder(
      Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : []
    );
    const recoveredItems = selectedRecoveryItems.map(({ item }) => {
      const { _localPreviewSrc, ...cleanItem } = item;
      return {
        ...cleanItem,
        category: getItemCategory(cleanItem),
        status: getItemStatus(cleanItem),
        published: getItemStatus(cleanItem) === 'published',
        updatedAt: nowIso
      };
    });
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: normalizeItemsWithOrder([...recoveredItems, ...currentItems])
    };
    const payload = attachPublicacionesPayload({
      action: 'recover_from_backup',
      ids: recoveredItems.map((item) => item.id)
    }, nextPublicacionesJson);

    await sendToMake('update', payload);

    state.selectedIds.clear();
    state.backupRecovery = null;
    if (recoverBackupFile) recoverBackupFile.value = '';
    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    resetAdminPagination();
    renderAdminPosts();
    clearBackupRecoveryResult();
    showAlert(`${recoveredItems.length} publicación${recoveredItems.length === 1 ? '' : 'es'} recuperada${recoveredItems.length === 1 ? '' : 's'} correctamente.`, 'success', { scope: 'tools', scroll: true });
  } catch (error) {
    showAlert(error.message || 'No se han podido recuperar las publicaciones seleccionadas.', 'error', { scope: 'tools', scroll: true });
    console.error(error);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  state.password = loginPassword.value;
  sessionStorage.setItem('cmsPassword', state.password);
  showAdmin();
});

logoutButton.addEventListener('click', () => {
  if (hasUnsavedFormChanges()) {
    if (!confirmDiscardFormChanges('Tienes cambios sin guardar. Si sales del panel, se perderán. ¿Continuar?')) {
      showAlert('Acción cancelada. Guarda la publicación o cancela los cambios antes de continuar.', 'error');
      return;
    }
    resetForm();
  }

  sessionStorage.removeItem('cmsPassword');
  state.password = '';
  showLogin();
});

postForm.addEventListener('submit', savePost);
cancelEditButton.addEventListener('click', () => {
  if (blockIfUnsavedFormChanges('Tienes cambios sin guardar. ¿Quieres cancelar la edición y descartarlos?')) return;
  resetForm();
});
refreshButton.addEventListener('click', () => {
  state.lastFeedbackScope = 'list';
  if (hasUnsavedFormChanges()) {
    if (!confirmDiscardFormChanges('Tienes cambios sin guardar. Si actualizas el listado, se perderán. ¿Continuar?')) {
      showAlert('Acción cancelada. Guarda la publicación o cancela los cambios antes de continuar.', 'error');
      return;
    }
    resetForm();
  }

  if (blockIfPendingOrder()) return;
  loadAdminPosts();
});

postImage.addEventListener('change', () => {
  clearPreviewObjectUrl();
  const file = postImage.files[0];

  if (file) {
    state.previewObjectUrl = URL.createObjectURL(file);
  }

  updateLivePreview();
});

[postTitle, postAlt, postStatus, postCategory]
  .filter(Boolean)
  .forEach((field) => field.addEventListener('input', updateLivePreview));

if (postDescriptionEditor) {
  postDescriptionEditor.addEventListener('input', () => {
    saveRichEditorSelection();
    syncDescriptionFieldFromEditor();
    updateLivePreview();
    updateRichFormatControl();
  });
  postDescriptionEditor.addEventListener('paste', handleRichTextPaste);
  postDescriptionEditor.addEventListener('keyup', () => {
    saveRichEditorSelection();
    updateRichFormatControl();
  });
  postDescriptionEditor.addEventListener('mouseup', () => {
    saveRichEditorSelection();
    updateRichFormatControl();
  });
  postDescriptionEditor.addEventListener('blur', (event) => {
    saveRichEditorSelection();

    if (event.relatedTarget?.closest?.('.rich-editor-toolbar')) {
      return;
    }

    setDescriptionEditorContent(getEditorRawHtml());
    updateLivePreview();
    updateRichFormatControl();
  });
}

if (richFormatSelect) {
  richFormatSelect.addEventListener('mousedown', saveRichEditorSelection);
  richFormatSelect.addEventListener('change', () => applyRichTextBlockFormat(richFormatSelect.value));
}

richTextButtons.forEach((button) => {
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    saveRichEditorSelection();
  });
  button.addEventListener('click', () => runRichTextCommand(button.dataset.richCommand));
});

if (richColorToggle) {
  richColorToggle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    saveRichEditorSelection();
  });
  richColorToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setRichColorMenuOpen(richColorMenu?.classList.contains('hidden'));
  });
}

richColorButtons.forEach((button) => {
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    saveRichEditorSelection();
  });
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    applyRichTextColor(button.dataset.richColor);
  });
});

document.addEventListener('click', (event) => {
  if (!richColorMenu || richColorMenu.classList.contains('hidden')) return;
  if (event.target.closest?.('.rich-color-picker')) return;
  setRichColorMenuOpen(false);
});

[postStatus, postCategory]
  .filter(Boolean)
  .forEach((field) => field.addEventListener('change', updateLivePreview));

if (postSearch) {
  postSearch.addEventListener('input', () => {
    state.searchQuery = postSearch.value;
    resetAdminPagination();
    renderAdminPosts();
  });
}

if (postStatusFilter) {
  postStatusFilter.addEventListener('change', () => {
    state.statusFilter = postStatusFilter.value;
    resetAdminPagination();
    renderAdminPosts();
  });
}

if (postCategoryFilter) {
  postCategoryFilter.addEventListener('change', () => {
    state.categoryFilter = postCategoryFilter.value;
    resetAdminPagination();
    renderAdminPosts();
  });
}

if (clearSearchButton) {
  clearSearchButton.addEventListener('click', () => {
    state.searchQuery = '';
    state.statusFilter = 'all';
    state.categoryFilter = 'all';
    resetAdminPagination();
    if (postSearch) postSearch.value = '';
    if (postStatusFilter) postStatusFilter.value = 'all';
    if (postCategoryFilter) postCategoryFilter.value = 'all';
    renderAdminPosts();
    postSearch?.focus();
  });
}


if (exportBackupButton) {
  exportBackupButton.addEventListener('click', exportCompleteBackup);
}

if (verifyBackupButton) {
  verifyBackupButton.addEventListener('click', verifyCompleteBackup);
}

if (verifyBackupFile) {
  verifyBackupFile.addEventListener('change', () => {
    if (backupVerifyResult) {
      backupVerifyResult.classList.add('hidden');
      backupVerifyResult.textContent = '';
    }
  });
}

if (analyzeRecoverBackupButton) {
  analyzeRecoverBackupButton.addEventListener('click', analyzeBackupForRecovery);
}

if (recoverBackupFile) {
  recoverBackupFile.addEventListener('change', clearBackupRecoveryResult);
}

if (mobileMenuButton) {
  mobileMenuButton.addEventListener('click', toggleMobileQuickMenu);
}

mobileNavButtons.forEach((button) => {
  button.addEventListener('click', () => scrollToAdminArea(button.dataset.mobileScroll));
});

helpOpenButtons.forEach((button) => {
  button.addEventListener('click', openAdminHelp);
});

helpCloseButtons.forEach((button) => {
  button.addEventListener('click', closeAdminHelp);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && helpModal && !helpModal.classList.contains('hidden')) {
    closeAdminHelp();
  }
});

window.addEventListener('resize', () => {
  if (!window.matchMedia?.('(min-width: 761px)').matches) return;
  closeMobileQuickMenu();
});

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedFormChanges() && !state.orderDirty) return;
  event.preventDefault();
  event.returnValue = '';
});

resetForm();

if (state.password) {
  showAdmin();
} else {
  showLogin();
}
