# NeuroTEA - Sistema de Gestion en Google Apps Script

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
| `Sesiones` | Sesiones individuales | id, fecha, terapeuta, paciente, valor, efectivo, transferenciaNeurotea, transferenciaTerminapeuta, aporte, honorarios, usaCredito |
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

### Pasos de Migracion
1. Exportar backup completo de la version local
2. Importar en la nueva version GAS
3. Verificar integridad de datos en cada hoja
4. Validar calculos de rendicion

### Compatibilidad de Datos
- El formato de backup JSON es compatible
- Los IDs se mantienen para referencias cruzadas
- Las fechas mantienen formato YYYY-MM-DD

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

## Historial de Cambios

### v1.1.0 (2025-01-17)
- Sistema de autorizacion por correo electronico
- Nueva hoja `Autorizaciones` para gestionar accesos
- Pagina `AccesoDenegado.html` para usuarios no autorizados
- Documentacion actualizada con instrucciones de control de acceso

### v1.0.0 (2025-01-16)
- Migracion inicial desde version local (IndexedDB)
- Implementacion completa de todas las funcionalidades
- Base de datos en Google Sheets
