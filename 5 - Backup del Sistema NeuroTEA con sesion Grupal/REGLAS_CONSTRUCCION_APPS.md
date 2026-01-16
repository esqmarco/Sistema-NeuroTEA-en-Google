# Reglas para Construir Aplicaciones Web Robustas

## Filosofía de Desarrollo

Este documento establece principios y patrones para construir aplicaciones web cliente con persistencia local (IndexedDB), garantizando integridad de datos, reversibilidad de operaciones y mantenibilidad del código.

---

## 1. PRINCIPIOS DE COHERENCIA SISTÉMICA

### Regla Principal
**Cada cambio DEBE considerar el impacto en TODO el sistema.** Una funcionalidad NO está completa hasta que funciona en todas las vistas/pestañas de la aplicación.

### Checklist para Modificaciones

**Al CREAR datos:**
- [ ] ¿Se guarda en memoria (variable global)?
- [ ] ¿Se persiste en IndexedDB?
- [ ] ¿Se muestra en todas las vistas relevantes?
- [ ] ¿Se incluye en backup/exportación?
- [ ] ¿Se puede importar correctamente?

**Al BORRAR datos:**
- [ ] ¿Se elimina de memoria?
- [ ] ¿Se elimina de IndexedDB?
- [ ] ¿Se revierten cálculos dependientes?
- [ ] ¿Se actualizan TODAS las vistas?
- [ ] ¿Se limpian referencias relacionadas?

### Filosofía de Datos
1. **Reversibilidad**: Toda operación debe poder deshacerse
2. **Coherencia**: El mismo dato debe verse igual en todas las vistas
3. **Cálculo dinámico**: Los totales/saldos se calculan, no se acumulan

---

## 2. PERSISTENCIA CON INDEXEDDB

### Estructura Básica

```javascript
// Inicialización de IndexedDB
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MiApp', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Crear stores con índices
            if (!db.objectStoreNames.contains('miStore')) {
                const store = db.createObjectStore('miStore', { keyPath: 'id' });
                store.createIndex('fecha', 'fecha', { unique: false });
            }
        };
    });
}
```

### Patrón de Sincronización (CRÍTICO)

**Usar `clearAndSave` para stores con eliminaciones:**

```javascript
async function clearAndSaveToIndexedDB(storeName, data) {
    const db = await getDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // 1. Limpiar TODO el store
    await store.clear();

    // 2. Re-guardar datos actuales
    for (const item of data) {
        await store.put(item);
    }

    return transaction.complete;
}
```

**¿Por qué clear + save?**
- Garantiza sincronización entre memoria e IndexedDB
- Evita datos "fantasma" que reaparecen
- Elimina automáticamente registros borrados en memoria

### Patrón de Guardado

```javascript
// CORRECTO: Modificar memoria y llamar saveToStorage
delete datos[id];
await saveToStorageAsync();  // clearAndSave sincroniza todo

// INCORRECTO: Nunca usar deleteFromIndexedDB para stores sincronizados
// Causa conflictos de transacción y datos que "reaparecen"
```

### Estructura de Datos Recomendada

```javascript
// Datos por fecha (facilita consultas y backups)
const sessions = {
    '2025-01-15': [{ id: 1, ... }, { id: 2, ... }],
    '2025-01-16': [{ id: 3, ... }]
};

// Datos globales
const configuracion = { ... };

// Históricos (datos completados/archivados)
const historial = [];
```

---

## 3. REVERSIBILIDAD DE OPERACIONES

### Principio
Toda operación que modifica datos debe poder revertirse completamente.

### Patrón de Eliminación con Reversión

```javascript
async function eliminarRegistro(id, fecha) {
    // 1. Buscar el registro
    const registro = datos[fecha]?.find(r => r.id === id);
    if (!registro) return;

    // 2. REVERTIR cálculos/estados dependientes ANTES de eliminar
    await revertirDependencias(registro);

    // 3. Eliminar de memoria
    const index = datos[fecha].findIndex(r => r.id === id);
    datos[fecha].splice(index, 1);

    // 4. Limpiar estructura vacía
    if (datos[fecha].length === 0) {
        delete datos[fecha];
    }

    // 5. Persistir cambios
    await saveToStorageAsync();

    // 6. Actualizar UI
    updateAllViews(fecha);
}
```

### Funciones de Reversión

```javascript
async function revertirDependencias(registro) {
    // Revertir confirmaciones
    if (confirmaciones[registro.fecha]?.[registro.relacionado]) {
        delete confirmaciones[registro.fecha][registro.relacionado];
    }

    // Revertir créditos usados
    if (registro.creditoUsado) {
        await restaurarCredito(registro);
    }

    // Los saldos se recalculan automáticamente (cálculo dinámico)
}
```

### Restauración desde Histórico

```javascript
async function restaurarDesdeHistorico(id) {
    // 1. Buscar en histórico
    const index = historial.findIndex(h => h.id === id);
    if (index === -1) return false;

    // 2. Extraer del histórico
    const registro = historial.splice(index, 1)[0];

    // 3. Restaurar a datos activos
    const fecha = registro.fechaOriginal;
    if (!datosActivos[fecha]) datosActivos[fecha] = [];
    datosActivos[fecha].push({
        ...registro,
        status: 'active',
        restoredAt: new Date().toISOString()
    });

    // 4. Persistir
    await saveToStorageAsync();

    return true;
}
```

---

## 4. GENERACIÓN DE IDs ÚNICOS

### Principio
Un ID una vez usado, NUNCA se reutiliza (incluso si se elimina el registro).

### Implementación Segura

```javascript
function generateUniqueId(prefix = 'ID') {
    // Recopilar TODOS los IDs existentes (activos + históricos)
    const allExistingIds = new Set();

    // IDs de registros activos
    Object.values(datosActivos).flat().forEach(r => allExistingIds.add(r.id));

    // IDs de registros históricos
    historial.forEach(r => allExistingIds.add(r.id));

    // Generar ID único
    let counter = allExistingIds.size + 1;
    let candidateId;

    do {
        const timestamp = Date.now().toString(36).slice(-4);
        candidateId = `${prefix}-${counter.toString().padStart(3, '0')}-${timestamp}`;
        counter++;
    } while (allExistingIds.has(candidateId));

    return candidateId;
}
```

### Verificación de Duplicados

```javascript
function verificarDuplicado(id) {
    // Verificar en activos
    const enActivos = Object.values(datosActivos)
        .flat()
        .some(r => r.id === id);

    // Verificar en histórico
    const enHistorico = historial.some(r => r.id === id);

    return enActivos || enHistorico;
}
```

---

## 5. CÁLCULO DINÁMICO DE TOTALES

### Principio
Los totales y saldos se CALCULAN en tiempo real, nunca se almacenan como variables acumulativas.

### Implementación

```javascript
// CORRECTO: Calcular dinámicamente
function calcularSaldo(fecha) {
    let saldo = getSaldoInicial(fecha);

    // Sumar ingresos del día
    (ingresos[fecha] || []).forEach(i => {
        saldo += i.monto;
    });

    // Restar egresos del día
    (egresos[fecha] || []).forEach(e => {
        saldo -= e.monto;
    });

    return Math.max(0, saldo); // Nunca negativo si aplica
}

// INCORRECTO: Variable acumulativa
let saldoActual = 0; // ❌ Se desincroniza fácilmente
```

### Beneficios
- Siempre refleja el estado real de los datos
- No se desincroniza con eliminaciones/reversiones
- Facilita debugging y auditoría

---

## 6. ACTUALIZACIÓN DE VISTAS

### Principio
Después de CUALQUIER modificación de datos, actualizar TODAS las vistas afectadas.

### Implementación

```javascript
function updateAllViews(fecha) {
    try {
        if (!fecha) fecha = fechaActual;

        // Actualizar cada sección de la UI
        updateListaRegistros(fecha);
        updateDashboard(fecha);
        updateResumen(fecha);
        updateHistorial();
        updateContadores();

    } catch (error) {
        console.error("Error actualizando vistas:", error);
        mostrarErrorUI("Error al actualizar la interfaz");
    }
}

// Llamar SIEMPRE después de modificar datos
async function crearRegistro(datos) {
    // ... crear registro ...
    await saveToStorageAsync();
    updateAllViews(fecha); // ← OBLIGATORIO
}
```

---

## 7. BACKUP Y EXPORTACIÓN

### Estructura de Exportación

```javascript
function exportarDatos(fecha) {
    return {
        // Metadata
        version: '1.0',
        exportDate: new Date().toISOString(),
        fecha: fecha,

        // Datos del día específico
        registros: datosActivos[fecha] || [],
        configuracion: getConfiguracionDia(fecha),

        // Datos globales para sincronización
        syncData: {
            historial: historial,
            configuracionGlobal: configGlobal
        }
    };
}
```

### Importación Segura

```javascript
async function importarDatos(jsonData, fecha) {
    // 1. Validar estructura
    if (!validarEstructuraImport(jsonData)) {
        throw new Error('Estructura de datos inválida');
    }

    // 2. Verificar versión
    if (!esVersionCompatible(jsonData.version)) {
        throw new Error('Versión incompatible');
    }

    // 3. Detectar conflictos
    const conflictos = detectarConflictos(fecha, jsonData);
    if (conflictos.length > 0) {
        const confirmar = await mostrarConflictos(conflictos);
        if (!confirmar) return false;
    }

    // 4. Importar datos
    datosActivos[fecha] = jsonData.registros;

    // 5. Sincronizar datos globales si existen
    if (jsonData.syncData) {
        historial = jsonData.syncData.historial;
        configGlobal = jsonData.syncData.configuracionGlobal;
    }

    // 6. Persistir
    await saveToStorageAsync();

    // 7. Actualizar UI
    updateAllViews(fecha);

    return true;
}
```

---

## 8. DOCUMENTACIÓN DEL CÓDIGO

### Archivo de Documentación (CLAUDE.md o similar)

Mantener un archivo de documentación actualizado con:

```markdown
# Nombre de la App

## Descripción
Breve descripción del propósito.

## Stack Tecnológico
- Tecnologías utilizadas

## Convenciones
- Formato de fechas
- Formato de moneda
- Estilo de código

## Variables Globales
- Lista de variables y su propósito

## IndexedDB Stores
- Lista de stores y sus estructuras

## Funciones Principales
- Funciones clave organizadas por módulo

## Flujos de Datos
- Diagramas o descripciones de flujos

## Protocolo Post-Cambios
Después de modificaciones significativas:
- [ ] Actualizar tests
- [ ] Actualizar documentación
- [ ] Verificar coherencia en todas las vistas
```

### Actualización Obligatoria
Después de cada cambio significativo, actualizar la documentación con:
- Nuevas funciones agregadas
- Cambios en flujos de datos
- Nuevos stores de IndexedDB
- Cambios en validaciones

---

## 9. SISTEMA DE PRUEBAS

### Estructura de Tests

```javascript
// test_sistema.js
let testsPassed = 0;
let testsFailed = 0;

function test(nombre, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`✅ ${nombre}`);
    } catch (error) {
        testsFailed++;
        console.log(`❌ ${nombre}: ${error.message}`);
    }
}

function assertEqual(actual, expected, mensaje = '') {
    if (actual !== expected) {
        throw new Error(`${mensaje} Esperado: ${expected}, Obtenido: ${actual}`);
    }
}

// Grupos de pruebas
console.log('📋 GRUPO 1: Funciones de Formato');
test('formatNumber - número entero', () => {
    assertEqual(formatNumber(1000), '1.000');
});

// ... más tests ...

// Resumen
console.log(`\nTotal: ${testsPassed + testsFailed}`);
console.log(`✅ Pasadas: ${testsPassed}`);
console.log(`❌ Fallidas: ${testsFailed}`);
```

### Cobertura Recomendada
1. **Unitarias**: Funciones individuales
2. **Integración**: Flujos completos
3. **Reversión**: Crear → Eliminar → Verificar estado limpio
4. **Persistencia**: Guardar → Recargar → Verificar datos

---

## 10. VALIDACIONES DE SEGURIDAD

### Validación de Datos de Entrada

```javascript
function validarDatos(datos) {
    // Campos requeridos
    if (!datos.campo1 || datos.campo1.trim() === '') {
        return { valid: false, error: 'Campo1 es requerido' };
    }

    // Tipos de datos
    if (typeof datos.monto !== 'number' || datos.monto < 0) {
        return { valid: false, error: 'Monto debe ser número positivo' };
    }

    // Formato de fecha
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
        return { valid: false, error: 'Formato de fecha inválido' };
    }

    return { valid: true };
}
```

### Validación de Operaciones

```javascript
function validarOperacion(operacion, estado) {
    // Verificar fondos suficientes
    if (operacion.tipo === 'pago' && estado.saldo < operacion.monto) {
        return {
            permitido: false,
            mensaje: `Fondos insuficientes. Disponible: ${estado.saldo}`
        };
    }

    return { permitido: true };
}
```

### Manejo de Errores

```javascript
async function operacionSegura(fn, mensajeError) {
    try {
        return await fn();
    } catch (error) {
        console.error(`${mensajeError}:`, error);
        mostrarErrorUI(mensajeError);
        return null;
    }
}

// Uso
await operacionSegura(
    () => guardarRegistro(datos),
    'Error al guardar el registro'
);
```

---

## 11. RESUMEN DE PRINCIPIOS

| Principio | Descripción |
|-----------|-------------|
| **Coherencia** | Mismo dato = misma vista en toda la app |
| **Reversibilidad** | Toda operación se puede deshacer |
| **Cálculo dinámico** | Totales calculados, no acumulados |
| **IDs únicos** | Nunca reutilizar IDs |
| **Sincronización** | clearAndSave para IndexedDB |
| **Documentación** | Mantener docs actualizados |
| **Testing** | Probar antes de confirmar cambios |
| **Validación** | Validar entradas y operaciones |

---

## 12. CHECKLIST PRE-PRODUCCIÓN

- [ ] Todas las operaciones CRUD funcionan
- [ ] Eliminaciones revierten correctamente
- [ ] IndexedDB sincroniza correctamente
- [ ] Backup/Restore funciona
- [ ] Tests pasan al 100%
- [ ] Documentación actualizada
- [ ] Sin errores en consola
- [ ] UI actualiza en todas las vistas

---

*Documento generado como guía de desarrollo. Adaptar según necesidades específicas del proyecto.*
