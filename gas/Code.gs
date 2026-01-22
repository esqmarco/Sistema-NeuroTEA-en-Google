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
 * REINICIALIZA el sistema - BORRA TODOS LOS DATOS y recrea las hojas
 * CUIDADO: Esta funcion elimina todos los datos!
 * @returns {Object} - Resultado de la operacion
 */
function reinicializarSistema() {
  const ss = getSpreadsheet();

  // Lista de hojas a reinicializar (todas excepto Autorizaciones)
  const sheetsToClear = [
    'Terapeutas', 'Sesiones', 'SesionesGrupales', 'Egresos',
    'Confirmaciones', 'Paquetes', 'HistorialPaquetes', 'Grupos',
    'Creditos', 'SaldosIniciales', 'HistorialSaldos',
    'EstadosTransferencia', 'Configuracion'
  ];

  let cleared = 0;

  sheetsToClear.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      // Mantener encabezados (fila 1), borrar todo lo demas
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      cleared++;
      Logger.log('Limpiada hoja: ' + sheetName);
    }
  });

  // Reinsertar configuracion inicial
  insertInitialConfig();

  Logger.log('Sistema reinicializado. Hojas limpiadas: ' + cleared);
  return {
    success: true,
    message: 'Sistema reinicializado. Se limpiaron ' + cleared + ' hojas. Los datos de Autorizaciones se mantienen.'
  };
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
  const fecha = getFechaActual();
  const data = {
    fechaActual: fecha,
    terapeutas: [],
    sesiones: [],
    sesionesGrupales: [],
    egresos: [],
    paquetes: [],
    grupos: [],
    confirmaciones: {},
    saldoInicial: 0,
    estadosTransferencia: {},
    config: {}
  };
  const errors = [];

  // Cargar cada servicio individualmente para identificar errores
  try { data.terapeutas = TherapistService.getAll(); }
  catch (e) { errors.push('Terapeutas: ' + e.message); }

  try { data.sesiones = SessionService.getByDate(fecha); }
  catch (e) { errors.push('Sesiones: ' + e.message); }

  try { data.sesionesGrupales = GroupSessionService.getByDate(fecha); }
  catch (e) { errors.push('SesionesGrupales: ' + e.message); }

  try { data.egresos = EgresoService.getByDate(fecha); }
  catch (e) { errors.push('Egresos: ' + e.message); }

  try { data.paquetes = PackageService.getActive(); }
  catch (e) { errors.push('Paquetes: ' + e.message); }

  try { data.grupos = GroupService.getActive(); }
  catch (e) { errors.push('Grupos: ' + e.message); }

  try { data.confirmaciones = RendicionService.getConfirmaciones(fecha); }
  catch (e) { errors.push('Confirmaciones: ' + e.message); }

  try { data.saldoInicial = RendicionService.getSaldoInicial(fecha); }
  catch (e) { errors.push('SaldoInicial: ' + e.message); }

  try { data.estadosTransferencia = TransferService.getEstados(fecha); }
  catch (e) { errors.push('EstadosTransferencia: ' + e.message); }

  try { data.config = getConfiguracion(); }
  catch (e) { errors.push('Config: ' + e.message); }

  if (errors.length > 0) {
    Logger.log('Errores cargando datos: ' + errors.join('; '));
  }

  return {
    success: true,
    data: data,
    errors: errors.length > 0 ? errors : null
  };
}

/**
 * Carga datos de una fecha especifica
 * También incluye terapeutas y grupos para mantener sincronización
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
        paquetesFecha: PackageService.getByDate(fecha),
        confirmaciones: RendicionService.getConfirmaciones(fecha),
        saldoInicial: RendicionService.getSaldoInicial(fecha),
        estadosTransferencia: TransferService.getEstados(fecha),
        // Incluir terapeutas y grupos para mantener sincronización entre pestañas
        terapeutas: TherapistService.getAll(),
        grupos: GroupService.getActive()
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

/**
 * Limpia todos los registros de un dia especifico
 * Elimina: sesiones, sesiones grupales, egresos, paquetes, confirmaciones, estados de transferencia
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object} - Resultado con contadores de eliminados
 */
function limpiarDiaCompleto(fecha) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    const contadores = {
      sesiones: 0,
      sesionesGrupales: 0,
      egresos: 0,
      paquetes: 0,
      creditos: 0,
      confirmaciones: 0,
      estadosTransferencia: 0,
      historialPaquetes: 0
    };

    Logger.log('Iniciando limpieza del dia: ' + fecha);

    // 1. Eliminar sesiones individuales
    const sesiones = SessionService.getByDate(fecha);
    sesiones.forEach(s => {
      // Revertir creditos si aplica
      if (s.usaCredito && s.paqueteId) {
        PackageService.revertCredit(s.paqueteId, s.terapeuta, s.paciente);
      }
      Database.delete(SHEETS.SESIONES, s.id);
      contadores.sesiones++;
    });

    // 2. Eliminar sesiones grupales
    const sesionesGrupales = GroupSessionService.getByDate(fecha);
    sesionesGrupales.forEach(gs => {
      Database.delete(SHEETS.SESIONES_GRUPALES, gs.id);
      contadores.sesionesGrupales++;
    });

    // 3. Eliminar egresos
    const egresos = EgresoService.getByDate(fecha);
    egresos.forEach(e => {
      Database.delete(SHEETS.EGRESOS, e.id);
      contadores.egresos++;
    });

    // 4. Eliminar paquetes comprados en esa fecha y sus creditos
    const paquetes = PackageService.getByDate(fecha);
    paquetes.forEach(p => {
      // Eliminar creditos asociados
      Database.deleteByColumn(SHEETS.CREDITOS, 'paqueteId', p.id);
      contadores.creditos++;
      // Eliminar paquete
      Database.delete(SHEETS.PAQUETES, p.id);
      contadores.paquetes++;
    });

    // 5. Eliminar paquetes del historial que fueron COMPRADOS ese dia
    const historial = Database.getAll(SHEETS.HISTORIAL_PAQUETES);
    historial.forEach(h => {
      if (h.fechaCompra === fecha) {
        Database.delete(SHEETS.HISTORIAL_PAQUETES, h.id);
        contadores.historialPaquetes++;
      }
    });

    // 6. Eliminar confirmaciones del dia
    const confirmaciones = RendicionService.getConfirmaciones(fecha);
    confirmaciones.forEach(c => {
      Database.delete(SHEETS.CONFIRMACIONES, c.id);
      contadores.confirmaciones++;
    });

    // 7. Eliminar estados de transferencia del dia
    const estados = Database.getAll(SHEETS.ESTADOS_TRANSFERENCIA);
    estados.forEach(e => {
      // Verificar si el timestamp corresponde a la fecha
      if (e.timestamp && e.timestamp.split('T')[0] === fecha) {
        Database.delete(SHEETS.ESTADOS_TRANSFERENCIA, e.id);
        contadores.estadosTransferencia++;
      }
    });

    lock.releaseLock();

    Logger.log('Limpieza completada: ' + JSON.stringify(contadores));

    return resultado(true, contadores, 'Dia limpiado exitosamente');
  } catch (error) {
    Logger.log('Error en limpiarDiaCompleto: ' + error.message);
    return resultado(false, null, 'Error al limpiar dia: ' + error.message);
  }
}

/**
 * FUNCION DE DIAGNOSTICO - Ejecutar desde el editor de Apps Script
 * Muestra exactamente que datos se estan cargando
 */
function diagnosticoSistema() {
  const fecha = getFechaActual();
  Logger.log('========== DIAGNOSTICO DEL SISTEMA ==========');
  Logger.log('Fecha actual: ' + fecha);

  // 1. Verificar hoja Sesiones
  try {
    const sheet = getSheet('Sesiones');
    const data = sheet.getDataRange().getValues();
    Logger.log('\n--- HOJA SESIONES ---');
    Logger.log('Total filas (incluyendo encabezado): ' + data.length);
    Logger.log('Encabezados: ' + JSON.stringify(data[0]));

    if (data.length > 1) {
      Logger.log('\nPrimera fila de datos:');
      const headers = data[0];
      const firstRow = data[1];
      for (let i = 0; i < headers.length; i++) {
        const value = firstRow[i];
        const tipo = value instanceof Date ? 'Date' : typeof value;
        Logger.log('  ' + headers[i] + ': ' + value + ' (tipo: ' + tipo + ')');
      }

      // Verificar columna fecha
      const fechaIndex = headers.indexOf('fecha');
      if (fechaIndex >= 0) {
        const fechaValue = firstRow[fechaIndex];
        Logger.log('\nAnalisis de fecha:');
        Logger.log('  Valor raw: ' + fechaValue);
        Logger.log('  Es Date?: ' + (fechaValue instanceof Date));
        if (fechaValue instanceof Date) {
          Logger.log('  Formateada: ' + Utilities.formatDate(fechaValue, 'America/Asuncion', 'yyyy-MM-dd'));
        } else {
          Logger.log('  Substring(0,10): ' + String(fechaValue).substring(0, 10));
        }
        Logger.log('  Comparando con fecha actual (' + fecha + '): ' + (String(fechaValue).substring(0, 10) === fecha));
      }
    }
  } catch (e) {
    Logger.log('ERROR en hoja Sesiones: ' + e.message);
  }

  // 2. Probar SessionService.getByDate
  try {
    Logger.log('\n--- PRUEBA SessionService.getByDate ---');
    const sesiones = SessionService.getByDate(fecha);
    Logger.log('Sesiones encontradas: ' + sesiones.length);
    if (sesiones.length > 0) {
      Logger.log('Primera sesion: ' + JSON.stringify(sesiones[0]));
    }
  } catch (e) {
    Logger.log('ERROR en SessionService: ' + e.message);
  }

  // 3. Probar cargarDatosIniciales
  try {
    Logger.log('\n--- PRUEBA cargarDatosIniciales ---');
    const result = cargarDatosIniciales();
    Logger.log('Success: ' + result.success);
    if (result.success) {
      Logger.log('Terapeutas: ' + result.data.terapeutas.length);
      Logger.log('Sesiones: ' + result.data.sesiones.length);
      Logger.log('Sesiones Grupales: ' + result.data.sesionesGrupales.length);
    } else {
      Logger.log('Error: ' + result.message);
    }
  } catch (e) {
    Logger.log('ERROR en cargarDatosIniciales: ' + e.message);
  }

  Logger.log('\n========== FIN DIAGNOSTICO ==========');
  return 'Revisa Ver > Registros para ver el resultado';
}
