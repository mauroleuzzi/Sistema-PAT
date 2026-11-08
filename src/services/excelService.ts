import * as XLSX from 'xlsx';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

export const COLUMNAS_PLANTILLA = [
  'direccion_obligatoria',
  'administracion_nombre_obligatorio',
  'consorcio_cuit_opcional',
  'solicitante_opcional',
  'telefono_opcional',
  'email_opcional',
  'barrio_localidad_opcional',
  'observaciones_opcional',
  'ultima_fecha_medicion_opcional',
  'estado_obligatorio',
  'administracion_cuit_opcional',
  'administracion_contacto_opcional',
  'administracion_telefono_opcional',
  'administracion_email_opcional',
  'administracion_domicilio_opcional',
  'administracion_observaciones_opcional'
];

/**
 * Permite seleccionar un archivo Excel y devuelve los datos parseados a un array de objetos.
 */
export const pickAndParseExcel = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'], // Se relaja en web para evitar que Windows falle al reconocer el mime-type
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    const file = result.assets[0];
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Solo se permiten archivos con extensión .xlsx');
    }
    let data: any;

    if (Platform.OS === 'web') {
      // In web, the file object itself is available if supported, or we fetch the URI
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      // In native, read as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      data = base64;
    }

    const workbook = XLSX.read(data, { type: Platform.OS === 'web' ? 'array' : 'base64' });
    
    if (workbook.SheetNames.length > 1) {
      throw new Error('El archivo Excel no puede tener más de una hoja.');
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON (using header: 1 to get raw array of arrays to check headers)
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rawData.length === 0) {
      throw new Error('El archivo está vacío.');
    }

    const headers = rawData[0] || [];
    
    // Check missing expected columns
    const missingColumns = COLUMNAS_PLANTILLA.filter(col => !headers.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Faltan columnas obligatorias en el archivo: ${missingColumns.join(', ')}`);
    }

    // Convert to regular JSON with headers
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    return { data: json, fileName: file.name || 'import_excel.xlsx' };
  } catch (error: any) {
    throw new Error(error.message || 'No se pudo leer el archivo Excel.');
  }
};

/**
 * Genera la plantilla base con los headers correctos y fuerza su descarga o compartición.
 */
export const downloadTemplate = async () => {
  const ws = XLSX.utils.aoa_to_sheet([COLUMNAS_PLANTILLA]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  
  const wbout = XLSX.write(wb, {
    type: 'base64',
    bookType: 'xlsx'
  });

  const fileName = 'plantilla_consorcios.xlsx';
  
  if (Platform.OS === 'web') {
    // For web, create a link and trigger download
    const byteCharacters = atob(wbout);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    // Native
    const uri = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  }
};

/**
 * Exporta datos a Excel
 */
export const exportToExcel = async (data: any[], fileName: string = 'export.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  
  const wbout = XLSX.write(wb, {
    type: 'base64',
    bookType: 'xlsx'
  });

  if (Platform.OS === 'web') {
    const byteCharacters = atob(wbout);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } else {
    const uri = FileSystem.cacheDirectory + fileName;
    await FileSystem.writeAsStringAsync(uri, wbout, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  }
};
