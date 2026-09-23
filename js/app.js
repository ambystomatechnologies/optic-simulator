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

  const cbAddOptics = document.getElementById('cb-add-optics');
  const cbAddSource = document.getElementById('cb-add-source');
  const cbDemos = document.getElementById('cb-demos');
  const btnClearScene = document.getElementById('btn-clear-scene');

  // Controles de Vista
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');

  // Elementos del panel izquierdo
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
    btnFinishDraw.addEventListener('click', () => {
      sim.finishCurrentDrawing();
      setActiveToolButton(btnSelect);
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

      if (val === 'laser') {
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
      else if (val === '4') loadDemoCustomHandDrawnLens();
      else if (val === '5') loadDemoTIR();

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
      if (lblRaysValue) lblRaysValue.textContent = count;
      const targetSrc = getTargetLightSource();
      if (targetSrc) targetSrc.rayCount = count;
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
      if (lblWlValue) lblWlValue.textContent = `${wl} nm`;
      const rgb = wavelengthToRGB(wl);
      if (colorWlPreview) {
        colorWlPreview.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      }
      const targetSrc = getTargetLightSource();
      if (targetSrc) targetSrc.wavelength = wl;
    });
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
        if (lblRaysValue) lblRaysValue.textContent = elem.rayCount;
      }
      if (sliderSrcAngle) {
        sliderSrcAngle.value = Math.round(elem.angleDeg);
        if (lblSrcAngleValue) lblSrcAngleValue.textContent = `${sliderSrcAngle.value}°`;
      }
      if (sliderWl) {
        sliderWl.value = Math.round(elem.wavelength);
        if (lblWlValue) lblWlValue.textContent = `${sliderWl.value} nm`;
        const rgb = wavelengthToRGB(elem.wavelength);
        if (colorWlPreview) {
          colorWlPreview.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        }
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

    const prism = createTriangularPrism(0.0, 0.0, 130, 1.65, true);
    sim.addElement(prism);

    const laser = new LightSource([-230.0, 0.0], 0.0, "Láser Blanco Multiespectral");
    laser.sourceType = "laser";
    laser.rayCount = 1;
    laser.wavelength = 532.0;
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

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo4') }), 'info');
  }

  function loadDemoTIR() {
    sim.clearScene();

    // Bloque guía de onda
    const slab = createGlassSlab(0.0, 0.0, 320, 60, 1.62);
    slab.name = "Guía de Onda / Fibra Óptica";
    sim.addElement(slab);

    const src = new LightSource([-200.0, 15.0], 35.0, "Láser en Ángulo Crítico");
    src.sourceType = "laser";
    src.rayCount = 1;
    src.wavelength = 635.0; // Rojo
    sim.addSource(src);

    showToast(window.t('statusLoadedDemo', { name: window.t('optDemo5') }), 'info');
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
  });

  // Iniciar con la demo 1 (Prisma arcoíris) por defecto
  loadDemoPrismDispersion();
});
