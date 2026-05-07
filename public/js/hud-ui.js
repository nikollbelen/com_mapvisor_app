// HUD UI Controller - Vanilla JS
(function () {
  const isMobile = () => window.innerWidth <= 1024;

  // Elements
  const desktopHud = document.getElementById('hud-desktop');
  const mobileHud = document.getElementById('hud-mobile');
  const mobileMenu = document.getElementById('hud-mobile-menu');
  const menuOpenBtn = document.getElementById('hud-menu-open');
  const menuCloseBtn = document.getElementById('hud-menu-close');
  const legendPanel = document.getElementById('hud-legend-panel');
  const legendToggle = document.getElementById('hud-legend-toggle');

  // Responsive show/hide
  function updateVisibility() {
    if (!desktopHud || !mobileHud) return;
    if (isMobile()) {
      desktopHud.style.display = 'none';
      mobileHud.style.display = '';
    } else {
      desktopHud.style.display = '';
      mobileHud.style.display = 'none';
      if (mobileMenu) mobileMenu.style.display = 'none';
    }
  }

  window.addEventListener('resize', updateVisibility);
  updateVisibility();

  // Mobile menu toggle
  if (menuOpenBtn) menuOpenBtn.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.style.display = '';
  });
  if (menuCloseBtn) menuCloseBtn.addEventListener('click', () => {
    if (mobileMenu) mobileMenu.style.display = 'none';
  });

  // Legend toggle (mobile)
  if (legendToggle && legendPanel) {
    legendToggle.addEventListener('click', () => {
      legendPanel.style.display = legendPanel.style.display === 'none' ? '' : 'none';
    });
  }

  // Nav item clicks
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-nav');
      // Close mobile menu
      if (isMobile() && mobileMenu) mobileMenu.style.display = 'none';

      switch (action) {
        case 'fotos': if (window.handleFotos) window.handleFotos(); break;
        case 'areas': if (window.handleAreasComunes) window.handleAreasComunes(); break;
        case 'lotes': if (window.handleLotes) window.handleLotes(); break;
        case 'entorno': if (window.handleEntorno) window.handleEntorno(); break;
        case 'video': if (window.handleVideo) window.handleVideo(); break;
        case 'usuario':
          window.dispatchEvent(new CustomEvent('hudUserClick'));
          break;
      }
    });
  });

  // Camera control clicks
  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-cam');
      switch (action) {
        case 'home': if (window.goHome) window.goHome(); break;
        case 'up': if (window.moveCameraUp) window.moveCameraUp(); break;
        case 'down': if (window.moveCameraDown) window.moveCameraDown(); break;
        case 'zoomIn': if (window.zoomIn) window.zoomIn(); break;
        case 'zoomOut': if (window.zoomOut) window.zoomOut(); break;
        case 'view3d': if (window.view3D) window.view3D(); break;
        case 'grid': if (window.toggleGrid) window.toggleGrid(); break;
      }
    });
  });
})();
