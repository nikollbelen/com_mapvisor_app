import { useState } from 'react';
import './BottomBarItem.css';

interface BottomBarItemProps {
  id: string;
  icon: string;
  alt: string;
  isActive: boolean;
  onClick: (id: string) => void;
}

const tooltipTexts: { [key: string]: string } = {
  home: 'Inicio',
  up: 'Mover arriba',
  down: 'Mover abajo',
  zoomIn: 'Acercar',
  zoomOut: 'Alejar',
  view3d: 'Vista 3D',
  grid: 'Ver lotes'
};

const BottomBarItem = ({ id, alt, isActive, onClick }: BottomBarItemProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const iconMap: Record<string, string> = {
    'home': 'home',
    'up': 'arrow_upward',
    'down': 'arrow_downward',
    'zoomIn': 'zoom_in',
    'zoomOut': 'zoom_out',
    'view3d': '3d_rotation',
    'grid': 'grid_view'
  };

  return (
    <div 
      className="bottombar-item-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button 
        className={`bottombar-item ${isActive ? 'active' : ''}`}
        id={id}
        onClick={() => onClick(id)}
        aria-label={alt}
      >
        <span className="material-symbols-outlined bottombar-item-icon">
          {iconMap[id] || 'circle'}
        </span>
      </button>
      
      {showTooltip && (
        <div className="bottombar-tooltip">
          {tooltipTexts[id] || alt}
        </div>
      )}
    </div>
  );
};

export default BottomBarItem;
