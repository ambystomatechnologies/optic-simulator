/**
 * Simulador de Óptica 2D - Ambystoma Technologies
 * i18n.js - Diccionario Internacional (Inglés por defecto, Español seleccionable)
 */

const OPTICS_I18N = {
  en: {
    // Meta & Header
    pageTitle: "2D Optics Simulator · Ambystoma Studio · Interactive Physics",
    pageDesc: "Interactive 2D optics simulator with custom lenses, chromatic dispersion, laser ray tracing, node editing, and physics demos. 100% free by Ambystoma Technologies.",
    brandTitle: "2D Optics Simulator <span>Ambystoma Studio</span>",
    brandDesc: "Interactive Ray Tracing, Lenses, Prisms & Reflection",
    btnAbout: "About",
    btnAboutTitle: "About this simulator and Terms of Use",
    securityBadgeText: "100% In-Browser",
    securityBadgeTitle: "Runs completely in your web browser with local GPU/Canvas",

    // Toolbar Tools
    btnSelect: "🔍 Move / Select",
    btnSelectTitle: "Select, move, or rotate elements and light sources",
    btnNodeEdit: "✏️ Deform Nodes (Sculpt Lens)",
    btnNodeEditTitle: "Click and drag any vertex to reshape or invent custom lenses",
    btnDrawFreehand: "✍️ Draw Lens Freehand",
    btnDrawFreehandTitle: "Draw a custom lens directly on canvas and smooth it into optics",
    btnDrawPoly: "📐 Custom Polygon",
    btnDrawPolyTitle: "Click points to define a custom prism or geometric lens",
    btnFinishDraw: "✅ OK - Finish Drawing",
    btnFinishDrawTitle: "Close current drawing and convert it into an interactive lens",
    btnRuler: "📏 Optical Ruler",
    btnRulerTitle: "Click and drag to measure distances and angles across the scene",

    // Dedicated Add Light Source Button
    btnAddLightSource: "💡 Add Light Source",
    btnAddLightSourceTitle: "Spawn a new customizable light source in the scene",

    // Quick Add Dropdowns
    optAddOptics: "-- Add Optics --",
    optBiconvex: "Biconvex Lens",
    optBiconcave: "Biconcave Lens",
    optPrism: "Triangular Prism",
    optSlab: "Glass Block / Slab",
    optMirror: "Flat Mirror",
    optScreen: "Detector Screen",

    optAddSource: "-- Add Light Source --",
    optSourceWhiteLaser: "🌈 White Light Beam (7 Colors)",
    optSourceLaser: "Laser Beam",
    optSourceFan: "Point Source (Fan)",
    optSourceParallel: "Parallel Beam",
    optSourceObject: "Pencil Object (Ray Object)",

    optDemos: "Physics Demos...",
    optDemo1: "1. Rainbow Prism (Dispersion)",
    optDemo2: "2. Spherical Aberration in Lens",
    optDemo3: "3. Real Image Formation (Object & Screen)",
    optDemo4: "4. Convergence vs Divergence (Convex & Concave)",
    optDemo5: "5. Lens Combination (Beam Expander)",
    optDemo6: "6. Keplerian Telescope (2 Convex Lenses)",
    optDemo7: "7. Achromatic Doublet (Crown + Flint)",
    optDemo8: "8. Total Internal Reflection & Waveguide",
    optDemo9: "9. Plane Mirrors & Periscope (Reflection)",
    optDemo10: "10. Porro Prism (180° Retroreflection)",
    optDemo11: "11. Lateral Displacement (Glass Slab)",
    optDemo12: "12. Custom Hand-Drawn Sculpted Lens",

    btnClear: "🗑️ Clear Scene",
    btnClearTitle: "Remove all elements and reset scene",

    // Left Panel (Scene Elements & Detector)
    panelSceneTitle: "Scene Elements",
    btnDeleteElement: "Delete Element",
    panelDetectorTitle: "Light Detector Screen",
    detectorHitsLabel: "Light impacts: {count}",
    detectorNoHits: "No light hits recorded yet.",
    detectorProfileTitle: "Intensity Profile:",

    // Right Panel (Properties)
    panelPropertiesTitle: "Physics Properties",
    gbMaterialTitle: "Lens Material / Medium",
    lblRefractiveIndex: "Refractive Index (n):",
    btnMatAir: "Air",
    btnMatWater: "Water",
    btnMatGlass: "Glass",
    btnMatFlint: "Flint",
    btnMatDiamond: "Diamond",
    chkSmoothCurve: "Smooth Curve (Catmull-Rom Spline)",
    chkDispersion: "Chromatic Dispersion (RGB Rainbow)",

    gbTransformTitle: "Transform & Rotation",
    lblRotation: "Rotation (Degrees):",
    lblScale: "Scale:",

    gbSourceTitle: "Light Source Settings",
    lblRayCount: "Ray Count:",
    lblSourceAngle: "Emission Angle:",
    lblWavelength: "Wavelength (nm):",
    lblWhiteRainbow: "🌈 Rainbow (7 Colors)",
    chkWhiteLight: "🌈 White Light Beam (7 Colors)",
    lblBeamWidth: "Beam Width:",
    lblAperture: "Aperture Angle:",

    gbGlobalTitle: "Simulation & Viewport",
    chkShowGrid: "Show Grid",
    chkShowAxis: "Show Optical Axis",
    lblMaxBounces: "Max Ray Bounces:",
    btnResetView: "Reset View (1:1)",
    btnZoomIn: "Zoom In (+)",
    btnZoomOut: "Zoom Out (-)",

    // Status bar & Canvas overlays
    statusReady: "Ready. Select or draw lenses on the canvas.",
    statusDrawingFreehand: "Drawing freehand... Release mouse to finish path or click 'OK - Finish'.",
    statusDrawingPoly: "Click points to define polygon. Click 'OK - Finish Drawing' when done.",
    statusNodeEdit: "Vertex Node Edit mode: Drag yellow nodes to reshape the lens in real time.",
    statusRuler: "Ruler: Click and drag to measure distance and angle.",
    rulerDistanceLabel: "Dist: {dist} px ({distMm} mm) | Angle: {angle}°",
    statusLoadedDemo: "Loaded demo: {name}",

    // Advertisement
    adLabel: "ADVERTISEMENT",

    // About Modal
    aboutModalTitle: "About 2D Optics Simulator",
    aboutDevBadge: "Development & Scientific Software",
    aboutDevDesc: "Interactive high-performance web optics suite developed by Ambystoma Technologies.",
    aboutPhysicsTitle: "🔬 Physics Engine Highlights",
    aboutPhysics1: "Vector Snell's Law with Total Internal Reflection (TIR) calculation.",
    aboutPhysics2: "Cauchy's dispersion equation enabling true chromatic rainbow splitting.",
    aboutPhysics3: "Catmull-Rom closed splines for sculptable organic lenses and node deformation.",
    aboutPhysics4: "Detector screens with real-time photon intensity distribution graphs.",
    aboutFreeTitle: "✨ 100% Free & Open-Access",
    aboutFreeDesc: "This tool is completely free, runs locally in your web browser with hardware-accelerated Canvas, requires no signup, and does not send any data to external servers.",
    btnAcceptAbout: "Understood & Continue",

    // Toasts
    toast_cleared: "Scene cleared.",
    toast_element_added: '"{name}" added to scene.',
    toast_source_added: "New light source added to scene.",
    toast_drawing_finished: "Custom lens successfully created!",
    toast_drawing_min_points: "Please draw at least 3 points to form a closed lens.",
    toast_element_deleted: "Selected element removed.",
    confirm_clear: "Are you sure you want to clear the entire scene?",

    // Footer
    footerCopy: "© 2026 Ambystoma Technologies · 2D Optics Simulator · Hosted on GitHub Pages",
    footerLink1: "Official Portal",
    footerLink2: "Open Source",
    footerLink3: "100% In-Browser"
  },

  es: {
    // Meta & Header
    pageTitle: "Simulador de Óptica 2D · Ambystoma Studio · Física Interactiva",
    pageDesc: "Simulador interactivo de óptica 2D con lentes personalizables, dispersión cromática, trazado de rayos láser, edición de nodos y demostraciones de física. 100% gratuito por Ambystoma Technologies.",
    brandTitle: "Simulador de Óptica 2D <span>Ambystoma Studio</span>",
    brandDesc: "Trazado de Rayos Láser, Lentes, Prismas y Reflexión",
    btnAbout: "About",
    btnAboutTitle: "Acerca de este simulador y Términos de Uso",
    securityBadgeText: "100% en Navegador",
    securityBadgeTitle: "Procesamiento local en tu navegador mediante Canvas acelerado",

    // Toolbar Tools
    btnSelect: "🔍 Mover / Seleccionar",
    btnSelectTitle: "Selecciona, desplaza o rota elementos y fuentes de luz",
    btnNodeEdit: "✏️ Deformar Nodos (Inventar Lente)",
    btnNodeEditTitle: "Haz clic y arrastra vértices para remodelar o inventar lentes",
    btnDrawFreehand: "✍️ Dibujar Lente a Mano",
    btnDrawFreehandTitle: "Dibuja una lente libremente y conviértela en óptica suave",
    btnDrawPoly: "📐 Polígono Personalizado",
    btnDrawPolyTitle: "Haz clics para trazar un prisma o lente poligonal personalizada",
    btnFinishDraw: "✅ OK - Finalizar Dibujo",
    btnFinishDrawTitle: "Cierra el dibujo actual y conviértelo en una lente interactiva",
    btnRuler: "📏 Regla / Medidor",
    btnRulerTitle: "Haz clic y arrastra para medir distancias y ángulos en el lienzo",

    // Dedicated Add Light Source Button
    btnAddLightSource: "💡 Agregar nueva fuente de luz",
    btnAddLightSourceTitle: "Agrega una nueva fuente de luz configurable a la escena",

    // Quick Add Dropdowns
    optAddOptics: "-- Agregar Óptica --",
    optBiconvex: "Lente Biconvexa",
    optBiconcave: "Lente Bicóncava",
    optPrism: "Prisma Triangular",
    optSlab: "Bloque de Vidrio",
    optMirror: "Espejo Plano",
    optScreen: "Pantalla / Detector",

    optAddSource: "-- Agregar Fuente de Luz --",
    optSourceWhiteLaser: "🌈 Haz de Luz Blanca (7 Colores)",
    optSourceLaser: "Haz Láser",
    optSourceFan: "Fuente Puntual (Abanico)",
    optSourceParallel: "Haz Paralelo",
    optSourceObject: "Objeto Lápiz (Rayos Objeto)",

    optDemos: "Demos de Física...",
    optDemo1: "1. Arcoíris en Prisma (Dispersión)",
    optDemo2: "2. Aberración Esférica en Lente",
    optDemo3: "3. Formación de Imagen Real (Objeto y Pantalla)",
    optDemo4: "4. Convergencia vs Divergencia (Convexa y Cóncava)",
    optDemo5: "5. Combinación de Lentes (Expansor de Haz)",
    optDemo6: "6. Telescopio de Kepler (2 Lentes Convexas)",
    optDemo7: "7. Doblete Acromático (Crown + Flint)",
    optDemo8: "8. Fibra Óptica / Reflexión Total (TIR)",
    optDemo9: "9. Ley de Reflexión y Periscopio (Espejos)",
    optDemo10: "10. Prisma de Porro y Retrorreflexión",
    optDemo11: "11. Desplazamiento Lateral en Lámina de Vidrio",
    optDemo12: "12. Lente Personalizada Ondulada a Mano",

    btnClear: "🗑️ Limpiar Escena",
    btnClearTitle: "Elimina todos los elementos y restablece el lienzo",

    // Left Panel (Scene Elements & Detector)
    panelSceneTitle: "Elementos de la Escena",
    btnDeleteElement: "Eliminar Elemento",
    panelDetectorTitle: "Detector / Pantalla de Luz",
    detectorHitsLabel: "Impactos de luz: {count}",
    detectorNoHits: "Sin impactos registrados aún.",
    detectorProfileTitle: "Perfil de Intensidad:",

    // Right Panel (Properties)
    panelPropertiesTitle: "Propiedades y Física",
    gbMaterialTitle: "Material del Lente / Medio",
    lblRefractiveIndex: "Índice de Refracción (n):",
    btnMatAir: "Aire",
    btnMatWater: "Agua",
    btnMatGlass: "Vidrio",
    btnMatFlint: "Flint",
    btnMatDiamond: "Diamante",
    chkSmoothCurve: "Curva Suave (Spline)",
    chkDispersion: "Dispersión Cromática (Arcoíris RGB)",

    gbTransformTitle: "Transformación y Rotación",
    lblRotation: "Rotación (Grados):",
    lblScale: "Escala:",

    gbSourceTitle: "Propiedades de Fuente de Luz",
    lblRayCount: "Cantidad de Rayos:",
    lblSourceAngle: "Ángulo de Emisión:",
    lblWavelength: "Longitud de Onda (nm):",
    lblWhiteRainbow: "🌈 Arcoíris (7 Colores)",
    chkWhiteLight: "🌈 Haz de Luz Blanca (7 Colores)",
    lblBeamWidth: "Ancho del Haz:",
    lblAperture: "Ángulo de Apertura:",

    gbGlobalTitle: "Configuración y Vista",
    chkShowGrid: "Mostrar Cuadrícula",
    chkShowAxis: "Mostrar Eje Óptico",
    lblMaxBounces: "Rebotes Máx. de Luz:",
    btnResetView: "Restablecer Vista (1:1)",
    btnZoomIn: "Acercar (+)",
    btnZoomOut: "Alejar (-)",

    // Status bar & Canvas overlays
    statusReady: "Listo. Selecciona o dibuja lentes en el lienzo.",
    statusDrawingFreehand: "Dibujando a mano alzada... Suelta el ratón o pulsa 'OK - Finalizar'.",
    statusDrawingPoly: "Haz clic para añadir vértices. Pulsa 'OK - Finalizar' al terminar.",
    statusNodeEdit: "Modo Edición de Vértices: Arrastra los nodos amarillos para deformar la lente.",
    statusRuler: "Regla: Arrastra para medir distancias y ángulos.",
    rulerDistanceLabel: "Dist: {dist} px ({distMm} mm) | Ángulo: {angle}°",
    statusLoadedDemo: "Cargada demo: {name}",

    // Advertisement
    adLabel: "PUBLICIDAD",

    // About Modal
    aboutModalTitle: "Acerca del Simulador de Óptica 2D",
    aboutDevBadge: "Desarrollo & Software Científico",
    aboutDevDesc: "Suite interactiva de óptica web de alto rendimiento desarrollada por Ambystoma Technologies.",
    aboutPhysicsTitle: "🔬 Aspectos Físicos Destacados",
    aboutPhysics1: "Ley de Snell vectorial con cálculo exacto de Reflexión Total Interna (TIR).",
    aboutPhysics2: "Ecuación de dispersión de Cauchy que recrea la separación real del arcoíris.",
    aboutPhysics3: "Splines Catmull-Rom para esculpido orgánico y deformación interactiva de vértices.",
    aboutPhysics4: "Pantalla detectora con perfil visual de fotones e histograma espectral.",
    aboutFreeTitle: "✨ 100% Gratuito y de Libre Acceso",
    aboutFreeDesc: "Esta herramienta se ejecuta íntegramente en tu navegador sin requerir servidores externos, cuentas ni instalación.",
    btnAcceptAbout: "Comprendido y Continuar",

    // Toasts
    toast_cleared: "Escena limpiada.",
    toast_element_added: '"{name}" añadido a la escena.',
    toast_source_added: "Nueva fuente de luz añadida a la escena.",
    toast_drawing_finished: "¡Lente personalizada creada con éxito!",
    toast_drawing_min_points: "Por favor dibuja al menos 3 puntos para cerrar la lente.",
    toast_element_deleted: "Elemento seleccionado eliminado.",
    confirm_clear: "¿Estás seguro de que deseas vaciar toda la escena?",

    // Footer
    footerCopy: "© 2026 Ambystoma Technologies · Simulador de Óptica 2D · Alojado en GitHub Pages",
    footerLink1: "Portal Oficial",
    footerLink2: "Código Abierto",
    footerLink3: "100% en Navegador"
  }
};

window.OPTICS_I18N = OPTICS_I18N;
window.currentLang = 'en';

window.t = function(key, params = {}) {
  const lang = window.currentLang || 'en';
  const dict = OPTICS_I18N[lang] || OPTICS_I18N['en'];
  let text = dict[key] || (OPTICS_I18N['en'] && OPTICS_I18N['en'][key]) || key;
  for (const [pKey, pVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), pVal);
  }
  return text;
};

window.setLanguage = function(lang) {
  if (!OPTICS_I18N[lang]) lang = 'en';
  window.currentLang = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('optics_sim_lang', lang);

  const dict = OPTICS_I18N[lang];

  // Actualizar título y metadatos
  if (dict.pageTitle) document.title = dict.pageTitle;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && dict.pageDesc) metaDesc.setAttribute('content', dict.pageDesc);

  // Actualizar todos los elementos con data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] !== undefined) {
      el.innerHTML = dict[key];
    }
  });

  // Actualizar tooltips / titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key] !== undefined) {
      el.title = dict[key];
    }
  });

  // Actualizar botones de banderas
  const btnEn = document.getElementById('btn-lang-en');
  const btnEs = document.getElementById('btn-lang-es');
  if (btnEn && btnEs) {
    btnEn.classList.toggle('active', lang === 'en');
    btnEs.classList.toggle('active', lang === 'es');
  }

  // Notificar al resto de la aplicación
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
};

// Inicialización de idioma en carga
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('optics_sim_lang');
  if (saved === 'es') {
    window.setLanguage('es');
  } else {
    window.setLanguage('en');
  }
});
