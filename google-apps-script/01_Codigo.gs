/**
 * ===========================
 * SISTEMA NEUROTEA - GOOGLE APPS SCRIPT
 * Punto de entrada principal
 * ===========================
 *
 * INSTRUCCIONES:
 * 1. Este es el primer archivo que debes crear en GAS
 * 2. En GAS ya existe "Codigo.gs" por defecto, pega este contenido ahi
 */

/**
 * Punto de entrada para la Web App
 * @param {Object} e - Evento de solicitud
 * @returns {HtmlOutput} - Pagina HTML
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Sistema NeuroTEA')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Incluye archivos HTML parciales
 * @param {string} filename - Nombre del archivo sin extension
 * @returns {string} - Contenido HTML
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (Paraguay)
 * @returns {string} - Fecha actual
 */
function getFechaActual() {
  const now = new Date();
  const offset = -4 * 60; // Paraguay UTC-4
  const local = new Date(now.getTime() + (offset - now.getTimezoneOffset()) * 60000);
  return local.toISOString().split('T')[0];
}

/**
 * Retorna resultado estandarizado
 * @param {boolean} success - Exito o fallo
 * @param {*} data - Datos a retornar
 * @param {string} message - Mensaje
 * @returns {Object} - Resultado
 */
function resultado(success, data, message) {
  return {
    success: success,
    data: data,
    message: message || ''
  };
}

// ===========================
// FUNCIONES DE INICIALIZACION
// ===========================

/**
 * Inicializa el Spreadsheet con todas las hojas necesarias
 * EJECUTAR ESTA FUNCION UNA VEZ AL INICIO
 */
function initializeSpreadsheet() {
  const ss = getSpreadsheet();

  // Definir estructura de cada hoja
  const sheetsConfig = {
    'Terapeutas': ['id', 'nombre', 'activo', 'creadoEn'],
    'Sesiones': ['id', 'fecha', 'terapeuta', 'paciente', 'valorSesion', 'efectivo', 'transferenciaNeurotea', 'transferenciaTerminapeuta', 'aporteNeurotea', 'honorarios', 'tipoAporte', 'usaCredito', 'paqueteId', 'creadoEn'],
    'SesionesGrupales': ['id', 'fecha', 'grupoId', 'grupoNombre', 'asistenciaJSON', 'terapeutasJSON', 'cantidadTerapeutas', 'cantidadPresentes', 'valorTotal', 'porcentajeAporte', 'aporteNeurotea', 'honorariosTotales', 'honorariosPorTerapeuta', 'residuoHonorarios', 'efectivo', 'transferenciaNeurotea', 'creadoEn'],
    'Egresos': ['id', 'fecha', 'tipo', 'terapeuta', 'concepto', 'monto', 'creadoEn'],
    'Confirmaciones': ['id', 'fecha', 'terapeuta', 'tipo', 'tipoOpcion', 'flujoJSON', 'estadoCongeladoJSON', 'timestamp'],
    'Paquetes': ['id', 'fecha', 'terapeuta', 'paciente', 'sesionesTotal', 'sesionesRestantes', 'valorTotal', 'valorPorSesion', 'efectivo', 'transferenciaNeurotea', 'transferenciaTerminapeuta', 'aporteNeurotea', 'honorarios', 'tipoAporte', 'estado', 'creadoEn'],
    'HistorialPaquetes': ['id', 'fechaCompra', 'fechaCompletado', 'terapeuta', 'paciente', 'sesionesTotal', 'valorTotal', 'aporteNeurotea', 'honorarios'],
    'Grupos': ['id', 'nombre', 'porcentajeAporte', 'ninosJSON', 'estado', 'creadoEn'],
    'Creditos': ['id', 'paciente', 'terapeuta', 'paqueteId', 'total', 'restante', 'valorPorSesion', 'fechaCompra', 'estado'],
    'SaldosIniciales': ['fecha', 'efectivo', 'actualizadoEn'],
    'HistorialSaldos': ['id', 'fecha', 'mensaje', 'timestamp'],
    'EstadosTransferencia': ['id', 'confirmado', 'timestamp'],
    'Configuracion': ['clave', 'valor']
  };

  // Crear cada hoja si no existe
  Object.keys(sheetsConfig).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('Hoja creada: ' + sheetName);
    }

    // Verificar si tiene encabezados
    const firstRow = sheet.getRange(1, 1, 1, sheetsConfig[sheetName].length).getValues()[0];
    const hasHeaders = firstRow[0] !== '';

    if (!hasHeaders) {
      // Agregar encabezados
      sheet.getRange(1, 1, 1, sheetsConfig[sheetName].length).setValues([sheetsConfig[sheetName]]);
      sheet.getRange(1, 1, 1, sheetsConfig[sheetName].length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      Logger.log('Encabezados agregados a: ' + sheetName);
    }
  });

  // Eliminar hoja por defecto si existe
  const defaultSheet = ss.getSheetByName('Hoja 1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('Inicializacion completada!');
  return 'Spreadsheet inicializado correctamente con ' + Object.keys(sheetsConfig).length + ' hojas.';
}

// ===========================
// FUNCIONES PARA CARGAR DATOS
// ===========================

/**
 * Carga todos los datos iniciales para el frontend
 * @returns {Object} - Datos iniciales
 */
function cargarDatosIniciales() {
  try {
    const fecha = getFechaActual();

    return resultado(true, {
      fechaActual: fecha,
      terapeutas: TherapistService.getAll(),
      sesiones: SessionService.getByDate(fecha),
      sesionesGrupales: GroupSessionService.getByDate(fecha),
      egresos: EgresoService.getByDate(fecha),
      paquetes: PackageService.getActivos(),
      grupos: GroupService.getActivos(),
      confirmaciones: RendicionService.getConfirmaciones(fecha),
      estadosTransferencia: TransferService.getByDate(fecha),
      saldoInicial: RendicionService.getSaldoInicial(fecha),
      config: {
        version: CONFIG.VERSION,
        timezone: CONFIG.TIMEZONE
      }
    });
  } catch (error) {
    Logger.log('Error en cargarDatosIniciales: ' + error.message);
    return resultado(false, null, error.message);
  }
}

/**
 * Carga datos de una fecha especifica
 * @param {string} fecha - Fecha YYYY-MM-DD
 * @returns {Object} - Datos de la fecha
 */
function cargarDatosFecha(fecha) {
  try {
    return resultado(true, {
      sesiones: SessionService.getByDate(fecha),
      sesionesGrupales: GroupSessionService.getByDate(fecha),
      egresos: EgresoService.getByDate(fecha),
      confirmaciones: RendicionService.getConfirmaciones(fecha),
      estadosTransferencia: TransferService.getByDate(fecha),
      saldoInicial: RendicionService.getSaldoInicial(fecha)
    });
  } catch (error) {
    return resultado(false, null, error.message);
  }
}

/**
 * Obtiene estadisticas del sistema
 * @returns {Object} - Estadisticas
 */
function getEstadisticasSistema() {
  try {
    return {
      totalTerapeutas: TherapistService.getAll().length,
      totalSesiones: Database.count(SHEETS.SESIONES),
      totalPaquetesActivos: PackageService.getActivos().length,
      totalGruposActivos: GroupService.getActivos().length
    };
  } catch (error) {
    return { totalTerapeutas: 0, totalSesiones: 0, totalPaquetesActivos: 0, totalGruposActivos: 0 };
  }
}

/**
 * Verifica creditos de un paciente
 * @param {string} paciente - Nombre del paciente
 * @param {string} terapeuta - Nombre del terapeuta
 * @returns {Object} - Info de creditos
 */
function verificarCreditos(paciente, terapeuta) {
  const creditos = PackageService.getCreditosDisponibles(paciente, terapeuta);
  return {
    hasCredits: creditos.length > 0,
    totalRemaining: creditos.reduce((sum, c) => sum + c.restante, 0),
    creditos: creditos
  };
}

/**
 * Obtiene paquetes activos
 * @returns {Array} - Paquetes activos
 */
function getPaquetesActivos() {
  return PackageService.getActivos();
}

/**
 * Obtiene grupos activos
 * @returns {Array} - Grupos activos
 */
function getGruposActivos() {
  return GroupService.getActivos();
}

/**
 * Obtiene transferencias pendientes
 * @param {string} fecha - Fecha
 * @returns {Array} - Transferencias
 */
function getTransferenciasPendientes(fecha) {
  return TransferService.getPendientes(fecha);
}

/**
 * Toggle estado de transferencia
 * @param {string} transferId - ID de transferencia
 * @returns {Object} - Resultado
 */
function toggleTransferencia(transferId) {
  return TransferService.toggle(transferId);
}
