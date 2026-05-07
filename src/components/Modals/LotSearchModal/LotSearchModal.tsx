import { useState, useEffect, useRef } from 'react';
import './LotSearchModal.css';

interface LotSearchModalProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const DEFAULT_PRICE_BOUNDS = { min: 0, max: 100000 };
const DEFAULT_AREA_BOUNDS = { min: 90, max: 1000 };

const SORT_OPTIONS = [
  { value: 'area-asc',    label: 'Área: de menor a mayor' },
  { value: 'area-desc',   label: 'Área: de mayor a menor' },
  { value: 'price-asc',   label: 'Precio: de menor a mayor' },
  { value: 'price-desc',  label: 'Precio: de mayor a menor' },
  { value: 'number-asc',  label: 'Número: de menor a mayor' },
  { value: 'number-desc', label: 'Número: de mayor a menor' },
];

const LotSearchModal = ({ isVisible = false, onClose }: LotSearchModalProps) => {
  const [priceMin, setPriceMin] = useState(DEFAULT_PRICE_BOUNDS.min);
  const [priceMax, setPriceMax] = useState(DEFAULT_PRICE_BOUNDS.max);
  const [areaMin, setAreaMin] = useState(DEFAULT_AREA_BOUNDS.min);
  const [areaMax, setAreaMax] = useState(DEFAULT_AREA_BOUNDS.max);
  const [priceBounds, setPriceBounds] = useState(DEFAULT_PRICE_BOUNDS);
  const [areaBounds, setAreaBounds] = useState(DEFAULT_AREA_BOUNDS);
  const [sortBy, setSortBy] = useState('area-asc');
  const [sortOpen, setSortOpen] = useState(false);
  const [status, setStatus] = useState('disponible');
  const [isMobile, setIsMobile] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 1024);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const projectId = import.meta.env.VITE_PROJECT_ID;
    if (!apiBaseUrl || !projectId) return;

    const controller = new AbortController();
    const fetchLotConfig = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/lots/project/${projectId}/config`, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const json = await response.json();
        const config = json?.data;
        if (!config) return;

        const parseNumber = (value: unknown) => {
          if (typeof value === 'number') return value;
          if (typeof value === 'string') { const p = parseFloat(value); return isNaN(p) ? undefined : p; }
          return undefined;
        };

        const nb = {
          min: parseNumber(config.min_price) !== undefined ? Math.max(0, Math.floor(parseNumber(config.min_price)!)) : DEFAULT_PRICE_BOUNDS.min,
          max: parseNumber(config.max_price) !== undefined ? Math.max(0, Math.ceil(parseNumber(config.max_price)!)) : DEFAULT_PRICE_BOUNDS.max,
        };
        const ab = {
          min: parseNumber(config.min_area) !== undefined ? Math.max(0, Math.floor(parseNumber(config.min_area)!)) : DEFAULT_AREA_BOUNDS.min,
          max: parseNumber(config.max_area) !== undefined ? Math.max(0, Math.ceil(parseNumber(config.max_area)!)) : DEFAULT_AREA_BOUNDS.max,
        };

        setPriceBounds(nb); setAreaBounds(ab);
        setPriceMin(nb.min); setPriceMax(nb.max);
        setAreaMin(ab.min); setAreaMax(ab.max);

        if (window.setLotRangeConfig) {
          window.setLotRangeConfig({ maxPrice: nb.max, minPrice: nb.min, maxArea: ab.max, minArea: ab.min });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.error('Error fetching lot config', e);
      }
    };
    fetchLotConfig();
    return () => controller.abort();
  }, [isVisible]);

  const clampToBounds = (value: number, bounds: { min: number; max: number }) => {
    if (Number.isNaN(value)) return bounds.min;
    return Math.max(bounds.min, Math.min(value, bounds.max));
  };

  const updateRangeSlider = (
    minInput: number, maxInput: number,
    minOutput: string, maxOutput: string, inclRange: string,
    formatValue: (v: number) => string, rangeBounds: { min: number; max: number }
  ) => {
    const minRange = rangeBounds?.min ?? 0;
    const maxRangeRaw = rangeBounds?.max ?? minRange + 1;
    const maxRange = maxRangeRaw > minRange ? maxRangeRaw : minRange + 1;
    const rangeSpan = maxRange - minRange;
    const minEl = document.querySelector(minOutput);
    const maxEl = document.querySelector(maxOutput);
    if (minEl) minEl.innerHTML = formatValue(minInput);
    if (maxEl) maxEl.innerHTML = formatValue(maxInput);
    const inclEl = document.querySelector(inclRange) as HTMLElement;
    if (inclEl) {
      const eMin = Math.min(minInput, maxInput);
      const eMax = Math.max(minInput, maxInput);
      inclEl.style.width = ((eMax - eMin) / rangeSpan) * 100 + '%';
      inclEl.style.left = ((eMin - minRange) / rangeSpan) * 100 + '%';
    }
  };

  useEffect(() => {
    if (isVisible && window.loadLotData) setTimeout(() => window.loadLotData(), 100);
  }, [isVisible, priceMax, areaMax]);

  useEffect(() => {
    if (isVisible) {
      updateRangeSlider(priceMin, priceMax, '.price-output-min', '.price-output-max', '.price-range-slider .incl-range', (v) => `$${parseInt(v.toString()).toLocaleString()}`, priceBounds);
      updateRangeSlider(areaMin, areaMax, '.area-output-min', '.area-output-max', '.area-range-slider .incl-range', (v) => `${parseInt(v.toString())} m²`, areaBounds);
    }
  }, [isVisible, priceMin, priceMax, areaMin, areaMax, priceBounds, areaBounds]);

  const handleClose = () => onClose?.();

  const handleClearFilters = () => {
    setPriceMin(priceBounds.min); setPriceMax(priceBounds.max);
    setAreaMin(areaBounds.min); setAreaMax(areaBounds.max);
    setSortBy('area-asc'); setStatus('disponible');
    if (window.loadLotData) window.loadLotData();
  };

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = clampToBounds(parseInt(e.target.value), priceBounds);
    setPriceMin(v);
    if (window.loadLotData) window.loadLotData();
  };
  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = clampToBounds(parseInt(e.target.value), priceBounds);
    setPriceMax(v);
    if (window.loadLotData) window.loadLotData();
  };
  const handleAreaMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = clampToBounds(parseInt(e.target.value), areaBounds);
    setAreaMin(v);
    if (window.loadLotData) window.loadLotData();
  };
  const handleAreaMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = clampToBounds(parseInt(e.target.value), areaBounds);
    setAreaMax(v);
    if (window.loadLotData) window.loadLotData();
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setTimeout(() => { if (window.loadLotData) window.loadLotData(); }, 0);
  };

  const handleSortSelect = (value: string) => {
    setSortBy(value);
    setSortOpen(false);
    // Sync hidden select for Cesium's applyFilters
    const sel = document.getElementById('sortSelect') as HTMLSelectElement;
    if (sel) sel.value = value;
    if (window.loadLotData) window.loadLotData();
  };

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? '';

  if (!isVisible) return null;

  return (
    <div
      className={`lot-search-modal hud-glass-panel hud-gold-edge ${isMobile ? 'mobile-modal' : ''}`}
      id="lotSearchModalOverlay"
    >
      {/* Hidden native select so Cesium's applyFilters can read it */}
      <select id="sortSelect" value={sortBy} onChange={() => {}} style={{ display: 'none' }}>
        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <button className="lot-search-close-btn" id="closeLotSearchModal" onClick={handleClose}>
        <span className="material-symbols-outlined">close</span>
      </button>

      {/* Header */}
      <div className="lot-search-header">
        <div className="lot-search-title">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
          <span className="lot-search-title-text">Búsqueda de lotes</span>
        </div>
      </div>

      <div className="lot-search-content">
        {/* Price range */}
        <div className="filter-section">
          <label className="filter-label">Precio</label>
          <div className="range-slider-container">
            <div className="range-slider price-range-slider">
              <span className="output outputOne price-output-min">${priceMin.toLocaleString()}</span>
              <span className="output outputTwo price-output-max">${priceMax.toLocaleString()}</span>
              <span className="full-range"></span>
              <span className="incl-range"></span>
              <input name="priceMin" value={priceMin} min={priceBounds.min} max={priceBounds.max} step="1000" type="range" onChange={handlePriceMinChange} />
              <input name="priceMax" value={priceMax} min={priceBounds.min} max={priceBounds.max} step="1000" type="range" onChange={handlePriceMaxChange} />
            </div>
          </div>
        </div>

        {/* Area range */}
        <div className="filter-section">
          <label className="filter-label">Área</label>
          <div className="range-slider-container">
            <div className="range-slider area-range-slider">
              <span className="output outputOne area-output-min">{areaMin} m²</span>
              <span className="output outputTwo area-output-max">{areaMax} m²</span>
              <span className="full-range"></span>
              <span className="incl-range"></span>
              <input name="areaMin" value={areaMin} min={areaBounds.min} max={areaBounds.max} step="1" type="range" onChange={handleAreaMinChange} />
              <input name="areaMax" value={areaMax} min={areaBounds.min} max={areaBounds.max} step="1" type="range" onChange={handleAreaMaxChange} />
            </div>
          </div>
        </div>

        {/* Clear filters */}
        <button className="clear-filters-btn" id="clearFiltersBtn" onClick={handleClearFilters}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>filter_alt_off</span>
          Limpiar filtros
        </button>

        {/* Sort — custom dropdown */}
        <div className="filter-section">
          <label className="filter-label">Ordenar por</label>
          <div className="custom-dropdown" ref={sortRef}>
            <button className={`custom-dropdown-trigger ${sortOpen ? 'open' : ''}`} onClick={() => setSortOpen(!sortOpen)}>
              <span className="custom-dropdown-label">{sortLabel}</span>
              <span className="material-symbols-outlined custom-dropdown-arrow">expand_more</span>
            </button>
            {sortOpen && (
              <div className="custom-dropdown-menu">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    className={`custom-dropdown-item ${sortBy === o.value ? 'selected' : ''}`}
                    onClick={() => handleSortSelect(o.value)}
                  >
                    {sortBy === o.value && <span className="material-symbols-outlined check-icon">check</span>}
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="filter-section">
          <label className="filter-label">Estado</label>
          <div className="status-buttons">
            {/* Keep both class names: status-pill for styling + status-btn + data-status for Cesium */}
            {['vendido','reservado','negociacion','disponible'].map(s => (
              <button
                key={s}
                className={`status-pill status-btn ${s} ${status === s ? 'active' : ''}`}
                data-status={s}
                onClick={() => handleStatusChange(s)}
              >
                {{ vendido:'Vendido', reservado:'Reservado', negociacion:'Negociación', disponible:'Disponible' }[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="results-section">
          <div className="results-count" id="resultsCount">Mostrando (0) lotes</div>
          <div className="lot-cards-container" id="lotCardsContainer"></div>
        </div>
      </div>
    </div>
  );
};

export default LotSearchModal;
