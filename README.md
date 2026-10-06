# Proyecto Inmobiliario 3D - Nautia Condominios

Aplicacion web interactiva para visualizar y explorar un proyecto inmobiliario en un entorno 3D. El usuario puede recorrer el mapa, consultar lotes, revisar areas comunes, explorar puntos cercanos del entorno, abrir fotos 360, reproducir un video del proyecto y generar cotizaciones desde la informacion visible de cada lote.

El visor esta orientado a la presentacion comercial de proyectos inmobiliarios, combinando navegacion 3D, datos geoespaciales y herramientas de consulta para que el visitante pueda entender la ubicacion, disponibilidad y caracteristicas del desarrollo. La experiencia permite pasar de una vista general del condominio a informacion especifica de cada lote, filtrando por precio, area o estado, y abriendo modales con datos comerciales claros como area, precio, etapa, colindancias y disponibilidad.

Uno de los modulos principales es el cotizador, que permite simular una propuesta comercial directamente desde un lote disponible. En esta seccion se muestran el precio de lista, los descuentos aplicados y el precio final; ademas, el usuario puede configurar descuentos por porcentaje o monto, elegir la forma de pago, definir separacion, cuota inicial, numero de cuotas y fecha del primer pago. Con esos datos, la app genera un cronograma de pagos con fechas, porcentajes y montos, y ofrece acciones para imprimir, guardar o generar la cotizacion en PDF.

La aplicacion tambien complementa la venta con contenido visual y de ubicacion: incluye areas comunes con imagenes y enfoque en el mapa, recorridos 360, video del proyecto y una seccion de entorno donde se pueden filtrar puntos cercanos como playas, restaurantes, hoteles, zonas turisticas o servicios de seguridad. Desde cada punto del entorno se puede calcular una ruta estimada hacia el proyecto o abrir la ubicacion en Google Maps.

## Funcionalidades visibles

### Visor 3D del proyecto

- Mapa 3D interactivo del condominio usando Cesium.
- Navegacion libre por el terreno con rotacion, desplazamiento y zoom.
- Pantalla inicial de carga del entorno 3D.
- Panel de instrucciones para explicar los controles en desktop y movil.
- Boton de vista inicial para volver rapidamente al encuadre principal.
- Controles de camara para subir, bajar, acercar, alejar y activar vista 3D.
- Alternancia de cuadricula para mostrar u ocultar la capa visual de lotes.
- Resaltado visual de lotes al interactuar con el mapa.
- Adaptacion responsive para escritorio, tablet y movil.

### Consulta de lotes

- Visualizacion de lotes sobre el mapa con colores por estado.
- Leyenda interactiva con conteo total de lotes.
- Filtros visuales por estado: disponible, reservado, vendido y negociacion.
- Seleccion de lotes directamente desde el visor.
- Modal de informacion del lote seleccionado.
- Datos visibles del lote: identificador, estado, precio, area, etapa y colindancias.
- Boton para contactar cuando el lote esta disponible.
- Boton de cotizacion para lotes disponibles.
- Soporte para abrir un lote destacado desde URL mediante parametro de resaltado.

### Busqueda y filtros de lotes

- Panel de busqueda de lotes.
- Filtro por rango de precio.
- Filtro por rango de area.
- Filtro por estado del lote.
- Ordenamiento por area, precio y numero de lote.
- Boton para limpiar filtros.
- Listado de resultados con tarjetas de lotes.
- Sincronizacion entre el listado de resultados y la seleccion en el mapa.

### Cotizador

- Cotizacion desde el modal de un lote disponible.
- Resumen de precio de lista, descuento y precio final.
- Aplicacion de descuentos por porcentaje o monto.
- Presets visibles de descuento.
- Seleccion de forma de pago: credito directo o contado.
- Configuracion de separacion, cuota inicial, numero de cuotas y fecha de primer pago.
- Calculo de cuota estimada.
- Generacion de cronograma de pagos.
- Tabla de cuotas con item, fecha, porcentaje y monto.
- Acciones visibles para imprimir y guardar la cotizacion.
- Generacion de documentos PDF mediante jsPDF.

### Areas comunes

- Seccion de areas comunes desde el menu principal.
- Visualizacion de areas del proyecto como portico, parque y club.
- Tarjetas con imagen y nombre del area.
- Boton para ver imagenes del area comun.
- Boton para ubicar el area comun dentro del mapa.
- Modal minimizable en vista movil.

### Entorno y ubicacion

- Seccion de entorno desde el menu principal.
- Marcadores de puntos cercanos al proyecto.
- Filtros por categoria: todos, playas, restaurantes, hoteles, turismo y seguridad.
- Modal de informacion para cada punto del entorno.
- Imagen, tipo, nombre y coordenadas del punto seleccionado.
- Accion "Como llegar" con estimacion de tiempo y distancia.
- Boton para abrir la ubicacion en Google Maps.
- Modal minimizable y boton de reapertura en dispositivos moviles.

### Fotos 360 y video

- Seccion de fotos 360 para recorridos inmersivos.
- Overlay con iframe para visualizar recorridos 360.
- Seccion de video del proyecto.
- Reproductor de video en modal con controles nativos.
- Cierre del contenido multimedia al cambiar de seccion o cerrar overlay.

## Tecnologias utilizadas

### Frontend

- React 19
- TypeScript
- Vite
- CSS por componentes
- Tailwind CSS 4 como dependencia de estilos
- Material Symbols para iconografia

### Visualizacion 3D y datos

- CesiumJS 1.134
- Cesium Ion
- GeoJSON para lotes, areas comunes, fotos 360 y puntos del entorno
- Modelos GLB para elementos 3D
- OpenRouteService para calculo de rutas y distancias

### Utilidades

- date-fns para manejo de fechas del cotizador
- jsPDF para generacion de documentos PDF
- WebSocket opcional para actualizaciones de lotes en tiempo real
- ESLint para revision de codigo

## Requisitos

- Node.js 18 o superior
- npm
- Navegador moderno con soporte WebGL
- Token de Cesium Ion
- API key de OpenRouteService si se usara la funcion "Como llegar"
- URL de API del proyecto si se usaran datos dinamicos de lotes/cotizaciones
- URL de WebSocket opcional si se desean actualizaciones en tiempo real

## Ejecutar despues de clonar

1. Clonar el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
cd com_mapvisor_app
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear un archivo `.env` en la raiz del proyecto:

```env
VITE_CESIUM_TOKEN=tu_token_de_cesium_ion
VITE_OPEN_ROUTE_SERVICE_KEY=tu_api_key_de_openrouteservice
VITE_API_BASE_URL=https://tu-api.com
VITE_PROJECT_ID=id_del_proyecto
VITE_SOCKET_BASE_URL=wss://tu-websocket.com
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/...
```

Variables importantes:

- `VITE_CESIUM_TOKEN`: necesaria para cargar Cesium Ion.
- `VITE_OPEN_ROUTE_SERVICE_KEY`: necesaria para calcular rutas desde el entorno.
- `VITE_API_BASE_URL`: usada para obtener configuracion y datos dinamicos del proyecto.
- `VITE_PROJECT_ID`: identifica el proyecto inmobiliario en la API.
- `VITE_SOCKET_BASE_URL`: opcional, permite recibir cambios de lotes en tiempo real.
- `VITE_GOOGLE_APPS_SCRIPT_URL`: opcional, permite alimentar datos externos de lotes.

4. Ejecutar en modo desarrollo:

```bash
npm run dev
```

5. Abrir la URL local que entrega Vite, normalmente:

```text
http://localhost:5173
```

6. Construir para produccion:

```bash
npm run build
```

7. Previsualizar la build:

```bash
npm run preview
```

## Scripts disponibles

```bash
npm run dev        # Servidor local de desarrollo
npm run build      # Compilacion TypeScript + build de Vite
npm run build:prod # Build usando modo production
npm run preview    # Previsualizacion de la build
npm run lint       # Revision con ESLint
```

## Datos y recursos principales

- `public/data/lotesv2.geojson`: informacion geoespacial de lotes.
- `public/data/areas.geojson`: areas comunes del proyecto.
- `public/data/entorno.geojson`: puntos cercanos y servicios del entorno.
- `public/data/fotos.geojson`: puntos asociados a recorridos 360.
- `public/data/sellers.json`: datos de vendedores usados por el flujo comercial.
- `public/images/`: imagenes, iconos, marcadores y video del proyecto.
- `public/glbData/`: modelos 3D usados en la escena.

## Estructura del proyecto

```text
src/
├── App.tsx
├── main.tsx
├── cesium/
│   └── cesium-init.js
├── components/
│   ├── BottomBar/
│   ├── Modals/
│   │   ├── AreasModal/
│   │   ├── ContactModal/
│   │   ├── EntornoModal/
│   │   ├── LotInfoModal/
│   │   └── LotSearchModal/
│   ├── Overlays/
│   │   ├── EntornoButtons/
│   │   ├── ImageOverlay/
│   │   ├── Photos360Overlay/
│   │   └── VideoOverlay/
│   ├── Sidebar/
│   └── UI/
├── constants/
├── contexts/
├── hooks/
├── Layout/
└── types/
```

## Notas de configuracion

- La escena principal se inicializa en `src/cesium/cesium-init.js`.
- Los controles visibles de React se comunican con Cesium mediante funciones y eventos globales.
- Si las variables de API no estan configuradas, la app puede seguir cargando recursos locales, pero algunas funciones dinamicas como rangos reales, rutas o actualizaciones externas pueden quedar limitadas.
- Para desplegar el proyecto, primero ejecuta `npm run build` y publica la carpeta `dist/` en el hosting elegido.
