import os
import json
import math
import numpy as np
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QIcon, QFont, QAction, QColor, QKeySequence
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QToolBar,
    QDockWidget, QGroupBox, QLabel, QSlider, QDoubleSpinBox,
    QSpinBox, QCheckBox, QPushButton, QComboBox, QListWidget,
    QListWidgetItem, QFileDialog, QMessageBox, QStatusBar,
    QSplitter, QFrame
)

from dark_theme import DARK_QSS
from optics_canvas import OpticsCanvas, CanvasMode
from optical_elements import (
    CustomLens, LightSource, FlatMirror, DetectorScreen,
    create_biconvex_lens, create_biconcave_lens, create_triangular_prism,
    create_glass_slab
)

class MainWindow(QMainWindow):
    """Main Application Window for the PyQt6 Optics Simulator."""
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Simulador de Óptica 2D - Modo Oscuro & Lentes Personalizadas")
        self.resize(1350, 850)

        # Apply Dark Theme QSS
        self.setStyleSheet(DARK_QSS)

        # Main Canvas Central Widget
        self.canvas = OpticsCanvas(self)
        self.setCentralWidget(self.canvas)

        # Setup Dock Panels and Toolbars
        self.setup_toolbars()
        self.setup_left_dock()
        self.setup_right_dock()
        self.setup_statusbar()

        # Connect signals
        self.canvas.element_selected.connect(self.on_element_selected)
        self.canvas.scene_changed.connect(self.update_scene_list)
        self.canvas.mouse_coords_changed.connect(self.on_mouse_coords_changed)
        self.canvas.mode_changed.connect(self.on_canvas_mode_changed)

        # Load default starter scene
        self.load_demo_prism_dispersion()

    # --- TOOLBAR & MENUS ---

    def setup_toolbars(self):
        tb_tools = QToolBar("Herramientas de Selección y Dibujo", self)
        tb_tools.setIconSize(QSize(20, 20))
        self.addToolBar(Qt.ToolBarArea.TopToolBarArea, tb_tools)

        # Mode Buttons
        btn_select = QPushButton("🔍 Mover / Seleccionar")
        btn_select.setCheckable(True)
        btn_select.setChecked(True)
        btn_select.setProperty("mode", CanvasMode.SELECT)
        btn_select.clicked.connect(lambda: self.set_canvas_mode(CanvasMode.SELECT, btn_select))

        btn_node_edit = QPushButton("✏️ Deformar Nodos (Inventar Lente)")
        btn_node_edit.setCheckable(True)
        btn_node_edit.setProperty("mode", CanvasMode.NODE_EDIT)
        btn_node_edit.clicked.connect(lambda: self.set_canvas_mode(CanvasMode.NODE_EDIT, btn_node_edit))

        btn_draw_freehand = QPushButton("✍️ Dibujar Lente a Mano")
        btn_draw_freehand.setCheckable(True)
        btn_draw_freehand.setProperty("mode", CanvasMode.DRAW_FREEHAND)
        btn_draw_freehand.clicked.connect(lambda: self.set_canvas_mode(CanvasMode.DRAW_FREEHAND, btn_draw_freehand))

        btn_draw_poly = QPushButton("📐 Polígono Personalizado")
        btn_draw_poly.setCheckable(True)
        btn_draw_poly.setProperty("mode", CanvasMode.DRAW_POLYGON)
        btn_draw_poly.clicked.connect(lambda: self.set_canvas_mode(CanvasMode.DRAW_POLYGON, btn_draw_poly))

        btn_ok_finish = QPushButton("✅ OK - Finalizar Dibujo")
        btn_ok_finish.setStyleSheet("background-color: #00ffcc; color: #0f111a; font-weight: bold; padding: 6px 16px;")
        btn_ok_finish.clicked.connect(self.canvas.finish_current_drawing)

        btn_ruler = QPushButton("📏 Regla / Medidor")
        btn_ruler.setCheckable(True)
        btn_ruler.setProperty("mode", CanvasMode.RULER)
        btn_ruler.clicked.connect(lambda: self.set_canvas_mode(CanvasMode.RULER, btn_ruler))

        self.mode_buttons = [btn_select, btn_node_edit, btn_draw_freehand, btn_draw_poly, btn_ruler]
        for btn in self.mode_buttons:
            tb_tools.addWidget(btn)

        tb_tools.addWidget(btn_ok_finish)
        tb_tools.addSeparator()

        # Optics Preset Quick-Add
        cb_add_preset = QComboBox()
        cb_add_preset.addItems([
            "-- Agregar Óptica --",
            "Lente Biconvexa",
            "Lente Bicóncava",
            "Prisma Triangular",
            "Bloque de Vidrio",
            "Espejo Plano",
            "Pantalla / Detector"
        ])
        cb_add_preset.activated.connect(self.on_add_preset_selected)
        tb_tools.addWidget(cb_add_preset)

        # Light Sources Quick-Add
        cb_add_source = QComboBox()
        cb_add_source.addItems([
            "-- Agregar Fuente de Luz --",
            "Haz Láser",
            "Fuente Puntual (Abanico)",
            "Haz Paralelo",
            "Objeto Lápiz (Luz de Objeto)"
        ])
        cb_add_source.activated.connect(self.on_add_source_selected)
        tb_tools.addWidget(cb_add_source)

        tb_tools.addSeparator()

        # Demos Selector
        cb_demos = QComboBox()
        cb_demos.addItems([
            "Demos de Física...",
            "1. Arcoíris en Prisma (Dispersión)",
            "2. Aberración Esférica en Lente",
            "3. Formación de Imagen con Objeto Lápiz",
            "4. Lente Deformada a Mano",
            "5. Guía de Onda / Reflexión Total (TIR)"
        ])
        cb_demos.activated.connect(self.on_demo_selected)
        tb_tools.addWidget(cb_demos)

        tb_tools.addSeparator()

        # Clear Scene
        btn_clear = QPushButton("🗑️ Limpiar")
        btn_clear.clicked.connect(self.canvas.clear_scene)
        tb_tools.addWidget(btn_clear)

    def set_canvas_mode(self, mode, active_btn):
        self.canvas.set_mode(mode)

    def on_canvas_mode_changed(self, mode):
        for btn in self.mode_buttons:
            btn.blockSignals(True)
            btn.setChecked(btn.property("mode") == mode)
            btn.blockSignals(False)

    # --- LEFT DOCK (SCENE TREE & DETECTOR) ---

    def setup_left_dock(self):
        dock = QDockWidget("Elementos de la Escena", self)
        dock.setAllowedAreas(Qt.DockWidgetArea.LeftDockWidgetArea | Qt.DockWidgetArea.RightDockWidgetArea)

        widget = QWidget()
        layout = QVBoxLayout(widget)

        # List Widget
        self.list_scene = QListWidget()
        self.list_scene.itemClicked.connect(self.on_list_item_clicked)
        layout.addWidget(self.list_scene)

        # Action Buttons
        btn_delete = QPushButton("Eliminar Elemento")
        btn_delete.setStyleSheet("background-color: #ff5577; color: white;")
        btn_delete.clicked.connect(self.canvas.remove_selected)
        layout.addWidget(btn_delete)

        # Detector Screen Summary Group
        group_detector = QGroupBox("Detector / Pantalla de Luz")
        layout_det = QVBoxLayout(group_detector)
        self.lbl_detector_info = QLabel("Impactos de luz: 0\nPerfil: N/A")
        self.lbl_detector_info.setWordWrap(True)
        layout_det.addWidget(self.lbl_detector_info)
        layout.addWidget(group_detector)

        dock.setWidget(widget)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, dock)

    # --- RIGHT DOCK (PARAMETRIC CONTROLS) ---

    def setup_right_dock(self):
        dock = QDockWidget("Propiedades y Parámetros Física", self)
        dock.setAllowedAreas(Qt.DockWidgetArea.LeftDockWidgetArea | Qt.DockWidgetArea.RightDockWidgetArea)

        widget = QWidget()
        layout = QVBoxLayout(widget)

        # --- OPTICS MATERIAL & REFRACTIVE INDEX ---
        gb_material = QGroupBox("Material del Lente / Medio")
        lay_mat = QVBoxLayout(gb_material)

        h_idx = QHBoxLayout()
        h_idx.addWidget(QLabel("Índice n:"))
        self.spin_n = QDoubleSpinBox()
        self.spin_n.setRange(1.00, 3.50)
        self.spin_n.setSingleStep(0.05)
        self.spin_n.setValue(1.50)
        self.spin_n.valueChanged.connect(self.on_n_changed)
        h_idx.addWidget(self.spin_n)
        lay_mat.addLayout(h_idx)

        # Preset Material Buttons
        lay_presets = QHBoxLayout()
        for name, val in [("Vidrio", 1.50), ("Agua", 1.33), ("Diamante", 2.42), ("Flint", 1.66)]:
            btn_mat = QPushButton(name)
            btn_mat.clicked.connect(lambda _, v=val: self.spin_n.setValue(v))
            lay_presets.addWidget(btn_mat)
        lay_mat.addLayout(lay_presets)

        self.chk_smooth = QCheckBox("Curva Suave (Spline)")
        self.chk_smooth.setChecked(True)
        self.chk_smooth.toggled.connect(self.on_smooth_toggled)
        lay_mat.addWidget(self.chk_smooth)

        self.chk_dispersion = QCheckBox("Dispersión Cromática (RGB)")
        self.chk_dispersion.toggled.connect(self.on_dispersion_toggled)
        lay_mat.addWidget(self.chk_dispersion)

        layout.addWidget(gb_material)

        # --- TRANSFORMS (ROTATION / SCALE) ---
        gb_transform = QGroupBox("Transformación de Lente")
        lay_tr = QVBoxLayout(gb_transform)

        lay_tr.addWidget(QLabel("Rotación (Grados):"))
        self.slider_rot = QSlider(Qt.Orientation.Horizontal)
        self.slider_rot.setRange(0, 360)
        self.slider_rot.valueChanged.connect(self.on_rotation_changed)
        lay_tr.addWidget(self.slider_rot)

        layout.addWidget(gb_transform)

        # --- LIGHT SOURCE PROPERTIES ---
        gb_source = QGroupBox("Propiedades de Fuente de Luz")
        lay_src = QVBoxLayout(gb_source)

        lay_src.addWidget(QLabel("Cantidad de Rayos:"))
        self.slider_rays = QSlider(Qt.Orientation.Horizontal)
        self.slider_rays.setRange(1, 80)
        self.slider_rays.setValue(15)
        self.slider_rays.valueChanged.connect(self.on_ray_count_changed)
        lay_src.addWidget(self.slider_rays)

        lay_src.addWidget(QLabel("Ángulo de Emisión:"))
        self.slider_src_angle = QSlider(Qt.Orientation.Horizontal)
        self.slider_src_angle.setRange(-180, 180)
        self.slider_src_angle.setValue(0)
        self.slider_src_angle.valueChanged.connect(self.on_src_angle_changed)
        lay_src.addWidget(self.slider_src_angle)

        lay_src.addWidget(QLabel("Longitud de Onda (nm):"))
        self.slider_wl = QSlider(Qt.Orientation.Horizontal)
        self.slider_wl.setRange(380, 750)
        self.slider_wl.setValue(532)
        self.slider_wl.valueChanged.connect(self.on_wl_changed)
        lay_src.addWidget(self.slider_wl)

        layout.addWidget(gb_source)

        # --- CANVAS & GLOBAL PHYSICS SETTINGS ---
        gb_global = QGroupBox("Configuración de Simulación")
        lay_glob = QVBoxLayout(gb_global)

        self.chk_grid = QCheckBox("Mostrar Cuadrícula")
        self.chk_grid.setChecked(True)
        self.chk_grid.toggled.connect(lambda v: setattr(self.canvas, 'show_grid', v) or self.canvas.update())
        lay_glob.addWidget(self.chk_grid)

        self.chk_axis = QCheckBox("Mostrar Eje Óptico")
        self.chk_axis.setChecked(True)
        self.chk_axis.toggled.connect(lambda v: setattr(self.canvas, 'show_axis', v) or self.canvas.update())
        lay_glob.addWidget(self.chk_axis)

        lay_glob.addWidget(QLabel("Rebotes Máx. de Luz:"))
        self.spin_bounces = QSpinBox()
        self.spin_bounces.setRange(5, 200)
        self.spin_bounces.setValue(50)
        self.spin_bounces.valueChanged.connect(lambda v: setattr(self.canvas, 'max_bounces', v) or self.canvas.update())
        lay_glob.addWidget(self.spin_bounces)

        layout.addWidget(gb_global)

        layout.addStretch()
        dock.setWidget(widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, dock)

    def setup_statusbar(self):
        self.statusbar = QStatusBar(self)
        self.setStatusBar(self.statusbar)
        self.lbl_coords = QLabel("X: 0.0, Y: 0.0")
        self.statusbar.addPermanentWidget(self.lbl_coords)
        self.statusbar.showMessage("Listo. Selecciona o dibuja lentes en el lienzo.")

    # --- EVENT HANDLERS & UPDATES ---

    def get_target_light_source(self):
        """Returns currently selected LightSource, or the primary LightSource in scene if a lens is selected."""
        if isinstance(self.canvas.selected_element, LightSource):
            return self.canvas.selected_element
        if self.canvas.sources:
            return self.canvas.sources[0]
        return None

    def on_element_selected(self, elem):
        if elem is None:
            return

        # Sync Rotation Slider for any selected element
        self.slider_rot.blockSignals(True)
        if isinstance(elem, LightSource):
            self.slider_rot.setValue(int(elem.angle_deg) % 360)
        elif hasattr(elem, 'current_rotation_deg'):
            self.slider_rot.setValue(int(elem.current_rotation_deg) % 360)
        elif isinstance(elem, (FlatMirror, DetectorScreen)):
            ang = math.degrees(math.atan2(elem.p2[1] - elem.p1[1], elem.p2[0] - elem.p1[0]))
            self.slider_rot.setValue(int(ang) % 360)
        else:
            self.slider_rot.setValue(0)
        self.slider_rot.blockSignals(False)

        if isinstance(elem, CustomLens):
            self.spin_n.blockSignals(True)
            self.spin_n.setValue(elem.n)
            self.spin_n.blockSignals(False)

            self.chk_smooth.blockSignals(True)
            self.chk_smooth.setChecked(elem.is_smooth)
            self.chk_smooth.blockSignals(False)

            self.chk_dispersion.blockSignals(True)
            self.chk_dispersion.setChecked(elem.dispersion_enabled)
            self.chk_dispersion.blockSignals(False)

        # Sync Light Source Sliders for target source
        target_src = self.get_target_light_source()
        if target_src:
            self.slider_rays.blockSignals(True)
            self.slider_rays.setValue(target_src.ray_count)
            self.slider_rays.blockSignals(False)

            self.slider_src_angle.blockSignals(True)
            self.slider_src_angle.setValue(int(target_src.angle_deg))
            self.slider_src_angle.blockSignals(False)

            self.slider_wl.blockSignals(True)
            self.slider_wl.setValue(int(target_src.wavelength))
            self.slider_wl.blockSignals(False)

        self.update_scene_list()

    def update_scene_list(self):
        self.list_scene.blockSignals(True)
        self.list_scene.clear()

        for elem in self.canvas.elements:
            item = QListWidgetItem(f"🔹 {elem.name}")
            item.setData(Qt.ItemDataRole.UserRole, elem)
            if elem == self.canvas.selected_element:
                item.setSelected(True)
            self.list_scene.addItem(item)

        for src in self.canvas.sources:
            item = QListWidgetItem(f"💡 {src.name}")
            item.setData(Qt.ItemDataRole.UserRole, src)
            if src == self.canvas.selected_element:
                item.setSelected(True)
            self.list_scene.addItem(item)

        self.list_scene.blockSignals(False)
        self.update_detector_info()

    def update_detector_info(self):
        for elem in self.canvas.elements:
            if isinstance(elem, DetectorScreen):
                n_hits = len(elem.hits)
                self.lbl_detector_info.setText(f"Impactos de luz: {n_hits}\nDetector activo en lienzo.")
                return
        self.lbl_detector_info.setText("Sin pantalla detectora.")

    def on_list_item_clicked(self, item):
        elem = item.data(Qt.ItemDataRole.UserRole)
        self.canvas.select_element(elem)

    def on_mouse_coords_changed(self, x, y):
        self.lbl_coords.setText(f"X: {x:.1f}, Y: {y:.1f}")

    def on_n_changed(self, val):
        if isinstance(self.canvas.selected_element, CustomLens):
            self.canvas.selected_element.n = float(val)
            self.canvas.update()

    def on_smooth_toggled(self, val):
        if isinstance(self.canvas.selected_element, CustomLens):
            self.canvas.selected_element.is_smooth = val
            self.canvas.update()

    def on_dispersion_toggled(self, val):
        if isinstance(self.canvas.selected_element, CustomLens):
            self.canvas.selected_element.dispersion_enabled = val
            self.canvas.update()

    def on_rotation_changed(self, angle_deg):
        elem = self.canvas.selected_element
        if elem is None:
            return

        if isinstance(elem, LightSource):
            elem.angle_deg = float(angle_deg)
            self.slider_src_angle.blockSignals(True)
            self.slider_src_angle.setValue(int(angle_deg))
            self.slider_src_angle.blockSignals(False)
            self.canvas.update()
        elif hasattr(elem, 'rotate_to_angle'):
            elem.rotate_to_angle(float(angle_deg))
            self.canvas.update()

    def on_ray_count_changed(self, val):
        src = self.get_target_light_source()
        if src:
            src.ray_count = val
            self.canvas.update()

    def on_src_angle_changed(self, val):
        src = self.get_target_light_source()
        if src:
            src.angle_deg = float(val)
            self.slider_rot.blockSignals(True)
            self.slider_rot.setValue(int(val) % 360)
            self.slider_rot.blockSignals(False)
            self.canvas.update()

    def on_wl_changed(self, val):
        src = self.get_target_light_source()
        if src:
            src.wavelength = float(val)
            self.canvas.update()

    # --- ADD PRESET OPTICS & SOURCES ---

    def on_add_preset_selected(self, idx):
        if idx == 0:
            return
        cx, cy = 0.0, 0.0
        if idx == 1:
            elem = create_biconvex_lens(cx, cy, width=45, height=140, R1=90, R2=90, n=1.50)
        elif idx == 2:
            elem = create_biconcave_lens(cx, cy, width=45, height=140, n=1.50)
        elif idx == 3:
            elem = create_triangular_prism(cx, cy, side_length=120, n=1.50, dispersion=True)
        elif idx == 4:
            elem = create_glass_slab(cx, cy, width=140, height=80, n=1.50)
        elif idx == 5:
            elem = FlatMirror([-50, -60], [-50, 60], name="Espejo Plano")
        elif idx == 6:
            elem = DetectorScreen([150, -100], [150, 100], name="Pantalla Detectora")

        self.canvas.add_element(elem)
        if hasattr(self.sender(), 'setCurrentIndex'):
            self.sender().setCurrentIndex(0)

    def on_add_source_selected(self, idx):
        if idx == 0:
            return
        # Slightly offset new sources if existing ones exist
        n_src = len(self.canvas.sources)
        pos = [-250.0, float((n_src * 30) % 150 - 60)]
        if idx == 1:
            src = LightSource(pos, angle_deg=0.0, name="Láser Verde")
            src.source_type = "laser"
            src.ray_count = 1
        elif idx == 2:
            src = LightSource(pos, angle_deg=0.0, name="Fuente Puntual (Abanico)")
            src.source_type = "fan"
            src.ray_count = 25
            src.aperture_deg = 45.0
        elif idx == 3:
            src = LightSource(pos, angle_deg=0.0, name="Haz Paralelo")
            src.source_type = "parallel"
            src.ray_count = 21
            src.beam_width = 80.0
        elif idx == 4:
            src = LightSource(pos, angle_deg=0.0, name="Objeto Lápiz (Rayos Objeto)")
            src.source_type = "object"
            src.ray_count = 25
            src.beam_width = 70.0
            src.aperture_deg = 35.0

        self.canvas.add_source(src)
        if hasattr(self.sender(), 'setCurrentIndex'):
            self.sender().setCurrentIndex(0)

    # --- PRESET DEMO SCENES ---

    def on_demo_selected(self, idx):
        if idx == 1:
            self.load_demo_prism_dispersion()
        elif idx == 2:
            self.load_demo_spherical_aberration()
        elif idx == 3:
            self.load_demo_object_image_formation()
        elif idx == 4:
            self.load_demo_custom_hand_drawn_lens()
        elif idx == 5:
            self.load_demo_total_internal_reflection()
        if hasattr(self.sender(), 'setCurrentIndex'):
            self.sender().setCurrentIndex(0)

    def load_demo_prism_dispersion(self):
        """Demo 1: Chromatic dispersion in a triangular prism."""
        self.canvas.clear_scene()

        prism = create_triangular_prism(0.0, 0.0, side_length=130, n=1.65, dispersion=True)
        self.canvas.add_element(prism)

        # Single main laser source
        src = LightSource([-220.0, 0.0], angle_deg=0.0, name="Láser Verde 532nm")
        src.source_type = "laser"
        src.ray_count = 1
        src.wavelength = 532.0
        self.canvas.add_source(src)

        self.statusbar.showMessage("Cargada Demo: Dispersión Cromática en Prisma Triangular.")

    def load_demo_spherical_aberration(self):
        """Demo 2: Spherical aberration of a thick biconvex lens."""
        self.canvas.clear_scene()

        lens = create_biconvex_lens(0.0, 0.0, width=60, height=180, R1=100, R2=100, n=1.55)
        self.canvas.add_element(lens)

        src = LightSource([-260.0, 0.0], angle_deg=0.0, name="Haz Paralelo Ancho")
        src.source_type = "parallel"
        src.ray_count = 25
        src.beam_width = 160.0
        self.canvas.add_source(src)

        screen = DetectorScreen([220.0, -100.0], [220.0, 100.0], name="Pantalla en Plano Focal")
        self.canvas.add_element(screen)

        self.statusbar.showMessage("Cargada Demo: Aberración Esférica en Lente Grasa.")

    def load_demo_object_image_formation(self):
        """Demo 3: Real Image formation from an object (pencil source)."""
        self.canvas.clear_scene()

        lens = create_biconvex_lens(0.0, 0.0, width=35, height=150, R1=110, R2=110, n=1.52)
        self.canvas.add_element(lens)

        pencil_src = LightSource([-220.0, 0.0], angle_deg=0.0, name="Objeto Lápiz Emisor")
        pencil_src.source_type = "object"
        pencil_src.ray_count = 25
        pencil_src.beam_width = 80.0
        pencil_src.aperture_deg = 30.0
        self.canvas.add_source(pencil_src)

        screen = DetectorScreen([230.0, -110.0], [230.0, 110.0], name="Pantalla Proyección Imagen")
        self.canvas.add_element(screen)

        self.statusbar.showMessage("Cargada Demo: Formación de Imagen Real con Objeto y Pantalla.")

    def load_demo_custom_hand_drawn_lens(self):
        """Demo 4: Invented custom deformed wavy/teardrop lens."""
        self.canvas.clear_scene()

        # Custom irregular wavy control points
        pts = [
            [-30, -80],
            [30, -60],
            [60, 0],
            [20, 70],
            [-40, 60],
            [-60, -10]
        ]
        custom_lens = CustomLens(pts, n=1.60, name="Lente Inventado Deformado", is_smooth=True)
        self.canvas.add_element(custom_lens)

        src = LightSource([-250.0, 0.0], angle_deg=0.0, name="Haz Paralelo")
        src.source_type = "parallel"
        src.ray_count = 21
        src.beam_width = 120.0
        self.canvas.add_source(src)

        # Select node edit mode so control handles are visible immediately
        self.canvas.mode = CanvasMode.NODE_EDIT

        self.statusbar.showMessage("Cargada Demo: Lente Personalizado Deformable. ¡Arrastra los nodos amarillos para deformar!")

    def load_demo_total_internal_reflection(self):
        """Demo 5: Total Internal Reflection (TIR) in a glass slab / waveguide."""
        self.canvas.clear_scene()

        slab = create_glass_slab(0.0, 0.0, width=280, height=50, n=1.60)
        self.canvas.add_element(slab)

        src = LightSource([-160.0, 0.0], angle_deg=35.0, name="Láser en Guía de Onda")
        src.source_type = "laser"
        src.ray_count = 1
        src.wavelength = 532.0
        self.canvas.add_source(src)

        self.statusbar.showMessage("Cargada Demo: Reflexión Total Interna (TIR) dentro de Guía de Onda.")
