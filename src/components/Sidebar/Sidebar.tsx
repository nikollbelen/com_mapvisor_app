import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUiVisibility } from '../../contexts/UiVisibilityContext';
import type { TopbarButtonId } from '../../types/auth';
import AdminUiPanel from '../AdminUiPanel/AdminUiPanel';
import LoginModal from '../Modals/LoginModal/LoginModal';
import UserInfoModal from '../Modals/UserInfoModal/UserInfoModal';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isButtonVisible } = useUiVisibility();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [isAdminUiPanelOpen, setIsAdminUiPanelOpen] = useState(false);
  const previousUserRef = useRef(user);

  const navItems: {
    id: TopbarButtonId;
    label: string;
    shortLabel: string;
    icon: string;
    mobileIcon?: string;
    mobileSubtitle?: string;
  }[] = [
    { id: 'fotos', label: 'Fotos 360', shortLabel: 'Fotos 360', icon: '360', mobileIcon: '360', mobileSubtitle: 'RECORRIDO VIRTUAL' },
    { id: 'areas', label: 'Áreas Comunes', shortLabel: 'Áreas Comunes', icon: 'park', mobileIcon: 'pool', mobileSubtitle: 'AMENIDADES PREMIUM' },
    { id: 'lotes', label: 'Lotes', shortLabel: 'Lotes', icon: 'grid_view', mobileSubtitle: 'DISPONIBILIDAD' },
    { id: 'entorno', label: 'Entorno', shortLabel: 'Entorno', icon: 'landscape', mobileIcon: 'distance', mobileSubtitle: 'UBICACIÓN Y SERVICIOS' },
    { id: 'video', label: 'Video', shortLabel: 'Video', icon: 'videocam', mobileIcon: 'play_circle', mobileSubtitle: 'CINEMATOGRÁFICO' },
  ];

  const visibleNavItems = navItems.filter((item) => isButtonVisible(item.id));

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen, isMobile]);

  // Sincronizar estado de React con eventos globales
  useEffect(() => {
    const syncActiveItemFromMapMode = (event?: Event) => {
      const mode =
        (event as CustomEvent<{ mode?: string }> | undefined)?.detail?.mode ??
        window.mapViewerMode;
      if (isLoginModalOpen || isUserInfoModalOpen) return;
      if (mode === "lotes") {
        setActiveItem(null);
        return;
      }
      if (["fotos", "areas", "entorno", "video"].includes(mode ?? "")) {
        setActiveItem(mode!);
      }
    };

    const handleSearchModalOpen = () => setActiveItem("lotes");

    const handleOpenLoginModal = () => {
      setIsLoginModalOpen(true);
      setActiveItem('usuario');
    };

    const handleReiniciarMenu = () => {
      if (isLoginModalOpen || isUserInfoModalOpen) return;
      setActiveItem(null);
    };

    window.addEventListener('mapViewerModeChanged', syncActiveItemFromMapMode);
    window.addEventListener('openLotSearchModal', handleSearchModalOpen);
    window.addEventListener('openLoginModal', handleOpenLoginModal);
    window.addEventListener('reiniciarMenu', handleReiniciarMenu);
    
    return () => {
      window.removeEventListener('mapViewerModeChanged', syncActiveItemFromMapMode);
      window.removeEventListener('openLotSearchModal', handleSearchModalOpen);
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
      window.removeEventListener('reiniciarMenu', handleReiniciarMenu);
    };
  }, [isLoginModalOpen, isUserInfoModalOpen]);

  // Manejar visibilidad del modal de usuario como estado activo
  useEffect(() => {
    if (isLoginModalOpen || isUserInfoModalOpen) {
      setActiveItem('usuario');
    } else if (activeItem === 'usuario') {
      setActiveItem(null);
    }
  }, [isLoginModalOpen, isUserInfoModalOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
    setActiveItem(null);
  };

  const handleLogout = () => {
    logout();
    setIsUserInfoModalOpen(false);
    setIsLoginModalOpen(true);
    setActiveItem('usuario');
  };

  const handleCloseUserInfoModal = () => {
    setIsUserInfoModalOpen(false);
    setActiveItem(null);
  };

  useEffect(() => {
    const hadUserBefore = previousUserRef.current !== null;
    const hasUserNow = user !== null;
    if (hadUserBefore && !hasUserNow && !isLoginModalOpen && !isUserInfoModalOpen) {
      setIsLoginModalOpen(true);
      setActiveItem('usuario');
    }
    previousUserRef.current = user;
  }, [user, isLoginModalOpen, isUserInfoModalOpen]);

  const handleItemClick = (itemId: string) => {
    if (itemId === 'usuario') {
      if (activeItem === 'usuario') {
        setActiveItem(null);
        setIsLoginModalOpen(false);
        setIsUserInfoModalOpen(false);
      } else {
        setActiveItem('usuario');
        if (user) {
          setIsUserInfoModalOpen(true);
        } else {
          setIsLoginModalOpen(true);
        }
      }
      if (isMobile) setIsMenuOpen(false);
      return;
    }

    const isCurrentlyActive = activeItem === itemId;

    if (isCurrentlyActive) {
      if (window.reiniciarMenu) window.reiniciarMenu();
      if (isMobile) setIsMenuOpen(false);
      return;
    }

    if (isMobile) setIsMenuOpen(false);

    switch (itemId) {
      case 'fotos': if (window.handleFotos) window.handleFotos(); break;
      case 'areas': if (window.handleAreasComunes) window.handleAreasComunes(); break;
      case 'lotes': if (window.handleLotes) window.handleLotes(); break;
      case 'entorno': if (window.handleEntorno) window.handleEntorno(); break;
      case 'video': if (window.handleVideo) window.handleVideo(); break;
    }
  };

  // Camera handlers
  const handleCamera = (action: string) => {
    switch (action) {
      case 'home': if (window.goHome) window.goHome(); break;
      case 'up': if (window.moveCameraUp) window.moveCameraUp(); break;
      case 'down': if (window.moveCameraDown) window.moveCameraDown(); break;
      case 'zoomIn': if (window.zoomIn) window.zoomIn(); break;
      case 'zoomOut': if (window.zoomOut) window.zoomOut(); break;
      case 'view3d': if (window.view3D) window.view3D(); break;
      case 'grid': if (window.toggleGrid) window.toggleGrid(); break;
    }
  };

  const navBtnClass = (id: string) =>
    `topbar-nav-btn${activeItem === id ? " topbar-nav-btn--active" : ""}`;

  // Icon fill for active
  const navIconStyle = (id: string) =>
    activeItem === id ? { fontVariationSettings: '"FILL" 1' } : {};

  return (
    <>
      {/* ============================================= */}
      {/* HORIZONTAL / DESKTOP LAYOUT                   */}
      {/* Exact copy from diseñoHorizontal/code.html    */}
      {/* ============================================= */}
      {!isMobile && (
        <>
          {/* Main Navigation Dock (TopAppBar) */}
          <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-container-padding px-container-padding py-2 hud-glass-panel hud-glass-glow-top rounded-full max-w-fit">
            {/* Logo */}
            <div className="flex items-center gap-unit border-r border-outline-variant pr-container-padding">
              <span className="material-symbols-outlined text-primary-container text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>domain</span>
              <div className="flex flex-col">
                <span className="font-display text-body-md font-extrabold text-on-surface tracking-tighter leading-tight">NAUTIA CONDOMINOS</span>
                <span className="font-label-caps text-[10px] text-primary-container uppercase tracking-widest"></span>
              </div>
            </div>
            {/* Navigation Buttons */}
            <nav className="flex items-center gap-element-gap">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  id={item.id}
                  className={navBtnClass(item.id)}
                  onClick={() => handleItemClick(item.id)}
                >
                  <span
                    className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform"
                    style={navIconStyle(item.id)}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-caps text-[9px] uppercase">{item.shortLabel}</span>
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  className={navBtnClass('vista')}
                  onClick={() => setIsAdminUiPanelOpen(true)}
                  title="Configurar botones visibles"
                >
                  <span className="material-symbols-outlined mb-1" style={navIconStyle('vista')}>tune</span>
                  <span className="font-label-caps text-[9px] uppercase">Vista</span>
                </button>
              )}
              <div className="w-px h-8 bg-outline-variant mx-2"></div>
              <button className={navBtnClass('usuario')} onClick={() => handleItemClick('usuario')}>
                <span className="material-symbols-outlined mb-1">account_circle</span>
                <span className="font-label-caps text-[9px] uppercase">Usuario</span>
              </button>
            </nav>
          </header>

          {/* Camera Controls Sidebar (Left Centered) */}
          <aside className="fixed left-floating-offset top-1/2 -translate-y-1/2 z-50 flex flex-col gap-unit">
            <div className="hud-glass-panel hud-glass-glow-top rounded-2xl p-2 flex flex-col gap-unit items-center">
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Reset View" onClick={() => handleCamera('home')}>
                <span className="material-symbols-outlined text-xl">home</span>
              </button>
              <div className="w-8 h-px bg-outline-variant/30 my-1"></div>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Up" onClick={() => handleCamera('up')}>
                <span className="material-symbols-outlined text-xl">keyboard_arrow_up</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Down" onClick={() => handleCamera('down')}>
                <span className="material-symbols-outlined text-xl">keyboard_arrow_down</span>
              </button>
              <div className="w-8 h-px bg-outline-variant/30 my-1"></div>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Zoom In" onClick={() => handleCamera('zoomIn')}>
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Zoom Out" onClick={() => handleCamera('zoomOut')}>
                <span className="material-symbols-outlined text-xl">remove</span>
              </button>
              <div className="w-8 h-px bg-outline-variant/30 my-1"></div>
              <button className="w-10 h-10 flex items-center justify-center bg-primary-container text-on-primary rounded-lg transition-all shadow-[0_0_15px_rgba(197,160,89,0.4)]" title="3D View" onClick={() => handleCamera('view3d')}>
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>3d_rotation</span>
              </button>
              <button id="grid" className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high rounded-lg transition-all" title="Grid" onClick={() => handleCamera('grid')}>
                <span className="material-symbols-outlined text-xl">grid_on</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ============================================= */}
      {/* VERTICAL / MOBILE LAYOUT                      */}
      {/* Exact copy from diseñoVertical/normal & menu  */}
      {/* ============================================= */}
      {isMobile && (
        <>
          {/* TopNavBar (from diseñoVertical/normal/code.html) */}
          <header className="fixed top-0 w-full z-[60] flex justify-between items-center px-6 py-4 bg-surface/60 dark:bg-surface-dim/60 backdrop-blur-xl border-b border-white/20 dark:border-outline/10 shadow-sm shadow-primary/5">
              <div className="font-h3 text-h3 font-bold text-primary dark:text-primary-fixed-dim tracking-tight">
              Nautia Condominios
            </div>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl hud-glass-panel hover:bg-white/10 transition-all duration-300"
              onClick={toggleMenu}
            >
              <span className="material-symbols-outlined text-primary">{isMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </header>

          {/* Floating Time Control (from diseñoVertical/normal/code.html) */}
          <div className="fixed top-24 right-6 z-50">
            <button className="w-12 h-12 flex items-center justify-center rounded-full hud-glass-panel hud-gold-edge shadow-xl shadow-black/40 text-primary">
              <span className="material-symbols-outlined">wb_sunny</span>
            </button>
          </div>
        </>
      )}

      {/* ============================================= */}
      {/* MOBILE MENU OVERLAY                           */}
      {/* Exact copy from diseñoVertical/menu desplegado */}
      {/* ============================================= */}
      {isMobile && isMenuOpen && (
        <div className="mobile-menu-overlay" role="dialog" aria-modal="true" aria-label="Menú principal">
          <header className="mobile-menu-header">
            <div className="font-h3 text-primary font-extrabold tracking-tight">Nautia Condominios</div>
            <button
              type="button"
              className="mobile-menu-close"
              onClick={toggleMenu}
              aria-label="Cerrar menú"
            >
              <span className="material-symbols-outlined text-primary font-bold">close</span>
            </button>
          </header>

          <nav className="mobile-menu-scroll">
            <div className="mobile-menu-list">
              {visibleNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  id={item.id}
                  className={`mobile-menu-item ${activeItem === item.id ? "active" : ""}`}
                  onClick={() => handleItemClick(item.id)}
                >
                  <div className="mobile-menu-item-icon">
                    <span className="material-symbols-outlined">
                      {item.mobileIcon || item.icon}
                    </span>
                  </div>
                  <div className="mobile-menu-item-text">
                    <span className="mobile-menu-item-title">{item.label}</span>
                    {item.mobileSubtitle && (
                      <span className="mobile-menu-item-subtitle">{item.mobileSubtitle}</span>
                    )}
                  </div>
                </button>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsAdminUiPanelOpen(true);
                  }}
                >
                  <div className="mobile-menu-item-icon mobile-menu-item-icon--admin">
                    <span className="material-symbols-outlined">tune</span>
                  </div>
                  <div className="mobile-menu-item-text">
                    <span className="mobile-menu-item-title">Configurar vista</span>
                    <span className="mobile-menu-item-subtitle">ADMINISTRADOR</span>
                  </div>
                </button>
              )}
              <button
                type="button"
                className="mobile-menu-item mobile-menu-item--user"
                onClick={() => handleItemClick("usuario")}
              >
                <div className="mobile-menu-item-icon mobile-menu-item-icon--user">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="mobile-menu-item-text">
                  <span className="mobile-menu-item-title mobile-menu-item-title--gold">
                    {user ? user.full_name : "Usuario"}
                  </span>
                  <span className="mobile-menu-item-subtitle">MI CUENTA</span>
                </div>
              </button>
            </div>
          </nav>

          <footer className="mobile-menu-footer">
            <button type="button" className="mobile-menu-brochure">
              <span className="material-symbols-outlined">download</span>
              Descargar Brochure
            </button>
          </footer>
        </div>
      )}


      <AdminUiPanel
        isOpen={isAdminUiPanelOpen}
        onClose={() => setIsAdminUiPanelOpen(false)}
      />

      {/* Modals */}
      <LoginModal isVisible={isLoginModalOpen} onClose={handleCloseLoginModal} />
      {user && (
        <UserInfoModal
          isVisible={isUserInfoModalOpen}
          user={user}
          onClose={handleCloseUserInfoModal}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default Sidebar;
