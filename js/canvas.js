/**
 * Simulador de Óptica 2D - Ambystoma Technologies
 * canvas.js - Controlador y Renderizado Interactivo en HTML5 Canvas (60 FPS)
 */

const CanvasMode = {
  SELECT: 0,
  NODE_EDIT: 1,
  DRAW_FREEHAND: 2,
  DRAW_POLYGON: 3,
  PAN: 4,
  RULER: 5
};

class OpticsCanvasController {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');

    this.elements = [];       // Lista de OpticalElement (CustomLens, FlatMirror, DetectorScreen)
    this.sources = [];        // Lista de LightSource
    this.selectedElement = null;
    this.selectedNodeIdx = -1;

    // Transformación de la vista (Zoom y Desplazamiento)
    this.zoomLevel = 1.0;
    this.panOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.isDraggingElement = false;
    this.dragStartWorld = [0, 0];
    this.dragStartElemPos = null;

    // Modo interactivo
    this.mode = CanvasMode.SELECT;

    // Búferes de dibujo
    this.drawPoints = [];
    this.isDrawing = false;

    // Estado de la Regla
    this.rulerP1 = null;
    this.rulerP2 = null;

    // Configuración visual y física
    this.showGrid = true;
    this.showAxis = true;
    this.gridSize = 40.0;
    this.maxBounces = 50;
    this.minIntensity = 0.01;

    // Callbacks
    this.onElementSelected = null;
    this.onSceneChanged = null;
    this.onCoordsChanged = null;
    this.onModeChanged = null;

    // Estado táctil (Mobile Touch & Multi-touch Gestures)
    this.lastTouchPos = null;
    this.initialPinchDist = null;
    this.initialZoom = null;
    this.pinchMidpointWorld = null;
    this.isPinching = false;

    // Inicializar listeners y bucle de renderizado
    this.initEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.renderLoop();
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getTouchCanvasCoords(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  // --- TRANSFORMACIONES DE COORDENADAS ---

  worldToScreen(wx, wy) {
    const sx = (wx * this.zoomLevel) + this.panOffset.x + (this.width / 2.0);
    const sy = (wy * this.zoomLevel) + this.panOffset.y + (this.height / 2.0);
    return { x: sx, y: sy };
  }

  screenToWorld(sx, sy) {
    const wx = (sx - (this.width / 2.0) - this.panOffset.x) / this.zoomLevel;
    const wy = (sy - (this.height / 2.0) - this.panOffset.y) / this.zoomLevel;
    return [wx, wy];
  }

  findClosestNode(worldPos, maxDistPixels = 48.0) {
    const threshold = maxDistPixels / this.zoomLevel;
    let closestElem = null;
    let closestIdx = -1;
    let minD = Infinity;

    // Probar primero en el elemento seleccionado si existe
    if (this.selectedElement) {
      const elem = this.selectedElement;
      const pts = (elem instanceof CustomLens)
        ? elem.controlPoints
        : (elem instanceof FlatMirror || elem instanceof DetectorScreen)
          ? [elem.p1, elem.p2]
          : [];
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(worldPos[0] - pts[i][0], worldPos[1] - pts[i][1]);
        if (d < minD && d < threshold) {
          minD = d;
          closestElem = elem;
          closestIdx = i;
        }
      }
      if (closestElem) {
        return { element: closestElem, nodeIdx: closestIdx, dist: minD };
      }
    }

    // Probar en los demás elementos de la escena
    for (let j = this.elements.length - 1; j >= 0; j--) {
      const elem = this.elements[j];
      const pts = (elem instanceof CustomLens)
        ? elem.controlPoints
        : (elem instanceof FlatMirror || elem instanceof DetectorScreen)
          ? [elem.p1, elem.p2]
          : [];
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(worldPos[0] - pts[i][0], worldPos[1] - pts[i][1]);
        if (d < minD && d < threshold) {
          minD = d;
          closestElem = elem;
          closestIdx = i;
        }
      }
    }

    if (closestElem) {
      return { element: closestElem, nodeIdx: closestIdx, dist: minD };
    }
    return null;
  }

  setMode(mode) {
    this.mode = mode;
    this.drawPoints = [];
    this.isDrawing = false;
    this.rulerP1 = null;
    this.rulerP2 = null;
    this.selectedNodeIdx = -1;

    // Si entramos en modo NODE_EDIT y no hay un elemento óptico seleccionado,
    // seleccionar el último si existe en la escena para que sus nodos se puedan editar de inmediato
    if (mode === CanvasMode.NODE_EDIT) {
      if (!this.selectedElement || !(this.selectedElement instanceof CustomLens || this.selectedElement instanceof FlatMirror || this.selectedElement instanceof DetectorScreen)) {
        if (this.elements.length > 0) {
          this.selectElement(this.elements[this.elements.length - 1]);
        }
      }
    }

    if (this.onModeChanged) {
      this.onModeChanged(mode);
    }
  }

  // --- GESTIÓN DE LA ESCENA ---

  addElement(elem) {
    this.elements.push(elem);
    this.selectElement(elem);
    this.notifySceneChanged();
  }

  addSource(source) {
    this.sources.push(source);
    this.selectElement(source);
    this.notifySceneChanged();
  }

  removeSelected() {
    if (!this.selectedElement) return;

    const idxElem = this.elements.indexOf(this.selectedElement);
    if (idxElem !== -1) {
      this.elements.splice(idxElem, 1);
    }

    const idxSrc = this.sources.indexOf(this.selectedElement);
    if (idxSrc !== -1) {
      this.sources.splice(idxSrc, 1);
    }

    this.selectElement(null);
    this.notifySceneChanged();
  }

  clearScene() {
    this.elements = [];
    this.sources = [];
    this.selectElement(null);
    this.drawPoints = [];
    this.rulerP1 = null;
    this.rulerP2 = null;
    this.notifySceneChanged();
  }

  selectElement(elem) {
    if (this.selectedElement) {
      this.selectedElement.isSelected = false;
    }
    this.selectedElement = elem;
    if (this.selectedElement) {
      this.selectedElement.isSelected = true;
    }
    this.selectedNodeIdx = -1;

    if (this.onElementSelected) {
      this.onElementSelected(elem);
    }
  }

  notifySceneChanged() {
    if (this.onSceneChanged) {
      this.onSceneChanged();
    }
  }

  finishCurrentDrawing() {
    if (this.drawPoints.length < 3) {
      if (window.showToast && window.t) {
        window.showToast(window.t('toast_drawing_min_points'), 'warning');
      }
      return;
    }

    const pts = this.drawPoints.map(p => [p[0], p[1]]);
    const isSmooth = (this.mode === CanvasMode.DRAW_FREEHAND);
    const lensName = isSmooth ? "Lente Mano Alzada" : "Polígono Óptico";
    const newLens = new CustomLens(pts, 1.55, lensName, isSmooth, false);

    this.addElement(newLens);
    this.drawPoints = [];
    this.isDrawing = false;
    this.setMode(CanvasMode.SELECT);

    if (window.showToast && window.t) {
      window.showToast(window.t('toast_drawing_finished'), 'success');
    }
  }

  // --- EVENTOS DEL RATÓN Y TÁCTILES ---

  initEvents() {
    const canvas = this.canvas;

    // Rueda del ratón (Zoom centrado en cursor)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      const [wx, wy] = this.screenToWorld(mouseX, mouseY);

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.max(0.15, Math.min(8.0, this.zoomLevel * zoomFactor));

      // Ajustar pan para que el punto bajo el cursor no se desplace
      this.panOffset.x = mouseX - (this.width / 2.0) - (wx * newZoom);
      this.panOffset.y = mouseY - (this.height / 2.0) - (wy * newZoom);
      this.zoomLevel = newZoom;
    }, { passive: false });

    // Presionar botón del ratón
    canvas.addEventListener('mousedown', (e) => {
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      const worldPos = this.screenToWorld(mouseX, mouseY);
      this.lastMousePos = { x: mouseX, y: mouseY };

      // Clic central o botón derecho o modo PAN activa desplazamiento de vista
      if (e.button === 1 || e.button === 2 || this.mode === CanvasMode.PAN || e.spaceKey) {
        this.isPanning = true;
        canvas.style.cursor = 'grabbing';
        return;
      }

      if (e.button !== 0) return; // Solo clic izquierdo para interactuar

      if (this.mode === CanvasMode.SELECT) {
        // 1. Probar si se hizo clic sobre una fuente de luz
        for (let i = this.sources.length - 1; i >= 0; i--) {
          const src = this.sources[i];
          const dist = Math.hypot(worldPos[0] - src.position[0], worldPos[1] - src.position[1]);
          if (dist < 28.0 / this.zoomLevel) {
            this.selectElement(src);
            this.isDraggingElement = true;
            this.dragStartWorld = [worldPos[0], worldPos[1]];
            this.dragStartElemPos = [src.position[0], src.position[1]];
            return;
          }
        }

        // 2. Probar si se hizo clic dentro o cerca de un elemento óptico
        let hitFound = null;
        for (let i = this.elements.length - 1; i >= 0; i--) {
          const elem = this.elements[i];
          if (elem instanceof CustomLens) {
            if (pointInPolygon(worldPos, elem.boundaryPoints)) {
              hitFound = elem;
              break;
            }
          } else if (elem instanceof FlatMirror || elem instanceof DetectorScreen) {
            const near = this.isPointNearSegment(worldPos, elem.p1, elem.p2, 18.0 / this.zoomLevel);
            if (near) {
              hitFound = elem;
              break;
            }
          }
        }

        if (hitFound) {
          this.selectElement(hitFound);
          this.isDraggingElement = true;
          this.dragStartWorld = [worldPos[0], worldPos[1]];
          return;
        } else {
          this.selectElement(null);
        }
      } else if (this.mode === CanvasMode.NODE_EDIT) {
        // 1. Probar primero si el clic o toque está cerca de cualquier nodo interactivo (48px de tolerancia)
        const nodeHit = this.findClosestNode(worldPos, 48.0);
        if (nodeHit) {
          this.selectElement(nodeHit.element);
          this.selectedNodeIdx = nodeHit.nodeIdx;
          this.isDraggingElement = true;
          return;
        }

        // 2. Si no tocó directamente un nodo, probar si hizo clic dentro del cuerpo de una figura óptica
        let hitFound = null;
        for (let j = this.elements.length - 1; j >= 0; j--) {
          const elem = this.elements[j];
          if (elem instanceof CustomLens) {
            if (pointInPolygon(worldPos, elem.boundaryPoints)) {
              hitFound = elem;
              break;
            }
            const bpts = elem.boundaryPoints;
            for (let i = 0; i < bpts.length; i++) {
              const p1 = bpts[i];
              const p2 = bpts[(i + 1) % bpts.length];
              if (this.isPointNearSegment(worldPos, p1, p2, 22.0 / this.zoomLevel)) {
                hitFound = elem;
                break;
              }
            }
            if (hitFound) break;
          } else if (elem instanceof FlatMirror || elem instanceof DetectorScreen) {
            if (this.isPointNearSegment(worldPos, elem.p1, elem.p2, 24.0 / this.zoomLevel)) {
              hitFound = elem;
              break;
            }
          }
        }

        if (hitFound) {
          this.selectElement(hitFound);
          // Si tocó la figura cerca de una esquina (hasta 65px), enganchar de una vez el nodo para que pueda deformarlo de inmediato
          const nearNode = this.findClosestNode(worldPos, 65.0);
          if (nearNode && nearNode.element === hitFound) {
            this.selectedNodeIdx = nearNode.nodeIdx;
            this.isDraggingElement = true;
          } else {
            this.selectedNodeIdx = -1;
          }
          return;
        }

        // 3. Probar si se hizo clic en una fuente de luz
        for (let i = this.sources.length - 1; i >= 0; i--) {
          const src = this.sources[i];
          const dist = Math.hypot(worldPos[0] - src.position[0], worldPos[1] - src.position[1]);
          if (dist < 32.0 / this.zoomLevel) {
            this.selectElement(src);
            return;
          }
        }
      } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
        this.isDrawing = true;
        this.drawPoints = [worldPos];
      } else if (this.mode === CanvasMode.DRAW_POLYGON) {
        this.drawPoints.push(worldPos);
      } else if (this.mode === CanvasMode.RULER) {
        this.rulerP1 = worldPos;
        this.rulerP2 = worldPos;
        this.isDrawing = true;
      }
    });

    // Mover ratón
    canvas.addEventListener('mousemove', (e) => {
      const mouseX = e.offsetX;
      const mouseY = e.offsetY;
      const worldPos = this.screenToWorld(mouseX, mouseY);

      if (this.onCoordsChanged) {
        this.onCoordsChanged(worldPos[0], worldPos[1]);
      }

      if (this.isPanning) {
        const dx = mouseX - this.lastMousePos.x;
        const dy = mouseY - this.lastMousePos.y;
        this.panOffset.x += dx;
        this.panOffset.y += dy;
        this.lastMousePos = { x: mouseX, y: mouseY };
        return;
      }

      if (this.isDraggingElement) {
        const dx = worldPos[0] - this.dragStartWorld[0];
        const dy = worldPos[1] - this.dragStartWorld[1];

        if (this.mode === CanvasMode.SELECT) {
          if (this.selectedElement instanceof LightSource) {
            this.selectedElement.position[0] = this.dragStartElemPos[0] + dx;
            this.selectedElement.position[1] = this.dragStartElemPos[1] + dy;
          } else if (this.selectedElement && typeof this.selectedElement.translate === 'function') {
            this.selectedElement.translate(dx, dy);
            this.dragStartWorld = [worldPos[0], worldPos[1]];
          }
          this.notifySceneChanged();
        } else if (this.mode === CanvasMode.NODE_EDIT && this.selectedNodeIdx !== -1) {
          if (this.selectedElement instanceof CustomLens) {
            this.selectedElement.controlPoints[this.selectedNodeIdx][0] = worldPos[0];
            this.selectedElement.controlPoints[this.selectedNodeIdx][1] = worldPos[1];
            this.selectedElement.invalidateCache();
            this.notifySceneChanged();
          } else if (this.selectedElement instanceof FlatMirror || this.selectedElement instanceof DetectorScreen) {
            if (this.selectedNodeIdx === 0) {
              this.selectedElement.p1[0] = worldPos[0];
              this.selectedElement.p1[1] = worldPos[1];
            } else if (this.selectedNodeIdx === 1) {
              this.selectedElement.p2[0] = worldPos[0];
              this.selectedElement.p2[1] = worldPos[1];
            }
            this.notifySceneChanged();
          }
        }
        return;
      }

      if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
        const last = this.drawPoints[this.drawPoints.length - 1];
        if (Math.hypot(worldPos[0] - last[0], worldPos[1] - last[1]) > 8.0 / this.zoomLevel) {
          this.drawPoints.push(worldPos);
        }
      } else if (this.mode === CanvasMode.RULER && this.isDrawing) {
        this.rulerP2 = worldPos;
      }

      this.lastMousePos = { x: mouseX, y: mouseY };
    });

    // Soltar botón del ratón
    const onMouseUp = () => {
      if (this.isPanning) {
        this.isPanning = false;
        canvas.style.cursor = 'crosshair';
      }
      this.isDraggingElement = false;
      this.selectedNodeIdx = -1;

      if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
        this.isDrawing = false;
        if (this.drawPoints.length >= 3) {
          this.finishCurrentDrawing();
        }
      } else if (this.mode === CanvasMode.RULER && this.isDrawing) {
        this.isDrawing = false;
      }
    };

    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // --- MANEJO DE EVENTOS TÁCTILES MÓVILES (TOUCH & MULTI-TOUCH GESTURES) ---

    // 1. Tocar pantalla (1 dedo o 2 dedos para pinch-zoom)
    const onTouchStart = (e) => {
      // Prevenir comportamientos por defecto del navegador en el canvas
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 2) {
        // Iniciar gesto de pellizco (Pinch to zoom + Pan con 2 dedos)
        this.isDraggingElement = false;
        this.isPanning = false;
        this.selectedNodeIdx = -1;

        const p1 = this.getTouchCanvasCoords(e.touches[0]);
        const p2 = this.getTouchCanvasCoords(e.touches[1]);
        this.initialPinchDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        this.initialZoom = this.zoomLevel;
        const midX = (p1.x + p2.x) / 2.0;
        const midY = (p1.y + p2.y) / 2.0;
        this.pinchMidpointWorld = this.screenToWorld(midX, midY);
        this.isPinching = true;
        return;
      }

      if (e.touches.length === 1) {
        this.isPinching = false;
        const pos = this.getTouchCanvasCoords(e.touches[0]);
        const worldPos = this.screenToWorld(pos.x, pos.y);
        this.lastTouchPos = { x: pos.x, y: pos.y };

        if (this.onCoordsChanged) {
          this.onCoordsChanged(worldPos[0], worldPos[1]);
        }

        if (this.mode === CanvasMode.SELECT) {
          // Tolerancia táctil más generosa para dedos
          const touchSourceRadius = 38.0 / this.zoomLevel;
          const touchSegmentDist = 28.0 / this.zoomLevel;

          // Probar fuentes de luz
          let foundSrc = null;
          for (let i = this.sources.length - 1; i >= 0; i--) {
            const src = this.sources[i];
            const dist = Math.hypot(worldPos[0] - src.position[0], worldPos[1] - src.position[1]);
            if (dist < touchSourceRadius) {
              foundSrc = src;
              break;
            }
          }

          if (foundSrc) {
            this.selectElement(foundSrc);
            this.isDraggingElement = true;
            this.dragStartWorld = [worldPos[0], worldPos[1]];
            this.dragStartElemPos = [foundSrc.position[0], foundSrc.position[1]];
            return;
          }

          // Probar elementos ópticos
          let hitFound = null;
          for (let i = this.elements.length - 1; i >= 0; i--) {
            const elem = this.elements[i];
            if (elem instanceof CustomLens) {
              if (pointInPolygon(worldPos, elem.boundaryPoints)) {
                hitFound = elem;
                break;
              }
              const bpts = elem.boundaryPoints;
              for (let j = 0; j < bpts.length; j++) {
                const p1 = bpts[j];
                const p2 = bpts[(j + 1) % bpts.length];
                if (this.isPointNearSegment(worldPos, p1, p2, touchSegmentDist)) {
                  hitFound = elem;
                  break;
                }
              }
              if (hitFound) break;
            } else if (elem instanceof FlatMirror || elem instanceof DetectorScreen) {
              if (this.isPointNearSegment(worldPos, elem.p1, elem.p2, touchSegmentDist)) {
                hitFound = elem;
                break;
              }
            }
          }

          if (hitFound) {
            this.selectElement(hitFound);
            this.isDraggingElement = true;
            this.dragStartWorld = [worldPos[0], worldPos[1]];
            return;
          }

          // Si tocó fondo vacío en móvil, deseleccionar y habilitar pan con 1 dedo
          this.selectElement(null);
          this.isPanning = true;
        } else if (this.mode === CanvasMode.NODE_EDIT) {
          // 1. Probar si el toque táctil está cerca de algún nodo interactivo (52px de tolerancia para dedos)
          const nodeHit = this.findClosestNode(worldPos, 52.0);
          if (nodeHit) {
            this.selectElement(nodeHit.element);
            this.selectedNodeIdx = nodeHit.nodeIdx;
            this.isDraggingElement = true;
            return;
          }

          // 2. Si no tocó nodo directamente, probar selección de elemento en modo nodo
          let hitFound = null;
          for (let j = this.elements.length - 1; j >= 0; j--) {
            const elem = this.elements[j];
            if (elem instanceof CustomLens) {
              if (pointInPolygon(worldPos, elem.boundaryPoints)) { hitFound = elem; break; }
              const bpts = elem.boundaryPoints;
              for (let i = 0; i < bpts.length; i++) {
                const p1 = bpts[i];
                const p2 = bpts[(i + 1) % bpts.length];
                if (this.isPointNearSegment(worldPos, p1, p2, 28.0 / this.zoomLevel)) {
                  hitFound = elem;
                  break;
                }
              }
              if (hitFound) break;
            } else if (elem instanceof FlatMirror || elem instanceof DetectorScreen) {
              if (this.isPointNearSegment(worldPos, elem.p1, elem.p2, 32.0 / this.zoomLevel)) { hitFound = elem; break; }
            }
          }

          if (hitFound) {
            this.selectElement(hitFound);
            // Enganchar el nodo más cercano si está a menos de 75px de distancia del dedo
            const nearNode = this.findClosestNode(worldPos, 75.0);
            if (nearNode && nearNode.element === hitFound) {
              this.selectedNodeIdx = nearNode.nodeIdx;
              this.isDraggingElement = true;
            } else {
              this.selectedNodeIdx = -1;
            }
            return;
          }

          // Panning si tocó fondo vacío
          this.isPanning = true;
        } else if (this.mode === CanvasMode.DRAW_FREEHAND) {
          this.isDrawing = true;
          this.drawPoints = [worldPos];
        } else if (this.mode === CanvasMode.DRAW_POLYGON) {
          this.drawPoints.push(worldPos);
        } else if (this.mode === CanvasMode.RULER) {
          this.rulerP1 = worldPos;
          this.rulerP2 = worldPos;
          this.isDrawing = true;
        }
      }
    };

    // 2. Mover dedo (Arrastrar elemento, pan o pinch-zoom)
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();

      // Zoom con 2 dedos
      if (e.touches.length === 2 && this.isPinching) {
        const p1 = this.getTouchCanvasCoords(e.touches[0]);
        const p2 = this.getTouchCanvasCoords(e.touches[1]);
        const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const currentMidX = (p1.x + p2.x) / 2.0;
        const currentMidY = (p1.y + p2.y) / 2.0;

        if (this.initialPinchDist > 8) {
          const factor = currentDist / this.initialPinchDist;
          const newZoom = Math.max(0.15, Math.min(8.0, this.initialZoom * factor));
          this.zoomLevel = newZoom;

          // Mantener centrado sobre el punto focal del pellizco
          const wx = this.pinchMidpointWorld[0];
          const wy = this.pinchMidpointWorld[1];
          this.panOffset.x = currentMidX - (this.width / 2.0) - (wx * newZoom);
          this.panOffset.y = currentMidY - (this.height / 2.0) - (wy * newZoom);
        }
        return;
      }

      // Interacción con 1 dedo
      if (e.touches.length === 1 && !this.isPinching) {
        const pos = this.getTouchCanvasCoords(e.touches[0]);
        const worldPos = this.screenToWorld(pos.x, pos.y);

        if (this.onCoordsChanged) {
          this.onCoordsChanged(worldPos[0], worldPos[1]);
        }

        if (this.isPanning && this.lastTouchPos) {
          const dx = pos.x - this.lastTouchPos.x;
          const dy = pos.y - this.lastTouchPos.y;
          this.panOffset.x += dx;
          this.panOffset.y += dy;
          this.lastTouchPos = { x: pos.x, y: pos.y };
          return;
        }

        if (this.isDraggingElement) {
          const dx = worldPos[0] - this.dragStartWorld[0];
          const dy = worldPos[1] - this.dragStartWorld[1];

          if (this.mode === CanvasMode.SELECT) {
            if (this.selectedElement instanceof LightSource) {
              this.selectedElement.position[0] = this.dragStartElemPos[0] + dx;
              this.selectedElement.position[1] = this.dragStartElemPos[1] + dy;
            } else if (this.selectedElement && typeof this.selectedElement.translate === 'function') {
              this.selectedElement.translate(dx, dy);
              this.dragStartWorld = [worldPos[0], worldPos[1]];
            }
            this.notifySceneChanged();
          } else if (this.mode === CanvasMode.NODE_EDIT && this.selectedNodeIdx !== -1) {
            if (this.selectedElement instanceof CustomLens) {
              this.selectedElement.controlPoints[this.selectedNodeIdx][0] = worldPos[0];
              this.selectedElement.controlPoints[this.selectedNodeIdx][1] = worldPos[1];
              this.selectedElement.invalidateCache();
              this.notifySceneChanged();
            } else if (this.selectedElement instanceof FlatMirror || this.selectedElement instanceof DetectorScreen) {
              if (this.selectedNodeIdx === 0) {
                this.selectedElement.p1[0] = worldPos[0];
                this.selectedElement.p1[1] = worldPos[1];
              } else if (this.selectedNodeIdx === 1) {
                this.selectedElement.p2[0] = worldPos[0];
                this.selectedElement.p2[1] = worldPos[1];
              }
              this.notifySceneChanged();
            }
          }
          this.lastTouchPos = { x: pos.x, y: pos.y };
          return;
        }

        if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
          const last = this.drawPoints[this.drawPoints.length - 1];
          if (Math.hypot(worldPos[0] - last[0], worldPos[1] - last[1]) > 8.0 / this.zoomLevel) {
            this.drawPoints.push(worldPos);
          }
        } else if (this.mode === CanvasMode.RULER && this.isDrawing) {
          this.rulerP2 = worldPos;
        }

        this.lastTouchPos = { x: pos.x, y: pos.y };
      }
    };

    // 3. Levantar dedo
    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        this.isPinching = false;
        this.isPanning = false;
        this.isDraggingElement = false;
        this.selectedNodeIdx = -1;

        if (this.mode === CanvasMode.DRAW_FREEHAND && this.isDrawing) {
          this.isDrawing = false;
          if (this.drawPoints.length >= 3) {
            this.finishCurrentDrawing();
          }
        } else if (this.mode === CanvasMode.RULER && this.isDrawing) {
          this.isDrawing = false;
        }
      } else if (e.touches.length === 1) {
        // Queda un dedo activo
        this.isPinching = false;
        const pos = this.getTouchCanvasCoords(e.touches[0]);
        this.lastTouchPos = { x: pos.x, y: pos.y };
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  isPointNearSegment(pt, p1, p2, threshold = 15.0) {
    const vx = p2[0] - p1[0];
    const vy = p2[1] - p1[1];
    const lenSq = vx * vx + vy * vy;
    if (lenSq < 1e-12) {
      return Math.hypot(pt[0] - p1[0], pt[1] - p1[1]) < threshold;
    }
    const t = Math.max(0.0, Math.min(1.0, ((pt[0] - p1[0]) * vx + (pt[1] - p1[1]) * vy) / lenSq));
    const projX = p1[0] + t * vx;
    const projY = p1[1] + t * vy;
    return Math.hypot(pt[0] - projX, pt[1] - projY) < threshold;
  }

  // --- RENDERIZADO PRINCIPAL (60 FPS) ---

  renderLoop() {
    this.render();
    requestAnimationFrame(() => this.renderLoop());
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Cuadrícula métrica
    if (this.showGrid) {
      this.renderGrid(ctx);
    }

    // 2. Eje óptico central
    if (this.showAxis) {
      this.renderAxis(ctx);
    }

    // 3. Limpiar impactos en pantallas detectoras antes de trazar
    for (let i = 0; i < this.elements.length; i++) {
      if (this.elements[i] instanceof DetectorScreen) {
        this.elements[i].clearHits();
      }
    }

    // 4. Trazar y dibujar rayos de luz
    this.renderLightRays(ctx);

    // 5. Dibujar elementos ópticos (Lentes, Espejos, Pantallas)
    this.renderOpticalElements(ctx);

    // 6. Dibujar fuentes de luz emisoras
    this.renderLightSources(ctx);

    // 7. Modos especiales de edición (Nodos, Dibujo, Regla)
    this.renderOverlays(ctx);
  }

  renderGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(54, 59, 88, 0.45)';
    ctx.lineWidth = 1;

    const screenTopLeft = this.screenToWorld(0, 0);
    const screenBottomRight = this.screenToWorld(this.width, this.height);

    const step = this.gridSize;
    const startX = Math.floor(screenTopLeft[0] / step) * step;
    const endX = Math.ceil(screenBottomRight[0] / step) * step;
    const startY = Math.floor(screenTopLeft[1] / step) * step;
    const endY = Math.ceil(screenBottomRight[1] / step) * step;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      const p1 = this.worldToScreen(x, screenTopLeft[1]);
      const p2 = this.worldToScreen(x, screenBottomRight[1]);
      ctx.moveTo(Math.round(p1.x) + 0.5, Math.round(p1.y));
      ctx.lineTo(Math.round(p2.x) + 0.5, Math.round(p2.y));
    }
    for (let y = startY; y <= endY; y += step) {
      const p1 = this.worldToScreen(screenTopLeft[0], y);
      const p2 = this.worldToScreen(screenBottomRight[0], y);
      ctx.moveTo(Math.round(p1.x), Math.round(p1.y) + 0.5);
      ctx.lineTo(Math.round(p2.x), Math.round(p2.y) + 0.5);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderAxis(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);

    // Eje X (Óptico horizontal)
    const pX1 = this.worldToScreen(-10000, 0);
    const pX2 = this.worldToScreen(10000, 0);
    ctx.beginPath();
    ctx.moveTo(pX1.x, pX1.y);
    ctx.lineTo(pX2.x, pX2.y);
    ctx.stroke();

    // Eje Y (Transversal)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    const pY1 = this.worldToScreen(0, -10000);
    const pY2 = this.worldToScreen(0, 10000);
    ctx.beginPath();
    ctx.moveTo(pY1.x, pY1.y);
    ctx.lineTo(pY2.x, pY2.y);
    ctx.stroke();

    ctx.restore();
  }

  renderLightRays(ctx) {
    ctx.save();
    // Mezcla de fotones para efecto de brillo intenso
    ctx.globalCompositeOperation = 'screen';

    for (let s = 0; s < this.sources.length; s++) {
      const src = this.sources[s];
      if (!src.isActive) continue;

      const rays = src.generateRays();

      if (src.isWhiteLight) {
        // Trazar todos los rayos policromáticos de la luz blanca
        const rayPaths = [];
        for (let r = 0; r < rays.length; r++) {
          const ray = rays[r];
          const path = traceRayScene(ray, this.elements, this.maxBounces, this.minIntensity);
          rayPaths.push({ ray, path });
        }

        const count = src.rayCount || 11;
        const halfW = count > 1 ? Math.min(30.0, 1.0 + count * 0.7) : 0;
        const numSamples = rays[0] && rays[0].totalSamples ? rays[0].totalSamples : 1;
        const lineSpacing = numSamples > 1 ? (2.0 * halfW) / (numSamples - 1) : 0;
        const beamLineThick = Math.max(2.6, lineSpacing + 2.0);

        // 1. Dibujar los tramos incidentes de luz blanca pura (tramo 0: desde el emisor p0 hasta el primer impacto p1)
        // Agrupamos por línea espacial para renderizar el haz blanco continuo que viaja en el aire
        const drawnSpatialSamples = new Set();
        ctx.save();

        // Capa de resplandor blanco exterior
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowBlur = Math.min(22, 6 + beamLineThick * 0.6);
        ctx.lineWidth = beamLineThick + 4;
        ctx.lineCap = 'butt';

        for (let r = 0; r < rayPaths.length; r++) {
          const { ray, path } = rayPaths[r];
          if (path.length < 2) continue;
          const sIdx = ray.spatialSampleIdx !== undefined ? ray.spatialSampleIdx : r;
          if (drawnSpatialSamples.has(sIdx)) continue;
          drawnSpatialSamples.add(sIdx);

          const s0 = this.worldToScreen(path[0][0], path[0][1]);
          const s1 = this.worldToScreen(path[1][0], path[1][1]);

          ctx.beginPath();
          ctx.moveTo(s0.x, s0.y);
          ctx.lineTo(s1.x, s1.y);
          ctx.stroke();
        }

        // Núcleo blanco sólido puro
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.lineWidth = beamLineThick;
        drawnSpatialSamples.clear();

        for (let r = 0; r < rayPaths.length; r++) {
          const { ray, path } = rayPaths[r];
          if (path.length < 2) continue;
          const sIdx = ray.spatialSampleIdx !== undefined ? ray.spatialSampleIdx : r;
          if (drawnSpatialSamples.has(sIdx)) continue;
          drawnSpatialSamples.add(sIdx);

          const s0 = this.worldToScreen(path[0][0], path[0][1]);
          const s1 = this.worldToScreen(path[1][0], path[1][1]);

          ctx.beginPath();
          ctx.moveTo(s0.x, s0.y);
          ctx.lineTo(s1.x, s1.y);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Dibujar las refracciones espectrales en los 7 Colores del Arcoíris (a partir del primer impacto en cualquier medio óptico)
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const refrThickness = Math.max(2.4, Math.min(5.0, 1.8 + beamLineThick * 0.28));

        for (let r = 0; r < rayPaths.length; r++) {
          const { ray, path } = rayPaths[r];
          // Solo se dibuja refracción si el rayo impactó una figura y continuó su propagación (path.length > 2)
          if (path.length <= 2) continue;

          const rgb = ray.color;
          const colorStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          const glowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.85)`;

          ctx.strokeStyle = colorStr;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
          ctx.lineWidth = refrThickness;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          const startPt = this.worldToScreen(path[1][0], path[1][1]);
          ctx.moveTo(startPt.x, startPt.y);

          for (let p = 2; p < path.length; p++) {
            const ptScreen = this.worldToScreen(path[p][0], path[p][1]);
            ctx.lineTo(ptScreen.x, ptScreen.y);
          }
          ctx.stroke();
        }
        ctx.restore();
      } else {
        // Fuente normal monocromática
        for (let r = 0; r < rays.length; r++) {
          const ray = rays[r];
          const path = traceRayScene(ray, this.elements, this.maxBounces, this.minIntensity);
          if (path.length < 2) continue;

          const rgb = ray.color;
          const colorStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
          const glowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.4)`;

          ctx.strokeStyle = colorStr;
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 6;
          ctx.lineWidth = 1.6;

          ctx.beginPath();
          const startScreen = this.worldToScreen(path[0][0], path[0][1]);
          ctx.moveTo(startScreen.x, startScreen.y);

          for (let p = 1; p < path.length; p++) {
            const ptScreen = this.worldToScreen(path[p][0], path[p][1]);
            ctx.lineTo(ptScreen.x, ptScreen.y);
          }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  renderOpticalElements(ctx) {
    ctx.save();

    for (let i = 0; i < this.elements.length; i++) {
      const elem = this.elements[i];
      if (!elem.isActive) continue;

      const isSelected = elem.isSelected;

      if (elem instanceof CustomLens) {
        const pts = elem.boundaryPoints;
        if (pts.length < 3) continue;

        ctx.beginPath();
        const p0 = this.worldToScreen(pts[0][0], pts[0][1]);
        ctx.moveTo(p0.x, p0.y);
        for (let j = 1; j < pts.length; j++) {
          const p = this.worldToScreen(pts[j][0], pts[j][1]);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();

        // Relleno de vidrio translúcido con sutil brillo
        ctx.fillStyle = isSelected 
          ? 'rgba(255, 184, 108, 0.16)' 
          : 'rgba(0, 255, 204, 0.08)';
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffb86c' : 'rgba(0, 255, 204, 0.85)';
        ctx.lineWidth = isSelected ? 2.5 : 1.8;
        ctx.shadowColor = isSelected ? 'rgba(255, 184, 108, 0.5)' : 'rgba(0, 255, 204, 0.35)';
        ctx.shadowBlur = isSelected ? 12 : 6;
        ctx.stroke();

        // Etiqueta del índice de refracción
        const c = elem.getCentroid();
        const cs = this.worldToScreen(c[0], c[1]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(`n = ${elem.n.toFixed(2)}`, cs.x, cs.y + 4);
      } else if (elem instanceof FlatMirror) {
        const s1 = this.worldToScreen(elem.p1[0], elem.p1[1]);
        const s2 = this.worldToScreen(elem.p2[0], elem.p2[1]);

        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);

        ctx.strokeStyle = isSelected ? '#ffb86c' : '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Marca de soporte posterior del espejo
        const vx = s2.x - s1.x;
        const vy = s2.y - s1.y;
        const len = Math.hypot(vx, vy);
        if (len > 0) {
          const nx = -vy / len * 6;
          const ny = vx / len * 6;
          ctx.strokeStyle = 'rgba(150, 160, 190, 0.5)';
          ctx.lineWidth = 1.2;
          ctx.shadowBlur = 0;
          const ticks = Math.floor(len / 12);
          for (let t = 0; t <= ticks; t++) {
            const tx = s1.x + (vx * t) / ticks;
            const ty = s1.y + (vy * t) / ticks;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + nx, ty + ny);
            ctx.stroke();
          }
        }
      } else if (elem instanceof DetectorScreen) {
        const s1 = this.worldToScreen(elem.p1[0], elem.p1[1]);
        const s2 = this.worldToScreen(elem.p2[0], elem.p2[1]);

        // Línea base del detector
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.strokeStyle = isSelected ? '#ffb86c' : '#facc15';
        ctx.lineWidth = 3.0;
        ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Dibujar impactos de fotones en la pantalla
        ctx.shadowBlur = 0;
        for (let h = 0; h < elem.hits.length; h++) {
          const hit = elem.hits[h];
          const hx = s1.x + (s2.x - s1.x) * hit.posU;
          const hy = s1.y + (s2.y - s1.y) * hit.posU;
          ctx.fillStyle = `rgb(${hit.color[0]}, ${hit.color[1]}, ${hit.color[2]})`;
          ctx.beginPath();
          ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  renderLightSources(ctx) {
    ctx.save();
    for (let s = 0; s < this.sources.length; s++) {
      const src = this.sources[s];
      if (!src.isActive) continue;

      const isSelected = src.isSelected;
      const sp = this.worldToScreen(src.position[0], src.position[1]);
      const dir = src.getDirectionVector();

      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(src.angleDeg * (Math.PI / 180.0));

      // Emisor de luz (estilo cuerpo de diodo / linterna óptica)
      ctx.fillStyle = isSelected ? '#ffb86c' : '#212436';
      ctx.strokeStyle = isSelected ? '#ffffff' : '#00ffcc';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 255, 204, 0.4)';
      ctx.shadowBlur = isSelected ? 12 : 6;

      const count = src.rayCount || 11;
      const beamHalfW = src.isWhiteLight 
        ? (count > 1 ? Math.min(30.0, 1.0 + count * 0.7) : 0) 
        : 0;
      const halfH = src.isWhiteLight 
        ? Math.max(10, Math.min(36, beamHalfW + 4)) 
        : 10;

      ctx.beginPath();
      ctx.rect(-16, -halfH, 20, halfH * 2);
      ctx.fill();
      ctx.stroke();

      // Flecha de emisión en la punta
      if (src.isWhiteLight) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
      } else {
        const rgb = wavelengthToRGB(src.wavelength);
        ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        ctx.shadowColor = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.moveTo(4, -halfH * 0.75);
      ctx.lineTo(14, 0);
      ctx.lineTo(4, halfH * 0.75);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Etiqueta del nombre
      ctx.fillStyle = isSelected ? '#ffb86c' : '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(src.name, sp.x, sp.y - 18);
    }
    ctx.restore();
  }

  renderOverlays(ctx) {
    ctx.save();

    // 1. Visualización de Nodos en Modo NODE_EDIT
    if (this.mode === CanvasMode.NODE_EDIT) {
      // 1A. Puntos de guía para elementos NO seleccionados (para indicar que son editables con un clic)
      for (let j = 0; j < this.elements.length; j++) {
        const elem = this.elements[j];
        if (elem === this.selectedElement) continue;

        if (elem instanceof CustomLens) {
          const pts = elem.controlPoints;
          ctx.fillStyle = '#00ffcc';
          ctx.strokeStyle = '#0f111a';
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = 0;
          for (let i = 0; i < pts.length; i++) {
            const sp = this.worldToScreen(pts[i][0], pts[i][1]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (elem instanceof FlatMirror || elem instanceof DetectorScreen) {
          const pts = [elem.p1, elem.p2];
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#0f111a';
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = 0;
          for (let i = 0; i < pts.length; i++) {
            const sp = this.worldToScreen(pts[i][0], pts[i][1]);
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      // 1B. Nodos interactivos destacados para la figura SELECCIONADA (tamaño ergonómico para dedo y ratón)
      const renderHighlightedNodes = (pts) => {
        for (let i = 0; i < pts.length; i++) {
          const sp = this.worldToScreen(pts[i][0], pts[i][1]);
          const isSelectedNode = (i === this.selectedNodeIdx);

          // Halo exterior táctil
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, isSelectedNode ? 24.0 : 18.0, 0, Math.PI * 2);
          ctx.fillStyle = isSelectedNode ? 'rgba(255, 85, 119, 0.35)' : 'rgba(0, 255, 204, 0.22)';
          ctx.fill();

          // Círculo central interactivo
          ctx.fillStyle = isSelectedNode ? '#ff5577' : '#ffe600';
          ctx.strokeStyle = '#0f111a';
          ctx.lineWidth = 3.0;
          ctx.shadowColor = isSelectedNode ? 'rgba(255, 85, 119, 0.95)' : 'rgba(255, 230, 0, 0.9)';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(sp.x, sp.y, isSelectedNode ? 13.0 : 10.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      };

      if (this.selectedElement instanceof CustomLens) {
        renderHighlightedNodes(this.selectedElement.controlPoints);
      } else if (this.selectedElement instanceof FlatMirror || this.selectedElement instanceof DetectorScreen) {
        renderHighlightedNodes([this.selectedElement.p1, this.selectedElement.p2]);
      }
    }

    // 2. Trazo actual en modos de dibujo
    if (this.drawPoints.length > 0 && (this.mode === CanvasMode.DRAW_FREEHAND || this.mode === CanvasMode.DRAW_POLYGON)) {
      ctx.beginPath();
      const p0 = this.worldToScreen(this.drawPoints[0][0], this.drawPoints[0][1]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < this.drawPoints.length; i++) {
        const p = this.worldToScreen(this.drawPoints[i][0], this.drawPoints[i][1]);
        ctx.lineTo(p.x, p.y);
      }

      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      // Línea elástica hacia cursor
      if (this.mode === CanvasMode.DRAW_POLYGON) {
        ctx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
        ctx.stroke();
      }
    }

    // 3. Regla / Medidor óptico
    if (this.rulerP1 && this.rulerP2) {
      const s1 = this.worldToScreen(this.rulerP1[0], this.rulerP1[1]);
      const s2 = this.worldToScreen(this.rulerP2[0], this.rulerP2[1]);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();

      // Puntos en extremos
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(s1.x, s1.y, 4, 0, Math.PI * 2);
      ctx.arc(s2.x, s2.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Distancia y ángulo
      const dx = this.rulerP2[0] - this.rulerP1[0];
      const dy = this.rulerP2[1] - this.rulerP1[1];
      const distPx = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180.0 / Math.PI).toFixed(1);

      const midX = (s1.x + s2.x) / 2.0;
      const midY = (s1.y + s2.y) / 2.0 - 10;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      const text = `${distPx.toFixed(1)} mm | ${angle}°`;
      ctx.font = '12px Inter, sans-serif';
      const m = ctx.measureText(text);

      ctx.fillRect(midX - m.width / 2 - 6, midY - 14, m.width + 12, 20);
      ctx.strokeRect(midX - m.width / 2 - 6, midY - 14, m.width + 12, 20);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(text, midX, midY);
    }

    ctx.restore();
  }
}

// Exportar globalmente
window.CanvasMode = CanvasMode;
window.OpticsCanvasController = OpticsCanvasController;
