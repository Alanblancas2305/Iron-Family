import './installations.css';
const $ = selector => document.querySelector(selector);
const gallery = $('#gallery-dialog');
const collage = $('#gallery-collage');
const viewer = $('#photo-dialog');
const base = '/images/instalaciones/';
const areas = {
  gym: {
    title: 'IRON GYM', description: 'Tu espacio. Tu ritmo. Tu siguiente meta.',
    features: ['Zona de máquinas y poleas', 'Mancuernas, barras y peso libre', 'Entrenamiento a tu propio ritmo'],
    files: ['principal.jpeg', ...Array.from({ length: 6 }, (_, i) => `gym-0${i + 1}.jpeg`)]
  },
  cf: {
    title: 'IRON CROSS', description: 'Fuerza que se construye. Energía que se comparte.',
    features: ['Fuerza y acondicionamiento', 'Movimientos funcionales', 'Sesiones guiadas en comunidad'],
    files: [1, 2, 4, 3, 5, 6, 7, 8].map(i => `cros${i}.jpg`)
  }
};
let activeArea, photoIndex = 0, opener, photoOpener;

function showPhoto(index) {
  photoIndex = (index + activeArea.files.length) % activeArea.files.length;
  const image = $('#photo-full');
  image.src = base + activeArea.files[photoIndex];
  image.alt = `${activeArea.title}, instalaciones, fotografía ${photoIndex + 1}`;
  $('#photo-count').textContent = `${photoIndex + 1} / ${activeArea.files.length}`;
  $('#photo-caption').textContent = activeArea.title;
}
function closeGallery() { gallery.close(); }
document.querySelectorAll('[data-gallery]').forEach(button => {
  button.addEventListener('click', () => {
    activeArea = areas[button.dataset.gallery];
    if (!activeArea) return;
    opener = button;
    collage.replaceChildren();
    collage.dataset.area = button.dataset.gallery;
    $('#gallery-title').textContent = activeArea.title;
    $('#gallery-description').textContent = activeArea.description;
    $('#gallery-features').replaceChildren(...activeArea.features.map(text => {
      const li = document.createElement('li'); li.textContent = text; return li;
    }));
    activeArea.files.forEach((file, i) => {
      const tile = document.createElement('div');
      tile.className = 'installation-tile';
      const photo = document.createElement('button');
      photo.type = 'button'; photo.className = 'installation-photo';
      photo.setAttribute('aria-label', `Ampliar fotografía ${i + 1} de ${activeArea.title}`);
      photo.setAttribute('aria-haspopup', 'dialog');
      const img = document.createElement('img');
      img.src = base + file; img.alt = `${activeArea.title}, fotografía ${i + 1}`;
      img.loading = i < 3 ? 'eager' : 'lazy'; img.decoding = 'async';
      const number = document.createElement('span'); number.className = 'photo-number';
      number.textContent = String(i + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
      photo.append(img, number); tile.append(photo); collage.append(tile);
      photo.addEventListener('click', () => {
        photoOpener = photo; showPhoto(i); viewer.showModal();
      });
    });
    document.body.classList.add('modal-open');
    gallery.showModal(); gallery.scrollTop = 0;
  });
});
gallery.querySelector('.dialog-close').addEventListener('click', closeGallery);
gallery.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  opener?.focus({ preventScroll: true });
});
$('#photo-close').addEventListener('click', () => viewer.close());
$('#photo-prev').addEventListener('click', () => showPhoto(photoIndex - 1));
$('#photo-next').addEventListener('click', () => showPhoto(photoIndex + 1));
viewer.addEventListener('close', () => photoOpener?.focus({ preventScroll: true }));
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1));
  }
});
for (const dialog of [gallery, viewer]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
