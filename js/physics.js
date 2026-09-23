/**
 * Simulador de Óptica 2D - Ambystoma Technologies
 * physics.js - Motor de Trazado de Rayos, Ley de Snell, Reflexión y Dispersión
 */

// 7 Longitudes de onda del arcoíris canónico de Newton (Rojo, Naranja, Amarillo, Verde, Cian, Azul, Violeta)
const RAINBOW_7_WAVELENGTHS = [
  680.0, // Rojo (Red)
  610.0, // Naranja (Orange)
  580.0, // Amarillo (Yellow)
  535.0, // Verde (Green)
  495.0, // Cian (Cyan)
  450.0, // Azul (Blue / Indigo)
  405.0  // Violeta (Violet)
];

// Colores RGB canónicos de alto contraste y saturación para los 7 colores espectrales
const RAINBOW_7_COLORS = [
  [255, 30, 30],   // Rojo (680 nm)
  [255, 135, 0],   // Naranja (610 nm)
  [255, 235, 0],   // Amarillo (580 nm)
  [0, 240, 50],    // Verde (535 nm)
  [0, 220, 255],   // Cian (495 nm)
  [30, 90, 255],   // Azul (450 nm)
  [180, 20, 255]   // Violeta (405 nm)
];

class Ray {
  constructor(origin, direction, wavelength = 532.0, intensity = 1.0, depth = 0, color = null, isWhiteLight = false) {
    this.origin = [origin[0], origin[1]];
    const dirNorm = Math.hypot(direction[0], direction[1]);
    if (dirNorm < 1e-12) {
      this.direction = [1.0, 0.0];
    } else {
      this.direction = [direction[0] / dirNorm, direction[1] / dirNorm];
    }
    this.wavelength = parseFloat(wavelength); // nm (ej: 650 rojo, 532 verde, 450 azul)
    this.intensity = parseFloat(intensity);
    this.depth = parseInt(depth);
    this.isWhiteLight = Boolean(isWhiteLight);
    this.color = color || wavelengthToRGB(this.wavelength);
    this.path = [[this.origin[0], this.origin[1]]];
  }
}

/**
 * Convierte una longitud de onda de luz (en nanómetros) a un objeto RGB [r, g, b] (0-255).
 */
function wavelengthToRGB(wavelength) {
  const wl = parseFloat(wavelength);
  let r = 0, g = 0, b = 0;

  if (wl >= 380 && wl < 440) {
    r = -(wl - 440) / (440 - 380);
    g = 0.0;
    b = 1.0;
  } else if (wl >= 440 && wl < 490) {
    r = 0.0;
    g = (wl - 440) / (490 - 440);
    b = 1.0;
  } else if (wl >= 490 && wl < 510) {
    r = 0.0;
    g = 1.0;
    b = -(wl - 510) / (510 - 490);
  } else if (wl >= 510 && wl < 580) {
    r = (wl - 510) / (580 - 510);
    g = 1.0;
    b = 0.0;
  } else if (wl >= 580 && wl < 645) {
    r = 1.0;
    g = -(wl - 645) / (645 - 580);
    b = 0.0;
  } else if (wl >= 645 && wl <= 780) {
    r = 1.0;
    g = 0.0;
    b = 0.0;
  } else {
    r = 1.0;
    g = 1.0;
    b = 1.0;
  }

  // Atenuación de sensibilidad visual en los extremos del espectro humano
  let factor = 1.0;
  if (wl >= 380 && wl < 420) {
    factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
  } else if (wl >= 420 && wl <= 700) {
    factor = 1.0;
  } else if (wl > 700 && wl <= 780) {
    factor = 0.3 + 0.7 * (780 - wl) / (780 - 700);
  } else {
    factor = 1.0;
  }

  return [
    Math.round(r * factor * 255),
    Math.round(g * factor * 255),
    Math.round(b * factor * 255)
  ];
}

/**
 * Intersección escalar ultrarrápida de rayo P + t*D con segmento A + u*(B - A) (0 <= u <= 1).
 */
function raySegmentIntersection(rayOrigin, rayDir, p1, p2) {
  const ox = rayOrigin[0], oy = rayOrigin[1];
  const dx = rayDir[0], dy = rayDir[1];
  const x1 = p1[0], y1 = p1[1];
  const x2 = p2[0], y2 = p2[1];

  const v2x = x2 - x1;
  const v2y = y2 - y1;

  const dot = -v2x * dy + v2y * dx;
  if (Math.abs(dot) < 1e-10) {
    return null;
  }

  const v1x = ox - x1;
  const v1y = oy - y1;

  const t = (v2x * v1y - v2y * v1x) / dot;
  if (t <= 1e-4) {
    return null;
  }

  const u = (-v1x * dy + v1y * dx) / dot;
  if (u >= 0.0 && u <= 1.0) {
    return {
      t: t,
      u: u,
      point: [ox + t * dx, oy + t * dy]
    };
  }
  return null;
}

/**
 * Calcula refracción o Reflexión Total Interna (TIR) usando la Ley de Snell vectorial.
 */
function refractRay(inDir, normal, n1, n2) {
  const vx = inDir[0], vy = inDir[1];
  let nx = normal[0], ny = normal[1];

  let cosI = -(vx * nx + vy * ny);
  if (cosI < 0) {
    nx = -nx;
    ny = -ny;
    cosI = -cosI;
  }

  const eta = n1 / n2;
  const sin2T = eta * eta * (1.0 - cosI * cosI);

  if (sin2T > 1.0) {
    // Reflexión Total Interna (TIR)
    const dotVn = vx * nx + vy * ny;
    const refl = [vx - 2.0 * dotVn * nx, vy - 2.0 * dotVn * ny];
    return { dir: refl, isTIR: true };
  } else {
    // Refracción ordinaria
    const cosT = Math.sqrt(Math.max(0.0, 1.0 - sin2T));
    const factor = eta * cosI - cosT;
    const refr = [eta * vx + factor * nx, eta * vy + factor * ny];
    return { dir: refr, isTIR: false };
  }
}

/**
 * Calcula el vector de reflexión especular respecto a la normal.
 */
function reflectRay(inDir, normal) {
  const vx = inDir[0], vy = inDir[1];
  const nx = normal[0], ny = normal[1];
  const dotVn = vx * nx + vy * ny;
  return [vx - 2.0 * dotVn * nx, vy - 2.0 * dotVn * ny];
}

/**
 * Ecuación de Cauchy para dispersión cromática (arcoíris).
 */
function cauchyRefractiveIndex(baseN, wavelengthNm, dispersionBoost = false) {
  const lambdaUm = wavelengthNm / 1000.0;
  const lambdaRefUm = 0.589;
  // Factor de dispersión Cauchy calibrado para separación visual clara y didáctica (arcoíris nítido en prismas y lentes)
  const coeff = dispersionBoost ? 0.038 : 0.006;
  const B = coeff * (baseN - 1.0);
  const A = baseN - B / (lambdaRefUm * lambdaRefUm);
  return A + B / (lambdaUm * lambdaUm);
}

/**
 * Algoritmo Ray-Casting para determinar si un punto 2D está dentro de un polígono cerrado.
 */
function pointInPolygon(point, polygonPts) {
  const x = point[0], y = point[1];
  let inside = false;
  const n = polygonPts.length;
  if (n < 3) return false;

  let p1x = polygonPts[0][0], p1y = polygonPts[0][1];
  for (let i = 0; i <= n; i++) {
    const p2 = polygonPts[i % n];
    const p2x = p2[0], p2y = p2[1];
    if (y > Math.min(p1y, p2y)) {
      if (y <= Math.max(p1y, p2y)) {
        if (x <= Math.max(p1x, p2x)) {
          if (p1y !== p2y) {
            const xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
            if (p1x === p2x || x <= xinters) {
              inside = !inside;
            }
          }
        }
      }
    }
    p1x = p2x;
    p1y = p2y;
  }
  return inside;
}

/**
 * Genera curva cerrada Catmull-Rom spline a partir de puntos de control.
 */
function catmullRomSpline(controlPoints, numSamplesPerSegment = 8) {
  const N = controlPoints.length;
  if (N < 3) {
    return controlPoints.map(p => [p[0], p[1]]);
  }

  const curve = [];
  for (let i = 0; i < N; i++) {
    const p0 = controlPoints[(i - 1 + N) % N];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % N];
    const p3 = controlPoints[(i + 2) % N];

    for (let s = 0; s < numSamplesPerSegment; s++) {
      const t = s / numSamplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      const px = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      );
      const py = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      );

      curve.push([px, py]);
    }
  }
  return curve;
}

/**
 * Traza un rayo a través de los elementos ópticos de la escena.
 */
function traceRayScene(ray, elements, maxBounces = 40, minIntensity = 0.01) {
  const currentRay = new Ray(
    ray.origin,
    ray.direction,
    ray.wavelength,
    ray.intensity,
    ray.depth,
    ray.color,
    ray.isWhiteLight
  );
  ray.path = [[currentRay.origin[0], currentRay.origin[1]]];

  for (let b = 0; b < maxBounces; b++) {
    if (currentRay.intensity < minIntensity) {
      break;
    }

    let closestHit = null;
    let closestDist = Infinity;
    let hitElement = null;

    for (let i = 0; i < elements.length; i++) {
      const elem = elements[i];
      if (!elem.isActive) continue;

      const hitInfo = elem.intersectRay(currentRay);
      if (hitInfo && hitInfo.dist < closestDist) {
        closestDist = hitInfo.dist;
        closestHit = hitInfo;
        hitElement = elem;
      }
    }

    if (!closestHit) {
      // Rayo se propaga al infinito
      const farPoint = [
        currentRay.origin[0] + currentRay.direction[0] * 3200.0,
        currentRay.origin[1] + currentRay.direction[1] * 3200.0
      ];
      ray.path.push(farPoint);
      break;
    }

    const hitPt = closestHit.point;
    const normal = closestHit.normal;
    const isMirror = closestHit.isMirror || false;
    const isScreen = closestHit.isScreen || false;
    let n1 = closestHit.n1 || 1.0;
    let n2 = closestHit.n2 || 1.0;

    ray.path.push([hitPt[0], hitPt[1]]);

    if (isScreen) {
      if (hitElement && typeof hitElement.recordHit === 'function') {
        hitElement.recordHit(hitPt, currentRay.intensity, currentRay.color);
      }
      break;
    }

    if (isMirror) {
      const newDir = reflectRay(currentRay.direction, normal);
      currentRay.origin = [
        hitPt[0] + newDir[0] * 1e-3,
        hitPt[1] + newDir[1] * 1e-3
      ];
      currentRay.direction = newDir;
    } else {
      if (hitElement && (hitElement.dispersionEnabled || currentRay.isWhiteLight)) {
        const isBoost = currentRay.isWhiteLight || hitElement.dispersionEnabled;
        if (n1 > 1.0003) {
          n1 = cauchyRefractiveIndex(n1, currentRay.wavelength, isBoost);
        }
        if (n2 > 1.0003) {
          n2 = cauchyRefractiveIndex(n2, currentRay.wavelength, isBoost);
        }
      }

      const res = refractRay(currentRay.direction, normal, n1, n2);
      const newDir = res.dir;
      currentRay.origin = [
        hitPt[0] + newDir[0] * 1e-3,
        hitPt[1] + newDir[1] * 1e-3
      ];
      currentRay.direction = newDir;
    }

    currentRay.depth++;
  }

  return ray.path;
}

// Exportar globalmente
window.Ray = Ray;
window.RAINBOW_7_WAVELENGTHS = RAINBOW_7_WAVELENGTHS;
window.RAINBOW_7_COLORS = RAINBOW_7_COLORS;
window.wavelengthToRGB = wavelengthToRGB;
window.raySegmentIntersection = raySegmentIntersection;
window.refractRay = refractRay;
window.reflectRay = reflectRay;
window.cauchyRefractiveIndex = cauchyRefractiveIndex;
window.pointInPolygon = pointInPolygon;
window.catmullRomSpline = catmullRomSpline;
window.traceRayScene = traceRayScene;
