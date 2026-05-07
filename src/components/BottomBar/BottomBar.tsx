import { useState, useEffect } from 'react';

const BottomBar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Camera handlers for mobile bottom nav
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

  return (
    <>
      {/* ============================================= */}
      {/* HORIZONTAL / DESKTOP LAYOUT                   */}
      {/* Exact copy from diseñoHorizontal/code.html    */}
      {/* ============================================= */}
      {!isMobile && (
        <footer className="fixed bottom-floating-offset left-1/2 -translate-x-1/2 z-50">
          <div className="hud-glass-panel hud-glass-glow-top px-8 py-4 rounded-full flex items-center gap-8">
            <div className="flex items-center gap-unit group cursor-default">
              <span className="hud-status-dot bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
              <span className="text-on-surface text-[12px] font-label-caps uppercase tracking-wider group-hover:text-primary-container transition-colors">Disponible</span>
            </div>
            <div className="flex items-center gap-unit group cursor-default">
              <span className="hud-status-dot bg-[#FBBF24] shadow-[0_0_8px_rgba(251,191,36,0.5)]"></span>
              <span className="text-on-surface text-[12px] font-label-caps uppercase tracking-wider group-hover:text-primary-container transition-colors">Reservado</span>
            </div>
            <div className="flex items-center gap-unit group cursor-default">
              <span className="hud-status-dot bg-[#F87171] shadow-[0_0_8px_rgba(248,113,113,0.5)]"></span>
              <span className="text-on-surface text-[12px] font-label-caps uppercase tracking-wider group-hover:text-primary-container transition-colors">Vendido</span>
            </div>
            <div className="flex items-center gap-unit group cursor-default">
              <span className="hud-status-dot bg-[#60A5FA] shadow-[0_0_8px_rgba(96,165,250,0.5)]"></span>
              <span className="text-on-surface text-[12px] font-label-caps uppercase tracking-wider group-hover:text-primary-container transition-colors">En negociación</span>
            </div>
            <div className="h-6 w-px bg-outline-variant"></div>
            <div className="flex items-center gap-unit text-on-surface-variant">
              <span className="text-[10px] font-label-caps uppercase tracking-widest">Total Lotes</span>
              <span className="text-on-surface font-bold text-sm">142</span>
            </div>
          </div>
        </footer>
      )}

      {/* ============================================= */}
      {/* VERTICAL / MOBILE LAYOUT                      */}
      {/* Exact copy from diseñoVertical/normal/code.html */}
      {/* ============================================= */}
      {isMobile && (
        <>
          {/* Main Content Area - Legend */}
          <div className="fixed bottom-32 right-0 left-0 z-10 flex flex-col items-center pointer-events-none">
            {/* Legend Panel (Toggle) */}
            {showLegend && (
              <div className="px-6 mb-4 pointer-events-auto">
                <div className="hud-glass-panel hud-gold-edge p-4 rounded-2xl shadow-2xl space-y-3 max-w-[240px] mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="font-label-caps text-label-caps text-on-surface">Disponible</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                    <span className="font-label-caps text-label-caps text-on-surface">Reservado</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]"></div>
                    <span className="font-label-caps text-label-caps text-on-surface">Vendido</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                    <span className="font-label-caps text-label-caps text-on-surface">En negociación</span>
                  </div>
                </div>
              </div>
            )}
            {/* Legend Toggle Button */}
            <div className="flex justify-center w-full px-6 mb-6 pointer-events-auto">
              <button
                className="flex items-center gap-2 px-6 py-3 rounded-full hud-glass-panel hud-gold-edge shadow-xl text-primary font-label-caps text-label-caps"
                onClick={() => setShowLegend(!showLegend)}
              >
                <span className="material-symbols-outlined text-[20px]">info</span>
                Ver leyenda
              </button>
            </div>
          </div>


          {/* BottomNavBar (7 Camera Control Icons) - from diseñoVertical/normal/code.html */}
          <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 bg-surface-container/30 dark:bg-surface-container-highest/40 backdrop-blur-md border border-white/30 dark:border-outline/20 shadow-lg shadow-primary/10 rounded-full w-[90%] max-w-sm justify-between">
            {/* Home */}
            <button className="flex flex-col items-center justify-center bg-primary text-on-primary rounded-full w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('home')}>
              <span className="material-symbols-outlined text-[20px]">home</span>
            </button>
            {/* Up */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('up')}>
              <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
            </button>
            {/* Down */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('down')}>
              <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
            </button>
            {/* Zoom In */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('zoomIn')}>
              <span className="material-symbols-outlined text-[20px]">zoom_in</span>
            </button>
            {/* Zoom Out */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('zoomOut')}>
              <span className="material-symbols-outlined text-[20px]">zoom_out</span>
            </button>
            {/* 3D View */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('view3d')}>
              <span className="material-symbols-outlined text-[20px]">3d_rotation</span>
            </button>
            {/* Grid */}
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('grid')}>
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
          </nav>

          {/* UI Accent Glow (Background) */}
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-0"></div>
        </>
      )}
    </>
  );
};

export default BottomBar;
