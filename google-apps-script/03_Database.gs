/**
 * ===========================
 * CAPA DE BASE DE DATOS
 * CRUD generico para Google Sheets
 * ===========================
 *
 * INSTRUCCIONES:
 * 1. Click en + junto a "Archivos"
 * 2. Selecciona "Script"
 * 3. Nombra el archivo "Database" (sin .gs)
 * 4. Pega este contenido
 */

const Database = {

  /**
   * Obtiene todos los registros de una hoja
   */
  getAll: function(sheetName) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index];
        // Parsear JSON si es necesario
        if (header.endsWith('JSON') && typeof value === 'string' && value) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Mantener como string si no es JSON valido
          }
        }
        obj[header] = value;
      });
      return obj;
    }).filter(row => row.id || row.fecha); // Filtrar filas vacias
  },

  /**
   * Obtiene registros por fecha
   */
  getByDate: function(sheetName, fecha) {
    const all = this.getAll(sheetName);
    return all.filter(row => row.fecha === fecha);
  },

  /**
   * Obtiene registro por ID
   */
  getById: function(sheetName, id) {
    const all = this.getAll(sheetName);
    return all.find(row => row.id == id) || null;
  },

  /**
   * Obtiene registros por columna
   */
  getByColumn: function(sheetName, column, value) {
    const all = this.getAll(sheetName);
    return all.filter(row => row[column] == value);
  },

  /**
   * Inserta un nuevo registro
   */
  insert: function(sheetName, data) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // Generar ID si no existe
    if (!data.id && headers.includes('id')) {
      data.id = generateId();
    }

    // Preparar fila
    const row = headers.map(header => {
      let value = data[header];
      // Convertir objetos/arrays a JSON
      if (header.endsWith('JSON') && (Array.isArray(value) || typeof value === 'object')) {
        value = JSON.stringify(value);
      }
      return value !== undefined ? value : '';
    });

    sheet.appendRow(row);
    return data;
  },

  /**
   * Actualiza un registro existente
   */
  update: function(sheetName, id, data) {
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) {
      // Buscar por fecha si no hay columna id
      const fechaIndex = headers.indexOf('fecha');
      if (fechaIndex === -1) return false;

      for (let i = 1; i < allData.length; i++) {
        if (allData[i][fechaIndex] == id) {
          // Actualizar campos
          Object.keys(data).forEach(key => {
            const colIndex = headers.indexOf(key);
            if (colIndex !== -1) {
              let value = data[key];
              if (key.endsWith('JSON') && (Array.isArray(value) || typeof value === 'object')) {
                value = JSON.stringify(value);
              }
              sheet.getRange(i + 1, colIndex + 1).setValue(value);
            }
          });
          return true;
        }
      }
      return false;
    }

    // Buscar por ID
    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] == id) {
        // Actualizar campos
        Object.keys(data).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            let value = data[key];
            if (key.endsWith('JSON') && (Array.isArray(value) || typeof value === 'object')) {
              value = JSON.stringify(value);
            }
            sheet.getRange(i + 1, colIndex + 1).setValue(value);
          }
        });
        return true;
      }
    }
    return false;
  },

  /**
   * Elimina un registro por ID
   */
  delete: function(sheetName, id) {
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idIndex = headers.indexOf('id');

    if (idIndex === -1) return false;

    for (let i = 1; i < allData.length; i++) {
      if (allData[i][idIndex] == id) {
        sheet.deleteRow(i + 1);
        return true;
      }
    }
    return false;
  },

  /**
   * Elimina registros por columna
   */
  deleteByColumn: function(sheetName, column, value) {
    const sheet = getSheet(sheetName);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const colIndex = headers.indexOf(column);

    if (colIndex === -1) return 0;

    let deleted = 0;
    // Eliminar de abajo hacia arriba para no afectar indices
    for (let i = allData.length - 1; i > 0; i--) {
      if (allData[i][colIndex] == value) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }
    return deleted;
  },

  /**
   * Cuenta registros en una hoja
   */
  count: function(sheetName) {
    const sheet = getSheet(sheetName);
    return Math.max(0, sheet.getLastRow() - 1);
  },

  /**
   * Limpia todos los datos de una hoja (mantiene encabezados)
   */
  clear: function(sheetName) {
    const sheet = getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }
};
