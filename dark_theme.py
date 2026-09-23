# PyQt6 Dark Mode Theme Constants and QSS Stylesheet

DARK_PALETTE = {
    'bg_dark': '#0f111a',
    'bg_panel': '#171926',
    'bg_surface': '#212436',
    'bg_hover': '#2d3148',
    'border': '#363b58',
    'accent': '#00ffcc',
    'accent_hover': '#33ffdf',
    'accent_dark': '#00b38f',
    'text_main': '#e6edf3',
    'text_dim': '#8b949e',
    'danger': '#ff5577',
    'warning': '#ffb86c',
}

DARK_QSS = """
QMainWindow, QDialog {
    background-color: #0f111a;
    color: #e6edf3;
}

QWidget {
    font-family: 'Segoe UI', 'Roboto', sans-serif;
    font-size: 13px;
    color: #e6edf3;
}

QMenuBar {
    background-color: #171926;
    color: #e6edf3;
    border-bottom: 1px solid #363b58;
}

QMenuBar::item:selected {
    background-color: #2d3148;
    color: #00ffcc;
}

QMenu {
    background-color: #171926;
    color: #e6edf3;
    border: 1px solid #363b58;
}

QMenu::item:selected {
    background-color: #2d3148;
    color: #00ffcc;
}

QToolBar {
    background-color: #171926;
    border-bottom: 1px solid #363b58;
    spacing: 6px;
    padding: 4px;
}

QToolButton {
    background-color: #212436;
    color: #e6edf3;
    border: 1px solid #363b58;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: 600;
}

QToolButton:hover {
    background-color: #2d3148;
    border-color: #00ffcc;
    color: #00ffcc;
}

QToolButton:checked {
    background-color: #00b38f;
    color: #0f111a;
    border-color: #00ffcc;
}

QDockWidget {
    color: #00ffcc;
    font-weight: bold;
}

QDockWidget::title {
    background-color: #171926;
    padding: 8px;
    border-bottom: 1px solid #363b58;
}

QGroupBox {
    background-color: #171926;
    border: 1px solid #363b58;
    border-radius: 8px;
    margin-top: 14px;
    padding-top: 12px;
    font-weight: bold;
    color: #00ffcc;
}

QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    padding: 0 8px;
    background-color: #171926;
}

QPushButton {
    background-color: #212436;
    color: #e6edf3;
    border: 1px solid #363b58;
    border-radius: 6px;
    padding: 6px 14px;
    font-weight: 600;
}

QPushButton:hover {
    background-color: #2d3148;
    border-color: #00ffcc;
    color: #00ffcc;
}

QPushButton:pressed {
    background-color: #00b38f;
    color: #0f111a;
}

QPushButton:disabled {
    background-color: #171926;
    color: #545d68;
    border-color: #242936;
}

QSlider::groove:horizontal {
    border: 1px solid #363b58;
    height: 6px;
    background: #212436;
    border-radius: 3px;
}

QSlider::sub-page:horizontal {
    background: #00ffcc;
    border-radius: 3px;
}

QSlider::handle:horizontal {
    background: #e6edf3;
    border: 2px solid #00ffcc;
    width: 16px;
    margin-top: -5px;
    margin-bottom: -5px;
    border-radius: 8px;
}

QSlider::handle:horizontal:hover {
    background: #00ffcc;
    border: 2px solid #ffffff;
}

QSpinBox, QDoubleSpinBox, QComboBox, QLineEdit {
    background-color: #212436;
    color: #e6edf3;
    border: 1px solid #363b58;
    border-radius: 6px;
    padding: 4px 8px;
}

QSpinBox:focus, QDoubleSpinBox:focus, QComboBox:focus, QLineEdit:focus {
    border-color: #00ffcc;
}

QListWidget {
    background-color: #171926;
    border: 1px solid #363b58;
    border-radius: 6px;
    color: #e6edf3;
}

QListWidget::item {
    padding: 8px;
    border-bottom: 1px solid #212436;
    border-radius: 4px;
}

QListWidget::item:hover {
    background-color: #2d3148;
    color: #00ffcc;
}

QListWidget::item:selected {
    background-color: #212436;
    color: #00ffcc;
    border-left: 4px solid #00ffcc;
}

QStatusBar {
    background-color: #171926;
    color: #8b949e;
    border-top: 1px solid #363b58;
}

QTabWidget::pane {
    border: 1px solid #363b58;
    background-color: #171926;
    border-radius: 6px;
}

QTabBar::tab {
    background-color: #212436;
    color: #8b949e;
    padding: 8px 16px;
    border: 1px solid #363b58;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
}

QTabBar::tab:selected {
    background-color: #171926;
    color: #00ffcc;
    border-bottom-color: #171926;
    font-weight: bold;
}
"""
