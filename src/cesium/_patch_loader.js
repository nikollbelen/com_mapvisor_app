// Script de Node.js para parchar cesium-init.js
// Reemplaza loadLotesData con la versión de 2 fases

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cesium-init.js');
let content = fs.readFileSync(filePath, 'utf8');

// === BLOQUE A REEMPLAZAR ===
// Desde 'async function loadLotesData()' hasta '}' (la llave de cierre)
const FUNC_START = 'async function loadLotesData() {';
const FUNC_END_MARKER = '\n// Función para actualizar un lote';

const startIdx = content.indexOf(FUNC_START);
const endIdx   = content.indexOf(FUNC_END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('ERROR: No se encontró la función. startIdx=', startIdx, 'endIdx=', endIdx);
  process.exit(1);
}

const before = content.substring(0, startIdx);
const after  = content.substring(endIdx);

// === NUEVO CÓDIGO ===
const newCode = `// Helper: fetch Google Sheets con reintentos automáticos
async function fetchSheetsData() {
  const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (!scriptUrl) return null;
  console.log('%c🔗 [SHEETS] Iniciando fetch en paralelo:', 'color: cyan; font-weight: bold', scriptUrl);
  let scriptResp = null;
  let retries = 0;
  const maxRetries = 4;
  while (retries < maxRetries) {
    try {
      scriptResp = await fetch(scriptUrl, { cache: 'no-store' });
      if (scriptResp.ok) break;
      console.warn('[SHEETS] Intento ' + (retries + 1) + ' falló (' + scriptResp.status + '). Reintentando...');
    } catch (e) {
      console.warn('[SHEETS] Intento ' + (retries + 1) + ' falló con error. Reintentando...');
    }
    retries++;
    if (retries < maxRetries) await new Promise(r => setTimeout(r, 1500));
  }
  if (!scriptResp || !scriptResp.ok) {
    console.warn('[SHEETS] No se pudo obtener datos tras todos los intentos.');
    return null;
  }
  const lots = await scriptResp.json() || [];
  console.log('%c📊 [SHEETS] Filas recibidas:', 'color: lime; font-weight: bold', lots.length);
  if (lots.length > 0) console.log('%c👉 [SHEETS] Muestra fila 0:', 'color: lime', lots[0]);
  return lots;
}

// Helper: parsear filas de Sheets y guardar en fidToApiProps
function parseSheetLots(lots) {
  if (!lots || !lots.length) return;
  fidToApiProps.clear();
  lots.forEach((lot) => {
    const fidKey = String(lot['FID'] || lot['fid'] || '');
    if (!fidKey) return;
    fidToApiProps.set(fidKey, {
      fid: fidKey,
      number:    lot['Número']   || lot['Numero']   || '',
      direccion: lot['Dirección']|| lot['Direccion'] || '',
      block:     lot['Manzana']  || '',
      lot:       lot['Lote']     || '',
      area:      lot['Área (m²)']|| lot['Area (m²)'] || lot['Area'] || '',
      price:     lot['Precio']   ? String(lot['Precio']).replace(/[$,]/g, '').trim() : '',
      state:     lot['Estado']   || 'disponible',
      etapa:     lot['Etapa']    || '',
      frente:    lot['Colindancia Frente']    || '',
      derecha:   lot['Colindancia Derecha']   || '',
      izquierda: lot['Colindancia Izquierda'] || '',
      fondo:     lot['Colindancia Fondo']     || '',
    });
  });
  console.log('%c✅ [SHEETS] fidToApiProps cargado con', 'color: lime', fidToApiProps.size, 'lotes.');
}

// Helper: aplicar colores/estados reales a entidades Cesium ya cargadas (fase silenciosa)
function applySheetColorsToEntities() {
  if (!lotesDataSource || !lotesDataSource.entities || !fidToApiProps.size) return;
  const entities = lotesDataSource.entities.values;
  entities.forEach((entity) => {
    if (!entity.polygon || !entity.properties) return;
    const fidProp = entity.properties.fid;
    const fid = typeof fidProp?.getValue === 'function' ? fidProp.getValue() : fidProp;
    if (fid == null) return;
    const api = fidToApiProps.get(String(fid));
    if (!api) return;

    const estadoValue = String(api.state || 'disponible').toLowerCase();

    // Actualizar propiedades de texto
    const setProp = (prop, val) => {
      if (!val) return;
      if (entity.properties[prop] && typeof entity.properties[prop].setValue === 'function') {
        entity.properties[prop].setValue(val);
      } else {
        entity.properties[prop] = val;
      }
    };
    setProp('estado',    estadoValue);
    setProp('status',    estadoValue);
    setProp('precio',    api.price);
    setProp('price',     api.price);
    setProp('etapa',     api.etapa);
    setProp('frente',    api.frente);
    setProp('derecha',   api.derecha);
    setProp('izquierda', api.izquierda);
    setProp('fondo',     api.fondo);

    // Actualizar color del polígono
    const newBase = getStatusColor(estadoValue).withAlpha(0.4);
    entity._baseMaterial = newBase;
    if (entity !== selected) {
      entity.polygon.material = newBase;
      if (entity.polyline) {
        entity.polyline.material = isLotGridActive()
          ? createGlowMaterial(getStatusGlowColor(estadoValue), 0.25)
          : createGlowMaterial(window.Cesium.Color.WHITE.withAlpha(0.4), 0.2);
      }
    } else {
      applySelectedLotMaterial(entity);
    }
  });

  if (viewer) viewer.scene.requestRender();
  console.log('%c🎨 [SHEETS] Colores reales aplicados al mapa.', 'color: lime; font-weight: bold');
  window.dispatchEvent(new CustomEvent('lotCountsUpdated', { detail: getLotCountsByStatus() }));
}

async function loadLotesData() {
  try {
    // ── FASE 1: Lanzar fetch de Sheets en paralelo INMEDIATAMENTE (sin await) ──
    const sheetsPromise = fetchSheetsData();

    // ── FASE 1: Cargar GeoJSON local (rápido) ──────────────────────────────────
    const resp = await fetch('./data/lotesv2.geojson');
    if (!resp.ok) throw new Error('No se pudo cargar lotesv2.geojson (' + resp.status + ')');
    lotesData = await resp.json();

    lotesPositions = extractLotesPositions(lotesData);

    // Process and format lot data with defaults (sin Sheets por ahora)
    const feats = lotesData.features || [];
    processedLots = feats
      .filter((f) => f && f.properties)
      .filter((f) => {
        const p = f.properties || {};
        const number = p.number || '';
        const lote = p.lote || '';
        return (
          number !== 'Jardín' &&
          (lote !== '' || (number !== '' && !isNaN(parseInt(number))))
        );
      })
      .map((f, idx) => {
        const p = f.properties || {};
        let areaNum = 0;
        if (typeof p.area === 'string') {
          areaNum = parseFloat(p.area.replace(',', '.')) || 0;
        } else if (typeof p.area === 'number') {
          areaNum = p.area;
        }
        let precioNum = 0;
        if (typeof p.precio === 'string') {
          precioNum = parseFloat(p.precio.replace(',', '.')) || 0;
        } else if (typeof p.precio === 'number') {
          precioNum = p.precio;
        }
        const estado = p.estado || 'disponible';
        const manzana = p.manzana || '';
        const lote = p.lote || '';
        const direccion = p.direccion || p.number || '';
        const phaseOrder = normalizePhaseValue((p._api && p._api.phase) || p.phase, direccion);
        const blockCode = normalizeBlockValue(manzana, direccion);
        const lotIndex = normalizeLotNumberValue(lote, direccion);
        return {
          fid: p.fid,
          id: p.direccion || ('' + idx),
          number: p.direccion || (manzana || lote ? 'Mz. ' + manzana + ' - Lote ' + lote : p.number || 'Lote ' + (idx + 1)),
          price: precioNum,
          area: areaNum,
          status: String(estado).toLowerCase(),
          phaseOrder,
          blockCode,
          lotIndex,
        };
      });

    // Create Cesium data source
    lotesDataSource = new window.Cesium.GeoJsonDataSource();
    await lotesDataSource.load(lotesData);

`;

content = before + newCode + after;
fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch phase 1 applied. File length:', content.length);
