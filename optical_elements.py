import math
import numpy as np
from physics_engine import (
    Ray, ray_segment_intersection, catmull_rom_spline, refract_ray, reflect_ray
)

def point_in_polygon(point, polygon_pts):
    """Ray casting algorithm to test if a 2D point is inside a closed polygon."""
    x, y = point[0], point[1]
    inside = False
    n = len(polygon_pts)
    if n < 3:
        return False
    p1x, p1y = polygon_pts[0][0], polygon_pts[0][1]
    for i in range(n + 1):
        p2x, p2y = polygon_pts[i % n][0], polygon_pts[i % n][1]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


class OpticalElement:
    """Base class for all optical scene elements."""
    def __init__(self, name="Element"):
        self.name = name
        self.is_active = True
        self.is_selected = False

    def intersect_ray(self, ray):
        """Returns hit info dict or None."""
        raise NotImplementedError


class CustomLens(OpticalElement):
    """
    Represents an optical lens defined by arbitrary control points / vertices.
    Supports node editing, freehand drawing, and smooth spline curvature.
    """
    def __init__(self, control_points, n=1.5, name="Custom Lens", is_smooth=True, dispersion_enabled=False):
        super().__init__(name)
        self.control_points = [np.array(pt, dtype=np.float64) for pt in control_points]
        self.n = float(n)  # Refractive index of lens material
        self.n_ambient = 1.0  # Background refractive index (Air)
        self._is_smooth = is_smooth
        self.dispersion_enabled = dispersion_enabled
        self._cached_boundary_pts = None
        self._cached_aabb = None

    @property
    def is_smooth(self):
        return self._is_smooth

    @is_smooth.setter
    def is_smooth(self, val):
        self._is_smooth = val
        self.invalidate_cache()

    def invalidate_cache(self):
        self._cached_boundary_pts = None
        self._cached_aabb = None

    @property
    def boundary_points(self):
        """Returns cached boundary vertices (sampled if smooth curve, or raw control points)."""
        if self._cached_boundary_pts is None:
            if len(self.control_points) < 3:
                self._cached_boundary_pts = self.control_points
            elif self._is_smooth:
                # 8 samples per segment is super smooth and fast!
                self._cached_boundary_pts = catmull_rom_spline(self.control_points, num_samples_per_segment=8)
            else:
                self._cached_boundary_pts = self.control_points

            # Compute AABB
            pts_arr = np.array(self._cached_boundary_pts)
            xmin, ymin = np.min(pts_arr, axis=0)
            xmax, ymax = np.max(pts_arr, axis=0)
            self._cached_aabb = (xmin - 2.0, ymin - 2.0, xmax + 2.0, ymax + 2.0)

        return self._cached_boundary_pts

    def get_centroid(self):
        if not self.control_points:
            return np.array([0.0, 0.0])
        return np.mean(self.control_points, axis=0)

    def translate(self, dx, dy):
        delta = np.array([dx, dy], dtype=np.float64)
        for i in range(len(self.control_points)):
            self.control_points[i] += delta
        self.invalidate_cache()

    def rotate(self, angle_rad, center=None):
        if center is None:
            center = self.get_centroid()
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        rot_mat = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
        for i in range(len(self.control_points)):
            rel = self.control_points[i] - center
            self.control_points[i] = center + np.dot(rot_mat, rel)
        self.invalidate_cache()

    def rotate_to_angle(self, target_angle_deg):
        if not hasattr(self, 'current_rotation_deg'):
            self.current_rotation_deg = 0.0
        delta_rad = math.radians(target_angle_deg - self.current_rotation_deg)
        self.rotate(delta_rad)
        self.current_rotation_deg = float(target_angle_deg)

    def scale(self, factor_x, factor_y, center=None):
        if center is None:
            center = self.get_centroid()
        for i in range(len(self.control_points)):
            rel = self.control_points[i] - center
            self.control_points[i] = center + rel * np.array([factor_x, factor_y])
        self.invalidate_cache()

    def intersect_ray(self, ray):
        pts = self.boundary_points
        num_pts = len(pts)
        if num_pts < 3:
            return None

        # --- AABB EARLY EXIT ---
        xmin, ymin, xmax, ymax = self._cached_aabb
        ox, oy = ray.origin[0], ray.origin[1]
        dx, dy = ray.direction[0], ray.direction[1]

        # Fast ray vs AABB test
        if dx != 0:
            tx1 = (xmin - ox) / dx
            tx2 = (xmax - ox) / dx
            tmin = min(tx1, tx2)
            tmax = max(tx1, tx2)
        else:
            if ox < xmin or ox > xmax:
                return None
            tmin = -1e9
            tmax = 1e9

        if dy != 0:
            ty1 = (ymin - oy) / dy
            ty2 = (ymax - oy) / dy
            tmin = max(tmin, min(ty1, ty2))
            tmax = min(tmax, max(ty1, ty2))
        else:
            if oy < ymin or oy > ymax:
                return None

        if tmax < max(0.0, tmin):
            return None

        # --- DETAILED SEGMENT INTERSECTION ---
        closest_hit = None
        closest_t = float('inf')
        hit_seg_idx = -1

        for i in range(num_pts):
            p1 = pts[i]
            p2 = pts[(i + 1) % num_pts]

            res = ray_segment_intersection(ray.origin, ray.direction, p1, p2)
            if res is not None:
                t, u, hit_pt = res
                if t < closest_t:
                    closest_t = t
                    closest_hit = (hit_pt, p1, p2)
                    hit_seg_idx = i

        if closest_hit is None:
            return None

        hit_pt, p1, p2 = closest_hit

        # Compute edge vector and outward normal
        edge = p2 - p1
        edge_norm = np.linalg.norm(edge)
        if edge_norm < 1e-12:
            return None
        
        # Candidate normal perpendicular to edge: (-dy, dx)
        normal = np.array([-edge[1], edge[0]], dtype=np.float64) / edge_norm

        # Point in polygon check (skip if origin is outside AABB)
        if ox < xmin or ox > xmax or oy < ymin or oy > ymax:
            ray_is_inside = False
        else:
            ray_is_inside = point_in_polygon(ray.origin, pts)

        # Determine refractive indices n1 (source medium) and n2 (target medium)
        if ray_is_inside:
            n1 = self.n
            n2 = self.n_ambient
            if np.dot(ray.direction, normal) < 0:
                normal = -normal
        else:
            n1 = self.n_ambient
            n2 = self.n
            if np.dot(ray.direction, normal) > 0:
                normal = -normal

        return {
            'dist': closest_t,
            'point': hit_pt,
            'normal': normal,
            'n1': n1,
            'n2': n2,
            'is_mirror': False,
            'is_screen': False
        }


# --- PRESET OPTICS CREATORS ---

def create_biconvex_lens(center_x, center_y, width=40, height=120, R1=100, R2=100, n=1.5):
    """Creates a biconvex lens using arc points."""
    pts = []
    # Right arc (front curvature)
    num_samples = 15
    for i in range(num_samples + 1):
        t = -1.0 + 2.0 * i / num_samples
        y = t * (height / 2.0)
        # Sagitta calculation
        sag1 = (height/2.0)**2 / (2 * abs(R1)) if R1 != 0 else 0
        x = (width / 2.0) - sag1 * (1.0 - t**2)
        pts.append([center_x + x, center_y + y])

    # Left arc (back curvature)
    for i in range(num_samples + 1):
        t = 1.0 - 2.0 * i / num_samples
        y = t * (height / 2.0)
        sag2 = (height/2.0)**2 / (2 * abs(R2)) if R2 != 0 else 0
        x = -(width / 2.0) + sag2 * (1.0 - t**2)
        pts.append([center_x + x, center_y + y])

    return CustomLens(pts, n=n, name="Lente Biconvexa", is_smooth=True)


def create_biconcave_lens(center_x, center_y, width=40, height=120, R=80, n=1.5):
    """Creates a biconcave lens."""
    pts = []
    num_samples = 15
    # Center thickness vs edge thickness
    edge_w = width
    center_w = width * 0.3

    # Top edge
    pts.append([center_x - edge_w/2, center_y - height/2])
    pts.append([center_x + edge_w/2, center_y - height/2])

    # Right concave boundary
    for i in range(num_samples + 1):
        t = -1.0 + 2.0 * i / num_samples
        y = t * (height / 2.0)
        x = center_w/2 + (edge_w/2 - center_w/2) * (t**2)
        pts.append([center_x + x, center_y + y])

    # Bottom edge
    pts.append([center_x - edge_w/2, center_y + height/2])

    # Left concave boundary
    for i in range(num_samples + 1):
        t = 1.0 - 2.0 * i / num_samples
        y = t * (height / 2.0)
        x = -center_w/2 - (edge_w/2 - center_w/2) * (t**2)
        pts.append([center_x + x, center_y + y])

    return CustomLens(pts, n=n, name="Lente Bicóncava", is_smooth=False)


def create_triangular_prism(center_x, center_y, side_length=100, n=1.5, dispersion=True):
    """Creates an equilateral triangular prism."""
    h = side_length * math.sqrt(3) / 2.0
    pts = [
        [center_x, center_y - 2.0*h/3.0],                   # Top vertex
        [center_x + side_length/2.0, center_y + h/3.0],     # Bottom right
        [center_x - side_length/2.0, center_y + h/3.0]      # Bottom left
    ]
    lens = CustomLens(pts, n=n, name="Prisma Triangular", is_smooth=False, dispersion_enabled=dispersion)
    return lens


def create_glass_slab(center_x, center_y, width=120, height=80, n=1.5):
    """Creates a rectangular glass slab/block."""
    pts = [
        [center_x - width/2, center_y - height/2],
        [center_x + width/2, center_y - height/2],
        [center_x + width/2, center_y + height/2],
        [center_x - width/2, center_y + height/2],
    ]
    return CustomLens(pts, n=n, name="Bloque de Vidrio", is_smooth=False)


class FlatMirror(OpticalElement):
    """Flat reflective mirror segment."""
    def __init__(self, p1, p2, name="Espejo Plano"):
        super().__init__(name)
        self.p1 = np.array(p1, dtype=np.float64)
        self.p2 = np.array(p2, dtype=np.float64)

    def translate(self, dx, dy):
        delta = np.array([dx, dy], dtype=np.float64)
        self.p1 += delta
        self.p2 += delta

    def intersect_ray(self, ray):
        res = ray_segment_intersection(ray.origin, ray.direction, self.p1, self.p2)
        if res is None:
            return None
        t, u, hit_pt = res

        edge = self.p2 - self.p1
        edge_norm = np.linalg.norm(edge)
        if edge_norm < 1e-12:
            return None
        normal = np.array([-edge[1], edge[0]], dtype=np.float64) / edge_norm
        if np.dot(ray.direction, normal) > 0:
            normal = -normal

        return {
            'dist': t,
            'point': hit_pt,
            'normal': normal,
            'is_mirror': True,
            'is_screen': False
        }

    def rotate_to_angle(self, target_angle_deg):
        mid = (self.p1 + self.p2) / 2.0
        length = np.linalg.norm(self.p2 - self.p1)
        rad = math.radians(target_angle_deg)
        dir_v = np.array([math.cos(rad), math.sin(rad)], dtype=np.float64)
        half_len = length / 2.0
        self.p1 = mid - dir_v * half_len
        self.p2 = mid + dir_v * half_len


class DetectorScreen(OpticalElement):
    """A screen / detector that collects ray hits along a line segment."""
    def __init__(self, p1, p2, name="Pantalla / Detector"):
        super().__init__(name)
        self.p1 = np.array(p1, dtype=np.float64)
        self.p2 = np.array(p2, dtype=np.float64)
        self.hits = []  # List of dicts {'pos_u': u, 'intensity': I, 'color': rgb}

    def translate(self, dx, dy):
        delta = np.array([dx, dy], dtype=np.float64)
        self.p1 += delta
        self.p2 += delta

    def rotate_to_angle(self, target_angle_deg):
        mid = (self.p1 + self.p2) / 2.0
        length = np.linalg.norm(self.p2 - self.p1)
        rad = math.radians(target_angle_deg)
        dir_v = np.array([math.cos(rad), math.sin(rad)], dtype=np.float64)
        half_len = length / 2.0
        self.p1 = mid - dir_v * half_len
        self.p2 = mid + dir_v * half_len

    def clear_hits(self):
        self.hits.clear()

    def record_hit(self, point, intensity, color):
        vec_screen = self.p2 - self.p1
        len_sq = np.dot(vec_screen, vec_screen)
        if len_sq > 0:
            u = np.dot(point - self.p1, vec_screen) / len_sq
            self.hits.append({'pos_u': u, 'intensity': intensity, 'color': color})

    def intersect_ray(self, ray):
        res = ray_segment_intersection(ray.origin, ray.direction, self.p1, self.p2)
        if res is None:
            return None
        t, u, hit_pt = res
        edge = self.p2 - self.p1
        normal = np.array([-edge[1], edge[0]], dtype=np.float64)
        norm_l = np.linalg.norm(normal)
        if norm_l > 0:
            normal /= norm_l
        return {
            'dist': t,
            'point': hit_pt,
            'normal': normal,
            'is_mirror': False,
            'is_screen': True
        }


class LightSource:
    """Base class for light sources emitting rays into the scene."""
    def __init__(self, position, angle_deg=0.0, name="Fuente de Luz"):
        self.name = name
        self.position = np.array(position, dtype=np.float64)
        self.angle_deg = float(angle_deg)
        self.is_active = True
        self.ray_count = 11
        self.wavelength = 532.0  # Green default
        self.beam_width = 40.0
        self.aperture_deg = 30.0
        self.source_type = "laser"  # 'laser', 'fan', 'parallel', 'object'

    def get_direction_vector(self):
        rad = math.radians(self.angle_deg)
        return np.array([math.cos(rad), math.sin(rad)], dtype=np.float64)

    def generate_rays(self):
        rays = []
        dir_vec = self.get_direction_vector()
        perp_vec = np.array([-dir_vec[1], dir_vec[0]], dtype=np.float64)

        if self.source_type == "laser" or self.source_type == "parallel":
            # Parallel beam of parallel rays
            if self.ray_count == 1:
                rays.append(Ray(self.position, dir_vec, wavelength=self.wavelength))
            else:
                half_w = self.beam_width / 2.0
                offsets = np.linspace(-half_w, half_w, self.ray_count)
                for off in offsets:
                    orig = self.position + perp_vec * off
                    rays.append(Ray(orig, dir_vec, wavelength=self.wavelength))

        elif self.source_type == "fan":
            # Point source with fan angle
            half_angle = math.radians(self.aperture_deg / 2.0)
            center_rad = math.radians(self.angle_deg)
            angles = np.linspace(center_rad - half_angle, center_rad + half_angle, self.ray_count)
            for a in angles:
                d = np.array([math.cos(a), math.sin(a)], dtype=np.float64)
                rays.append(Ray(self.position, d, wavelength=self.wavelength))

        elif self.source_type == "object":
            # Object source (emitting rays from top, middle, bottom of a pencil/object)
            half_h = self.beam_width / 2.0
            points = np.linspace(-half_h, half_h, max(3, self.ray_count // 5))
            half_angle = math.radians(self.aperture_deg / 2.0)
            center_rad = math.radians(self.angle_deg)
            angles = np.linspace(center_rad - half_angle, center_rad + half_angle, 5)

            for p_off in points:
                orig = self.position + perp_vec * p_off
                for a in angles:
                    d = np.array([math.cos(a), math.sin(a)], dtype=np.float64)
                    # Color based on height offset (e.g., top red, bottom blue)
                    norm_h = (p_off + half_h) / (2 * half_h) if half_h > 0 else 0.5
                    wl = 450.0 + norm_h * 200.0
                    rays.append(Ray(orig, d, wavelength=wl))

        return rays
