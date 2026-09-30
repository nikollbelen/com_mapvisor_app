import { useState, useEffect } from 'react';
import { LOT_STATUS_LEGEND_ITEMS, LOT_STATUS_COLORS } from '../../constants/lotStatusColors';
import type { LotStatusKey } from '../../constants/lotStatusColors';
import './BottomBar.css';

interface BottomBarProps {
  entornoReopenVisible?: boolean;
  onEntornoReopen?: () => void;
}

type LotCounts = Record<LotStatusKey, number>;

const ALL_STATUS_KEYS = LOT_STATUS_LEGEND_ITEMS.map((i) => i.key);

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

  // Filtros activos: cuando grid está on → todos activos por defecto
  const [activeFilters, setActiveFilters] = useState<Set<LotStatusKey>>(
    new Set(ALL_STATUS_KEYS)
  );

  // Contadores de lotes por estado
  const [lotCounts, setLotCounts] = useState<LotCounts>({
    disponible: 0,
    reservado: 0,
    vendido: 0,
    negociacion: 0,
  });

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
      const isActive = e.detail.active as boolean;
      setGridActive(isActive);
      if (isActive) {
        // Cuadrícula activada → todos los filtros activos y sin filtro en Cesium
        const allSet = new Set<LotStatusKey>(ALL_STATUS_KEYS);
        setActiveFilters(allSet);
        if (window.filterLotsByStatus) {
          window.filterLotsByStatus(ALL_STATUS_KEYS);
        }
      } else {
        // Cuadrícula desactivada → todos los filtros inactivos
        setActiveFilters(new Set());
      }
    };
    window.addEventListener('gridStateChanged', handleGridStateChanged as EventListener);
    return () => window.removeEventListener('gridStateChanged', handleGridStateChanged as EventListener);
  }, []);

  // Escuchar actualizaciones de conteo de lotes desde Cesium
  useEffect(() => {
    const handleLotCountsUpdated = (e: CustomEvent) => {
      setLotCounts(e.detail as LotCounts);
    };
    window.addEventListener('lotCountsUpdated', handleLotCountsUpdated as EventListener);

    // Intentar obtener conteos iniciales si Cesium ya cargó
    const tryGetCounts = () => {
      if (window.getLotCountsByStatus) {
        setLotCounts(window.getLotCountsByStatus() as LotCounts);
      }
    };
    tryGetCounts();
    const timer = setTimeout(tryGetCounts, 3000);

    return () => {
      window.removeEventListener('lotCountsUpdated', handleLotCountsUpdated as EventListener);
      clearTimeout(timer);
    };
  }, []);

  // -------------------------------------------------------
  // Handler de filtro de leyenda (multi-selección)
  // -------------------------------------------------------
  const handleLegendFilter = (key: LotStatusKey) => {
    if (!gridActive) return; // Sin cuadrícula no hay nada que filtrar

    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Evitar que queden todos desactivados (mínimo 1 activo)
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }

      // Llamar a Cesium para aplicar el filtro visual
      if (window.filterLotsByStatus) {
        window.filterLotsByStatus(Array.from(next));
      }
      return next;
    });
  };

  // -------------------------------------------------------
  // Handlers de cámara
  // -------------------------------------------------------
  const MOVE_DELAY_MS = 1600;

  const moveOrReset = (action: () => void) => {
    if (view3dActive) {
      setView3dActive(false);
      if (window.goHome) window.goHome();
      setTimeout(action, MOVE_DELAY_MS);
    } else {
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
        if (window.toggleGrid) {
          const newState = window.toggleGrid();
          if (typeof newState === 'boolean') setGridActive(newState);
          else setGridActive(prev => !prev);
        } else {
          setGridActive(prev => !prev);
        }
        break;
      }
    }
  };

  // -------------------------------------------------------
  // Render helper: botón de leyenda (desktop)
  // -------------------------------------------------------
  const renderLegendButton = (item: typeof LOT_STATUS_LEGEND_ITEMS[number], mobile = false) => {
    const { key, label } = item;
    const { hex, glowRgba } = LOT_STATUS_COLORS[key];
    const isActive = gridActive && activeFilters.has(key);
    const isDisabled = !gridActive;
    const count = lotCounts[key];

    return (
      <button
        key={key}
        type="button"
        className={[
          'legend-filter-btn',
          mobile ? 'legend-filter-btn--mobile' : '',
          isActive ? 'legend-filter-btn--active' : 'legend-filter-btn--inactive',
          isDisabled ? 'legend-filter-btn--disabled' : '',
        ].join(' ')}
        onClick={() => handleLegendFilter(key)}
        title={
          isDisabled
            ? 'Activa la cuadrícula para filtrar'
            : `${isActive ? 'Ocultar' : 'Mostrar'} lotes ${label.toLowerCase()}`
        }
        aria-pressed={isActive}
        style={
          isActive
            ? ({ '--legend-color': hex, '--legend-glow': glowRgba } as React.CSSProperties)
            : undefined
        }
      >
        {/* Dot de color */}
        <span
          className="legend-filter-dot"
          style={{
            backgroundColor: isActive ? hex : 'rgba(255,255,255,0.2)',
            boxShadow: isActive ? `0 0 7px 1px ${glowRgba}` : 'none',
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          }}
        />
        {/* Label */}
        <span className="legend-filter-label">{label}</span>
        {/* Contador de lotes */}
        {count > 0 && (
          <span
            className="legend-filter-count"
            style={{
              color: isActive ? hex : 'rgba(255,255,255,0.3)',
              transition: 'color 0.2s ease',
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };


  return (
    <>
      {/* ============================================= */}
      {/* HORIZONTAL / DESKTOP LAYOUT                   */}
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

          {/* Legend Bar — Botones de filtro interactivos */}
          <div className="hud-glass-panel hud-glass-glow-top px-5 py-3 rounded-full flex items-center gap-1">
            {LOT_STATUS_LEGEND_ITEMS.map((item) => renderLegendButton(item))}
            <div className="h-6 w-px bg-outline-variant/40 mx-2" />
            {/* Total de lotes */}
            <div className="flex items-center gap-unit text-on-surface-variant px-1">
              <span className="text-[10px] font-label-caps uppercase tracking-widest">Total</span>
              <span className="text-on-surface font-bold text-sm">
                {Object.values(lotCounts).reduce((a, b) => a + b, 0) || '—'}
              </span>
            </div>
          </div>
        </footer>
      )}

      {/* ============================================= */}
      {/* VERTICAL / MOBILE LAYOUT                      */}
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

          <div className="fixed bottom-24 right-0 left-0 z-10 flex flex-col items-center pointer-events-none">
            {showLegend && (
              <div className="px-6 mb-4 pointer-events-auto">
                <div className="hud-glass-panel hud-gold-edge p-4 rounded-2xl shadow-2xl space-y-2 max-w-[260px] mx-auto">
                  {LOT_STATUS_LEGEND_ITEMS.map((item) => renderLegendButton(item, true))}
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
            <button className="flex flex-col items-center justify-center text-on-surface-variant w-10 h-10 hover:scale-110 transition-transform" onClick={() => handleCamera('home')}>
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
            <button 
              className={`flex flex-col items-center justify-center w-10 h-10 hover:scale-110 transition-transform ${view3dActive ? 'text-primary' : 'text-on-surface-variant'}`} 
              onClick={() => handleCamera('view3d')}
            >
              <span className="material-symbols-outlined text-[20px]" style={view3dActive ? { fontVariationSettings: '"FILL" 1' } : {}}>3d_rotation</span>
            </button>
            {/* Grid — id="grid" requerido por cesium-init (toggleGrid / selección colorida) */}
            <button
              id="grid"
              className={`flex flex-col items-center justify-center w-10 h-10 hover:scale-110 transition-transform ${gridActive ? 'text-primary' : 'text-on-surface-variant'}`}
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