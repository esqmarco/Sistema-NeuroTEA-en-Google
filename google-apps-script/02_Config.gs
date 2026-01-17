/**
 * ===========================
 * CONFIGURACION GLOBAL
 * ===========================
 *
 * INSTRUCCIONES:
 * 1. Click en + junto a "Archivos"
 * 2. Selecciona "Script"
 * 3. Nombra el archivo "Config" (sin .gs)
 * 4. Pega este contenido
 */

const CONFIG = {
  // ID del Spreadsheet - YA CONFIGURADO CON TU HOJA
  SPREADSHEET_ID: '1YcpVqvFWXRL1SDIONaWZMwCfMIghb-P-c7qJcFijook',

  // Zona horaria Paraguay
  TIMEZONE: 'America/Asuncion',

  // Locale para formato de numeros
  LOCALE: 'es_PY',

  // Moneda
  CURRENCY_SYMBOL: 'Gs',

  // Porcentaje de aporte por defecto
  DEFAULT_CONTRIBUTION_PERCENTAGE: 30,

  // Version del sistema
  VERSION: '1.0.0'
};

/**
 * Nombres de las hojas en el Spreadsheet
 */
const SHEETS = {
  TERAPEUTAS: 'Terapeutas',
  SESIONES: 'Sesiones',
  SESIONES_GRUPALES: 'SesionesGrupales',
  EGRESOS: 'Egresos',
  CONFIRMACIONES: 'Confirmaciones',
  PAQUETES: 'Paquetes',
  HISTORIAL_PAQUETES: 'HistorialPaquetes',
  GRUPOS: 'Grupos',
  CREDITOS: 'Creditos',
  SALDOS_INICIALES: 'SaldosIniciales',
  HISTORIAL_SALDOS: 'HistorialSaldos',
  ESTADOS_TRANSFERENCIA: 'EstadosTransferencia',
  CONFIGURACION: 'Configuracion'
};

/**
 * Estados de rendicion
 */
const ESTADOS_RENDICION = {
  SALDADO: 'SALDADO',
  DAR_EFECTIVO: 'DAR EFECTIVO',
  DAR_Y_TRANSFERIR: 'DAR Y TRANSFERIR',
  TRANSFERIR: 'TRANSFERIR',
  TERAPEUTA_DEBE_DAR: 'LA TERAPEUTA DEBE DAR',
  FONDOS_INSUFICIENTES: 'FONDOS INSUFICIENTES'
};

/**
 * Obtiene el Spreadsheet configurado
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (error) {
    throw new Error('No se pudo abrir el Spreadsheet. Verifica el ID en Config.gs');
  }
}

/**
 * Obtiene una hoja especifica
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Hoja "' + sheetName + '" no encontrada. Ejecuta initializeSpreadsheet() primero.');
  }
  return sheet;
}

/**
 * Genera ID unico
 */
function generateId() {
  return Date.now();
}

/**
 * Obtiene timestamp actual
 */
function getTimestamp() {
  return new Date().toISOString();
}
