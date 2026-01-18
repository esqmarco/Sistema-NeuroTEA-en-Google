/**
 * ===========================
 * SISTEMA NEUROTEA - GOOGLE APPS SCRIPT
 * Punto de entrada principal
 * ===========================
 */

/**
 * Punto de entrada para la Web App
 * Verifica autorizacion antes de mostrar el sistema
 * @param {Object} e - Evento de solicitud
 * @returns {HtmlOutput} - Pagina HTML
 */
function doGet(e) {
  // Verificar si el usuario esta autorizado
  const userEmail = Session.getActiveUser().getEmail();

  if (!isUserAuthorized(userEmail)) {
    // Mostrar pagina de acceso denegado
    const template = HtmlService.createTemplateFromFile('AccesoDenegado');
    template.userEmail = userEmail || 'No identificado';

    return template.evaluate()
      .setTitle('Acceso Denegado - Sistema NeuroTEA')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }

  // Usuario autorizado - mostrar sistema
  const template = HtmlService.createTemplateFromFile('Index');

  return template.evaluate()
    .setTitle('Sistema NeuroTEA - Gestion de Sesiones')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/apps_script_48dp.png');
}

/**
 * Verifica si un correo esta en la lista de autorizados
 * @param {string} email - Correo a verificar
 * @returns {boolean} - True si esta autorizado
 */
function isUserAuthorized(email) {
  if (!email) return false;

  try {
    const sheet = getSheet('Autorizaciones');
    const data = sheet.getDataRange().getValues();

    // Buscar el correo en la columna A (ignorando encabezado)
    for (let i = 1; i < data.length; i++) {
      const authorizedEmail = data[i][0];
      if (authorizedEmail && authorizedEmail.toString().toLowerCase().trim() === email.toLowerCase().trim()) {
        return true;
      }
    }

    return false;
  } catch (error) {
    Logger.log('Error verificando autorizacion: ' + error.message);
    // Si hay error (ej: hoja no existe), denegar acceso por seguridad
    return false;
  }
}

/**
 * Obtiene el correo del usuario actual
 * @returns {string} - Correo del usuario
 */
function getCurrentUserEmail() {
  return Session.getActiveUser().getEmail();
}

/**
 * Incluye archivos HTML parciales (CSS, JS, componentes)
 * @param {string} filename - Nombre del archivo a incluir
 * @returns {string} - Contenido del archivo
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Inicializa el Spreadsheet con todas las hojas necesarias
 * Ejecutar UNA VEZ al configurar el sistema
 */
function initializeSpreadsheet() {
  const ss = getSpreadsheet();

  // Definir estructura de hojas
  const sheets = [
    {
      name: 'Terapeutas',
      headers: ['id', 'nombre', 'activo', 'creadoEn', 'actualizadoEn']
    },
    {
      name: 'Sesiones',
      headers: ['id', 'fecha', 'terapeuta', 'paciente', 'efectivo', 'transferenciaNeurotea', 'transferenciaTerminapeuta', 'valorSesion', 'aporteNeurotea', 'honorarios', 'tipoAporte', 'usaCredito', 'paqueteId', 'creditosRestantes', 'creadoEn']
    },
    {
      name: 'SesionesGrupales',
      headers: ['id', 'fecha', 'grupoId', 'grupoNombre', 'asistenciaJSON', 'terapeutasJSON', 'cantidadTerapeutas', 'cantidadPresentes', 'valorTotal', 'porcentajeAporte', 'aporteNeurotea', 'honorariosTotales', 'honorariosPorTerapeuta', 'residuoHonorarios', 'efectivo', 'transferenciaNeurotea', 'creadoEn']
    },
    {
      name: 'Egresos',
      headers: ['id', 'fecha', 'tipo', 'concepto', 'monto', 'terapeuta', 'creadoEn']
    },
    {
      name: 'Confirmaciones',
      headers: ['id', 'fecha', 'terapeuta', 'tipo', 'tipoOpcion', 'flujoJSON', 'estadoCongeladoJSON', 'timestamp']
    },
    {
      name: 'Paquetes',
      headers: ['id', 'fechaCompra', 'paciente', 'terapeuta', 'sesionesTotal', 'sesionesRestantes', 'valorTotal', 'efectivo', 'transferenciaNeurotea', 'transferenciaTerminapeuta', 'aporteNeurotea', 'tipoAporte', 'activo', 'creadoEn']
    },
    {
      name: 'HistorialPaquetes',
      headers: ['id', 'fechaCompra', 'fechaCompletado', 'paciente', 'terapeuta', 'sesionesTotal', 'valorTotal', 'efectivo', 'transferenciaNeurotea', 'aporteNeurotea']
    },
    {
      name: 'Grupos',
      headers: ['id', 'nombre', 'porcentajeAporte', 'ninosJSON', 'valorMaximoTotal', 'estado', 'creadoEn', 'actualizadoEn']
    },
    {
      name: 'Creditos',
      headers: ['id', 'paciente', 'terapeuta', 'paqueteId', 'total', 'restante', 'fechaCompra', 'creadoEn']
    },
    {
      name: 'SaldosIniciales',
      headers: ['fecha', 'efectivo', 'actualizadoEn']
    },
    {
      name: 'HistorialSaldos',
      headers: ['id', 'fecha', 'mensaje', 'timestamp']
    },
    {
      name: 'EstadosTransferencia',
      headers: ['id', 'confirmado', 'timestamp']
    },
    {
      name: 'Configuracion',
      headers: ['clave', 'valor', 'descripcion', 'actualizadoEn']
    },
    {
      name: 'Autorizaciones',
      headers: ['correo', 'nombre', 'fechaAgregado']
    }
  ];

  // Crear cada hoja si no existe
  sheets.forEach(sheetConfig => {
    let sheet = ss.getSheetByName(sheetConfig.name);

    if (!sheet) {
      sheet = ss.insertSheet(sheetConfig.name);
      Logger.log(`Hoja creada: ${sheetConfig.name}`);
    }

    // Configurar encabezados
    const headerRange = sheet.getRange(1, 1, 1, sheetConfig.headers.length);
    headerRange.setValues([sheetConfig.headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4A90E2');
    headerRange.setFontColor('#FFFFFF');

    // Congelar primera fila
    sheet.setFrozenRows(1);
  });

  // Eliminar hoja por defecto si existe
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // Insertar configuracion inicial
  insertInitialConfig();

  Logger.log('Spreadsheet inicializado correctamente');
  return { success: true, message: 'Spreadsheet inicializado correctamente' };
}

/**
 * Inserta configuracion inicial en la hoja Configuracion
 */
function insertInitialConfig() {
  const sheet = getSheet('Configuracion');
  const existingData = sheet.getDataRange().getValues();

  // Si solo tiene encabezados, insertar configuracion inicial
  if (existingData.length <= 1) {
    const config = [
      ['porcentajeAporteDefault', '30', 'Porcentaje de aporte NeuroTEA por defecto', new Date().toISOString()],
      ['zonaHoraria', 'America/Asuncion', 'Zona horaria del sistema', new Date().toISOString()],
      ['moneda', 'Gs', 'Simbolo de moneda', new Date().toISOString()],
      ['versionSistema', '1.0.0', 'Version del sistema', new Date().toISOString()]
    ];

    sheet.getRange(2, 1, config.length, config[0].length).setValues(config);
  }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (Paraguay)
 * @returns {string} - Fecha formateada
 */
function getFechaActual() {
  const now = new Date();
  const paraguayOffset = -4 * 60; // UTC-4 en minutos
  const localOffset = now.getTimezoneOffset();
  const paraguayTime = new Date(now.getTime() + (localOffset - paraguayOffset) * 60000);

  const year = paraguayTime.getFullYear();
  const month = String(paraguayTime.getMonth() + 1).padStart(2, '0');
  const day = String(paraguayTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Carga todos los datos iniciales para el frontend
 * @returns {Object} - Datos iniciales del sistema
 */
function cargarDatosIniciales() {
  try {
    const fecha = getFechaActual();

    return {
      success: true,
      data: {
        fechaActual: fecha,
        terapeutas: TherapistService.getAll(),
        sesiones: SessionService.getByDate(fecha),
        sesionesGrupales: GroupSessionService.getByDate(fecha),
        egresos: EgresoService.getByDate(fecha),
        paquetes: PackageService.getActive(),
        grupos: GroupService.getActive(),
        confirmaciones: RendicionService.getConfirmaciones(fecha),
        saldoInicial: RendicionService.getSaldoInicial(fecha),
        estadosTransferencia: TransferService.getEstados(fecha),
        config: getConfiguracion()
      }
    };
  } catch (error) {
    Logger.log('Error cargando datos iniciales: ' + error.message);
    return {
      success: false,
      message: 'Error cargando datos: ' + error.message
    };
  }
}

/**
 * Carga datos de una fecha especifica
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object} - Datos de la fecha
 */
function cargarDatosFecha(fecha) {
  try {
    return {
      success: true,
      data: {
        fecha: fecha,
        sesiones: SessionService.getByDate(fecha),
        sesionesGrupales: GroupSessionService.getByDate(fecha),
        egresos: EgresoService.getByDate(fecha),
        confirmaciones: RendicionService.getConfirmaciones(fecha),
        saldoInicial: RendicionService.getSaldoInicial(fecha),
        estadosTransferencia: TransferService.getEstados(fecha)
      }
    };
  } catch (error) {
    Logger.log('Error cargando datos de fecha: ' + error.message);
    return {
      success: false,
      message: 'Error: ' + error.message
    };
  }
}

/**
 * Obtiene la configuracion del sistema
 * @returns {Object} - Configuracion
 */
function getConfiguracion() {
  const sheet = getSheet('Configuracion');
  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }

  return config;
}

/**
 * Funcion de prueba para verificar conexion
 */
function testConnection() {
  return {
    success: true,
    message: 'Conexion exitosa',
    timestamp: new Date().toISOString(),
    spreadsheetId: CONFIG.SPREADSHEET_ID
  };
}
