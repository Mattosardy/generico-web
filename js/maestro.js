const seccionesMaestroImplementadas = ['historia', 'socios', 'config'];

async function cargarMaestroDataCompleta() {
    const cards = document.getElementById('maestroCards');
    if (!cards) return;
    const [socios, admins] = await Promise.all([
        supabaseClient.from('socios').select('*', { count: 'exact', head: true }),
        supabaseClient.from('socios').select('*', { count: 'exact', head: true }).in('rol', ['admin', 'maestro'])
    ]);
    cards.innerHTML = `
        <div class="card"><div class="card-number">${socios.count || 0}</div><div class="card-label">Socios</div></div>
        <div class="card"><div class="card-number">${admins.count || 0}</div><div class="card-label">Admins</div></div>
    `;
    await cargarMaestroHistoria();
    await cargarMaestroSocios();
    await cargarMaestroConfig();
}

async function cargarMaestroHistoria() {
    const container = document.getElementById('maestro-historia');
    if (!container) return;

    const configMap = await cargarContenidoInstitucional();
    const historiaTexto = configMap.historia_texto || 'nacio como una propuesta boutique pensada para convertir cada variedad en una experiencia visual, aspiracional y facil de recordar.';
    const cifraSocios = configMap.cifra_socios || '250';
    const cifraCepas = configMap.cifra_cepas || '6';
    const cifraAnios = configMap.cifra_anios || '4';
    const historiaGaleria = configMap.historia_galeria || '[]';
    const imagenesHistoria = normalizarListaImagenes(historiaGaleria);

    container.innerHTML = `
        <h3 style="color:#e0ecd0;">Editar historia</h3>
        <div class="form-grid">
            <div class="form-group full-width">
                <label>Texto principal</label>
                <textarea id="historiaTexto" rows="6" style="background:rgba(8,15,6,0.8);border-radius:12px;padding:12px;color:#e0ecd0;">${escapeHtml(historiaTexto)}</textarea>
            </div>
            <div class="form-group">
                <label>Socios activos</label>
                <input type="number" id="cifraSocios" value="${escapeHtml(cifraSocios)}">
            </div>
            <div class="form-group">
                <label>Dato secundario</label>
                <input type="number" id="cifraCepas" value="${escapeHtml(cifraCepas)}">
            </div>
            <div class="form-group">
                <label>Dato terciario</label>
                <input type="number" id="cifraAnios" value="${escapeHtml(cifraAnios)}">
            </div>
            <div class="form-group full-width">
                <label>Imagenes de historia por URL (una por linea)</label>
                <textarea id="historiaImagenesUrls" rows="4" style="background:rgba(8,15,6,0.8);border-radius:12px;padding:12px;color:#e0ecd0;">${escapeHtml(imagenesHistoria.join('\n'))}</textarea>
            </div>
            <div class="form-group full-width">
                <label>Subir varias imagenes</label>
                <input type="file" id="historiaImagenesFiles" accept="image/*" multiple style="background:rgba(8,15,6,0.8);border-radius:12px;padding:12px;color:#e0ecd0;">
                <div id="historiaImagenesPreview" style="margin-top: 12px;"></div>
            </div>
            <div class="form-group full-width">
                <button class="btn-submit" onclick="guardarHistoriaMaestro()">Guardar cambios</button>
            </div>
        </div>
        <div id="historiaMensaje" style="margin-top: 15px;"></div>
    `;

    if (typeof configurarInputImagenesConLimite === 'function') {
        configurarInputImagenesConLimite('historiaImagenesFiles', 'historiaImagenesPreview', 'historia');
    }
}

window.guardarHistoriaMaestro = async function() {
    const texto = document.getElementById('historiaTexto')?.value?.trim();
    const socios = document.getElementById('cifraSocios')?.value?.trim();
    const cepas = document.getElementById('cifraCepas')?.value?.trim();
    const anios = document.getElementById('cifraAnios')?.value?.trim();
    const urlsManual = (document.getElementById('historiaImagenesUrls')?.value || '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    const archivos = typeof obtenerArchivosAcumulados === 'function'
        ? obtenerArchivosAcumulados('historiaImagenesFiles')
        : document.getElementById('historiaImagenesFiles')?.files;
    const mensajeDiv = document.getElementById('historiaMensaje');

    if (!texto) {
        if (mensajeDiv) mensajeDiv.innerHTML = '<p style="color:#e0b8a0;">El texto principal no puede estar vacio.</p>';
        return;
    }

    try {
        validarMaximoImagenes(urlsManual, archivos, 'historia');
        let imagenesHistoria = [...urlsManual];
        if (archivos?.length) {
            const subidas = await subirMultiplesImagenes('noticias', archivos, 'historia');
            imagenesHistoria = [...imagenesHistoria, ...subidas];
        }

        const updates = [
            { clave: 'historia_texto', valor: texto },
            { clave: 'cifra_socios', valor: socios || '0' },
            { clave: 'cifra_cepas', valor: cepas || '0' },
            { clave: 'cifra_anios', valor: anios || '0' },
            { clave: 'historia_galeria', valor: JSON.stringify(imagenesHistoria) }
        ];
        for (const item of updates) {
            const { error } = await supabaseClient.from('configuracion_sistema').upsert(item, { onConflict: 'clave' });
            if (error) throw error;
        }
        aplicarContenidoInstitucional({
            historia_texto: texto,
            cifra_socios: socios || '0',
            cifra_cepas: cepas || '0',
            cifra_anios: anios || '0',
            historia_galeria: JSON.stringify(imagenesHistoria)
        });
        if (mensajeDiv) mensajeDiv.innerHTML = '<p style="color:#8fb86a;">Historia actualizada correctamente.</p>';
        mostrarMensaje('Historia guardada', true);
    } catch (error) {
        if (mensajeDiv) mensajeDiv.innerHTML = `<p style="color:#e0b8a0;">Error: ${escapeHtml(error.message)}</p>`;
        mostrarMensaje('No se pudo guardar la historia', false);
    }
};

async function cargarMaestroSocios() {
    const container = document.getElementById('maestro-socios');
    if (!container) return;
    const { data, error } = await supabaseClient.from('socios').select('*').order('fecha_ingreso', { ascending: false });
    if (error) {
        container.innerHTML = '<p>No se pudieron cargar los socios.</p>';
        return;
    }
    container.innerHTML = `
        <h3>Socios</h3>
        <table class="tabla-datos">
            <thead><tr><th>Email</th><th>Nombre</th><th>Rol</th></tr></thead>
            <tbody>${(data || []).map((socio) => `
                <tr>
                    <td>${escapeHtml(socio.email || '-')}</td>
                    <td>${escapeHtml(socio.nombre)} ${escapeHtml(socio.apellido)}</td>
                    <td>${escapeHtml(socio.rol || 'socio')}</td>
                </tr>
            `).join('')}</tbody>
        </table>
    `;
}

async function cargarMaestroConfig() {
    const container = document.getElementById('maestro-config');
    if (!container) return;
    await cargarContenidoInstitucional();
    container.innerHTML = `
        <h3>Configuracion</h3>
        <div class="form-grid">
            <div class="form-group">
                <label>Horas limite 1er jueves</label>
                <input type="number" id="confHorasPrimer" value="${configSistema.horasLimitePrimer}">
            </div>
            <div class="form-group">
                <label>Horas limite ultimo jueves</label>
                <input type="number" id="confHorasUltimo" value="${configSistema.horasLimiteUltimo}">
            </div>
            <div class="form-group full-width">
                <button class="btn-submit" onclick="guardarConfigMaestro()">Guardar</button>
            </div>
        </div>
    `;
}

window.guardarConfigMaestro = async function() {
    const h1 = document.getElementById('confHorasPrimer').value;
    const h2 = document.getElementById('confHorasUltimo').value;
    const updates = [
        { clave: 'horas_limite_primer', valor: h1 },
        { clave: 'horas_limite_ultimo', valor: h2 }
    ];
    for (const item of updates) {
        const { error } = await supabaseClient.from('configuracion_sistema').upsert(item, { onConflict: 'clave' });
        if (error) {
            mostrarMensaje(`No se pudo guardar la configuracion: ${error.message}`, false);
            return;
        }
    }
    configSistema.horasLimitePrimer = parseInt(h1, 10);
    configSistema.horasLimiteUltimo = parseInt(h2, 10);
    mostrarMensaje('Configuracion guardada', true);
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-maestro-btn').forEach((btn) => {
        const section = btn.dataset.maestroSection;
        if (!seccionesMaestroImplementadas.includes(section)) {
            btn.style.display = 'none';
            return;
        }
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-maestro-btn').forEach((other) => other.classList.remove('active'));
            btn.classList.add('active');
            seccionesMaestroImplementadas.forEach((key) => {
                const el = document.getElementById(`maestro-${key}`);
                if (el) el.style.display = key === section ? 'block' : 'none';
            });
            if (section === 'historia') cargarMaestroHistoria();
            if (section === 'socios') cargarMaestroSocios();
            if (section === 'config') cargarMaestroConfig();
        });
    });
});

console.log('Maestro loaded');
