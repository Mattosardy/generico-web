function sumarGramosReservadosEnCiclo(reservas = [], ciclo = obtenerCicloClub()) {
    return reservas
        .filter((reserva) => reserva?.estado !== 'cancelado' && fechaEstaEnCicloClub(reserva?.fecha_retiro, ciclo))
        .reduce((total, reserva) => total + Number(reserva?.cantidad_gramos || 0), 0);
}

function construirOpcionesReservaHTML(gramosDisponibles, tipo) {
    const opciones = [20, 40].filter((gramos) => gramos <= gramosDisponibles);
    if (!opciones.length) {
        return '<div class="estado-reserva estado-pendiente">Tope mensual alcanzado</div>';
    }
    return `<div class="opciones-gramos" data-tipo="${tipo}">${opciones.map((gramos) => `<div class="opcion-gramo" data-gramos="${gramos}">${gramos}g</div>`).join('')}</div>`;
}

async function renderProximasEntregasEnProductos() {
    const proximasWrapper = document.getElementById('productosProximasEntregas');
    if (proximasWrapper) proximasWrapper.style.display = 'block';
    const container = document.getElementById('calendarioProductos');
    if (!container) return;

    const fechas = calcularFechasEntrega();
    let reservaPrimer = null;
    let reservaUltimo = null;
    const puedePrimer = puedeConfirmar(fechas.primerJueves, configSistema.horasLimitePrimer);
    const puedeUltimo = puedeConfirmar(fechas.ultimoJueves, configSistema.horasLimiteUltimo);

    if (appState.socioData?.id) {
        try {
            const reservas = await obtenerReservas(appState.socioData.id);
            reservaPrimer = reservas.find((r) => r.tipo_entrega === 'primer_jueves' && String(r.fecha_retiro) === fechas.primerJueves.toISOString().slice(0, 10));
            reservaUltimo = reservas.find((r) => r.tipo_entrega === 'ultimo_jueves' && String(r.fecha_retiro) === fechas.ultimoJueves.toISOString().slice(0, 10));
        } catch (error) {
            console.warn('No se pudieron cargar entregas publicas', error);
        }
    }

    container.innerHTML = `
        <div class="entrega-card">
            <div class="entrega-titulo">Primer Jueves</div>
            <div class="entrega-fecha">${fechas.primerJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaPrimer?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">
                ${reservaPrimer?.estado === 'confirmado' ? `Confirmado: ${reservaPrimer.cantidad_gramos}g` : (appState.socioData ? (puedePrimer ? 'Pendiente' : 'Plazo vencido') : 'Para socios')}
            </div>
        </div>
        <div class="entrega-card">
            <div class="entrega-titulo">Ultimo Jueves</div>
            <div class="entrega-fecha">${fechas.ultimoJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaUltimo?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">
                ${reservaUltimo?.estado === 'confirmado' ? `Confirmado: ${reservaUltimo.cantidad_gramos}g` : (appState.socioData ? (puedeUltimo ? 'Pendiente' : 'Plazo vencido') : 'Para socios')}
            </div>
        </div>
    `;
}

async function cargarReservasSocio() {
    const misReservasWrapper = document.getElementById('productosMisReservas');
    if (!appState.socioData?.id) {
        if (misReservasWrapper) misReservasWrapper.style.display = 'none';
        appState.gramosReservadosCiclo = 0;
        appState.cicloClubActual = null;
        await renderProximasEntregasEnProductos();
        return;
    }
    if (misReservasWrapper) misReservasWrapper.style.display = 'block';

    const container = document.getElementById('calendarioContainer');
    if (!container) return;

    appState.fechasEntrega = calcularFechasEntrega();
    appState.cicloClubActual = obtenerCicloClub();
    const reservas = await obtenerReservas(appState.socioData.id);
    const reservaPrimer = reservas.find((r) => r.tipo_entrega === 'primer_jueves' && String(r.fecha_retiro) === appState.fechasEntrega.primerJueves.toISOString().slice(0, 10));
    const reservaUltimo = reservas.find((r) => r.tipo_entrega === 'ultimo_jueves' && String(r.fecha_retiro) === appState.fechasEntrega.ultimoJueves.toISOString().slice(0, 10));
    const puedePrimer = puedeConfirmar(appState.fechasEntrega.primerJueves, configSistema.horasLimitePrimer);
    const puedeUltimo = puedeConfirmar(appState.fechasEntrega.ultimoJueves, configSistema.horasLimiteUltimo);
    const gramosReservadosCiclo = sumarGramosReservadosEnCiclo(reservas, appState.cicloClubActual);
    const gramosRestantesCiclo = Math.max(0, 40 - gramosReservadosCiclo);
    appState.gramosReservadosCiclo = gramosReservadosCiclo;

    container.innerHTML = `
        <div class="estado-reserva estado-confirmado" style="grid-column: 1 / -1; text-align: center;">
            Disponible en este ciclo (${appState.cicloClubActual.etiqueta}): ${gramosRestantesCiclo}g de 40g
        </div>
        <div class="entrega-card">
            <div class="entrega-titulo">Primer Jueves</div>
            <div class="entrega-fecha">${appState.fechasEntrega.primerJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaPrimer?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">${reservaPrimer?.estado === 'confirmado' ? `Confirmado: ${reservaPrimer.cantidad_gramos}g` : 'Sin confirmar'}</div>
            ${!reservaPrimer && puedePrimer ? construirOpcionesReservaHTML(gramosRestantesCiclo, 'primer') : (!puedePrimer && !reservaPrimer ? '<div class="estado-reserva estado-pendiente">Plazo vencido</div>' : '')}
        </div>
        <div class="entrega-card">
            <div class="entrega-titulo">Ultimo Jueves</div>
            <div class="entrega-fecha">${appState.fechasEntrega.ultimoJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaUltimo?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">${reservaUltimo?.estado === 'confirmado' ? `Confirmado: ${reservaUltimo.cantidad_gramos}g` : 'Sin confirmar'}</div>
            ${!reservaUltimo && puedeUltimo ? construirOpcionesReservaHTML(gramosRestantesCiclo, 'ultimo') : (!puedeUltimo && !reservaUltimo ? '<div class="estado-reserva estado-pendiente">Plazo vencido</div>' : '')}
        </div>
    `;

    document.querySelectorAll('.opcion-gramo').forEach((el) => el.addEventListener('click', async () => {
        const gramos = parseInt(el.dataset.gramos, 10);
        const tipo = el.closest('.opciones-gramos').dataset.tipo;
        await confirmarReservaHandler(tipo, gramos);
    }));

    const histContainer = document.getElementById('historialContainer');
    if (histContainer) {
        if (!reservas.length) {
            histContainer.innerHTML = '<div class="loading">No hay retiros registrados</div>';
        } else {
            histContainer.innerHTML = `
                <table class="historial-table">
                    <thead><tr><th>Fecha</th><th>Cantidad</th><th>Estado</th></tr></thead>
                    <tbody>${reservas.map((reserva) => `
                        <tr>
                            <td>${new Date(reserva.fecha_retiro).toLocaleDateString('es')}</td>
                            <td>${reserva.cantidad_gramos}g</td>
                            <td>${reserva.estado === 'confirmado' ? 'Confirmado' : 'Pendiente'}</td>
                        </tr>
                    `).join('')}</tbody>
                </table>
            `;
        }
    }

    await renderProximasEntregasEnProductos();
}

async function confirmarReservaHandler(tipo, gramos) {
    const fechaEntrega = tipo === 'primer' ? appState.fechasEntrega.primerJueves : appState.fechasEntrega.ultimoJueves;
    const horasLimite = tipo === 'primer' ? configSistema.horasLimitePrimer : configSistema.horasLimiteUltimo;
    if (!puedeConfirmar(fechaEntrega, horasLimite)) {
        mostrarMensaje('El plazo expiro', false);
        return;
    }

    const reservas = await obtenerReservas(appState.socioData.id);
    const cicloActual = appState.cicloClubActual || obtenerCicloClub();
    const gramosReservadosCiclo = sumarGramosReservadosEnCiclo(reservas, cicloActual);
    if (gramosReservadosCiclo + gramos > 40) {
        mostrarMensaje(`No podes superar 40g por ciclo. Te quedan ${Math.max(0, 40 - gramosReservadosCiclo)}g.`, false);
        return;
    }

    const resultado = await confirmarReserva(appState.socioData.id, gramos, tipo, fechaEntrega);
    if (resultado.success) {
        mostrarMensaje(`Reserva confirmada: ${gramos}g`, true);
        await cargarReservasSocio();
    } else {
        mostrarMensaje(`No se pudo confirmar la reserva: ${resultado.message || 'error desconocido'}`, false);
    }
}

console.log('Socio loaded');
