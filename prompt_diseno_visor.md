# Prompt para IA de Diseño — Visor Inmobiliario 3D

> **Instrucción para la IA de diseño:** Necesito que diseñes la interfaz completa de una **aplicación web de visualización de terrenos/lotes en 3D** para una empresa inmobiliaria. El visor muestra un mapa 3D interactivo (estilo Google Earth) con parcelas de terreno resaltadas y toda la interfaz flota sobre este mapa. Diseña **cada vista por separado** como una imagen independiente. Usa un estilo visual **completamente diferente** entre sí para que no se parezca a ningún producto existente, pero manteniendo una calidad premium y profesional.

---

## CONTEXTO GENERAL

- **Tipo de app:** Aplicación web SPA (Single Page Application)
- **Fondo permanente:** Un mapa/terreno 3D interactivo ocupa el 100% de la pantalla. Toda la UI flota sobre él.
- **Plataformas:** Desktop (principal) y Mobile/Tablet (responsive)
- **Sector:** Bienes raíces / Lotización / Venta de terrenos
- **Usuarios:** Compradores potenciales de lotes y agentes de ventas
- **Idioma de la interfaz:** Español

---

## VISTA 1 — SPLASH SCREEN (Pantalla de carga)

**Descripción:** Pantalla que aparece durante 2-3 segundos mientras carga el mapa 3D. Ocupa toda la pantalla.

**Elementos:**
- Logo o nombre del proyecto inmobiliario centrado (texto estilizado, NO imagen)
- Indicador de carga sutil (barra de progreso, spinner o animación)
- Fondo que puede ser un color sólido, gradiente o imagen borrosa del terreno

**Funcionalidad:** Se desvanece automáticamente cuando el mapa termina de cargar.

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 2 — PANTALLA DE INSTRUCCIONES

**Descripción:** Overlay semi-transparente que aparece sobre el mapa 3D la primera vez. Enseña al usuario cómo navegar.

**Elementos (versión desktop):**
- Título principal: "¿Cómo navegar?" o similar
- 3 tarjetas horizontales con iconos grandes de mouse/ratón:
  - **Clic izquierdo + arrastre:** "Rotar la vista"
  - **Scroll / Rueda:** "Acercar y alejar"
  - **Clic derecho + arrastre:** "Desplazar la cámara"
- Cada tarjeta tiene: icono animado del gesto + título + descripción corta
- Botón inferior: "Entendido" para cerrar

**Elementos (versión mobile):**
- 4 tarjetas en grid 2x2 con gestos táctiles:
  - **1 dedo + arrastre:** "Rotar"
  - **Pellizcar:** "Zoom"
  - **2 dedos + arrastre:** "Desplazar"
  - **Doble tap:** "Centrar vista"
- Botón "Entendido"

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 3 — INTERFAZ PRINCIPAL (Estado por defecto)

**Descripción:** El mapa 3D visible con la interfaz mínima. Es la vista más importante.

### Elementos Desktop:
1. **Sidebar izquierdo (menú vertical flotante):**
   - Logo/nombre del proyecto en la parte superior
   - 6 botones verticales con icono + texto debajo:
     - 📷 "Fotos 360°"
     - 🏡 "Áreas comunes"
     - 📐 "Lotes" (abre buscador)
     - 🗺️ "Entorno"
     - 🎬 "Video"
     - 👤 "Usuario" (nombre o "Invitado")
   - Cada botón tiene un estado normal, hover y activo
   - Los separadores entre cada botón son sutiles

2. **Bottom Bar (barra inferior flotante centrada):**
   - **Sección izquierda — Leyenda de estados:** 4 botones/badges con indicador de color:
     - 🟢 "Disponible"
     - 🟡 "Reservado"
     - 🔴 "Vendido"
     - 🟠 "En negociación"
   - **Sección derecha — Controles de cámara:** Barra con iconos separados por divisores:
     - 🏠 Home (resetear vista)
     - ⬆️ Subir cámara
     - ⬇️ Bajar cámara
     - 🔍+ Zoom in
     - 🔍- Zoom out
     - 🧊 Vista 3D
     - 📊 Cuadrícula (toggle on/off)
   - Cada icono tiene tooltip al hover

3. **Botón circular superior derecho:** ☀️ Control de hora del día (sol)

### Elementos Mobile:
1. **Top Bar:** Barra superior con nombre del proyecto a la izquierda y botón hamburguesa (☰) a la derecha
2. **Bottom Bar:** Los 7 iconos de control de cámara en fila horizontal, pegados al borde inferior
3. **Botón flotante:** "Ver leyenda" con dropdown desplegable hacia arriba mostrando los 4 estados

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 4 — MENÚ MOBILE DESPLEGADO

**Descripción:** Cuando se toca el botón hamburguesa, se despliega un overlay con las opciones del sidebar.

**Elementos:**
- Overlay oscuro/claro semi-transparente
- Panel con las 6 opciones del sidebar (Fotos 360°, Áreas comunes, Lotes, Entorno, Video, Usuario) en formato lista vertical con iconos grandes
- El ítem activo se resalta visualmente

**Diseñar:** 1 imagen mobile

---

## VISTA 5 — CONTROL DE HORA DEL DÍA

**Descripción:** Panel flotante que aparece al tocar el botón ☀️. Permite cambiar la iluminación del mapa 3D.

**Elementos:**
- Header con icono ☀️, título "Hora del día", y botón ✕ para cerrar
- Display grande de la hora actual seleccionada (ej: "14:30") con etiqueta "Tarde"
- Slider horizontal (rango 0:00 a 23:59)
- Labels de referencia: "12 AM" a la izquierda, "12 PM" al centro, "12 AM" a la derecha
- 4 botones presets en grid: "Amanecer", "Mediodía", "Atardecer", "Noche"
- El preset activo se resalta con el color primario

**Diseñar:** 1 imagen desktop + 1 imagen mobile (panel de ancho completo)

---

## VISTA 6 — BOTONES DE ENTORNO (Filtros superiores)

**Descripción:** Cuando se activa "Entorno" en el sidebar, aparecen botones horizontales centrados en la parte superior del mapa.

**Elementos:**
- 3-5 botones flotantes horizontales centrados en la parte superior:
  - Cada uno con icono + texto (ej: "Hospitales", "Colegios", "Supermercados", "Restaurantes")
  - Estado normal: fondo translúcido
  - Estado activo: fondo con color primario, resaltado

**Versión mobile:** Los mismos botones pero solo con iconos (sin texto), posicionados arriba del bottom bar

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 7 — MODAL DE ENTORNO (Detalle de ubicación)

**Descripción:** Panel lateral derecho que aparece al seleccionar una categoría de entorno. Muestra lugares cercanos al proyecto.

**Elementos:**
- Panel flotante a la derecha, con scroll vertical
- Header: Título "Entorno" con icono, sin botón de cerrar (se cierra desde el sidebar)
- Divisor decorativo bajo el header
- Secciones repetidas, cada una con:
  - **Imagen grande** del lugar (foto real, con bordes redondeados)
  - **Título** del lugar (ej: "Hospital Regional de Tacna")
  - **Descripción** corta del lugar
  - **Fila de acciones:**
    - Badge con tiempo estimado (ej: "🚗 15 min")
    - Botón "Google Maps" con icono
    - Botón "Waze" con icono

**Diseñar:** 1 imagen desktop + 1 imagen mobile (modal centrado)

---

## VISTA 8 — MODAL DE ÁREAS COMUNES

**Descripción:** Panel lateral derecho que muestra las áreas comunes del proyecto inmobiliario.

**Elementos:**
- Header: Título "Áreas Comunes" con icono
- Grid 2 columnas con tarjetas:
  - Cada tarjeta tiene:
    - Imagen del área (ej: parque, piscina, club house)
    - Título del área
    - 2 botones:
      - "Ver foto" → abre overlay de imagen a pantalla completa
      - "Ver en 360°" → abre visor 360° embebido

**Versión mobile:** Grid de 1 columna, tarjetas horizontales (imagen a la izquierda, texto y botones a la derecha)

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 9 — OVERLAY DE FOTO 360°

**Descripción:** Visor de fotos 360° a pantalla casi completa, embebido en un iframe.

**Elementos:**
- Fondo overlay oscuro semi-transparente
- Contenedor grande centrado (90% del viewport) con bordes redondeados
- Iframe con el visor 360° dentro
- Botón ✕ en esquina superior derecha para cerrar
- Animación de entrada: escala desde 0.8 + desplazamiento hacia arriba

**Diseñar:** 1 imagen desktop

---

## VISTA 10 — OVERLAY DE IMAGEN

**Descripción:** Similar al overlay 360°, pero muestra una imagen estática de un área común.

**Elementos:**
- Overlay oscuro
- Imagen centrada con bordes redondeados, máximo 80% del viewport
- Botón ✕ para cerrar
- La imagen se ajusta manteniendo su proporción (object-fit: cover)

**Diseñar:** 1 imagen desktop

---

## VISTA 11 — BUSCADOR DE LOTES (Modal principal)

**Descripción:** Panel lateral izquierdo o derecho que aparece al seleccionar "Lotes" en el sidebar. Es el buscador/filtro de parcelas.

**Elementos:**
- Panel flotante con scroll interno

### Header:
- Icono de búsqueda + título "Búsqueda de lotes"
- Botón ✕ para cerrar

### Sección de Filtros:
1. **Filtro de Precio:**
   - Label "Precio"
   - Slider de doble manija (rango min-max)
   - Etiquetas de valor mínimo y máximo sobre cada manija (ej: "$10,000" — "$85,000")
   - Barra de progreso coloreada entre las dos manijas

2. **Filtro de Área:**
   - Label "Área"
   - Slider de doble manija similar (ej: "120 m²" — "450 m²")

3. **Botón "Limpiar filtros"** (texto subrayado o link)

4. **Dropdown "Ordenar por":**
   - Opciones: Área ↑↓, Precio ↑↓, Número ↑↓

5. **Filtro de Estado:**
   - 4 botones/chips en fila: "Vendido", "Reservado", "Negociación", "Disponible"
   - Cada uno con su color de estado (rojo, amarillo, naranja, verde)
   - El activo tiene fondo sólido, los inactivos tienen fondo gris

### Sección de Resultados:
- Contador: "Mostrando (24) lotes"
- Lista scrolleable de tarjetas de lotes:
  - Cada tarjeta muestra:
    - Nombre del lote (ej: "Parcela 15")
    - Área (ej: "180.50 m²")
    - Precio (ej: "$45,250.00")
    - Badge de estado con color
    - Botón "Ver detalle" o la tarjeta completa es clickeable

**Diseñar:** 1 imagen desktop + 1 imagen mobile (modal centrado de ancho completo)

---

## VISTA 12 — MODAL DE INFORMACIÓN DEL LOTE (Cara frontal)

**Descripción:** Modal centrado que aparece al hacer clic en un lote del mapa o de la lista. Muestra información técnica del terreno. Tiene una animación de "flip" (giro 3D) para voltear a la cotización.

**Elementos:**
- Modal centrado con bordes redondeados

### Header:
- Nombre del lote: "Etapa I - Mz. A Lt. 5"
- Badge de estado con color (ej: verde "Disponible")
- Botón ✕ para cerrar

### Cuerpo:
- **Sección "Precio":** Valor grande destacado (ej: "$45,250.00")
- **Sección "Área":** Valor con unidad (ej: "180.50 m²")
- **Sección "Linderos" (Boundaries):** Tabla o grid 2x2:
  - Izquierda: X.XX ML
  - Derecha: X.XX ML
  - Frente: X.XX ML
  - Fondo: X.XX ML

### Footer:
- Botón primario grande: "Generar Cotización" (solo visible si estado = "Disponible")
- Texto aclaratorio si no está disponible

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 13 — MODAL DE COTIZACIÓN (Cara trasera del flip)

**Descripción:** Al presionar "Generar Cotización", el modal hace un giro 3D (flip) y muestra el formulario de cotización en la cara trasera.

**Elementos:**

### Header:
- Botón "← Volver" (gira de vuelta al modal de info)
- Título: "Cotización - Mz. A Lt. 5"
- Badge: "Etapa I"
- Resumen: Precio total, Área, Precio por m²

### Formulario de Cotización:
1. **Método de pago** (dropdown): "Crédito Directo", "Crédito Hipotecario", "Contado"

2. **Sección de Descuento:**
   - Input porcentaje (%) con validación máxima
   - Input monto ($) que se calcula automáticamente
   - Precio final mostrado debajo

3. **Sección de Separación (toggle on/off):**
   - Input porcentaje + monto calculado
   - Campo de fecha (dd/mm/aaaa)

4. **Sección de Inicial:**
   - Input porcentaje + monto calculado
   - Campo de fecha

5. **Sección de Crédito Hipotecario** (solo si método = hipotecario):
   - Porcentaje + monto

6. **Cuotas Mensuales:**
   - Número de cuotas (input numérico)
   - Toggle "Cuotas equivalentes"
   - Fecha de primer pago
   - Fecha de último pago (calculada automáticamente)

7. **Botón "Generar Cronograma"**

### Tabla de Cronograma (generada):
- Tabla con columnas: N°, Concepto, Fecha, Porcentaje, Monto
- Filas: Separación, Inicial, Cuota 1, Cuota 2... Cuota N
- Fila final con TOTAL en negrita
- Las celdas de fecha y monto son editables inline

### Botones de Acción (footer):
- 🖨️ "Imprimir" (genera PDF)
- 💾 "Guardar" (guarda en BD)
- ✉️ "Enviar" (envía por email)
- Estos botones se habilitan solo cuando el cronograma está completo

**Diseñar:** 1 imagen desktop (mostrando el formulario arriba y la tabla abajo, con scroll) + 1 imagen mobile

---

## VISTA 14 — MODAL DE CONTACTO/DATOS DEL CLIENTE

**Descripción:** Modal que aparece al presionar Imprimir, Guardar o Enviar desde la cotización. Recopila datos del cliente y vendedor.

**Elementos:**
- Modal centrado, más pequeño que el de cotización

### Header:
- Título dinámico: "Imprimir cronograma" / "Guardar cronograma" / "Enviar por correo"
- Botón ✕

### Formulario:
1. **Sección Vendedor** (si está logueado):
   - Badge verde con nombre y email del vendedor (solo lectura)

2. **Sección Cliente:**
   - Nombre* (solo letras)
   - Apellido* (solo letras)
   - Tipo de Documento (dropdown: DNI, RUC, CE, Pasaporte)
   - N° de Documento* (validación según tipo)
   - Código de País (dropdown con banderas: 🇵🇪 +51, 🇲🇽 +52, etc.)
   - Celular* (formato automático según país)
   - Email*

3. **Sección Vigencia:**
   - Input "días" con sufijo "días"
   - Campos "Desde" y "Hasta" (calculados automáticamente, solo lectura)

4. **Sección Nombre del archivo** (solo para "Guardar"):
   - Input de texto con nombre auto-generado

### Footer:
- Botón "Cancelar"
- Botón primario: "Imprimir" / "Guardar PDF" / "Enviar"

**Diseñar:** 1 imagen desktop + 1 imagen mobile

---

## VISTA 15 — MODAL DE LOGIN

**Descripción:** Modal para que los agentes de ventas inicien sesión.

**Elementos:**
- Modal centrado, compacto
- Título: "Iniciar Sesión" o "Acceso de Agentes"
- Input Email
- Input Contraseña (con toggle mostrar/ocultar)
- Botón "Ingresar"
- Link "¿Olvidaste tu contraseña?"
- Opción "Continuar como invitado"

**Diseñar:** 1 imagen desktop

---

## VISTA 16 — MODAL DE PERFIL DE USUARIO

**Descripción:** Modal con información del usuario logueado.

**Elementos:**
- Avatar circular con la inicial del nombre (fondo de color primario)
- Campos de información (solo lectura):
  - Nombre completo
  - Email
  - Rol
  - Estado (badge verde "Activo")
- Botón "Panel de Administración" (azul/verde)
- Botón "Cerrar Sesión" (rojo)
- Botón "Cerrar" modal

**Diseñar:** 1 imagen desktop

---

## VISTA 17 — OVERLAY DE VIDEO

**Descripción:** Reproductor de video a pantalla completa sobre el mapa.

**Elementos:**
- Fondo oscuro overlay
- Video player centrado (90% del viewport)
- Controles nativos del reproductor
- Botón ✕ para cerrar

**Diseñar:** 1 imagen desktop

---

## INSTRUCCIONES ADICIONALES PARA EL DISEÑADOR

### Requisitos de Diseño:
1. **Estilo visual:** Elige UNO de estos estilos y aplícalo consistentemente:
   - Opción A: **Neomorfismo** (sombras internas/externas suaves, monocromático)
   - Opción B: **Glassmorphism oscuro** (cristal ahumado, bordes de luz neón)
   - Opción C: **Material Design 3** con paleta de colores terracota/tierra
   - Opción D: **Estilo Corporativo Premium** (azul oscuro + dorado, formas angulares)
   - Opción E: **Futurista/Tech** (degradados de azul a púrpura, formas geométricas)

2. **Paleta de colores:** Propón una paleta que NO use verde esmeralda (#10b981) como primario. Sugerencias:
   - Azul petróleo + dorado
   - Terracota + crema
   - Violeta oscuro + coral
   - Azul marino + turquesa

3. **Tipografía:** Usar 2 fuentes de Google Fonts (1 para títulos, 1 para cuerpo). NO usar Inter ni Outfit.

4. **Iconografía:** Usar un set de iconos diferente (Phosphor Icons, Lucide, Tabler Icons, o diseño custom).

5. **Layout diferenciador:** Cambiar la distribución respecto al diseño original:
   - El sidebar puede ir a la derecha, arriba, o ser un dock flotante
   - El bottom bar puede ser un panel lateral o radial
   - Los modales pueden ser paneles deslizantes desde los bordes

6. **Animaciones sugeridas:** Indicar en las imágenes qué elementos tendrían animación (ej: entrada con slide, hover con escala, etc.)

### Formato de Entrega:
- **Resolución desktop:** 1920x1080 px
- **Resolución mobile:** 390x844 px (iPhone 14)
- **Formato:** PNG o Figma
- **Total de imágenes:** ~22-25 imágenes

### Resumen de Imágenes Necesarias:

| # | Vista | Desktop | Mobile |
|---|-------|---------|--------|
| 1 | Splash Screen | ✅ | ✅ |
| 2 | Instrucciones | ✅ | ✅ |
| 3 | Interfaz Principal | ✅ | ✅ |
| 4 | Menú Mobile | — | ✅ |
| 5 | Control Hora del Día | ✅ | ✅ |
| 6 | Botones de Entorno | ✅ | ✅ |
| 7 | Modal de Entorno | ✅ | ✅ |
| 8 | Modal Áreas Comunes | ✅ | ✅ |
| 9 | Overlay Foto 360° | ✅ | — |
| 10 | Overlay Imagen | ✅ | — |
| 11 | Buscador de Lotes | ✅ | ✅ |
| 12 | Info del Lote (frontal) | ✅ | ✅ |
| 13 | Cotización (trasera) | ✅ | ✅ |
| 14 | Modal Contacto/Cliente | ✅ | ✅ |
| 15 | Modal Login | ✅ | — |
| 16 | Modal Perfil Usuario | ✅ | — |
| 17 | Overlay Video | ✅ | — |
| **Total** | | **17** | **12** |
