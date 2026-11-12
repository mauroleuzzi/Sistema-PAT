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

## 📱 Cómo Instalar la App en el Celular del Técnico

Existen dos alternativas sencillas para tener la app funcionando en el dispositivo de campo:

### Método 1: Instalación Rápida como PWA (Recomendada • Sin descargas ni tiendas)
Convierte la aplicación web en una app con icono propio y ejecución a **pantalla completa** (sin barras del navegador), conservando el soporte offline y acceso a la cámara:

#### En Android (Google Chrome):
1. Abrí **Google Chrome** en el celular.
2. Ingresá al enlace oficial de la app:  
   👉 **`https://sistema-pat-olive.vercel.app`**
3. Chrome te mostrará un banner inferior que dice **"Instalar Sistema PAT"** (o tocá el menú de los **3 puntos ⋮** arriba a la derecha y elegí **"Instalar aplicación"** / *"Agregar a la pantalla de inicio"*).
4. Tocá **Instalar**.
5. Listo: se creará el icono de **Sistema PAT** en tu pantalla de inicio y en la lista de aplicaciones. Al abrirlo, se ejecuta como una app nativa a pantalla completa.

#### En iPhone (iOS Safari):
1. Abrí **Safari** e ingresá al enlace oficial:  
   👉 **`https://sistema-pat-olive.vercel.app`**
2. Tocá el botón de **Compartir** (icono de cuadrado con flecha hacia arriba en la barra inferior).
3. Deslizá hacia abajo y seleccioná **"Agregar a pantalla de inicio"** (Add to Home Screen).
4. Tocá **Agregar** arriba a la derecha. La app se abrirá en modo standalone independiente.

---

### Método 2: Instalación del Archivo `.apk` Nativo (Solo Android)
Para instalar el archivo compilado de Android de forma permanente:

1. **Descarga:** Abrí el enlace directo de descarga del archivo `Sistema-PAT.apk` (o descargalo desde el mensaje de WhatsApp / Google Drive donde se te envió).
2. **Abrir el Instalador:** Una vez descargado, tocá la notificación de descarga o buscalo en la app **Archivos / Descargas** de tu celular.
3. **Permisos de Origen Desconocido:** Si el teléfono te advierte *"Por seguridad, tu teléfono no tiene permitido instalar apps desconocidas de esta fuente"*:
   - Tocá **Ajustes / Configuración**.
   - Activá el interruptor **"Permitir desde esta fuente"** (o *"Permitir descargas de Chrome / WhatsApp"*).
   - Volvé hacia atrás.
4. **Instalación:** Tocá **Instalar**.
5. Al finalizar, seleccioná **Abrir**.

> **Nota sobre Actualizaciones en el Aire (Over-The-Air):**  
> Gracias a la tecnología de actualizaciones automáticas integrada, **no hace falta reinstalar otro APK ante cada mejora**. Cuando el técnico abra la app conectado a Wi-Fi o datos, las actualizaciones de pantallas, reportes y funciones se descargarán solas en segundo plano.

---

## 🧭 Flujo de Trabajo Operativo y Nuevas Funcionalidades

### 1. Planificación de la Ruta de Visitas (Filtro "Ruta del Mes")
En la pestaña **Consorcios**, el técnico y la oficina cuentan ahora con un filtro rápido:
- **Ruta del mes:** Agrupa automáticamente los consorcios cuyos vencimientos operan en el mes en curso o que ya se encuentran vencidos, optimizando el recorrido diario sin tener que buscar uno por uno.
- Chips adicionales: *Todos*, *Vencidos*, *Próximos*, *Al día* y *Sin medir*.

---

### 2. Toma de Medición en Campo y Comparativa en Vivo (Mejora 1)
Al ingresar a **Nueva Medición**:
- **Carga de Resistencia:** Ingreso rápido mediante el teclado táctil de dígitos gigantes.
- **Comparativa en vivo vs Año Anterior:** El sistema compara instantáneamente el valor ingresado con la medición previa registrada:
  - Si el valor aumentó más de un 50% o supera los 40 $\Omega$, se dispara una **Alerta de Variación Significativa** en pantalla advirtiendo al técnico revisar bornes flojos, sulfatación en morseto o resecamiento del terreno antes de retirarse del edificio.
  - Si el valor se mantiene dentro de rangos normales, confirma la estabilidad de la puesta a tierra con respecto al año anterior.

---

### 3. Múltiples Jabalinas / Puntos de Medición (Mejora 2)
Para edificios complejos con más de un electrodo o tomas separadas (ej. Tablero Principal, Ascensores, Sala de Bombas):
- El técnico puede pulsar **"+ Agregar Jabalina"** tantas veces como sea necesario.
- Cada punto permite definir etiqueta personalizada (ej: *Jabalina 2 - Ascensores*), valor en $\Omega$ y locación específica.
- En el Protocolo PDF final, se imprime una tabla técnica detallada con el desglose de cada jabalina relevada, manteniendo el reporte estrictamente dentro de las 2 páginas reglamentarias.

---

### 4. Evidencia Fotográfica Flexible (1 Foto Obligatoria + Opción Jabalina No Visible)
Atendiendo a la realidad de obra en CABA y Gran Buenos Aires:
- **Foto 1: Tablero Seccional (Obligatoria):** Siempre accesible en pasillo o subsuelo.
- **Foto 2: Toma de Tierra (Jabalina P.A.T.):**
  - Si la jabalina está accesible en cámara de inspección abierta, se toma la foto normalmente.
  - Si la jabalina se encuentra **bajo solado, piso terminado o en sector inaccesible**, el técnico simplemente activa el selector:  
    👉 **"Jabalina no visible / bajo solado (sin cámara)"**
  - Puede seleccionar un motivo técnico rápido (*"Bajo solado o contrapiso sin cámara accesible"*, *"Bajo baldosa / solado fijo"*, *"En sector inaccesible / unidad privada"*).
  - **En el PDF:** El sistema genera en la Hoja 2 un dictamen técnico oficial acreditando que el electrodo se encuentra embutido y que la continuidad y medición se efectuaron sobre la barra equipotencial del tablero, cumpliendo formalmente con la inspección sin exigir una foto inexistente.

---

### 5. Flujo en Dos Instancias (Campo vs Oficina / Borrador vs Emisión)
Para evitar que salgan a la calle protocolos no revisados o no facturados:
1. **Instancia 1 (Técnico en Campo):** Carga los datos y fotos en el celular y presiona **"Guardar Informe (Enviar a Revisión)"**. La medición ingresa en estado `borrador` / `pendiente_aprobacion`. Si se abre la vista previa del PDF en este estado, muestra una marca de agua diagonal preventiva:  
   `BORRADOR • REVISIÓN TÉCNICA - NO VÁLIDO COMO CERTIFICADO LEGAL`.
2. **Instancia 2 (Control en Oficina / PC):** El ingeniero o administrativo revisa el reporte desde la PC en la pestaña *Mediciones* (filtrando por *⏳ Pendientes*) y con un clic pulsa **"Aprobar y Emitir Protocolo"**. El estado pasa a `aprobado`, eliminando automáticamente la marca de agua y dejando el documento listo para su entrega final al administrador.

---

### 6. Salida Dual PDF: Con Encomienda COPIME vs Certificado Técnico
No todos los administradores solicitan el timbrado con arancel colegial. El sistema ahora ofrece dos salidas independientes tanto en la app como en la lista de mediciones:
- **Protocolo Oficial (Con Encomienda COPIME):** Encabezado reglamentario oficial COPIME, detalle del anexo 1 con Encomienda Profesional colegial y leyenda reglamentaria obligatoria.
- **Certificado Técnico (Sin Encomienda):** Encabezado de Relevamiento Técnico Periódico por profesional matriculado, apto para mantenimiento preventivo y control interno, sin arancel de timbrado colegial.

Ambos formatos respetan **estrictamente las 2 páginas exactas A4** (Página 1: Datos y Mediciones, Página 2: Anexo Fotográfico / Constatación Técnica).

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

