/**
 * Simulador de Óptica 2D - Ambystoma Technologies
 * elements.js - Elementos Ópticos, Lentes Deformables, Espejos, Pantallas y Fuentes de Luz
 */

class OpticalElement {
  constructor(name = "Element") {
    this.id = 'elem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.name = name;
    this.isActive = true;
    this.isSelected = false;
  }

  intersectRay(ray) {
    throw new Error("Método intersectRay no implementado");
  }
}

/**
 * Lente Óptica Personalizada basada en polígonos cerrados o curvas suaves Catmull-Rom.
 * Admite traslación, rotación, escalado y manipulación interactiva de nodos.
 */
class CustomLens extends OpticalElement {
  constructor(controlPoints, n = 1.5, name = "Custom Lens", isSmooth = true, dispersionEnabled = false) {
    super(name);
    this.controlPoints = controlPoints.map(p => [parseFloat(p[0]), parseFloat(p[1])]);
    this.n = parseFloat(n);
    this.nAmbient = 1.0;
    this._isSmooth = isSmooth;
    this.dispersionEnabled = dispersionEnabled;
    this.currentRotationDeg = 0.0;
    this._cachedBoundaryPts = null;
    this._cachedAABB = null;
  }

  get isSmooth() {
    return this._isSmooth;
  }

  set isSmooth(val) {
    this._isSmooth = val;
    this.invalidateCache();
  }

  invalidateCache() {
    this._cachedBoundaryPts = null;
    this._cachedAABB = null;
  }

  get boundaryPoints() {
    if (!this._cachedBoundaryPts) {
      if (this.controlPoints.length < 3) {
        this._cachedBoundaryPts = this.controlPoints;
      } else if (this._isSmooth) {
        this._cachedBoundaryPts = catmullRomSpline(this.controlPoints, 8);
      } else {
        this._cachedBoundaryPts = this.controlPoints;
      }

      // Cálculo de caja envolvente AABB
      let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
      for (let i = 0; i < this._cachedBoundaryPts.length; i++) {
        const pt = this._cachedBoundaryPts[i];
        if (pt[0] < xmin) xmin = pt[0];
        if (pt[1] < ymin) ymin = pt[1];
        if (pt[0] > xmax) xmax = pt[0];
        if (pt[1] > ymax) ymax = pt[1];
      }
      this._cachedAABB = [xmin - 2.0, ymin - 2.0, xmax + 2.0, ymax + 2.0];
    }
    return this._cachedBoundaryPts;
  }

  getCentroid() {
    if (this.controlPoints.length === 0) return [0, 0];
    let sumX = 0, sumY = 0;
    for (let i = 0; i < this.controlPoints.length; i++) {
      sumX += this.controlPoints[i][0];
      sumY += this.controlPoints[i][1];
    }
    return [sumX / this.controlPoints.length, sumY / this.controlPoints.length];
  }

  translate(dx, dy) {
    for (let i = 0; i < this.controlPoints.length; i++) {
      this.controlPoints[i][0] += dx;
      this.controlPoints[i][1] += dy;
    }
    this.invalidateCache();
  }

  rotate(angleRad, center = null) {
    if (!center) center = this.getCentroid();
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    for (let i = 0; i < this.controlPoints.length; i++) {
      const rx = this.controlPoints[i][0] - center[0];
      const ry = this.controlPoints[i][1] - center[1];
      this.controlPoints[i][0] = center[0] + (rx * cosA - ry * sinA);
      this.controlPoints[i][1] = center[1] + (rx * sinA + ry * cosA);
    }
    this.invalidateCache();
  }

  rotateToAngle(targetAngleDeg) {
    const deltaRad = (targetAngleDeg - this.currentRotationDeg) * (Math.PI / 180.0);
    this.rotate(deltaRad);
    this.currentRotationDeg = parseFloat(targetAngleDeg);
  }

  scale(factorX, factorY, center = null) {
    if (!center) center = this.getCentroid();
    for (let i = 0; i < this.controlPoints.length; i++) {
      const rx = this.controlPoints[i][0] - center[0];
      const ry = this.controlPoints[i][1] - center[1];
      this.controlPoints[i][0] = center[0] + rx * factorX;
      this.controlPoints[i][1] = center[1] + ry * factorY;
    }
    this.invalidateCache();
  }

  intersectRay(ray) {
    const pts = this.boundaryPoints;
    const numPts = pts.length;
    if (numPts < 3) return null;

    // Descarte temprano mediante AABB
    const [xmin, ymin, xmax, ymax] = this._cachedAABB;
    const ox = ray.origin[0], oy = ray.origin[1];
    const dx = ray.direction[0], dy = ray.direction[1];

    let tmin, tmax;
    if (dx !== 0) {
      const tx1 = (xmin - ox) / dx;
      const tx2 = (xmax - ox) / dx;
      tmin = Math.min(tx1, tx2);
      tmax = Math.max(tx1, tx2);
    } else {
      if (ox < xmin || ox > xmax) return null;
      tmin = -1e9;
      tmax = 1e9;
    }

    if (dy !== 0) {
      const ty1 = (ymin - oy) / dy;
      const ty2 = (ymax - oy) / dy;
      tmin = Math.max(tmin, Math.min(ty1, ty2));
      tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else {
      if (oy < ymin || oy > ymax) return null;
    }

    if (tmax < Math.max(0.0, tmin)) {
      return null;
    }

    // Intersección detallada por segmentos
    let closestHit = null;
    let closestT = Infinity;

    for (let i = 0; i < numPts; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % numPts];

      const res = raySegmentIntersection(ray.origin, ray.direction, p1, p2);
      if (res && res.t < closestT) {
        closestT = res.t;
        closestHit = {
          hitPt: res.point,
          p1: p1,
          p2: p2
        };
      }
    }

    if (!closestHit) return null;

    const hitPt = closestHit.hitPt;
    const edgeX = closestHit.p2[0] - closestHit.p1[0];
    const edgeY = closestHit.p2[1] - closestHit.p1[1];
    const edgeNorm = Math.hypot(edgeX, edgeY);
    if (edgeNorm < 1e-12) return null;

    // Vector normal perpendicular a la arista (-dy, dx)
    let normal = [-edgeY / edgeNorm, edgeX / edgeNorm];

    // Verificar si el origen del rayo está en el interior de la lente
    let rayIsInside = false;
    if (ox >= xmin && ox <= xmax && oy >= ymin && oy <= ymax) {
      rayIsInside = pointInPolygon(ray.origin, pts);
    }

    let n1, n2;
    if (rayIsInside) {
      n1 = this.n;
      n2 = this.nAmbient;
      if (dx * normal[0] + dy * normal[1] < 0) {
        normal[0] = -normal[0];
        normal[1] = -normal[1];
      }
    } else {
      n1 = this.nAmbient;
      n2 = this.n;
      if (dx * normal[0] + dy * normal[1] > 0) {
        normal[0] = -normal[0];
        normal[1] = -normal[1];
      }
    }

    return {
      dist: closestT,
      point: hitPt,
      normal: normal,
      n1: n1,
      n2: n2,
      isMirror: false,
      isScreen: false
    };
  }
}

/**
 * Espejo Plano Reflectante
 */
class FlatMirror extends OpticalElement {
  constructor(p1, p2, name = "Espejo Plano") {
    super(name);
    this.p1 = [parseFloat(p1[0]), parseFloat(p1[1])];
    this.p2 = [parseFloat(p2[0]), parseFloat(p2[1])];
  }

  translate(dx, dy) {
    this.p1[0] += dx;
    this.p1[1] += dy;
    this.p2[0] += dx;
    this.p2[1] += dy;
  }

  rotateToAngle(targetAngleDeg) {
    const midX = (this.p1[0] + this.p2[0]) / 2.0;
    const midY = (this.p1[1] + this.p2[1]) / 2.0;
    const len = Math.hypot(this.p2[0] - this.p1[0], this.p2[1] - this.p1[1]);
    const rad = targetAngleDeg * (Math.PI / 180.0);
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const halfLen = len / 2.0;

    this.p1 = [midX - dirX * halfLen, midY - dirY * halfLen];
    this.p2 = [midX + dirX * halfLen, midY + dirY * halfLen];
  }

  intersectRay(ray) {
    const res = raySegmentIntersection(ray.origin, ray.direction, this.p1, this.p2);
    if (!res) return null;

    const edgeX = this.p2[0] - this.p1[0];
    const edgeY = this.p2[1] - this.p1[1];
    const edgeNorm = Math.hypot(edgeX, edgeY);
    if (edgeNorm < 1e-12) return null;

    let normal = [-edgeY / edgeNorm, edgeX / edgeNorm];
    if (ray.direction[0] * normal[0] + ray.direction[1] * normal[1] > 0) {
      normal[0] = -normal[0];
      normal[1] = -normal[1];
    }

    return {
      dist: res.t,
      point: res.point,
      normal: normal,
      isMirror: true,
      isScreen: false
    };
  }
}

/**
 * Pantalla / Detector de Rayos Incidentes con Histograma de Impactos
 */
class DetectorScreen extends OpticalElement {
  constructor(p1, p2, name = "Pantalla / Detector") {
    super(name);
    this.p1 = [parseFloat(p1[0]), parseFloat(p1[1])];
    this.p2 = [parseFloat(p2[0]), parseFloat(p2[1])];
    this.hits = []; // { posU, intensity, color }
  }

  translate(dx, dy) {
    this.p1[0] += dx;
    this.p1[1] += dy;
    this.p2[0] += dx;
    this.p2[1] += dy;
  }

  rotateToAngle(targetAngleDeg) {
    const midX = (this.p1[0] + this.p2[0]) / 2.0;
    const midY = (this.p1[1] + this.p2[1]) / 2.0;
    const len = Math.hypot(this.p2[0] - this.p1[0], this.p2[1] - this.p1[1]);
    const rad = targetAngleDeg * (Math.PI / 180.0);
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const halfLen = len / 2.0;

    this.p1 = [midX - dirX * halfLen, midY - dirY * halfLen];
    this.p2 = [midX + dirX * halfLen, midY + dirY * halfLen];
  }

  clearHits() {
    this.hits = [];
  }

  recordHit(point, intensity, color) {
    const vx = this.p2[0] - this.p1[0];
    const vy = this.p2[1] - this.p1[1];
    const lenSq = vx * vx + vy * vy;
    if (lenSq > 0) {
      const u = ((point[0] - this.p1[0]) * vx + (point[1] - this.p1[1]) * vy) / lenSq;
      this.hits.push({ posU: u, intensity: intensity, color: color });
    }
  }

  intersectRay(ray) {
    const res = raySegmentIntersection(ray.origin, ray.direction, this.p1, this.p2);
    if (!res) return null;

    const edgeX = this.p2[0] - this.p1[0];
    const edgeY = this.p2[1] - this.p1[1];
    const edgeNorm = Math.hypot(edgeX, edgeY);
    let normal = [0, 0];
    if (edgeNorm > 0) {
      normal = [-edgeY / edgeNorm, edgeX / edgeNorm];
    }

    return {
      dist: res.t,
      point: res.point,
      normal: normal,
      isMirror: false,
      isScreen: true
    };
  }
}

/**
 * Fuente de Luz Emisora de Rayos (Láser, Abanico, Haz Paralelo, Objeto)
 */
class LightSource {
  constructor(position, angleDeg = 0.0, name = "Fuente de Luz") {
    this.id = 'src_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    this.name = name;
    this.position = [parseFloat(position[0]), parseFloat(position[1])];
    this.angleDeg = parseFloat(angleDeg);
    this.isActive = true;
    this.isSelected = false;
    this.rayCount = 11;
    this.wavelength = 532.0; // Verde default
    this.beamWidth = 40.0;
    this.apertureDeg = 30.0;
    this.sourceType = "laser"; // 'laser', 'fan', 'parallel', 'object'
  }

  getDirectionVector() {
    const rad = this.angleDeg * (Math.PI / 180.0);
    return [Math.cos(rad), Math.sin(rad)];
  }

  generateRays() {
    const rays = [];
    const dir = this.getDirectionVector();
    const perp = [-dir[1], dir[0]];

    if (this.sourceType === "laser" || this.sourceType === "parallel") {
      if (this.rayCount === 1) {
        rays.push(new Ray(this.position, dir, this.wavelength));
      } else {
        const halfW = this.beamWidth / 2.0;
        for (let i = 0; i < this.rayCount; i++) {
          const off = this.rayCount > 1 
            ? -halfW + (2 * halfW * i) / (this.rayCount - 1)
            : 0;
          const orig = [
            this.position[0] + perp[0] * off,
            this.position[1] + perp[1] * off
          ];
          rays.push(new Ray(orig, dir, this.wavelength));
        }
      }
    } else if (this.sourceType === "fan") {
      const halfA = (this.apertureDeg / 2.0) * (Math.PI / 180.0);
      const centerRad = this.angleDeg * (Math.PI / 180.0);
      for (let i = 0; i < this.rayCount; i++) {
        const a = this.rayCount > 1
          ? (centerRad - halfA) + (2 * halfA * i) / (this.rayCount - 1)
          : centerRad;
        const d = [Math.cos(a), Math.sin(a)];
        rays.push(new Ray(this.position, d, this.wavelength));
      }
    } else if (this.sourceType === "object") {
      // Objeto lápiz emitiendo abanicos de rayos desde distintos puntos a lo largo de su altura
      const halfH = this.beamWidth / 2.0;
      const numPts = Math.max(3, Math.floor(this.rayCount / 5));
      const halfAngle = (this.apertureDeg / 2.0) * (Math.PI / 180.0);
      const centerRad = this.angleDeg * (Math.PI / 180.0);
      const raysPerPt = 5;

      for (let p = 0; p < numPts; p++) {
        const pOff = -halfH + (2 * halfH * p) / (numPts - 1);
        const orig = [
          this.position[0] + perp[0] * pOff,
          this.position[1] + perp[1] * pOff
        ];

        // Variación de color según altura del lápiz (ej: punta roja, base azul)
        const normH = (pOff + halfH) / (2 * halfH);
        const wl = 450.0 + normH * 200.0;

        for (let r = 0; r < raysPerPt; r++) {
          const a = raysPerPt > 1
            ? (centerRad - halfAngle) + (2 * halfAngle * r) / (raysPerPt - 1)
            : centerRad;
          const d = [Math.cos(a), Math.sin(a)];
          rays.push(new Ray(orig, d, wl));
        }
      }
    }

    return rays;
  }
}

// --- CREADORES DE FIGURAS PREDEFINIDAS ---

function createBiconvexLens(centerX, centerY, width = 45, height = 140, R1 = 90, R2 = 90, n = 1.5) {
  const pts = [];
  const numSamples = 15;

  // Arco derecho (curvatura frontal)
  for (let i = 0; i <= numSamples; i++) {
    const t = -1.0 + (2.0 * i) / numSamples;
    const y = t * (height / 2.0);
    const sag1 = (R1 !== 0) ? ((height / 2.0) ** 2) / (2 * Math.abs(R1)) : 0;
    const x = (width / 2.0) - sag1 * (1.0 - t * t);
    pts.push([centerX + x, centerY + y]);
  }

  // Arco izquierdo (curvatura posterior)
  for (let i = 0; i <= numSamples; i++) {
    const t = 1.0 - (2.0 * i) / numSamples;
    const y = t * (height / 2.0);
    const sag2 = (R2 !== 0) ? ((height / 2.0) ** 2) / (2 * Math.abs(R2)) : 0;
    const x = -(width / 2.0) + sag2 * (1.0 - t * t);
    pts.push([centerX + x, centerY + y]);
  }

  return new CustomLens(pts, n, "Lente Biconvexa", true);
}

function createBiconcaveLens(centerX, centerY, width = 45, height = 140, n = 1.5) {
  const pts = [];
  const numSamples = 15;
  const edgeW = width;
  const centerW = width * 0.3;

  pts.push([centerX - edgeW / 2, centerY - height / 2]);
  pts.push([centerX + edgeW / 2, centerY - height / 2]);

  // Curvatura cóncava derecha
  for (let i = 0; i <= numSamples; i++) {
    const t = -1.0 + (2.0 * i) / numSamples;
    const y = t * (height / 2.0);
    const x = centerW / 2 + (edgeW / 2 - centerW / 2) * (t * t);
    pts.push([centerX + x, centerY + y]);
  }

  pts.push([centerX - edgeW / 2, centerY + height / 2]);

  // Curvatura cóncava izquierda
  for (let i = 0; i <= numSamples; i++) {
    const t = 1.0 - (2.0 * i) / numSamples;
    const y = t * (height / 2.0);
    const x = -centerW / 2 - (edgeW / 2 - centerW / 2) * (t * t);
    pts.push([centerX + x, centerY + y]);
  }

  return new CustomLens(pts, n, "Lente Bicóncava", false);
}

function createTriangularPrism(centerX, centerY, sideLength = 120, n = 1.65, dispersion = true) {
  const h = sideLength * Math.sqrt(3) / 2.0;
  const pts = [
    [centerX, centerY - 2.0 * h / 3.0],
    [centerX + sideLength / 2.0, centerY + h / 3.0],
    [centerX - sideLength / 2.0, centerY + h / 3.0]
  ];
  return new CustomLens(pts, n, "Prisma Triangular", false, dispersion);
}

function createGlassSlab(centerX, centerY, width = 140, height = 80, n = 1.5) {
  const pts = [
    [centerX - width / 2, centerY - height / 2],
    [centerX + width / 2, centerY - height / 2],
    [centerX + width / 2, centerY + height / 2],
    [centerX - width / 2, centerY + height / 2]
  ];
  return new CustomLens(pts, n, "Bloque de Vidrio", false);
}

function createRightAnglePrism(centerX, centerY, width = 90, height = 130, n = 1.52, dispersion = false) {
  // Prisma rectangular 45°-90°-45° (Porro / Retrorreflector)
  const pts = [
    [centerX - width / 2, centerY - height / 2],
    [centerX + width / 2, centerY],
    [centerX - width / 2, centerY + height / 2]
  ];
  return new CustomLens(pts, n, "Prisma Rectangular / Porro", false, dispersion);
}

function createPlanoConcaveLens(centerX, centerY, width = 35, height = 140, n = 1.68, dispersion = true) {
  const pts = [];
  const numSamples = 15;
  const edgeW = width;
  const centerW = width * 0.25;

  pts.push([centerX - edgeW / 2, centerY - height / 2]);
  pts.push([centerX + edgeW / 2, centerY - height / 2]);

  // Cara cóncava derecha
  for (let i = 0; i <= numSamples; i++) {
    const t = -1.0 + (2.0 * i) / numSamples;
    const y = t * (height / 2.0);
    const x = centerW / 2 + (edgeW / 2 - centerW / 2) * (t * t);
    pts.push([centerX + x, centerY + y]);
  }

  pts.push([centerX - edgeW / 2, centerY + height / 2]);

  return new CustomLens(pts, n, "Lente Plano-Cóncava", false, dispersion);
}

// Exportar globalmente
window.OpticalElement = OpticalElement;
window.CustomLens = CustomLens;
window.FlatMirror = FlatMirror;
window.DetectorScreen = DetectorScreen;
window.LightSource = LightSource;
window.createBiconvexLens = createBiconvexLens;
window.createBiconcaveLens = createBiconcaveLens;
window.createTriangularPrism = createTriangularPrism;
window.createGlassSlab = createGlassSlab;
window.createRightAnglePrism = createRightAnglePrism;
window.createPlanoConcaveLens = createPlanoConcaveLens;
