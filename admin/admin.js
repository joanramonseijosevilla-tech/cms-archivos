const config = window.CMS_CONFIG;
const ADMIN_LOCAL_SNAPSHOT_KEY = 'cmsPublicacionesSnapshot';
const RAW_GITHUB_BASE_URL = 'https://github.com/joanramonseijosevilla-tech/cms-archivos/raw/HEAD/';
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
  formBaseline: ''
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
const formTitle = document.querySelector('#form-title');
const saveButton = document.querySelector('#save-button');
const cancelEditButton = document.querySelector('#cancel-edit-button');
const refreshButton = document.querySelector('#refresh-button');
const imagePreview = document.querySelector('#image-preview');
const postSearch = document.querySelector('#post-search');
const postStatusFilter = document.querySelector('#post-status-filter');
const postCategoryFilter = document.querySelector('#post-category-filter');
const clearSearchButton = document.querySelector('#clear-search-button');
let richEditorSavedRange = null;
let richEditorActiveColorValue = 'base';

function showAlert(message, type = 'success') {
  adminAlert.textContent = message;
  adminAlert.className = `admin-alert ${type === 'error' ? 'error' : ''}`;
  adminAlert.classList.remove('hidden');
  window.setTimeout(() => adminAlert.classList.add('hidden'), 5200);
}

function setBusy(isBusy) {
  saveButton.disabled = isBusy;
  saveButton.textContent = isBusy ? 'Guardando…' : (postId.value ? 'Guardar cambios' : 'Guardar publicación');
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
  return item?.status === 'hidden' || item?.status === 'draft' ? 'hidden' : 'published';
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

function validateRequiredPostFields(isEdit, file) {
  const title = postTitle.value.trim();
  const description = getCleanDescriptionForSave();
  const descriptionText = richTextToPlainText(description);
  const alt = postAlt.value.trim();

  if (!title) {
    postTitle.focus();
    throw new Error('El título es obligatorio.');
  }

  if (!descriptionText) {
    postDescriptionEditor?.focus();
    throw new Error('La descripción es obligatoria.');
  }

  validateImage(file, isEdit);

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
  const displayedItems = fullOrderedItems.filter((item) => (
    itemMatchesSearch(item, state.searchQuery) && itemMatchesStatusFilter(item) && itemMatchesCategoryFilter(item)
  ));

  adminStatus.textContent = buildStatusText(displayedItems.length, fullOrderedItems);

  const fragment = document.createDocumentFragment();

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

  displayedItems
    .forEach((item) => {
      const fullIndex = fullOrderedItems.findIndex((orderedItem) => orderedItem.id === item.id);
      const card = document.createElement('article');
      card.className = 'admin-post';

      const img = document.createElement('img');
      setImageSrc(img, item.image?.src);
      img.alt = item.image?.alt || item.title || 'Imagen de publicación';
      img.loading = 'lazy';

      const content = document.createElement('div');

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

        const trashButton = document.createElement('button');
        trashButton.type = 'button';
        trashButton.className = 'button button-danger button-with-icon button-trash';
        trashButton.innerHTML = '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" fill="currentColor"/></svg><span>Papelera</span>';
        trashButton.title = 'Mover a papelera';
        trashButton.addEventListener('click', () => movePostToTrash(item));

        actions.append(moveUpButton, moveDownButton, toggleStatusButton, editButton, trashButton);
      }
      content.append(title, meta, description, actions);
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
      const optimizedImage = await optimizeImageForUpload(file, now);
      const imagePath = optimizedImage.path;
      const newItem = {
        id: `pub_${buildTimestamp(now)}`,
        title,
        description,
        image: {
          src: imagePath,
          path: imagePath,
          alt: alt || title
        },
        status,
        category,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      payload.id = newItem.id;
      payload.image = optimizedImage;

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
    showAlert(isEdit ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.');
    resetForm();

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
    renderAdminPosts();
  });
}

if (postStatusFilter) {
  postStatusFilter.addEventListener('change', () => {
    state.statusFilter = postStatusFilter.value;
    renderAdminPosts();
  });
}

if (postCategoryFilter) {
  postCategoryFilter.addEventListener('change', () => {
    state.categoryFilter = postCategoryFilter.value;
    renderAdminPosts();
  });
}

if (clearSearchButton) {
  clearSearchButton.addEventListener('click', () => {
    state.searchQuery = '';
    state.statusFilter = 'all';
    state.categoryFilter = 'all';
    if (postSearch) postSearch.value = '';
    if (postStatusFilter) postStatusFilter.value = 'all';
    if (postCategoryFilter) postCategoryFilter.value = 'all';
    renderAdminPosts();
    postSearch?.focus();
  });
}

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
