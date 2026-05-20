import { TOPBAR_BUTTONS } from "../../config/topbarButtons";
import { useUiVisibility } from "../../contexts/UiVisibilityContext";
import "./AdminUiPanel.css";

interface AdminUiPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminUiPanel = ({ isOpen, onClose }: AdminUiPanelProps) => {
  const { visibility, setButtonVisible, resetVisibility } = useUiVisibility();

  if (!isOpen) return null;

  return (
    <div className="admin-ui-panel-overlay" onClick={onClose}>
      <div
        className="admin-ui-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Configuración de botones del visor"
      >
        <div className="admin-ui-panel-header">
          <h3>Visibilidad del menú</h3>
          <button type="button" className="admin-ui-panel-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="admin-ui-panel-desc">
          Controla qué botones del topbar ven los visitantes en este dispositivo.
        </p>
        <ul className="admin-ui-panel-list">
          {TOPBAR_BUTTONS.map((btn) => (
            <li key={btn.id}>
              <label className="admin-ui-toggle">
                <input
                  type="checkbox"
                  checked={visibility[btn.id]}
                  onChange={(e) => setButtonVisible(btn.id, e.target.checked)}
                />
                <span className="material-symbols-outlined">{btn.icon}</span>
                <span>{btn.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <button type="button" className="admin-ui-reset" onClick={resetVisibility}>
          Restaurar todos visibles
        </button>
      </div>
    </div>
  );
};

export default AdminUiPanel;
