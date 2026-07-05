const config = window.CMS_CONFIG;
const ADMIN_LOCAL_SNAPSHOT_KEY = 'cmsPublicacionesSnapshot';
const RAW_GITHUB_BASE_URL = 'https://github.com/joanramonseijosevilla-tech/cms-archivos/raw/HEAD/';

const state = {
  items: [],
  publicacionesUpdatedAt: '',
  password: sessionStorage.getItem('cmsPassword') || '',
  orderDirty: false,
  orderOriginalItems: null,
  previewObjectUrl: '',
  searchQuery: ''
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
const postImage = document.querySelector('#post-image');
const postAlt = document.querySelector('#post-alt');
const postStatus = document.querySelector('#post-status');
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
const clearSearchButton = document.querySelector('#clear-search-button');

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

function getItemStatus(item) {
  return item?.status === 'hidden' || item?.status === 'draft' ? 'hidden' : 'published';
}

function getStatusLabel(item) {
  return getItemStatus(item) === 'hidden' ? 'Oculto' : 'Publicado';
}

function getFormStatus() {
  return postStatus?.value === 'hidden' ? 'hidden' : 'published';
}

function isItemPublished(item) {
  return getItemStatus(item) === 'published';
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
    item?.description
  ].join(' '));

  return searchableText.includes(cleanQuery);
}

function getSearchQuery() {
  return normalizeSearchText(state.searchQuery);
}

function hasActiveSearch() {
  return Boolean(getSearchQuery());
}

function updateSearchControls() {
  if (!postSearch || !clearSearchButton) return;
  clearSearchButton.classList.toggle('hidden', !hasActiveSearch());
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
  const searchActive = hasActiveSearch();
  const displayedItems = searchActive
    ? fullOrderedItems.filter((item) => itemMatchesSearch(item, state.searchQuery))
    : fullOrderedItems;

  if (searchActive) {
    adminStatus.textContent = displayedItems.length
      ? `Mostrando ${displayedItems.length} de ${fullOrderedItems.length} publicaciones.`
      : 'No hay publicaciones que coincidan con la búsqueda.';
  } else {
    adminStatus.textContent = '';
  }

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

      meta.append(date, status);

      const description = document.createElement('p');
      description.className = 'admin-post-description';
      description.textContent = item.description || '';

      const actions = document.createElement('div');
      actions.className = 'admin-post-actions';

      const moveUpButton = document.createElement('button');
      moveUpButton.type = 'button';
      moveUpButton.className = 'button button-secondary';
      moveUpButton.textContent = 'Subir';
      moveUpButton.disabled = searchActive || fullIndex === 0;
      moveUpButton.title = searchActive ? 'Limpia la búsqueda para cambiar el orden.' : '';
      moveUpButton.addEventListener('click', () => movePost(item, -1));

      const moveDownButton = document.createElement('button');
      moveDownButton.type = 'button';
      moveDownButton.className = 'button button-secondary';
      moveDownButton.textContent = 'Bajar';
      moveDownButton.disabled = searchActive || fullIndex === fullOrderedItems.length - 1;
      moveDownButton.title = searchActive ? 'Limpia la búsqueda para cambiar el orden.' : '';
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

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'button button-danger';
      deleteButton.textContent = 'Eliminar';
      deleteButton.addEventListener('click', () => deletePost(item));

      actions.append(moveUpButton, moveDownButton, toggleStatusButton, editButton, deleteButton);
      content.append(title, meta, description, actions);
      card.append(img, content);
      fragment.append(card);
    });

  if (searchActive && !displayedItems.length) {
    const emptySearch = document.createElement('p');
    emptySearch.className = 'status';
    emptySearch.textContent = 'Prueba con otra palabra o limpia la búsqueda para ver todo el contenido.';
    fragment.append(emptySearch);
  }

  adminPosts.append(fragment);
}

function startEdit(item) {
  if (blockIfPendingOrder()) return;
  postId.value = item.id;
  postTitle.value = item.title || '';
  postDescription.value = item.description || '';
  postAlt.value = item.image?.alt || '';
  if (postStatus) postStatus.value = getItemStatus(item);
  currentImagePath.value = item.image?.path || '';
  currentImageSrc.value = item.image?.src || '';
  formTitle.textContent = 'Editar publicación';
  saveButton.textContent = 'Guardar cambios';
  cancelEditButton.classList.remove('hidden');
  postImage.required = false;
  clearPreviewObjectUrl();
  updateLivePreview();
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
  postId.value = '';
  currentImagePath.value = '';
  currentImageSrc.value = '';
  if (postStatus) postStatus.value = 'published';
  formTitle.textContent = 'Nueva publicación';
  saveButton.textContent = 'Guardar publicación';
  cancelEditButton.classList.add('hidden');
  postImage.required = false;
  clearPreviewObjectUrl();
  updateLivePreview();
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
  const description = postDescription.value.trim();
  const status = getFormStatus();
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

  const titleNode = document.createElement('h3');
  titleNode.textContent = title || 'Título de la publicación';

  const descriptionNode = document.createElement('p');
  descriptionNode.className = 'post-preview-description';
  descriptionNode.textContent = description || 'La descripción aparecerá aquí.';

  meta.append(date, statusBadge);
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

function validateImage(file, isEdit) {
  if (!file && !isEdit) {
    throw new Error('Selecciona una fotografía.');
  }
  if (!file) return;
  if (!config.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WebP.');
  }
  const sizeMb = file.size / 1024 / 1024;
  if (sizeMb > config.MAX_IMAGE_MB) {
    throw new Error(`La imagen pesa demasiado. Máximo recomendado: ${config.MAX_IMAGE_MB} MB.`);
  }
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

function buildFinalImageName(file, date) {
  const datePart = buildTimestamp(date, '-');
  const baseName = getImageBaseName(file);
  const extension = getImageExtension(file);
  return `${datePart}-${baseName}.${extension}`;
}

function buildFinalImagePath(file, date) {
  return `assets/uploads/${buildFinalImageName(file, date)}`;
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
    validateImage(file, isEdit);

    const title = postTitle.value.trim();
    const description = postDescription.value.trim();
    const status = getFormStatus();
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
      alt: postAlt.value.trim(),
      currentImagePath: currentImagePath.value || undefined,
      currentImageSrc: currentImageSrc.value || undefined
    };

    if (!isEdit) {
      const imagePath = buildFinalImagePath(file, now);
      const newItem = {
        id: `pub_${buildTimestamp(now)}`,
        title,
        description,
        image: {
          src: imagePath,
          path: imagePath,
          alt: title
        },
        status,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const imageBase64 = await fileToBase64(file);
      payload.id = newItem.id;
      payload.image = {
        fileName: imagePath.split('/').pop(),
        originalFileName: file.name,
        mimeType: file.type,
        base64: imageBase64,
        path: imagePath
      };

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
        const imagePath = buildFinalImagePath(file, now);
        const imageBase64 = await fileToBase64(file);
        payload.image = {
          fileName: imagePath.split('/').pop(),
          originalFileName: file.name,
          mimeType: file.type,
          base64: imageBase64,
          path: imagePath
        };
        nextImage = {
          src: imagePath,
          path: imagePath,
          alt: postAlt.value.trim() || title
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
              alt: postAlt.value.trim() || item.image?.alt || title
            },
            status,
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
  const currentIndex = currentItems.findIndex((currentItem) => currentItem.id === item.id);
  const nextIndex = currentIndex + direction;

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentItems.length) return;

  if (!state.orderDirty) {
    state.orderOriginalItems = currentItems.map((currentItem) => ({ ...currentItem }));
  }

  const reorderedItems = currentItems.slice();
  const [movedItem] = reorderedItems.splice(currentIndex, 1);
  reorderedItems.splice(nextIndex, 0, movedItem);

  state.items = reorderedItems.map((currentItem, index) => ({
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

async function deletePost(item) {
  if (blockIfPendingOrder()) return;
  const confirmed = window.confirm(`¿Eliminar "${item.title || 'esta publicación'}"?`);
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
      id: item.id,
      imagePath: item.image?.path
    }, nextPublicacionesJson);

    await sendToMake('delete', payload);

    setStateFromPublicacionesJson(nextPublicacionesJson);
    saveLocalSnapshot(nextPublicacionesJson);
    renderAdminPosts();
    showAlert('Publicación eliminada correctamente.');
    if (postId.value === item.id) resetForm();
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
  sessionStorage.removeItem('cmsPassword');
  state.password = '';
  showLogin();
});

postForm.addEventListener('submit', savePost);
cancelEditButton.addEventListener('click', resetForm);
refreshButton.addEventListener('click', () => {
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

[postTitle, postDescription, postAlt, postStatus]
  .filter(Boolean)
  .forEach((field) => field.addEventListener('input', updateLivePreview));

if (postSearch) {
  postSearch.addEventListener('input', () => {
    state.searchQuery = postSearch.value;
    renderAdminPosts();
  });
}

if (clearSearchButton) {
  clearSearchButton.addEventListener('click', () => {
    state.searchQuery = '';
    if (postSearch) postSearch.value = '';
    renderAdminPosts();
    postSearch?.focus();
  });
}

updateLivePreview();

if (state.password) {
  showAdmin();
} else {
  showLogin();
}
