import { useState, useEffect } from 'react';
import '../shared/HudPanelModal.css';
import './AreasModal.css';

interface AreasModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  areasData?: any;
}

const AreasModal = ({ isVisible = false, onClose, areasData }: AreasModalProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setIsMinimized(false);
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsMinimized(false);
    onClose?.();
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleRestore = () => {
    setIsMinimized(false);
  };

  const handleViewImage = (imageUrl: string) => {
    if (window.openAreasComunesImage) {
      window.openAreasComunesImage(imageUrl);
    }
  };

  const handleViewOnMap = (fid: number) => {
    if (window.flyToAreaComun) {
      window.flyToAreaComun(fid);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {isMobile && isMinimized && (
        <button
          type="button"
          className="hud-panel-reopen-btn hud-glass-panel hud-gold-edge shadow-2xl"
          onClick={handleRestore}
          title="Reabrir áreas comunes"
          aria-label="Reabrir áreas comunes"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            park
          </span>
        </button>
      )}

      {!isMinimized && (
        <div className="hud-panel-overlay show" id="commonAreasModalOverlay">
          <div className="hud-panel-modal hud-glass-panel hud-gold-edge">
            <div className="hud-panel-body">
              <div className="hud-panel-actions">
                {isMobile && (
                  <button
                    type="button"
                    className="hud-panel-minimize"
                    onClick={handleMinimize}
                    title="Minimizar"
                    aria-label="Minimizar"
                  >
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                )}
                <button
                  type="button"
                  className="hud-panel-close"
                  id="closeCommonAreasModal"
                  onClick={handleClose}
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="hud-panel-header">
                <div className="hud-panel-logo-container">
                  <span className="material-symbols-outlined hud-panel-logo-icon">park</span>
                </div>
              </div>

              <h2 className="hud-panel-heading">Áreas Comunes</h2>
              <p className="hud-panel-subheading">Espacios del proyecto</p>

              <div className="hud-panel-content areas-modal-content">
                <div className="areas-cards-list" id="commonAreasGrid">
                  {areasData?.features?.length ? (
                    areasData.features.map((feature: any) => {
                      const { fid, name, image } = feature.properties;

                      return (
                        <div
                          key={fid}
                          className="areas-card"
                          data-marker={`area_comun_${fid}`}
                        >
                          <div
                            className="areas-card-image"
                            style={{ backgroundImage: `url('${image}')` }}
                          />
                          <div className="areas-card-content">
                            <div className="areas-card-title">{name}</div>
                            <div className="areas-card-buttons">
                              <button
                                type="button"
                                className="areas-btn-secondary"
                                onClick={() => handleViewImage(image)}
                              >
                                <span className="material-symbols-outlined text-[18px]">image</span>
                                <span>Imágenes</span>
                              </button>
                              <button
                                type="button"
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
                    <div className="areas-no-data">No hay áreas comunes disponibles</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AreasModal;
