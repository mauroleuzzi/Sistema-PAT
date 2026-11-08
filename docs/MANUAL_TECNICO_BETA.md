# Manual Operativo y Guía de Campo (Fase Beta) — Sistema PAT

**Versión:** 1.7.0 (Beta de Validación Operativa)  
**Destinatarios:** Técnicos Electricistas en Campo, Inspectores de Obra y Administradores  
**Objetivo de la Fase Beta:** Validar en obra real la ergonomía de carga, funcionamiento sin conexión, calidad fotográfica y emisión de protocolos oficiales de 2 páginas A4 antes del despliegue masivo.

---

## 🎯 Propósito de la Evaluación en Campo

Esta versión de prueba tiene como objetivo que el técnico operativo interactúe en situaciones reales de trabajo:
- **En subsuelos y salas de bombas sin cobertura celular** (validando la persistencia offline).
- **A pleno sol en terrazas o patios** (probando el Modo Sol de alto contraste).
- **Con diferentes tipos de suelo y tableros** (revisando la velocidad de carga de datos).

Todas las observaciones, dificultades de lectura o propuestas de ajuste que detecte el técnico serán recopiladas para la puesta a punto definitiva antes de la carga del padrón de consorcios reales.

---

## 🧭 Flujo de Trabajo Operativo en 6 Pasos

1. **Ingreso y Estado de Conexión:** Acceso directo con perfiles rápidos (Técnico / Admin) y verificación de estado de red.
2. **Selección del Consorcio:** Búsqueda rápida por dirección, filtrado por semáforo de vencimiento (Vigente / Por Vencer / Vencido) y consulta de la locación histórica de la jabalina.
3. **Toma de Medición en Obra:**
   - Carga del valor de resistencia con el **Teclado Táctil In-App** de botones gigantes (cómodo con guantes).
   - Semáforo normativo automático en vivo:
     - **≤ 10 $\Omega$ (Verde):** Óptimo recomendación AEA / COPIME.
     - **≤ 40 $\Omega$ (Ámbar):** Admisible con interruptor diferencial de 30 mA (Res. SRT 900/15).
     - **> 40 $\Omega$ (Rojo):** No cumple / Valor elevado.
   - Herencia inteligente de datos previos (suelo, locación, observaciones) para evitar tipeo redundante.
4. **Captura Fotográfica de Evidencias:**
   - Foto 1: Tablero Eléctrico Seccional / General.
   - Foto 2: Toma de Tierra (Jabalina PAT).
   - Compresión automática y subida directa a Supabase Storage (`pat-fotos`) protegiendo la memoria del celular.
5. **Emisión de Protocolo Oficial A4 (Exactamente 2 Páginas):**
   - **Hoja 1:** Protocolo de Medición Técnico Oficial COPIME / Res. SRT 900/15 con firma digital y matrícula.
   - **Hoja 2:** Anexo Fotográfico en grilla balanceada de 2 columnas.
   - Botón directo `Imprimir / Guardar PDF`.
6. **Adaptación Visual (Skins):**
   - **Modo Sol (Alto Contraste):** Lectura clara bajo luz diurna intensa en terrazas y patios.
   - **Negro Puro (OLED / Noche):** Fondo negro absoluto para subsuelos oscuros y ahorro de batería.

---

## 📝 Lista de Verificación para el Técnico durante la Prueba

- [ ] **Velocidad de carga:** ¿Cuánto tiempo le tomó cargar una medición de punta a punta? (Objetivo: menos de 45 segundos).
- [ ] **Teclado numérico:** ¿Resultó cómodo el ingreso de valores con una sola mano?
- [ ] **Fotos en obra:** ¿La cámara abrió rápido y las fotos se encuadraron bien en el protocolo?
- [ ] **Visibilidad en exteriores:** ¿El Modo Sol facilitó la lectura bajo luz diurna?
- [ ] **Comportamiento sin red:** ¿Pudo registrar datos y revisar el historial en subsuelos sin cobertura?

---

## 🔄 Protocolo de Transición Final: Puesta a Punto para Producción

Una vez completado el periodo de prueba de campo:
1. **Vaciado de Pruebas:** Ejecución de script seguro de limpieza que purga las mediciones y fotografías de ensayo, preservando la configuración del profesional y las administraciones.
2. **Carga del Padrón Real:** Importación masiva desde la planilla Excel definitiva con las direcciones reales de los consorcios, CUITs y fechas de vencimiento.
3. **Pase a Producción:** Entrega de la versión oficial homologada para la operativa comercial.
