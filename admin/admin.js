const config = window.CMS_CONFIG;
const state = {
  items: [],
  password: sessionStorage.getItem('cmsPassword') || ''
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

function normalizeSrc(src) {
  if (!src) return '';
  if (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:')) return src;
  if (src.startsWith('/')) return `..${src}`;
  return `../${src}`;
}

function addAdminCacheBuster(src) {
  const normalizedSrc = normalizeSrc(src);
  if (!normalizedSrc || normalizedSrc.startsWith('blob:') || normalizedSrc.startsWith('data:')) return normalizedSrc;
  const separator = normalizedSrc.includes('?') ? '&' : '?';
  return `${normalizedSrc}${separator}v=${Date.now()}`;
}

function getAdminImageSrc(item) {
  return item?._localPreviewSrc || addAdminCacheBuster(item?.image?.src);
}

function stripPanelOnlyFields(item) {
  if (!item || typeof item !== 'object') return item;
  const { _localPreviewSrc, ...publicItem } = item;
  return publicItem;
}

function withPanelPreview(items, previewItemId, previewSrc) {
  return items.map((item) => {
    const previousItem = state.items.find((currentItem) => currentItem.id === item.id);
    const localPreviewSrc = item.id === previewItemId && previewSrc
      ? previewSrc
      : previousItem?._localPreviewSrc;

    return localPreviewSrc ? { ...item, _localPreviewSrc: localPreviewSrc } : item;
  });
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

async function loadAdminPosts() {
  adminStatus.textContent = 'Cargando publicaciones…';
  adminPosts.replaceChildren();

  try {
    const response = await fetch(`${config.PUBLIC_JSON_URL}?v=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error(`No se pudo leer el JSON (${response.status})`);

    const data = await response.json();
    state.items = Array.isArray(data.items) ? data.items : [];
    renderAdminPosts();
  } catch (error) {
    adminStatus.textContent = 'No se han podido cargar las publicaciones.';
    console.error(error);
  }
}

function renderAdminPosts() {
  adminPosts.replaceChildren();

  if (!state.items.length) {
    adminStatus.textContent = 'Todavía no hay publicaciones.';
    return;
  }

  adminStatus.textContent = '';
  const fragment = document.createDocumentFragment();

  state.items
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .forEach((item) => {
      const card = document.createElement('article');
      card.className = 'admin-post';

      const img = document.createElement('img');
      img.src = getAdminImageSrc(item);
      img.alt = item.image?.alt || item.title || 'Imagen de publicación';
      img.loading = 'lazy';
      img.onerror = () => {
        if (item._localPreviewSrc && img.src !== item._localPreviewSrc) {
          img.src = item._localPreviewSrc;
        }
      };

      const content = document.createElement('div');

      const title = document.createElement('h3');
      title.textContent = item.title || 'Sin título';

      const meta = document.createElement('p');
      meta.textContent = `${formatDate(item.createdAt)} · ${truncate(item.description, 100)}`;

      const actions = document.createElement('div');
      actions.className = 'admin-post-actions';

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

      actions.append(editButton, deleteButton);
      content.append(title, meta, actions);
      card.append(img, content);
      fragment.append(card);
    });

  adminPosts.append(fragment);
}

function startEdit(item) {
  postId.value = item.id;
  postTitle.value = item.title || '';
  postDescription.value = item.description || '';
  postAlt.value = item.image?.alt || '';
  currentImagePath.value = item.image?.path || '';
  currentImageSrc.value = item.image?.src || '';
  formTitle.textContent = 'Editar publicación';
  saveButton.textContent = 'Guardar cambios';
  cancelEditButton.classList.remove('hidden');
  postImage.required = false;
  renderPreview(item.image?.src, item.image?.alt || item.title);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  postForm.reset();
  postId.value = '';
  currentImagePath.value = '';
  currentImageSrc.value = '';
  formTitle.textContent = 'Nueva publicación';
  saveButton.textContent = 'Guardar publicación';
  cancelEditButton.classList.add('hidden');
  postImage.required = false;
  imagePreview.classList.add('hidden');
  imagePreview.replaceChildren();
}

function renderPreview(src, alt = '') {
  imagePreview.replaceChildren();
  if (!src) {
    imagePreview.classList.add('hidden');
    return;
  }
  const img = document.createElement('img');
  img.src = normalizeSrc(src);
  img.alt = alt;
  imagePreview.append(img);
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

function normalizePublicacionesJson(data) {
  return {
    version: data?.version || 1,
    updatedAt: data?.updatedAt || new Date().toISOString(),
    items: Array.isArray(data?.items) ? data.items : []
  };
}

async function loadPublicacionesJsonForMake() {
  const response = await fetch(`${config.PUBLIC_JSON_URL}?v=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer data/publicaciones.json (${response.status}).`);
  }

  const data = await response.json();
  return normalizePublicacionesJson(data);
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

  // El panel solo actualiza el estado local cuando Make confirma ok:true.
  if (!response.ok || data.ok !== true) {
    throw new Error(data.error || data.message || 'Make no confirmó la operación con { "ok": true }.');
  }

  return data;
}

async function savePost(event) {
  event.preventDefault();
  setBusy(true);

  try {
    const isEdit = Boolean(postId.value);
    const file = postImage.files[0];
    validateImage(file, isEdit);

    const title = postTitle.value.trim();
    const description = postDescription.value.trim();
    const now = new Date();
    const nowIso = now.toISOString();
    // Usamos state.items como base local para evitar sobrescrituras por caché o retraso de GitHub Pages.
    const currentItems = Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : [];
    let nextPublicacionesJson;
    let localPreviewSrc = '';

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
        status: 'published',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const imageBase64 = await fileToBase64(file);
      localPreviewSrc = `data:${file.type};base64,${imageBase64}`;

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
        items: [...currentItems, newItem]
      };
    } else {
      let nextImage = null;

      if (file) {
        const imagePath = buildFinalImagePath(file, now);
        const imageBase64 = await fileToBase64(file);
        localPreviewSrc = `data:${file.type};base64,${imageBase64}`;

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
        items: currentItems.map((item) => {
          if (item.id !== postId.value) return item;
          return {
            ...item,
            title,
            description,
            image: nextImage || {
              ...item.image,
              alt: postAlt.value.trim() || item.image?.alt || title
            },
            updatedAt: nowIso
          };
        })
      };
    }

    attachPublicacionesPayload(payload, nextPublicacionesJson);

    await sendToMake(isEdit ? 'update' : 'create', payload);
    // _localPreviewSrc es solo una ayuda visual temporal del panel tras OK de Make.
    state.items = withPanelPreview(nextPublicacionesJson.items, payload.id, localPreviewSrc);
    renderAdminPosts();
    showAlert(isEdit ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.');
    resetForm();
  } catch (error) {
    showAlert(error.message, 'error');
    console.error(error);
  } finally {
    setBusy(false);
  }
}

async function deletePost(item) {
  const confirmed = window.confirm(`¿Eliminar "${item.title || 'esta publicación'}"?`);
  if (!confirmed) return;

  try {
    const nowIso = new Date().toISOString();
    // Usamos state.items como base local para evitar sobrescrituras por caché o retraso de GitHub Pages.
    const currentItems = Array.isArray(state.items) ? state.items.map(stripPanelOnlyFields) : [];
    const nextPublicacionesJson = {
      version: 1,
      updatedAt: nowIso,
      items: currentItems.filter((currentItem) => currentItem.id !== item.id)
    };
    const payload = attachPublicacionesPayload({
      id: item.id,
      imagePath: item.image?.path
    }, nextPublicacionesJson);

    await sendToMake('delete', payload);
    state.items = withPanelPreview(nextPublicacionesJson.items, null, '');
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
refreshButton.addEventListener('click', loadAdminPosts);

postImage.addEventListener('change', () => {
  const file = postImage.files[0];
  if (!file) return;
  const localUrl = URL.createObjectURL(file);
  renderPreview(localUrl, postTitle.value);
});

if (state.password) {
  showAdmin();
} else {
  showLogin();
}
