import { useState, useEffect } from 'react';
import './AreasModal.css';

interface AreasModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  areasData?: any;
}

const AreasModal = ({ isVisible = false, onClose, areasData }: AreasModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Detectar si es móvil o tablet
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  const handleClose = () => {
    setIsHidden(false);
    onClose?.();
  };

  const handleShow = () => {
    setIsHidden(false);
  };

  useEffect(() => {
    if (!isVisible) {
      setIsHidden(false);
    }
  }, [isVisible]);

  const handleViewImage = (imageUrl: string) => {
    if (window.openAreasComunesImage) {
      window.openAreasComunesImage(imageUrl);
    }
  };

  const handleViewOnMap = (fid: number) => {
    if (window.flyToAreaComun) {
      window.flyToAreaComun(fid);
      if (isMobile) {
        setTimeout(() => {
          setIsHidden(true);
        }, 1000);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Botón para reabrir el modal en móviles cuando está oculto */}
      {isMobile && isHidden && (
        <button 
          className="reopen-areas-modal-btn hud-glass-panel hud-gold-edge shadow-2xl"
          onClick={handleShow}
          title="Reabrir áreas comunes"
        >
          <span className="material-symbols-outlined text-primary">park</span>
        </button>
      )}

      {/* Modal principal */}
      {!isHidden && (
        <div className={`common-areas-modal hud-glass-panel hud-gold-edge ${isMobile ? 'mobile-modal' : ''}`} id="commonAreasModalOverlay">
          <button className="areas-close-btn" id="closeCommonAreasModal" onClick={handleClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
      
      <div className="common-areas-modal-header">
        <div className="common-areas-modal-title">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
          <span className="font-h3 text-h3 text-on-surface">Comunidad</span>
        </div>
      </div>
      
      <div className={`common-areas-modal-content ${isMobile ? 'mobile-modal-content' : ''}`}>
        <div className="common-areas-section">
          <div className={`common-areas-grid ${isMobile ? 'mobile-grid' : ''}`} id="commonAreasGrid">
            {areasData && areasData.features ? (
              areasData.features.map((feature: any) => {
                const { fid, name, image } = feature.properties;

                return (
                  <div key={fid} className={`areas-card hud-glass-panel border-white/5 ${isMobile ? 'mobile-card' : ''}`} data-marker={`area_comun_${fid}`}>
                    <div 
                      className="areas-card-image" 
                      style={{ backgroundImage: `url('${image}')` }}
                    />
                    <div className="areas-card-content">
                      <div className="areas-card-title">{name}</div>
                      <div className="areas-card-buttons">
                        <button 
                          className="areas-btn-secondary" 
                          onClick={() => handleViewImage(image)}
                        >
                          <span className="material-symbols-outlined text-[18px]">image</span>
                          <span>Imágenes</span>
                        </button>
                        <button 
                          className="areas-btn-primary" 
                          onClick={() => handleViewOnMap(fid)}
                        >
                          <span className="material-symbols-outlined text-[18px]">near_me</span>
                          <span>Ver mapa</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-data-text">No hay áreas comunes disponibles</div>
            )}
          </div>
        </div>
      </div>
    </div>
      )}
    </>
  );
};

export default AreasModal;
