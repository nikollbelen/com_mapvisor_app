import { useState, useEffect } from 'react';
import { LOT_STATUS_LEGEND_ITEMS, LOT_STATUS_COLORS } from '../../constants/lotStatusColors';
import './BottomBar.css';

interface BottomBarProps {
  entornoReopenVisible?: boolean;
  onEntornoReopen?: () => void;
}

const BottomBar = ({
  entornoReopenVisible = false,
  onEntornoReopen,
}: BottomBarProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  // Grid empieza ACTIVO (cuadrícula visible al cargar el visor)
  const [gridActive, setGridActive] = useState(true);
  // 3D empieza INACTIVO (no enfocado hasta que el usuario lo presione)
  const [view3dActive, setView3dActive] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Sincronizar gridActive con Cesium cuando éste reinicia el estado (ej. setupLoteInteractions)
  useEffect(() => {
    const handleGridStateChanged = (e: CustomEvent) => {
      setGridActive(e.detail.active);
    };
    window.addEventListener('gridStateChanged', handleGridStateChanged as EventListener);
    return () => window.removeEventListener('gridStateChanged', handleGridStateChanged as EventListener);
  }, []);

  // -------------------------------------------------------
  // Handlers de cámara
  // -------------------------------------------------------
  // moveOrReset(action):
  //   - Si 3D está ACTIVO: va a home, desactiva 3D y luego
  //     ejecuta el movimiento (espera la animación de flyTo).
  //   - Si 3D NO está activo: ejecuta el movimiento directo.
  // -------------------------------------------------------

  const MOVE_DELAY_MS = 1600; // igual a la duración de flyToLotesView (1.5s) + buffer

  const moveOrReset = (action: () => void) => {
    if (view3dActive) {
      // 3D está encendido: primero regresar a home, apagar 3D, luego mover
      setView3dActive(false);
      if (window.goHome) window.goHome();
      setTimeout(action, MOVE_DELAY_MS);
    } else {
      // 3D apagado: ejecutar directamente sin espera
      action();
    }
  };

  const handleCamera = (action: string) => {
    switch (action) {
      case 'home':
        setView3dActive(false);
        if (window.goHome) window.goHome();
        break;
      case 'up':
        moveOrReset(() => { if (window.moveCameraUp) window.moveCameraUp(); });
        break;
      case 'down':
        moveOrReset(() => { if (window.moveCameraDown) window.moveCameraDown(); });
        break;
      case 'zoomIn':
        moveOrReset(() => { if (window.zoomIn) window.zoomIn(); });
        break;
      case 'zoomOut':
        moveOrReset(() => { if (window.zoomOut) window.zoomOut(); });
        break;
      case 'view3d': {
        const turningOn = !view3dActive;
        setView3dActive(turningOn);
        if (turningOn) {
          if (window.view3D) window.view3D();
        } else {
          if (window.goHome) window.goHome();
        }
        break;
      }
      case 'grid': {
        // Usar el valor de retorno de toggleGrid() como fuente de verdad
        // para evitar desincronización entre el estado JS y el estado React
        if (window.toggleGrid) {
          const newState = window.toggleGrid();
          if (typeof newState === 'boolean') setGridActive(newState);
          else setGridActive(prev => !prev); // fallback
        } else {
          setGridActive(prev => !prev);
        }
        break;
      }
    }
  };


  return (
    <>
      {/* ============================================= */}
      {/* HORIZONTAL / DESKTOP LAYOUT                   */}
      {/* Exact copy from diseñoHorizontal/code.html    */}
      {/* ============================================= */}
      {!isMobile && (
        <footer className="fixed bottom-floating-offset left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
          {/* Camera Controls Row — Desktop */}
          <div className="hud-glass-panel hud-glass-glow-top px-4 py-2 rounded-full flex items-center gap-1">
            {/* Home / Reset */}
            <div className="cam-tooltip-wrapper">
              <button
                className="cam-ctrl-btn"
                onClick={() => handleCamera('home')}
                aria-label="Vista inicial"
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
              </button>
              <span className="cam-tooltip">Vista inicial</span>
            </div>
            <div className="h-5 w-px bg-outline-variant/40 mx-1" />
            {/* Up */}
            <div className="cam-tooltip-wrapper">
              <button
                className="cam-ctrl-btn"
                onClick={() => handleCamera('up')}
                aria-label="Mover cámara arriba"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
              </button>
              <span className="cam-tooltip">Mover cámara arriba</span>
            </div>
            {/* Down */}
            <div className="cam-tooltip-wrapper">
              <button
                className="cam-ctrl-btn"
                onClick={() => handleCamera('down')}
                aria-label="Mover cámara abajo"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
              </button>
              <span className="cam-tooltip">Mover cámara abajo</span>
            </div>
            <div className="h-5 w-px bg-outline-variant/40 mx-1" />
            {/* Zoom In */}
            <div className="cam-tooltip-wrapper">
              <button
                className="cam-ctrl-btn"
                onClick={() => handleCamera('zoomIn')}
                aria-label="Acercar"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <span className="cam-tooltip">Acercar</span>
            </div>
            {/* Zoom Out */}
            <div className="cam-tooltip-wrapper">
              <button
                className="cam-ctrl-btn"
                onClick={() => handleCamera('zoomOut')}
                aria-label="Alejar"
              >
                <span className="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <span className="cam-tooltip">Alejar</span>
            </div>
            <div className="h-5 w-px bg-outline-variant/40 mx-1" />
            {/* 3D View — inactivo al cargar; activa view3D() o regresa a home */}
            <div className="cam-tooltip-wrapper">
              <button
                className={`cam-ctrl-btn${view3dActive ? ' cam-ctrl-btn--accent' : ''}`}
                onClick={() => handleCamera('view3d')}
                aria-label="Vista 3D"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: '"FILL" 1' }}>3d_rotation</span>
              </button>
              <span className="cam-tooltip">Vista 3D</span>
            </div>
            {/* Grid — activo al cargar, tooltip dinámico */}
            <div className="cam-tooltip-wrapper">
              <button
                id="grid"
                className={`cam-ctrl-btn${gridActive ? ' cam-ctrl-btn--accent' : ''}`}
                onClick={() => handleCamera('grid')}
                aria-label={gridActive ? 'Desactivar cuadrícula' : 'Activar cuadrícula'}
              >
                <span className="material-symbols-outlined text-[18px]">grid_on</span>
              </button>
              <span className="cam-tooltip">{gridActive ? 'Desactivar cuadrícula' : 'Activar cuadrícula'}</span>
            </div>
          </div>

          {/* Legend Bar */}
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
              <span className="text-on-surface font-bold text-sm">7</span>
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
          {entornoReopenVisible && (
            <button
              type="button"
              className="bottom-entorno-reopen-fab hud-glass-panel hud-gold-edge shadow-2xl"
              onClick={onEntornoReopen}
              title="Reabrir entorno"
              aria-label="Reabrir entorno"
            >
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                location_on
              </span>
            </button>
          )}

          <div className="fixed bottom-32 right-0 left-0 z-10 flex flex-col items-center pointer-events-none">
            {showLegend && (
              <div className="px-6 mb-4 pointer-events-auto">
                <div className="hud-glass-panel hud-gold-edge p-4 rounded-2xl shadow-2xl space-y-3 max-w-[240px] mx-auto">
                  {LOT_STATUS_LEGEND_ITEMS.map(({ key, label }) => {
                    const { hex, glowRgba } = LOT_STATUS_COLORS[key];
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: hex,
                            boxShadow: `0 0 8px ${glowRgba}`,
                          }}
                        />
                        <span className="font-label-caps text-label-caps text-on-surface">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-center w-full px-6 mb-6 pointer-events-auto">
              <button
                type="button"
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
            {/* Grid — id="grid" requerido por cesium-init (toggleGrid / selección colorida) */}
            <button
              id="grid"
              className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform [&.active]:text-primary"
              onClick={() => handleCamera('grid')}
            >
              <span className="material-symbols-outlined text-[20px]">grid_on</span>
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
