import math
import numpy as np
from PyQt6.QtCore import Qt, QPointF, QRectF, pyqtSignal
from PyQt6.QtGui import (
    QPainter, QColor, QPen, QBrush, QPainterPath, QFont, QTransform
)
from PyQt6.QtWidgets import QWidget

from physics_engine import (
    trace_ray_scene, ray_segment_intersection, catmull_rom_spline
)
from optical_elements import (
    OpticalElement, CustomLens, DetectorScreen, LightSource, FlatMirror, point_in_polygon
)

def is_point_near_segment(point, p1, p2, threshold=15.0):
    """Returns True if point is within threshold distance from segment p1-p2."""
    vec = p2 - p1
    length_sq = np.dot(vec, vec)
    if length_sq < 1e-12:
        return np.linalg.norm(point - p1) < threshold
    t = max(0.0, min(1.0, np.dot(point - p1, vec) / length_sq))
    proj = p1 + t * vec
    return np.linalg.norm(point - proj) < threshold


class CanvasMode:
    SELECT = 0
    NODE_EDIT = 1
    DRAW_FREEHAND = 2
    DRAW_POLYGON = 3
    PAN = 4
    RULER = 5


class OpticsCanvas(QWidget):
    """
    Main interactive canvas for rendering and manipulating optics, light sources,
    rays, custom hand-drawn lenses, and vertex deformation.
    """
    element_selected = pyqtSignal(object)
    scene_changed = pyqtSignal()
    mouse_coords_changed = pyqtSignal(float, float)
    mode_changed = pyqtSignal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

        self.elements = []       # OpticalElement & CustomLens list
        self.sources = []        # LightSource list
        self.selected_element = None
        self.selected_node_idx = -1

        # Viewport transformation (Pan & Zoom)
        self.zoom_level = 1.0
        self.pan_offset = QPointF(0, 0)
        self.is_panning = False
        self.last_mouse_pos = QPointF(0, 0)

        # Interactive Mode
        self.mode = CanvasMode.SELECT

        # Freehand & Polygon Drawing buffers
        self.draw_points = []
        self.is_drawing = False

        # Ruler state
        self.ruler_p1 = None
        self.ruler_p2 = None

        # Settings
        self.show_grid = True
        self.show_axis = True
        self.grid_size = 40.0
        self.show_normals = False
        self.max_bounces = 50

        # Colors
        self.bg_color = QColor(15, 17, 26)
        self.grid_color = QColor(36, 41, 60, 120)
        self.axis_color = QColor(0, 255, 204, 60)
        self.glass_fill = QColor(0, 255, 204, 25)
        self.glass_stroke = QColor(0, 255, 204, 200)
        self.selected_stroke = QColor(255, 184, 108, 255)
        self.node_color = QColor(255, 230, 0)
        self.node_active_color = QColor(255, 85, 119)

    # --- COORDINATE TRANSFORMATIONS ---

    def world_to_screen(self, wx, wy):
        sx = (wx * self.zoom_level) + self.pan_offset.x() + self.width() / 2.0
        sy = (wy * self.zoom_level) + self.pan_offset.y() + self.height() / 2.0
        return QPointF(sx, sy)

    def screen_to_world(self, sx, sy):
        wx = (sx - self.width() / 2.0 - self.pan_offset.x()) / self.zoom_level
        wy = (sy - self.height() / 2.0 - self.pan_offset.y()) / self.zoom_level
        return np.array([wx, wy], dtype=np.float64)

    # --- SCENE MANAGEMENT ---

    def add_element(self, elem):
        self.elements.append(elem)
        self.select_element(elem)
        self.scene_changed.emit()
        self.update()

    def add_source(self, source):
        self.sources.append(source)
        self.select_element(source)
        self.scene_changed.emit()
        self.update()

    def remove_selected(self):
        if self.selected_element:
            if self.selected_element in self.elements:
                self.elements.remove(self.selected_element)
            elif self.selected_element in self.sources:
                self.sources.remove(self.selected_element)
            self.select_element(None)
            self.scene_changed.emit()
            self.update()

    def clear_scene(self):
        self.elements.clear()
        self.sources.clear()
        self.select_element(None)
        self.scene_changed.emit()
        self.update()

    def select_element(self, elem):
        if self.selected_element:
            self.selected_element.is_selected = False
        self.selected_element = elem
        if self.selected_element:
            self.selected_element.is_selected = True
        self.selected_node_idx = -1
        self.element_selected.emit(elem)
        self.update()

    # --- PAINTING ---

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Fill Dark Background
        painter.fillRect(self.rect(), self.bg_color)

        # Draw Grid & Axis
        if self.show_grid:
            self.draw_grid(painter)

        if self.show_axis:
            self.draw_optical_axis(painter)

        # Clear detector screen hits before ray tracing
        for elem in self.elements:
            if isinstance(elem, DetectorScreen):
                elem.clear_hits()

        # Perform Ray Tracing & Draw Light Rays
        self.draw_rays(painter)

        # Draw Optical Elements & Lenses
        for elem in self.elements:
            self.draw_optical_element(painter, elem)

        # Draw Light Sources
        for src in self.sources:
            self.draw_light_source(painter, src)

        # Draw Node Handles if in NODE_EDIT mode
        if self.mode == CanvasMode.NODE_EDIT and isinstance(self.selected_element, CustomLens):
            self.draw_control_nodes(painter, self.selected_element)

        # Draw active freehand or polygon drawing path
        if self.mode in (CanvasMode.DRAW_FREEHAND, CanvasMode.DRAW_POLYGON) and self.draw_points:
            self.draw_active_sketch(painter)

        # Draw Banner Instructions Overlay
        if self.mode == CanvasMode.DRAW_POLYGON:
            self.draw_drawing_banner(
                painter,
                "📐 DIBUJANDO POLÍGONO: Clic Izq = Añadir Vértice  |  ENTER / Doble Clic / Clic Der = Finalizar Polígono"
            )
        elif self.mode == CanvasMode.DRAW_FREEHAND:
            self.draw_drawing_banner(
                painter,
                "✍️ DIBUJO A MANO ALZADA: Mantén presionado y arrastra el ratón para dibujar la lente."
            )
        elif self.mode == CanvasMode.NODE_EDIT and isinstance(self.selected_element, CustomLens):
            self.draw_drawing_banner(
                painter,
                "✏️ MODO DEFORMACIÓN: Arrastra los nodos amarillos para deformar la lente  |  Clic en borde = Añadir Nodo"
            )

        # Draw Ruler if active
        if self.mode == CanvasMode.RULER and self.ruler_p1 is not None and self.ruler_p2 is not None:
            self.draw_ruler(painter)

    def draw_drawing_banner(self, painter, text):
        """Renders an overlay instruction banner at top of canvas."""
        rect = QRectF(20, 15, self.width() - 40, 36)
        painter.setBrush(QBrush(QColor(23, 25, 38, 220)))
        painter.setPen(QPen(QColor(0, 255, 204), 1.5))
        painter.drawRoundedRect(rect, 8, 8)

        painter.setFont(QFont('Segoe UI', 10, QFont.Weight.Bold))
        painter.setPen(QPen(QColor(0, 255, 204)))
        painter.drawText(rect, Qt.AlignmentFlag.AlignCenter, text)

    def keyPressEvent(self, event):
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            if self.mode == CanvasMode.DRAW_POLYGON:
                self.finish_polygon_draw()
        elif event.key() == Qt.Key.Key_Escape:
            self.draw_points.clear()
            self.mode = CanvasMode.SELECT
            self.update()
        elif event.key() in (Qt.Key.Key_Delete, Qt.Key.Key_Backspace):
            self.remove_selected()
        else:
            super().keyPressEvent(event)

    def mouseDoubleClickEvent(self, event):
        if self.mode == CanvasMode.DRAW_POLYGON:
            self.finish_polygon_draw()
        else:
            super().mouseDoubleClickEvent(event)

    def draw_grid(self, painter):
        grid_step = self.grid_size * self.zoom_level
        if grid_step < 10:
            return  # Skip if zoomed out too far

        w, h = self.width(), self.height()
        ox = (self.width() / 2.0 + self.pan_offset.x()) % grid_step
        oy = (self.height() / 2.0 + self.pan_offset.y()) % grid_step

        pen = QPen(self.grid_color, 1, Qt.PenStyle.DashLine)
        painter.setPen(pen)

        x = ox
        while x < w:
            painter.drawLine(int(x), 0, int(x), h)
            x += grid_step

        y = oy
        while y < h:
            painter.drawLine(0, int(y), w, int(y))
            y += grid_step

    def draw_optical_axis(self, painter):
        # Optical axis line along y=0
        cy = self.height() / 2.0 + self.pan_offset.y()
        pen = QPen(self.axis_color, 1, Qt.PenStyle.DashDotLine)
        painter.setPen(pen)
        painter.drawLine(0, int(cy), self.width(), int(cy))

    def draw_rays(self, painter):
        all_rays = []
        for src in self.sources:
            if src.is_active:
                all_rays.extend(src.generate_rays())

        for ray in all_rays:
            path_pts = trace_ray_scene(ray, self.elements, max_bounces=self.max_bounces)
            if len(path_pts) < 2:
                continue

            r, g, b = ray.color
            ray_color = QColor(r, g, b, 210)
            glow_color = QColor(r, g, b, 50)

            poly = [self.world_to_screen(pt[0], pt[1]) for pt in path_pts]

            # Outer glow polyline (fast hardware-accelerated)
            glow_pen = QPen(glow_color, 4, Qt.PenStyle.SolidLine)
            painter.setPen(glow_pen)
            painter.drawPolyline(poly)

            # Inner sharp core polyline
            core_pen = QPen(ray_color, 1.5, Qt.PenStyle.SolidLine)
            painter.setPen(core_pen)
            painter.drawPolyline(poly)

    def draw_optical_element(self, painter, elem):
        if isinstance(elem, CustomLens):
            pts = elem.boundary_points
            if len(pts) < 3:
                return

            screen_pts = [self.world_to_screen(pt[0], pt[1]) for pt in pts]
            qpath = QPainterPath()
            qpath.moveTo(screen_pts[0])
            for pt in screen_pts[1:]:
                qpath.lineTo(pt)
            qpath.closeSubpath()

            # Glass body fill
            painter.setBrush(QBrush(self.glass_fill))

            stroke_pen = QPen(
                self.selected_stroke if elem.is_selected else self.glass_stroke,
                2.5 if elem.is_selected else 1.8,
                Qt.PenStyle.SolidLine
            )
            painter.setPen(stroke_pen)
            painter.drawPath(qpath)

            # Refractive index text label
            centroid = elem.get_centroid()
            c_screen = self.world_to_screen(centroid[0], centroid[1])
            painter.setPen(QPen(QColor('#00ffcc'), 1))
            painter.setFont(QFont('Segoe UI', 9, QFont.Weight.Bold))
            painter.drawText(c_screen, f"n={elem.n:.2f}")

        elif isinstance(elem, FlatMirror):
            sp1 = self.world_to_screen(elem.p1[0], elem.p1[1])
            sp2 = self.world_to_screen(elem.p2[0], elem.p2[1])
            pen = QPen(QColor(255, 215, 0) if not elem.is_selected else self.selected_stroke, 4)
            painter.setPen(pen)
            painter.drawLine(sp1, sp2)

        elif isinstance(elem, DetectorScreen):
            sp1 = self.world_to_screen(elem.p1[0], elem.p1[1])
            sp2 = self.world_to_screen(elem.p2[0], elem.p2[1])
            pen = QPen(QColor(180, 180, 180) if not elem.is_selected else self.selected_stroke, 3, Qt.PenStyle.DashLine)
            painter.setPen(pen)
            painter.drawLine(sp1, sp2)

            # Draw hit points along detector screen
            for hit in elem.hits:
                u = hit['pos_u']
                hit_world = elem.p1 + u * (elem.p2 - elem.p1)
                hs = self.world_to_screen(hit_world[0], hit_world[1])
                r, g, b = hit['color']
                painter.setBrush(QBrush(QColor(r, g, b)))
                painter.setPen(Qt.PenStyle.NoPen)
                painter.drawEllipse(hs, 4, 4)

    def draw_light_source(self, painter, src):
        pos_s = self.world_to_screen(src.position[0], src.position[1])

        # Draw source icon
        is_sel = src.is_selected
        painter.setBrush(QBrush(QColor(255, 85, 119) if is_sel else QColor(0, 255, 204)))
        painter.setPen(QPen(QColor(255, 255, 255), 2))
        painter.drawEllipse(pos_s, 8, 8)

        # Draw direction pointer arrow
        dir_vec = src.get_direction_vector()
        arrow_end_w = src.position + dir_vec * (25.0 / self.zoom_level)
        arrow_end_s = self.world_to_screen(arrow_end_w[0], arrow_end_w[1])
        painter.setPen(QPen(QColor(0, 255, 204), 2, Qt.PenStyle.SolidLine))
        painter.drawLine(pos_s, arrow_end_s)

    def draw_control_nodes(self, painter, lens):
        """Renders editable vertex nodes on the selected lens."""
        for i, pt in enumerate(lens.control_points):
            s_pt = self.world_to_screen(pt[0], pt[1])
            is_active_node = (i == self.selected_node_idx)
            color = self.node_active_color if is_active_node else self.node_color
            radius = 7 if is_active_node else 5

            painter.setBrush(QBrush(color))
            painter.setPen(QPen(QColor(0, 0, 0), 1.5))
            painter.drawEllipse(s_pt, radius, radius)

    def draw_active_sketch(self, painter):
        if len(self.draw_points) < 2:
            return
        pen = QPen(QColor(255, 85, 119), 2, Qt.PenStyle.DashLine)
        painter.setPen(pen)
        screen_pts = [self.world_to_screen(pt[0], pt[1]) for pt in self.draw_points]
        for i in range(len(screen_pts) - 1):
            painter.drawLine(screen_pts[i], screen_pts[i + 1])
        if self.mode == CanvasMode.DRAW_POLYGON and len(screen_pts) > 2:
            painter.drawLine(screen_pts[-1], screen_pts[0])

    def draw_ruler(self, painter):
        s1 = self.world_to_screen(self.ruler_p1[0], self.ruler_p1[1])
        s2 = self.world_to_screen(self.ruler_p2[0], self.ruler_p2[1])

        painter.setPen(QPen(QColor(255, 230, 0), 2, Qt.PenStyle.DashDotLine))
        painter.drawLine(s1, s2)

        # Distance calculation
        dist_px = np.linalg.norm(self.ruler_p2 - self.ruler_p1)
        angle_deg = math.degrees(math.atan2(self.ruler_p2[1] - self.ruler_p1[1], self.ruler_p2[0] - self.ruler_p1[0]))

        mid_s = QPointF((s1.x() + s2.x()) / 2.0, (s1.y() + s2.y()) / 2.0)
        painter.setFont(QFont('Segoe UI', 10, QFont.Weight.Bold))
        painter.setPen(QPen(QColor(255, 230, 0)))
        painter.drawText(mid_s, f"  {dist_px:.1f} px ({angle_deg:.1f}°)")

    def set_mode(self, mode):
        self.mode = mode
        self.mode_changed.emit(mode)
        self.update()

    def mousePressEvent(self, event):
        mpos = event.position()
        world_pos = self.screen_to_world(mpos.x(), mpos.y())
        self.mouse_coords_changed.emit(world_pos[0], world_pos[1])

        if event.button() == Qt.MouseButton.MiddleButton or self.mode == CanvasMode.PAN:
            self.is_panning = True
            self.last_mouse_pos = mpos
            self.setCursor(Qt.CursorShape.ClosedHandCursor)
            return

        # Check if clicked directly on a light source (always allow selecting/moving source)
        for src in self.sources:
            if np.linalg.norm(src.position - world_pos) < (20.0 / self.zoom_level):
                self.select_element(src)
                self.is_drawing = True
                self.last_mouse_pos = world_pos
                return

        if self.mode == CanvasMode.SELECT:
            # Check if clicked inside or near any optical element (lenses, mirrors, screens)
            clicked_elem = None
            for elem in reversed(self.elements):
                if isinstance(elem, CustomLens):
                    if point_in_polygon(world_pos, elem.boundary_points):
                        clicked_elem = elem
                        break
                elif isinstance(elem, (FlatMirror, DetectorScreen)):
                    if is_point_near_segment(world_pos, elem.p1, elem.p2, threshold=18.0 / self.zoom_level):
                        clicked_elem = elem
                        break

            self.select_element(clicked_elem)

            if clicked_elem:
                self.is_drawing = True
                self.last_mouse_pos = world_pos

        elif self.mode == CanvasMode.NODE_EDIT:
            # Check if user clicked on any lens to select it
            clicked_lens = None
            for elem in reversed(self.elements):
                if isinstance(elem, CustomLens):
                    if point_in_polygon(world_pos, elem.boundary_points):
                        clicked_lens = elem
                        break

            if clicked_lens:
                self.select_element(clicked_lens)
            elif self.selected_element is None:
                for elem in reversed(self.elements):
                    if isinstance(elem, CustomLens):
                        self.select_element(elem)
                        break

            if isinstance(self.selected_element, CustomLens):
                lens = self.selected_element
                # Find closest node
                closest_idx = -1
                min_dist = float('inf')
                for i, npt in enumerate(lens.control_points):
                    d = np.linalg.norm(npt - world_pos)
                    if d < min_dist:
                        min_dist = d
                        closest_idx = i

                if min_dist < (25.0 / self.zoom_level):
                    if event.button() == Qt.MouseButton.RightButton:
                        # Right click deletes node (if > 3 nodes remain)
                        if len(lens.control_points) > 3:
                            lens.control_points.pop(closest_idx)
                            lens.invalidate_cache()
                            self.selected_node_idx = -1
                            self.scene_changed.emit()
                    else:
                        self.selected_node_idx = closest_idx
                        self.is_drawing = True
                elif event.button() == Qt.MouseButton.LeftButton:
                    # Click on edge to insert node
                    num_pts = len(lens.control_points)
                    for i in range(num_pts):
                        p1 = lens.control_points[i]
                        p2 = lens.control_points[(i + 1) % num_pts]
                        vec = p2 - p1
                        length_sq = np.dot(vec, vec)
                        if length_sq > 0:
                            t = max(0.0, min(1.0, np.dot(world_pos - p1, vec) / length_sq))
                            proj = p1 + t * vec
                            if np.linalg.norm(world_pos - proj) < (18.0 / self.zoom_level):
                                lens.control_points.insert(i + 1, world_pos)
                                lens.invalidate_cache()
                                self.selected_node_idx = i + 1
                                self.is_drawing = True
                                self.scene_changed.emit()
                                break

        elif self.mode == CanvasMode.DRAW_FREEHAND:
            if event.button() == Qt.MouseButton.LeftButton:
                self.is_drawing = True
                self.draw_points = [world_pos]

        elif self.mode == CanvasMode.DRAW_POLYGON:
            if event.button() == Qt.MouseButton.LeftButton:
                if len(self.draw_points) > 2 and np.linalg.norm(self.draw_points[0] - world_pos) < (15.0 / self.zoom_level):
                    # Close polygon
                    self.finish_polygon_draw()
                else:
                    self.draw_points.append(world_pos)
            elif event.button() == Qt.MouseButton.RightButton:
                self.finish_polygon_draw()

        elif self.mode == CanvasMode.RULER:
            self.ruler_p1 = world_pos
            self.ruler_p2 = world_pos

        self.update()

    def mouseMoveEvent(self, event):
        mpos = event.position()
        world_pos = self.screen_to_world(mpos.x(), mpos.y())
        self.mouse_coords_changed.emit(world_pos[0], world_pos[1])

        if self.is_panning:
            delta = mpos - self.last_mouse_pos
            self.pan_offset += delta
            self.last_mouse_pos = mpos
            self.update()
            return

        if self.mode == CanvasMode.SELECT and self.is_drawing and self.selected_element:
            if isinstance(self.selected_element, LightSource):
                self.selected_element.position = world_pos
                self.scene_changed.emit()
            elif hasattr(self.selected_element, 'translate'):
                dx = world_pos[0] - self.last_mouse_pos[0]
                dy = world_pos[1] - self.last_mouse_pos[1]
                self.selected_element.translate(dx, dy)
                self.last_mouse_pos = world_pos
                self.scene_changed.emit()
            self.update()

        elif self.mode == CanvasMode.NODE_EDIT and self.is_drawing and self.selected_node_idx >= 0:
            if isinstance(self.selected_element, CustomLens):
                # Update control point position live while dragging!
                self.selected_element.control_points[self.selected_node_idx] = world_pos
                self.selected_element.invalidate_cache()
                self.scene_changed.emit()
                self.update()

        elif self.mode == CanvasMode.DRAW_FREEHAND and self.is_drawing:
            if len(self.draw_points) == 0 or np.linalg.norm(self.draw_points[-1] - world_pos) > (5.0 / self.zoom_level):
                self.draw_points.append(world_pos)
                self.update()

        elif self.mode == CanvasMode.RULER and self.ruler_p1 is not None:
            self.ruler_p2 = world_pos
            self.update()

    def mouseReleaseEvent(self, event):
        if self.is_panning:
            self.is_panning = False
            self.setCursor(Qt.CursorShape.ArrowCursor)
            return

        if self.mode == CanvasMode.DRAW_FREEHAND and self.is_drawing:
            self.is_drawing = False
            self.finish_freehand_draw()

        self.is_drawing = False
        self.update()

    def wheelEvent(self, event):
        zoom_factor = 1.15 if event.angleDelta().y() > 0 else 0.85
        new_zoom = max(0.2, min(8.0, self.zoom_level * zoom_factor))

        mpos = event.position()
        world_before = self.screen_to_world(mpos.x(), mpos.y())
        self.zoom_level = new_zoom
        world_after = self.screen_to_world(mpos.x(), mpos.y())

        # Adjust pan to zoom around mouse position
        self.pan_offset += QPointF(
            (world_after[0] - world_before[0]) * self.zoom_level,
            (world_after[1] - world_before[1]) * self.zoom_level
        )
        self.update()

    # --- DRAWING COMPLETION HANDLERS ---

    def finish_current_drawing(self):
        """Universal OK / finish handler for freehand, polygon, or node editing."""
        if self.mode == CanvasMode.DRAW_POLYGON:
            self.finish_polygon_draw()
        elif self.mode == CanvasMode.DRAW_FREEHAND:
            self.finish_freehand_draw()
        else:
            self.set_mode(CanvasMode.SELECT)

    def finish_freehand_draw(self):
        if len(self.draw_points) < 4:
            self.draw_points.clear()
            self.set_mode(CanvasMode.SELECT)
            return

        # Downsample freehand points for smooth control handles
        downsampled = []
        step = max(1, len(self.draw_points) // 15)
        for i in range(0, len(self.draw_points), step):
            downsampled.append(self.draw_points[i])

        if len(downsampled) >= 3:
            new_lens = CustomLens(downsampled, n=1.5, name="Lente Dibujado", is_smooth=True)
            self.add_element(new_lens)

        self.draw_points.clear()
        self.set_mode(CanvasMode.SELECT)
        self.update()

    def finish_polygon_draw(self):
        if len(self.draw_points) >= 3:
            new_lens = CustomLens(self.draw_points, n=1.5, name="Lente Polígono", is_smooth=False)
            self.add_element(new_lens)

        self.draw_points.clear()
        self.set_mode(CanvasMode.SELECT)
        self.update()
