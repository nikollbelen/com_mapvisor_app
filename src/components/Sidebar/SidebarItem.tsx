import './SidebarItem.css';

interface SidebarItemProps {
  id: string;
  text: string;
  isActive: boolean;
  onClick: (id: string) => void;
  layout?: 'horizontal' | 'vertical' | 'icon-only';
}

const SidebarItem = ({ id, text, isActive, onClick, layout = 'horizontal' }: SidebarItemProps) => {
  const iconMap: Record<string, string> = {
    'fotos': '360',
    'areas': 'park',
    'lotes': 'grid_view',
    'entorno': 'landscape',
    'video': 'videocam',
    'usuario': 'account_circle',
    'home': 'home',
    'up': 'keyboard_arrow_up',
    'down': 'keyboard_arrow_down',
    'zoomIn': 'add',
    'zoomOut': 'remove',
    'view3d': '3d_rotation',
    'grid': 'calendar_view_month'
  };

  return (
    <div 
      className={`sidebar-item layout-${layout} ${isActive ? 'active' : ''}`}
      id={id}
      onClick={() => onClick(id)}
      title={text}
    >
      <span className="material-symbols-outlined sidebar-item-icon">
        {iconMap[id] || 'circle'}
      </span>
      {layout !== 'icon-only' && (
        <span className="sidebar-item-text">{text}</span>
      )}
    </div>
  );
};

export default SidebarItem;
