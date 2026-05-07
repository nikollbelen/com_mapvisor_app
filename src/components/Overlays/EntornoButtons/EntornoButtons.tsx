import { useState, useEffect } from 'react';
import './EntornoButtons.css';

interface EntornoButtonsProps {
  isVisible?: boolean;
}

const EntornoButtons = ({ isVisible = false }: EntornoButtonsProps) => {
  const [activeButton, setActiveButton] = useState('todos');
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil o tablet
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const entornoButtons = [
    { id: 'todos', icon: 'apps', text: 'Todos' },
    { id: 'playas', icon: 'beach_access', text: 'Playas' },
    { id: 'restaurantes', icon: 'restaurant', text: 'Restaurantes' },
    { id: 'hoteles', icon: 'hotel', text: 'Hoteles' },
    { id: 'turismo', icon: 'tour', text: 'Turismo' },
    { id: 'seguridad', icon: 'local_police', text: 'Seguridad' }
  ];

  const handleButtonClick = (buttonId: string) => {
    setActiveButton(buttonId);
    
    if (window.filterEntornoByType) {
      const tipoMap: { [key: string]: string } = {
        'todos': 'Todos',
        'playas': 'Playas',
        'restaurantes': 'Restaurantes',
        'hoteles': 'Hoteles',
        'turismo': 'Turismo',
        'seguridad': 'Seguridad'
      };
      
      const tipo = tipoMap[buttonId] || 'Todos';
      window.filterEntornoByType(tipo);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`entorno-dock hud-glass-panel hud-gold-edge ${isMobile ? 'mobile-entorno' : ''}`} id="aroundButtonsContainer">
      {entornoButtons.map((button) => (
        <button 
          key={button.id}
          className={`entorno-pill ${activeButton === button.id ? 'active' : ''}`}
          onClick={() => handleButtonClick(button.id)}
        >
          <span className="material-symbols-outlined entorno-icon">
            {button.icon}
          </span>
          <span className="entorno-text">{button.text}</span>
        </button>
      ))}
    </div>
  );
};

export default EntornoButtons;
