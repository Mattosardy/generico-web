function mostrarMensaje(mensaje, esExito = true) {
    const div = document.createElement('div');
    div.className = `mensaje-flotante ${esExito ? 'mensaje-exito' : 'mensaje-error'}`;
    div.innerHTML = `<i class="fas ${esExito ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${mensaje}`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function ajustarColor([r, g, b], delta = 0) {
    return [clamp(r + delta, 0, 255), clamp(g + delta, 0, 255), clamp(b + delta, 0, 255)];
}

function obtenerLuminancia([r, g, b]) {
    const [rr, gg, bb] = [r, g, b].map((valor) => {
        const v = valor / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * rr) + (0.7152 * gg) + (0.0722 * bb);
}

function aplicarTemaDesdeLogo() {
    const logo = document.querySelector('.logo-mark');
    if (!logo) return;

    const procesar = () => {
        try {
            const canvas = document.createElement('canvas');
            const size = 48;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;

            ctx.drawImage(logo, 0, 0, size, size);
            const { data } = ctx.getImageData(0, 0, size, size);

            let totalR = 0;
            let totalG = 0;
            let totalB = 0;
            let muestras = 0;

            for (let i = 0; i < data.length; i += 16) {
                const alpha = data[i + 3];
                if (alpha < 180) continue;
                totalR += data[i];
                totalG += data[i + 1];
                totalB += data[i + 2];
                muestras += 1;
            }

            if (!muestras) return;

            const base = [
                Math.round(totalR / muestras),
                Math.round(totalG / muestras),
                Math.round(totalB / muestras)
            ];

            const root = document.documentElement;
            const headerText = obtenerLuminancia(base) > 0.42 ? '#1f1713' : '#f5e7db';
            const headerBg = ajustarColor(base, -18);
            const headerPill = ajustarColor(base, -36);
            const accent = ajustarColor(base, 34);

            root.style.setProperty('--header-bg', `rgba(${headerBg[0]}, ${headerBg[1]}, ${headerBg[2]}, 0.78)`);
            root.style.setProperty('--header-border', `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.26)`);
            root.style.setProperty('--header-text', headerText);
            root.style.setProperty('--header-pill', `rgba(${headerPill[0]}, ${headerPill[1]}, ${headerPill[2]}, 0.46)`);
            root.style.setProperty('--header-pill-border', `rgba(${accent[0]}, ${accent[1]}, ${accent[2]}, 0.18)`);
            root.style.setProperty('--header-accent', rgbToHex(...accent));
        } catch (error) {
            console.warn('No se pudo aplicar el tema desde el logo', error);
        }
    };

    if (logo.complete && logo.naturalWidth > 0) {
        procesar();
        return;
    }

    logo.addEventListener('load', procesar, { once: true });
}

function formatearTelefonoUruguay(telefono) {
    const limpio = String(telefono || '').replace(/[\s\-().]/g, '');
    if (limpio.startsWith('+598')) return limpio;
    if (limpio.startsWith('09') && limpio.length === 9) return `+598${limpio.slice(1)}`;
    if (limpio.startsWith('9') && limpio.length === 8) return `+598${limpio}`;
    if (limpio.length === 9) return `+598${limpio}`;
    return limpio;
}

function calcularFechasEntrega() {
    const hoy = new Date();
    let anio = hoy.getFullYear();
    let mes = hoy.getMonth();
    let primerJueves = new Date(anio, mes, 1);
    while (primerJueves.getDay() !== 4) primerJueves.setDate(primerJueves.getDate() + 1);
    if (primerJueves < hoy) {
        mes += 1;
        if (mes > 11) {
            mes = 0;
            anio += 1;
        }
        primerJueves = new Date(anio, mes, 1);
        while (primerJueves.getDay() !== 4) primerJueves.setDate(primerJueves.getDate() + 1);
    }
    const ultimoJueves = new Date(anio, mes + 1, 0);
    while (ultimoJueves.getDay() !== 4) ultimoJueves.setDate(ultimoJueves.getDate() - 1);
    return { primerJueves, ultimoJueves };
}

function puedeConfirmar(fechaEntrega, horasLimite) {
    const ahora = new Date();
    const fechaLimite = new Date(fechaEntrega.getTime() - horasLimite * 60 * 60 * 1000);
    return ahora <= fechaLimite;
}

function obtenerClaveMesActual() {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

function obtenerIdentificadorSocioPedido() {
    if (appState.socioData?.id) return appState.socioData.id;
    if (appState.socioData?.email) return appState.socioData.email;
    if (appState.usuarioActual?.email) return appState.usuarioActual.email;
    return 'invitado';
}

function obtenerImagenFallback(producto) {
    const nombre = String(producto?.nombre || '').toLowerCase();
    const match = nombre.match(/ejemplo-(\d+)/);
    const indice = match ? Number(match[1]) : null;
    if (indice && indice >= 1 && indice <= 6) return `assets/images/ejemplo-${indice}.png`;
    return 'assets/images/ejemplo-1.png';
}

function obtenerNombreVariedadDemo(indice = 0) {
    return `ejemplo-${indice + 1}`;
}

function obtenerGaleriaVariedadDemo(indice = 0) {
    const numero = indice + 1;
    const nombreBase = `ejemplo-${numero}`;
    const nombresSegundaImagen = {
        1: 'ejemplo-1-2',
        2: 'ejemplo-2-2',
        3: 'ejemplo-3-3',
        4: 'ejemplo-4-4',
        5: 'ejemplo-5-5',
        6: 'ejemplo-6-6'
    };

    return [
        `assets/images/${nombreBase}.png`,
        `assets/images/${nombresSegundaImagen[numero] || 'ejemplo-1-2'}.png`,
        'assets/images/sitio-en-construccion.png'
    ];
}

function obtenerDescripcionVariedadDemo(indice = 0) {
    const descripciones = [
        'Una variedad pensada para destacar en vitrina: perfil amable, presencia limpia y una narrativa visual facil de recordar.',
        'Edicion de identidad suave y moderna, creada para transmitir simpleza, consistencia y una experiencia accesible.',
        'Propuesta con perfil equilibrado y estetica protagonista, ideal para un catalogo con tono aspiracional.',
        'Seleccion de caracter expresivo, disenada para sumar personalidad al lineup sin perder claridad comercial.',
        'Variedad de impronta fresca y visual ordenado, pensada para reforzar una marca prolija y contemporanea.',
        'Cierre de catalogo con un perfil versatil y atractivo, pensado para dejar una impresion final solida.'
    ];
    return descripciones[indice] || descripciones[descripciones.length - 1];
}

function normalizarProductoDemo(producto, indice = 0) {
    const nombreDemo = obtenerNombreVariedadDemo(indice);
    const galeriaDemo = obtenerGaleriaVariedadDemo(indice);
    return {
        ...producto,
        nombre: nombreDemo,
        cepa: nombreDemo,
        descripcion: obtenerDescripcionVariedadDemo(indice),
        indica_sativa: producto?.indica_sativa || 'Perfil equilibrado',
        imagen_url: JSON.stringify(galeriaDemo)
    };
}

function esRutaLocalInvalida(valor) {
    const ruta = String(valor || '').trim().toLowerCase();
    if (!ruta) return true;
    if (ruta.startsWith('file:///')) return true;
    if (/^[a-z]:[\\/]/.test(ruta)) return true;
    return false;
}

function crearPlaceholderConstruccion(titulo = 'Sitio en construcción', detalle = 'Contenido visual en preparación') {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#102015"/>
                    <stop offset="100%" stop-color="#27402a"/>
                </linearGradient>
            </defs>
            <rect width="1200" height="800" fill="url(#bg)"/>
            <rect x="70" y="70" width="1060" height="660" rx="36" fill="rgba(8,15,6,0.55)" stroke="#7ca35a" stroke-width="4"/>
            <text x="600" y="340" fill="#8fb86a" font-family="Poppins, Arial, sans-serif" font-size="54" font-weight="700" text-anchor="middle">${titulo}</text>
            <text x="600" y="410" fill="#dce8cf" font-family="Open Sans, Arial, sans-serif" font-size="30" text-anchor="middle">${detalle}</text>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\n\s+/g, ' ').trim())}`;
}

function normalizarListaImagenes(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) {
        return valor
            .map((item) => String(item || '').trim())
            .filter((item) => item && !esRutaLocalInvalida(item));
    }
    if (typeof valor === 'string') {
        const limpio = valor.trim();
        if (!limpio || esRutaLocalInvalida(limpio)) return [];
        if (limpio.startsWith('[')) {
            try {
                const parseado = JSON.parse(limpio);
                if (Array.isArray(parseado)) {
                    return parseado
                        .map((item) => String(item || '').trim())
                        .filter((item) => item && !esRutaLocalInvalida(item));
                }
            } catch (error) {
                console.warn('No se pudo parsear la galeria de imagenes', error);
            }
        }
        return [limpio];
    }
    return [];
}

function obtenerImagenPrincipal(listaImagenes = [], titulo = 'Sitio en construcción') {
    return listaImagenes[0] || crearPlaceholderConstruccion(titulo);
}

function construirHTMLGaleriaHorizontal(imagenes, opciones = {}) {
    const {
        imagenPrincipalId = 'galeriaImagenPrincipal',
        stripClass = 'galeria-strip',
        thumbClass = 'galeria-thumb',
        onSelect = 'void(0)',
        titulo = 'Sitio en construcción'
    } = opciones;

    const lista = normalizarListaImagenes(imagenes);
    const imagenesFinales = lista.length ? lista : [crearPlaceholderConstruccion(titulo)];

    return `
        <div class="modal-galeria horizontal">
            <img id="${imagenPrincipalId}" class="modal-imagen" src="${imagenesFinales[0]}" alt="${escapeHtml(titulo)}">
            <div class="${stripClass}">
                ${imagenesFinales.map((imagen, index) => `
                    <button
                        type="button"
                        class="${thumbClass}${index === 0 ? ' activa' : ''}"
                        onclick="${onSelect}(${index})"
                    >
                        <img src="${imagen}" alt="${escapeHtml(`${titulo} ${index + 1}`)}">
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function aplicarContenidoInstitucional(configMap = {}) {
    const historiaPrincipal = document.querySelector('.historia-texto > p');
    if (historiaPrincipal && configMap.historia_texto) {
        historiaPrincipal.innerHTML = `<strong>GEENERICO</strong> ${escapeHtml(configMap.historia_texto)}`;
    }

    const cifraSocios = document.getElementById('cifra-socios');
    const cifraCepas = document.getElementById('cifra-cepas');
    const cifraAnios = document.getElementById('cifra-anios');
    if (cifraSocios && configMap.cifra_socios) cifraSocios.textContent = `+${configMap.cifra_socios}`;
    if (cifraCepas && configMap.cifra_cepas) cifraCepas.textContent = `${configMap.cifra_cepas}+`;
    if (cifraAnios && configMap.cifra_anios) cifraAnios.textContent = configMap.cifra_anios;

    const historiaMedia = document.getElementById('historiaMediaPrincipal');
    const historiaGaleria = document.getElementById('historiaGaleria');
    if (historiaMedia && historiaGaleria) {
        const imagenesHistoria = normalizarListaImagenes(configMap.historia_galeria);
        if (imagenesHistoria.length) {
            const imagenPrincipal = obtenerImagenPrincipal(imagenesHistoria, 'Sitio en construcción');
            historiaMedia.innerHTML = `
                <img
                    src="${imagenPrincipal}"
                    alt="Historia GEENERICO"
                    style="width: 100%; max-height: 300px; border-radius: 16px; object-fit: cover;"
                    onerror="this.onerror=null; this.src='${crearPlaceholderConstruccion('Sitio en construcción')}';"
                >
            `;
        } else {
            historiaMedia.innerHTML = `
                <video autoplay muted loop playsinline style="width: 100%; max-height: 300px; border-radius: 16px; object-fit: cover;">
                    <source src="assets/images/generico-video.mp4" type="video/mp4">
                    Tu navegador no soporta videos.
                </video>
            `;
        }
        if (imagenesHistoria.length > 1) {
            historiaGaleria.style.display = 'grid';
            historiaGaleria.innerHTML = imagenesHistoria.map((imagen, index) => `
                <button
                    type="button"
                    class="historia-galeria-item${index === 0 ? ' activa' : ''}"
                    onclick="seleccionarHistoriaImagen(${index})"
                >
                    <img src="${imagen}" alt="Historia ${index + 1}" onerror="this.onerror=null; this.src='${crearPlaceholderConstruccion('Sitio en construcción')}';">
                </button>
            `).join('');
            appState.historiaGaleria = imagenesHistoria;
        } else {
            historiaGaleria.style.display = 'none';
            historiaGaleria.innerHTML = '';
            appState.historiaGaleria = imagenesHistoria;
        }
    }
}

function inicializarPlaceholders() {
    if (localStorage.getItem('cururu_placeholders')) return;
    const images = {
        'ejemplo-1': { color: '#2d5a27', text: 'GEENERICO 1' },
        'ejemplo-2': { color: '#3a6b2d', text: 'GEENERICO 2' },
        'ejemplo-3': { color: '#4a7a3a', text: 'GEENERICO 3' },
        'ejemplo-4': { color: '#8b3a3a', text: 'GEENERICO 4' }
    };
    const placeholders = {};
    Object.entries(images).forEach(([name, config]) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = config.color;
        ctx.fillRect(0, 0, 400, 300);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Poppins, Arial';
        ctx.textAlign = 'center';
        ctx.fillText(config.text, 200, 140);
        ctx.font = '14px Poppins, Arial';
        ctx.fillStyle = '#a0b890';
        ctx.fillText('GEENERICO', 200, 170);
        placeholders[name] = canvas.toDataURL('image/jpeg', 0.9);
    });
    localStorage.setItem('cururu_placeholders', JSON.stringify(placeholders));
}

console.log('Utils loaded');

window.crearPlaceholderConstruccion = crearPlaceholderConstruccion;
window.normalizarListaImagenes = normalizarListaImagenes;
window.obtenerImagenPrincipal = obtenerImagenPrincipal;
window.construirHTMLGaleriaHorizontal = construirHTMLGaleriaHorizontal;
window.normalizarProductoDemo = normalizarProductoDemo;
window.aplicarTemaDesdeLogo = aplicarTemaDesdeLogo;
window.seleccionarHistoriaImagen = function(indice) {
    const historiaMedia = document.getElementById('historiaMediaPrincipal');
    if (!historiaMedia || !Array.isArray(appState.historiaGaleria) || !appState.historiaGaleria[indice]) return;
    const imagen = appState.historiaGaleria[indice];
    historiaMedia.innerHTML = `
        <img
            src="${imagen}"
            alt="Historia GEENERICO"
            style="width: 100%; max-height: 300px; border-radius: 16px; object-fit: cover;"
            onerror="this.onerror=null; this.src='${crearPlaceholderConstruccion('Sitio en construcción')}';"
        >
    `;
    document.querySelectorAll('.historia-galeria-item').forEach((item, itemIndex) => {
        item.classList.toggle('activa', itemIndex === indice);
    });
};
