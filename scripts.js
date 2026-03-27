(() => {
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('siteNav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCap = document.getElementById('lightboxCap');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    document.querySelectorAll('[data-lightbox]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const src = btn.getAttribute('data-image');
        const cap = btn.getAttribute('data-caption');
        if (lightboxImg) {
          lightboxImg.src = src || '';
        }
        if (lightboxCap) {
          lightboxCap.textContent = cap || '';
        }
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }
})();
