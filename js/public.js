const IMAGEN_DEFAULT_NOVEDAD = 'assets/images/sitio-en-construccion.png';

function crearProductosDemoFallback() {
    return Array.from({ length: 6 }, (_, indice) => {
        const nombre = obtenerNombreVariedadDemo(indice);
        return normalizarProductoDemo({
            id: `demo-producto-${indice + 1}`,
            nombre,
            cepa: nombre,
            descripcion: obtenerDescripcionVariedadDemo(indice),
            indica_sativa: 'Perfil equilibrado',
            imagen_url: JSON.stringify(obtenerGaleriaVariedadDemo(indice)),
            disponible: true,
            activo: true,
            created_at: new Date(Date.now() + (indice * 1000)).toISOString()
        }, indice);
    });
}

function normalizarNoticiaDemo(noticia = {}) {
    const textoOriginal = `${noticia?.titulo || ''} ${noticia?.contenido || ''}`.toLowerCase();
    const esContenidoHeredado = textoOriginal.includes('cururu') || textoOriginal.includes('cururú');
    const titulo = esContenidoHeredado
        ? 'Próximamente'
        : (String(noticia?.titulo || '').trim() || 'Próximamente');
    const contenidoBase = esContenidoHeredado
        ? ''
        : String(noticia?.contenido || '').trim();
    const contenido = contenidoBase || `Estamos preparando contenido para ${titulo.toLowerCase()} con novedades, contexto y una presentación más clara para socios.`;
    const imagenes = normalizarListaImagenes(noticia?.imagen_url);

    return {
        ...noticia,
        titulo,
        contenido,
        imagen_url: !esContenidoHeredado && imagenes.length ? noticia.imagen_url : IMAGEN_DEFAULT_NOVEDAD,
        autor: noticia?.autor || 'Equipo GEENERICO',
        fecha_publicacion: esContenidoHeredado ? new Date().toISOString() : (noticia?.fecha_publicacion || new Date().toISOString())
    };
}

async function cargarContenidoInstitucional() {
    try {
        const { data, error } = await supabaseClient.from('configuracion_sistema').select('clave, valor');
        if (error) throw error;

        const configMap = {};
        (data || []).forEach((item) => {
            configMap[item.clave] = item.valor;
            if (item.clave === 'horas_limite_primer') configSistema.horasLimitePrimer = parseInt(item.valor, 10);
            if (item.clave === 'horas_limite_ultimo') configSistema.horasLimiteUltimo = parseInt(item.valor, 10);
        });

        aplicarContenidoInstitucional(configMap);
        return configMap;
    } catch (error) {
        console.warn('No se pudo cargar la configuracion del sitio', error);
        return {};
    }
}

function obtenerImagenesNoticia(noticia) {
    const imagenes = normalizarListaImagenes(noticia?.imagen_url);
    return imagenes.length ? imagenes : [crearPlaceholderConstruccion('Sitio en construcción')];
}

function formatearFechaNoticia(fecha) {
    if (!fecha) return 'Sin fecha';
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return 'Sin fecha';
    return valor.toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function obtenerIntroNoticia(contenido) {
    const texto = (contenido || '').replace(/\s+/g, ' ').trim();
    if (!texto) return 'Abrí la ficha para ver el contenido completo.';
    if (texto.length <= 135) return `${texto}...`;
    return `${texto.slice(0, 135).trimEnd()}...`;
}

function obtenerFechaIngresoProducto(producto, indiceOriginal) {
    const fechaBase = producto?.created_at || producto?.fecha_alta || producto?.fecha_ingreso || producto?.updated_at || null;
    const timestamp = fechaBase ? new Date(fechaBase).getTime() : Number.NaN;
    return {
        timestamp: Number.isNaN(timestamp) ? null : timestamp,
        indiceOriginal
    };
}

function ordenarProductosParaCatalogo(productos) {
    return [...productos].sort((a, b) => {
        const aTieneCalificacion = Number(a.totalCalificaciones || 0) > 0;
        const bTieneCalificacion = Number(b.totalCalificaciones || 0) > 0;

        if (aTieneCalificacion && bTieneCalificacion) {
            if (b.promedio !== a.promedio) return b.promedio - a.promedio;
            if (b.totalCalificaciones !== a.totalCalificaciones) return b.totalCalificaciones - a.totalCalificaciones;
        } else if (aTieneCalificacion !== bTieneCalificacion) {
            return aTieneCalificacion ? -1 : 1;
        }

        const fechaA = obtenerFechaIngresoProducto(a, a.indiceOriginal);
        const fechaB = obtenerFechaIngresoProducto(b, b.indiceOriginal);

        if (fechaA.timestamp !== null && fechaB.timestamp !== null && fechaA.timestamp !== fechaB.timestamp) {
            return fechaA.timestamp - fechaB.timestamp;
        }
        if (fechaA.timestamp !== null && fechaB.timestamp === null) return -1;
        if (fechaA.timestamp === null && fechaB.timestamp !== null) return 1;

        return fechaA.indiceOriginal - fechaB.indiceOriginal;
    });
}

async function cargarNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const noticias = await obtenerNoticias();
    if (!noticias?.length) {
        container.innerHTML = '<p style="color: #c8d8b5;">Estamos preparando novedades para comunicar lanzamientos, anuncios y actualizaciones del club.</p>';
        return;
    }

    container.innerHTML = noticias.map((noticia) => {
        const imagenes = obtenerImagenesNoticia(noticia);
        const intro = obtenerIntroNoticia(noticia.contenido);
        const payload = JSON.stringify(noticia).replace(/'/g, '&#39;');
        return `
            <article class="noticia-card" data-noticia='${payload}'>
                <div class="noticia-miniatura">
                    <img src="${imagenes[0]}" alt="${escapeHtml(noticia.titulo || 'Novedad')}" onerror="this.onerror=null; this.src='${crearPlaceholderConstruccion('Sitio en construcción')}';">
                </div>
                <div class="noticia-body">
                    <div class="noticia-fecha">${escapeHtml(formatearFechaNoticia(noticia.fecha_publicacion))}</div>
                    <h3 class="noticia-titulo">${escapeHtml(noticia.titulo || 'Novedad')}</h3>
                    <p class="noticia-contenido">${escapeHtml(intro)}</p>
                    <div class="noticia-cta"><i class="fas fa-arrow-right"></i> Ver más</div>
                </div>
            </article>
        `;
    }).join('');

    document.querySelectorAll('.noticia-card').forEach((card) => {
        card.addEventListener('click', () => {
            const noticia = JSON.parse(card.dataset.noticia);
            abrirNoticiaModal(noticia);
        });
    });
}

async function cargarActividadesPublicas() {
    const container = document.getElementById('actividades-container');
    if (!container) return;

    const actividades = await obtenerActividades();
    if (!actividades?.length) {
        container.innerHTML = '<p style="color: #c8d8b5;">Próximamente vas a ver aquí actividades, sorteos y acciones especiales del club.</p>';
        return;
    }

    const iconosTipo = { actividad: 'Actividad', sorteo: 'Sorteo', regalo: 'Regalo' };
    container.innerHTML = actividades.map((actividad) => `
        <div class="actividad-item">
            <div class="actividad-fecha">${new Date(actividad.fecha).toLocaleDateString('es', { day: 'numeric', month: 'short' })}<br>${actividad.hora?.substring(0, 5) || '--:--'}</div>
            <div class="actividad-info">
                <div class="actividad-titulo">${escapeHtml(actividad.titulo)} <span style="font-size:0.7rem;background:#7ca35a;color:#0f190c;padding:2px 8px;border-radius:12px;">${escapeHtml(iconosTipo[actividad.tipo] || actividad.tipo || 'Actividad')}</span></div>
                <div class="actividad-descripcion">${escapeHtml(actividad.descripcion || '')}</div>
            </div>
        </div>
    `).join('');
}

async function cargarProductosPublicos() {
    const container = document.getElementById('productos-container');
    if (!container) return;

    const productos = await obtenerProductos();
    const productosBase = productos?.length ? productos : crearProductosDemoFallback();

    const productosConCalificaciones = await Promise.all(productosBase.map(async (producto, indiceOriginal) => {
        const calificaciones = await obtenerCalificacionesProducto(producto.id);
        return {
            ...producto,
            indiceOriginal,
            promedio: calcularPromedioEstrellas(calificaciones),
            totalCalificaciones: calificaciones.length
        };
    }));

    const productosOrdenados = ordenarProductosParaCatalogo(productosConCalificaciones);
    const productosVisibles = productosOrdenados
        .slice(0, 6)
        .map((producto, indice) => normalizarProductoDemo(producto, indice));

    appState.catalogoProductos = productosVisibles.reduce((acc, producto) => {
        acc[producto.id] = producto;
        return acc;
    }, {});

    container.innerHTML = productosVisibles.map((producto) => {
        const imagenes = normalizarListaImagenes(producto.imagen_url);
        const imagenPrincipal = imagenes[0] || obtenerImagenFallback(producto) || crearPlaceholderConstruccion('Sitio en construcción');
        const disponible = producto.disponible !== false;
        const indicaSativa = producto.indica_sativa || 'Selección destacada del club';

        return `
            <div class="producto-card" data-producto='${JSON.stringify(producto).replace(/'/g, '&#39;')}'>
                <div class="producto-miniatura">
                    <img src="${imagenPrincipal}" alt="${escapeHtml(producto.nombre)}" style="width:100%;height:160px;object-fit:cover;" onerror="this.onerror=null; this.src='${obtenerImagenFallback(producto) || crearPlaceholderConstruccion('Sitio en construcción')}';">
                </div>
                ${renderizarEstrellas(producto.promedio, producto.totalCalificaciones)}
                <div class="producto-detalle">
                    <h3 class="producto-nombre">${escapeHtml(producto.nombre)}</h3>
                    <div style="color:#111111;font-size:0.9rem;margin-bottom:10px;">${escapeHtml(indicaSativa)}</div>
                    <button class="btn-mas-info" onclick="event.stopPropagation();mostrarMasInfo('${producto.id}')" style="background:#496535;border:1px solid #496535;color:#f4f8ef;padding:8px 16px;border-radius:20px;cursor:pointer;width:100%;margin-bottom:10px;"><i class="fas fa-plus-circle"></i> Información</button>
                    <button class="btn-reservar-producto" onclick="event.stopPropagation();abrirModalDesdeBoton('${producto.id}')" style="background:#496535;border:none;color:#f4f8ef;padding:10px;border-radius:25px;cursor:pointer;font-weight:bold;width:100%;" ${!disponible ? 'disabled' : ''}><i class="fas fa-calendar-check"></i> Reservar</button>
                    ${!disponible ? '<div style="margin-top:8px;color:#9B6A6C;">No disponible</div>' : ''}
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.producto-card').forEach((card) => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('button')) return;
            abrirModal(JSON.parse(card.dataset.producto));
        });
    });

    container.querySelectorAll('.btn-mas-info').forEach((btn) => {
        btn.innerHTML = '<i class="fas fa-plus-circle"></i> Ver ficha';
    });
    container.querySelectorAll('.btn-reservar-producto').forEach((btn) => {
        btn.innerHTML = '<i class="fas fa-calendar-check"></i> Solicitar retiro';
    });
}

window.mostrarMasInfo = async function(productoId) {
    const productoEnMemoria = appState.catalogoProductos?.[productoId];

    if (String(productoId).startsWith('demo-producto-') && productoEnMemoria) {
        abrirModal(productoEnMemoria);
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('productos').select('*').eq('id', productoId).single();
        if (error) throw error;
        if (data) {
            const productoNormalizado = productoEnMemoria || data;
            abrirModal({ ...data, ...productoNormalizado });
        }
    } catch (error) {
        if (productoEnMemoria) {
            abrirModal(productoEnMemoria);
            return;
        }
        mostrarMensaje('No se pudo cargar la información del producto', false);
    }
};

window.abrirModalDesdeBoton = async function(productoId) {
    await window.mostrarMasInfo(productoId);
};

window.seleccionarImagenNoticia = function(indice) {
    if (!appState.noticiaGaleriaActual?.imagenes?.length) return;
    const imagen = appState.noticiaGaleriaActual.imagenes[indice];
    if (!imagen) return;

    appState.noticiaGaleriaActual.indice = indice;
    const principal = document.getElementById('noticiaModalImagenPrincipal');
    if (principal) principal.src = imagen;

    document.querySelectorAll('#noticiaModalMedia .galeria-thumb').forEach((thumb, thumbIndex) => {
        thumb.classList.toggle('activa', thumbIndex === indice);
    });
};

window.abrirNoticiaModal = function(noticia) {
    const modal = document.getElementById('noticiaModal');
    if (!modal || !noticia) return;

    const media = document.getElementById('noticiaModalMedia');
    const titulo = document.getElementById('noticiaModalTitulo');
    const fecha = document.getElementById('noticiaModalFecha');
    const autor = document.getElementById('noticiaModalAutor');
    const contenido = document.getElementById('noticiaModalContenido');
    const imagenes = obtenerImagenesNoticia(noticia);

    appState.noticiaGaleriaActual = { imagenes, indice: 0 };
    media.innerHTML = construirHTMLGaleriaHorizontal(imagenes, {
        imagenPrincipalId: 'noticiaModalImagenPrincipal',
        onSelect: 'seleccionarImagenNoticia',
        titulo: noticia.titulo || 'Novedad'
    });

    const principal = document.getElementById('noticiaModalImagenPrincipal');
    if (principal) {
        principal.onerror = function onErrorImagen() {
            this.onerror = null;
            this.src = crearPlaceholderConstruccion('Sitio en construcción');
        };
    }

    titulo.textContent = noticia.titulo || 'Novedad';
    fecha.textContent = formatearFechaNoticia(noticia.fecha_publicacion);
    autor.textContent = noticia.autor ? `Por ${noticia.autor}` : '';
    contenido.textContent = noticia.contenido || 'Sin contenido disponible.';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.cerrarNoticiaModal = function() {
    const modal = document.getElementById('noticiaModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
};

document.addEventListener('DOMContentLoaded', () => {
    const noticiaModal = document.getElementById('noticiaModal');
    if (!noticiaModal) return;
    noticiaModal.addEventListener('click', (event) => {
        if (event.target === noticiaModal) cerrarNoticiaModal();
    });
});

function obtenerImagenesNoticia(noticia) {
    const imagenes = normalizarListaImagenes(noticia?.imagen_url);
    return imagenes.length ? imagenes : [IMAGEN_DEFAULT_NOVEDAD];
}

function obtenerIntroNoticia(contenido) {
    const texto = (contenido || '').replace(/\s+/g, ' ').trim();
    if (!texto) return 'Abrí la ficha para ver el contenido completo.';
    if (texto.length <= 135) return `${texto}...`;
    return `${texto.slice(0, 135).trimEnd()}...`;
}

async function cargarNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    const noticias = await obtenerNoticias();
    if (!noticias?.length) {
        container.innerHTML = '<p style="color: #c8d8b5;">Estamos preparando novedades para comunicar lanzamientos, anuncios y actualizaciones del club.</p>';
        return;
    }

    container.innerHTML = noticias.map((item) => {
        const noticia = normalizarNoticiaDemo(item);
        const imagenes = obtenerImagenesNoticia(noticia);
        const intro = obtenerIntroNoticia(noticia.contenido);
        const payload = JSON.stringify(noticia).replace(/'/g, '&#39;');
        return `
            <article class="noticia-card" data-noticia='${payload}'>
                <div class="noticia-miniatura">
                    <img src="${imagenes[0]}" alt="${escapeHtml(noticia.titulo || 'Próximamente')}" onerror="this.onerror=null; this.src='${IMAGEN_DEFAULT_NOVEDAD}';">
                </div>
                <div class="noticia-body">
                    <div class="noticia-fecha">${escapeHtml(formatearFechaNoticia(noticia.fecha_publicacion))}</div>
                    <h3 class="noticia-titulo">${escapeHtml(noticia.titulo || 'Próximamente')}</h3>
                    <p class="noticia-contenido">${escapeHtml(intro)}</p>
                    <div class="noticia-cta"><i class="fas fa-arrow-right"></i> Ver más</div>
                </div>
            </article>
        `;
    }).join('');

    document.querySelectorAll('.noticia-card').forEach((card) => {
        card.addEventListener('click', () => {
            const noticia = JSON.parse(card.dataset.noticia);
            abrirNoticiaModal(noticia);
        });
    });
}

window.abrirNoticiaModal = function(noticia) {
    const modal = document.getElementById('noticiaModal');
    if (!modal || !noticia) return;

    const noticiaNormalizada = normalizarNoticiaDemo(noticia);
    const media = document.getElementById('noticiaModalMedia');
    const titulo = document.getElementById('noticiaModalTitulo');
    const fecha = document.getElementById('noticiaModalFecha');
    const autor = document.getElementById('noticiaModalAutor');
    const contenido = document.getElementById('noticiaModalContenido');
    const imagenes = obtenerImagenesNoticia(noticiaNormalizada);

    appState.noticiaGaleriaActual = { imagenes, indice: 0 };
    media.innerHTML = construirHTMLGaleriaHorizontal(imagenes, {
        imagenPrincipalId: 'noticiaModalImagenPrincipal',
        onSelect: 'seleccionarImagenNoticia',
        titulo: noticiaNormalizada.titulo || 'Próximamente'
    });

    const principal = document.getElementById('noticiaModalImagenPrincipal');
    if (principal) {
        principal.onerror = function onErrorImagen() {
            this.onerror = null;
            this.src = IMAGEN_DEFAULT_NOVEDAD;
        };
    }

    titulo.textContent = noticiaNormalizada.titulo || 'Próximamente';
    fecha.textContent = formatearFechaNoticia(noticiaNormalizada.fecha_publicacion);
    autor.textContent = noticiaNormalizada.autor ? `Por ${noticiaNormalizada.autor}` : '';
    contenido.textContent = noticiaNormalizada.contenido || 'Estamos preparando esta novedad con mejor contexto y una presentación más clara para socios.';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

console.log('Public loaded');
