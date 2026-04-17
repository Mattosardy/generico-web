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
            const mesActual = fechas.primerJueves.getMonth() + 1;
            const anioActual = fechas.primerJueves.getFullYear();
            reservaPrimer = reservas.find((r) => r.tipo_entrega === 'primer_jueves' && r.mes === mesActual && r.año === anioActual);
            reservaUltimo = reservas.find((r) => r.tipo_entrega === 'ultimo_jueves' && r.mes === mesActual && r.año === anioActual);
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
        await renderProximasEntregasEnProductos();
        return;
    }
    if (misReservasWrapper) misReservasWrapper.style.display = 'block';

    const container = document.getElementById('calendarioContainer');
    if (!container) return;

    appState.fechasEntrega = calcularFechasEntrega();
    const reservas = await obtenerReservas(appState.socioData.id);
    const mesActual = appState.fechasEntrega.primerJueves.getMonth() + 1;
    const anioActual = appState.fechasEntrega.primerJueves.getFullYear();
    const reservaPrimer = reservas.find((r) => r.tipo_entrega === 'primer_jueves' && r.mes === mesActual && r.año === anioActual);
    const reservaUltimo = reservas.find((r) => r.tipo_entrega === 'ultimo_jueves' && r.mes === mesActual && r.año === anioActual);
    const puedePrimer = puedeConfirmar(appState.fechasEntrega.primerJueves, configSistema.horasLimitePrimer);
    const puedeUltimo = puedeConfirmar(appState.fechasEntrega.ultimoJueves, configSistema.horasLimiteUltimo);

    container.innerHTML = `
        <div class="entrega-card">
            <div class="entrega-titulo">Primer Jueves</div>
            <div class="entrega-fecha">${appState.fechasEntrega.primerJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaPrimer?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">${reservaPrimer?.estado === 'confirmado' ? `Confirmado: ${reservaPrimer.cantidad_gramos}g` : 'Sin confirmar'}</div>
            ${!reservaPrimer && puedePrimer ? `<div class="opciones-gramos" data-tipo="primer"><div class="opcion-gramo" data-gramos="20">20g</div><div class="opcion-gramo" data-gramos="40">40g</div></div>` : (!puedePrimer && !reservaPrimer ? '<div class="estado-reserva estado-pendiente">Plazo vencido</div>' : '')}
        </div>
        <div class="entrega-card">
            <div class="entrega-titulo">Ultimo Jueves</div>
            <div class="entrega-fecha">${appState.fechasEntrega.ultimoJueves.toLocaleDateString('es')}</div>
            <div class="estado-reserva ${reservaUltimo?.estado === 'confirmado' ? 'estado-confirmado' : 'estado-pendiente'}">${reservaUltimo?.estado === 'confirmado' ? `Confirmado: ${reservaUltimo.cantidad_gramos}g` : 'Sin confirmar'}</div>
            ${!reservaUltimo && puedeUltimo ? `<div class="opciones-gramos" data-tipo="ultimo"><div class="opcion-gramo" data-gramos="20">20g</div><div class="opcion-gramo" data-gramos="40">40g</div></div>` : (!puedeUltimo && !reservaUltimo ? '<div class="estado-reserva estado-pendiente">Plazo vencido</div>' : '')}
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
    const resultado = await confirmarReserva(appState.socioData.id, gramos, tipo, fechaEntrega);
    if (resultado.success) {
        mostrarMensaje(`Reserva confirmada: ${gramos}g`, true);
        await cargarReservasSocio();
    } else {
        mostrarMensaje(`No se pudo confirmar la reserva: ${resultado.message || 'error desconocido'}`, false);
    }
}

console.log('Socio loaded');
