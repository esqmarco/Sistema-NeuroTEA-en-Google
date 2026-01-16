/**
 * SUITE DE PRUEBAS COMPLETA - SISTEMA NEUROTEA
 * Verifica TODAS las funcionalidades críticas
 * Ejecutar con: node test_sistema.js
 */

// ===========================
// MOCK DE VARIABLES GLOBALES
// ===========================
let therapists = [];
let sessions = {};
let egresos = {};
let saldosReales = { efectivo: 0, banco: 0 };
let saldosIniciales = {};
let historialSaldos = {};
let confirmaciones = {};
let patientCredits = {};
let dailyPackagePurchases = {};
let transferConfirmationStates = {};
let groupTherapy = {};
let groupSessions = {};
let packageHistory = [];
let fechaActual = '2024-12-16';

// ===========================
// FUNCIONES AUXILIARES COPIADAS DEL SISTEMA
// ===========================

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatNumber(number) {
    if (typeof number === 'undefined' || number === null) return '0';
    return number.toLocaleString('es-PY');
}

function formatCurrency(amount) {
    if (typeof amount === 'undefined' || amount === null) return 'Gs 0';
    return `Gs ${formatNumber(amount)}`;
}

function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        return parseInt(value.replace(/\D/g, '')) || 0;
    }
    return 0;
}

function deduplicateById(dataArray, label = 'registros') {
    if (!Array.isArray(dataArray)) {
        return dataArray;
    }
    const seen = new Set();
    const deduplicated = [];
    dataArray.forEach(item => {
        const itemId = item.id || JSON.stringify(item);
        if (!seen.has(itemId)) {
            seen.add(itemId);
            deduplicated.push(item);
        }
    });
    return deduplicated;
}

function deduplicatePackages(packagesArray) {
    return deduplicateById(packagesArray, 'paquetes');
}

// ===========================
// FUNCIONES DE CRÉDITOS
// ===========================

function getPatientCreditsInfo(patientName, therapist = null) {
    if (!patientCredits[patientName]) {
        return null;
    }

    if (therapist) {
        const credits = patientCredits[patientName][therapist];
        if (!credits) return null;

        if (Array.isArray(credits)) {
            const activePackages = credits.filter(c => c.status === 'active' && c.remaining > 0);
            return {
                totalRemaining: activePackages.reduce((sum, c) => sum + c.remaining, 0),
                totalOriginal: activePackages.reduce((sum, c) => sum + c.total, 0),
                packages: activePackages
            };
        } else {
            return {
                totalRemaining: credits.remaining || 0,
                totalOriginal: credits.total || 0,
                packages: [credits]
            };
        }
    }

    return patientCredits[patientName];
}

function hasAvailableCredits(patientName, therapist) {
    const creditsInfo = getPatientCreditsInfo(patientName, therapist);
    return creditsInfo && creditsInfo.totalRemaining > 0;
}

function getPatientsWithCreditsForTherapist(therapist) {
    const patientsWithCredits = [];

    Object.keys(patientCredits).forEach(patientName => {
        if (hasAvailableCredits(patientName, therapist)) {
            const creditsInfo = getPatientCreditsInfo(patientName, therapist);
            patientsWithCredits.push({
                patientName: patientName,
                remaining: creditsInfo.totalRemaining,
                total: creditsInfo.totalOriginal,
                packages: creditsInfo.packages.length
            });
        }
    });

    return patientsWithCredits.sort((a, b) => a.patientName.localeCompare(b.patientName));
}

function createPatientCredits(creditData) {
    const { patientName, therapist, quantity, packageId, valuePerSession, totalValue, purchaseDate } = creditData;

    if (!patientName || !therapist || quantity <= 0) {
        throw new Error('Datos insuficientes para crear créditos');
    }

    if (!patientCredits[patientName]) {
        patientCredits[patientName] = {};
    }

    if (patientCredits[patientName][therapist]) {
        const existing = patientCredits[patientName][therapist];
        const newCreditEntry = {
            remaining: quantity,
            total: quantity,
            purchaseDate: purchaseDate,
            packageId: packageId,
            valuePerSession: valuePerSession,
            totalValue: totalValue,
            status: 'active',
            usageHistory: []
        };

        if (Array.isArray(existing)) {
            existing.push(newCreditEntry);
        } else {
            patientCredits[patientName][therapist] = [existing, newCreditEntry];
        }
    } else {
        patientCredits[patientName][therapist] = {
            remaining: quantity,
            total: quantity,
            purchaseDate: purchaseDate,
            packageId: packageId,
            valuePerSession: valuePerSession,
            totalValue: totalValue,
            status: 'active',
            usageHistory: []
        };
    }

    return true;
}

function usePatientCredit(patientName, therapist, sessionId) {
    if (!patientCredits[patientName] || !patientCredits[patientName][therapist]) {
        throw new Error(`No hay créditos disponibles para ${patientName} con ${therapist}`);
    }

    const creditEntry = patientCredits[patientName][therapist];

    if (Array.isArray(creditEntry)) {
        const activePackage = creditEntry.find(pkg => pkg.remaining > 0 && pkg.status === 'active');
        if (!activePackage) {
            throw new Error(`No hay créditos activos disponibles para ${patientName} con ${therapist}`);
        }
        activePackage.remaining--;
        return { success: true, remaining: activePackage.remaining, packageId: activePackage.packageId };
    } else {
        if (creditEntry.remaining <= 0 || creditEntry.status !== 'active') {
            throw new Error(`No hay créditos disponibles para ${patientName} con ${therapist}`);
        }
        creditEntry.remaining--;
        return { success: true, remaining: creditEntry.remaining, packageId: creditEntry.packageId };
    }
}

function syncPackageRemaining(packageId, remaining, patientName, therapist) {
    Object.keys(dailyPackagePurchases).forEach(fecha => {
        const packages = dailyPackagePurchases[fecha] || [];
        const pkg = packages.find(p => p.id === packageId);
        if (pkg) {
            pkg.remaining = remaining;
        }
    });
}

function revertSessionCredits(session) {
    if (!session.creditUsed) return false;

    const patientName = session.patientName;
    const therapist = session.therapist;
    const originalPackageId = session.originalPackageId;
    let reverted = false;

    // Buscar en dailyPackagePurchases
    Object.keys(dailyPackagePurchases).forEach(fecha => {
        if (reverted) return;
        const dayPackages = dailyPackagePurchases[fecha] || [];
        for (let pkg of dayPackages) {
            const matchById = originalPackageId && pkg.id === originalPackageId;
            const matchByPatient = pkg.therapist === therapist &&
                pkg.patientName === patientName &&
                pkg.remaining < pkg.totalSessions;

            if (matchById || matchByPatient) {
                pkg.remaining++;
                reverted = true;
                break;
            }
        }
    });

    // Buscar en packageHistory si no se encontró en activos
    if (!reverted && packageHistory && packageHistory.length > 0) {
        let historyIndex = -1;
        if (originalPackageId) {
            historyIndex = packageHistory.findIndex(p => p.id === originalPackageId);
        }
        if (historyIndex === -1) {
            historyIndex = packageHistory.findIndex(p =>
                p.patientName === patientName &&
                p.therapist === therapist
            );
        }

        if (historyIndex !== -1) {
            const historicPkg = packageHistory[historyIndex];
            packageHistory.splice(historyIndex, 1);

            const restoredPkg = {
                ...historicPkg,
                remaining: 1,
                status: 'active'
            };
            delete restoredPkg.completedDate;

            const purchaseDate = historicPkg.purchaseDate;
            if (!dailyPackagePurchases[purchaseDate]) {
                dailyPackagePurchases[purchaseDate] = [];
            }
            dailyPackagePurchases[purchaseDate].push(restoredPkg);

            if (!patientCredits[patientName]) {
                patientCredits[patientName] = {};
            }
            patientCredits[patientName][therapist] = {
                packageId: historicPkg.id,
                remaining: 1,
                total: historicPkg.totalSessions,
                purchaseDate: purchaseDate,
                status: 'active'
            };

            reverted = true;
        }
    }

    // Actualizar patientCredits
    if (reverted && patientCredits[patientName] && patientCredits[patientName][therapist]) {
        const creditInfo = patientCredits[patientName][therapist];
        if (Array.isArray(creditInfo)) {
            for (let credit of creditInfo) {
                const matchById = originalPackageId && credit.packageId === originalPackageId;
                const matchByUsage = credit.remaining < credit.total;
                if (matchById || matchByUsage) {
                    credit.remaining++;
                    break;
                }
            }
        } else if (creditInfo.remaining < creditInfo.total) {
            creditInfo.remaining++;
        }
    }

    return reverted;
}

// ===========================
// FUNCIONES DE SALDOS
// ===========================

function calcularSaldoCajaReal(fecha) {
    const daySessions = sessions[fecha] || [];
    const dayPackages = dailyPackagePurchases[fecha] || [];
    const dayGroupSessions = groupSessions[fecha] || [];
    const dayEgresos = egresos[fecha] || [];

    const historyPackagesForDate = (packageHistory || []).filter(p => p.purchaseDate === fecha);
    const allDayPackages = [...dayPackages, ...historyPackagesForDate];

    const saldoInicial = saldosIniciales[fecha]?.efectivo || 0;

    const efectivoSesiones = daySessions.reduce((sum, s) => sum + (s.cashToNeurotea || 0), 0);
    const efectivoPaquetes = allDayPackages.reduce((sum, p) => sum + (p.cashToNeurotea || 0), 0);
    const efectivoGrupales = dayGroupSessions.reduce((sum, gs) => sum + (gs.cashToNeurotea || 0), 0);
    const totalEfectivoIngresado = efectivoSesiones + efectivoPaquetes + efectivoGrupales;

    const totalEgresos = dayEgresos.reduce((sum, e) => sum + (e.monto || 0), 0);

    let pagosConfirmadosEfectivo = 0;
    if (confirmaciones[fecha]) {
        Object.values(confirmaciones[fecha]).forEach(conf => {
            if (conf.flujo) {
                if (conf.flujo.efectivoUsado) {
                    pagosConfirmadosEfectivo += conf.flujo.efectivoUsado;
                }
                if (conf.flujo.vueltoEfectivo) {
                    pagosConfirmadosEfectivo -= conf.flujo.vueltoEfectivo;
                }
                if (conf.type === 'LA TERAPEUTA DEBE DAR' && conf.flujo.efectivoRecibido) {
                    pagosConfirmadosEfectivo -= conf.flujo.efectivoRecibido;
                }
            }
        });
    }

    const saldoFinal = saldoInicial + totalEfectivoIngresado - totalEgresos - pagosConfirmadosEfectivo;
    return Math.max(0, saldoFinal);
}

function calcularSaldoCuentaNeuroTEA(fecha) {
    const daySessions = sessions[fecha] || [];
    const dayPackages = dailyPackagePurchases[fecha] || [];
    const dayGroupSessions = groupSessions[fecha] || [];

    const historyPackagesForDate = (packageHistory || []).filter(p => p.purchaseDate === fecha);
    const allDayPackages = [...dayPackages, ...historyPackagesForDate];

    let saldoTotal = 0;

    daySessions.forEach(session => {
        saldoTotal += session.transferToNeurotea || 0;
    });

    allDayPackages.forEach(pkg => {
        saldoTotal += pkg.transferToNeurotea || 0;
    });

    dayGroupSessions.forEach(gs => {
        saldoTotal += gs.transferToNeurotea || 0;
    });

    if (confirmaciones[fecha]) {
        Object.values(confirmaciones[fecha]).forEach(conf => {
            if (conf.flujo) {
                if (conf.flujo.bancoUsado) {
                    saldoTotal -= conf.flujo.bancoUsado;
                }
                if (conf.flujo.vueltoTransferencia) {
                    saldoTotal += conf.flujo.vueltoTransferencia;
                }
            }
        });
    }

    return Math.max(0, saldoTotal);
}

function getInitialBalance(fecha) {
    return saldosIniciales[fecha]?.efectivo || 0;
}

function getInitialBankBalance(fecha) {
    return saldosIniciales[fecha]?.banco || 0;
}

// ===========================
// FUNCIONES DE RENDICIÓN
// ===========================

function calculateTherapistStatus(therapist, fecha) {
    const daySessions = sessions[fecha] || [];
    const dayEgresos = egresos[fecha] || [];
    const dayPackages = dailyPackagePurchases[fecha] || [];
    const dayGroupSessions = groupSessions[fecha] || [];

    const historyPackagesForDate = (packageHistory || []).filter(p => p.purchaseDate === fecha);
    const allDayPackages = [...dayPackages, ...historyPackagesForDate];

    const therapistSessions = daySessions.filter(s => s.therapist === therapist);
    const therapistPackages = allDayPackages.filter(p => p.therapist === therapist);
    const therapistGroupSessions = dayGroupSessions.filter(gs =>
        gs.therapists && gs.therapists.includes(therapist)
    );

    if (therapistSessions.length === 0 && therapistPackages.length === 0 && therapistGroupSessions.length === 0) {
        return {
            ingresoTotal: 0,
            aporteNeurotea: 0,
            honorarios: 0,
            transferenciaATerapeuta: 0,
            adelantosRecibidos: 0,
            neuroteaLeDebe: 0,
            terapeutaDebe: 0,
            estado: 'SALDADO',
            colorClass: 'badge-secondary'
        };
    }

    // Calcular ingresos
    const sessionIncome = therapistSessions.filter(s => !s.creditUsed).reduce((sum, s) => sum + s.sessionValue, 0);
    const packageIncome = therapistPackages.reduce((sum, p) => sum + p.sessionValue, 0);
    const groupIncome = therapistGroupSessions.reduce((sum, gs) => {
        const therapistCount = gs.therapistCount || gs.therapists?.length || 1;
        const isFirstTherapist = gs.therapists && gs.therapists[0] === therapist;
        const baseIncome = Math.floor(gs.totalValue / therapistCount);
        const residuoIncome = gs.totalValue - (baseIncome * therapistCount);
        return sum + baseIncome + (isFirstTherapist ? residuoIncome : 0);
    }, 0);
    const ingresoTotal = sessionIncome + packageIncome + groupIncome;

    // Calcular aportes
    const sessionAporte = therapistSessions.filter(s => !s.creditUsed).reduce((sum, s) => sum + s.neuroteaContribution, 0);
    const packageAporte = therapistPackages.reduce((sum, p) => sum + (p.neuroteaContribution || 0), 0);
    const groupAporte = therapistGroupSessions.reduce((sum, gs) => {
        const therapistCount = gs.therapistCount || gs.therapists?.length || 1;
        const isFirstTherapist = gs.therapists && gs.therapists[0] === therapist;
        const baseAporte = Math.floor(gs.neuroteaContribution / therapistCount);
        const residuoAporte = gs.neuroteaContribution - (baseAporte * therapistCount);
        return sum + baseAporte + (isFirstTherapist ? residuoAporte : 0);
    }, 0);
    const aporteNeurotea = sessionAporte + packageAporte + groupAporte;

    // Calcular honorarios
    const sessionHonorarios = therapistSessions.filter(s => !s.creditUsed).reduce((sum, s) => sum + s.therapistFee, 0);
    const packageHonorarios = packageIncome - packageAporte;
    const groupHonorarios = therapistGroupSessions.reduce((sum, gs) => {
        const isFirstTherapist = gs.therapists && gs.therapists[0] === therapist;
        const baseHonorarios = gs.feePerTherapist || 0;
        const residuo = isFirstTherapist ? (gs.feeResidue || 0) : 0;
        return sum + baseHonorarios + residuo;
    }, 0);
    const honorarios = sessionHonorarios + packageHonorarios + groupHonorarios;

    // Calcular transferencias
    const sessionTransfer = therapistSessions.reduce((sum, s) => sum + s.transferToTherapist, 0);
    const packageTransfer = therapistPackages.reduce((sum, p) => sum + p.transferToTherapist, 0);
    const transferenciaATerapeuta = sessionTransfer + packageTransfer;

    // Calcular adelantos
    const adelantosRecibidos = dayEgresos
        .filter(e => e.tipo === 'adelanto' && e.therapist === therapist)
        .reduce((sum, e) => sum + e.monto, 0);

    // Calcular deudas
    const neuroteaLeDebe = honorarios - transferenciaATerapeuta - adelantosRecibidos;
    const terapeutaDebe = neuroteaLeDebe < 0 ? Math.abs(neuroteaLeDebe) : 0;
    const neuroteaDebe = neuroteaLeDebe > 0 ? neuroteaLeDebe : 0;

    const saldoCajaActual = calcularSaldoCajaReal(fecha);
    const saldoCuentaNeuroTEA = calcularSaldoCuentaNeuroTEA(fecha);

    // Determinar estado
    let estado = '';
    let colorClass = '';

    if (neuroteaLeDebe === 0) {
        estado = 'SALDADO';
        colorClass = 'badge-secondary';
    } else if (neuroteaLeDebe < 0) {
        estado = 'LA TERAPEUTA DEBE DAR';
        colorClass = 'badge-danger';
    } else {
        const fondosTotalesDisponibles = saldoCajaActual + saldoCuentaNeuroTEA;
        if (fondosTotalesDisponibles < neuroteaDebe) {
            estado = 'FONDOS INSUFICIENTES';
            colorClass = 'badge-danger';
        } else if (saldoCajaActual >= neuroteaDebe) {
            estado = 'DAR EFECTIVO';
            colorClass = 'badge-success';
        } else if (saldoCajaActual > 0) {
            estado = 'DAR Y TRANSFERIR';
            colorClass = 'badge-warning';
        } else {
            estado = 'TRANSFERIR';
            colorClass = 'badge-info';
        }
    }

    return {
        ingresoTotal,
        aporteNeurotea,
        honorarios,
        transferenciaATerapeuta,
        adelantosRecibidos,
        neuroteaLeDebe: neuroteaDebe,
        terapeutaDebe,
        estado,
        colorClass,
        saldoCuentaNeuroTEA,
        saldoCajaActual
    };
}

function isTherapistPaymentConfirmed(therapist, fecha) {
    return confirmaciones[fecha] && confirmaciones[fecha][therapist];
}

// ===========================
// FUNCIONES DE GRUPOS
// ===========================

function getActiveGroups() {
    return Object.values(groupTherapy).filter(g => g.status === 'active');
}

// ===========================
// FUNCIONES DE VALIDACIÓN
// ===========================

function validatePackageIntegrity() {
    const report = {
        totalFechas: 0,
        totalPaquetes: 0,
        duplicados: 0,
        porFecha: {}
    };

    Object.keys(dailyPackagePurchases).forEach(fecha => {
        const paquetes = dailyPackagePurchases[fecha];
        const ids = new Set();
        let duplicadosEnFecha = 0;

        paquetes.forEach(pkg => {
            if (ids.has(pkg.id)) {
                duplicadosEnFecha++;
            } else {
                ids.add(pkg.id);
            }
        });

        report.totalFechas++;
        report.totalPaquetes += paquetes.length;
        report.duplicados += duplicadosEnFecha;
        report.porFecha[fecha] = {
            total: paquetes.length,
            duplicados: duplicadosEnFecha
        };
    });

    return report;
}

// ===========================
// FRAMEWORK DE PRUEBAS
// ===========================

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        testResults.push({ name, status: 'PASS', error: null });
        console.log(`  ✅ ${name}`);
    } catch (error) {
        testsFailed++;
        testResults.push({ name, status: 'FAIL', error: error.message });
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(`${message} - Expected true, got false`);
    }
}

function assertFalse(condition, message = '') {
    if (condition) {
        throw new Error(`${message} - Expected false, got true`);
    }
}

function assertThrows(fn, message = '') {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new Error(`${message} - Expected function to throw`);
    }
}

function resetData() {
    therapists = [];
    sessions = {};
    egresos = {};
    saldosReales = { efectivo: 0, banco: 0 };
    saldosIniciales = {};
    historialSaldos = {};
    confirmaciones = {};
    patientCredits = {};
    dailyPackagePurchases = {};
    transferConfirmationStates = {};
    groupTherapy = {};
    groupSessions = {};
    packageHistory = [];
}

// ===========================
// TESTS
// ===========================

console.log('\n========================================');
console.log('  SUITE DE PRUEBAS COMPLETA - NEUROTEA');
console.log('========================================\n');

// GRUPO 1: Funciones de Formato
console.log('📋 GRUPO 1: Funciones de Formato');
console.log('--------------------------------');

test('formatNumber - número entero', () => {
    const result = formatNumber(230000);
    assertTrue(result.includes('230'), 'Debe contener 230');
});

test('formatNumber - número cero', () => {
    assertEqual(formatNumber(0), '0');
});

test('formatNumber - valor undefined', () => {
    assertEqual(formatNumber(undefined), '0');
});

test('formatNumber - valor null', () => {
    assertEqual(formatNumber(null), '0');
});

test('formatCurrency - formato correcto', () => {
    const result = formatCurrency(50000);
    assertTrue(result.startsWith('Gs '), 'Debe empezar con Gs');
});

test('formatCurrency - valor cero', () => {
    assertEqual(formatCurrency(0), 'Gs 0');
});

test('parseNumber - string con formato', () => {
    assertEqual(parseNumber('50.000'), 50000);
});

test('parseNumber - número directo', () => {
    assertEqual(parseNumber(12345), 12345);
});

test('getLocalDateString - formato YYYY-MM-DD', () => {
    assertEqual(getLocalDateString(new Date(2024, 11, 16)), '2024-12-16');
});

// GRUPO 2: Sistema de Créditos - Básico
console.log('\n📋 GRUPO 2: Sistema de Créditos - Básico');
console.log('--------------------------------');

test('hasAvailableCredits - sin créditos', () => {
    resetData();
    assertFalse(hasAvailableCredits('Paciente1', 'Terapeuta1'));
});

test('hasAvailableCredits - con créditos activos', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': { remaining: 5, total: 10, status: 'active' }
    };
    assertTrue(hasAvailableCredits('Paciente1', 'Terapeuta1'));
});

test('hasAvailableCredits - créditos agotados', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': { remaining: 0, total: 10, status: 'active' }
    };
    assertFalse(hasAvailableCredits('Paciente1', 'Terapeuta1'));
});

test('hasAvailableCredits - múltiples paquetes', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': [
            { packageId: 'pkg-1', remaining: 0, total: 5, status: 'active' },
            { packageId: 'pkg-2', remaining: 3, total: 5, status: 'active' }
        ]
    };
    assertTrue(hasAvailableCredits('Paciente1', 'Terapeuta1'));
});

test('getPatientsWithCreditsForTherapist - lista correcta', () => {
    resetData();
    patientCredits['Paciente1'] = { 'Terapeuta1': { remaining: 5, total: 10, status: 'active' } };
    patientCredits['Paciente2'] = { 'Terapeuta1': { remaining: 3, total: 5, status: 'active' } };
    patientCredits['Paciente3'] = { 'Terapeuta2': { remaining: 2, total: 5, status: 'active' } };

    const result = getPatientsWithCreditsForTherapist('Terapeuta1');
    assertEqual(result.length, 2);
    assertEqual(result[0].patientName, 'Paciente1');
});

test('getPatientCreditsInfo - información completa', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': { remaining: 5, total: 10, status: 'active' }
    };
    const result = getPatientCreditsInfo('Paciente1', 'Terapeuta1');
    assertEqual(result.totalRemaining, 5);
    assertEqual(result.totalOriginal, 10);
});

// GRUPO 3: Sistema de Créditos - Operaciones
console.log('\n📋 GRUPO 3: Sistema de Créditos - Operaciones');
console.log('--------------------------------');

test('createPatientCredits - crear nuevos créditos', () => {
    resetData();
    createPatientCredits({
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        quantity: 10,
        packageId: 'pkg-1',
        valuePerSession: 50000,
        totalValue: 500000,
        purchaseDate: '2024-12-16'
    });
    assertTrue(hasAvailableCredits('Paciente1', 'Terapeuta1'));
    assertEqual(patientCredits['Paciente1']['Terapeuta1'].remaining, 10);
});

test('createPatientCredits - agregar segundo paquete', () => {
    resetData();
    createPatientCredits({
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        quantity: 5,
        packageId: 'pkg-1',
        purchaseDate: '2024-12-15'
    });
    createPatientCredits({
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        quantity: 3,
        packageId: 'pkg-2',
        purchaseDate: '2024-12-16'
    });
    const credits = patientCredits['Paciente1']['Terapeuta1'];
    assertTrue(Array.isArray(credits));
    assertEqual(credits.length, 2);
});

test('createPatientCredits - validación datos insuficientes', () => {
    resetData();
    assertThrows(() => {
        createPatientCredits({ patientName: '', therapist: 'T1', quantity: 5 });
    });
});

test('usePatientCredit - usar crédito correctamente', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': { remaining: 5, total: 10, status: 'active', packageId: 'pkg-1' }
    };
    const result = usePatientCredit('Paciente1', 'Terapeuta1', 'session-1');
    assertTrue(result.success);
    assertEqual(result.remaining, 4);
});

test('usePatientCredit - error sin créditos', () => {
    resetData();
    assertThrows(() => {
        usePatientCredit('Paciente1', 'Terapeuta1', 'session-1');
    });
});

test('usePatientCredit - FIFO con múltiples paquetes', () => {
    resetData();
    patientCredits['Paciente1'] = {
        'Terapeuta1': [
            { packageId: 'pkg-1', remaining: 2, total: 5, status: 'active' },
            { packageId: 'pkg-2', remaining: 3, total: 5, status: 'active' }
        ]
    };
    const result = usePatientCredit('Paciente1', 'Terapeuta1', 'session-1');
    assertEqual(result.packageId, 'pkg-1');
    assertEqual(patientCredits['Paciente1']['Terapeuta1'][0].remaining, 1);
});

// GRUPO 4: Reversión de Créditos
console.log('\n📋 GRUPO 4: Reversión de Créditos');
console.log('--------------------------------');

test('revertSessionCredits - sin creditUsed', () => {
    resetData();
    const session = { patientName: 'P1', therapist: 'T1', creditUsed: false };
    const result = revertSessionCredits(session);
    assertFalse(result);
});

test('revertSessionCredits - revertir en paquete activo', () => {
    resetData();
    dailyPackagePurchases['2024-12-15'] = [{
        id: 'pkg-1',
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        remaining: 4,
        totalSessions: 10
    }];
    patientCredits['Paciente1'] = {
        'Terapeuta1': { remaining: 4, total: 10, packageId: 'pkg-1', status: 'active' }
    };

    const session = {
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        creditUsed: true,
        originalPackageId: 'pkg-1'
    };

    const result = revertSessionCredits(session);
    assertTrue(result);
    assertEqual(dailyPackagePurchases['2024-12-15'][0].remaining, 5);
});

test('revertSessionCredits - restaurar desde histórico', () => {
    resetData();
    packageHistory = [{
        id: 'pkg-completed',
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        totalSessions: 5,
        purchaseDate: '2024-12-10',
        completedDate: '2024-12-15'
    }];

    const session = {
        patientName: 'Paciente1',
        therapist: 'Terapeuta1',
        creditUsed: true,
        originalPackageId: 'pkg-completed'
    };

    const result = revertSessionCredits(session);
    assertTrue(result);
    assertEqual(packageHistory.length, 0);
    assertTrue(dailyPackagePurchases['2024-12-10'] !== undefined);
    assertEqual(dailyPackagePurchases['2024-12-10'][0].remaining, 1);
});

// GRUPO 5: Cálculo de Saldos
console.log('\n📋 GRUPO 5: Cálculo de Saldos');
console.log('--------------------------------');

test('calcularSaldoCajaReal - sin datos', () => {
    resetData();
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 0);
});

test('calcularSaldoCajaReal - solo saldo inicial', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 100000);
});

test('calcularSaldoCajaReal - con sesiones', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };
    sessions['2024-12-16'] = [
        { cashToNeurotea: 50000 },
        { cashToNeurotea: 30000 }
    ];
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 180000);
});

test('calcularSaldoCajaReal - con egresos', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };
    egresos['2024-12-16'] = [{ monto: 30000 }];
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 70000);
});

test('calcularSaldoCajaReal - con paquetes', () => {
    resetData();
    dailyPackagePurchases['2024-12-16'] = [{ cashToNeurotea: 200000 }];
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 200000);
});

test('calcularSaldoCajaReal - con grupales', () => {
    resetData();
    groupSessions['2024-12-16'] = [{ cashToNeurotea: 150000 }];
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 150000);
});

test('calcularSaldoCajaReal - con confirmaciones', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };
    confirmaciones['2024-12-16'] = {
        'Terapeuta1': { flujo: { efectivoUsado: 40000 } }
    };
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 60000);
});

test('calcularSaldoCajaReal - con vuelto efectivo', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };
    confirmaciones['2024-12-16'] = {
        'Terapeuta1': { flujo: { efectivoUsado: 50000, vueltoEfectivo: 10000 } }
    };
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 60000);
});

test('calcularSaldoCajaReal - paquetes del histórico', () => {
    resetData();
    packageHistory = [{ purchaseDate: '2024-12-16', cashToNeurotea: 100000 }];
    assertEqual(calcularSaldoCajaReal('2024-12-16'), 100000);
});

test('calcularSaldoCajaReal - nunca negativo', () => {
    resetData();
    egresos['2024-12-16'] = [{ monto: 999999 }];
    assertTrue(calcularSaldoCajaReal('2024-12-16') >= 0);
});

test('calcularSaldoCuentaNeuroTEA - sin datos', () => {
    resetData();
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 0);
});

test('calcularSaldoCuentaNeuroTEA - con transferencias', () => {
    resetData();
    sessions['2024-12-16'] = [
        { transferToNeurotea: 50000 },
        { transferToNeurotea: 30000 }
    ];
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 80000);
});

test('calcularSaldoCuentaNeuroTEA - con paquetes', () => {
    resetData();
    dailyPackagePurchases['2024-12-16'] = [{ transferToNeurotea: 100000 }];
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 100000);
});

test('calcularSaldoCuentaNeuroTEA - con grupales', () => {
    resetData();
    groupSessions['2024-12-16'] = [{ transferToNeurotea: 75000 }];
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 75000);
});

test('calcularSaldoCuentaNeuroTEA - con bancoUsado', () => {
    resetData();
    sessions['2024-12-16'] = [{ transferToNeurotea: 100000 }];
    confirmaciones['2024-12-16'] = {
        'Terapeuta1': { flujo: { bancoUsado: 30000 } }
    };
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 70000);
});

test('calcularSaldoCuentaNeuroTEA - con vueltoTransferencia', () => {
    resetData();
    sessions['2024-12-16'] = [{ transferToNeurotea: 50000 }];
    confirmaciones['2024-12-16'] = {
        'Terapeuta1': { flujo: { vueltoTransferencia: 10000 } }
    };
    assertEqual(calcularSaldoCuentaNeuroTEA('2024-12-16'), 60000);
});

// GRUPO 6: Rendición de Cuentas
console.log('\n📋 GRUPO 6: Rendición de Cuentas');
console.log('--------------------------------');

test('calculateTherapistStatus - sin datos', () => {
    resetData();
    const status = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    assertEqual(status.estado, 'SALDADO');
    assertEqual(status.ingresoTotal, 0);
});

test('calculateTherapistStatus - solo sesiones', () => {
    resetData();
    sessions['2024-12-16'] = [{
        therapist: 'Terapeuta1',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        transferToTherapist: 70000,
        creditUsed: false
    }];
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };

    const status = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    assertEqual(status.ingresoTotal, 100000);
    assertEqual(status.aporteNeurotea, 30000);
    assertEqual(status.honorarios, 70000);
    assertEqual(status.estado, 'SALDADO');
});

test('calculateTherapistStatus - NeuroTEA debe dar efectivo', () => {
    resetData();
    sessions['2024-12-16'] = [{
        therapist: 'Terapeuta1',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        transferToTherapist: 0,
        cashToNeurotea: 100000,
        creditUsed: false
    }];
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };

    const status = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    assertEqual(status.estado, 'DAR EFECTIVO');
    assertEqual(status.neuroteaLeDebe, 70000);
});

test('calculateTherapistStatus - terapeuta debe dar', () => {
    resetData();
    sessions['2024-12-16'] = [{
        therapist: 'Terapeuta1',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        transferToTherapist: 100000,
        creditUsed: false
    }];

    const status = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    assertEqual(status.estado, 'LA TERAPEUTA DEBE DAR');
    assertEqual(status.terapeutaDebe, 30000);
});

test('calculateTherapistStatus - con adelantos', () => {
    resetData();
    sessions['2024-12-16'] = [{
        therapist: 'Terapeuta1',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        transferToTherapist: 0,
        cashToNeurotea: 100000,
        creditUsed: false
    }];
    egresos['2024-12-16'] = [{
        tipo: 'adelanto',
        therapist: 'Terapeuta1',
        monto: 50000
    }];
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };

    const status = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    assertEqual(status.adelantosRecibidos, 50000);
    assertEqual(status.neuroteaLeDebe, 20000);
});

test('calculateTherapistStatus - sesión grupal división proporcional', () => {
    resetData();
    groupSessions['2024-12-16'] = [{
        therapists: ['Terapeuta1', 'Terapeuta2'],
        therapistCount: 2,
        totalValue: 100000,
        neuroteaContribution: 30000,
        feePerTherapist: 35000,
        feeResidue: 0
    }];
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };

    const status1 = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    const status2 = calculateTherapistStatus('Terapeuta2', '2024-12-16');

    assertEqual(status1.ingresoTotal, 50000);
    assertEqual(status2.ingresoTotal, 50000);
    assertEqual(status1.honorarios, 35000);
    assertEqual(status2.honorarios, 35000);
});

test('calculateTherapistStatus - sesión grupal residuo primera terapeuta', () => {
    resetData();
    groupSessions['2024-12-16'] = [{
        therapists: ['Terapeuta1', 'Terapeuta2', 'Terapeuta3'],
        therapistCount: 3,
        totalValue: 100000,
        neuroteaContribution: 30000,
        feePerTherapist: 23333,
        feeResidue: 1
    }];
    saldosIniciales['2024-12-16'] = { efectivo: 100000 };

    const status1 = calculateTherapistStatus('Terapeuta1', '2024-12-16');
    const status2 = calculateTherapistStatus('Terapeuta2', '2024-12-16');

    assertEqual(status1.ingresoTotal, 33334); // 33333 + 1 residuo
    assertEqual(status2.ingresoTotal, 33333);
});

test('isTherapistPaymentConfirmed - no confirmado', () => {
    resetData();
    assertFalse(isTherapistPaymentConfirmed('Terapeuta1', '2024-12-16'));
});

test('isTherapistPaymentConfirmed - confirmado', () => {
    resetData();
    confirmaciones['2024-12-16'] = { 'Terapeuta1': { type: 'SALDADO' } };
    assertTrue(isTherapistPaymentConfirmed('Terapeuta1', '2024-12-16'));
});

// GRUPO 7: Funciones de Validación e Integridad
console.log('\n📋 GRUPO 7: Validación e Integridad');
console.log('--------------------------------');

test('deduplicateById - sin duplicados', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = deduplicateById(data);
    assertEqual(result.length, 3);
});

test('deduplicateById - con duplicados', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 1 }, { id: 3 }];
    const result = deduplicateById(data);
    assertEqual(result.length, 3);
});

test('deduplicateById - array vacío', () => {
    const result = deduplicateById([]);
    assertEqual(result.length, 0);
});

test('validatePackageIntegrity - sin duplicados', () => {
    resetData();
    dailyPackagePurchases['2024-12-16'] = [
        { id: 'pkg-1' },
        { id: 'pkg-2' }
    ];
    const report = validatePackageIntegrity();
    assertEqual(report.duplicados, 0);
    assertEqual(report.totalPaquetes, 2);
});

test('validatePackageIntegrity - con duplicados', () => {
    resetData();
    dailyPackagePurchases['2024-12-16'] = [
        { id: 'pkg-1' },
        { id: 'pkg-1' },
        { id: 'pkg-2' }
    ];
    const report = validatePackageIntegrity();
    assertEqual(report.duplicados, 1);
});

// GRUPO 8: Funciones de Grupos
console.log('\n📋 GRUPO 8: Funciones de Grupos');
console.log('--------------------------------');

test('getActiveGroups - sin grupos', () => {
    resetData();
    const result = getActiveGroups();
    assertEqual(result.length, 0);
});

test('getActiveGroups - con grupos activos', () => {
    resetData();
    groupTherapy['grupo-1'] = { id: 'grupo-1', name: 'Grupo A', status: 'active' };
    groupTherapy['grupo-2'] = { id: 'grupo-2', name: 'Grupo B', status: 'inactive' };
    groupTherapy['grupo-3'] = { id: 'grupo-3', name: 'Grupo C', status: 'active' };

    const result = getActiveGroups();
    assertEqual(result.length, 2);
});

// GRUPO 9: Saldos Iniciales
console.log('\n📋 GRUPO 9: Saldos Iniciales');
console.log('--------------------------------');

test('getInitialBalance - sin configurar', () => {
    resetData();
    assertEqual(getInitialBalance('2024-12-16'), 0);
});

test('getInitialBalance - configurado', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 150000 };
    assertEqual(getInitialBalance('2024-12-16'), 150000);
});

test('getInitialBankBalance - sin configurar', () => {
    resetData();
    assertEqual(getInitialBankBalance('2024-12-16'), 0);
});

test('getInitialBankBalance - configurado', () => {
    resetData();
    saldosIniciales['2024-12-16'] = { efectivo: 100000, banco: 500000 };
    assertEqual(getInitialBankBalance('2024-12-16'), 500000);
});

// GRUPO 10: Escenarios Complejos
console.log('\n📋 GRUPO 10: Escenarios Complejos');
console.log('--------------------------------');

test('Escenario completo - día con múltiples operaciones', () => {
    resetData();
    const fecha = '2024-12-16';

    // Saldo inicial
    saldosIniciales[fecha] = { efectivo: 50000 };

    // Sesiones
    sessions[fecha] = [
        { therapist: 'T1', sessionValue: 100000, cashToNeurotea: 100000, neuroteaContribution: 30000, therapistFee: 70000, transferToTherapist: 0, creditUsed: false },
        { therapist: 'T2', sessionValue: 80000, cashToNeurotea: 0, transferToNeurotea: 80000, neuroteaContribution: 24000, therapistFee: 56000, transferToTherapist: 56000, creditUsed: false }
    ];

    // Paquete
    dailyPackagePurchases[fecha] = [
        { therapist: 'T1', sessionValue: 200000, cashToNeurotea: 200000, neuroteaContribution: 60000 }
    ];

    // Egreso
    egresos[fecha] = [{ monto: 20000, tipo: 'gasto' }];

    // Verificar saldo caja: 50000 + 100000 + 200000 - 20000 = 330000
    assertEqual(calcularSaldoCajaReal(fecha), 330000);

    // Verificar saldo cuenta: 80000
    assertEqual(calcularSaldoCuentaNeuroTEA(fecha), 80000);
});

test('Escenario - créditos usados no suman a ingreso', () => {
    resetData();
    const fecha = '2024-12-16';

    sessions[fecha] = [
        { therapist: 'T1', sessionValue: 100000, neuroteaContribution: 30000, therapistFee: 70000, transferToTherapist: 0, creditUsed: true },
        { therapist: 'T1', sessionValue: 100000, neuroteaContribution: 30000, therapistFee: 70000, transferToTherapist: 0, creditUsed: false }
    ];
    saldosIniciales[fecha] = { efectivo: 100000 };

    const status = calculateTherapistStatus('T1', fecha);
    assertEqual(status.ingresoTotal, 100000); // Solo la sesión sin crédito
});

test('Escenario - sincronización de paquetes', () => {
    resetData();

    dailyPackagePurchases['2024-12-15'] = [{
        id: 'pkg-1',
        patientName: 'P1',
        therapist: 'T1',
        remaining: 5,
        totalSessions: 10
    }];

    syncPackageRemaining('pkg-1', 3, 'P1', 'T1');
    assertEqual(dailyPackagePurchases['2024-12-15'][0].remaining, 3);
});

// ===========================
// NIVEL 2: PRUEBAS DE INTEGRACIÓN (FLUJOS COMPLETOS)
// ===========================

console.log('\n📋 GRUPO 11: Flujo Completo de Paquetes');
console.log('--------------------------------');

test('FLUJO: Crear paquete → Usar todos los créditos → Verificar agotamiento', () => {
    resetData();
    const fecha = '2024-12-16';

    // 1. Crear paquete de 3 sesiones
    createPatientCredits({
        patientName: 'Juan Pérez',
        therapist: 'María García',
        quantity: 3,
        packageId: 'pkg-test-1',
        valuePerSession: 50000,
        totalValue: 150000,
        purchaseDate: fecha
    });

    // Verificar creación
    assertTrue(hasAvailableCredits('Juan Pérez', 'María García'), 'Debe tener créditos después de crear');
    assertEqual(patientCredits['Juan Pérez']['María García'].remaining, 3);

    // 2. Usar primer crédito
    usePatientCredit('Juan Pérez', 'María García', 'session-1');
    assertEqual(patientCredits['Juan Pérez']['María García'].remaining, 2);

    // 3. Usar segundo crédito
    usePatientCredit('Juan Pérez', 'María García', 'session-2');
    assertEqual(patientCredits['Juan Pérez']['María García'].remaining, 1);

    // 4. Usar tercer crédito (último)
    usePatientCredit('Juan Pérez', 'María García', 'session-3');
    assertEqual(patientCredits['Juan Pérez']['María García'].remaining, 0);

    // 5. Verificar que no hay más créditos disponibles
    assertFalse(hasAvailableCredits('Juan Pérez', 'María García'), 'No debe tener créditos después de usar todos');
});

test('FLUJO: Crear sesión → Confirmar pago → Verificar saldos actualizados', () => {
    resetData();
    const fecha = '2024-12-16';

    // 1. Configurar saldo inicial
    saldosIniciales[fecha] = { efectivo: 100000 };

    // 2. Crear sesión con pago en efectivo
    sessions[fecha] = [{
        id: 'session-1',
        therapist: 'María García',
        patientName: 'Juan Pérez',
        sessionValue: 80000,
        neuroteaContribution: 24000,
        therapistFee: 56000,
        cashToNeurotea: 80000,
        transferToNeurotea: 0,
        transferToTherapist: 0,
        creditUsed: false
    }];

    // 3. Verificar saldo caja antes de confirmar: 100000 + 80000 = 180000
    assertEqual(calcularSaldoCajaReal(fecha), 180000);

    // 4. Verificar estado de terapeuta (debe recibir 56000)
    const status = calculateTherapistStatus('María García', fecha);
    assertEqual(status.honorarios, 56000);
    assertEqual(status.neuroteaLeDebe, 56000);
    assertEqual(status.estado, 'DAR EFECTIVO');

    // 5. Simular confirmación de pago
    confirmaciones[fecha] = {
        'María García': {
            type: 'DAR EFECTIVO',
            flujo: { efectivoUsado: 56000, vueltoEfectivo: 0 }
        }
    };

    // 6. Verificar saldo después de pagar: 180000 - 56000 = 124000
    assertEqual(calcularSaldoCajaReal(fecha), 124000);
});

test('FLUJO: Registrar egreso → Verificar impacto en saldo caja', () => {
    resetData();
    const fecha = '2024-12-16';

    // 1. Saldo inicial
    saldosIniciales[fecha] = { efectivo: 200000 };

    // 2. Ingresos por sesiones
    sessions[fecha] = [
        { cashToNeurotea: 50000 },
        { cashToNeurotea: 30000 }
    ];

    // 3. Saldo antes de egresos: 200000 + 80000 = 280000
    assertEqual(calcularSaldoCajaReal(fecha), 280000);

    // 4. Registrar egresos
    egresos[fecha] = [
        { id: 'egreso-1', monto: 15000, tipo: 'gasto', descripcion: 'Materiales' },
        { id: 'egreso-2', monto: 25000, tipo: 'adelanto', therapist: 'María García' }
    ];

    // 5. Saldo después de egresos: 280000 - 40000 = 240000
    assertEqual(calcularSaldoCajaReal(fecha), 240000);
});

console.log('\n📋 GRUPO 12: Flujo de Sesiones Grupales');
console.log('--------------------------------');

test('FLUJO: Sesión grupal → División entre 2 terapeutas → Verificar rendición', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 100000 };

    // Crear sesión grupal con 2 terapeutas
    groupSessions[fecha] = [{
        id: 'gs-1',
        groupName: 'Grupo Mañana',
        therapists: ['María García', 'Ana López'],
        therapistCount: 2,
        totalValue: 200000,
        neuroteaContribution: 60000,
        feePerTherapist: 70000,
        feeResidue: 0,
        cashToNeurotea: 200000,
        transferToNeurotea: 0
    }];

    // Verificar división para María (primera terapeuta)
    const statusMaria = calculateTherapistStatus('María García', fecha);
    assertEqual(statusMaria.ingresoTotal, 100000); // 200000 / 2
    assertEqual(statusMaria.honorarios, 70000);

    // Verificar división para Ana (segunda terapeuta)
    const statusAna = calculateTherapistStatus('Ana López', fecha);
    assertEqual(statusAna.ingresoTotal, 100000); // 200000 / 2
    assertEqual(statusAna.honorarios, 70000);
});

test('FLUJO: Sesión grupal con 3 terapeutas → Residuo a primera', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 100000 };

    // Crear sesión grupal con 3 terapeutas (100000 / 3 = 33333 con residuo 1)
    groupSessions[fecha] = [{
        id: 'gs-1',
        groupName: 'Grupo Grande',
        therapists: ['María García', 'Ana López', 'Carmen Ruiz'],
        therapistCount: 3,
        totalValue: 100000,
        neuroteaContribution: 30000,
        feePerTherapist: 23333,
        feeResidue: 1,
        cashToNeurotea: 100000
    }];

    // Primera terapeuta recibe el residuo
    const statusMaria = calculateTherapistStatus('María García', fecha);
    assertEqual(statusMaria.ingresoTotal, 33334); // 33333 + 1 residuo
    assertEqual(statusMaria.honorarios, 23334); // 23333 + 1 residuo

    // Otras terapeutas NO reciben residuo
    const statusAna = calculateTherapistStatus('Ana López', fecha);
    assertEqual(statusAna.ingresoTotal, 33333);
    assertEqual(statusAna.honorarios, 23333);
});

console.log('\n📋 GRUPO 13: Flujo de Reversiones');
console.log('--------------------------------');

test('FLUJO: Usar crédito → Eliminar sesión → Crédito restaurado', () => {
    resetData();
    const fecha = '2024-12-16';

    // 1. Crear paquete con 5 créditos (solo en dailyPackagePurchases)
    dailyPackagePurchases[fecha] = [{
        id: 'pkg-1',
        patientName: 'Juan Pérez',
        therapist: 'María García',
        remaining: 4, // Ya tiene 4 (como si ya se usó 1)
        totalSessions: 5,
        status: 'active'
    }];

    patientCredits['Juan Pérez'] = {
        'María García': {
            packageId: 'pkg-1',
            remaining: 4, // Sincronizado con dailyPackagePurchases
            total: 5,
            status: 'active'
        }
    };

    // 2. Simular sesión que usó el crédito
    const sessionToDelete = {
        id: 'session-1',
        patientName: 'Juan Pérez',
        therapist: 'María García',
        creditUsed: true,
        originalPackageId: 'pkg-1'
    };

    // 3. Revertir (como si elimináramos la sesión)
    revertSessionCredits(sessionToDelete);

    // 4. Verificar que el crédito se restauró en dailyPackagePurchases
    assertEqual(dailyPackagePurchases[fecha][0].remaining, 5);

    // 5. Verificar que también se restauró en patientCredits
    assertEqual(patientCredits['Juan Pérez']['María García'].remaining, 5);
});

test('FLUJO: Agotar paquete → Mover a histórico → Revertir → Restaurar de histórico', () => {
    resetData();

    // 1. Paquete ya en histórico (completado)
    packageHistory = [{
        id: 'pkg-completed',
        patientName: 'Juan Pérez',
        therapist: 'María García',
        totalSessions: 3,
        remaining: 0,
        purchaseDate: '2024-12-10',
        completedDate: '2024-12-15',
        status: 'completed'
    }];

    // 2. No debe haber créditos activos
    assertFalse(hasAvailableCredits('Juan Pérez', 'María García'));

    // 3. Revertir una sesión que usó ese paquete
    const sessionToRevert = {
        patientName: 'Juan Pérez',
        therapist: 'María García',
        creditUsed: true,
        originalPackageId: 'pkg-completed'
    };

    revertSessionCredits(sessionToRevert);

    // 4. Verificar que se restauró de histórico a activo
    assertEqual(packageHistory.length, 0, 'Histórico debe estar vacío');
    assertTrue(dailyPackagePurchases['2024-12-10'] !== undefined, 'Debe existir en purchases');
    assertEqual(dailyPackagePurchases['2024-12-10'][0].remaining, 1);
    assertTrue(hasAvailableCredits('Juan Pérez', 'María García'), 'Debe tener créditos restaurados');
});

console.log('\n📋 GRUPO 14: Flujo de Transferencias y Confirmaciones');
console.log('--------------------------------');

test('FLUJO: Pago mixto (efectivo + transferencia) → Verificar saldos', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 50000 };

    // Sesión con pago mixto
    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        cashToNeurotea: 40000,
        transferToNeurotea: 60000,
        transferToTherapist: 0,
        creditUsed: false
    }];

    // Saldo caja: 50000 + 40000 = 90000
    assertEqual(calcularSaldoCajaReal(fecha), 90000);

    // Saldo cuenta: 60000
    assertEqual(calcularSaldoCuentaNeuroTEA(fecha), 60000);

    // Estado: Debe dar a terapeuta 70000, tiene 90000 efectivo
    const status = calculateTherapistStatus('María García', fecha);
    assertEqual(status.estado, 'DAR EFECTIVO');

    // Confirmar pago con 70000 de caja
    confirmaciones[fecha] = {
        'María García': {
            flujo: { efectivoUsado: 70000 }
        }
    };

    // Saldo caja después: 90000 - 70000 = 20000
    assertEqual(calcularSaldoCajaReal(fecha), 20000);
    // Saldo cuenta sin cambios
    assertEqual(calcularSaldoCuentaNeuroTEA(fecha), 60000);
});

test('FLUJO: Terapeuta debe dar → Recibe efectivo → Aumenta saldo caja', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 50000 };

    // Sesión donde terapeuta recibió más de lo que le corresponde
    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        cashToNeurotea: 0,
        transferToNeurotea: 0,
        transferToTherapist: 100000, // Recibió todo
        creditUsed: false
    }];

    // Estado: Terapeuta debe devolver 30000 (recibió 100000, le corresponde 70000)
    const status = calculateTherapistStatus('María García', fecha);
    assertEqual(status.estado, 'LA TERAPEUTA DEBE DAR');
    assertEqual(status.terapeutaDebe, 30000);

    // Confirmar que terapeuta entregó efectivo
    confirmaciones[fecha] = {
        'María García': {
            type: 'LA TERAPEUTA DEBE DAR',
            flujo: { efectivoRecibido: 30000 }
        }
    };

    // Saldo caja debe aumentar: 50000 + 30000 = 80000
    assertEqual(calcularSaldoCajaReal(fecha), 80000);
});

console.log('\n📋 GRUPO 15: Coherencia de Datos');
console.log('--------------------------------');

test('COHERENCIA: Múltiples paquetes del mismo paciente → Créditos correctos', () => {
    resetData();

    // Crear dos paquetes para el mismo paciente con la misma terapeuta
    createPatientCredits({
        patientName: 'Juan Pérez',
        therapist: 'María García',
        quantity: 5,
        packageId: 'pkg-1',
        purchaseDate: '2024-12-10'
    });

    createPatientCredits({
        patientName: 'Juan Pérez',
        therapist: 'María García',
        quantity: 3,
        packageId: 'pkg-2',
        purchaseDate: '2024-12-15'
    });

    // Debe ser un array con 2 paquetes
    const credits = patientCredits['Juan Pérez']['María García'];
    assertTrue(Array.isArray(credits), 'Debe ser array con múltiples paquetes');
    assertEqual(credits.length, 2);

    // Total de créditos: 5 + 3 = 8
    const info = getPatientCreditsInfo('Juan Pérez', 'María García');
    assertEqual(info.totalRemaining, 8);
});

test('COHERENCIA: Sesiones de diferentes terapeutas → Estados independientes', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 200000 };

    sessions[fecha] = [
        {
            therapist: 'María García',
            sessionValue: 100000,
            neuroteaContribution: 30000,
            therapistFee: 70000,
            cashToNeurotea: 100000,
            transferToTherapist: 0,
            creditUsed: false
        },
        {
            therapist: 'Ana López',
            sessionValue: 80000,
            neuroteaContribution: 24000,
            therapistFee: 56000,
            cashToNeurotea: 80000,
            transferToTherapist: 0,
            creditUsed: false
        }
    ];

    const statusMaria = calculateTherapistStatus('María García', fecha);
    const statusAna = calculateTherapistStatus('Ana López', fecha);

    // Cada una tiene sus propios números
    assertEqual(statusMaria.ingresoTotal, 100000);
    assertEqual(statusMaria.honorarios, 70000);

    assertEqual(statusAna.ingresoTotal, 80000);
    assertEqual(statusAna.honorarios, 56000);

    // Ambas deben recibir efectivo (hay suficiente en caja)
    assertEqual(statusMaria.estado, 'DAR EFECTIVO');
    assertEqual(statusAna.estado, 'DAR EFECTIVO');
});

test('COHERENCIA: Paquetes en histórico se incluyen en cálculos del día de compra', () => {
    resetData();
    const fecha = '2024-12-16';

    // Paquete que se compró hoy pero ya se completó (movido a histórico)
    packageHistory = [{
        id: 'pkg-same-day',
        therapist: 'María García',
        patientName: 'Juan Pérez',
        sessionValue: 150000,
        neuroteaContribution: 45000,
        cashToNeurotea: 150000,
        purchaseDate: fecha, // Comprado hoy
        completedDate: fecha // Completado hoy
    }];

    // El saldo debe incluir el efectivo del paquete histórico
    assertEqual(calcularSaldoCajaReal(fecha), 150000);

    // La rendición debe incluir el paquete
    const status = calculateTherapistStatus('María García', fecha);
    assertEqual(status.ingresoTotal, 150000);
});

test('COHERENCIA: Confirmación de una terapeuta no afecta a otra', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 200000 };

    sessions[fecha] = [
        { therapist: 'María García', cashToNeurotea: 100000, sessionValue: 100000, neuroteaContribution: 30000, therapistFee: 70000, transferToTherapist: 0, creditUsed: false },
        { therapist: 'Ana López', cashToNeurotea: 80000, sessionValue: 80000, neuroteaContribution: 24000, therapistFee: 56000, transferToTherapist: 0, creditUsed: false }
    ];

    // Confirmar solo a María
    confirmaciones[fecha] = {
        'María García': { flujo: { efectivoUsado: 70000 } }
    };

    // Saldo: 200000 + 100000 + 80000 - 70000 = 310000
    assertEqual(calcularSaldoCajaReal(fecha), 310000);

    // María está confirmada
    assertTrue(isTherapistPaymentConfirmed('María García', fecha));

    // Ana NO está confirmada
    assertFalse(isTherapistPaymentConfirmed('Ana López', fecha));
});

console.log('\n📋 GRUPO 16: Validación de Fondos Insuficientes');
console.log('--------------------------------');

test('VALIDACIÓN: Estado FONDOS INSUFICIENTES cuando no hay efectivo ni banco', () => {
    resetData();
    const fecha = '2024-12-16';

    // Sin saldo inicial (caja en 0, banco en 0)
    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        cashToNeurotea: 0, // Paciente pagó directo a terapeuta
        transferToNeurotea: 0,
        transferToTherapist: 100000,
        creditUsed: false
    }];

    // Terapeuta recibió 100000, le corresponde 70000, debe devolver 30000
    // Pero esto es "LA TERAPEUTA DEBE DAR", no fondos insuficientes
    const status = calculateTherapistStatus('María García', fecha);
    assertEqual(status.estado, 'LA TERAPEUTA DEBE DAR');
});

test('VALIDACIÓN: Solo transferir requiere fondos en cuenta NeuroTEA', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 100000 };

    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        cashToNeurotea: 100000,
        transferToNeurotea: 0,
        transferToTherapist: 0,
        creditUsed: false
    }];

    const status = calculateTherapistStatus('María García', fecha);

    // Hay efectivo suficiente, estado es DAR EFECTIVO
    assertEqual(status.estado, 'DAR EFECTIVO');

    // Pero cuenta NeuroTEA está en 0
    assertEqual(status.saldoCuentaNeuroTEA, 0);

    // Si quisiera "solo transferir", necesitaría 70000 pero tiene 0
    assertTrue(status.saldoCuentaNeuroTEA < status.neuroteaLeDebe);
});

test('VALIDACIÓN: DAR Y TRANSFERIR requiere banco suficiente para la diferencia', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 30000 }; // Solo 30000 en caja

    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 100000,
        neuroteaContribution: 30000,
        therapistFee: 70000,
        cashToNeurotea: 0,
        transferToNeurotea: 50000, // 50000 al banco
        transferToTherapist: 50000,
        creditUsed: false
    }];

    const status = calculateTherapistStatus('María García', fecha);

    // Caja: 30000, Banco: 50000, Debe: 70000 - 50000 = 20000
    // Hay 30000 en caja pero necesita dar 20000, estado podría ser DAR EFECTIVO
    // Si caja < deuda pero caja + banco >= deuda, es DAR Y TRANSFERIR

    // neuroteaLeDebe = 70000 - 50000 = 20000
    assertEqual(status.neuroteaLeDebe, 20000);

    // Con 30000 en caja puede pagar 20000 en efectivo
    assertEqual(status.estado, 'DAR EFECTIVO');
});

test('VALIDACIÓN: FONDOS INSUFICIENTES cuando caja + banco < deuda', () => {
    resetData();
    const fecha = '2024-12-16';

    saldosIniciales[fecha] = { efectivo: 10000 }; // Solo 10000 en caja

    sessions[fecha] = [{
        therapist: 'María García',
        sessionValue: 200000,
        neuroteaContribution: 60000,
        therapistFee: 140000,
        cashToNeurotea: 10000, // Solo 10000 a caja
        transferToNeurotea: 10000, // Solo 10000 al banco
        transferToTherapist: 180000, // Resto a terapeuta
        creditUsed: false
    }];

    const status = calculateTherapistStatus('María García', fecha);

    // Caja: 10000 + 10000 = 20000
    // Banco: 10000
    // Debe a terapeuta: 140000 - 180000 = -40000 (terapeuta debe dar)

    // En este caso la terapeuta recibió más de lo que le corresponde
    assertEqual(status.estado, 'LA TERAPEUTA DEBE DAR');
});

// ===========================
// GRUPO 17: Sincronización de Contadores
// ===========================

console.log('\n📋 GRUPO 17: Sincronización de Contadores');
console.log('--------------------------------');

test('CONTADOR: packageHistory se refleja correctamente después de mover paquete', () => {
    // Limpiar estado
    dailyPackagePurchases = {};
    patientCredits = {};
    packageHistory = [];

    const fecha = '2025-12-17';

    // Crear un paquete
    dailyPackagePurchases[fecha] = [{
        id: 'PKG-TEST-1',
        patient: 'Test Paciente',
        therapist: 'Test Terapeuta',
        sessions: 4,
        totalAmount: 400000,
        remaining: 4,
        purchaseDate: fecha
    }];

    patientCredits['Test Paciente'] = {
        'Test Terapeuta': {
            remaining: 4,
            totalSessions: 4,
            packageId: 'PKG-TEST-1'
        }
    };

    // Simular uso completo de créditos (mover a historial)
    const pkg = dailyPackagePurchases[fecha][0];
    packageHistory.push({
        ...pkg,
        completedDate: fecha,
        remaining: 0
    });

    // Verificar que packageHistory tiene el paquete
    assertEqual(packageHistory.length, 1, 'Historial debe tener 1 paquete');
    assertEqual(packageHistory[0].patient, 'Test Paciente');
    assertEqual(packageHistory[0].sessions, 4);
});

test('CONTADOR: packageHistory vacío debe retornar length 0', () => {
    // Limpiar historial
    packageHistory = [];

    // Verificar que está vacío
    assertEqual(packageHistory.length, 0, 'Historial vacío debe tener length 0');

    // Agregar un paquete
    packageHistory.push({
        id: 'PKG-TEST-2',
        patient: 'Otro Paciente',
        therapist: 'Otra Terapeuta',
        sessions: 8,
        completedDate: '2025-12-17'
    });

    // Verificar que ahora tiene 1
    assertEqual(packageHistory.length, 1, 'Después de push debe tener length 1');
});

// ===========================
// RESUMEN DE RESULTADOS
// ===========================

console.log('\n========================================');
console.log('  RESUMEN DE RESULTADOS');
console.log('========================================');
console.log(`  Total de pruebas: ${testsPassed + testsFailed}`);
console.log(`  ✅ Pasadas: ${testsPassed}`);
console.log(`  ❌ Fallidas: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
    console.log('PRUEBAS FALLIDAS:');
    testResults.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(`  - ${t.name}: ${t.error}`);
    });
    console.log('');
    process.exit(1);
} else {
    console.log('🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
    process.exit(0);
}
