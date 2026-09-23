/**
 * Simulador de Óptica 2D - Ambystoma Technologies
 * app.js - Lógica Principal de la Aplicación, Controles, Demos y Enlace de Eventos
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvasElement = document.getElementById('optics-canvas');
  if (!canvasElement) return;

  const sim = new OpticsCanvasController(canvasElement);
  window.sim = sim;

  // Elementos de la interfaz - Barra de herramientas
  const btnSelect = document.getElementById('btn-tool-select');
  const btnNodeEdit = document.getElementById('btn-tool-node-edit');
  const btnDrawFreehand = document.getElementById('btn-tool-draw-freehand');
  const btnDrawPoly = document.getElementById('btn-tool-draw-poly');
  const btnFinishDraw = document.getElementById('btn-tool-finish-draw');
  const btnRuler = document.getElementById('btn-tool-ruler');
  const btnAddLightSource = document.getElementById('btn-add-light-source');
  const btnAddDetectorScreen = document.getElementById('btn-add-detector-screen');

  const cbAddOptics = document.getElementById('cb-add-optics');
  const cbAddSource = document.getElementById('cb-add-source');
  const cbDemos = document.getElementById('cb-demos');
  const btnClearScene = document.getElementById('btn-clear-scene');

  // Controles de Vista
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');

  // Elementos del panel izquierdo (Guardar / Abrir / Lista de Elementos)
  const btnSaveScene = document.getElementById('btn-save-scene');
  const btnOpenScene = document.getElementById('btn-open-scene');
  const fileInputScene = document.getElementById('file-input-scene');
  const listSceneElements = document.getElementById('list-scene-elements');
  const btnDeleteElement = document.getElementById('btn-delete-element');
  const lblDetectorInfo = document.getElementById('lbl-detector-info');

  // Elementos del panel derecho (Física y Propiedades)
  const spinN = document.getElementById('spin-n');
  const chkSmooth = document.getElementById('chk-smooth');
  const chkDispersion = document.getElementById('chk-dispersion');
  const sliderRot = document.getElementById('slider-rotation');
  const lblRotValue = document.getElementById('lbl-rot-value');

  const sliderRays = document.getElementById('slider-rays');
  const lblRaysValue = document.getElementById('lbl-rays-value');
  const sliderSrcAngle = document.getElementById('slider-src-angle');
  const lblSrcAngleValue = document.getElementById('lbl-src-angle-value');
  const sliderWl = document.getElementById('slider-wl');
  const lblWlValue = document.getElementById('lbl-wl-value');
  const colorWlPreview = document.getElementById('color-wl-preview');
  const chkWhiteLight = document.getElementById('chk-white-light');

  const chkGrid = document.getElementById('chk-grid');
  const chkAxis = document.getElementById('chk-axis');
  const spinBounces = document.getElementById('spin-bounces');

  // Barra de estado
  const lblStatusMsg = document.getElementById('status-msg');
  const lblCoords = document.getElementById('lbl-coords');

  // Modal About
  const aboutModal = document.getElementById('about-modal');
  const btnOpenAbout = document.getElementById('btn-open-about');
  const btnCloseAbout = document.getElementById('btn-close-about');
  const btnAcceptAbout = document.getElementById('btn-accept-about');

  // Sistema de Notificaciones Toast
  function showToast(message, type = 'info', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    else if (type === 'warning') icon = '⚠️';
    else if (type === 'error') icon = '✕';

    toast.innerHTML = `<span class="toast-badge">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
  window.showToast = showToast;

  // --- BOTONES DE HERRAMIENTAS / MODOS ---

  const modeButtons = [btnSelect, btnNodeEdit, btnDrawFreehand, btnDrawPoly, btnRuler];

  function setActiveToolButton(btn) {
    modeButtons.forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  if (btnSelect) {
    btnSelect.addEventListener('click', () => {
      sim.setMode(CanvasMode.SELECT);
      setActiveToolButton(btnSelect);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusReady');
    });
  }

  if (btnNodeEdit) {
    btnNodeEdit.addEventListener('click', () => {
      sim.setMode(CanvasMode.NODE_EDIT);
      setActiveToolButton(btnNodeEdit);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusNodeEdit');
    });
  }

  if (btnDrawFreehand) {
    btnDrawFreehand.addEventListener('click', () => {
      sim.setMode(CanvasMode.DRAW_FREEHAND);
      setActiveToolButton(btnDrawFreehand);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawingFreehand');
    });
  }

  if (btnDrawPoly) {
    btnDrawPoly.addEventListener('click', () => {
      sim.setMode(CanvasMode.DRAW_POLYGON);
      setActiveToolButton(btnDrawPoly);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusDrawingPoly');
    });
  }

  if (btnFinishDraw) {
    btnFinishDraw.disabled = true;
    btnFinishDraw.addEventListener('click', () => {
      sim.finishCurrentDrawing();
    });
  }

  if (btnRuler) {
    btnRuler.addEventListener('click', () => {
      sim.setMode(CanvasMode.RULER);
      setActiveToolButton(btnRuler);
      if (lblStatusMsg) lblStatusMsg.textContent = window.t('statusRuler');
    });
  }

  // --- BOTÓN DEDICADO: AGREGAR NUEVA FUENTE DE LUZ ---
  if (btnAddLightSource) {
    btnAddLightSource.addEventListener('click', () => {
      const nSrc = sim.sources.length;
      // Posición escalonada para que no se superpongan
      const posX = -240.0;
      const posY = ((nSrc * 45) % 240) - 90;
      const angle = 0.0;

      const newSource = new LightSource([posX, posY], angle, `Láser ${nSrc + 1}`);
      newSource.sourceType = "laser";
      newSource.rayCount = 1;
      newSource.wavelength = 532.0;

      sim.addSource(newSource);
      showToast(window.t('toast_source_added'), 'success');
    });
  }

  // --- BOTÓN DEDICADO: AGREGAR PANTALLA DETECTORA ---
  if (btnAddDetectorScreen) {
    btnAddDetectorScreen.addEventListener('click', () => {
      const nScreen = sim.elements.filter(e => e instanceof DetectorScreen).length;
      const posX = 160.0 + (nScreen * 25);
      const posY = -100.0;
      const screenName = window.currentLang === 'es' 
        ? `Pantalla Detectora ${nScreen + 1}` 
        : `Detector Screen ${nScreen + 1}`;
      const screen = new DetectorScreen([posX, posY], [posX, posY + 200.0], screenName);
      sim.addElement(screen);
      showToast(window.t('toast_screen_added'), 'success');
    });
  }

  // Desplegable: Agregar Óptica
  if (cbAddOptics) {
    cbAddOptics.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;

      const cx = 0.0, cy = 0.0;
      let elem = null;

      if (val === 'biconvex') {
        elem = createBiconvexLens(cx, cy, 45, 140, 90, 90, 1.50);
      } else if (val === 'biconcave') {
        elem = createBiconcaveLens(cx, cy, 45, 140, 1.50);
      } else if (val === 'prism') {
        elem = createTriangularPrism(cx, cy, 120, 1.65, true);
      } else if (val === 'slab') {
        elem = createGlassSlab(cx, cy, 140, 80, 1.50);
      } else if (val === 'mirror') {
        elem = new FlatMirror([-50, -60], [-50, 60], "Espejo Plano");
      } else if (val === 'screen') {
        elem = new DetectorScreen([160, -100], [160, 100], "Pantalla Detectora");
      }

      if (elem) {
        sim.addElement(elem);
        showToast(window.t('toast_element_added', { name: elem.name }), 'success');
      }
      cbAddOptics.value = "";
    });
  }

  // Desplegable: Agregar Fuentes de Luz
  if (cbAddSource) {
    cbAddSource.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;

      const nSrc = sim.sources.length;
      const pos = [-250.0, ((nSrc * 35) % 180) - 70];
      let src = null;

      if (val === 'white_laser') {
        src = new LightSource(pos, 0.0, window.t('optSourceWhiteLaser'));
        src.sourceType = "laser";
        src.rayCount = 1;
        src.isWhiteLight = true;
      } else if (val === 'laser') {
        src = new LightSource(pos, 0.0, "Haz Láser");
        src.sourceType = "laser";
        src.rayCount = 1;
      } else if (val === 'fan') {
        src = new LightSource(pos, 0.0, "Fuente Puntual");
        src.sourceType = "fan";
        src.rayCount = 25;
        src.apertureDeg = 45.0;
      } else if (val === 'parallel') {
        src = new LightSource(pos, 0.0, "Haz Paralelo");
        src.sourceType = "parallel";
        src.rayCount = 21;
        src.beamWidth = 80.0;
      } else if (val === 'object') {
        src = new LightSource(pos, 0.0, "Objeto Lápiz");
        src.sourceType = "object";
        src.rayCount = 25;
        src.beamWidth = 70.0;
        src.apertureDeg = 35.0;
      }

      if (src) {
        sim.addSource(src);
        showToast(window.t('toast_source_added'), 'success');
      }
      cbAddSource.value = "";
    });
  }

  // Selector de Demos de Física
  if (cbDemos) {
    cbDemos.addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;

      if (val === '1') loadDemoPrismDispersion();
      else if (val === '2') loadDemoSphericalAberration();
      else if (val === '3') loadDemoObjectImageFormation();
      else if (val === '4') loadDemoConvergenceDivergence();
      else if (val === '5') loadDemoBeamExpander();
      else if (val === '6') loadDemoKeplerianTelescope();
      else if (val === '7') loadDemoAchromaticDoublet();
      else if (val === '8') loadDemoTIR();
      else if (val === '9') loadDemoPeriscope();
      else if (val === '10') loadDemoPorroPrism();
      else if (val === '11') loadDemoLateralDisplacement();
      else if (val === '12') loadDemoCustomHandDrawnLens();

      cbDemos.value = "";
    });
  }

  // Botón Limpiar Escena
  if (btnClearScene) {
    btnClearScene.addEventListener('click', () => {
      if (confirm(window.t('confirm_clear'))) {
        sim.clearScene();
        showToast(window.t('toast_cleared'), 'info');
      }
    });
  }

  // Botón Eliminar Elemento
  if (btnDeleteElement) {
    btnDeleteElement.addEventListener('click', () => {
      if (sim.selectedElement) {
        sim.removeSelected();
        showToast(window.t('toast_element_deleted'), 'info');
      }
    });
  }

  // --- GESTIÓN DE GUARDAR Y ABRIR CONFIGURACIÓN DE ESCENA ---

  // Construye un slug alusivo a los elementos/lentes agregados a la escena
  function buildSceneElementsSlug(elements, sources) {
    const names = [];

    // Recoger nombres significativos de los elementos ópticos (lentes, prismas, espejos, etc.)
    for (const elem of elements) {
      if (elem && elem.name) {
        const clean = elem.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        if (clean && !names.includes(clean)) {
          names.push(clean);
        }
      }
      if (names.length >= 3) break;
    }

    // Si no hay elementos ópticos pero hay fuentes
    if (names.length === 0 && sources.length > 0) {
      for (const src of sources) {
        if (src && src.name) {
          const clean = src.name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          if (clean && !names.includes(clean)) {
            names.push(clean);
          }
        }
        if (names.length >= 2) break;
      }
    }

    return names.length > 0 ? names.join('_') : 'Configuracion';
  }

  function saveCurrentScene() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const alusivo = buildSceneElementsSlug(sim.elements, sim.sources);
    const fileName = `Ambystoma_Optics_${alusivo}_${dateStr}.json`;

    // Serializar elementos ópticos
    const serializedElements = sim.elements.map(elem => {
      if (elem instanceof CustomLens) {
        return {
          type: 'CustomLens',
          name: elem.name,
          controlPoints: elem.controlPoints,
          n: elem.n,
          nAmbient: elem.nAmbient,
          isSmooth: elem.isSmooth,
          dispersionEnabled: elem.dispersionEnabled,
          currentRotationDeg: elem.currentRotationDeg,
          isActive: elem.isActive
        };
      } else if (elem instanceof FlatMirror) {
        return {
          type: 'FlatMirror',
          name: elem.name,
          p1: elem.p1,
          p2: elem.p2,
          isActive: elem.isActive
        };
      } else if (elem instanceof DetectorScreen) {
        return {
          type: 'DetectorScreen',
          name: elem.name,
          p1: elem.p1,
          p2: elem.p2,
          isActive: elem.isActive
        };
      }
      return null;
    }).filter(Boolean);

    // Serializar fuentes de luz
    const serializedSources = sim.sources.map(src => {
      return {
        type: 'LightSource',
        name: src.name,
        position: src.position,
        angleDeg: src.angleDeg,
        isActive: src.isActive,
        rayCount: src.rayCount,
        wavelength: src.wavelength,
        beamWidth: src.beamWidth,
        apertureDeg: src.apertureDeg,
        sourceType: src.sourceType,
        isWhiteLight: Boolean(src.isWhiteLight)
      };
    });

    const sceneData = {
      app: 'Ambystoma Optics 2D Studio',
      platform: 'Ambystoma Technologies',
      version: '1.0',
      exportedAt: now.toISOString(),
      elements: serializedElements,
      sources: serializedSources,
      viewport: {
        zoomLevel: sim.zoomLevel,
        panOffset: sim.panOffset
      }
    };

    const jsonStr = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(window.t('toast_scene_saved') || `Guardado: ${fileName}`, 'success');
  }

  function loadSceneFromFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || (!Array.isArray(data.elements) && !Array.isArray(data.sources))) {
          showToast(window.t('toast_scene_load_error'), 'error');
          return;
        }

        sim.clearScene();

        // Cargar elementos ópticos
        if (Array.isArray(data.elements)) {
          for (const item of data.elements) {
            let elem = null;
            if (item.type === 'CustomLens' && Array.isArray(item.controlPoints)) {
              elem = new CustomLens(
                item.controlPoints,
                item.n || 1.5,
                item.name || 'Lente',
                item.isSmooth || false,
                item.dispersionEnabled || false
              );
              if (item.currentRotationDeg !== undefined) {
                elem.currentRotationDeg = item.currentRotationDeg;
              }
            } else if (item.type === 'FlatMirror' && item.p1 && item.p2) {
              elem = new FlatMirror(item.p1, item.p2, item.name || 'Espejo');
            } else if (item.type === 'DetectorScreen' && item.p1 && item.p2) {
              elem = new DetectorScreen(item.p1, item.p2, item.name || 'Pantalla Detectora');
            }

            if (elem) {
              elem.isActive = item.isActive !== false;
              sim.addElement(elem);
            }
          }
        }

        // Cargar fuentes de luz
        if (Array.isArray(data.sources)) {
          for (const s of data.sources) {
            const src = new LightSource(
              s.position || [-200, 0],
              s.angleDeg || 0,
              s.name || 'Fuente de Luz'
            );
            src.isActive = s.isActive !== false;
            src.rayCount = s.rayCount || 11;
            src.wavelength = s.wavelength || 532.0;
            src.beamWidth = s.beamWidth || 40.0;
            src.apertureDeg = s.apertureDeg || 30.0;
            src.sourceType = s.sourceType || 'laser';
            src.isWhiteLight = Boolean(s.isWhiteLight);
            sim.addSource(src);
          }
        }

        // Cargar viewport si existe
        if (data.viewport) {
          if (data.viewport.zoomLevel) sim.zoomLevel = data.viewport.zoomLevel;
          if (data.viewport.panOffset) sim.panOffset = data.viewport.panOffset;
        }

        showToast(window.t('toast_scene_loaded'), 'success');
      } catch (err) {
        console.error('Error al cargar archivo de escena:', err);
        showToast(window.t('toast_scene_load_error'), 'error');
      }
    };
    reader.readAsText(file);
  }

  if (btnSaveScene) {
    btnSaveScene.addEventListener('click', saveCurrentScene);
  }

  if (btnOpenScene && fileInputScene) {
    btnOpenScene.addEventListener('click', () => {
      fileInputScene.value = '';
      fileInputScene.click();
    });

    fileInputScene.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        loadSceneFromFile(e.target.files[0]);
      }
    });
  }

  // Botones de Zoom y Vista
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      sim.zoomLevel = Math.min(8.0, sim.zoomLevel * 1.2);
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      sim.zoomLevel = Math.max(0.15, sim.zoomLevel * 0.83);
    });
  }
  if (btnResetView) {
    btnResetView.addEventListener('click', () => {
      sim.zoomLevel = 1.0;
      sim.panOffset = { x: 0, y: 0 };
    });
  }

  // Presets de Materiales (Botones rápidos)
  document.querySelectorAll('.btn-mat-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const nVal = parseFloat(btn.getAttribute('data-n'));
      if (!isNaN(nVal) && spinN) {
        spinN.value = nVal;
        spinN.dispatchEvent(new Event('input'));
      }
    });
  });

  // Sliders y Controles de Propiedades
  if (spinN) {
    spinN.addEventListener('input', () => {
      const val = parseFloat(spinN.value);
      if (sim.selectedElement instanceof CustomLens) {
        sim.selectedElement.n = val;
      }
    });
  }

  if (chkSmooth) {
    chkSmooth.addEventListener('change', () => {
      if (sim.selectedElement instanceof CustomLens) {
        sim.selectedElement.isSmooth = chkSmooth.checked;
      }
    });
  }

  if (chkDispersion) {
    chkDispersion.addEventListener('change', () => {
      if (sim.selectedElement instanceof CustomLens) {
        sim.selectedElement.dispersionEnabled = chkDispersion.checked;
      }
    });
  }

  if (sliderRot) {
    sliderRot.addEventListener('input', () => {
      const deg = parseFloat(sliderRot.value);
      if (lblRotValue) lblRotValue.textContent = `${deg}°`;
      if (sim.selectedElement && typeof sim.selectedElement.rotateToAngle === 'function') {
        sim.selectedElement.rotateToAngle(deg);
      } else if (sim.selectedElement instanceof LightSource) {
        sim.selectedElement.angleDeg = deg;
      }
    });
  }

  if (sliderRays) {
    sliderRays.addEventListener('input', () => {
      const count = parseInt(sliderRays.value);
      const targetSrc = getTargetLightSource();
      if (targetSrc) targetSrc.rayCount = count;
      updateRaysLabelUI(targetSrc, count);
    });
  }

  if (sliderSrcAngle) {
    sliderSrcAngle.addEventListener('input', () => {
      const angle = parseFloat(sliderSrcAngle.value);
      if (lblSrcAngleValue) lblSrcAngleValue.textContent = `${angle}°`;
      const targetSrc = getTargetLightSource();
      if (targetSrc) targetSrc.angleDeg = angle;
    });
  }

  if (sliderWl) {
    sliderWl.addEventListener('input', () => {
      const wl = parseFloat(sliderWl.value);
      const targetSrc = getTargetLightSource();
      if (targetSrc) {
        targetSrc.wavelength = wl;
        targetSrc.isWhiteLight = false;
        if (chkWhiteLight) chkWhiteLight.checked = false;
        updateRaysLabelUI(targetSrc);
      }
      updateWlPreviewUI(targetSrc || { wavelength: wl, isWhiteLight: false });
    });
  }

  if (chkWhiteLight) {
    chkWhiteLight.addEventListener('change', () => {
      const targetSrc = getTargetLightSource();
      if (targetSrc) {
        targetSrc.isWhiteLight = chkWhiteLight.checked;
        updateWlPreviewUI(targetSrc);
        updateRaysLabelUI(targetSrc);
      }
    });
  }

  function updateRaysLabelUI(src, count) {
    if (!lblRaysValue) return;
    const n = count !== undefined ? count : (src ? src.rayCount : 11);
    if (src && src.isWhiteLight) {
      const px = Math.round(1.8 + n * 0.62);
      const isEs = window.currentLang === 'es';
      lblRaysValue.textContent = `${n} (${isEs ? 'Grosor' : 'Width'}: ${px}px)`;
    } else {
      lblRaysValue.textContent = n;
    }
  }

  function updateWlPreviewUI(src) {
    if (!src) return;
    if (src.isWhiteLight) {
      if (lblWlValue) lblWlValue.textContent = window.t('lblWhiteRainbow');
      if (colorWlPreview) {
        colorWlPreview.style.background = 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #00ffff, #0055ff, #8b00ff)';
      }
    } else {
      const wl = src.wavelength || 532.0;
      if (lblWlValue) lblWlValue.textContent = `${Math.round(wl)} nm`;
      const rgb = wavelengthToRGB(wl);
      if (colorWlPreview) {
        colorWlPreview.style.background = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
    }
  }

  if (chkGrid) {
    chkGrid.addEventListener('change', () => {
      sim.showGrid = chkGrid.checked;
    });
  }

  if (chkAxis) {
    chkAxis.addEventListener('change', () => {
      sim.showAxis = chkAxis.checked;
    });
  }

  if (spinBounces) {
    spinBounces.addEventListener('input', () => {
      sim.maxBounces = parseInt(spinBounces.value) || 50;
    });
  }

  function getTargetLightSource() {
    if (sim.selectedElement instanceof LightSource) {
      return sim.selectedElement;
    }
    if (sim.sources.length > 0) {
      return sim.sources[0];
    }
    return null;
  }

  // --- SINCRONIZACIÓN DE PROPIEDADES ANTE SELECCIÓN ---

  sim.onElementSelected = (elem) => {
    updateSceneList();

    if (!elem) return;

    if (elem instanceof CustomLens) {
      if (spinN) spinN.value = elem.n;
      if (chkSmooth) chkSmooth.checked = elem.isSmooth;
      if (chkDispersion) chkDispersion.checked = elem.dispersionEnabled;
      if (sliderRot) {
        sliderRot.value = Math.round(elem.currentRotationDeg || 0);
        if (lblRotValue) lblRotValue.textContent = `${sliderRot.value}°`;
      }
    } else if (elem instanceof LightSource) {
      if (sliderRays) {
        sliderRays.value = elem.rayCount;
        updateRaysLabelUI(elem);
      }
      if (sliderSrcAngle) {
        sliderSrcAngle.value = Math.round(elem.angleDeg);
        if (lblSrcAngleValue) lblSrcAngleValue.textContent = `${sliderSrcAngle.value}°`;
      }
      if (sliderWl) {
        sliderWl.value = Math.round(elem.wavelength);
        updateWlPreviewUI(elem);
      }
      if (chkWhiteLight) {
        chkWhiteLight.checked = Boolean(elem.isWhiteLight);
      }
      if (sliderRot) {
        sliderRot.value = Math.round(elem.angleDeg);
        if (lblRotValue) lblRotValue.textContent = `${sliderRot.value}°`;
      }
    }
  };

  sim.onSceneChanged = () => {
    updateSceneList();
    updateDetectorInfo();
  };

  sim.onCoordsChanged = (wx, wy) => {
    if (lblCoords) {
      lblCoords.textContent = `X: ${wx.toFixed(1)}, Y: ${wy.toFixed(1)}`;
    }
  };

  sim.onModeChanged = (mode) => {
    if (mode === CanvasMode.SELECT) setActiveToolButton(btnSelect);
    else if (mode === CanvasMode.NODE_EDIT) setActiveToolButton(btnNodeEdit);
    else if (mode === CanvasMode.DRAW_FREEHAND) setActiveToolButton(btnDrawFreehand);
    else if (mode === CanvasMode.DRAW_POLYGON) setActiveToolButton(btnDrawPoly);
    else if (mode === CanvasMode.RULER) setActiveToolButton(btnRuler);

    if (btnFinishDraw) {
      btnFinishDraw.disabled = (mode !== CanvasMode.DRAW_POLYGON);
    }
  };

  // --- LISTA DE ELEMENTOS DE LA ESCENA (PANEL IZQUIERDO) ---

  function updateSceneList() {
    if (!listSceneElements) return;
    listSceneElements.innerHTML = '';

    const allItems = [...sim.elements, ...sim.sources];
    if (allItems.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'scene-list-empty';
      emptyLi.textContent = window.currentLang === 'es' ? 'Escena vacía' : 'Empty scene';
      listSceneElements.appendChild(emptyLi);
      return;
    }

    allItems.forEach(item => {
      const li = document.createElement('li');
      li.className = `scene-item ${item.isSelected ? 'selected' : ''}`;

      let icon = '🔮';
      if (item instanceof LightSource) icon = '🔦';
      else if (item instanceof FlatMirror) icon = '🪞';
      else if (item instanceof DetectorScreen) icon = '📊';

      li.innerHTML = `
        <span class="scene-item-icon">${icon}</span>
        <span class="scene-item-name">${item.name}</span>
        <input type="checkbox" class="scene-item-toggle" ${item.isActive ? 'checked' : ''} title="Activar/Desactivar">
      `;

      li.querySelector('.scene-item-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        item.isActive = e.target.checked;
      });

      li.addEventListener('click', () => {
        sim.selectElement(item);
      });

      listSceneElements.appendChild(li);
    });
  }

  function updateDetectorInfo() {
    if (!lblDetectorInfo) return;
    let totalHits = 0;
    for (let i = 0; i < sim.elements.length; i++) {
      if (sim.elements[i] instanceof DetectorScreen) {
        totalHits += sim.elements[i].hits.length;
      }
    }
    if (totalHits > 0) {
      lblDetectorInfo.innerHTML = `<strong>${window.t('detectorHitsLabel', { count: totalHits })}</strong><br><span style="color:#00ffcc;">● Perfil espectral activo</span>`;
    } else {
      lblDetectorInfo.textContent = window.t('detectorNoHits');
    }
  }

  // --- CARGADOR DE DEMOS DE FÍSICA ---

  function loadDemoPrismDispersion() {
    sim.clearScene();

    const prism = createTriangularPrism(0.0, 0.0, 130, 1.50, true);
    sim.addElement(prism);

    const laser = new LightSource([-230.0, -12.0], 0.0, "Láser Óptico (532 nm)");
    laser.sourceType = "laser";
    laser.rayCount = 1;
    laser.wavelength = 532.0;
    laser.isWhiteLight = false;
    sim.addSource(laser);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo1') }), 'info');
  }

  function loadDemoSphericalAberration() {
    sim.clearScene();

    const lens = createBiconvexLens(0.0, 0.0, 60, 180, 100, 100, 1.55);
    sim.addElement(lens);

    const src = new LightSource([-260.0, 0.0], 0.0, "Haz Paralelo Ancho");
    src.sourceType = "parallel";
    src.rayCount = 25;
    src.beamWidth = 160.0;
    sim.addSource(src);

    const screen = new DetectorScreen([230.0, -100.0], [230.0, 100.0], "Pantalla Focal");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo2') }), 'info');
  }

  function loadDemoObjectImageFormation() {
    sim.clearScene();

    const lens = createBiconvexLens(0.0, 0.0, 35, 150, 110, 110, 1.52);
    sim.addElement(lens);

    const pencilSrc = new LightSource([-220.0, 0.0], 0.0, "Objeto Lápiz Emisor");
    pencilSrc.sourceType = "object";
    pencilSrc.rayCount = 25;
    pencilSrc.beamWidth = 80.0;
    pencilSrc.apertureDeg = 30.0;
    sim.addSource(pencilSrc);

    const screen = new DetectorScreen([240.0, -110.0], [240.0, 110.0], "Pantalla Proyección");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo3') }), 'info');
  }

  // Demo 4: Convergencia vs Divergencia (Lente Convexa y Cóncava)
  function loadDemoConvergenceDivergence() {
    sim.clearScene();

    // Superior: Lente Biconvexa (Convergente - Foco Real)
    const convLens = createBiconvexLens(0.0, -85.0, 36, 110, 80, 80, 1.52);
    convLens.name = "Lente Convergente (+Foco Real)";
    sim.addElement(convLens);

    const srcConv = new LightSource([-240.0, -85.0], 0.0, "Haz Colimado Convergente");
    srcConv.sourceType = "parallel";
    srcConv.rayCount = 9;
    srcConv.beamWidth = 70.0;
    srcConv.wavelength = 532.0; // Verde
    sim.addSource(srcConv);

    // Inferior: Lente Bicóncava (Divergente - Foco Virtual)
    const divLens = createBiconcaveLens(0.0, 85.0, 36, 110, 1.52);
    divLens.name = "Lente Divergente (-Foco Virtual)";
    sim.addElement(divLens);

    const srcDiv = new LightSource([-240.0, 85.0], 0.0, "Haz Colimado Divergente");
    srcDiv.sourceType = "parallel";
    srcDiv.rayCount = 9;
    srcDiv.beamWidth = 70.0;
    srcDiv.wavelength = 470.0; // Cian / Azul
    sim.addSource(srcDiv);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo4') }), 'info');
  }

  // Demo 5: Combinación de Lentes (Expansor de Haz / Colimador Galileano)
  function loadDemoBeamExpander() {
    sim.clearScene();

    // L1: Divergente bicóncava (expande el haz incidente)
    const divLens = createBiconcaveLens(-80.0, 0.0, 28, 80, 1.52);
    divLens.name = "L1: Lente Divergente";
    sim.addElement(divLens);

    // L2: Convergente biconvexa (recolima el haz con mayor diámetro)
    const convLens = createBiconvexLens(100.0, 0.0, 48, 160, 125, 125, 1.52);
    convLens.name = "L2: Lente Colimadora";
    sim.addElement(convLens);

    // Haz láser estrecho de entrada
    const src = new LightSource([-240.0, 0.0], 0.0, "Haz Láser Estrecho (Input)");
    src.sourceType = "parallel";
    src.rayCount = 11;
    src.beamWidth = 35.0;
    src.wavelength = 635.0; // Rojo
    sim.addSource(src);

    // Sensor de salida
    const screen = new DetectorScreen([240.0, -90.0], [240.0, 90.0], "Haz Expandido (Output)");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo5') }), 'info');
  }

  // Demo 6: Telescopio Astronómico de Kepler (Dos Lentes Convexas)
  function loadDemoKeplerianTelescope() {
    sim.clearScene();

    // Lente Objetivo (Focal larga)
    const objLens = createBiconvexLens(-100.0, 0.0, 42, 170, 140, 140, 1.52);
    objLens.name = "Objetivo (Focal Larga)";
    sim.addElement(objLens);

    // Lente Ocular (Focal corta)
    const eyeLens = createBiconvexLens(150.0, 0.0, 32, 90, 65, 65, 1.52);
    eyeLens.name = "Ocular (Focal Corta)";
    sim.addElement(eyeLens);

    // Haz proveniente de una estrella lejana con inclinación angular
    const starRays = new LightSource([-270.0, 0.0], -3.5, "Luz de Estrella Lejana");
    starRays.sourceType = "parallel";
    starRays.rayCount = 13;
    starRays.beamWidth = 90.0;
    starRays.wavelength = 510.0;
    sim.addSource(starRays);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo6') }), 'info');
  }

  // Demo 7: Doblete Acromático (Crown + Flint Glass)
  function loadDemoAchromaticDoublet() {
    sim.clearScene();

    // Lente 1: Vidrio Crown (n=1.52, baja dispersión)
    const crownLens = createBiconvexLens(-15.0, 0.0, 40, 140, 85, 85, 1.52);
    crownLens.name = "Vidrio Crown (n=1.52)";
    crownLens.dispersionEnabled = true;
    sim.addElement(crownLens);

    // Lente 2: Vidrio Flint (n=1.68, alta dispersión compensadora)
    const flintLens = createPlanoConcaveLens(25.0, 0.0, 32, 140, 1.68, true);
    flintLens.name = "Vidrio Flint (n=1.68)";
    flintLens.dispersionEnabled = true;
    sim.addElement(flintLens);

    // Haz multicolor de entrada
    const src = new LightSource([-240.0, 0.0], 0.0, "Haz Blanco Multiespectral");
    src.sourceType = "parallel";
    src.rayCount = 13;
    src.beamWidth = 70.0;
    src.wavelength = 532.0;
    sim.addSource(src);

    const screen = new DetectorScreen([230.0, -80.0], [230.0, 80.0], "Foco Acromático Común");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo7') }), 'info');
  }

  // Demo 8: Total Internal Reflection & Waveguide
  function loadDemoTIR() {
    sim.clearScene();

    const slab = createGlassSlab(0.0, 0.0, 320, 60, 1.62);
    slab.name = "Guía de Onda / Fibra Óptica";
    sim.addElement(slab);

    const src = new LightSource([-200.0, 15.0], 35.0, "Láser en Ángulo Crítico");
    src.sourceType = "laser";
    src.rayCount = 1;
    src.wavelength = 635.0; // Rojo
    sim.addSource(src);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo8') }), 'info');
  }

  // Demo 9: Ley de Reflexión y Periscopio (Espejos Planos a 45°)
  function loadDemoPeriscope() {
    sim.clearScene();

    // Espejo 1 inferior a 45°
    const m1 = new FlatMirror([-120.0, 110.0], [-50.0, 40.0], "Espejo 1 (45°)");
    sim.addElement(m1);

    // Espejo 2 superior a 45°
    const m2 = new FlatMirror([50.0, -40.0], [120.0, -110.0], "Espejo 2 (45°)");
    sim.addElement(m2);

    // Haz láser horizontal en la parte inferior
    const src = new LightSource([-250.0, 75.0], 0.0, "Haz Láser (θi = θr)");
    src.sourceType = "parallel";
    src.rayCount = 5;
    src.beamWidth = 25.0;
    src.wavelength = 532.0; // Verde brillante
    sim.addSource(src);

    // Pantalla detectora en la salida superior
    const screen = new DetectorScreen([240.0, -110.0], [240.0, -40.0], "Sensor Salida Periscopio");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo9') }), 'info');
  }

  // Demo 10: Prisma de Porro (Retrorreflexión 180° y 90°)
  function loadDemoPorroPrism() {
    sim.clearScene();

    // Prisma rectangular de Porro (hipotenusa vertical izquierda, catetos a la derecha)
    const porro = createRightAnglePrism(0.0, 0.0, 100, 140, 1.52, false);
    porro.name = "Prisma de Porro (n=1.52)";
    sim.addElement(porro);

    // Haz paralelo horizontal que entra por la hipotenusa
    const src = new LightSource([-220.0, -30.0], 0.0, "Haz Láser Incidente");
    src.sourceType = "parallel";
    src.rayCount = 5;
    src.beamWidth = 25.0;
    src.wavelength = 490.0; // Cian
    sim.addSource(src);

    // Pantalla de recepción del haz reflejado a 180°
    const screen = new DetectorScreen([-220.0, 10.0], [-220.0, 60.0], "Retrorreflexión 180°");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo10') }), 'info');
  }

  // Demo 11: Desplazamiento Lateral en Lámina de Vidrio
  function loadDemoLateralDisplacement() {
    sim.clearScene();

    // Lámina gruesa de vidrio de caras planas y paralelas
    const slab = createGlassSlab(0.0, 0.0, 110, 180, 1.52);
    slab.name = "Lámina de Caras Paralelas";
    sim.addElement(slab);

    // Haz láser en ángulo oblicuo (35°)
    const src = new LightSource([-230.0, -50.0], 35.0, "Haz Oblicuo (Ley de Snell)");
    src.sourceType = "parallel";
    src.rayCount = 7;
    src.beamWidth = 35.0;
    src.wavelength = 532.0; // Verde
    sim.addSource(src);

    // Pantalla detectora del haz emergente desplazado
    const screen = new DetectorScreen([200.0, 0.0], [200.0, 140.0], "Haz Desplazado Lateralmente");
    sim.addElement(screen);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo11') }), 'info');
  }

  // Demo 12: Lente Deformada a Mano
  function loadDemoCustomHandDrawnLens() {
    sim.clearScene();

    const pts = [
      [-30, -80],
      [30, -60],
      [60, 0],
      [20, 70],
      [-40, 60],
      [-60, -10]
    ];
    const customLens = new CustomLens(pts, 1.60, "Lente Ondulado Esculpido", true, false);
    sim.addElement(customLens);

    const src = new LightSource([-240.0, 0.0], 0.0, "Haz Láser Paralelo");
    src.sourceType = "parallel";
    src.rayCount = 17;
    src.beamWidth = 120.0;
    sim.addSource(src);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo12') }), 'info');
  }

  // --- MODAL ABOUT ---
  if (btnOpenAbout && aboutModal) {
    btnOpenAbout.addEventListener('click', () => {
      aboutModal.style.display = 'flex';
    });
  }

  if (btnCloseAbout && aboutModal) {
    btnCloseAbout.addEventListener('click', () => {
      aboutModal.style.display = 'none';
    });
  }

  if (btnAcceptAbout && aboutModal) {
    btnAcceptAbout.addEventListener('click', () => {
      aboutModal.style.display = 'none';
    });
  }

  if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) aboutModal.style.display = 'none';
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') aboutModal.style.display = 'none';
    });
  }

  // Escuchar cambio de idioma
  window.addEventListener('languageChanged', () => {
    updateSceneList();
    updateDetectorInfo();
    updateRaysLabelUI(getTargetLightSource());
  });

  // Iniciar con la demo 1 (Prisma arcoíris) por defecto
  loadDemoPrismDispersion();
});
