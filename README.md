# Sistema PAT — Plataforma de Gestión de Puesta a Tierra y Protocolos Oficiales (v1.7.0)

[![Expo](https://img.shields.io/badge/Expo-55.0-black?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.83-blue?logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend%20%26%20Postgres-emerald?logo=supabase)](https://supabase.com)
[![Normativa](https://img.shields.io/badge/Normativa-Res.%20SRT%20900%2F15%20%2F%20COPIME-red)](https://copime.org.ar)

Plataforma profesional multiplataforma (**iOS PWA, Android, Web Desktop/Mobile**) orientada a ingenieros, técnicos electricistas y administradores de consorcios para el registro de mediciones de puesta a tierra (PAT), gestión de vencimientos anuales obligatorios y emisión inmediata de protocolos oficiales en formato **PDF A4** homologados bajo **Res. SRT 900/15** y recomendaciones **COPIME / IRAM 2281**.

---

## 🚀 Características Principales

### 1. Motor de Protocolos Oficiales (Dual-Page PDF A4)
- **Hoja 1 (Protocolo de Medición):** Formato oficial conforme a la *"Recomendación COPIME H y ST Nº 2.0 – julio/2011"* y **Res. SRT 900/15**. Detalle de solicitante, domicilio, localización de jabalina, variable medida, instrumento utilizado, método Wenner IRAM 2281-1/3, condición de suelo, resultado destacado en $\Omega$, observaciones técnicas, datos del profesional matriculado y firma digital integrada.
- **Hoja 2 (Anexo Fotográfico de Campo):** Diseño en grilla balanceada de 2 columnas para Tablero Seccional y Toma de Tierra PAT, garantizando que el documento completo ocupe **exactamente 2 páginas A4**, sin desbordes de margen ni saltos de página huérfanos.
- **Visor In-App y Descarga Nativa:** Visor overlay A4 embebido dentro de la app con botón directo para impresión o guardado a PDF, compatible con Web, iOS Safari PWA standalone y Android.

### 2. Arquitectura Offline-First con Supabase Sync
- **Operación Continua sin Red:** Funciona 100% en subsuelos y salas de máquinas sin cobertura celular.
- **Persistencia Dual:**
  - **Móvil (iOS/Android):** Base de datos relacional local con `expo-sqlite` y almacenamiento clave-valor `kv_store_local`.
  - **Web / PWA:** Almacenamiento local estructurado (`localStorage` con compresión de imágenes en Canvas a JPEG 78% con límite dimensional a 1000px).
- **Sincronización Bidireccional:** Detección de conectividad en vivo con timeout de seguridad (4s) y sincronización automática contra Postgres en Supabase.
- **Auto-reparación de Vencimientos:** Algoritmo que recalcula y repara automáticamente la fecha de vencimiento anual en base al histórico real de mediciones.

### 3. Ficha Técnica y Trazabilidad por Consorcio
- Ficha individual por edificio (`/consorcio/[id]`) con datos del solicitante, administración asociada, CUIT, contacto, locación por defecto y teléfono.
- Historial cronológico de mediciones con semaforización de estado de vigencia:
  - 🟢 **Vigente:** Medición realizada en los últimos 365 días.
  - 🟡 **Por Vencer:** Próximo a vencer dentro de los 30 días.
  - 🔴 **Vencido:** Sin medición vigente hace más de 365 días (requiere inspección urgente).

### 4. Sistema Dinámico de Skins / Temas Visuales
Selector de apariencia en vivo con persistencia de preferencia:
- **Azul Profesional (Dark):** Fondo pizarra `#0b1120`, acentos azul eléctrico `#1F4FFF`.
- **Negro Puro (OLED / Noche profunda):** Contraste extremo `#000000` optimizado para ahorro de batería en pantallas OLED de campo.
- **Modo Sol (Alto Contraste Exterior):** Fondo blanco puro `#ffffff` y tipografía `#0f172a` con bordes reforzados para trabajo bajo luz solar directa.
- **Verde Campo (Industrial / Esmeralda):** Estilo técnico con acentos esmeralda `#059669`.

### 5. Asistente Masivo Excel (`.xlsx`)
- Importación masiva de edificios y administraciones en 3 pasos con validación interactiva.
- Normalización automática de direcciones, eliminación de acentos diacríticos y formateo de fechas multiformato (`YYYY-MM-DD`, `DD/MM/YYYY`, seriales numéricos de Excel).
- Detección inteligente de duplicados internos y externos en vivo.
- Exportación completa del parque de consorcios y mediciones a Excel.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Framework Móvil / Web** | [Expo SDK 55](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Core UI** | [React 19](https://react.dev) + [React Native 0.83](https://reactnative.dev) + [React Native Web](https://necolas.github.io/react-native-web/) |
| **Componentes e Iconografía** | [React Native Paper](https://callstack.github.io/react-native-paper/) + [Lucide React Native](https://lucide.dev) |
| **Base de Datos Remota** | [Supabase](https://supabase.com) (PostgreSQL 15 + RLS + PostgREST) |
| **Almacenamiento Local** | `expo-sqlite` (SQLite nativo en dispositivos móviles) + `localStorage` Web |
| **Generación de Reportes** | Motor HTML/CSS Paged Media A4 + `expo-print` + `expo-sharing` |
| **Procesamiento de Archivos** | `xlsx` (SheetJS) + Canvas HTML5 / `expo-image-manipulator` |

---

## 📦 Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org) (v18.x o superior)
- `npm` o `yarn`

### 1. Clonar el repositorio
```bash
git clone https://github.com/mauroleuzzi/Sistema-PAT.git
cd Sistema-PAT
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configuración de Base de Datos (Supabase)
Ejecutar el script [`database_schema.sql`](./database_schema.sql) en el **SQL Editor** de su proyecto Supabase para inicializar las tablas (`administraciones`, `consorcios`, `mediciones`, `profesional_config`, `auth_usuarios`), índices y políticas de seguridad (RLS).

### 4. Variables de Entorno (Opcional)
Crear un archivo `.env` en la raíz si se desean sobreescribir las credenciales por defecto:
```env
EXPO_PUBLIC_SUPABASE_URL=https://su-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=su-clave-publica-anon
```

### 5. Iniciar en Modo Desarrollo
```bash
# Servidor Expo para Web, iOS y Android
npx expo start

# Abrir directamente en navegador web
npx expo start --web
```

### 6. Compilación de Producción PWA
```bash
# Exportar el bundle web optimizado
npx expo export --platform web

# Iniciar el servidor local de prueba PWA
node serve_prod.mjs
```

---

## 📄 Estructura del Proyecto

```text
├── app/                      # Rutas basadas en archivos (Expo Router)
│   ├── (tabs)/               # Pestañas principales de navegación
│   │   ├── index.tsx         # Dashboard general y métricas
│   │   ├── consorcio/        # Listado, búsqueda y filtros de consorcios
│   │   ├── medicion/         # Registro histórico y protocolos
│   │   ├── calendario/       # Calendario de vencimientos anuales
│   │   └── admin/            # Configuración, skins y credenciales
│   ├── consorcio/[id].tsx    # Ficha Técnica detallada del consorcio
│   ├── medicion/nueva.tsx    # Formulario ágil de toma de medición en campo
│   ├── consorcio/importar.tsx# Asistente de importación masiva Excel
│   ├── login.tsx             # Inicio de sesión y control de acceso
│   └── _layout.tsx           # Layout raíz y temas globales
├── src/
│   ├── context/              # Estados globales (DemoContext, AuthContext, ThemeContext)
│   ├── db/                   # Capa de persistencia SQLite local
│   ├── hooks/                # Hooks personalizados (useSync, useNetwork)
│   ├── lib/                  # Clientes Supabase, utilidades y datos iniciales
│   ├── services/             # Motor unificado de PDF (pdfGenerator.ts)
│   └── types/                # Definiciones de TypeScript
├── database_schema.sql       # Esquema DDL y políticas de Supabase
└── serve_prod.mjs            # Servidor HTTP ligero para servir la PWA en LAN
```

---

## ⚖️ Licencia y Cumplimiento Normativo
Desarrollado para la emisión de informes conforme a los lineamientos del **Consejo Profesional de Ingeniería Mecánica y Electricista (COPIME)** y la **Resolución SRT Nº 900/15** de la Superintendencia de Riesgos del Trabajo de la República Argentina.
