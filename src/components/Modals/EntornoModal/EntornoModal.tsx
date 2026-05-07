import { useState, useEffect } from 'react';
import './EntornoModal.css';

interface EntornoModalProps {
  isVisible?: boolean;
  onClose?: () => void;
  entornoData?: any;
}

const EntornoModal = ({ isVisible = false, onClose, entornoData }: EntornoModalProps) => {
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
  
  // Datos por defecto si no hay datos del entorno
  const defaultEntornoData = {
    title: 'Ubicación',
    tipo: 'Turismo',
    imagen: '/images/club_house.jpg',
    coordinates: 'Coordenadas no disponibles'
  };

  // Usar datos del entorno si están disponibles, sino usar datos por defecto
  const data = entornoData ? {
    title: entornoData.title || 'Ubicación',
    tipo: entornoData.tipo || 'Turismo',
    imagen: entornoData.imagen || '/images/club_house.jpg',
    coordinates: entornoData.coordinates || 'Coordenadas no disponibles'
  } : defaultEntornoData;

  const [showTimeEstimate, setShowTimeEstimate] = useState(false);
  const [timeEstimate, setTimeEstimate] = useState('');

  useEffect(() => {
    setShowTimeEstimate(false);
    setTimeEstimate('');
  }, [entornoData]);

  const handleClose = () => {
    setIsHidden(false);
    onClose?.();
  };

  const handleShow = () => {
    setIsHidden(false);
  };

  // Ocultar el botón de reabrir cuando se cambia de sección
  useEffect(() => {
    if (!isVisible) {
      setIsHidden(false);
    }
  }, [isVisible]);

  const handleCalculateRoute = async () => {
    setShowTimeEstimate(true);
    
    // Llamar a la función de Cesium para calcular la ruta
    if (window.calculateRoute && data.coordinates) {
      const token = import.meta.env.VITE_OPEN_ROUTE_SERVICE_KEY;

      // Coordenadas del marcador principal (Mikonos)
      const projectLonLat = [-71.51364042644347, -17.257430143234867];
      
      // Coordenadas del marcador de entorno (seleccionado)
      const environmentCoords = Array.isArray(data.coordinates) 
        ? data.coordinates 
        : data.coordinates.split(',').map((coord: string) => parseFloat(coord.trim()));
      
      // RUTA: Desde el marcador de entorno (start) al marcador principal (end)
      const result = await window.calculateRoute(token, environmentCoords, projectLonLat, data.tipo);
      
      if (result && result.success) {
        setTimeEstimate(`${result.duration} min (${Math.round(result.distance / 1000)} km)`);
      } else {
        setTimeEstimate('Error al calcular la ruta');
      }
    }

    if (isMobile) {
      setTimeout(() => {
        setIsHidden(true);
      }, 1000);
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
      {/* Botón para reabrir el modal en móviles cuando está oculto */}
      {isMobile && isHidden && (
        <button 
          className="reopen-entorno-modal-btn hud-glass-panel hud-gold-edge shadow-2xl"
          onClick={handleShow}
          title="Reabrir información de entorno"
        >
          <span className="material-symbols-outlined text-primary">location_on</span>
        </button>
      )}

      {/* Modal principal */}
      {!isHidden && (
        <div className={`around-modal hud-glass-panel hud-gold-edge ${isMobile ? 'mobile-modal' : ''}`} id="aroundModalOverlay">
          <div className="around-modal-header">
            <div className="around-modal-title">
              <img 
                src={`/images/sidebar/entorno/iconos/${data.tipo.toLowerCase()}.svg`} 
                alt={data.title}
                className="around-modal-icon" 
              />
              <span>{data.tipo}</span>
            </div>
            <button className="close-btn" id="closeAroundModal" onClick={handleClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
      
          <div className="around-modal-content">
            <div className="around-section">
              <div 
                className="around-card-image" 
                style={{ backgroundImage: `url(${data.imagen})` }}
              ></div>
              
              <div className="around-card-title">
                <span>{data.title}</span>
                {showTimeEstimate && (
                  <div className="around-card-time-estimate">
                    <span className="material-symbols-outlined">directions_car</span>
                    <span>{timeEstimate}</span>
                  </div>
                )}
              </div>

              <div className="around-card-details">
                <h2>Ubicación:</h2>
                <p>
                  {Array.isArray(data.coordinates) 
                    ? `${data.coordinates[1].toFixed(6)}, ${data.coordinates[0].toFixed(6)}` 
                    : data.coordinates}
                </p>
                
                <div className="around-card-info-row">
                  {!showTimeEstimate && (
                    <button 
                      className="around-card-link-button" 
                      id="calculateRouteBtn"
                      onClick={handleCalculateRoute}
                    >
                      <span className="material-symbols-outlined">route</span>
                      Cómo llegar
                    </button>
                  )}
                  <button
                    className="around-card-link-button"
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
