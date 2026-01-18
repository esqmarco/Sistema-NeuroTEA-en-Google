/**
 * ===========================
 * CAPA DE ACCESO A BASE DE DATOS
 * Google Sheets como backend
 * ===========================
 */

/**
 * Clase para operaciones CRUD genericas en Google Sheets
 */
const Database = {

  /**
   * Obtiene todos los registros de una hoja
   * @param {string} sheetName - Nombre de la hoja
   * @returns {Array<Object>} - Array de objetos con los datos
   */
  getAll: function(sheetName) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return []; // Solo encabezados

    const headers = data[0];
    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === '' || row[0] === null) continue; // Saltar filas vacias

      const record = {};
      for (let j = 0; j < headers.length; j++) {
        let value = row[j];

        // Convertir fechas de Date object a string YYYY-MM-DD
        if (value instanceof Date) {
          value = Utilities.formatDate(value, CONFIG.TIMEZONE, 'yyyy-MM-dd');
        }

        // Parsear JSON si corresponde
        if (headers[j].endsWith('JSON') && typeof value === 'string' && value) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Mantener como string si no es JSON valido
          }
        }

        record[headers[j]] = value;
      }
      records.push(record);
    }

    return records;
  },

  /**
   * Obtiene registros filtrados por una columna y valor
   * @param {string} sheetName - Nombre de la hoja
   * @param {string} column - Nombre de la columna
   * @param {*} value - Valor a buscar
   * @returns {Array<Object>} - Registros encontrados
   */
  getByColumn: function(sheetName, column, value) {
    const allRecords = this.getAll(sheetName);
    return allRecords.filter(record => record[column] === value);
  },

  /**
   * Obtiene un registro por ID
   * @param {string} sheetName - Nombre de la hoja
   * @param {*} id - ID del registro
   * @returns {Object|null} - Registro encontrado o null
   */
  getById: function(sheetName, id) {
    const records = this.getByColumn(sheetName, 'id', id);
    return records.length > 0 ? records[0] : null;
  },

  /**
   * Inserta un nuevo registro
   * @param {string} sheetName - Nombre de la hoja
   * @param {Object} data - Datos a insertar
   * @returns {Object} - Registro insertado con ID
   */
  insert: function(sheetName, data) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Asignar ID si no existe
    if (!data.id) {
      data.id = generateId();
    }

    // Crear fila con valores en orden de encabezados
    const row = headers.map(header => {
      let value = data[header];

      // Convertir objetos/arrays a JSON para columnas JSON
      if (header.endsWith('JSON') && typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }

      return value !== undefined ? value : '';
    });

    // Agregar fila
    sheet.appendRow(row);

    return data;
  },

  /**
   * Actualiza un registro existente
   * @param {string} sheetName - Nombre de la hoja
   * @param {*} id - ID del registro
   * @param {Object} updates - Datos a actualizar
   * @returns {Object|null} - Registro actualizado o null
   */
  update: function(sheetName, id, updates) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) return null;

    // Buscar fila con el ID
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == id) {
        rowIndex = i + 1; // +1 porque getRange usa base 1
        break;
      }
    }

    if (rowIndex === -1) return null;

    // Actualizar campos
    const currentRow = data[rowIndex - 1];
    headers.forEach((header, colIndex) => {
      if (updates.hasOwnProperty(header)) {
        let value = updates[header];

        // Convertir a JSON si corresponde
        if (header.endsWith('JSON') && typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }

        sheet.getRange(rowIndex, colIndex + 1).setValue(value);
      }
    });

    return this.getById(sheetName, id);
  },

  /**
   * Elimina un registro por ID
   * @param {string} sheetName - Nombre de la hoja
   * @param {*} id - ID del registro
   * @returns {boolean} - True si se elimino, false si no existe
   */
  delete: function(sheetName, id) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) return false;

    // Buscar fila con el ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == id) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }

    return false;
  },

  /**
   * Elimina registros que coincidan con un filtro
   * @param {string} sheetName - Nombre de la hoja
   * @param {string} column - Nombre de la columna
   * @param {*} value - Valor a buscar
   * @returns {number} - Cantidad de registros eliminados
   */
  deleteByColumn: function(sheetName, column, value) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colIndex = headers.indexOf(column);

    if (colIndex === -1) return 0;

    let deleted = 0;

    // Eliminar de abajo hacia arriba para no afectar indices
    for (let i = data.length - 1; i > 0; i--) {
      if (data[i][colIndex] === value) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }

    return deleted;
  },

  /**
   * Busca o crea un registro
   * @param {string} sheetName - Nombre de la hoja
   * @param {Object} searchCriteria - Criterios de busqueda
   * @param {Object} createData - Datos para crear si no existe
   * @returns {Object} - Registro encontrado o creado
   */
  findOrCreate: function(sheetName, searchCriteria, createData) {
    const allRecords = this.getAll(sheetName);

    // Buscar registro existente
    const found = allRecords.find(record => {
      return Object.keys(searchCriteria).every(key =>
        record[key] === searchCriteria[key]
      );
    });

    if (found) return found;

    // Crear nuevo registro
    return this.insert(sheetName, { ...searchCriteria, ...createData });
  },

  /**
   * Cuenta registros que coincidan con un filtro
   * @param {string} sheetName - Nombre de la hoja
   * @param {string} column - Nombre de la columna (opcional)
   * @param {*} value - Valor a buscar (opcional)
   * @returns {number} - Cantidad de registros
   */
  count: function(sheetName, column, value) {
    if (!column) {
      const sheet = getSheet(sheetName);
      return Math.max(0, sheet.getLastRow() - 1); // -1 por encabezados
    }

    return this.getByColumn(sheetName, column, value).length;
  },

  /**
   * Obtiene registros por fecha
   * @param {string} sheetName - Nombre de la hoja
   * @param {string} fecha - Fecha en formato YYYY-MM-DD
   * @param {string} dateColumn - Nombre de la columna de fecha (default: 'fecha')
   * @returns {Array<Object>} - Registros de esa fecha
   */
  getByDate: function(sheetName, fecha, dateColumn = 'fecha') {
    return this.getByColumn(sheetName, dateColumn, fecha);
  },

  /**
   * Ejecuta una transaccion con lock
   * @param {Function} callback - Funcion a ejecutar
   * @returns {*} - Resultado del callback
   */
  transaction: function(callback) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); // Esperar hasta 30 segundos
      return callback();
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Limpia registros antiguos
   * @param {string} sheetName - Nombre de la hoja
   * @param {string} dateColumn - Columna de fecha
   * @param {number} daysToKeep - Dias a mantener
   * @returns {number} - Registros eliminados
   */
  cleanOldRecords: function(sheetName, dateColumn, daysToKeep) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dateIndex = headers.indexOf(dateColumn);

    if (dateIndex === -1) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = Utilities.formatDate(cutoffDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    let deleted = 0;

    for (let i = data.length - 1; i > 0; i--) {
      const recordDate = data[i][dateIndex];
      if (recordDate && recordDate < cutoffString) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }

    return deleted;
  }
};

/**
 * Funcion de utilidad para resultados estandarizados
 * @param {boolean} success - Exito de la operacion
 * @param {*} data - Datos a retornar
 * @param {string} message - Mensaje opcional
 * @returns {Object} - Objeto resultado estandarizado
 */
function resultado(success, data, message) {
  return {
    success: success,
    data: data,
    message: message || ''
  };
}
