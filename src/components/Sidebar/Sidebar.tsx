import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginModal from '../Modals/LoginModal/LoginModal';
import UserInfoModal from '../Modals/UserInfoModal/UserInfoModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const previousUserRef = useRef(user);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Sincronizar estado de React con eventos globales
  useEffect(() => {
    const handleClearState = () => {
      if (!isLoginModalOpen && !isUserInfoModalOpen) {
        setActiveItem(null);
      }
    };

    const handleSearchModalOpen = () => setActiveItem('lotes');

    window.addEventListener('clearAllModals', handleClearState);
    window.addEventListener('reiniciarMenu', handleClearState);
    window.addEventListener('openLotSearchModal', handleSearchModalOpen);
    
    return () => {
      window.removeEventListener('clearAllModals', handleClearState);
      window.removeEventListener('reiniciarMenu', handleClearState);
      window.removeEventListener('openLotSearchModal', handleSearchModalOpen);
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
      setActiveItem(null);
      if (window.reiniciarMenu) window.reiniciarMenu();
      if (isMobile) setIsMenuOpen(false);
      return;
    }

    setActiveItem(itemId);
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

  // Active button class helper for horizontal top nav
  const navBtnClass = (id: string) =>
    activeItem === id
      ? "flex flex-col items-center justify-center w-20 h-16 rounded-xl text-primary bg-surface-container-highest/60 border border-primary/40 group hud-gold-glow transition-all duration-300 scale-105"
      : "flex flex-col items-center justify-center w-20 h-16 rounded-xl text-on-surface-variant hover:text-primary-container hover:bg-surface-container-high transition-all duration-300";

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
                <span className="font-display text-body-md font-extrabold text-on-surface tracking-tighter leading-tight">LOMAS DE JESÚS</span>
                <span className="font-label-caps text-[10px] text-primary-container uppercase tracking-widest"></span>
              </div>
            </div>
            {/* Navigation Buttons */}
            <nav className="flex items-center gap-element-gap">
              <button id="fotos" className={navBtnClass('fotos')} onClick={() => handleItemClick('fotos')}>
                <span className="material-symbols-outlined mb-1 group-hover:scale-110 transition-transform" style={navIconStyle('fotos')}>360</span>
                <span className="font-label-caps text-[9px] uppercase">Fotos 360</span>
              </button>
              <button id="areas" className={navBtnClass('areas')} onClick={() => handleItemClick('areas')}>
                <span className="material-symbols-outlined mb-1" style={navIconStyle('areas')}>park</span>
                <span className="font-label-caps text-[9px] uppercase">Áreas Comunes</span>
              </button>
              <button id="lotes" className={navBtnClass('lotes')} onClick={() => handleItemClick('lotes')}>
                <span className="material-symbols-outlined mb-1" style={navIconStyle('lotes')}>grid_view</span>
                <span className="font-label-caps text-[9px] uppercase">Lotes</span>
              </button>
              <button id="entorno" className={navBtnClass('entorno')} onClick={() => handleItemClick('entorno')}>
                <span className="material-symbols-outlined mb-1" style={navIconStyle('entorno')}>landscape</span>
                <span className="font-label-caps text-[9px] uppercase">Entorno</span>
              </button>
              <button id="video" className={navBtnClass('video')} onClick={() => handleItemClick('video')}>
                <span className="material-symbols-outlined mb-1" style={navIconStyle('video')}>videocam</span>
                <span className="font-label-caps text-[9px] uppercase">Video</span>
              </button>
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
              Lomas de Jesús
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
        <div className="fixed inset-0 z-[80] bg-surface-container-lowest/80 backdrop-blur-2xl flex flex-col pt-24 px-6 pb-12">
          {/* Header in Overlay */}
          <div className="absolute top-0 left-0 w-full flex justify-between items-center px-6 py-4">
            <div className="font-h3 text-primary font-extrabold tracking-tight">Lomas de Jesús</div>
            <button
              className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-container-high hud-gold-border shadow-lg active:scale-90 transition-transform"
              onClick={toggleMenu}
            >
              <span className="material-symbols-outlined text-primary font-bold">close</span>
            </button>
          </div>
          {/* Navigation Menu Items */}
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {/* 1. Fotos 360° */}
            <a id="fotos" className={`group flex items-center gap-5 p-5 rounded-2xl transition-all hover:bg-white/10 hover:translate-x-2 ${activeItem === 'fotos' ? 'bg-white/10 hud-gold-border' : 'bg-white/5 hud-gold-border'}`} onClick={() => handleItemClick('fotos')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">360</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-on-surface">Fotos 360°</span>
                <span className="font-label-caps text-on-surface-variant text-[10px]">RECORRIDO VIRTUAL</span>
              </div>
            </a>
            {/* 2. Áreas comunes */}
            <a id="areas" className={`group flex items-center gap-5 p-5 rounded-2xl transition-all hover:bg-white/10 hover:translate-x-2 ${activeItem === 'areas' ? 'bg-white/10 border border-primary/20' : 'bg-white/5 border border-white/10'}`} onClick={() => handleItemClick('areas')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">pool</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-on-surface">Áreas comunes</span>
                <span className="font-label-caps text-on-surface-variant text-[10px]">AMENIDADES PREMIUM</span>
              </div>
            </a>
            {/* 3. Lotes */}
            <a id="lotes" className={`group flex items-center gap-5 p-5 rounded-2xl transition-all hover:bg-white/10 hover:translate-x-2 ${activeItem === 'lotes' ? 'bg-white/10 border border-primary/20' : 'bg-white/5 border border-white/10'}`} onClick={() => handleItemClick('lotes')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">grid_view</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-on-surface">Lotes</span>
                <span className="font-label-caps text-on-surface-variant text-[10px]">DISPONIBILIDAD</span>
              </div>
            </a>
            {/* 4. Entorno */}
            <a id="entorno" className={`group flex items-center gap-5 p-5 rounded-2xl transition-all hover:bg-white/10 hover:translate-x-2 ${activeItem === 'entorno' ? 'bg-white/10 border border-primary/20' : 'bg-white/5 border border-white/10'}`} onClick={() => handleItemClick('entorno')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">distance</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-on-surface">Entorno</span>
                <span className="font-label-caps text-on-surface-variant text-[10px]">UBICACIÓN Y SERVICIOS</span>
              </div>
            </a>
            {/* 5. Video */}
            <a id="video" className={`group flex items-center gap-5 p-5 rounded-2xl transition-all hover:bg-white/10 hover:translate-x-2 ${activeItem === 'video' ? 'bg-white/10 border border-primary/20' : 'bg-white/5 border border-white/10'}`} onClick={() => handleItemClick('video')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary/10 text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">play_circle</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-on-surface">Video</span>
                <span className="font-label-caps text-on-surface-variant text-[10px]">CINEMATOGRÁFICO</span>
              </div>
            </a>
            {/* 6. Usuario */}
            <a className="group flex items-center gap-5 p-5 rounded-2xl bg-primary-container/20 hud-gold-border transition-all hover:bg-primary-container/30 hover:translate-x-2" onClick={() => handleItemClick('usuario')}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary text-on-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[28px]">person</span>
              </div>
              <div className="flex flex-col">
                <span className="font-h3 text-primary">{user ? user.full_name : 'Usuario'}</span>
                <span className="font-label-caps text-primary/70 text-[10px]">MI CUENTA</span>
              </div>
            </a>
          </div>
          {/* Footer CTA in Overlay */}
          <div className="mt-8">
            <button className="w-full py-5 rounded-2xl hud-gold-gradient-bg text-on-primary font-bold text-lg shadow-2xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all">
              <span className="material-symbols-outlined">download</span>
              Descargar Brochure
            </button>
          </div>
        </div>
      )}


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
