# 🔬 Simulador de Óptica 2D · Ambystoma Studio
**Interactive 2D Ray Tracing & Optics Simulator for the Web**

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00ffcc?style=for-the-badge&logo=github)](https://ambystomatechnologies.github.io/optic-simulator/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20100%25%20In--Browser-blue?style=for-the-badge)](https://ambystomatechnologies.github.io/optic-simulator/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Desarrollado por **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · 100% Gratuito y de Código Abierto.

---

## 🌐 Demo Online
Prueba el simulador directamente en tu navegador sin instalar nada:  
👉 **[https://ambystomatechnologies.github.io/optic-simulator/](https://ambystomatechnologies.github.io/optic-simulator/)**

---

## ✨ Características Principales

- 🌈 **Haz de Luz Blanca & Dispersión Espectral en 7 Colores:** Descomposición cromática basada en la ecuación de Cauchy (Rojo, Naranja, Amarillo, Verde, Cian, Azul y Violeta) con grosor sincronizado y refracción proporcional al haz incidente.
- ✏️ **Lentes Deformables & Edición Universal de Nodos:** Deforma cualquier figura seleccionada en la escena o arrastra nodos directamente sobre el lienzo mediante splines Catmull-Rom para modelar ópticas orgánicas y asféricas.
- 📐 **Dibujo de Polígonos con Botón Dinámico:** Traza prismas o lentes geométricas con el botón interactivo *Finalizar dibujo de polígono*.
- 💾 **Guardar y Abrir Configuraciones:** Guarda tu montaje óptico en formato `.json` con nomenclatura inteligente automática y recupéralo en cualquier momento.
- 💡 **Fuentes de Luz y Láseres:** Rayo láser monocromático (longitud de onda regulable de 380 nm a 750 nm), haz de luz blanca, fuentes puntuales en abanico y haces colimados.
- 📺 **Pantalla Detectora:** Sensor óptico que registra impactos de fotones en tiempo real y muestra perfiles espectrales.
- 🪞 **Elementos Ópticos:** Lentes biconvexas, bicóncavas, prismas triangulares de Newton, bloques de vidrio, espejos reflectantes y pantallas.
- 📚 **12 Demos de Física Clásica (Física 1 y 2):** Prisma de Newton, Aberración esférica, Doblete acromático, Telescopio de Kepler, Expansor galileano, Fibra óptica TIR, Ley de Snell, Periscopio y Retrorreflexión.
- 📏 **Regla Óptica Interactiva:** Medición de distancias en milímetros y ángulos relativos.
- 🌐 **Totalmente Bilingüe (Inglés por defecto / Español):** Selector de banderas circulares en el encabezado con cambio de idioma instantáneo.
- ⚡ **Alto Rendimiento (60 FPS):** Renderizado acelerado en Canvas HTML5 y procesamiento local en el cliente.

---

## 🚀 Cómo Ejecutar en Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ambystomatechnologies/optic-simulator.git
   cd optic-simulator
   ```
2. Ejecuta con Python:
   ```bash
   python -m http.server 8081
   ```
   *(En Windows también puedes hacer doble clic en `start.bat`)*
3. Abre en tu navegador web:
   ```text
   http://localhost:8081/index.html
   ```

---

© 2026 **[Ambystoma Technologies](https://ambystomatechnologies.github.io/)** · Desarrollando herramientas de ciencia y tecnología accesibles para todos.
