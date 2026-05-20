import { useState, useEffect } from 'react';
import '../shared/HudPanelModal.css';
import './EntornoModal.css';

interface EntornoModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  entornoData?: any;
}

const EntornoModal = ({ isVisible = false, onClose, entornoData }: EntornoModalProps) => {
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

  const defaultEntornoData = {
    title: 'Ubicación',
    tipo: 'Turismo',
    imagen: '/images/club_house.jpg',
    coordinates: 'Coordenadas no disponibles',
  };

  const data = entornoData
    ? {
        title: entornoData.title || 'Ubicación',
        tipo: entornoData.tipo || 'Turismo',
        imagen: entornoData.imagen || '/images/club_house.jpg',
        coordinates: entornoData.coordinates || 'Coordenadas no disponibles',
      }
    : defaultEntornoData;

  const [showTimeEstimate, setShowTimeEstimate] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState('');

  useEffect(() => {
    setShowTimeEstimate(false);
    setTimeEstimate('');
  }, [entornoData]);

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

  const handleCalculateRoute = async () => {
    setShowTimeEstimate(true);

    if (window.calculateRoute && data.coordinates) {
      const token = import.meta.env.VITE_OPEN_ROUTE_SERVICE_KEY;
      const projectLonLat = [-71.51364042644347, -17.257430143234867];
      const environmentCoords = Array.isArray(data.coordinates)
        ? data.coordinates
        : data.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));

      const result = await window.calculateRoute(
        token,
        environmentCoords,
        projectLonLat,
        data.tipo
      );

      if (result?.success) {
        setTimeEstimate(
          `${result.duration} min (${Math.round(result.distance / 1000)} km)`
        );
      } else {
        setTimeEstimate('Error al calcular la ruta');
      }
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!data.coordinates) return;

    const coords = Array.isArray(data.coordinates)
      ? data.coordinates
      : data.coordinates
          .split(',')
          .map((coord: string) => parseFloat(coord.trim()))
          .filter((value: number) => !Number.isNaN(value));

    if (coords.length < 2) return;

    const [longitude, latitude] = coords;
    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <>
      {isMobile && isMinimized && (
        <button
          type="button"
          className="hud-panel-reopen-btn hud-panel-reopen-btn--left hud-glass-panel hud-gold-edge shadow-2xl"
          onClick={handleRestore}
          title="Reabrir entorno"
          aria-label="Reabrir entorno"
        >
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            location_on
          </span>
        </button>
      )}

      {!isMinimized && (
        <div className="hud-panel-overlay show" id="aroundModalOverlay">
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
                  id="closeAroundModal"
                  onClick={handleClose}
                  title="Cerrar"
                  aria-label="Cerrar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="hud-panel-header">
                <div className="hud-panel-logo-container">
                  <img
                    src={`/images/sidebar/entorno/iconos/${data.tipo.toLowerCase()}.svg`}
                    alt={data.tipo}
                    className="entorno-modal-logo-img"
                  />
                </div>
              </div>

              <h2 className="hud-panel-heading">{data.title}</h2>
              <p className="hud-panel-subheading">{data.tipo}</p>

              <div className="hud-panel-content entorno-modal-content">
                <div
                  className="entorno-card-image"
                  style={{ backgroundImage: `url(${data.imagen})` }}
                />

                {showTimeEstimate && (
                  <div className="entorno-time-estimate">
                    <span className="material-symbols-outlined">directions_car</span>
                    <span>{timeEstimate}</span>
                  </div>
                )}

                <div className="entorno-location-block">
                  <h3 className="entorno-location-label">Ubicación</h3>
                  <p className="entorno-location-value">
                    {Array.isArray(data.coordinates)
                      ? `${data.coordinates[1].toFixed(6)}, ${data.coordinates[0].toFixed(6)}`
                      : data.coordinates}
                  </p>
                </div>

                <div className="entorno-actions-row">
                  {!showTimeEstimate && (
                    <button
                      type="button"
                      className="entorno-btn-primary"
                      id="calculateRouteBtn"
                      onClick={handleCalculateRoute}
                    >
                      <span className="material-symbols-outlined">route</span>
                      Cómo llegar
                    </button>
                  )}
                  <button
                    type="button"
                    className="entorno-btn-secondary"
                    id="openGoogleMapsBtn"
                    onClick={handleOpenGoogleMaps}
                  >
                    <span className="material-symbols-outlined">map</span>
                    Maps
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EntornoModal;
