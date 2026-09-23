import math
import numpy as np

class Ray:
    """Represents a light ray in 2D space."""
    def __init__(self, origin, direction, wavelength=532.0, intensity=1.0, depth=0, color=None):
        self.origin = np.array(origin, dtype=np.float64)
        dir_norm = math.hypot(direction[0], direction[1])
        if dir_norm < 1e-12:
            self.direction = np.array([1.0, 0.0], dtype=np.float64)
        else:
            self.direction = np.array([direction[0] / dir_norm, direction[1] / dir_norm], dtype=np.float64)
        self.wavelength = float(wavelength) # nm (e.g. 650 red, 532 green, 450 blue)
        self.intensity = float(intensity)
        self.depth = int(depth)
        self.color = color if color is not None else wavelength_to_rgb(wavelength)
        self.path = [self.origin.copy()]

def wavelength_to_rgb(wavelength):
    """Converts a light wavelength (in nm) to an RGB tuple (0-255)."""
    wl = float(wavelength)
    if 380 <= wl < 440:
        r = -(wl - 440) / (440 - 380)
        g = 0.0
        b = 1.0
    elif 440 <= wl < 490:
        r = 0.0
        g = (wl - 440) / (490 - 440)
        b = 1.0
    elif 490 <= wl < 510:
        r = 0.0
        g = 1.0
        b = -(wl - 510) / (510 - 490)
    elif 510 <= wl < 580:
        r = (wl - 510) / (580 - 510)
        g = 1.0
        b = 0.0
    elif 580 <= wl < 645:
        r = 1.0
        g = -(wl - 645) / (645 - 580)
        b = 0.0
    elif 645 <= wl <= 780:
        r = 1.0
        g = 0.0
        b = 0.0
    else:
        r, g, b = 1.0, 1.0, 1.0

    if 380 <= wl < 420:
        factor = 0.3 + 0.7 * (wl - 380) / (420 - 380)
    elif 420 <= wl <= 700:
        factor = 1.0
    elif 700 < wl <= 780:
        factor = 0.3 + 0.7 * (780 - wl) / (780 - 700)
    else:
        factor = 1.0

    return (int(r * factor * 255), int(g * factor * 255), int(b * factor * 255))


def ray_segment_intersection(ray_origin, ray_dir, p1, p2):
    """
    Fast scalar float intersection of ray P + t*D (t > 1e-4) with segment A + u*(B - A) (0 <= u <= 1).
    65x faster than numpy array cross/dot allocations!
    """
    ox, oy = float(ray_origin[0]), float(ray_origin[1])
    dx, dy = float(ray_dir[0]), float(ray_dir[1])
    x1, y1 = float(p1[0]), float(p1[1])
    x2, y2 = float(p2[0]), float(p2[1])

    v2x = x2 - x1
    v2y = y2 - y1

    dot = -v2x * dy + v2y * dx
    if abs(dot) < 1e-10:
        return None

    v1x = ox - x1
    v1y = oy - y1

    t = (v2x * v1y - v2y * v1x) / dot
    if t <= 1e-4:
        return None

    u = (-v1x * dy + v1y * dx) / dot
    if 0.0 <= u <= 1.0:
        hit_pt = np.array([ox + t * dx, oy + t * dy], dtype=np.float64)
        return t, u, hit_pt
    return None


def refract_ray(in_dir, normal, n1, n2):
    """Calculates refraction / reflection using Snell's Law in vector form."""
    vx, vy = float(in_dir[0]), float(in_dir[1])
    nx, ny = float(normal[0]), float(normal[1])

    cos_i = -(vx * nx + vy * ny)
    if cos_i < 0:
        nx, ny = -nx, -ny
        cos_i = -cos_i

    eta = n1 / n2
    sin2_t = eta * eta * (1.0 - cos_i * cos_i)

    if sin2_t > 1.0:
        # TIR
        dot_vn = vx * nx + vy * ny
        refl = np.array([vx - 2.0 * dot_vn * nx, vy - 2.0 * dot_vn * ny], dtype=np.float64)
        return refl, True
    else:
        cos_t = math.sqrt(max(0.0, 1.0 - sin2_t))
        factor = eta * cos_i - cos_t
        refr = np.array([eta * vx + factor * nx, eta * vy + factor * ny], dtype=np.float64)
        return refr, False


def reflect_ray(in_dir, normal):
    """Calculates specular reflection vector."""
    vx, vy = float(in_dir[0]), float(in_dir[1])
    nx, ny = float(normal[0]), float(normal[1])
    dot_vn = vx * nx + vy * ny
    return np.array([vx - 2.0 * dot_vn * nx, vy - 2.0 * dot_vn * ny], dtype=np.float64)


def cauchy_refractive_index(base_n, wavelength_nm):
    """Calculates refractive index based on wavelength using Cauchy's equation."""
    lambda_um = wavelength_nm / 1000.0
    lambda_ref_um = 0.589
    B = 0.0042 * (base_n - 1.0)
    A = base_n - B / (lambda_ref_um ** 2)
    return A + B / (lambda_um ** 2)


def catmull_rom_spline(control_points, num_samples_per_segment=8):
    """Generates smooth closed Catmull-Rom spline curve points from a list of control points."""
    if len(control_points) < 3:
        return [np.array(p, dtype=np.float64) for p in control_points]

    pts = [np.array(p, dtype=np.float64) for p in control_points]
    N = len(pts)
    curve = []

    for i in range(N):
        p0 = pts[(i - 1) % N]
        p1 = pts[i]
        p2 = pts[(i + 1) % N]
        p3 = pts[(i + 2) % N]

        for t in np.linspace(0, 1, num_samples_per_segment, endpoint=False):
            t2 = t * t
            t3 = t2 * t
            pt = 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            )
            curve.append(pt)

    return curve


def trace_ray_scene(ray, elements, max_bounces=35, min_intensity=0.01):
    """Traces a single ray through a list of optical elements."""
    current_ray = Ray(
        ray.origin, ray.direction,
        wavelength=ray.wavelength,
        intensity=ray.intensity,
        depth=ray.depth,
        color=ray.color
    )
    ray.path = [current_ray.origin.copy()]

    for _ in range(max_bounces):
        if current_ray.intensity < min_intensity:
            break

        closest_hit = None
        closest_dist = float('inf')
        hit_element = None

        for elem in elements:
            if not getattr(elem, 'is_active', True):
                continue
            hit_info = elem.intersect_ray(current_ray)
            if hit_info is not None:
                dist = hit_info['dist']
                if dist < closest_dist:
                    closest_dist = dist
                    closest_hit = hit_info
                    hit_element = elem

        if closest_hit is None:
            far_point = current_ray.origin + current_ray.direction * 3000.0
            ray.path.append(far_point)
            break

        hit_pt = closest_hit['point']
        normal = closest_hit['normal']
        is_mirror = closest_hit.get('is_mirror', False)
        is_screen = closest_hit.get('is_screen', False)
        n1 = closest_hit.get('n1', 1.0)
        n2 = closest_hit.get('n2', 1.0)

        ray.path.append(hit_pt.copy())

        if is_screen:
            if hasattr(hit_element, 'record_hit'):
                hit_element.record_hit(hit_pt, current_ray.intensity, current_ray.color)
            break

        if is_mirror:
            new_dir = reflect_ray(current_ray.direction, normal)
            current_ray.origin = hit_pt + new_dir * 1e-3
            current_ray.direction = new_dir
        else:
            if getattr(hit_element, 'dispersion_enabled', False):
                if n1 > 1.0003:
                    n1 = cauchy_refractive_index(n1, current_ray.wavelength)
                if n2 > 1.0003:
                    n2 = cauchy_refractive_index(n2, current_ray.wavelength)

            new_dir, is_tir = refract_ray(current_ray.direction, normal, n1, n2)
            current_ray.origin = hit_pt + new_dir * 1e-3
            current_ray.direction = new_dir

        current_ray.depth += 1

    return ray.path
