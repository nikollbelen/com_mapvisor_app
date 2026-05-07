import { useState, useEffect } from 'react';
import './Instructions.css';

interface InstructionsProps {
  onClose?: () => void;
}

const Instructions = ({ onClose }: InstructionsProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleClose = () => {
    setIsFading(true);
    // Remover del DOM después de la animación
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 500);
  };

  if (!isVisible) return null;

  return (
    <div className={`instructions-main-overlay ${isFading ? 'instructions-fade-out' : ''}`}>
      {!isMobile ? (
        /* ============================================= */
        /* DESKTOP LAYOUT (diseñoHorizontal/code.html)   */
        /* ============================================= */
        <main className="z-40 flex items-center justify-center p-floating-offset w-full h-full">
          <div className="instructions-glass-panel w-full max-w-4xl p-container-padding rounded-xl flex flex-col items-center text-center bg-surface-container">
            <header className="mb-12">
              <h1 className="font-h1 text-h1 text-on-surface mb-2 tracking-tight">¿Cómo navegar?</h1>
              <p className="font-body-lg text-on-surface-variant max-w-lg">Domina la experiencia 3D de Lomas de Jesús con estos controles sencillos e intuitivos.</p>
            </header>
            {/* Cards Container */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-element-gap w-full mb-12">
              {/* Card 1: Rotate */}
              <div className="instructions-card group p-6 rounded-lg bg-surface-container-low/40 border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>mouse</span>
                </div>
                <h3 className="font-h3 text-h3 text-on-surface mb-3">Clic izquierdo + arrastre</h3>
                <p className="font-body-md text-on-surface-variant">Rotar la vista para explorar el proyecto desde cualquier ángulo.</p>
              </div>
              {/* Card 2: Zoom */}
              <div className="instructions-card group p-6 rounded-lg bg-surface-container-low/40 border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-4xl">stat_minus_1</span>
                </div>
                <h3 className="font-h3 text-h3 text-on-surface mb-3">Scroll / Rueda</h3>
                <p className="font-body-md text-on-surface-variant">Acercar y alejar para ver detalles finos o la vista panorámica.</p>
              </div>
              {/* Card 3: Pan */}
              <div className="instructions-card group p-6 rounded-lg bg-surface-container-low/40 border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-secondary-container/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-primary text-4xl">ads_click</span>
                </div>
                <h3 className="font-h3 text-h3 text-on-surface mb-3">Clic derecho + arrastre</h3>
                <p className="font-body-md text-on-surface-variant">Desplazar la cámara lateralmente para navegar por el terreno.</p>
              </div>
            </div>
            {/* Action Button */}
            <button 
              id="instructions-close-button"
              className="instructions-gradient-gold text-on-primary-container font-h3 px-12 py-4 rounded-full instructions-gold-glow hover:opacity-90 active:scale-95 transition-all"
              onClick={handleClose}
            >
              Entendido
            </button>
          </div>
        </main>
      ) : (
        /* ============================================= */
        /* MOBILE LAYOUT (diseñoVertical/code.html)     */
        /* ============================================= */
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-container-padding w-full h-full">
          <div className="instructions-glass-panel instructions-inner-glow rounded-xl p-8 w-full max-w-sm shadow-2xl space-y-10 bg-surface-container/90">
            {/* Header Section */}
            <div className="text-center space-y-2">
              <h1 className="font-h1 text-h1 text-primary">¿Cómo navegar?</h1>
              <p className="font-body-md text-on-surface-variant">Explora cada rincón de Lomas de Jesús con total fluidez.</p>
            </div>
            {/* Gesture Grid (2x2) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Gesture Card 1 */}
              <div className="bg-surface-container-low/40 rounded-lg p-4 flex flex-col items-center text-center space-y-3 border border-outline-variant/20 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">swipe</span>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-primary mb-1 text-[10px]">1 DEDO + ARRASTRE</p>
                  <p className="font-h3 text-body-md text-on-surface">Rotar</p>
                </div>
              </div>
              {/* Gesture Card 2 */}
              <div className="bg-surface-container-low/40 rounded-lg p-4 flex flex-col items-center text-center space-y-3 border border-outline-variant/20 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">pinch</span>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-primary mb-1 text-[10px]">PELLIZCAR</p>
                  <p className="font-h3 text-body-md text-on-surface">Zoom</p>
                </div>
              </div>
              {/* Gesture Card 3 */}
              <div className="bg-surface-container-low/40 rounded-lg p-4 flex flex-col items-center text-center space-y-3 border border-outline-variant/20 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">pan_tool</span>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-primary mb-1 text-[10px]">2 DEDOS + ARRASTRE</p>
                  <p className="font-h3 text-body-md text-on-surface">Desplazar</p>
                </div>
              </div>
              {/* Gesture Card 4 */}
              <div className="bg-surface-container-low/40 rounded-lg p-4 flex flex-col items-center text-center space-y-3 border border-outline-variant/20 hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary-container/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">ads_click</span>
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-primary mb-1 text-[10px]">DOBLE TAP</p>
                  <p className="font-h3 text-body-md text-on-surface">Centrar vista</p>
                </div>
              </div>
            </div>
            {/* Action Button */}
            <button 
              id="instructions-close-button"
              className="w-full instructions-gold-gradient-bg py-4 rounded-full shadow-[0_10px_20px_-5px_rgba(197,160,89,0.5)] active:scale-95 transition-all"
              onClick={handleClose}
            >
              <span className="font-label-caps text-label-caps text-on-primary">ENTENDIDO</span>
            </button>

          </div>
        </main>
      )}
    </div>
  );
};

export default Instructions;
