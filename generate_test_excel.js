const XLSX = require('xlsx');
const fs = require('fs');
const os = require('os');
const path = require('path');

const desktopPath = path.join(os.homedir(), 'Desktop');

// 1. Archivo base con todos los casos lógicos
const testData = [
  {
    direccion_obligatoria: "Av. Cabildo 1234",
    administracion_nombre_obligatorio: "Administración Cabildo",
    consorcio_cuit_opcional: "30-12345678-9",
    solicitante_opcional: "Juan Perez",
    telefono_opcional: "11-4444-5555",
    email_opcional: "consorcio@cabildo1234.com",
    estado_obligatorio: "activo",
    ultima_fecha_medicion_opcional: "2023-01-15"
  },
  {
    direccion_obligatoria: "",
    administracion_nombre_obligatorio: "Admin Falsa",
    estado_obligatorio: "activo"
  },
  {
    direccion_obligatoria: "Calle Falsa 123",
    administracion_nombre_obligatorio: "Admin Falsa",
    estado_obligatorio: "activo",
    ultima_fecha_medicion_opcional: "25/25/2025"
  },
  {
    direccion_obligatoria: "av cabildo 1234",
    administracion_nombre_obligatorio: "Otra Administración",
    estado_obligatorio: "activo"
  },
  {
    direccion_obligatoria: "Avenida Siempreviva 742",
    administracion_nombre_obligatorio: "Admin Simpson",
    estado_obligatorio: "activo"
  },
  {
    direccion_obligatoria: "Monroe 5555",
    administracion_nombre_obligatorio: "Administración Cabildo",
    estado_obligatorio: "pendiente_datos"
  },
  {
    direccion_obligatoria: "Calle con Email Malo 1",
    administracion_nombre_obligatorio: "Admin Test",
    email_opcional: "consorcio_sin_arroba.com", // Inválido
    estado_obligatorio: "activo"
  },
  {
    direccion_obligatoria: "Calle con Admin Email Malo 2",
    administracion_nombre_obligatorio: "Admin Correo Roto",
    administracion_email_opcional: "admin@dominio", // Inválido (falta .com)
    estado_obligatorio: "activo"
  }
];

const COLUMNAS_PLANTILLA = [
  'direccion_obligatoria', 'administracion_nombre_obligatorio', 'consorcio_cuit_opcional', 'solicitante_opcional', 'telefono_opcional', 'email_opcional', 'barrio_localidad_opcional', 'observaciones_opcional', 'ultima_fecha_medicion_opcional', 'estado_obligatorio', 'administracion_cuit_opcional', 'administracion_contacto_opcional', 'administracion_telefono_opcional', 'administracion_email_opcional', 'administracion_domicilio_opcional', 'administracion_observaciones_opcional'
];

const ws1 = XLSX.utils.json_to_sheet(testData, { header: COLUMNAS_PLANTILLA });
const wb1 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb1, ws1, "Consorcios");
const path1 = path.join(desktopPath, 'test_consorcios.xlsx');
XLSX.writeFile(wb1, path1);
console.log(`✅ Archivo base generado: ${path1}`);

// 2. Archivo con dos hojas (Para probar rechazo)
const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, ws1, "Hoja 1");
XLSX.utils.book_append_sheet(wb2, ws1, "Hoja 2");
const path2 = path.join(desktopPath, 'test_consorcios_2_hojas.xlsx');
XLSX.writeFile(wb2, path2);
console.log(`✅ Archivo 2 hojas generado: ${path2}`);

// 3. Archivo con columnas mal escritas
const testDataBadCols = [
  {
    columna_inventada: "Av. Cabildo 1234",
    administracion_nombre_obligatorio: "Administración Cabildo",
  }
];
const ws3 = XLSX.utils.json_to_sheet(testDataBadCols);
const wb3 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb3, ws3, "Consorcios");
const path3 = path.join(desktopPath, 'test_consorcios_columnas_mal.xlsx');
XLSX.writeFile(wb3, path3);
console.log(`✅ Archivo con columnas rotas generado: ${path3}`);
