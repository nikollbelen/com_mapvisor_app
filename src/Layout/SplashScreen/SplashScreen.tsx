import { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  onComplete?: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Ocultar splash screen después de 2 segundos
    const timer = setTimeout(() => {
      setIsFading(true);
      
      // Remover del DOM después de la animación
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.(); // Notificar que el splash screen terminó
      }, 800);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // No renderizar si no es visible
  if (!isVisible) return null;

  return (
    <div 
      className={`splash-screen ${isFading ? 'fade-out' : ''}`}
      id="splash-screen"
    >
      {/* Background Layers */}
      <div className="splash-background">
        <img 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQLq2KNIOGBOW_2qVm06paOBZAzMgPk3Z-gUuYz6vGTIS6i81XeEJEsZZKBDB44mfZQ3jiHM_MdPMddVzAEXZ-XocLbcK2TjqFMue59zehJO2M9IxJfReRRVMXcYV-VvDBTjqHNRTDKRHMGp3Pnz9atWV7B0GP0hIXBmo4HDsrbAyuW6LZB3G5cD1elGW3S0ewQ2qLEq1Nu-MVVfOEk4JpZhuSXG02P2S4T1pTB7N7zctSbv_nxyE6y0KURSZKBf4a2kyBQEzGZEI" 
          alt="Background" 
          className="splash-bg-img"
        />
        <div className="splash-overlay"></div>
        <div className="noise-texture"></div>
      </div>

      {/* HORIZONTAL DESIGN (Desktop/Landscape) */}
      <div className="splash-content-wrapper horizontal-only">
        <div className="branding">
          <h1 className="splash-title">Lomas de Jesús</h1>
          <p className="splash-subtitle">Luxury Retreat</p>
        </div>

        <div className="loading-indicator">
          <div className="spinner-container">
            <div className="spinner-track"></div>
            <div className="spinner-thumb"></div>
          </div>
          <div className="progress-line">
            <div className="loading-bar-fill"></div>
          </div>
          <span className="loading-text">Cargando Experiencia 3D</span>
        </div>
      </div>

      {/* VERTICAL DESIGN (Mobile/Portrait) */}
      <div className="splash-main-vertical vertical-only">
        <div className="top-content">
          <span className="material-symbols-outlined top-icon">landscape</span>
          <h1 className="splash-title-v">LOMAS DE JESÚS</h1>
          <p className="splash-subtitle-v">LUXURY RETREAT</p>
        </div>

        <div className="center-element">
          <div className="center-blur"></div>
          <div className="center-ring"></div>
          <span className="material-symbols-outlined center-icon">architecture</span>
        </div>

        <div className="bottom-content">
          <div className="progress-bar-v">
            <div className="progress-bar-fill-v"></div>
          </div>
          <span className="loading-text-v">INICIALIZANDO EXPERIENCIA 3D...</span>
        </div>
      </div>

      {/* UI Overlay (Horizontal) */}
      <div className="ui-overlay horizontal-only">
        <span className="material-symbols-outlined text-gold text-[16px]">architecture</span>
        <span className="material-symbols-outlined text-gold text-[16px]">vrpano</span>
        <span className="material-symbols-outlined text-gold text-[16px]">landscape</span>
      </div>
    </div>
  );
};

export default SplashScreen;
