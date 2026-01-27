# NeuroTEA - Sistema de Gestion en Google Apps Script

## REGLA CRITICA: Autorizacion del Usuario

**NUNCA modifiques archivos de codigo (.gs, .html, .js, .json) sin pedir autorizacion EXPLICITA al usuario.**

### Protocolo Obligatorio para Cambios de Codigo

1. **INVESTIGAR** primero: Lee y analiza los archivos involucrados
2. **DESCRIBIR** los cambios propuestos: Explica que archivo, que funcion, y que se va a cambiar
3. **ESPERAR** aprobacion: No proceder hasta que el usuario diga explicitamente "si", "adelante", "hazlo" o similar
4. **EJECUTAR** solo despues de la aprobacion
5. **REPORTAR** el resultado al usuario

### Lo que SI puedes hacer sin pedir permiso
- Leer archivos (Read, Grep, Glob)
- Investigar y analizar codigo
- Ejecutar verificaciones y tests
- Responder preguntas sobre el codigo
- Actualizar archivos de documentacion (CLAUDE.md, SKILL.md, settings.json)

### Lo que NUNCA debes hacer sin permiso
- Editar archivos .gs (backend)
- Editar archivos .html (frontend)
- Crear archivos nuevos de codigo
- Borrar archivos de codigo
- Modificar configuracion del proyecto (appsscript.json)

### Formato para Proponer Cambios

```
CAMBIO PROPUESTO:
- Archivo: [nombre del archivo]
- Funcion: [nombre de la funcion]
- Accion: [crear/modificar/eliminar]
- Descripcion: [que se va a hacer y por que]
- Impacto: [que pestanas/flujos se afectan]

Autoriza este cambio?
```

## Descripcion
Sistema web de gestion para centro de terapias TEA migrado a Google Apps Script. Registra sesiones, pagos, egresos y genera rendiciones. Base de datos en Google Sheets.

## Arquitectura

### Stack Tecnologico
- **Backend**: Google Apps Script (GAS)
- **Frontend**: HTML5 + Tailwind CSS + JavaScript
- **Base de datos**: Google Sheets
- **Reportes**: Google Docs / HTML generado
- **Iconos**: Lucide Icons (CDN)

### Estructura del Proyecto

```
/
├── CLAUDE.md                    # Documentacion (solo para desarrollo)
│
└── gas/                         # CARPETA UNICA PARA GOOGLE APPS SCRIPT
    │                            # (Copiar TODO el contenido a Apps Script)
    │
    │  ══════ ARCHIVOS .GS (Backend) ══════
    │
    ├── 1.  appsscript.json      # Configuracion del proyecto GAS
    ├── 2.  Code.gs              # Punto de entrada: doGet(), include()
    ├── 3.  Config.gs            # Configuracion global (SPREADSHEET_ID, etc)
    ├── 4.  Database.gs          # Capa de acceso a Google Sheets
    ├── 5.  TherapistService.gs  # CRUD de terapeutas
    ├── 6.  SessionService.gs    # CRUD de sesiones individuales
    ├── 7.  GroupSessionService.gs # CRUD de sesiones grupales
    ├── 8.  GroupService.gs      # Gestion de grupos (configuracion)
    ├── 9.  EgresoService.gs     # CRUD de egresos
    ├── 10. PackageService.gs    # Sistema de paquetes/creditos
    ├── 11. RendicionService.gs  # Calculos de rendicion
    ├── 12. TransferService.gs   # Gestion de transferencias
    ├── 13. BackupService.gs     # Import/Export de datos
    ├── 14. Helpers.gs           # Funciones auxiliares
    │
    │  ══════ ARCHIVOS .HTML (Frontend) ══════
    │
    ├── 15. Index.html           # Pagina principal (template)
    ├── 16. Styles.html          # CSS (Tailwind + custom)
    ├── 17. Scripts.html         # JavaScript del cliente
    └── 18. AccesoDenegado.html  # Pagina para usuarios no autorizados
```

### Orden para Crear Archivos en Apps Script

Crea los archivos en este orden en Google Apps Script:

| # | Archivo | Tipo | Descripcion |
|---|---------|------|-------------|
| 1 | `appsscript.json` | Config | Ya existe, solo editar |
| 2 | `Code.gs` | Script | Punto de entrada principal |
| 3 | `Config.gs` | Script | Configuracion y constantes |
| 4 | `Database.gs` | Script | Acceso a Sheets |
| 5 | `TherapistService.gs` | Script | Servicio terapeutas |
| 6 | `SessionService.gs` | Script | Servicio sesiones |
| 7 | `GroupSessionService.gs` | Script | Sesiones grupales |
| 8 | `GroupService.gs` | Script | Gestion grupos |
| 9 | `EgresoService.gs` | Script | Servicio egresos |
| 10 | `PackageService.gs` | Script | Paquetes/creditos |
| 11 | `RendicionService.gs` | Script | Rendicion cuentas |
| 12 | `TransferService.gs` | Script | Transferencias |
| 13 | `BackupService.gs` | Script | Backup/restore |
| 14 | `Helpers.gs` | Script | Utilidades |
| 15 | `Index.html` | HTML | Template principal |
| 16 | `Styles.html` | HTML | Estilos CSS |
| 17 | `Scripts.html` | HTML | JavaScript cliente |
| 18 | `AccesoDenegado.html` | HTML | Pagina acceso denegado |

## Hojas de Google Sheets (Base de Datos)

| Hoja | Descripcion | Columnas Principales |
|------|-------------|---------------------|
| `Terapeutas` | Lista de terapeutas | id, nombre, activo, creadoEn |
| `Sesiones` | Sesiones individuales | id, fecha, terapeuta, paciente, valor, efectivo, transferenciaNeurotea, transferenciaTerapeuta, aporte, honorarios, usaCredito |
| `SesionesGrupales` | Sesiones de grupo | id, fecha, grupoId, grupoNombre, asistencia (JSON), terapeutas (JSON), valorTotal, aporte, honorariosPorTerapeuta |
| `Egresos` | Gastos y adelantos | id, fecha, tipo, concepto, monto, terapeuta |
| `Confirmaciones` | Confirmaciones de pago | id, fecha, terapeuta, tipo, flujo (JSON), estadoCongelado (JSON) |
| `Paquetes` | Paquetes activos | id, fecha, paciente, terapeuta, sesionesTotal, sesionesRestantes, valorTotal, efectivo, transferenciaNeurotea |
| `HistorialPaquetes` | Paquetes completados | id, fechaCompra, fechaCompletado, paciente, terapeuta, sesionesTotal, valorTotal |
| `Grupos` | Configuracion de grupos | id, nombre, porcentajeAporte, ninos (JSON), estado |
| `Creditos` | Creditos de pacientes | id, paciente, terapeuta, total, restante, paqueteId |
| `SaldosIniciales` | Saldo inicial por fecha | fecha, efectivo |
| `HistorialSaldos` | Historial de cambios | id, fecha, mensaje, timestamp |
| `EstadosTransferencia` | Estados de confirmacion | id, confirmado, timestamp |
| `Configuracion` | Configuracion general | clave, valor |
| `Autorizaciones` | Correos autorizados para acceder | correo, nombre, fechaAgregado |

## Convenciones

### Formato de Datos
- **Fechas**: `YYYY-MM-DD` (Paraguay UTC-4)
- **Moneda**: Guaranies (Gs) sin decimales
- **IDs**: Timestamp en milisegundos (`Date.now()`)
- **JSON en celdas**: Para arrays y objetos complejos

### Patron de Codigo
```javascript
// Funciones de servicio retornan objetos estandarizados
function resultado(exito, datos, mensaje) {
  return {
    success: exito,
    data: datos,
    message: mensaje || ''
  };
}
```

### Comunicacion Frontend-Backend
```javascript
// Frontend (Scripts.html)
google.script.run
  .withSuccessHandler(onSuccess)
  .withFailureHandler(onError)
  .nombreFuncionBackend(parametros);

// Backend (*.gs)
function nombreFuncionBackend(parametros) {
  // Logica
  return resultado(true, datos);
}
```

## Principios de Coherencia Sistemica

### Regla Principal
Cada cambio DEBE considerar el impacto en TODO el sistema. Una funcionalidad NO esta completa hasta que funciona en las 9 pestanas.

### Pestanas del Sistema
1. **Registro Diario** - Formularios de sesiones
2. **Resumen Global** - Dashboard con totales y saldos
3. **Transferencias** - Pendientes/confirmadas
4. **Rendicion de Cuentas** - Por terapeuta, reporte HTML
5. **Egresos** - Gastos y adelantos
6. **Gestion de Terapeutas** - CRUD
7. **Paquetes/Creditos** - Prepagos activos
8. **Gestionar Grupos** - Terapia grupal
9. **Administracion** - Backup/restore

### Checklist para Modificaciones

**Al CREAR datos:**
- [ ] Se guarda en la hoja correspondiente de Sheets
- [ ] Se muestra en todas las vistas relevantes
- [ ] Se incluye en backup/exportacion
- [ ] Se puede importar correctamente

**Al BORRAR datos:**
- [ ] Se elimina de la hoja de Sheets
- [ ] Se revierten calculos dependientes
- [ ] Se actualizan TODAS las vistas
- [ ] Se limpian referencias relacionadas

### Flujos de Dinero Sincronizados
```
Sesion Normal  → Registro + Resumen + Rendicion + Transferencias
Sesion Grupal  → Registro + Resumen + Rendicion (proporcional)
Paquete        → Registro + Resumen + Paquetes/Creditos
Uso Credito    → Registro + Rendicion (Gs 0) + Paquetes (descuento)
Egreso         → Egresos + Resumen (saldo caja)
```

## Calculo Dinamico de Saldos

### Saldo en Caja
```javascript
function calcularSaldoCaja(fecha) {
  let saldo = getSaldoInicial(fecha);
  saldo += sumarEfectivoSesiones(fecha);
  saldo += sumarEfectivoPaquetes(fecha);
  saldo += sumarEfectivoGrupales(fecha);
  saldo -= sumarEgresos(fecha);
  saldo -= sumarPagosConfirmados(fecha);
  return Math.max(0, saldo);
}
```

### Cuenta NeuroTEA
```javascript
function calcularCuentaNeuroTEA(fecha) {
  let saldo = 0;
  saldo += sumarTransferenciasNeurotea(fecha);
  saldo -= sumarTransferenciasSalientes(fecha);
  saldo += sumarVueltosRecibidos(fecha);
  return Math.max(0, saldo);
}
```

## Sistema de Paquetes/Creditos

### Flujo de Creditos
1. Compra de paquete → Crea creditos en hoja `Creditos`
2. Uso de credito → Decrementa `restante` en `Creditos`
3. Si restante === 0 → Mover a `HistorialPaquetes`

### Funciones Clave
- `crearPaquete()` - Crea paquete y creditos asociados
- `usarCredito()` - Decrementa y verifica si completar
- `obtenerCreditosDisponibles()` - Lista creditos activos
- `eliminarPaquete()` - Elimina paquete y revierte creditos

## Sesiones Grupales

### Division Proporcional
```javascript
valorPorTerapeuta = Math.floor(totalValue / therapistCount);
// Primera terapeuta recibe el residuo
residuo = totalValue - (valorPorTerapeuta * therapistCount);
```

### Integracion
- **Dashboard**: Valor TOTAL de la sesion
- **Rendicion**: Valor PROPORCIONAL por terapeuta
- **Transferencias**: INDIVIDUALES por nino

## Rendicion de Cuentas

### Estados Posibles
| Estado | Descripcion | Color |
|--------|-------------|-------|
| SALDADO | Sin deuda | Gris |
| DAR EFECTIVO | NeuroTEA debe pagar en efectivo | Verde |
| DAR Y TRANSFERIR | Pago mixto necesario | Naranja |
| TRANSFERIR | NeuroTEA debe transferir | Azul |
| LA TERAPEUTA DEBE DAR | Terapeuta tiene saldo a favor de NeuroTEA | Rojo |
| FONDOS INSUFICIENTES | No hay fondos disponibles | Rojo |

### Confirmacion de Pago
```javascript
// Estructura de confirmacion
{
  type: 'DAR EFECTIVO',
  tipoOpcion: 'exacto', // exacto, vuelto, vuelto-efectivo, transferir, dar-transferir
  flujo: {
    efectivoUsado: 50000,
    bancoUsado: 0,
    vueltoEfectivo: 0,
    vueltoTransferencia: 0
  },
  estadoCongelado: { /* snapshot del estado */ },
  timestamp: '2025-01-15T10:30:00Z'
}
```

## Control de Acceso

### Sistema de Autorizacion
El sistema verifica el correo del usuario antes de permitir acceso. Solo los correos registrados en la hoja `Autorizaciones` pueden ver la aplicacion.

### Como Funciona
1. Al abrir la app, `doGet()` obtiene el correo del usuario con `Session.getActiveUser().getEmail()`
2. Verifica si el correo esta en la hoja `Autorizaciones`
3. Si esta autorizado → muestra el sistema (Index.html)
4. Si NO esta autorizado → muestra pagina de acceso denegado (AccesoDenegado.html)

### Agregar Usuarios Autorizados
1. Abrir el Google Spreadsheet (base de datos)
2. Ir a la hoja `Autorizaciones`
3. Agregar una fila con:
   - Columna A: correo@gmail.com
   - Columna B: Nombre (opcional)
   - Columna C: Fecha (opcional)

### Ejemplo de Hoja Autorizaciones
| correo | nombre | fechaAgregado |
|--------|--------|---------------|
| admin@gmail.com | Administrador | 2025-01-17 |
| usuario@gmail.com | Usuario 1 | 2025-01-17 |

### Requisito de Despliegue
Para que la autorizacion funcione, al desplegar se debe configurar:
- **Ejecutar como**: "Usuario que accede a la aplicacion web"
- **Quien tiene acceso**: "Cualquier persona"

## Despliegue

### Pasos para Desplegar
1. Crear nuevo proyecto en Google Apps Script
2. Copiar los archivos de la carpeta `gas/` en este orden:
   - Primero `Code.gs` (renombrar el archivo default "Codigo.gs")
   - Luego `Config.gs`, `Database.gs`, y demas archivos `.gs`
   - Finalmente los archivos `.html` (Index, Styles, Scripts, AccesoDenegado)
3. Crear Google Spreadsheet para base de datos
4. Actualizar `SPREADSHEET_ID` en `Config.gs`
5. Ejecutar `initializeSpreadsheet()` para crear hojas (incluye Autorizaciones)
6. Agregar tu correo en la hoja `Autorizaciones`
7. Desplegar como Web App:
   - **Ejecutar como**: "Usuario que accede a la aplicacion web"
   - **Quien tiene acceso**: "Cualquier persona"

### Configuracion de Spreadsheet
```javascript
// En Config.gs
const CONFIG = {
  SPREADSHEET_ID: 'TU_ID_DE_SPREADSHEET_AQUI',
  TIMEZONE: 'America/Asuncion',
  LOCALE: 'es_PY'
};
```

## Testing

### Pruebas Manuales Recomendadas
1. Crear terapeuta y verificar en lista
2. Registrar sesion y verificar en todas las vistas
3. Crear paquete y usar creditos
4. Registrar sesion grupal
5. Confirmar rendicion
6. Exportar e importar backup

## Migracion desde Version Local

### IMPORTANTE: Incompatibilidad de JSON

Los archivos JSON exportados del sistema local original **NO son compatibles** directamente con el sistema GAS. Las razones:

1. **Nombres de propiedades diferentes**: El original usa ingles, GAS usa espanol

| Propiedad | Sistema Original | Sistema GAS |
|-----------|-----------------|-------------|
| Terapeuta | `therapist` | `terapeuta` |
| Paciente | `patientName` | `paciente` |
| Efectivo | `cashToNeurotea` | `efectivo` |
| Valor sesion | `sessionValue` | `valorSesion` |
| Honorarios | `therapistFee` | `honorarios` |
| Aporte | `neuroteaContribution` | `aporteNeurotea` |
| Transferencia | `transferToNeurotea` | `transferenciaNeurotea` |
| Tipo egreso | `type` | `tipo` |
| Concepto | `concept` | `concepto` |
| Creditos restantes | `remaining` | `restante` |
| Paquete ID | `packageId` | `paqueteId` |

2. **Estructuras diferentes**:
   - Terapeutas: original = array de strings `["Maria"]`, GAS = objetos `{id, nombre, activo}`
   - Confirmaciones: original = objeto por terapeuta, GAS = array de objetos
   - Creditos: original = anidado por paciente/terapeuta, GAS = tabla plana
   - Sesiones grupales: original = arrays directos, GAS = JSON strings en celdas

3. **Import/Export GAS-a-GAS**: Funciona correctamente. Exportar desde GAS e importar de vuelta a GAS es compatible.

### Migracion Manual
Para migrar datos del sistema local al GAS, se requiere:
1. Exportar backup del sistema local
2. **Transformar manualmente** los nombres de propiedades (se necesitaria un script de migracion)
3. Importar el JSON transformado al GAS
4. Verificar integridad de datos

### Formato de Fechas
- Las fechas mantienen formato `YYYY-MM-DD` en ambos sistemas
- Los IDs son timestamps en milisegundos en ambos sistemas

## Comportamiento de Borrado por Entidad

### Regla General
El sistema usa **borrado permanente (hard delete)** para todas las entidades. La fila se elimina fisicamente de la hoja de Google Sheets. NO existe soft delete (activo=false) excepto como alternativa cuando hay registros asociados.

### Tabla de Borrado

| Entidad | Tipo | Validaciones | Limpieza al Borrar |
|---------|------|-------------|-------------------|
| **Terapeuta** | Hard delete | Si tiene registros → ofrece desactivar | Ninguna (registros quedan) |
| **Sesion individual** | Hard delete | Ninguna | Revierte creditos + limpia confirmaciones + limpia transferencias |
| **Sesion grupal** | Hard delete | Ninguna | Limpia confirmaciones de cada terapeuta + transferencias |
| **Egreso** | Hard delete | Ninguna | Sin dependencias |
| **Paquete** | Hard delete | Si tiene sesiones con credito → bloqueado | Elimina creditos + historial + transferencias |
| **Grupo** | Hard delete | Si tiene sesiones → bloqueado | Sin dependencias |
| **Historial paquete** | Hard delete | Ninguna | Solo registro historico |

### Funciones Backend de Borrado

| Frontend | Backend | Servicio |
|----------|---------|----------|
| `deleteTherapist(nombre)` | `eliminarTerapeuta(nombre)` | `TherapistService.delete(id)` |
| `deleteSession(id)` | `eliminarSesion(id)` | `SessionService.delete(id)` |
| `deleteGroupSession(id)` | `eliminarSesionGrupal(id)` | `GroupSessionService.delete(id)` |
| `deleteEgreso(id)` | `eliminarEgreso(id)` | `EgresoService.delete(id)` |
| `deletePackage(id)` | `eliminarPaquete(id)` | `PackageService.delete(id)` |
| `deleteGroup(id)` | `eliminarGrupo(id)` | `GroupService.delete(id)` |

### Los Calculos se Revierten Automaticamente
Al borrar cualquier registro, los saldos y calculos se actualizan automaticamente porque el sistema usa **calculo dinamico** (recalcula todo desde datos crudos cada vez que se carga).

## Import/Export Estado Actual

### Exportacion
- `exportFullBackup()` → Backup JSON completo de todas las hojas
- `exportDayData()` → Datos de un dia especifico + datos globales de sincronizacion

### Importacion con Deteccion de Conflictos
- `importDayData()` → Detecta datos existentes en la fecha, muestra dialogo:
  - **Fusionar**: Agrega datos nuevos sin borrar existentes (merge)
  - **Sobrescribir**: Elimina datos del dia y los reemplaza (overwrite)
  - **Cancelar**: Aborta la importacion
- `importFullBackup()` → Valida estructura del archivo, doble confirmacion, reemplaza TODO

### Validaciones de Estructura
- `validateDayDataStructure()` → Verifica: `exportInfo.type === 'day_data'`, `fecha`, arrays de `sessions` y `egresos`
- `validateFullBackupStructure()` → Verifica: `backupInfo.type === 'full_backup'`, `createdAt` o `date`

### Compatibilidad
- GAS → GAS: Totalmente compatible
- Local original → GAS: NO compatible (nombres de propiedades diferentes)

## Notas Importantes

### Limites de Google Apps Script
- Ejecucion maxima: 6 minutos por llamada
- Llamadas diarias: 20,000 (suficiente)
- Tamano Spreadsheet: 10 millones de celdas

### Buenas Practicas
- Usar `LockService` para operaciones concurrentes
- Cachear datos frecuentes con `CacheService`
- Validar datos antes de escribir en Sheets
- Manejar errores con try-catch

## Verificacion Sistematica (Para Agentes de IA)

Esta seccion define el proceso automatizado que los agentes deben seguir para verificar y corregir el codigo.

### Proceso de Verificacion Automatica

Ejecutar estos pasos en orden hasta que el reporte de ciclo indique CERO problemas:

#### Ciclo 1: Verificacion de IDs HTML

```bash
# Extraer todos los IDs referenciados en Scripts.html
grep -oE "getElementById\(['\"]([^'\"]+)['\"]\)" gas/Scripts.html | sort -u > /tmp/js_ids.txt

# Extraer todos los IDs definidos en Index.html
grep -oE "id=\"([^\"]+)\"" gas/Index.html | sort -u > /tmp/html_ids.txt

# Comparar: IDs usados en JS pero no definidos en HTML = ERRORES
```

**Regla**: Cada ID usado en `getElementById()` DEBE existir en Index.html. Si no existe:
1. Verificar si el ID es incorrecto en Scripts.html
2. O si falta el elemento en Index.html
3. Corregir segun el codigo original en `5 - Backup del Sistema NeuroTEA con sesion Grupal/`

#### Ciclo 2: Verificacion de Funciones Backend

```bash
# Extraer funciones llamadas desde frontend (google.script.run.FUNCION)
grep -oE "google\.script\.run[^.]*\.([a-zA-Z]+)" gas/Scripts.html | sort -u > /tmp/frontend_calls.txt

# Extraer funciones publicas definidas en backend (.gs)
grep -E "^function [a-zA-Z]+" gas/*.gs | sort -u > /tmp/backend_functions.txt

# Comparar: Llamadas sin funcion backend = ERRORES
```

**Regla**: Cada `google.script.run.nombreFuncion()` DEBE tener una funcion correspondiente en los archivos .gs

#### Ciclo 3: Verificacion de Variables Globales

```bash
# Verificar que todas las variables globales se inicializan y se usan consistentemente
grep -E "^let [a-zA-Z]+ =" gas/Scripts.html  # Declaraciones
grep -E "^  [a-zA-Z]+ = data\." gas/Scripts.html  # Asignaciones desde backend
```

**Regla**: Las variables globales (`sesiones`, `terapeutas`, etc.) deben:
1. Declararse al inicio
2. Inicializarse en `loadInitialData()` y `loadDateData()`
3. Usarse con los mismos nombres de propiedades que devuelve el backend

#### Ciclo 4: Verificacion de Propiedades de Objetos

Backend devuelve objetos con estas propiedades (verificar en TODOS los .gs):

**Sesion Individual** (SessionService.create):
- `id`, `fecha`, `terapeuta`, `paciente`, `efectivo`
- `transferenciaNeurotea`, `transferenciaTerapeuta`, `valorSesion`
- `aporteNeurotea`, `honorarios`, `tipoAporte`, `usaCredito`
- `paqueteId`, `creditosRestantes`, `creadoEn`

**Sesion Grupal** (GroupSessionService.create):
- `id`, `fecha`, `grupoId`, `grupoNombre`, `asistenciaJSON` (array)
- `terapeutasJSON` (array), `cantidadTerapeutas`, `cantidadPresentes`
- `valorTotal`, `porcentajeAporte`, `aporteNeurotea`, `honorariosTotales`
- `honorariosPorTerapeuta`, `residuoHonorarios`, `efectivo`
- `transferenciaNeurotea`, `creadoEn`

**Regla**: El frontend DEBE usar exactamente estos nombres de propiedades al renderizar datos.

#### Ciclo 5: Verificacion de Flujos Completos

Probar cada flujo de principio a fin:

| Flujo | Pasos | Verificar |
|-------|-------|-----------|
| Registrar Sesion | 1. Llenar form → 2. Click registrar → 3. Ver en lista | Lista actualizada |
| Registrar Grupal | 1. Seleccionar grupo → 2. Marcar asistencia → 3. Registrar | Lista actualizada |
| Crear Paquete | 1. Llenar form → 2. Crear → 3. Ver en lista | Lista y creditos |
| Registrar Egreso | 1. Llenar form → 2. Registrar → 3. Ver en lista | Lista y saldo |
| Editar Sesion | 1. Click editar → 2. Modificar → 3. Guardar | Datos actualizados |
| Eliminar Sesion | 1. Click eliminar → 2. Confirmar | Removido de lista |

### Codigo Original de Referencia

El codigo original funcional esta en:
```
5 - Backup del Sistema NeuroTEA con sesion Grupal/neurotea-app_FIXED.js
```

**IMPORTANTE**: El codigo original usa IndexedDB, pero la LOGICA y ESTRUCTURA de las funciones debe replicarse en GAS:

| Original (IndexedDB) | GAS (Google Sheets) |
|----------------------|---------------------|
| `sessions[fecha]` | `sesiones` (array plano por fecha) |
| `updateDailySessionsList(fecha)` | `updateSessionsList()` |
| `formatCurrency(value)` | `formatCurrency(value)` |
| Variables en localStorage | Variables globales JS |

### Errores Comunes a Evitar

1. **IDs fantasma**: Usar `getElementById()` con IDs que no existen
2. **Propiedades incorrectas**: Usar `session.patientName` cuando el backend devuelve `paciente`
3. **Reset de forms inexistentes**: `form.reset()` en elementos null
4. **Event listeners en null**: `element.addEventListener()` cuando element es null
5. **Funciones no definidas**: Llamar funciones helper que nunca se crearon

### Patron de Codigo Seguro

```javascript
// INCORRECTO - puede fallar silenciosamente
document.getElementById('mi-form').reset();

// CORRECTO - con verificacion
const form = document.getElementById('mi-form');
if (form) {
  form.reset();
} else {
  console.warn('Form mi-form no encontrado');
}

// O usar helper safeAddListener para event listeners
function safeAddListener(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
  else console.warn('Elemento no encontrado:', id);
}
```

### Reporte de Ciclo

Despues de cada ciclo de verificacion, generar reporte:

```
=== REPORTE VERIFICACION ===
Fecha: YYYY-MM-DD
Ciclo: N

[ERRORES]
- ID 'session-form' usado en JS pero no existe en HTML
- Funcion 'registrarPaquete' no encontrada en backend
- Propiedad 'patientName' deberia ser 'paciente'

[ADVERTENCIAS]
- Funcion 'formatCurrency' tiene logica diferente al original

[OK]
- Todas las funciones backend estan definidas
- Variables globales correctamente inicializadas

RESULTADO: X errores, Y advertencias
ACCION: Corregir errores y repetir ciclo
=============================
```

### Automatizacion con Agentes

Crear agentes especializados para:

1. **Agente Verificador**: Ejecuta los ciclos de verificacion
2. **Agente Comparador**: Compara codigo GAS vs original
3. **Agente Corrector**: Aplica correcciones basadas en patrones

## Verificacion OBLIGATORIA (Quality Assurance)

### IMPORTANTE: Ejecutar Antes de Cada Commit

Despues de CUALQUIER cambio de codigo, ejecutar el skill de verificacion:

```
/verify-system
```

Este skill verifica automaticamente:
1. IDs HTML vs referencias JavaScript (detecta `null` en runtime)
2. Funciones llamadas vs funciones definidas (detecta errores de llamada)
3. Propiedades de objetos consistentes (detecta `undefined`)
4. Manejo de errores con withFailureHandler

**NO HACER COMMIT hasta que el reporte muestre CERO ERRORES CRITICOS**

### Checklist Pre-Commit

Antes de confirmar que una tarea esta completa:

- [ ] Ejecute `/verify-system`
- [ ] Corregi todos los errores criticos reportados
- [ ] Verifique que los flujos afectados funcionan en TODAS las pestanas
- [ ] No hay errores en consola del navegador (F12)

### Flujos Criticos que Requieren Verificacion Completa

| Flujo | Pestanas Afectadas | Verificar |
|-------|-------------------|-----------|
| Registrar Sesion | Registro + Resumen + Rendicion + Transferencias | Valores correctos en todas |
| Registrar Grupal | Registro + Resumen + Rendicion (proporcional) | Division de honorarios correcta |
| Crear Paquete | Paquetes + Creditos | Ambas hojas creadas |
| Usar Credito | Sesion + Creditos + Rendicion | Creditos decrementados |
| Eliminar Sesion | Sesiones + Creditos + Transferencias | Todo revertido y limpiado |
| Confirmar Rendicion | Rendicion + Confirmaciones | Estado congelado guardado |

### Hooks Automaticos Configurados

El proyecto tiene hooks en `.claude/settings.json` que:

1. **PreToolUse (Edit/Write)**: Recuerda al agente que debe pedir autorizacion al usuario antes de modificar archivos de codigo (.gs, .html). No bloquea la edicion pero emite advertencia visible.
2. **PostToolUse (Edit/Write)**: Verifica balance de llaves `{}` despues de cada edicion en archivos .gs y .html
3. **Stop**: Ejecuta verificacion de IDs al terminar la sesion (IDs usados en JS que no existen en HTML)

Si un hook reporta advertencias, DEBE corregirse antes de continuar.

### Patron de Codigo Seguro

Al crear nuevas funciones, seguir este patron:

**Backend (.gs)**:
```javascript
function miFuncion(parametros) {
  try {
    // logica
    return resultado(true, datos, '');
  } catch (error) {
    Logger.log('Error en miFuncion: ' + error.message);
    return resultado(false, null, error.message);
  }
}
```

**Frontend (Scripts.html)**:
```javascript
google.script.run
  .withSuccessHandler(function(result) {
    if (result.success) {
      // usar result.data
    } else {
      showNotification('Error: ' + result.message, 'error');
    }
  })
  .withFailureHandler(function(error) {
    showNotification('Error: ' + error.message, 'error');
  })
  .miFuncion(parametros);
```

## Historial de Cambios

### v1.6.0 (2026-01-27)
- docs: Agregada REGLA CRITICA de autorizacion obligatoria del usuario antes de cambios de codigo
- docs: Corregida seccion "Migracion" - documentada incompatibilidad entre JSON local y GAS
- docs: Nueva seccion "Comportamiento de Borrado por Entidad" con tabla completa
- docs: Nueva seccion "Import/Export Estado Actual" con estado de compatibilidad
- feat: Nuevo hook PreToolUse que recuerda al agente pedir autorizacion
- docs: Actualizado skill verify-system con Paso 6 de verificacion de borrado
- docs: Hooks documentados actualizados (3 hooks: PreToolUse, PostToolUse, Stop)

### v1.5.1 (2026-01-27)
- fix: `deleteTherapist()` ahora hace borrado permanente (hard delete) en vez de soft delete
- fix: Si el terapeuta tiene registros asociados, ofrece desactivar como alternativa
- feat: Nueva funcion backend `eliminarTerapeuta()` expuesta al frontend
- fix: `TherapistService.create()` eliminada logica de reactivacion (no hay soft delete)
- fix: `validateFullBackupStructure()` corregido campo `date` -> `createdAt` (bug que rechazaba backups validos)

### v1.5.0 (2026-01-27)
- feat: Deteccion de conflictos al importar datos del dia (replica sistema original)
- feat: Nueva funcion `validateDayDataStructure()` para validar estructura de archivo antes de importar
- feat: Nueva funcion `validateFullBackupStructure()` para validar estructura de backup completo
- feat: Nueva funcion `detectDataConflicts()` para detectar datos existentes vs importados (sesiones, grupales, egresos)
- feat: Nueva funcion `showConflictResolutionDialog()` con dialogo modal de fusion/sobrescritura/cancelar
- feat: Nueva funcion `executeDayDataImport()` que ejecuta importacion con modo elegido
- fix: `importDayData()` ahora detecta conflictos antes de enviar al backend
- fix: `importFullBackup()` ahora valida estructura del archivo antes de restaurar
- fix: `importData()` (deprecada) actualizada con validacion y deteccion de conflictos

### v1.4.0 (2026-01-27)
- fix: Corregido calculo de saldo en caja y cuenta NeuroTEA en Dashboard (faltaban confirmaciones)
- feat: Nuevas funciones `calcularSaldoCajaLocal()` y `calcularCuentaNeuroTEALocal()` para calculos dinamicos en frontend
- fix: Agregado `paquetesFecha` a carga de datos iniciales (faltaba en `cargarDatosIniciales`)
- feat: Reconstruido generador de comprobantes/recibos HTML con layout profesional A4 completo
- feat: Reconstruido generador de reporte de rendicion HTML con calculos por terapeuta
- fix: Agregada advertencia de pago grupal `group-payment-warning` en modal de sesion grupal
- fix: `updatePaymentDisplay()` ahora llama `validateRegisterButton()` para validacion en tiempo real
- fix: Boton crear paquete ahora se habilita/deshabilita segun validez del formulario
- feat: Nueva funcion `updateSaldoBadge()` para mostrar estado de saldo inicial en badge
- fix: Inicializacion de `confirmaciones` como array (era `{}`, ahora `[]`)
- Documentacion actualizada con cambios v1.4.0

### v1.3.0 (2026-01-22)
- Agregado sistema de verificacion automatica con hooks
- Nuevo skill `/verify-system` para verificacion completa
- Hooks PostToolUse para validar ediciones
- Hooks Stop para verificacion final
- Seccion de verificacion obligatoria en CLAUDE.md
- Configuracion en `.claude/settings.json`

### v1.2.0 (2025-01-18)
- Agregada seccion de verificacion sistematica para agentes
- Documentados patrones de codigo seguro
- Definidos ciclos de verificacion automatizados

### v1.1.0 (2025-01-17)
- Sistema de autorizacion por correo electronico
- Nueva hoja `Autorizaciones` para gestionar accesos
- Pagina `AccesoDenegado.html` para usuarios no autorizados
- Documentacion actualizada con instrucciones de control de acceso

### v1.0.0 (2025-01-16)
- Migracion inicial desde version local (IndexedDB)
- Implementacion completa de todas las funcionalidades
- Base de datos en Google Sheets
