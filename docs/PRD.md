# PRD - Product Requirements Document
## Sistema NeuroTEA en Google Apps Script

**Versión**: 1.7.2
**Última actualización**: 2026-01-31
**Estado**: Producción

---

## 1. Resumen Ejecutivo

Sistema web de gestión para centro de terapias TEA (Trastorno del Espectro Autista) implementado en Google Apps Script. Permite registrar sesiones individuales y grupales, gestionar pagos, egresos, paquetes/créditos y generar rendiciones de cuentas.

### Objetivos del Producto
- Centralizar la gestión administrativa del centro de terapias
- Automatizar cálculos de honorarios y rendiciones
- Facilitar el seguimiento de pagos y transferencias
- Proveer reportes para toma de decisiones

---

## 2. Arquitectura del Sistema

### Stack Tecnológico
| Componente | Tecnología |
|------------|------------|
| Backend | Google Apps Script (GAS) |
| Frontend | HTML5 + Tailwind CSS + JavaScript |
| Base de datos | Google Sheets |
| Reportes | HTML generado |
| Iconos | Lucide Icons (CDN) |

### Estructura de Archivos
```
gas/
├── Code.gs              # Punto de entrada
├── Config.gs            # Configuración global
├── Database.gs          # Capa de acceso a datos
├── TherapistService.gs  # CRUD terapeutas
├── SessionService.gs    # CRUD sesiones individuales
├── GroupSessionService.gs # CRUD sesiones grupales
├── GroupService.gs      # Gestión de grupos
├── EgresoService.gs     # CRUD egresos
├── PackageService.gs    # Sistema de paquetes
├── RendicionService.gs  # Cálculos de rendición
├── TransferService.gs   # Gestión de transferencias
├── BackupService.gs     # Import/Export
├── Helpers.gs           # Funciones auxiliares
├── Index.html           # Página principal
├── Styles.html          # CSS
├── Scripts.html         # JavaScript cliente
└── AccesoDenegado.html  # Acceso denegado
```

---

## 3. Módulos Funcionales

### 3.1 Registro Diario (Pestaña 1)
**Propósito**: Registrar sesiones de terapia

**Funcionalidades**:
- Registro de sesiones individuales
- Registro de sesiones grupales
- Uso de créditos prepagados
- Cálculo automático de honorarios y aportes
- Edición y eliminación de sesiones

**Flujos de datos**:
- Sesión normal → Registro + Resumen + Rendición + Transferencias
- Sesión grupal → División proporcional entre terapeutas
- Uso crédito → Decrementa paquete + Valor Gs 0 en rendición

### 3.2 Resumen Global (Pestaña 2)
**Propósito**: Dashboard con totales del día

**Métricas mostradas**:
- Saldo en caja (efectivo disponible)
- Cuenta NeuroTEA (transferencias recibidas)
- Total egresos del día
- Ingreso total y aporte NeuroTEA

**Cálculos dinámicos**:
```javascript
saldoCaja = saldoInicial + efectivoSesiones + efectivoPaquetes
          + efectivoGrupales - egresos - pagosConfirmados
```

### 3.3 Transferencias (Pestaña 3)
**Propósito**: Gestionar transferencias pendientes/confirmadas

**Tipos de transferencias**:
- Transferencia a NeuroTEA (de sesiones)
- Transferencia a Terapeuta (de sesiones)
- Transferencias de paquetes

**Estados**:
- Pendiente (toggle desactivado)
- Confirmada (toggle activado)

### 3.4 Rendición de Cuentas (Pestaña 4)
**Propósito**: Calcular pagos a terapeutas

**Estados posibles**:
| Estado | Descripción | Color |
|--------|-------------|-------|
| SALDADO | Sin deuda | Gris |
| DAR EFECTIVO | NeuroTEA debe pagar | Verde |
| DAR Y TRANSFERIR | Pago mixto | Naranja |
| TRANSFERIR | Solo transferencia | Azul |
| LA TERAPEUTA DEBE DAR | Terapeuta debe | Rojo |
| FONDOS INSUFICIENTES | Sin fondos | Rojo |

**Reportes**:
- Generación de comprobante HTML
- Detalle de sesiones, egresos, adelantos

### 3.5 Egresos (Pestaña 5)
**Propósito**: Registrar gastos y adelantos

**Tipos de egresos**:
- `gasto-neurotea`: Gastos generales
- `adelanto`: Adelantos a terapeutas

### 3.6 Gestión de Terapeutas (Pestaña 6)
**Propósito**: CRUD de terapeutas

**Operaciones**:
- Crear terapeuta
- Desactivar terapeuta (si tiene registros)
- Eliminar terapeuta (si no tiene registros)

### 3.7 Paquetes/Créditos (Pestaña 7)
**Propósito**: Gestionar prepagos de sesiones

**Flujo de créditos**:
1. Compra de paquete → Crea créditos
2. Uso de crédito → Decrementa restante
3. Créditos agotados → Mover a historial

### 3.8 Gestionar Grupos (Pestaña 8)
**Propósito**: Configurar grupos de terapia

**Configuración**:
- Nombre del grupo
- Niños participantes
- Porcentaje de aporte (20%, 30%, fijo)

### 3.9 Administración (Pestaña 9)
**Propósito**: Backup y restauración

**Funcionalidades**:
- Exportar datos del día
- Exportar backup completo
- Importar datos del día (con detección de conflictos)
- Restaurar backup completo

---

## 4. Base de Datos (Google Sheets)

### Hojas del Sistema
| Hoja | Descripción |
|------|-------------|
| Terapeutas | Lista de terapeutas activos |
| Sesiones | Sesiones individuales |
| SesionesGrupales | Sesiones de grupo |
| Egresos | Gastos y adelantos |
| Confirmaciones | Confirmaciones de pago |
| Paquetes | Paquetes activos |
| HistorialPaquetes | Paquetes completados |
| Grupos | Configuración de grupos |
| Creditos | Créditos activos |
| SaldosIniciales | Saldo inicial por fecha |
| EstadosTransferencia | Estados de confirmación |
| Configuracion | Configuración general |
| Autorizaciones | Correos autorizados |

---

## 5. Seguridad

### Control de Acceso
- Verificación por correo electrónico
- Lista blanca en hoja `Autorizaciones`
- Página de acceso denegado para no autorizados

### Configuración de Despliegue
- Ejecutar como: "Usuario que accede a la aplicación"
- Acceso: "Cualquier persona" (filtrado por autorización)

---

## 6. Métricas de Calidad

### Estado Actual (2026-01-31)
| Métrica | Valor |
|---------|-------|
| Cobertura funciones frontend/backend | 100% |
| Consistencia propiedades objetos | 99%+ |
| IDs HTML/JS consistentes | 100% |
| Handlers de error implementados | 95.7% |

### Código Muerto Identificado
- 13 funciones helper no utilizadas en Helpers.gs
- ~10 funciones públicas nunca llamadas desde frontend

### Bugs Conocidos
- getElementById sin validación null (severidad: media)
- Event listeners potencialmente duplicados (severidad: baja)

---

## 7. Roadmap Futuro

### Próximas Mejoras (Sugeridas)
1. Limpiar código muerto identificado
2. Agregar validación null a getElementById
3. Implementar event delegation para listeners
4. Agregar tests automatizados

### Mejoras Opcionales
- Dashboard con gráficos
- Notificaciones por email
- Exportación a PDF
- Histórico de cambios por registro

---

## 8. Documentación Relacionada

- [CLAUDE.md](../CLAUDE.md) - Instrucciones para desarrollo
- [CHANGELOG.md](../CHANGELOG.md) - Historial de cambios
- [LECCIONES_APRENDIDAS.md](./LECCIONES_APRENDIDAS.md) - Errores a evitar
- [SKILL.md](../.claude/skills/verify-system/SKILL.md) - Skill de verificación

---

**Última revisión**: 2026-01-31 por análisis automatizado
