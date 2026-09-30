// Cesium configuration
import { LOT_STATUS_COLORS, normalizeLotStatus } from "../constants/lotStatusColors";

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN;
// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer("cesiumContainer", {
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  fullscreenButton: false,
  requestRenderMode: true,
  pickTranslucentDepth: true,
});

// Activar el efecto Bloom (resplandor) en el viewer para el brillo neón
const bloom = viewer.scene.postProcessStages.bloom;
bloom.enabled = false; // Desactivado para no quemar el mapa. El brillo se emulará con un color sólido intenso.

// Asignar viewer a window para acceso global
window.viewer = viewer;

// Modo activo del visor (fuente de verdad; no depender de clases DOM por re-renders de React)
window.mapViewerMode = "lotes";

function setMapViewerMode(mode) {
  window.mapViewerMode = mode;
  window.dispatchEvent(
    new CustomEvent("mapViewerModeChanged", { detail: { mode } })
  );
}

function isLotSelectionBlocked() {
  return window.mapViewerMode === "fotos" || window.mapViewerMode === "areas";
}

// Deshabilitar el comportamiento de doble clic que hace zoom/enfoque automático
viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(window.Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

// Global variables for lots
let lotesPositions = [];
let processedLots = [];
let lotesDataSource = null;
let fidToApiProps = new Map(); // Map para almacenar datos de API por fid
let lotesData = null; // GeoJSON data de lotes

// Variables to handle hover
let highlightedMarcador = null;
let highlightedMarcadorOriginalScale = null;
let selected = null;
let selectedOriginalMaterial = null;
/** Cuadrícula colorida activa por defecto (los polígonos cargan con colores de estado). */
let lotGridActive = true;

function isLotGridActive() {
  // Usar siempre la variable JS, no el DOM (el botón React usa clases distintas a "active")
  return lotGridActive;
}

function setLotGridActive(active) {
  lotGridActive = !!active;
  // El estado visual del botón lo maneja React; no manipular clases del DOM aquí.
}

/** Resalte de parcela seleccionada: siempre color de estado (no blanco transparente). */
function applySelectedLotMaterial(entity) {
  if (!entity?.polygon) return;
  const estadoProp = entity.properties?.estado;
  const estadoValue =
    typeof estadoProp?.getValue === "function"
      ? estadoProp.getValue()
      : estadoProp;
  entity.polygon.material = getStatusColor(estadoValue).withAlpha(0.82);
  if (entity.polyline) {
    entity.polyline.show = true;
    entity.polyline.width = 5;
    entity.polyline.material = createGlowMaterial(
      getStatusGlowColor(estadoValue),
      0.45
    );
  }
}

function clearSelectedLotHighlight() {
  if (!selected) return;

  const previous = selected;
  const base = previous._baseMaterial || selectedOriginalMaterial;
  if (base && previous.polygon) {
    previous.polygon.material = base;
  }
  if (previous.polyline) {
    previous.polyline.width = 4;
    const estadoProp = previous.properties?.estado;
    const estadoValue =
      typeof estadoProp?.getValue === "function"
        ? estadoProp.getValue()
        : estadoProp;
    previous.polyline.material = createGlowMaterial(
      getStatusGlowColor(estadoValue),
      0.25
    );
  }

  selected = null;
  selectedOriginalMaterial = null;
}

function focusLotEntity(entity) {
  if (!entity?.polygon) return;

  clearSelectedLotHighlight();

  selected = entity;
  selectedOriginalMaterial = entity._baseMaterial || entity.polygon.material;
  applySelectedLotMaterial(entity);

  if (viewer) viewer.scene.requestRender();
}

function getEntityProp(entity, key) {
  if (!entity?.properties) return undefined;
  const prop = entity.properties[key];
  if (prop == null) return undefined;
  return typeof prop.getValue === "function" ? prop.getValue() : prop;
}

function findLotEntityByFid(fid) {
  if (!lotesDataSource || fid == null) return null;
  const fidKey = String(fid);
  return (
    lotesDataSource.entities.values.find((entity) => {
      if (!entity.polygon) return false;
      const entityFid = getEntityProp(entity, "fid");
      return entityFid != null && String(entityFid) === fidKey;
    }) || null
  );
}

function findLotEntityByNumber(lotNumber) {
  if (!lotesDataSource || !lotNumber) return null;

  const normalized = String(lotNumber).trim();
  const entities = lotesDataSource.entities.values;

  const byDireccion = entities.find((entity) => {
    if (!entity.polygon) return false;
    const direccion = getEntityProp(entity, "direccion");
    const number = getEntityProp(entity, "number");
    return direccion === normalized || number === normalized;
  });
  if (byDireccion) return byDireccion;

  let manzana = "";
  let loteNum = "";

  if (normalized.toLowerCase().startsWith("parcela")) {
    manzana = "Parcela";
    loteNum = normalized.split(/\s+/)[1] || "";
  } else {
    const manzanaMatch = normalized.match(/Mz\.\s*([A-Za-z0-9]+)/i);
    const loteMatch = normalized.match(/Lote\s*(\d+)/i);
    manzana = manzanaMatch ? manzanaMatch[1] : "";
    loteNum = loteMatch ? loteMatch[1] : "";
  }

  return (
    entities.find((entity) => {
      if (!entity.polygon) return false;
      return (
        getEntityProp(entity, "manzana") === manzana &&
        String(getEntityProp(entity, "lote")) === String(loteNum)
      );
    }) || null
  );
}

function buildLoteSelectedDetail(entity) {
  const getter = (fn, fallback) =>
    typeof fn === "function" ? fn(entity) : fallback(entity);

  return {
    entity,
    direccion: getter(window.getDireccion, (e) => getEntityProp(e, "direccion")),
    area: getter(window.getArea, (e) => getEntityProp(e, "area")),
    precio: getter(window.getPrecio, (e) => getEntityProp(e, "precio")),
    estado: getter(window.getEstado, (e) => getEntityProp(e, "estado")),
    boundaries: getter(window.getColindancias, () => ({})),
    id: getter(window.getId, (e) => getEntityProp(e, "fid")),
    phase: getter(window.getPhase, () => "1"),
  };
}

function selectLotOnMap(entity, { toggleIfSame = false } = {}) {
  if (!entity?.polygon || isLotSelectionBlocked()) return false;

  const loteValue = getEntityProp(entity, "lote");
  if (loteValue === "") return false;

  if (toggleIfSame && selected === entity) {
    if (window.closeLotInfoModal) {
      window.closeLotInfoModal();
    } else {
      reiniciarMenu();
    }
    return true;
  }

  clearModalsForLotSelection();
  setMapViewerMode("lotes");
  focusLotEntity(entity);

  window.dispatchEvent(
    new CustomEvent("loteSelected", {
      detail: buildLoteSelectedDetail(entity),
    })
  );

  return true;
}

// Functions to detect device type and adjust label properties
function getDeviceType() {
  const width = window.innerWidth;
  if (width <= 768) {
    return 'mobile';
  } else if (width <= 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

function getLabelFont() {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'mobile':
      return '700 8pt "Helvetica Neue", Helvetica, Arial, sans-serif';
    case 'tablet':
      return '800 8pt "Helvetica Neue", Helvetica, Arial, sans-serif';
    case 'desktop':
    default:
      return '900 9pt "Helvetica Neue", Helvetica, Arial, sans-serif';
  }
}

function getLabelScale() {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'mobile':
      return 0.6;
    case 'tablet':
      return 0.8;
    case 'desktop':
    default:
      return 1.0;
  }
}

function getLabelOutlineWidth() {
  const deviceType = getDeviceType();
  switch (deviceType) {
    case 'mobile':
      return 1.5;
    case 'tablet':
      return 2;
    case 'desktop':
    default:
      return 2;
  }
}

const modeSelected = window.Cesium.Color.fromCssColorString("#FFFFFF");

function getStatusColor(status) {
  const key = normalizeLotStatus(status);
  return window.Cesium.Color.fromCssColorString(LOT_STATUS_COLORS[key].hex);
}

function getStatusGlowColor(status) {
  const key = normalizeLotStatus(status);
  return window.Cesium.Color.fromCssColorString(LOT_STATUS_COLORS[key].glowHex);
}

function getHDRColor(color, intensity = 5.0) {
  return new window.Cesium.Color(
    color.red * intensity,
    color.green * intensity,
    color.blue * intensity,
    color.alpha
  );
}

function createGlowMaterial(color, glowPower = 0.5) {
  return new window.Cesium.PolylineGlowMaterialProperty({
    glowPower: glowPower,
    taperPower: 1.0,
    color: color
  });
}

function getStatusLabel(status) {
  const normalizedStatus = (status || "").toString().toLowerCase();
  switch (normalizedStatus) {
    case "disponible":
      return "Disponible";
    case "reservado":
      return "Reservado";
    case "negociacion":
      return "Negociación";
    case "vendido":
      return "Vendido";
    default:
      return typeof status === "string" ? status : "";
  }
}

let maxPrice = 0;
let maxArea = 0;
let minPrice = 0;
let minArea = 0;

const ROMAN_VALUES = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

function romanToNumber(roman = "") {
  if (!roman) return 0;
  const normalized = roman.toUpperCase().trim();
  let total = 0;
  let prev = 0;
  for (let i = normalized.length - 1; i >= 0; i--) {
    const current = ROMAN_VALUES[normalized[i]] || 0;
    if (current < prev) {
      total -= current;
    } else {
      total += current;
      prev = current;
    }
  }
  return total || 0;
}

function extractPhaseFromText(text = "") {
  const match = text.match(/Etapa\s+([IVXLCDM]+|\d+)/i);
  return match ? match[1] : "";
}

function extractBlockFromText(text = "") {
  const match = text.match(/Mz\.\s*([A-Za-z0-9]+)/i);
  return match ? match[1] : "";
}

function extractLotFromText(text = "") {
  const match = text.match(/(Lt\.?|Lote)\s*(\d+)/i);
  return match ? match[2] : "";
}

function normalizePhaseValue(rawValue, textFallback = "") {
  const candidate = rawValue ?? extractPhaseFromText(textFallback);
  if (candidate === undefined || candidate === null || candidate === "") return 0;
  if (typeof candidate === "number") return candidate;
  const numeric = parseInt(candidate, 10);
  if (!isNaN(numeric)) return numeric;
  return romanToNumber(String(candidate));
}

function normalizeBlockValue(rawValue, textFallback = "") {
  const candidate = rawValue || extractBlockFromText(textFallback);
  return (candidate || "").toString().trim().toUpperCase();
}

function normalizeLotNumberValue(rawValue, textFallback = "") {
  if (typeof rawValue === "number") return rawValue;
  const candidate = rawValue || extractLotFromText(textFallback);
  if (!candidate) return 0;
  const numeric = parseInt(candidate, 10);
  return isNaN(numeric) ? 0 : numeric;
}

function getLotSortTokens(lot) {
  const textReference = lot.number || "";
  return {
    phaseOrder:
      typeof lot.phaseOrder === "number"
        ? lot.phaseOrder
        : normalizePhaseValue(undefined, textReference),
    blockCode:
      typeof lot.blockCode === "string" && lot.blockCode.length > 0
        ? lot.blockCode
        : normalizeBlockValue(undefined, textReference),
    lotIndex:
      typeof lot.lotIndex === "number"
        ? lot.lotIndex
        : normalizeLotNumberValue(undefined, textReference),
  };
}

function compareLotsByLocation(a, b, isAscending = true) {
  const dir = isAscending ? 1 : -1;
  const tokensA = getLotSortTokens(a);
  const tokensB = getLotSortTokens(b);

  if (tokensA.phaseOrder !== tokensB.phaseOrder) {
    return (tokensA.phaseOrder - tokensB.phaseOrder) * dir;
  }

  const blockCompare = tokensA.blockCode.localeCompare(tokensB.blockCode);
  if (blockCompare !== 0) {
    return blockCompare * dir;
  }

  return (tokensA.lotIndex - tokensB.lotIndex) * dir;
}

// Load custom map image
try {
  viewer.imageryLayers.addImageryProvider(
    await window.Cesium.IonImageryProvider.fromAssetId(4822551)
  );
} catch (error) {
  // console.error("❌ Error loading map image:", error);
}

async function loadLotesData() {
  try {
    // ══ FASE 1: Iniciar fetch Sheets EN PARALELO (arranca inmediatamente) ══════
    const sheetsPromise = (async () => {
      const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
      if (!scriptUrl) return null;
      console.log("%c[SHEETS] Fetch iniciado en paralelo", "color: cyan; font-weight: bold");
      let resp = null;
      let tries = 0;
      while (tries < 4) {
        try {
          resp = await fetch(scriptUrl, { cache: "no-store" });
          if (resp.ok) break;
          console.warn("[SHEETS] Intento " + (tries + 1) + " fallido (" + resp.status + "). Reintentando...");
        } catch (e) {
          console.warn("[SHEETS] Intento " + (tries + 1) + " fallido con error. Reintentando...");
        }
        tries++;
        if (tries < 4) await new Promise(r => setTimeout(r, 1500));
      }
      if (!resp || !resp.ok) return null;
      const lots = await resp.json() || [];
      console.log("%c[SHEETS] Recibidas:", "color: lime", lots.length, "filas");
      return lots;
    })();

    // ══ FASE 1: Cargar GeoJSON local (es local, rapidísimo) ══════════════════
    const resp = await fetch("./data/lotesv2.geojson");
    if (!resp.ok) {
      throw new Error(`No se pudo cargar lotesv2.geojson (${resp.status})`);
    }
    lotesData = await resp.json();

    lotesPositions = extractLotesPositions(lotesData);

    // Process lots with default data (Sheets llegará después silenciosamente)
    const feats = lotesData.features || [];
    processedLots = feats
      .filter((f) => f && f.properties)
      .filter((f) => {
        const p = f.properties || {};
        const number = p.number || "";
        const lote = p.lote || "";
        return (
          number !== "Jardín" &&
          (lote !== "" || (number !== "" && !isNaN(parseInt(number))))
        );
      })
      .map((f, idx) => {
        const p = f.properties || {};
        let areaNum = 0;
        if (typeof p.area === "string") {
          areaNum = parseFloat(p.area.replace(",", ".")) || 0;
        } else if (typeof p.area === "number") {
          areaNum = p.area;
        }
        let precioNum = 0;
        if (typeof p.precio === "string") {
          precioNum = parseFloat(p.precio.replace(",", ".")) || 0;
        } else if (typeof p.precio === "number") {
          precioNum = p.precio;
        }
        const estado = p.estado || "disponible";
        const manzana = p.manzana || "";
        const lote = p.lote || "";
        const direccion = p.direccion || p.number || "";
        const phaseOrder = normalizePhaseValue(
          (p._api && p._api.phase) || p.phase,
          direccion
        );
        const blockCode = normalizeBlockValue(manzana, direccion);
        const lotIndex = normalizeLotNumberValue(lote, direccion);
        return {
          fid: p.fid,
          id: p.direccion || `${idx}`,
          number:
            p.direccion ||
            (manzana || lote
              ? `Mz. ${manzana} - Lote ${lote}`
              : p.number || `Lote ${idx + 1}`),
          price: precioNum,
          area: areaNum,
          status: String(estado).toLowerCase(),
          phaseOrder,
          blockCode,
          lotIndex,
        };
      });

    // Create Cesium data source from the loaded data
    lotesDataSource = new window.Cesium.GeoJsonDataSource();
    await lotesDataSource.load(lotesData);


    // Add labels to each terrain polygon
    const entities = lotesDataSource.entities.values;
    let polygonLabels = [];
    entities.forEach((entity) => {
      if (entity.polygon && entity.properties && entity.properties.number) {
        const positions = entity.polygon.hierarchy.getValue(
          window.Cesium.JulianDate.now()
        ).positions;

        // Calculate the center of the polygon
        const center =
          window.Cesium.BoundingSphere.fromPoints(positions).center;

        // Get the number from properties
        const lote = entity.properties.lote.getValue();

        // Elevar físicamente el label por encima del polígono
        const labelCartographic = window.Cesium.Cartographic.fromCartesian(center);
        const elevatedLabelPosition = window.Cesium.Cartographic.toCartesian(
          new window.Cesium.Cartographic(
            labelCartographic.longitude,
            labelCartographic.latitude,
            labelCartographic.height + 5.0 // 5m por encima del polígono
          )
        );

        // Add a label at the center of the polygon
        const labelEntity = viewer.entities.add({
          position: elevatedLabelPosition,
          properties: entity.properties,
          label: {
            text: (() => {
              const mz = entity.properties.manzana ? entity.properties.manzana.getValue() : "";
              const lt = entity.properties.lote ? entity.properties.lote.getValue() : "";
              if (mz === "Parcela") return `Parcela ${lt}`;
              return (mz && lt) ? `${mz}${lt}` : "";
            })(),
            font: getLabelFont(),
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.GRAY,
            outlineWidth: getLabelOutlineWidth(),
            style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: window.Cesium.VerticalOrigin.CENTER,
            pixelOffset: new window.Cesium.Cartesian2(0, 0),
            // Combinar elevación física con disableDepthTestDistance para asegurar visibilidad
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scale: getLabelScale(),
            heightReference: window.Cesium.HeightReference.NONE,
            show: (() => {
              const num = entity.properties.number ? entity.properties.number.getValue() : "";
              return !!num && !!lote;
            })(),
          },
        });
        polygonLabels.push(labelEntity);
      }
    });

    // Centro del proyecto según lotesv2.geojson (etiquetas, marcador Mykonos, etc.)
    const referencePoint =
      lotesPositions.length > 0
        ? window.Cesium.BoundingSphere.fromPoints(lotesPositions).center
        : window.Cesium.Cartesian3.fromDegrees(-71.8925, -17.1165, 0);
    const MAX_DISTANCE = 2000;
    const MARKER_SHOW_DISTANCE = 2500;
    const mykonosMarker = viewer.entities.add({
      id: "mykonos_marker",
      name: "Mykonos",
      position: referencePoint,
      billboard: {
        image: "images/mikonos_marker.png",
        width: 300,
        height: 400,
        verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        alignedAxis: window.Cesium.Cartesian3.ZERO,
        pixelOffset: window.Cesium.Cartesian2.ZERO,
        eyeOffset: window.Cesium.Cartesian3.ZERO,
        scaleByDistance: new window.Cesium.NearFarScalar(
          100.0,
          1.0,
          2000.0,
          0.5
        ),
        heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
        show: true,
      },
    });
    const NEAR_DISTANCE = 200.0;
    const FAR_DISTANCE = 201.0;

    // Event that runs before each frame
    viewer.scene.preRender.addEventListener(function () {
      // Get the distance from the camera to the reference point
      const distance = window.Cesium.Cartesian3.distance(
        viewer.camera.positionWC,
        referencePoint
      );

      // Control lot label visibility
      polygonLabels.forEach((entity) => {
        const showByDistance = distance < MAX_DISTANCE;
        const num = entity.properties && entity.properties.number ? entity.properties.number.getValue() : "";
        const hasText = !!num;

        if (entity.label) {
          // Mostrar solo si está en rango, tiene texto Y el modo actual permite etiquetas
          entity.label.show = showByDistance && hasText && (window.showLoteLabels !== false);
          if (distance <= 1000) {
            entity.label.scale = 1.0;
          } else if (distance <= 5000) {
            entity.label.scale = 1.3;
          } else {
            entity.label.scale = 1.6;
          }
        }
      });

      // Control Mykonos marker visibility
      if (mykonosMarker && mykonosMarker.billboard) {
        // Show Mykonos only when you are far away (>=10200m)
        mykonosMarker.billboard.show = distance > MARKER_SHOW_DISTANCE;
      }

      // Control visibility of all markers except environment
      const allEntities = viewer.entities.values;
      allEntities.forEach((entity) => {
        if (!entity.id || !entity.billboard) return;

        // Logic for photo markers and common areas (disappear when Mykonos appears)
        if (entity.id.startsWith("marcador_foto_") || entity.id.startsWith("area_comun_")) {
          if (distance > MARKER_SHOW_DISTANCE) {
            entity.billboard.show = false;
            if (entity.label) entity.label.show = false;
          } else {
            // Visible as long as Mykonos is not
            entity.billboard.show = true;
            if (entity.label) entity.label.show = true;
          }
        }
        // Other markers (except environment and Mykonos)
        else if (
          !entity.id.startsWith("marcador_entorno_") &&
          entity.id !== "mykonos_marker"
        ) {
          // Show markers when you are less than 550m away
          entity.billboard.show = distance < MAX_DISTANCE;
          if (entity.label) {
            entity.label.show = distance < MAX_DISTANCE;
          }
        }
      });
    });

    // Add the data source to the viewer after processing
    viewer.dataSources.add(lotesDataSource);

    // Apply styles to polygons
    try {
      const entities = lotesDataSource.entities.values.filter((e) => e.polygon);
      entities.forEach((e) => {
        let fid;
        if (e.properties && e.properties.fid) {
          fid =
            typeof e.properties.fid.getValue === "function"
              ? e.properties.fid.getValue()
              : e.properties.fid;
        }

        // Check if the lot is empty
        const loteValue = e.properties.lote ? e.properties.lote.getValue() : "";
        if (loteValue === "") {
          // For empty lots, make completely transparent
          e.polygon.material = getStatusColor("disponible").withAlpha(0);
          e.polygon.height = 0.1;
          e.polygon.heightReference =
            window.Cesium.HeightReference.RELATIVE_TO_GROUND;
          e.polygon.outline = true;
          e.polygon.outlineColor = window.Cesium.Color.WHITE;
          e._baseMaterial =
            window.Cesium.Color.fromCssColorString("#fff").withAlpha(0.01); // Save transparent material
          return; // Skip to next
        }

        // For valid lots, apply normal configuration
        e.polygon.height = 0.1;
        e.polygon.heightReference =
          window.Cesium.HeightReference.RELATIVE_TO_GROUND;

        // Desactivar el outline por defecto de Cesium para que no corte el brillo neón
        e.polygon.outline = false;

        // Configurar polígonos para que no bloqueen los labels
        e.polygon.disableDepthTestDistance = 0; // Los polígonos respetan la profundidad para que los labels estén por encima

        // Assign material according to status
        const estadoProp = e.properties?.estado;
        const estadoValue =
          typeof estadoProp?.getValue === "function"
            ? estadoProp.getValue()
            : estadoProp;
        const baseMaterial = getStatusColor(estadoValue).withAlpha(0.4);

        // Assign the material and save the base material for restoration
        e.polygon.material = baseMaterial;
        e._baseMaterial = baseMaterial;

        // Crear el borde brillante (polyline) usando HDR
        if (e.polygon.hierarchy) {
          const hierarchy = e.polygon.hierarchy.getValue(window.Cesium.JulianDate.now());
          const positions = (hierarchy && hierarchy.positions) ? hierarchy.positions : hierarchy;

          if (positions && positions.length > 0) {
            const closedPositions = [...positions, positions[0]];
            e.polyline = new window.Cesium.PolylineGraphics({
              positions: closedPositions,
              width: 4, // Grosor base del neón
              material: createGlowMaterial(getStatusGlowColor(estadoValue), 0.25),
              clampToGround: true // Pegado al terreno
            });
          }
        }
      });
    } catch (err) {
      console.error("Error applying styles to terreno.geojson (by fid):", err);
    }

    // Setup interaction handlers
    setupLoteInteractions();

    // Fly to lotes view
    flyToLotesView();

    // Disparar evento cuando Cesium esté completamente cargado
    // console.log('🚀 Cesium completamente cargado, disparando evento cesiumReady');
    // console.log('📊 Total de entidades en datasource:', lotesDataSource.entities.values.length);
    window.dispatchEvent(new CustomEvent('cesiumReady', {
      detail: {
        viewer: viewer,
        datasource: lotesDataSource,
        entityCount: lotesDataSource.entities.values.length
      }
    }));
    // console.log('✅ Evento cesiumReady disparado');
    // Notificar conteos iniciales a la leyenda de React
    window.dispatchEvent(new CustomEvent('lotCountsUpdated', {
      detail: getLotCountsByStatus()
    }));

    // ══ FASE 2 (silenciosa): Esperar datos de Sheets y aplicar colores reales ══
    sheetsPromise.then((lots) => {
      if (!lots || !lots.length) return;
      // Poblar fidToApiProps
      fidToApiProps.clear();
      lots.forEach((lot) => {
        const fidKey = String(lot["FID"] || lot["fid"] || "");
        if (!fidKey) return;
        fidToApiProps.set(fidKey, {
          fid:       fidKey,
          number:    lot["Número"]             || lot["Numero"]    || "",
          direccion: lot["Dirección"]           || lot["Direccion"] || "",
          block:     lot["Manzana"]             || "",
          lot:       lot["Lote"]                || "",
          area:      lot["Área (m²)"]           || lot["Area (m²)"]|| lot["Area"] || "",
          price:     lot["Precio"] ? String(lot["Precio"]).replace(/[$,]/g, "").trim() : "",
          state:     lot["Estado"]              || "disponible",
          etapa:     lot["Etapa"]               || "",
          frente:    lot["Colindancia Frente"]  || "",
          derecha:   lot["Colindancia Derecha"] || "",
          izquierda: lot["Colindancia Izquierda"]|| "",
          fondo:     lot["Colindancia Fondo"]   || "",
        });
      });
      console.log("[SHEETS] fidToApiProps cargado silenciosamente con", fidToApiProps.size, "lotes.");

      // Aplicar a entidades Cesium ya cargadas
      if (!lotesDataSource || !lotesDataSource.entities) return;
      const entities = lotesDataSource.entities.values;
      entities.forEach((entity) => {
        if (!entity.polygon || !entity.properties) return;
        const fidProp = entity.properties.fid;
        const fid = typeof fidProp?.getValue === "function" ? fidProp.getValue() : fidProp;
        if (fid == null) return;
        const api = fidToApiProps.get(String(fid));
        if (!api) return;

        const estadoValue = String(api.state || "disponible").toLowerCase();

        const setProp = (prop, val) => {
          if (!val && val !== 0) return;
          if (entity.properties[prop] && typeof entity.properties[prop].setValue === "function") {
            entity.properties[prop].setValue(val);
          } else {
            entity.properties[prop] = val;
          }
        };
        setProp("estado",    estadoValue);
        setProp("status",    estadoValue);
        setProp("precio",    api.price);
        setProp("price",     api.price);
        setProp("etapa",     api.etapa);
        setProp("frente",    api.frente);
        setProp("derecha",   api.derecha);
        setProp("izquierda", api.izquierda);
        setProp("fondo",     api.fondo);

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

      // Actualizar processedLots para filtros
      if (typeof processedLots !== "undefined") {
        processedLots.forEach(plot => {
          const api = fidToApiProps.get(String(plot.fid));
          if (api) {
            plot.status = String(api.state || "disponible").toLowerCase();
            plot.price  = parseFloat(api.price) || 0;
          }
        });
      }

      if (viewer) viewer.scene.requestRender();
      window.dispatchEvent(new CustomEvent("lotCountsUpdated", { detail: getLotCountsByStatus() }));
      console.log("[SHEETS] Colores reales aplicados silenciosamente al mapa.");
    }).catch(err => console.warn("[SHEETS] Error en fase 2:", err));

  } catch (error) {
    // console.error("Error loading lotesv2.geojson:", error);
  }
}

// Función para actualizar un lote cuando llega un evento del WebSocket
function updateLotFromWebSocket(lotData) {
  try {
    if (!lotData || !lotData.fid) {
      console.warn('updateLotFromWebSocket: lotData o fid no válido', lotData);
      return;
    }

    const fidKey = String(lotData.fid);

    // 1) Actualizar el Map fidToApiProps
    fidToApiProps.set(fidKey, lotData);
    // console.log(`[WebSocket] Lote actualizado en fidToApiProps: fid=${fidKey}`, lotData);

    // Variable para almacenar los datos mapeados (se usará en múltiples lugares)
    let mapped = null;
    let feature = null;

    // 2) Buscar y actualizar el feature en lotesData
    if (lotesData && Array.isArray(lotesData.features)) {
      feature = lotesData.features.find(
        (f) => f && f.properties && String(f.properties.fid) === fidKey
      );

      if (feature && feature.properties) {
        // Mapear campos del API -> esquema usado en la app
        mapped = {
          manzana: lotData.block ?? feature.properties.manzana,
          lote: lotData.lot ?? feature.properties.lote,
          area: lotData.area ?? feature.properties.area,
          precio: lotData.price ?? feature.properties.precio,
          estado: lotData.state ? String(lotData.state).toLowerCase() : feature.properties.estado,
          etapa: lotData.etapa ?? feature.properties.etapa,
          frente: lotData.frente ?? feature.properties.frente,
          derecha: lotData.derecha ?? feature.properties.derecha,
          izquierda: lotData.izquierda ?? feature.properties.izquierda,
          fondo: lotData.fondo ?? feature.properties.fondo,
        };

        // Actualizar propiedades fusionadas
        feature.properties.manzana = mapped.manzana;
        feature.properties.lote = mapped.lote;
        feature.properties.area = mapped.area;
        feature.properties.precio = mapped.precio;
        feature.properties.estado = mapped.estado;
        feature.properties.etapa = mapped.etapa;
        feature.properties.frente = mapped.frente;
        feature.properties.derecha = mapped.derecha;
        feature.properties.izquierda = mapped.izquierda;
        feature.properties.fondo = mapped.fondo;

        // Actualizar extras del API
        feature.properties._api = {
          id: lotData.id,
          phase: lotData.phase,
          project_id: lotData.project_id,
          updated_at: lotData.updated_at,
          is_active: lotData.is_active,
        };

        // console.log(`[WebSocket] Feature actualizado en lotesData: fid=${fidKey}`);
      } else {
        console.warn(`[WebSocket] No se encontró feature con fid=${fidKey} en lotesData`);
        // Si no encontramos el feature, crear mapped con los datos del API directamente
        mapped = {
          manzana: lotData.block ?? "",
          lote: lotData.lot ?? "",
          area: lotData.area ?? 0,
          precio: lotData.price ?? 0,
          estado: lotData.state ? String(lotData.state).toLowerCase() : "disponible",
          etapa: lotData.etapa ?? "",
          frente: lotData.frente ?? "",
          derecha: lotData.derecha ?? "",
          izquierda: lotData.izquierda ?? "",
          fondo: lotData.fondo ?? "",
        };
      }
    }

    // 3) Actualizar la entidad en Cesium si existe
    if (mapped && lotesDataSource && lotesDataSource.entities) {
      const entities = lotesDataSource.entities.values;
      const entity = entities.find((e) => {
        if (!e || !e.properties) return false;
        try {
          const entityFid = e.properties.fid && e.properties.fid.getValue
            ? e.properties.fid.getValue()
            : e.properties.fid;
          return String(entityFid) === fidKey;
        } catch (e) {
          return false;
        }
      });

      if (entity && entity.properties) {
        // Actualizar propiedades de la entidad en Cesium
        if (entity.properties.manzana) entity.properties.manzana.setValue(mapped.manzana);
        if (entity.properties.lote) entity.properties.lote.setValue(mapped.lote);
        if (entity.properties.area) entity.properties.area.setValue(mapped.area);
        if (entity.properties.precio) entity.properties.precio.setValue(mapped.precio);
        if (entity.properties.estado) entity.properties.estado.setValue(mapped.estado);
        if (entity.properties.etapa) entity.properties.etapa.setValue(mapped.etapa);
        if (entity.properties.frente) entity.properties.frente.setValue(mapped.frente);
        if (entity.properties.derecha) entity.properties.derecha.setValue(mapped.derecha);
        if (entity.properties.izquierda) entity.properties.izquierda.setValue(mapped.izquierda);
        if (entity.properties.fondo) entity.properties.fondo.setValue(mapped.fondo);

        // Actualizar color del polígono y baseMaterial según el estado
        const statusColor = getStatusColor(mapped.estado);
        if (entity.polygon && statusColor) {
          const newBase = statusColor.withAlpha(0.4);
          entity._baseMaterial = newBase;
          if (entity !== selected) {
            entity.polygon.material = newBase;
          } else {
            applySelectedLotMaterial(entity);
          }
        }

        // Actualizar el color del borde brillante (polyline) según la cuadrícula
        if (entity.polyline && entity !== selected) {
          entity.polyline.material = isLotGridActive() ? createGlowMaterial(getStatusGlowColor(mapped.estado), 0.25) : createGlowMaterial(window.Cesium.Color.WHITE.withAlpha(0.4), 0.2);
        }

        // console.log(`[WebSocket] Entidad Cesium actualizada: fid=${fidKey}`);

        // 6) Si esta entidad es la que está actualmente seleccionada, disparar evento para actualizar el modal
        if (selected && selected === entity && window.getDireccion && window.getArea && window.getPrecio && window.getEstado && window.getColindancias && window.getId && window.getPhase) {
          // Disparar evento con los datos actualizados del lote
          window.dispatchEvent(
            new CustomEvent("loteUpdated", {
              detail: {
                entity: entity,
                direccion: window.getDireccion(entity),
                area: window.getArea(entity),
                precio: window.getPrecio(entity),
                estado: window.getEstado(entity),
                boundaries: window.getColindancias(entity),
                id: window.getId(entity),
                phase: window.getPhase(entity),
              },
            })
          );
          // console.log(`[WebSocket] Evento loteUpdated disparado para lote seleccionado: fid=${fidKey}`);
        }
        
        if (typeof viewer !== 'undefined' && viewer) {
          viewer.scene.requestRender();
        }
      }
    }

    // 4) Re-procesar los lotes
    if (lotesData && Array.isArray(lotesData.features)) {
      const feats = lotesData.features || [];
      processedLots = feats
        .filter((f) => f && f.properties)
        .filter((f) => {
          const p = f.properties || {};
          const number = p.number || "";
          const lote = p.lote || "";
          return (
            number !== "Jardín" &&
            (lote !== "" || (number !== "" && !isNaN(parseInt(number))))
          );
        })
        .map((f, idx) => {
          const p = f.properties || {};
          // Normalize area
          let areaNum = 0;
          if (typeof p.area === "string") {
            areaNum = parseFloat(p.area.replace(",", ".")) || 0;
          } else if (typeof p.area === "number") {
            areaNum = p.area;
          }
          // Price
          let precioNum = 0;
          if (typeof p.precio === "string") {
            precioNum = parseFloat(p.precio.replace(",", ".")) || 0;
          } else if (typeof p.precio === "number") {
            precioNum = p.precio;
          }

          const estado = p.estado || "disponible";
          const manzana = p.manzana || "";
          const lote = p.lote || "";
          const direccion = p.direccion || p.number || "";
          const phaseOrder = normalizePhaseValue(
            (p._api && p._api.phase) || p.phase,
            direccion
          );
          const blockCode = normalizeBlockValue(manzana, direccion);
          const lotIndex = normalizeLotNumberValue(lote, direccion);
          return {
            fid: p.fid,
            id: p.direccion || `${idx}`,
            number:
              p.direccion ||
              (manzana || lote
                ? `Mz. ${manzana} - Lote ${lote}`
                : p.number || `Lote ${idx + 1}`),
            price: precioNum,
            area: areaNum,
            status: String(estado).toLowerCase(),
            phaseOrder,
            blockCode,
            lotIndex,
          };
        });

      // console.log(`[WebSocket] processedLots re-procesado, total: ${processedLots.length}`);
    }

    // 5) Actualizar la visualización si loadLotData está disponible
    if (window.loadLotData) {
      window.loadLotData();
      // console.log(`[WebSocket] Visualización actualizada para lote fid=${fidKey}`);
    }
    // Notificar conteos actualizados a la leyenda de React
    window.dispatchEvent(new CustomEvent('lotCountsUpdated', {
      detail: getLotCountsByStatus()
    }));
  } catch (error) {
    console.error('[WebSocket] Error al actualizar lote:', error, lotData);
  }
}

// Exponer función globalmente para uso desde React
window.updateLotFromWebSocket = updateLotFromWebSocket;

function setupLoteInteractions() {
  const handler = new window.Cesium.ScreenSpaceEventHandler(
    viewer.scene.canvas
  );
  window.loteClickHandler = handler; // Store reference globally

  // Grid colorido activo por defecto (coincide con materiales al cargar lotes)
  setTimeout(() => {
    setLotGridActive(true);
    // console.log("🎯 [setupLoteInteractions] Grid mode active by default (colorful lots).");
    // Notificar a React para que sincronice su estado visual
    window.dispatchEvent(new CustomEvent('gridStateChanged', { detail: { active: true } }));
  }, 100);

  // Helper functions
  window.getFid = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const p = entity.properties.fid;
    return typeof p?.getValue === "function" ? p.getValue() : p;
  };

  window.getNumber = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const number = entity.properties.number;
    return typeof number?.getValue === "function" ? number.getValue() : number;
  };

  window.getDireccion = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const props = entity.properties;
    const direccion = props.direccion;
    const manzana = props.manzana;
    const lote = props.lote;
    const valDireccion =
      typeof direccion?.getValue === "function"
        ? direccion.getValue()
        : direccion;
    const valManzana =
      typeof manzana?.getValue === "function" ? manzana.getValue() : manzana;
    const valLote =
      typeof lote?.getValue === "function" ? lote.getValue() : lote;
    if (!valDireccion && (valManzana || valLote)) {
      const mz = valManzana ? String(valManzana).trim() : "";
      const lt = valLote ? String(valLote).trim() : "";
      return `Mz. ${mz} - Lote ${lt}`.trim();
    }
    return valDireccion;
  };

  window.getArea = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const area = entity.properties.area;
    const raw = typeof area?.getValue === "function" ? area.getValue() : area;
    if (typeof raw === "string") {
      const match = raw.replace(",", ".").match(/[0-9]+(?:\.[0-9]+)?/);
      return match ? `${parseFloat(match[0]).toFixed(2)} m²` : raw;
    }
    if (typeof raw === "number") {
      return `${raw.toFixed(2)} m²`;
    }
    return raw;
  };

  window.getEstado = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const estado = entity.properties.estado || entity.properties.status;
    return typeof estado?.getValue === "function" ? estado.getValue() : estado;
  };

  window.getPrecio = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const precio = entity.properties.precio || entity.properties.price;
    const val =
      typeof precio?.getValue === "function" ? precio.getValue() : precio;
    if (val == null || val === "") return undefined;
    const num =
      typeof val === "string" ? parseFloat(val.replace(",", ".")) : val;
    return isNaN(num) ? undefined : num;
  };

  window.getId = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const _api = entity.properties._api;
    if (!_api) return undefined;
    const apiValue = typeof _api.getValue === "function" ? _api.getValue() : _api;
    return apiValue?.id;
  };

  window.getPhase = (entity) => {
    if (!entity || !entity.properties) return undefined;
    const etapa = entity.properties.etapa;
    const val = typeof etapa?.getValue === "function" ? etapa.getValue() : etapa;
    return val || "1"; // Default a 1 si no hay etapa
  };

  // Function to calculate lot boundaries/colindancias
  window.getColindancias = (entity) => {
    if (!entity || !entity.properties)
      return { left: "N/A", right: "N/A", front: "N/A", back: "N/A" };

    const getProp = (key) => {
      const prop = entity.properties[key];
      const val = typeof prop?.getValue === "function" ? prop.getValue() : prop;
      return val && String(val).trim() !== "" ? String(val) : "N/A";
    };

    return {
      left: getProp("izquierda"),
      right: getProp("derecha"),
      front: getProp("frente"),
      back: getProp("fondo"),
    };
  };

  // Point-in-polygon test
  const getPolygonPositionsCartographic = (entity) => {
    const now = window.Cesium.JulianDate.now();
    const hierarchy = window.Cesium.Property.getValueOrDefault(
      entity.polygon.hierarchy,
      now
    );
    if (!hierarchy) return [];
    const positions = hierarchy.positions || hierarchy;
    return positions.map((pos) =>
      window.Cesium.Cartographic.fromCartesian(pos)
    );
  };

  const pointInPolygon = (pointCarto, polyCartos) => {
    if (!pointCarto || !polyCartos || polyCartos.length < 3) return false;
    const x = pointCarto.longitude;
    const y = pointCarto.latitude;
    let inside = false;
    for (let i = 0, j = polyCartos.length - 1; i < polyCartos.length; j = i++) {
      const xi = polyCartos[i].longitude,
        yi = polyCartos[i].latitude;
      const xj = polyCartos[j].longitude,
        yj = polyCartos[j].latitude;
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // State variables for interactions
  let highlighted = null;
  let highlightedOriginalMaterial = null;

  // Hover interaction
  handler.setInputAction((movement) => {
    // 1) Quick attempt with drillPick
    const picked = viewer.scene.drillPick(movement.endPosition) || [];
    let entity = picked.map((p) => p.id).find((id) => id && id.polygon) || null;

    // Restore hover if we moved away or to another entity
    if (highlighted && highlighted !== entity) {
      // console.log("🔍 [Hover Exit] Entity ID:", highlighted.id);
      // console.log("   - Base material to restore:", highlighted._baseMaterial);
      // console.log("   - Is highlighted selected?", highlighted === selected);
      
      viewer.scene.canvas.style.cursor = "default";
      // Don't touch if it's the selected one
      if (highlighted !== selected) {
        highlighted.polygon.material = highlighted._baseMaterial;
        // Restaurar grosor de línea al salir
        if (highlighted.polyline) highlighted.polyline.width = 4;
      }
      highlighted = null;
      highlightedOriginalMaterial = null;
      viewer.scene.requestRender();
    }

    if (entity) {
      const fid = getFid(entity);
      if (fid !== undefined) {
        // Check if the lot is empty
        const loteValue = entity.properties.lote
          ? entity.properties.lote.getValue()
          : "";
        if (loteValue === "") {
          // For empty lots, don't hover or change cursor
          viewer.scene.canvas.style.cursor = "default";
          return;
        }

        viewer.scene.canvas.style.cursor = "pointer";
        // Avoid highlighting if already selected
        if (highlighted !== entity && entity !== selected) {
          highlighted = entity;

          // Efecto Hover: Resplandor más fuerte
          if (entity !== selected && entity.polygon) {
            const estadoProp = entity.properties?.estado;
            const estadoValue =
              typeof estadoProp?.getValue === "function"
                ? estadoProp.getValue()
                : estadoProp;

            // Efecto Hover: Resplandor más fuerte
            const gridActive = isLotGridActive();
            
            // console.log("🔍 [Hover Enter] Entity ID:", entity.id);
            // console.log("   - Estado:", estadoValue);
            // console.log("   - Grid Active:", gridActive);
            // console.log("   - Current Polygon Material BEFORE hover:", entity.polygon.material);
            // console.log("   - Entity Base Material (_baseMaterial):", entity._baseMaterial);

            if (gridActive) {
              const newColor = getStatusColor(estadoValue).withAlpha(0.7);
              // console.log("   - Setting polygon material to status color (alpha 0.7):", newColor);
              entity.polygon.material = newColor; // Hover brillando
              if (entity.polyline) {
                entity.polyline.width = 2; // Borde mucho más delgado en hover
                entity.polyline.material = createGlowMaterial(getStatusGlowColor(estadoValue), 0.35);
              }
            } else {
              const newColor = modeSelected.withAlpha(0.2);
              // console.log("   - Setting polygon material to modeSelected (alpha 0.2):", newColor);
              entity.polygon.material = newColor; // Hover oscuro
            }
            
            // console.log("   - Current Polygon Material AFTER hover:", entity.polygon.material);
          }
          viewer.scene.requestRender();
        }
      }
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // Click interaction
  handler.setInputAction((click) => {
    // Bloquear selección de lotes en modos Fotos 360 y Áreas comunes
    if (isLotSelectionBlocked()) {
      return;
    }

    const picked = viewer.scene.drillPick(click.position) || [];
    let entity = picked.map((p) => p.id).find((id) => id && id.polygon) || null;

    // Fallback by point-in-polygon
    if (!entity) {
      const cart = viewer.scene.pickPosition(click.position);
      if (cart) {
        const carto = window.Cesium.Cartographic.fromCartesian(cart);
        const polyEntity = lotesDataSource.entities.values.find((e) => {
          if (!e.polygon) return false;
          const fid = getFid(e);
          if (fid === 0) return false;
          const ring = getPolygonPositionsCartographic(e);
          return pointInPolygon(carto, ring);
        });
        if (polyEntity) entity = polyEntity;
      }
    }

    if (!entity) return;
    const fid = getFid(entity);
    if (fid === undefined) return;

    // Evitar interacción si el lote está vacío (sin número)
    const loteValue = entity.properties.lote
      ? typeof entity.properties.lote.getValue === "function"
        ? entity.properties.lote.getValue()
        : entity.properties.lote
      : "";
    if (loteValue === "") {
      return;
    }

    selectLotOnMap(entity, { toggleIfSame: true });
  }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

loadLotesData();

// Polling de Google Sheets para actualizaciones en tiempo real (cada 10 segundos)
async function pollGoogleSheet() {
  if (!lotesDataSource || !lotesDataSource.entities) return;

  try {
    const scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
    const scriptResp = await fetch(scriptUrl, { cache: "no-store" });
    if (!scriptResp.ok) return;

    const lots = await scriptResp.json() || [];
    console.log("%c🔄 [SHEETS POLL] Recibidas:", "color: cyan", lots.length, "filas -", new Date().toLocaleTimeString());
    
    if (lots.length > 0) {
      console.log("%c⚠️ [SHEETS DEBUG] Datos exactos de la primera fila:", "color: yellow; font-size: 14px", lots[0]);
      console.log("%c⚠️ [SHEETS DEBUG] Encabezados detectados:", "color: yellow; font-size: 14px", Object.keys(lots[0]));
    }

    const sheetDataByFid = {};
    lots.forEach((lot) => {
      const fidKey = String(lot['FID'] || lot['fid'] || '');
      if (fidKey) {
        sheetDataByFid[fidKey] = {
          price: lot['Precio'] ? String(lot['Precio']).replace(/[$,]/g, '').trim() : '',
          state: (lot['Estado'] || 'disponible').toLowerCase(),
          etapa: lot['Etapa'] || '',
          frente: lot['Colindancia Frente'] || '',
          derecha: lot['Colindancia Derecha'] || '',
          izquierda: lot['Colindancia Izquierda'] || '',
          fondo: lot['Colindancia Fondo'] || '',
        };
      }
    });

    const entities = lotesDataSource.entities.values;
    let anyChanged = false;

    entities.forEach(entity => {
      const entityFid = entity.properties.fid ? entity.properties.fid.getValue() : null;
      if (!entityFid) return;
      
      const sheetData = sheetDataByFid[String(entityFid)];
      if (!sheetData) return;

      const currentState = window.getEstado(entity);
      const currentPrice = window.getPrecio(entity);

      let changed = false;
      if (currentState !== sheetData.state) {
        if (entity.properties.status && typeof entity.properties.status.setValue === 'function') {
           entity.properties.status.setValue(sheetData.state);
        } else {
           entity.properties.status = sheetData.state;
        }
        if (entity.properties.estado && typeof entity.properties.estado.setValue === 'function') {
           entity.properties.estado.setValue(sheetData.state);
        } else {
           entity.properties.estado = sheetData.state;
        }
        changed = true;
        anyChanged = true;
      }
      if (String(currentPrice) !== String(sheetData.price)) {
        if (entity.properties.price && typeof entity.properties.price.setValue === 'function') {
           entity.properties.price.setValue(sheetData.price);
        } else {
           entity.properties.price = sheetData.price;
        }
        if (entity.properties.precio && typeof entity.properties.precio.setValue === 'function') {
           entity.properties.precio.setValue(sheetData.price);
        } else {
           entity.properties.precio = sheetData.price;
        }
        changed = true;
        anyChanged = true;
      }
      
      const currentEtapa = window.getPhase(entity);
      if (String(currentEtapa) !== String(sheetData.etapa || "1")) {
        if (entity.properties.etapa && typeof entity.properties.etapa.setValue === 'function') {
           entity.properties.etapa.setValue(sheetData.etapa);
        } else {
           entity.properties.etapa = sheetData.etapa;
        }
        changed = true;
        anyChanged = true;
      }

      const currentCol = window.getColindancias(entity);
      if (
        (sheetData.frente && String(currentCol.front) !== String(sheetData.frente)) || 
        (sheetData.derecha && String(currentCol.right) !== String(sheetData.derecha)) ||
        (sheetData.izquierda && String(currentCol.left) !== String(sheetData.izquierda)) ||
        (sheetData.fondo && String(currentCol.back) !== String(sheetData.fondo))
      ) {
          if (entity.properties.frente && typeof entity.properties.frente.setValue === 'function') entity.properties.frente.setValue(sheetData.frente);
          else entity.properties.frente = sheetData.frente;

          if (entity.properties.derecha && typeof entity.properties.derecha.setValue === 'function') entity.properties.derecha.setValue(sheetData.derecha);
          else entity.properties.derecha = sheetData.derecha;

          if (entity.properties.izquierda && typeof entity.properties.izquierda.setValue === 'function') entity.properties.izquierda.setValue(sheetData.izquierda);
          else entity.properties.izquierda = sheetData.izquierda;

          if (entity.properties.fondo && typeof entity.properties.fondo.setValue === 'function') entity.properties.fondo.setValue(sheetData.fondo);
          else entity.properties.fondo = sheetData.fondo;

          changed = true;
          anyChanged = true;
      }

      if (changed && entity.polygon) {
        const estadoValue = sheetData.state;
        
        // Use logic from initialization to re-color
        const newBaseMaterial = getStatusColor(estadoValue).withAlpha(0.4);
        entity._baseMaterial = newBaseMaterial;
        
        if (entity !== selected) {
          entity.polygon.material = newBaseMaterial;
          if (entity.polyline && typeof isLotGridActive === "function") {
             entity.polyline.material = isLotGridActive() ? createGlowMaterial(getStatusGlowColor(estadoValue), 0.25) : createGlowMaterial(window.Cesium.Color.WHITE.withAlpha(0.4), 0.2);
          }
        } else {
          applySelectedLotMaterial(entity);
        }
      }
    });

    // Sincronizar array local para los filtros y React UI
    if (typeof processedLots !== 'undefined') {
      processedLots.forEach(plot => {
         const fidKey = String(plot.fid);
         const sheetData = sheetDataByFid[fidKey];
         if (sheetData) {
             plot.status = sheetData.state;
             plot.price = parseFloat(sheetData.price) || 0;
         }
      });
    }

    // Trigger update for currently selected lot detail in UI if open
    if (anyChanged && selected) {
        const detail = buildLoteSelectedDetail(selected);
        window.dispatchEvent(new CustomEvent("loteSelected", { detail }));
    }

    // Force redraw map if there are any changes
    if (anyChanged && typeof viewer !== 'undefined' && viewer) {
        viewer.scene.requestRender();
    }

  } catch (err) {
    // console.error("Error polling Google Sheet", err);
  }
}

// Función para iniciar el polling evitando condiciones de carrera (superposición de peticiones)
async function startPolling() {
  await pollGoogleSheet();
  // Llamar nuevamente cada 2 segundos DESPUÉS de que termina la petición anterior
  setTimeout(startPolling, 2000);
}

// Iniciar el polling
setTimeout(startPolling, 2000);


function extractLotesPositions(lotesData) {
  const positions = [];

  if (!lotesData || !lotesData.features) {
    console.warn("No lot data to extract positions");
    return positions;
  }

  lotesData.features.forEach((feature) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates;

      // Handle different geometry types
      if (feature.geometry.type === "Polygon") {
        // For polygons, use the first ring (exterior)
        const ring = coords[0];
        ring.forEach((coord) => {
          positions.push(
            window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
          );
        });
      } else if (feature.geometry.type === "MultiPolygon") {
        // For multipolygons, iterate through all polygons and their exterior rings
        coords.forEach((polygonCoords) => {
          const ring = polygonCoords[0];
          ring.forEach((coord) => {
            positions.push(
              window.Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
            );
          });
        });
      } else if (feature.geometry.type === "Point") {
        // For points
        positions.push(
          window.Cesium.Cartesian3.fromDegrees(coords[0], coords[1])
        );
      }
    }
  });

  return positions;
}

// Global functions

function flyToLotesView(onComplete) {
  if (!viewer) return;

  if (lotesPositions.length > 0) {
    flyToView(lotesPositions, { forMarkers: false, onComplete });
    return;
  }

  // Respaldo si aún no hay geometrías cargadas
  viewer.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(-71.8925, -17.1165, 1200),
    orientation: {
      heading: window.Cesium.Math.toRadians(0.0),
      pitch: window.Cesium.Math.toRadians(-90.0),
      roll: 0.0,
    },
    duration: 2.5,
    complete: onComplete || undefined,
  });
}

const LOTES_VIEW_RANGE_MULTIPLIER = 3.8;
const MARKERS_VIEW_RANGE_MULTIPLIER = 7.5;
const MARKERS_VIEW_MIN_RANGE = 750;

function flyToView(positions, { forMarkers = false, onComplete } = {}) {
  if (!viewer || !positions || positions.length === 0) return;

  const boundingSphere = window.Cesium.BoundingSphere.fromPoints(positions);
  const rangeMultiplier = forMarkers
    ? MARKERS_VIEW_RANGE_MULTIPLIER
    : LOTES_VIEW_RANGE_MULTIPLIER;
  const minRange = forMarkers ? MARKERS_VIEW_MIN_RANGE : 0;
  const range = Math.max(boundingSphere.radius * rangeMultiplier, minRange);

  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.5,
    offset: new window.Cesium.HeadingPitchRange(
      0.0,
      window.Cesium.Math.toRadians(-90),
      range
    ),
    complete: onComplete || undefined,
  });
}

function flyToMarkersView(positions) {
  flyToView(positions, { forMarkers: true });
}

// Agrega el modelo GLB de árbol en el centro del proyecto
function addTreeModelAtCenter() {
  try {
    let positionCartesian = null;

    if (lotesPositions && lotesPositions.length > 0) {
      const boundingSphere = window.Cesium.BoundingSphere.fromPoints(lotesPositions);
      const centerCartesian = boundingSphere.center;
      const centerCartographic = window.Cesium.Cartographic.fromCartesian(centerCartesian);
      positionCartesian = window.Cesium.Cartesian3.fromRadians(
        centerCartographic.longitude,
        centerCartographic.latitude,
        0
      );
    } else {
      // Coordenadas de fallback si aún no hay posiciones de lotes
      positionCartesian = window.Cesium.Cartesian3.fromDegrees(-71.8970, -17.0998, 0);
    }

    // Configurar orientación del modelo (rotación)
    // heading: rotación horizontal (0 = Norte, Math.PI/2 = Este, Math.PI = Sur, 3*Math.PI/2 = Oeste)
    // pitch: inclinación hacia arriba/abajo (0 = horizontal, negativo = hacia arriba, positivo = hacia abajo)
    // roll: rotación sobre el eje del modelo (normalmente 0)
    const heading = window.Cesium.Math.toRadians(-42); // Rotación horizontal en grados (0 = sin rotación)
    const pitch = window.Cesium.Math.toRadians(0);    // Inclinación vertical en grados (0 = vertical)
    const roll = window.Cesium.Math.toRadians(0);    // Rotación sobre el eje del modelo (0 = sin rotación)

    // Configurar desplazamiento del modelo (en metros)
    // forwardOffset: positivo = adelante, negativo = atrás
    // rightOffset: positivo = derecha, negativo = izquierda
    // upOffset: positivo = arriba, negativo = abajo
    const forwardOffset = -0.97;  // Metros hacia adelante (positivo) o atrás (negativo)
    const rightOffset = -0.03;     // Metros hacia la derecha (positivo) o izquierda (negativo)
    const upOffset = -1;         // Metros hacia arriba (positivo) o abajo (negativo)

    // Calcular posición final con offset
    let finalPosition = positionCartesian;

    if (forwardOffset !== 0 || rightOffset !== 0 || upOffset !== 0) {
      // Convertir el centro a Cartographic para trabajar con offsets
      const centerCartographic = window.Cesium.Cartographic.fromCartesian(positionCartesian);

      // Calcular offsets en latitud y longitud (aproximación para distancias pequeñas)
      // 1 grado de latitud ≈ 111,000 metros
      // 1 grado de longitud ≈ 111,000 * cos(latitud) metros
      const metersPerDegreeLat = 111000;
      const metersPerDegreeLon = 111000 * Math.cos(centerCartographic.latitude);

      // Calcular dirección basada en el heading
      const forwardX = Math.sin(heading) * forwardOffset; // Componente Este/Oeste
      const forwardY = Math.cos(heading) * forwardOffset; // Componente Norte/Sur

      // Calcular dirección perpendicular (90 grados a la derecha del heading)
      const rightX = Math.cos(heading) * rightOffset;
      const rightY = -Math.sin(heading) * rightOffset;

      // Aplicar offsets
      const deltaLat = (forwardY + rightY) / metersPerDegreeLat;
      const deltaLon = (forwardX + rightX) / metersPerDegreeLon;
      const deltaHeight = upOffset;

      // Crear nueva posición Cartographic con latitud y longitud
      const newCartographic = new window.Cesium.Cartographic(
        centerCartographic.longitude + deltaLon,
        centerCartographic.latitude + deltaLat,
        0 // Altura inicial en 0
      );

      // Convertir a Cartesian3 primero
      finalPosition = window.Cesium.Cartographic.toCartesian(newCartographic);

      // Aplicar offset vertical usando el vector "up" (hacia arriba) desde el centro de la Tierra
      if (upOffset !== 0) {
        const upVector = window.Cesium.Cartesian3.normalize(finalPosition, new window.Cesium.Cartesian3());
        const offsetVector = window.Cesium.Cartesian3.multiplyByScalar(upVector, upOffset, new window.Cesium.Cartesian3());
        finalPosition = window.Cesium.Cartesian3.add(finalPosition, offsetVector, finalPosition);
      }
    }

    // Configurar escala del modelo
    // scale: escala general del modelo (1.0 = tamaño original, mayor = más grande)
    const modelScale = 1.01; // Aumentar este valor para hacer el modelo más ancho/grande

    const hpr = new window.Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = window.Cesium.Transforms.headingPitchRollQuaternion(
      finalPosition,
      hpr
    );

    const treeEntity = viewer.entities.add({
      name: "tree-model",
      position: finalPosition,
      orientation: orientation,
      model: {
        uri: "/glbData/tree.glb",
        minimumPixelSize: 64,
        maximumScale: 50,
        scale: modelScale,
        heightReference: window.Cesium.HeightReference.RELATIVE_TO_GROUND, // Altura relativa al terreno (permite upOffset)
      },
    });

    if (viewer) viewer.scene.requestRender();
  } catch (error) {
    console.error("Error agregando el modelo de árbol:", error);
  }
}

function hoverMarcadores() {
  if (!viewer) return;

  viewer.screenSpaceEventHandler.setInputAction(function onMouseMove(movement) {
    const picked = viewer.scene.drillPick(movement.endPosition) || [];
    let entity =
      picked
        .map((p) => p.id)
        .find((id) => id && id.id && (id.id.startsWith("marcador_") || id.id.startsWith("area_comun_"))) || null;

    // Restore hover if we moved away or to another entity
    if (highlightedMarcador && highlightedMarcador !== entity) {
      // Restore original scale
      if (highlightedMarcadorOriginalScale !== null) {
        highlightedMarcador.billboard.scale = highlightedMarcadorOriginalScale;
      }
      highlightedMarcador = null;
      highlightedMarcadorOriginalScale = null;
      viewer.scene.requestRender();
    }

    if (entity && entity.id && (entity.id.startsWith("marcador_") || entity.id.startsWith("area_comun_"))) {
      // Apply hover if not the same marker
      if (highlightedMarcador !== entity) {
        highlightedMarcador = entity;
        // Save the original scale
        highlightedMarcadorOriginalScale = entity.billboard.scale._value || 1.0;
        // Make the marker a bit bigger
        entity.billboard.scale = highlightedMarcadorOriginalScale * 1.2;
        viewer.scene.requestRender();
      }

      viewer.scene.canvas.style.cursor = "pointer";
    } else {
      viewer.scene.canvas.style.cursor = "default";
    }
  }, window.Cesium.ScreenSpaceEventType.MOUSE_MOVE);
}

/** Cierra modales/marcadores al elegir un lote, sin resetear selección ni mover la cámara. */
function clearModalsForLotSelection() {
  window.showLoteLabels = true;

  const modalOverlay = document.getElementById("modalOverlay");
  const overlay360 = document.getElementById("overlay360");
  const commonAreasModalOverlay = document.getElementById(
    "commonAreasModalOverlay"
  );
  const lotSearchModalOverlay = document.getElementById(
    "lotSearchModalOverlay"
  );
  const aroundButtonsContainer = document.getElementById(
    "aroundButtonsContainer"
  );
  const aroundModalOverlay = document.getElementById("aroundModalOverlay");

  if (modalOverlay && modalOverlay.classList.contains("show")) {
    modalOverlay.classList.remove("show");
    modalOverlay.classList.add("hide");
    setTimeout(() => {
      if (modalOverlay.classList.contains("hide")) {
        modalOverlay.style.display = "none";
      }
    }, 400);
  }
  if (overlay360) overlay360.style.display = "none";
  if (commonAreasModalOverlay) commonAreasModalOverlay.style.display = "none";
  if (lotSearchModalOverlay) lotSearchModalOverlay.style.display = "none";
  if (aroundButtonsContainer) aroundButtonsContainer.style.display = "none";
  if (aroundModalOverlay) aroundModalOverlay.style.display = "none";

  if (viewer) {
    const allEntitiesToRemove = viewer.entities.values.filter(
      (entity) =>
        entity.id &&
        (entity.id.startsWith("marcador_foto_") ||
          entity.id.startsWith("area_comun_") ||
          entity.id.startsWith("marcador_entorno_"))
    );
    allEntitiesToRemove.forEach((entity) => viewer.entities.remove(entity));
  }

  clearRoute();
  window.dispatchEvent(new CustomEvent("clearAllModals"));
}

// Sidebar — limpiar mapa/modales sin cambiar el modo del menú (evita parpadeo al activar Fotos/Áreas/etc.)
function clearViewerModeState() {
  // Mostrar etiquetas de lotes por defecto al reiniciar (vista estándar)
  window.showLoteLabels = true;

  // Hide all modals and overlays
  const modalOverlay = document.getElementById("modalOverlay");
  const overlay360 = document.getElementById("overlay360");
  const commonAreasModalOverlay = document.getElementById(
    "commonAreasModalOverlay"
  );
  const lotSearchModalOverlay = document.getElementById(
    "lotSearchModalOverlay"
  );
  const aroundButtonsContainer = document.getElementById(
    "aroundButtonsContainer"
  );
  const aroundModalOverlay = document.getElementById("aroundModalOverlay");

  if (modalOverlay) if (modalOverlay.classList.contains("show")) {
    modalOverlay.classList.remove("show");
    modalOverlay.classList.add("hide");
    // Firefox necesita display: none explícito para no bloquear clics
    setTimeout(() => {
      if (modalOverlay.classList.contains("hide")) {
        modalOverlay.style.display = "none";
      }
    }, 400); // Después de la animación
  }
  if (overlay360) overlay360.style.display = "none";
  if (commonAreasModalOverlay) commonAreasModalOverlay.style.display = "none";
  if (lotSearchModalOverlay) lotSearchModalOverlay.style.display = "none";
  if (aroundButtonsContainer) aroundButtonsContainer.style.display = "none";
  if (aroundModalOverlay) aroundModalOverlay.style.display = "none";

  clearSelectedLotHighlight();
  if (viewer) viewer.scene.requestRender();

  // Clear ALL markers when changing mode
  if (viewer) {
    const allEntitiesToRemove = viewer.entities.values.filter(
      (entity) =>
        entity.id &&
        (entity.id.startsWith("marcador_foto_") ||
          entity.id.startsWith("area_comun_") ||
          entity.id.startsWith("marcador_entorno_"))
    );
    allEntitiesToRemove.forEach((entity) => viewer.entities.remove(entity));
  }

  // Clear previous route if exists
  clearRoute();

  // Sincronizar cierre con modales React (Áreas, Entorno, Fotos 360, etc.)
  window.dispatchEvent(new CustomEvent("clearAllModals"));

  // Return to lots view
  flyToLotesView();
}

function reiniciarMenu() {
  clearViewerModeState();
  setMapViewerMode("lotes");
  window.dispatchEvent(new CustomEvent("reiniciarMenu"));
}

// Fotos 360°

async function handleFotos() {
  clearViewerModeState();
  setMapViewerMode("fotos");

  try {
    const response = await fetch("./data/fotos.geojson");
    const fotosData = await response.json();

    if (fotosData && fotosData.features) {
      const positions = [];

      fotosData.features.forEach((feature) => {
        const fid = feature.properties.fid;
        const kuulaUrl = feature.properties.kuula_url;
        const coordinates = feature.geometry.coordinates;

        viewer.entities.add({
          id: `marcador_foto_${fid}`,
          position: window.Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1]
          ),
          billboard: {
            image: "images/sidebar/360/360.png",
            width: 45,
            height: 58,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: window.Cesium.Color.WHITE,
            scale: 2.0,
            show: true,
            scaleByDistance: new window.Cesium.NearFarScalar(
              100.0,
              1.0,
              2000.0,
              0.5
            ),
            alignedAxis: window.Cesium.Cartesian3.ZERO,
            pixelOffset: window.Cesium.Cartesian2.ZERO,
            eyeOffset: window.Cesium.Cartesian3.ZERO,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            coordinates: coordinates,
            kuulaUrl: kuulaUrl,
          },
        });

        positions.push(
          window.Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1])
        );
      });

      // Configure hover events for markers
      hoverMarcadores();
      // Configure click for markers
      clickMarcadores360();

      if (positions.length > 0) {
        flyToMarkersView(positions);
      }
    }
  } catch (error) {
    console.error("Error al cargar las fotos 360°:", error);
  }
}

// Function to handle clicks on 360° markers
function clickMarcadores360() {
  if (!viewer) return;

  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(click) {
    const pickedObject = viewer.scene.pick(click.position);

    if (pickedObject && pickedObject.id) {
      const entity = pickedObject.id;
      const entityId = entity.id;

      if (entityId && entityId.startsWith("marcador_foto_")) {
        const kuulaUrl = entity.properties.kuulaUrl._value;
        openOverlay360(kuulaUrl);
      }
    }
  }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Function to open 360° overlay
function openOverlay360(kuulaUrl) {
  window.dispatchEvent(
    new CustomEvent("openPhotos360", {
      detail: { kuulaUrl: kuulaUrl },
    })
  );
}

// Function to close 360° overlay
function closeOverlay360() {
  // Only dispatch custom event for React
  // React will handle hiding the overlay
  window.dispatchEvent(new CustomEvent("closePhotos360"));
}

// Áreas comunes

async function handleAreasComunes() {
  clearViewerModeState();
  setMapViewerMode("areas");

  let areasData = null;

  try {
    // Cargar datos desde el archivo GeoJSON local
    const response = await fetch("./data/areas.geojson");
    const geojsonData = await response.json();

    areasData = geojsonData;

    if (areasData && areasData.features) {
      const positions = [];

      // Crear marcadores para cada área usando los datos del GeoJSON
      areasData.features.forEach((feature) => {
        const fid = feature.properties.fid;
        const name = feature.properties.name;
        const marker = feature.properties.marker;
        const image = feature.properties.image;
        const longitude = feature.geometry.coordinates[0];
        const latitude = feature.geometry.coordinates[1];

        // Crear marcador con imagen personalizada
        viewer.entities.add({
          id: `area_comun_${fid}`,
          position: window.Cesium.Cartesian3.fromDegrees(
            longitude,
            latitude
          ),
          billboard: {
            image: marker,
            width: 45,
            height: 58,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: window.Cesium.Color.WHITE,
            scale: 2.0,
            show: true,
            scaleByDistance: new window.Cesium.NearFarScalar(
              100.0,
              1.0,
              2000.0,
              0.5
            ),
            alignedAxis: window.Cesium.Cartesian3.ZERO,
            pixelOffset: window.Cesium.Cartesian2.ZERO,
            eyeOffset: window.Cesium.Cartesian3.ZERO,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          label: {
            text: name,
            font: 'bold 12pt "Helvetica Neue", Helvetica, Arial, sans-serif',
            fillColor: window.Cesium.Color.WHITE,
            outlineColor: window.Cesium.Color.BLACK,
            outlineWidth: 2,
            style: window.Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new window.Cesium.Cartesian2(0, 10),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition:
              new window.Cesium.DistanceDisplayCondition(0.0, 2000.0),
          },
          properties: {
            fid: fid,
            name: name,
            image: image,
            coordinates: [longitude, latitude],
          },
        });

        positions.push(
          window.Cesium.Cartesian3.fromDegrees(longitude, latitude)
        );
      });

      if (positions.length > 0) {
        flyToMarkersView(positions);
      }

      // Configure hover events for markers
      hoverMarcadores();
      // Configure click for area markers
      clickMarcadoresAreasComunes();
    }
  } catch (error) {
    console.error("Error al cargar las áreas comunes desde GeoJSON:", error);
  }

  if (areasData) {
    populateAreasModal(areasData);
  }

  // Show common areas modal
  window.dispatchEvent(
    new CustomEvent("openAreasModal", {
      detail: { areasData: areasData },
    })
  );
}
// Function to populate the common areas modal with GeoJSON data
function populateAreasModal(areasData) {
  // Pasar los datos directamente de la API sin transformar
  window.dispatchEvent(
    new CustomEvent("populateAreasModal", {
      detail: { areasData: areasData },
    })
  );
}

// Function to handle clicks on common area markers
function clickMarcadoresAreasComunes() {
  if (!viewer) return;

  viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(click) {
    const pickedObject = viewer.scene.pick(click.position);

    if (pickedObject && pickedObject.id) {
      const entity = pickedObject.id;
      const entityId = entity.id;

      if (entityId && entityId.startsWith("area_comun_")) {
        const imageUrl = entity.properties.image._value;
        if (imageUrl) {
          openAreasComunesImage(imageUrl);
        }
      }
    }
  }, window.Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

// Function to open common area image
function openAreasComunesImage(imageUrl) {
  window.dispatchEvent(
    new CustomEvent("openAreasImage", {
      detail: { imageUrl: imageUrl },
    })
  );
}

// Function to fly to common area
function flyToAreaComun(fid) {
  const entity = viewer.entities.getById(`area_comun_${fid}`);
  if (entity) {
    const position = entity.position.getValue(viewer.clock.currentTime);

    if (position) {
      const boundingSphere = new window.Cesium.BoundingSphere(position, 54);

      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 1.5,
        offset: new window.Cesium.HeadingPitchRange(
          0,
          window.Cesium.Math.toRadians(-90),
          Math.max(boundingSphere.radius * 8, MARKERS_VIEW_MIN_RANGE)
        ),
      });
    } else {
      console.error(`No se pudo obtener la posición del área común ${fid}`);
    }
  } else {
    console.error(`No se encontró el área común con fid ${fid}`);
  }
}
// Lotes

// Expose max values for React
window.getMaxPrice = function () {
  return maxPrice;
};

window.getMaxArea = function () {
  return maxArea;
};

// Expose min values for React
window.getMinPrice = function () {
  return minPrice;
};

window.getMinArea = function () {
  return minArea;
};

window.setLotRangeConfig = function (config = {}) {
  const { maxPrice: cfgMaxPrice, minPrice: cfgMinPrice, maxArea: cfgMaxArea, minArea: cfgMinArea } =
    config;

  const parseValue = (value) => {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  const normalizedMaxPrice = parseValue(cfgMaxPrice);
  const normalizedMinPrice = parseValue(cfgMinPrice);
  const normalizedMaxArea = parseValue(cfgMaxArea);
  const normalizedMinArea = parseValue(cfgMinArea);

  if (normalizedMaxPrice !== undefined) {
    maxPrice = normalizedMaxPrice;
  }
  if (normalizedMinPrice !== undefined) {
    minPrice = normalizedMinPrice;
  }
  if (normalizedMaxArea !== undefined) {
    maxArea = normalizedMaxArea;
  }
  if (normalizedMinArea !== undefined) {
    minArea = normalizedMinArea;
  }
};

function handleLotes() {
  clearViewerModeState();
  setMapViewerMode("lotes");

  // Activar etiquetas de lotes en este modo
  window.showLoteLabels = true;

  // Volar a la vista de lotes
  flyToLotesView();

  // Dispatch event to open lot search modal
  window.dispatchEvent(new CustomEvent("openLotSearchModal"));
}

// Lot filtering and search functions
function applyFilters(lots) {
  const priceMin = parseInt(
    document.querySelector('input[name="priceMin"]')?.value || 0
  );
  const priceMax = parseInt(
    document.querySelector('input[name="priceMax"]')?.value || maxPrice
  );
  const areaMin = parseInt(
    document.querySelector('input[name="areaMin"]')?.value || 0
  );
  const areaMax = parseInt(
    document.querySelector('input[name="areaMax"]')?.value || maxArea
  );

  const selectedStatus = Array.from(
    document.querySelectorAll(".status-btn.active")
  ).map((btn) => btn.getAttribute("data-status"));

  return lots.filter((lot) => {
    // Price filter - price range
    if (lot.price < priceMin || lot.price > priceMax) return false;

    // Area filter - area range
    if (lot.area < areaMin || lot.area > areaMax) return false;

    // Status filter — if nothing selected, show nothing; otherwise must match
    if (!selectedStatus.includes(lot.status))
      return false;

    return true;
  });
}

function applySorting(lots) {
  const sortSelect = document.getElementById("sortSelect");
  const sortValue = sortSelect ? sortSelect.value : "area-asc";

  return lots.sort((a, b) => {
    switch (sortValue) {
      case "area-asc":
        return a.area - b.area;
      case "area-desc":
        return b.area - a.area;
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "number-asc":
        return compareLotsByLocation(a, b, true);
      case "number-desc":
        return compareLotsByLocation(a, b, false);
      default:
        return 0;
    }
  });
}

function renderLotCards(lots) {
  const container = document.getElementById("lotCardsContainer");
  if (!container) return;

  container.innerHTML = "";

  lots.forEach((lot) => {
    const card = document.createElement("div");
    card.className = "lot-card";
    card.innerHTML = `
              <div class="lot-card-header">${lot.number}</div>
              <div class="lot-card-separator"></div>
              <div class="lot-card-status ${lot.status}">${getStatusLabel(
      lot.status
    )}</div>
              <div class="lot-card-details">
                <span class="lot-card-label">Precio</span>
                <span class="lot-card-value">$ ${lot.price.toLocaleString()}</span>
              </div>
              <div class="lot-card-details">
                <span class="lot-card-label">Área</span>
                <span class="lot-card-value">${lot.area.toFixed(2)} m²</span>
              </div>
              <button type="button" class="lot-card-view-more-btn" onclick="handleLotCardClick(${lot.fid})">
                Ver <i class="fas fa-arrow-right"></i>
              </button>
            `;
    container.appendChild(card);
  });
}

window.handleLotCardClick = function (lotRef) {
  const lotEntity =
    typeof lotRef === "number" || /^\d+$/.test(String(lotRef))
      ? findLotEntityByFid(lotRef)
      : findLotEntityByNumber(lotRef);

  if (lotEntity) {
    selectLotOnMap(lotEntity, { toggleIfSame: false });
    return;
  }

  console.error("No se encontró la entidad del lote:", lotRef);
};

function loadLotData() {
  try {
    if (!processedLots || processedLots.length === 0) {
      console.error(
        "Datos de lotes procesados no están disponibles. Asegúrate de que loadLotesData() se ejecute primero."
      );
      return;
    }

    // Aplicar filtros
    const filteredLots = applyFilters(processedLots);

    // Apply sorting
    const sortedLots = applySorting(filteredLots);

    // Update results count
    const resultsCount = document.getElementById("resultsCount");
    if (resultsCount) {
      resultsCount.textContent = `Mostrando (${sortedLots.length}) lotes`;
    }

    // Render lot cards
    renderLotCards(sortedLots);
  } catch (e) {
    console.error("No se pudo procesar datos de lotes", e);
  }
}

// Entorno

async function handleEntorno() {
  clearViewerModeState();
  setMapViewerMode("entorno");

  // Ensure button container is visible
  const aroundButtonsContainer = document.getElementById(
    "aroundButtonsContainer"
  );
  if (aroundButtonsContainer) {
    aroundButtonsContainer.style.display = "flex";
  }

  // Dispatch event to show environment buttons
  window.dispatchEvent(new CustomEvent("openEntornoButtons"));

  // Load all markers from entorno.geojson
  await loadEntornoMarkers();

  // Activate "Todos" button initially
  updateEntornoButtonsState("Todos");
}

// Function to return to initial environment state (without closing everything)
function resetEntornoToInitialState() {
  // Close modal if open
  const aroundModalOverlay = document.getElementById("aroundModalOverlay");
  if (aroundModalOverlay) {
    aroundModalOverlay.style.display = "none";
  }

  // Ensure button container is visible
  const aroundButtonsContainer = document.getElementById(
    "aroundButtonsContainer"
  );
  if (aroundButtonsContainer) {
    aroundButtonsContainer.style.display = "flex";
  }

  // Clear previous route
  clearRoute();

  // Clear existing markers
  const entitiesToRemove = viewer.entities.values.filter(
    (entity) => entity.id && entity.id.startsWith("marcador_entorno_")
  );
  entitiesToRemove.forEach((entity) => viewer.entities.remove(entity));

  // Reload all markers
  loadEntornoMarkers();

  // Fly to show all markers
  const positions = [];
  viewer.entities.values.forEach((entity) => {
    if (entity.id && entity.id.startsWith("marcador_entorno_")) {
      const position = entity.position.getValue(viewer.clock.currentTime);
      if (position) {
        positions.push(position);
      }
    }
  });

  if (positions.length > 0) {
    flyToMarkersView(positions);
  }

  // Activate "Todos" button
  updateEntornoButtonsState("Todos");
}
// Clear route
function clearRoute() {
  if (window.currentRoute) {
    viewer.entities.remove(window.currentRoute);
    window.currentRoute = null;
  }
}
// Function to filter environment markers by type
async function filterEntornoByType(tipo) {
  // Close location modal if open
  const locationModal = document.getElementById("aroundModalOverlay");
  if (locationModal) locationModal.style.display = "none";

  // Clear previous route if exists
  clearRoute();

  // Remover marcadores del entorno existentes
  const entitiesToRemove = viewer.entities.values.filter(
    (entity) => entity.id && entity.id.startsWith("marcador_entorno_")
  );
  entitiesToRemove.forEach((entity) => viewer.entities.remove(entity));

  // Si es "Todos", cargar sin filtro, sino filtrar por tipo
  const filterType = tipo === "Todos" ? null : tipo;
  await loadEntornoMarkers(filterType);

  // Reconfigurar event handlers después de cargar nuevos marcadores
  hoverMarcadores();
  clickMarcadoresAround();

  // Actualizar estado visual de los botones
  updateEntornoButtonsState(tipo);
}

// Function to load environment markers from entorno.geojson
async function loadEntornoMarkers(filterType = null) {
  try {
    const response = await fetch("./data/entorno.geojson");
    const entornoData = await response.json();

    if (entornoData && entornoData.features) {
      const positions = [];

      // Filtrar features por tipo si se especifica
      const filteredFeatures = filterType
        ? entornoData.features.filter(
          (feature) => feature.properties.tipo === filterType
        )
        : entornoData.features;

      filteredFeatures.forEach((feature) => {
        const fid = feature.properties.fid;
        const tipo = feature.properties.tipo;
        const nombre = feature.properties.nombre;
        const icono = feature.properties.icono;
        const coordinates = feature.geometry.coordinates;
        const imagen = feature.properties.imagen;

        viewer.entities.add({
          id: `marcador_entorno_${fid}`,
          position: window.Cesium.Cartesian3.fromDegrees(
            coordinates[0],
            coordinates[1]
          ),
          billboard: {
            image: icono,
            width: 45,
            height: 58,
            verticalOrigin: window.Cesium.VerticalOrigin.BOTTOM,
            horizontalOrigin: window.Cesium.HorizontalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            color: window.Cesium.Color.WHITE,
            scale: 1.3,
            show: true,
            alignedAxis: window.Cesium.Cartesian3.ZERO,
            pixelOffset: window.Cesium.Cartesian2.ZERO,
            eyeOffset: window.Cesium.Cartesian3.ZERO,
            heightReference: window.Cesium.HeightReference.CLAMP_TO_GROUND,
          },
          properties: {
            type: "entorno",
            fid: fid,
            tipo: tipo,
            nombre: nombre,
            coordinates: coordinates,
            imagen: imagen,
          },
        });

        positions.push(
          window.Cesium.Cartesian3.fromDegrees(coordinates[0], coordinates[1])
        );
      });

      // Hover marcadores
      hoverMarcadores();

      // Click marcadores entorno
      clickMarcadoresAround();

      // Adjust camera to show all markers
      flyToMarkersView(positions);
    }
  } catch (error) {
    console.error("Error al cargar los marcadores del entorno:", error);
  }
}

// Function to configure environment marker interactions
function clickMarcadoresAround() {
  // Remover handler anterior si existe
  if (window.entornoClickHandler) {
    viewer.screenSpaceEventHandler.removeInputAction(
      window.Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
  }

  // Click event for environment markers
  window.entornoClickHandler = viewer.screenSpaceEventHandler.setInputAction(
    function onLeftClick(movement) {
      const pickedObject = viewer.scene.pick(movement.position);

      // If nothing was clicked, exit
      if (!window.Cesium.defined(pickedObject)) return;

      // Verificar si el clic fue sobre un Entity con billboard
      if (pickedObject.id && pickedObject.id.billboard) {
        const locationId = pickedObject.id.id;
        const locationProperties = pickedObject.id.properties;

        // Si es un marcador del entorno, mostrar modal
        if (locationId && locationId.startsWith("marcador_entorno_")) {
          const position = locationProperties.coordinates._value;
          const nombre = locationProperties.nombre._value;
          const tipo = locationProperties.tipo._value;
          const imagen = locationProperties.imagen._value;

          // Show modal with location information
          showLocationModal(nombre, position, tipo, imagen);
        }
      }
    },
    window.Cesium.ScreenSpaceEventType.LEFT_CLICK
  );
}

// Function to show location modal
function showLocationModal(title, coordinates, tipo = null, imagen = null) {
  // Remove previous route if exists
  clearRoute();

  // Asegurar que el modal de entorno sea visible
  const aroundModalOverlay = document.getElementById("aroundModalOverlay");
  if (aroundModalOverlay) {
    aroundModalOverlay.style.display = "flex";
  }

  // Disparar evento para abrir el modal de entorno
  window.dispatchEvent(
    new CustomEvent("openEntornoModal", {
      detail: {
        title: title,
        coordinates: coordinates,
        tipo: tipo,
        imagen: imagen,
      },
    })
  );
}

/** [lon, lat] del marcador principal del proyecto (Mykonos / centro de lotesv2). */
function getProjectMainMarkerLonLat() {
  if (viewer) {
    const marker = viewer.entities.getById("mykonos_marker");
    if (marker?.position) {
      const pos = marker.position.getValue(viewer.clock.currentTime);
      if (pos) {
        const carto = window.Cesium.Cartographic.fromCartesian(pos);
        return [
          window.Cesium.Math.toDegrees(carto.longitude),
          window.Cesium.Math.toDegrees(carto.latitude),
        ];
      }
    }
  }

  if (lotesPositions.length > 0) {
    const center = window.Cesium.BoundingSphere.fromPoints(lotesPositions).center;
    const carto = window.Cesium.Cartographic.fromCartesian(center);
    return [
      window.Cesium.Math.toDegrees(carto.longitude),
      window.Cesium.Math.toDegrees(carto.latitude),
    ];
  }

  return [-71.8925, -17.1165];
}

// Function to calculate and show route
async function calculateRoute(token, start, end, tipo = null) {
  try {
    // Obtener la API key desde la variable global
    const openRouteServiceKey = token;

    if (!openRouteServiceKey) {
      console.error(
        "OpenRouteService API key no encontrada. Asegúrate de definir VITE_OPEN_ROUTE_SERVICE_KEY en tu archivo .env"
      );
      return false;
    }

    const response = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?` +
      `api_key=${openRouteServiceKey}&` +
      `start=${start[0]},${start[1]}&` +
      `end=${end[0]},${end[1]}`
    );

    if (!response.ok) {
      throw new Error(`Error en la petición: ${response.status}`);
    }

    const data = await response.json();
    const coords = data.features[0].geometry.coordinates;
    const positions = [];
    coords.forEach((coord) => {
      positions.push(coord[0], coord[1]);
    });

    // Extract time and distance information
    const duration = data.features[0].properties.summary.duration; // in seconds
    const distance = data.features[0].properties.summary.distance; // in meters
    const durationMinutes = Math.round(duration / 60); // convert to minutes

    // Remove previous route if exists
    clearRoute();

    // Select color according to type
    const colorMap = {
      Playas: new window.Cesium.Color(251 / 255, 224 / 255, 73 / 255, 1.0),
      Restaurantes: new window.Cesium.Color(
        29 / 255,
        183 / 255,
        121 / 255,
        1.0
      ),
      Hoteles: new window.Cesium.Color(251 / 255, 195 / 255, 145 / 255, 1.0),
      Turismo: new window.Cesium.Color(251 / 255, 73 / 255, 73 / 255, 1.0),
      Seguridad: new window.Cesium.Color(73 / 255, 156 / 255, 251 / 255, 1.0),
    };

    const routeColor =
      tipo && colorMap[tipo]
        ? colorMap[tipo]
        : new window.Cesium.Color(0.1, 0.1, 0.1, 1.0);

    const boundingSphere = window.Cesium.BoundingSphere.fromPoints(
      window.Cesium.Cartesian3.fromDegreesArray(positions)
    );
    // Crear la nueva ruta
    window.currentRoute = viewer.entities.add({
      name: "Ruta",
      polyline: {
        positions: window.Cesium.Cartesian3.fromDegreesArray(positions),
        width: 15,
        material: routeColor,
        clampToGround: true,
        shadows: window.Cesium.ShadowMode.DISABLED,
      },
    });

    const routeViewRange = Math.max(
      boundingSphere.radius * MARKERS_VIEW_RANGE_MULTIPLIER,
      MARKERS_VIEW_MIN_RANGE
    );
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 2,
      offset: new window.Cesium.HeadingPitchRange(
        window.Cesium.Math.toRadians(0),
        window.Cesium.Math.toRadians(-35),
        routeViewRange
      ),
    });

    // Return route information
    return {
      success: true,
      duration: durationMinutes,
      distance: Math.round(distance),
    };
  } catch (error) {
    console.error("Error al calcular la ruta:", error);
    return false;
  }
}

// Function to update visual state of environment buttons
function updateEntornoButtonsState(activeType) {
  const buttons = document.querySelectorAll(
    "#aroundButtonsContainer .around-button"
  );

  buttons.forEach((button) => {
    const buttonText = button.querySelector(".around-button span").textContent;

    if (buttonText === activeType) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}

// Video

function handleVideo() {
  clearViewerModeState();
  setMapViewerMode("video");

  // Dispatch event to show video overlay
  window.dispatchEvent(new CustomEvent("openVideoOverlay"));
}

// Function to close video
function closeVideoOverlay() {
  const video = document.getElementById("videoPlayer");
  if (video) {
    video.pause();
    video.currentTime = 0;
  }

  // Desactivar botón Video en topbar/menú móvil (estado React vía mapViewerModeChanged)
  setMapViewerMode("lotes");
}

// Función para seleccionar un lote por entidad (usada desde URL highlight)
function selectLotByEntity(entity) {
  if (!entity || !entity.polygon) return;
  selectLotOnMap(entity, { toggleIfSame: false });
}

// Expose additional functions globally
window.hoverMarcadores = hoverMarcadores;
window.clearRoute = clearRoute;
window.flyToView = flyToView;
window.flyToMarkersView = flyToMarkersView;
window.reiniciarMenu = reiniciarMenu;
window.handleFotos = handleFotos;
window.handleAreasComunes = handleAreasComunes;
window.handleLotes = handleLotes;
window.handleEntorno = handleEntorno;
window.handleVideo = handleVideo;
window.selectLotByEntity = selectLotByEntity;
window.clickMarcadores360 = clickMarcadores360;
window.clickMarcadoresAreasComunes = clickMarcadoresAreasComunes;
window.openOverlay360 = openOverlay360;
window.closeOverlay360 = closeOverlay360;
window.populateAreasModal = populateAreasModal;
window.openAreasComunesImage = openAreasComunesImage;
window.loadLotData = loadLotData;
window.applyFilters = applyFilters;
window.applySorting = applySorting;
window.renderLotCards = renderLotCards;
window.filterEntornoByType = filterEntornoByType;
window.loadEntornoMarkers = loadEntornoMarkers;
window.clickMarcadoresAround = clickMarcadoresAround;
window.showLocationModal = showLocationModal;
window.calculateRoute = calculateRoute;
window.getProjectMainMarkerLonLat = getProjectMainMarkerLonLat;
window.updateEntornoButtonsState = updateEntornoButtonsState;
window.resetEntornoToInitialState = resetEntornoToInitialState;
window.closeVideoOverlay = closeVideoOverlay;
window.flyToAreaComun = flyToAreaComun;

// Bottom bar

function moveCameraUp() {
  const cam = viewer.camera;
  const getStep = () => Math.max(5.0, cam.positionCartographic.height * 0.1);

  const currentPosition = cam.position;
  const newPosition = window.Cesium.Cartesian3.add(
    currentPosition,
    window.Cesium.Cartesian3.multiplyByScalar(
      cam.up,
      getStep(),
      new window.Cesium.Cartesian3()
    ),
    new window.Cesium.Cartesian3()
  );

  cam.flyTo({
    destination: newPosition,
    duration: 1.0,
  });
}

function moveCameraDown() {
  const cam = viewer.camera;
  const getStep = () => Math.max(5.0, cam.positionCartographic.height * 0.1);

  const currentPosition = cam.position;
  const newPosition = window.Cesium.Cartesian3.subtract(
    currentPosition,
    window.Cesium.Cartesian3.multiplyByScalar(
      cam.up,
      getStep(),
      new window.Cesium.Cartesian3()
    ),
    new window.Cesium.Cartesian3()
  );

  cam.flyTo({
    destination: newPosition,
    duration: 1.0,
  });
}

function zoomIn() {
  const cam = viewer.camera;
  const getZoomStep = () =>
    Math.max(1.0, cam.positionCartographic.height * 0.15);

  const currentHeight = cam.positionCartographic.height;
  const newHeight = Math.max(10, currentHeight - getZoomStep());

  cam.flyTo({
    destination: window.Cesium.Cartesian3.fromRadians(
      cam.positionCartographic.longitude,
      cam.positionCartographic.latitude,
      newHeight
    ),
    duration: 1.0,
  });
}

function zoomOut() {
  const cam = viewer.camera;
  const getZoomStep = () =>
    Math.max(1.0, cam.positionCartographic.height * 0.15);

  const currentHeight = cam.positionCartographic.height;
  const newHeight = currentHeight + getZoomStep();

  cam.flyTo({
    destination: window.Cesium.Cartesian3.fromRadians(
      cam.positionCartographic.longitude,
      cam.positionCartographic.latitude,
      newHeight
    ),
    duration: 1.0,
  });
}

function goHome(onComplete) {
  try {
    flyToLotesView(onComplete);
  } catch (error) {
    console.error("Error al volar a la vista superior:", error);
  }
}

function view3D() {
  if (!viewer) return;

  if (lotesPositions.length > 0) {
    const boundingSphere = window.Cesium.BoundingSphere.fromPoints(lotesPositions);
    viewer.camera.flyToBoundingSphere(boundingSphere, {
      duration: 2.0,
      offset: new window.Cesium.HeadingPitchRange(
        window.Cesium.Math.toRadians(35),
        window.Cesium.Math.toRadians(-38),
        Math.max(boundingSphere.radius * 4.5, 350)
      ),
    });
    return;
  }

  viewer.camera.flyTo({
    destination: window.Cesium.Cartesian3.fromDegrees(-71.8925, -17.1165, 900),
    orientation: {
      heading: window.Cesium.Math.toRadians(35),
      pitch: window.Cesium.Math.toRadians(-38),
      roll: 0,
    },
    duration: 2.0,
  });
}

// Update labels when window is resized
function updateLabelsOnResize() {
  if (window.polygonLabels && window.polygonLabels.length > 0) {
    window.polygonLabels.forEach(labelEntity => {
      if (labelEntity.label) {
        labelEntity.label.font = getLabelFont();
        labelEntity.label.scale = getLabelScale();
        labelEntity.label.outlineWidth = getLabelOutlineWidth();
      }
    });
  }
}

// Add resize listener
window.addEventListener('resize', updateLabelsOnResize);

function toggleGrid() {
  const willBeActive = !isLotGridActive();
  // console.log("🔄 [toggleGrid] Toggling grid. Grid will be active:", willBeActive);

  // Actualizar el estado interno siempre (incluso si no hay datasource cargado aún)
  setLotGridActive(willBeActive);

  // Si no hay datasource, el estado queda guardado y se aplicará cuando se carguen los lotes
  if (!lotesDataSource) {
    // console.log("⚠️ [toggleGrid] lotesDataSource no disponible aún; estado guardado para cuando se cargue.");
    return willBeActive;
  }

  const entitiesAll = lotesDataSource.entities.values.filter((e) => e.polygon);

  entitiesAll.forEach((e) => {
    const loteValue = e.properties.lote ? e.properties.lote.getValue() : "";
    if (loteValue === "") {
      e.polygon.material = getStatusColor("disponible").withAlpha(0);
      e._baseMaterial = getStatusColor("disponible").withAlpha(0);
      return;
    }

    if (willBeActive) {
      // Activating grid: colorful status colors
      const estadoProp = e.properties?.estado;
      const estadoValue =
        typeof estadoProp?.getValue === "function"
          ? estadoProp.getValue()
          : estadoProp;
      e._baseMaterial = getStatusColor(estadoValue).withAlpha(0.4);
      if (e !== selected) {
        e.polygon.material = e._baseMaterial;
      }
      if (e.polyline) {
        e.polyline.show = true;
        e.polyline.material = createGlowMaterial(getStatusGlowColor(estadoValue), 0.25);
      }
    } else {
      // Deactivating grid: semi-transparent white/transparent
      if (e !== selected) {
        e.polygon.material = modeSelected.withAlpha(0.1);
      }
      e._baseMaterial = modeSelected.withAlpha(0.1);
      if (e.polyline) {
        e.polyline.show = false;
      }
    }
  });

  if (viewer) viewer.scene.requestRender();
  return willBeActive;
}

// -------------------------------------------------------
// Filtro de lotes por estado (leyenda interactiva)
// activeStatuses: array de strings, ej: ["disponible","reservado"]
// Si el array está vacío o contiene los 4 estados → sin filtro (todos visibles)
// -------------------------------------------------------
function filterLotsByStatus(activeStatuses) {
  if (!lotesDataSource) return;

  const allKeys = ["disponible", "reservado", "vendido", "negociacion"];
  const showAll =
    !activeStatuses ||
    activeStatuses.length === 0 ||
    activeStatuses.length === allKeys.length;

  const entitiesAll = lotesDataSource.entities.values.filter((e) => e.polygon);

  entitiesAll.forEach((e) => {
    // Lotes sin número de lote asignado → siempre invisible
    const loteValue = e.properties.lote ? e.properties.lote.getValue() : "";
    if (loteValue === "") return;

    const estadoProp = e.properties?.estado;
    const estadoValue =
      typeof estadoProp?.getValue === "function"
        ? estadoProp.getValue()
        : estadoProp;

    const normalizedEstado = normalizeLotStatus(estadoValue);
    const shouldShow = showAll || activeStatuses.includes(normalizedEstado);

    // Solo aplica si la cuadrícula está activa; de lo contrario Cesium ya los tiene ocultos
    if (isLotGridActive()) {
      e.polygon.show = shouldShow;
      if (e.label) e.label.show = shouldShow;
    }
  });

  if (viewer) viewer.scene.requestRender();
}

// Devuelve el conteo de lotes por estado: { disponible: N, reservado: N, vendido: N, negociacion: N }
function getLotCountsByStatus() {
  const counts = { disponible: 0, reservado: 0, vendido: 0, negociacion: 0 };
  if (!lotesDataSource) return counts;

  const entitiesAll = lotesDataSource.entities.values.filter((e) => e.polygon);

  entitiesAll.forEach((e) => {
    const loteValue = e.properties.lote ? e.properties.lote.getValue() : "";
    if (loteValue === "") return;

    const estadoProp = e.properties?.estado;
    const estadoValue =
      typeof estadoProp?.getValue === "function"
        ? estadoProp.getValue()
        : estadoProp;

    const key = normalizeLotStatus(estadoValue);
    if (key in counts) counts[key]++;
  });

  return counts;
}

window.filterLotsByStatus = filterLotsByStatus;
window.getLotCountsByStatus = getLotCountsByStatus;

window.moveCameraUp = moveCameraUp;
window.moveCameraDown = moveCameraDown;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.goHome = goHome;
window.view3D = view3D;
window.toggleGrid = toggleGrid;

// Función para controlar la hora del día y posicionar el sol
function setTimeOfDay(hour) {
  if (!viewer) return;

  try {
    // Asegurar que la hora esté en el rango 0-24
    hour = Math.max(0, Math.min(24, hour));

    // Obtener la posición central del proyecto para calcular la hora solar
    let centerPosition = null;
    if (lotesPositions.length > 0) {
      const boundingSphere = window.Cesium.BoundingSphere.fromPoints(lotesPositions);
      centerPosition = boundingSphere.center;
    } else {
      centerPosition = window.Cesium.Cartesian3.fromDegrees(-71.8925, -17.1165, 0);
    }

    // Convertir a Cartographic para obtener latitud
    const centerCartographic = window.Cesium.Cartographic.fromCartesian(centerPosition);

    // Crear una fecha base (hoy) con la hora especificada
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // Extraer horas y minutos de la hora decimal
    const hours = Math.floor(hour);
    const minutes = Math.floor((hour - hours) * 60);

    // Crear fecha con la hora especificada en hora LOCAL (no UTC)
    // Esto asegura que la hora que se muestra sea la hora real del día
    const dateTime = new Date(year, month, day, hours, minutes, 0);

    // Convertir a JulianDate de Cesium
    const julianDate = window.Cesium.JulianDate.fromDate(dateTime);

    // Configurar el reloj de Cesium con la hora especificada
    viewer.clock.currentTime = julianDate;
    viewer.clock.shouldAnimate = false; // No animar automáticamente

    // Habilitar iluminación del globo y sol
    viewer.scene.globe.enableLighting = true;
    viewer.scene.sun.show = true;
    viewer.scene.moon.show = true;

    // Asegurar que el sol se actualice según la hora
    viewer.scene.globe.dynamicAtmosphereLighting = true;
    viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;

    // Forzar actualización de la escena
    viewer.scene.requestRender();
  } catch (error) {
    console.error("Error al establecer la hora del día:", error);
  }
}

// Exponer función globalmente
window.setTimeOfDay = setTimeOfDay;

// Inicializar con hora del mediodía por defecto
setTimeOfDay(12);
