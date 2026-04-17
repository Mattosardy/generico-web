function obtenerPedidosProductos() {
    try {
        return JSON.parse(localStorage.getItem('cururu_pedidos_productos') || '[]');
    } catch (error) {
        return [];
    }
}

function guardarPedidosProductos(pedidos) {
    localStorage.setItem('cururu_pedidos_productos', JSON.stringify(pedidos));
}

function obtenerTotalPedidoMesActual() {
    const socioId = obtenerIdentificadorSocioPedido();
    const mesActual = obtenerClaveMesActual();
    return obtenerPedidosProductos()
        .filter((pedido) => pedido.socio_id === socioId && pedido.mes === mesActual)
        .reduce((acc, pedido) => acc + Number(pedido.gramos || 0), 0);
}

function actualizarEstadoPedidoModal() {
    const restante = 40 - obtenerTotalPedidoMesActual();
    const restanteEl = document.getElementById('pedidoRestante');
    const alertaEl = document.getElementById('pedidoAlerta');
    const botonEl = document.getElementById('btnRealizarPedido');
    if (!restanteEl || !alertaEl || !botonEl) return;

    restanteEl.textContent = `Disponible este mes: ${restante}g de 40g`;
    alertaEl.textContent = '';
    document.querySelectorAll('#opcionesPedido .opcion-pedido').forEach((btn) => {
        const gramos = Number(btn.dataset.gramos);
        btn.classList.toggle('activa', gramos === appState.gramosSeleccionadosPedido);
        btn.disabled = gramos > restante;
    });

    if (!appState.gramosSeleccionadosPedido) {
        botonEl.disabled = true;
        botonEl.innerHTML = 'Realizar pedido';
        return;
    }

    if (appState.gramosSeleccionadosPedido > restante) {
        alertaEl.textContent = `No podes pedir ${appState.gramosSeleccionadosPedido}g. Te quedan ${restante}g.`;
        botonEl.disabled = true;
        return;
    }
    botonEl.disabled = false;
}

function inicializarPedidoModal() {
    appState.gramosSeleccionadosPedido = null;
    actualizarEstadoPedidoModal();
    document.querySelectorAll('#opcionesPedido .opcion-pedido').forEach((btn) => {
        btn.onclick = () => {
            const gramos = Number(btn.dataset.gramos);
            const precio = Number(btn.dataset.precio);
            const restante = 40 - obtenerTotalPedidoMesActual();
            if (gramos > restante) {
                mostrarMensaje(`Te quedan ${restante}g disponibles.`, false);
                return;
            }
            appState.gramosSeleccionadosPedido = gramos;
            document.getElementById('btnRealizarPedido').innerHTML = `Realizar pedido - $${precio}`;
            actualizarEstadoPedidoModal();
        };
    });
    document.getElementById('btnRealizarPedido').onclick = realizarPedidoProducto;
}

function realizarPedidoProducto() {
    if (!appState.productoModalActual) {
        mostrarMensaje('No hay producto seleccionado.', false);
        return;
    }
    if (!appState.socioData && !appState.usuarioActual) {
        mostrarMensaje('Inicia sesion para pedir.', false);
        return;
    }
    if (!appState.gramosSeleccionadosPedido) {
        mostrarMensaje('Selecciona una cantidad.', false);
        return;
    }
    const totalActual = obtenerTotalPedidoMesActual();
    if (totalActual + appState.gramosSeleccionadosPedido > 40) {
        mostrarMensaje(`Ya llevas ${totalActual}g este mes.`, false);
        return;
    }

    const pedidos = obtenerPedidosProductos();
    pedidos.push({
        id: crypto.randomUUID?.() || `pedido_${Date.now()}`,
        socio_id: obtenerIdentificadorSocioPedido(),
        producto_id: appState.productoModalActual.id,
        producto_nombre: appState.productoModalActual.nombre,
        gramos: appState.gramosSeleccionadosPedido,
        mes: obtenerClaveMesActual(),
        fecha: new Date().toISOString(),
        estado: 'pendiente'
    });
    guardarPedidosProductos(pedidos);
    mostrarMensaje(`Pedido registrado: ${appState.productoModalActual.nombre} - ${appState.gramosSeleccionadosPedido}g`, true);
    cerrarProductoModal();
}

window.cambiarImagenGaleria = function(direccion) {
    if (!appState.galeriaActual?.imagenes?.length) return;
    const nuevoIndice = appState.galeriaActual.indice + direccion;
    if (nuevoIndice < 0 || nuevoIndice >= appState.galeriaActual.imagenes.length) return;
    appState.galeriaActual.indice = nuevoIndice;
    const imagenPrincipal = document.getElementById('modalImagenGaleria');
    if (imagenPrincipal) imagenPrincipal.src = appState.galeriaActual.imagenes[nuevoIndice];
    actualizarControlesGaleriaProducto();
};

window.irAImagen = function(indice) {
    if (!appState.galeriaActual?.imagenes?.length) return;
    appState.galeriaActual.indice = indice;
    document.getElementById('modalImagenGaleria').src = appState.galeriaActual.imagenes[indice];
    document.querySelectorAll('.galeria-dot').forEach((dot, index) => {
        dot.style.background = index === indice ? '#7ca35a' : 'rgba(255,255,255,0.5)';
    });
};

window.seleccionarImagenProducto = function(indice) {
    if (!appState.galeriaActual?.imagenes?.length) return;
    const imagen = appState.galeriaActual.imagenes[indice];
    if (!imagen) return;

    appState.galeriaActual.indice = indice;
    const principal = document.getElementById('modalImagenGaleria');
    if (principal) principal.src = imagen;
    actualizarControlesGaleriaProducto();
};

function renderizarGaleriaProductoModal(imagenes, titulo) {
    const imagenPrincipal = imagenes[0] || crearPlaceholderConstruccion('Sitio en construccion');
    return `
        <div class="modal-galeria producto-simple">
            <div class="modal-galeria-frame">
                <button type="button" class="galeria-flecha izquierda" id="galeriaPrev" onclick="cambiarImagenGaleria(-1)" aria-label="Imagen anterior">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <img id="modalImagenGaleria" class="modal-imagen" src="${imagenPrincipal}" alt="${escapeHtml(titulo)}">
                <button type="button" class="galeria-flecha derecha" id="galeriaNext" onclick="cambiarImagenGaleria(1)" aria-label="Imagen siguiente">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

function actualizarControlesGaleriaProducto() {
    const total = appState.galeriaActual?.imagenes?.length || 0;
    const indice = appState.galeriaActual?.indice || 0;
    const prev = document.getElementById('galeriaPrev');
    const next = document.getElementById('galeriaNext');
    if (prev) prev.disabled = total <= 1 || indice <= 0;
    if (next) next.disabled = total <= 1 || indice >= total - 1;
}

async function abrirModal(producto) {
    appState.productoModalActual = producto;
    appState.gramosSeleccionadosPedido = null;
    const precioBase = producto.precio_por_10g || 1600;
    const disponible = producto.disponible !== false;

    let imagenesArray = [];
    const imagenesBase = normalizarListaImagenes(producto.imagen_url);
    const esVariedadDemo = /^ejemplo-\d+$/i.test(String(producto?.nombre || ''));
    if (typeof obtenerImagenesProducto === 'function') {
        try {
            const imagenes = await obtenerImagenesProducto(producto.id);
            if (imagenes?.length && !esVariedadDemo) imagenesArray = imagenes.map((img) => img.imagen_url);
        } catch (error) {
            console.warn('No se pudo cargar la galeria del producto', error);
        }
    }
    if (imagenesBase.length) imagenesArray = imagenesBase;
    if (!imagenesArray.length) imagenesArray = [obtenerImagenFallback(producto) || crearPlaceholderConstruccion('Sitio en construcción')];

    appState.galeriaActual = { imagenes: imagenesArray, indice: 0, productoId: producto.id };

    const modalMedia = document.getElementById('modalMedia');
    modalMedia.innerHTML = renderizarGaleriaProductoModal(imagenesArray, producto.nombre || 'Variedad');
    const imagenPrincipal = document.getElementById('modalImagenGaleria');
    if (imagenPrincipal) {
        imagenPrincipal.onerror = function onErrorImagen() {
            this.onerror = null;
            this.src = obtenerImagenFallback(producto) || crearPlaceholderConstruccion('Sitio en construcción');
        };
    }

    actualizarControlesGaleriaProducto();
    document.getElementById('modalTitulo').textContent = producto.nombre;
    document.getElementById('modalCepa').textContent = producto.cepa || 'Selección del club';
    document.getElementById('modalDescripcion').textContent = producto.descripcion || '';
    document.getElementById('modalThc').textContent = `THC: ${producto.thc_porcentaje || '?'}% | CBD: ${producto.cbd_porcentaje || '?'}%`;
    document.getElementById('panelCalificacion').style.display = 'none';
    document.getElementById('calificacionMensaje').innerHTML = '';
    calificacionSeleccionada = 0;

    const opcionesContainer = document.getElementById('opcionesPedido');
    opcionesContainer.innerHTML = [10, 20, 30, 40].map((gramos) => {
        const precioTotal = (precioBase * gramos / 10).toFixed(0);
        return `<button type="button" class="opcion-pedido" data-gramos="${gramos}" data-precio="${precioTotal}">${gramos}g - $${precioTotal}</button>`;
    }).join('');

    if (!disponible) {
        document.querySelectorAll('.opcion-pedido').forEach((btn) => {
            btn.disabled = true;
        });
        document.getElementById('pedidoAlerta').textContent = 'Variedad no disponible en este momento';
        document.getElementById('btnRealizarPedido').disabled = true;
    } else {
        document.getElementById('pedidoAlerta').textContent = '';
    }

    document.getElementById('productoModal').style.display = 'flex';
    inicializarPedidoModal();
}

function cerrarProductoModal() {
    document.getElementById('productoModal').style.display = 'none';
    document.getElementById('panelCalificacion').style.display = 'none';
    document.getElementById('calificacionMensaje').innerHTML = '';
    appState.productoModalActual = null;
    appState.gramosSeleccionadosPedido = null;
    calificacionSeleccionada = 0;
}

window.editarProductoAdmin = async function(id) {
    const { data, error } = await supabaseClient.from('productos').select('*').eq('id', id).single();
    if (error || !data) {
        mostrarMensaje('No se pudo cargar el producto para editar', false);
        return;
    }
    appState.productoEditandoId = id;
    document.getElementById('editNombre').value = data.nombre || '';
    document.getElementById('editCepa').value = data.cepa || '';
    document.getElementById('editThc').value = data.thc_porcentaje || '';
    document.getElementById('editCbd').value = data.cbd_porcentaje || '';
    document.getElementById('editPrecio').value = data.precio_por_10g || 1600;
    document.getElementById('editDescripcion').value = data.descripcion || '';
    document.getElementById('editImagenUrl').value = data.imagen_url || '';
    document.getElementById('editProductoModal').style.display = 'flex';
};

function cerrarEditProducto() {
    document.getElementById('editProductoModal').style.display = 'none';
    appState.productoEditandoId = null;
}

window.cerrarEditProducto = cerrarEditProducto;

let calificacionSeleccionada = 0;

window.togglePanelCalificacion = function() {
    const panel = document.getElementById('panelCalificacion');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        cargarCalificacionExistente();
    } else {
        panel.style.display = 'none';
    }
};

window.seleccionarEstrella = function(valor) {
    calificacionSeleccionada = valor;
    document.querySelectorAll('.calificacion-estrella').forEach((estrella, index) => {
        estrella.classList.toggle('activa', index < valor);
    });
};

async function cargarCalificacionExistente() {
    if (!appState.productoModalActual || !appState.socioData?.id) return;
    const puntuacion = await obtenerCalificacionUsuario(appState.productoModalActual.id, appState.socioData.id);
    if (!puntuacion) {
        calificacionSeleccionada = 0;
        document.querySelectorAll('.calificacion-estrella').forEach((estrella) => estrella.classList.remove('activa'));
        return;
    }
    calificacionSeleccionada = puntuacion;
    window.seleccionarEstrella(puntuacion);
}

window.enviarCalificacion = async function() {
    if (!appState.productoModalActual) {
        mostrarMensaje('No hay producto seleccionado', false);
        return;
    }
    if (!appState.socioData?.id) {
        mostrarMensaje('Inicia sesion para calificar', false);
        return;
    }
    if (!calificacionSeleccionada) {
        mostrarMensaje('Selecciona una cantidad de estrellas', false);
        return;
    }
    const resultado = await calificarProducto(appState.productoModalActual.id, appState.socioData.id, calificacionSeleccionada);
    document.getElementById('calificacionMensaje').innerHTML = resultado.success
        ? '<span style="color: #8fb86a;">Calificacion enviada</span>'
        : '<span style="color: #e0b8a0;">Error al calificar</span>';
    if (resultado.success) {
        setTimeout(() => {
            document.getElementById('panelCalificacion').style.display = 'none';
            cargarProductosPublicos();
        }, 1200);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('formEditProducto')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!appState.productoEditandoId) return;
        const updates = {
            nombre: document.getElementById('editNombre').value,
            cepa: document.getElementById('editCepa').value,
            thc_porcentaje: parseFloat(document.getElementById('editThc').value) || null,
            cbd_porcentaje: parseFloat(document.getElementById('editCbd').value) || null,
            precio_por_10g: parseFloat(document.getElementById('editPrecio').value) || 1600,
            descripcion: document.getElementById('editDescripcion').value,
            imagen_url: document.getElementById('editImagenUrl').value || null
        };
        const { error } = await supabaseClient.from('productos').update(updates).eq('id', appState.productoEditandoId);
        if (error) {
            mostrarMensaje(`No se pudo actualizar el producto: ${error.message}`, false);
            return;
        }
        mostrarMensaje('Producto actualizado', true);
        cerrarEditProducto();
        if (typeof cargarProductosAdmin === 'function') await cargarProductosAdmin();
        if (typeof cargarProductosPublicos === 'function') await cargarProductosPublicos();
    });

    document.querySelector('#productoModal .cerrar-modal')?.addEventListener('click', cerrarProductoModal);
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('productoModal')) cerrarProductoModal();
        if (event.target === document.getElementById('editProductoModal')) cerrarEditProducto();
    });
});

console.log('Modals loaded');
