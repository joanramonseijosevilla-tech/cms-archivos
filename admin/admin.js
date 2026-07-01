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
      img.src = normalizeSrc(item.image?.src);
      img.alt = item.image?.alt || item.title || 'Imagen de publicación';
      img.loading = 'lazy';

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
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.message || `Make respondió con error ${response.status}.`);
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

    const payload = {
      id: postId.value || undefined,
      title: postTitle.value.trim(),
      description: postDescription.value.trim(),
      alt: postAlt.value.trim(),
      currentImagePath: currentImagePath.value || undefined,
      currentImageSrc: currentImageSrc.value || undefined
    };

    if (file) {
      payload.image = {
        fileName: file.name,
        mimeType: file.type,
        base64: await fileToBase64(file)
      };
    }

    await sendToMake(isEdit ? 'update' : 'create', payload);
    showAlert(isEdit ? 'Publicación actualizada correctamente.' : 'Publicación creada correctamente.');
    resetForm();
    await loadAdminPosts();
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
    await sendToMake('delete', {
      id: item.id,
      imagePath: item.image?.path
    });
    showAlert('Publicación eliminada correctamente.');
    if (postId.value === item.id) resetForm();
    await loadAdminPosts();
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
