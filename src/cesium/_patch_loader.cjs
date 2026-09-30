const fs   = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'cesium-init.js');
let content = fs.readFileSync(filePath, 'utf8');

// ── Extraer el cuerpo interno de loadLotesData ────────────────────────────────
// Necesitamos el bloque desde loadLotesData hasta el comentario de cierre
const FUNC_MARKER   = 'async function loadLotesData() {';
const AFTER_MARKER  = '\r\n// Función para actualizar un lote cuando llega un evento del WebSocket';

const funcStart = content.indexOf(FUNC_MARKER);
const funcEnd   = content.indexOf(AFTER_MARKER);

if (funcStart === -1 || funcEnd === -1) {
  console.error('No se encontró la función. funcStart=', funcStart, 'funcEnd=', funcEnd);
  process.exit(1);
}

// Lo que hay antes de la función y después de ella
const before = content.substring(0, funcStart);
const after  = content.substring(funcEnd);

// ── Extraer el cuerpo de la función para reusar los bloques que no cambian ───
// Los bloques que queremos reusar: labels, polygon styling, cesiumReady dispatch
// Están después de "await lotesDataSource.load(lotesData);"
const funcBody = content.substring(funcStart, funcEnd);

// Encontrar el punto de corte: después de "await lotesDataSource.load(lotesData);"
const splitMarker = 'await lotesDataSource.load(lotesData);\r\n';
const splitIdx = funcBody.indexOf(splitMarker);
if (splitIdx === -1) {
  console.error('No se encontró el punto de corte.');
  process.exit(1);
}

// El resto del cuerpo original (labels, polygon styling, cesiumReady, etc.)
const remainingBody = funcBody.substring(splitIdx + splitMarker.length);
// Quitar el "  } catch (error) {..." del final (último bloque)
// remainingBody termina con:  "  } catch (error) {\r\n    // console.error...\r\n  }\r\n}"
// Lo dejamos tal cual porque va dentro del try principal

console.log('Punto de corte encontrado. Tamaño del bloque restante:', remainingBody.length);
console.log('Primeros 100 chars del bloque restante:', JSON.stringify(remainingBody.substring(0, 100)));

// ── Construir el nuevo código ─────────────────────────────────────────────────
const newCode = FUNC_MARKER + `
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
      throw new Error(\`No se pudo cargar lotesv2.geojson (\${resp.status})\`);
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
          id: p.direccion || \`\${idx}\`,
          number:
            p.direccion ||
            (manzana || lote
              ? \`Mz. \${manzana} - Lote \${lote}\`
              : p.number || \`Lote \${idx + 1}\`),
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

` + remainingBody.replace(
  // Reemplazar el cierre } catch(error) del try original para insertar la Fase 2 antes
  '  } catch (error) {\r\n    // console.error("Error loading lotesv2.geojson:", error);\r\n  }\r\n}',
  `
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
}`
);

content = before + newCode + after;
fs.writeFileSync(filePath, content, 'utf8');
console.log('PATCH COMPLETO. Lines:', content.split('\n').length, 'Bytes:', content.length);
