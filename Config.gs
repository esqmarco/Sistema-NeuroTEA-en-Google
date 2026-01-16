/**
 * ===========================
 * CONFIGURACION GLOBAL
 * ===========================
 */

/**
 * IMPORTANTE: Actualizar este ID con el ID de tu Google Spreadsheet
 * Para obtener el ID:
 * 1. Abre tu Google Spreadsheet
 * 2. Copia el ID de la URL: https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
 */
const CONFIG = {
  // ID del Spreadsheet (ACTUALIZAR CON TU ID)
  SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',

  // Zona horaria
  TIMEZONE: 'America/Asuncion',

  // Locale para formato de numeros
  LOCALE: 'es_PY',

  // Moneda
  CURRENCY_SYMBOL: 'Gs',

  // Porcentaje de aporte por defecto
  DEFAULT_CONTRIBUTION_PERCENTAGE: 30,

  // Maximo de terapeutas permitidos
  MAX_THERAPISTS: 20,

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
 * Estados posibles de rendicion
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
 * Tipos de aporte a NeuroTEA
 */
const TIPOS_APORTE = {
  PORCENTAJE_20: '20',
  PORCENTAJE_30: '30',
  PORCENTAJE_40: '40',
  PORCENTAJE_50: '50',
  FIJO: 'fixed'
};

/**
 * Tipos de egreso
 */
const TIPOS_EGRESO = {
  ADELANTO: 'adelanto',
  GASTO_NEUROTEA: 'gasto-neurotea'
};

/**
 * Opciones de pago para confirmacion
 */
const TIPOS_OPCION_PAGO = {
  EXACTO: 'exacto',
  VUELTO: 'vuelto',
  VUELTO_EFECTIVO: 'vuelto-efectivo',
  TRANSFERIR: 'transferir',
  DAR_TRANSFERIR: 'dar-transferir',
  DEVOLUCION_EFECTIVO: 'devolucion-efectivo',
  DEVOLUCION_TRANSFERENCIA: 'devolucion-transferencia'
};

/**
 * Obtiene el Spreadsheet configurado
 * @returns {Spreadsheet} - Objeto Spreadsheet
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (error) {
    throw new Error('No se pudo abrir el Spreadsheet. Verifica el ID en Config.gs');
  }
}

/**
 * Obtiene una hoja especifica del Spreadsheet
 * @param {string} sheetName - Nombre de la hoja
 * @returns {Sheet} - Objeto Sheet
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada. Ejecuta initializeSpreadsheet() primero.`);
  }

  return sheet;
}

/**
 * Genera un ID unico basado en timestamp
 * @returns {number} - ID unico
 */
function generateId() {
  return Date.now();
}

/**
 * Obtiene timestamp actual en ISO
 * @returns {string} - Timestamp ISO
 */
function getTimestamp() {
  return new Date().toISOString();
}
