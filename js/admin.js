function renderizarPreviewImagenes(files, previewId) {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (!files?.length) {
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = '';
    Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.insertAdjacentHTML('beforeend', `
                <img src="${event.target.result}" style="width: 110px; height: 82px; object-fit: cover; border-radius: 10px; border: 1px solid #7ca35a;">
            `);
        };
        reader.readAsDataURL(file);
    });
    preview.style.display = 'flex';
    preview.style.flexWrap = 'wrap';
    preview.style.gap = '10px';
}

const MAX_IMAGENES_POR_CONTENIDO = 3;
const archivosAcumuladosPorInput = {};

function normalizarUrlsImagenes(value) {
    return String(value || '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function validarMaximoImagenes(urls = [], files = null, contexto = 'contenido') {
    const total = (urls?.length || 0) + (files?.length || 0);
    if (total > MAX_IMAGENES_POR_CONTENIDO) {
        throw new Error(`Solo se permiten hasta ${MAX_IMAGENES_POR_CONTENIDO} imagenes por ${contexto}.`);
    }
}

function obtenerClaveArchivo(file) {
    return [file?.name || '', file?.size || 0, file?.lastModified || 0].join('__');
}

function sincronizarInputConArchivos(input, files = []) {
    if (!input) return;
    const dataTransfer = new DataTransfer();
    Array.from(files || []).forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
}

function obtenerArchivosAcumulados(inputId) {
    return archivosAcumuladosPorInput[inputId] || [];
}

function limpiarArchivosAcumulados(inputId, previewId = null) {
    archivosAcumuladosPorInput[inputId] = [];
    const input = document.getElementById(inputId);
    if (input) {
        input.value = '';
        sincronizarInputConArchivos(input, []);
    }
    if (previewId) renderizarPreviewImagenes([], previewId);
}

function configurarInputImagenesConLimite(inputId, previewId, contexto) {
    const input = document.getElementById(inputId);
    if (!input) return;
    archivosAcumuladosPorInput[inputId] = [];
    input.addEventListener('change', (event) => {
        const nuevos = Array.from(event.target.files || []);
        if (!nuevos.length) return;

        const actuales = obtenerArchivosAcumulados(inputId);
        const mapa = new Map(actuales.map((file) => [obtenerClaveArchivo(file), file]));
        nuevos.forEach((file) => {
            mapa.set(obtenerClaveArchivo(file), file);
        });
        const acumulados = Array.from(mapa.values());

        if (acumulados.length > MAX_IMAGENES_POR_CONTENIDO) {
            mostrarMensaje(`Solo podes seleccionar hasta ${MAX_IMAGENES_POR_CONTENIDO} imagenes para ${contexto}.`, false);
            sincronizarInputConArchivos(event.target, actuales);
            return;
        }

        archivosAcumuladosPorInput[inputId] = acumulados;
        sincronizarInputConArchivos(event.target, acumulados);
        renderizarPreviewImagenes(acumulados, previewId);
    });
}

async function subirMultiplesImagenes(bucket, files, prefijo) {
    const imagenes = [];
    for (const file of Array.from(files || [])) {
        const ext = file.name.split('.').pop();
        const fileName = `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabaseClient.storage.from(bucket).upload(fileName, file);
        if (error) {
            const mensaje = String(error.message || '').toLowerCase();
            const bucketFaltante = error.statusCode === '400' || error.statusCode === 400 || mensaje.includes('bucket') || mensaje.includes('not found');
            if (bucketFaltante) {
                throw new Error(`No existe o no esta listo el bucket "${bucket}" en Supabase Storage.`);
            }
            throw error;
        }
        imagenes.push(supabaseClient.storage.from(bucket).getPublicUrl(fileName).data.publicUrl);
    }
    return imagenes;
}

async function cargarAdminData() {
    const cards = document.getElementById('adminCards');
    if (!cards) return;

    const [socios, solicitudes, noticias, productos, reservas] = await Promise.all([
        supabaseClient.from('socios').select('*', { count: 'exact', head: true }),
        supabaseClient.from('solicitudes_membresia').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabaseClient.from('noticias').select('*', { count: 'exact', head: true }),
        supabaseClient.from('productos').select('*', { count: 'exact', head: true }),
        supabaseClient.from('reservas_mensuales').select('*', { count: 'exact', head: true }).eq('estado', 'confirmado')
    ]);

    cards.innerHTML = `
        <div class="card"><div class="card-number">${socios.count || 0}</div><div class="card-label">Socios</div></div>
        <div class="card"><div class="card-number">${solicitudes.count || 0}</div><div class="card-label">Solicitudes</div></div>
        <div class="card"><div class="card-number">${noticias.count || 0}</div><div class="card-label">Noticias</div></div>
        <div class="card"><div class="card-number">${productos.count || 0}</div><div class="card-label">Productos</div></div>
        <div class="card"><div class="card-number">${reservas.count || 0}</div><div class="card-label">Reservas</div></div>
    `;

    await Promise.all([
        cargarNoticiasAdmin(),
        cargarActividadesAdmin(),
        cargarProductosAdmin(),
        cargarSolicitudesAdmin(),
        cargarSociosAdmin(),
        cargarReservasAdmin(),
        cargarManualAdmin(),
        cargarSociosParaMensajes(),
        cargarHistorialMensajes()
    ]);
    if (typeof cargarGraficosDashboard === 'function') await cargarGraficosDashboard();
}

async function cargarNoticiasAdmin() {
    const container = document.getElementById('admin-noticias');
    if (!container) return;
    const noticias = (await obtenerNoticias()) || [];

    container.innerHTML = `
        <form id="formNoticiaAdmin">
            <h3>Nueva noticia</h3>
            <div class="form-grid">
                <div class="form-group full-width"><input type="text" id="noticiaTituloAdmin" placeholder="Titulo" required></div>
                <div class="form-group full-width"><textarea id="noticiaContenidoAdmin" rows="4" placeholder="Contenido" required></textarea></div>
                <div class="form-group"><input type="text" id="noticiaAutorAdmin" placeholder="Autor"></div>
            </div>
            <div style="margin: 15px 0;">
                <label style="color: #c8d8b5; display: block; margin-bottom: 8px;"><i class="fas fa-image"></i> Imágenes opcionales</label>
                <input type="file" id="noticiaImagenAdmin" accept="image/*" multiple style="background: rgba(8,15,6,0.8); border: 1px solid rgba(100,140,75,0.4); border-radius: 12px; padding: 10px; color: #e0ecd0; width: 100%;">
            </div>
            <div id="noticiaPreview" style="margin: 10px 0; text-align: center;"></div>
            <button type="submit" class="btn-submit">Publicar noticia</button>
        </form>
        <hr>
        ${noticias.length ? `
            <table class="tabla-datos">
                <thead><tr><th>Fecha</th><th>Titulo</th><th>Imagen</th><th>Acciones</th></tr></thead>
                <tbody>${noticias.map((noticia) => `
                    <tr>
                        <td>${new Date(noticia.fecha_publicacion).toLocaleDateString('es')}</td>
                        <td>${escapeHtml(noticia.titulo)}</td>
                        <td>${normalizarListaImagenes(noticia.imagen_url).length ? 'Si' : 'No'}</td>
                        <td><button class="btn-eliminar" onclick="eliminarNoticiaAdmin('${noticia.id}')">Eliminar</button></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        ` : '<div class="loading">No hay noticias todavia.</div>'}
    `;

    configurarInputImagenesConLimite('noticiaImagenAdmin', 'noticiaPreview', 'noticias');

    document.getElementById('formNoticiaAdmin')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        let imagenes = [];
        const imagenFiles = document.getElementById('noticiaImagenAdmin')?.files;
        if (imagenFiles?.length) {
            try {
                validarMaximoImagenes([], imagenFiles, 'noticias');
                imagenes = await subirMultiplesImagenes('noticias', imagenFiles, 'noticia');
            } catch (error) {
                mostrarMensaje(`Las imagenes no se pudieron subir: ${error.message}`, false);
                return;
            }
        }

        const { error } = await supabaseClient.from('noticias').insert([{
            titulo: document.getElementById('noticiaTituloAdmin').value,
            contenido: document.getElementById('noticiaContenidoAdmin').value,
            autor: document.getElementById('noticiaAutorAdmin').value || 'Admin',
            imagen_url: imagenes.length > 1 ? JSON.stringify(imagenes) : (imagenes[0] || null)
        }]);
        if (error) {
            mostrarMensaje(`No se pudo crear la noticia: ${error.message}`, false);
            return;
        }

        mostrarMensaje('Noticia publicada', true);
        await cargarNoticiasAdmin();
        if (typeof cargarNoticias === 'function') await cargarNoticias();
    });
}

window.eliminarNoticiaAdmin = async function(id) {
    if (!confirm('Eliminar noticia?')) return;
    const { error } = await supabaseClient.from('noticias').delete().eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo eliminar: ${error.message}`, false);
        return;
    }
    await cargarNoticiasAdmin();
    if (typeof cargarNoticias === 'function') await cargarNoticias();
};

async function cargarActividadesAdmin() {
    const container = document.getElementById('admin-actividades');
    if (!container) return;
    const actividades = (await obtenerActividades()) || [];

    container.innerHTML = `
        <form id="formActividadAdmin">
            <h3>Nueva actividad</h3>
            <div class="form-grid">
                <div class="form-group full-width">
                    <label style="color: #c8d8b5;">Tipo</label>
                    <select id="actividadTipoAdmin" style="background: rgba(8,15,6,0.8); border: 1px solid rgba(100,140,75,0.4); border-radius: 12px; padding: 12px; color: #e0ecd0;">
                        <option value="actividad">Actividad</option>
                        <option value="sorteo">Sorteo</option>
                        <option value="regalo">Regalo</option>
                    </select>
                </div>
                <div class="form-group full-width"><input type="text" id="actividadTituloAdmin" placeholder="Titulo" required></div>
                <div class="form-group"><input type="date" id="actividadFechaAdmin" required></div>
                <div class="form-group"><input type="time" id="actividadHoraAdmin"></div>
                <div class="form-group"><input type="text" id="actividadUbicacionAdmin" placeholder="Ubicacion"></div>
                <div class="form-group full-width"><textarea id="actividadDescripcionAdmin" rows="3" placeholder="Descripcion"></textarea></div>
                <div class="form-group full-width">
                    <label style="color: #c8d8b5; display: block; margin-bottom: 8px;"><i class="fas fa-image"></i> Imagenes opcionales (max. 3)</label>
                    <input type="file" id="actividadImagenAdmin" accept="image/*" multiple style="background: rgba(8,15,6,0.8); border: 1px solid rgba(100,140,75,0.4); border-radius: 12px; padding: 10px; color: #e0ecd0; width: 100%;">
                    <div id="actividadPreview" style="margin: 10px 0; text-align: center;"></div>
                </div>
            </div>
            <button type="submit" class="btn-submit">Crear</button>
        </form>
        <hr>
        ${actividades.length ? `
            <table class="tabla-datos">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Titulo</th><th></th></tr></thead>
                <tbody>${actividades.map((actividad) => `
                    <tr>
                        <td>${new Date(actividad.fecha).toLocaleDateString('es')}</td>
                        <td>${escapeHtml(actividad.tipo || 'actividad')}</td>
                        <td>${escapeHtml(actividad.titulo)}</td>
                        <td><button class="btn-eliminar" onclick="eliminarActividadAdmin('${actividad.id}')">Eliminar</button></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        ` : '<div class="loading">No hay actividades todavia.</div>'}
    `;

    configurarInputImagenesConLimite('actividadImagenAdmin', 'actividadPreview', 'actividades');

    document.getElementById('formActividadAdmin')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        let imagenes = [];
        const imagenFiles = document.getElementById('actividadImagenAdmin')?.files;
        if (imagenFiles?.length) {
            try {
                validarMaximoImagenes([], imagenFiles, 'actividades');
                imagenes = await subirMultiplesImagenes('noticias', imagenFiles, 'actividad');
            } catch (error) {
                mostrarMensaje(`Las imagenes no se pudieron subir: ${error.message}`, false);
                return;
            }
        }
        const { error } = await supabaseClient.from('actividades').insert([{
            titulo: document.getElementById('actividadTituloAdmin').value,
            fecha: document.getElementById('actividadFechaAdmin').value,
            hora: document.getElementById('actividadHoraAdmin').value,
            ubicacion: document.getElementById('actividadUbicacionAdmin').value,
            descripcion: document.getElementById('actividadDescripcionAdmin').value,
            tipo: document.getElementById('actividadTipoAdmin').value,
            imagen_url: imagenes.length > 1 ? JSON.stringify(imagenes) : (imagenes[0] || null)
        }]);
        if (error) {
            mostrarMensaje(`No se pudo crear la actividad: ${error.message}`, false);
            return;
        }
        mostrarMensaje('Actividad creada', true);
        await cargarActividadesAdmin();
        if (typeof cargarActividadesPublicas === 'function') await cargarActividadesPublicas();
    });
}

window.eliminarActividadAdmin = async function(id) {
    if (!confirm('Eliminar actividad?')) return;
    const { error } = await supabaseClient.from('actividades').delete().eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo eliminar: ${error.message}`, false);
        return;
    }
    await cargarActividadesAdmin();
    if (typeof cargarActividadesPublicas === 'function') await cargarActividadesPublicas();
};

async function cargarProductosAdmin() {
    const container = document.getElementById('admin-productos');
    if (!container) return;
    const productos = (await obtenerProductos()) || [];

    container.innerHTML = `
        <form id="formProductoAdmin">
            <h3>Nuevo producto</h3>
            <div class="form-grid">
                <div class="form-group full-width"><input type="text" id="productoNombreAdmin" placeholder="Nombre" required></div>
                <div class="form-group"><input type="text" id="productoCepaAdmin" placeholder="Cepa"></div>
                <div class="form-group"><input type="number" step="0.1" id="productoThcAdmin" placeholder="THC %"></div>
                <div class="form-group"><input type="number" step="0.1" id="productoCbdAdmin" placeholder="CBD %"></div>
                <div class="form-group"><input type="number" step="0.01" id="productoPrecioAdmin" placeholder="Precio 10g" value="1600"></div>
                <div class="form-group full-width"><textarea id="productoDescripcionAdmin" rows="3" placeholder="Descripcion"></textarea></div>
                <div class="form-group full-width"><textarea id="productoImagenAdmin" rows="3" placeholder="URLs de imagen opcionales, una por linea"></textarea></div>
                <div class="form-group full-width">
                    <label style="color: #c8d8b5; margin-bottom: 8px;"><i class="fas fa-image"></i> O subir varias imágenes</label>
                    <input type="file" id="productoImagenFileAdmin" accept="image/*" multiple style="background: rgba(8,15,6,0.8); border: 1px solid rgba(100,140,75,0.4); border-radius: 12px; padding: 10px; color: #e0ecd0; width: 100%;">
                    <div id="productoPreview" style="margin: 10px 0; text-align: center;"></div>
                </div>
            </div>
            <button type="submit" class="btn-submit">Agregar</button>
        </form>
        <hr>
        ${productos.length ? `
            <table class="tabla-datos">
                <thead><tr><th>Nombre</th><th>Precio</th><th>Disp.</th><th></th></tr></thead>
                <tbody>${productos.map((producto) => `
                    <tr>
                        <td>${escapeHtml(producto.nombre)}</td>
                        <td><input type="number" step="0.01" value="${producto.precio_por_10g || 1600}" style="width:100px;background:rgba(8,15,6,0.8);border:1px solid #7ca35a;border-radius:8px;padding:5px;color:#e0ecd0;" onchange="actualizarPrecioProductoAdmin('${producto.id}', this.value)"></td>
                        <td><input type="checkbox" ${producto.disponible !== false ? 'checked' : ''} onchange="actualizarDisponibilidadProductoAdmin('${producto.id}', this.checked)"></td>
                        <td><button class="btn-editar" onclick="editarProductoAdmin('${producto.id}')">Editar</button> <button class="btn-eliminar" onclick="eliminarProductoAdminClick('${producto.id}')">Eliminar</button></td>
                    </tr>
                `).join('')}</tbody>
            </table>
        ` : '<div class="loading">No hay productos todavia.</div>'}
    `;

    configurarInputImagenesConLimite('productoImagenFileAdmin', 'productoPreview', 'productos');

    document.getElementById('formProductoAdmin')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const urlsManual = normalizarUrlsImagenes(document.getElementById('productoImagenAdmin').value);

        let imagenes = [...urlsManual];
        const imagenFiles = document.getElementById('productoImagenFileAdmin')?.files;
        if (imagenFiles?.length) {
            try {
                validarMaximoImagenes(urlsManual, imagenFiles, 'productos');
                const subidas = await subirMultiplesImagenes('productos', imagenFiles, 'producto');
                imagenes = [...imagenes, ...subidas];
            } catch (error) {
                mostrarMensaje(`Las imagenes no se pudieron subir: ${error.message}`, false);
                return;
            }
        }
        if (!imagenFiles?.length) {
            try {
                validarMaximoImagenes(urlsManual, null, 'productos');
            } catch (error) {
                mostrarMensaje(error.message, false);
                return;
            }
        }

        const { data: productoCreado, error } = await supabaseClient.from('productos').insert([{
            nombre: document.getElementById('productoNombreAdmin').value,
            cepa: document.getElementById('productoCepaAdmin').value,
            thc_porcentaje: parseFloat(document.getElementById('productoThcAdmin').value) || null,
            cbd_porcentaje: parseFloat(document.getElementById('productoCbdAdmin').value) || null,
            precio_por_10g: parseFloat(document.getElementById('productoPrecioAdmin').value) || 1600,
            descripcion: document.getElementById('productoDescripcionAdmin').value,
            imagen_url: imagenes.length > 1 ? JSON.stringify(imagenes) : (imagenes[0] || null),
            disponible: true
        }]).select().single();
        if (error) {
            mostrarMensaje(`No se pudo crear el producto: ${error.message}`, false);
            return;
        }

        if (productoCreado?.id && imagenes.length) {
            for (const [index, imagenUrl] of imagenes.entries()) {
                const resultado = await agregarImagenProducto(productoCreado.id, imagenUrl, index);
                if (resultado.error) {
                    mostrarMensaje(`El producto se creo, pero una imagen no se pudo guardar: ${resultado.error.message}`, false);
                    break;
                }
            }
        }
        mostrarMensaje('Producto agregado', true);
        await cargarProductosAdmin();
        if (typeof cargarProductosPublicos === 'function') await cargarProductosPublicos();
    });
}

window.actualizarPrecioProductoAdmin = async function(id, precio) {
    const { error } = await supabaseClient.from('productos').update({ precio_por_10g: parseFloat(precio) }).eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo actualizar el precio: ${error.message}`, false);
        return;
    }
    mostrarMensaje('Precio actualizado', true);
    if (typeof cargarProductosPublicos === 'function') await cargarProductosPublicos();
};

window.actualizarDisponibilidadProductoAdmin = async function(id, disponible) {
    const { error } = await supabaseClient.from('productos').update({ disponible }).eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo actualizar disponibilidad: ${error.message}`, false);
        return;
    }
    mostrarMensaje(`Producto ${disponible ? 'disponible' : 'no disponible'}`, true);
    if (typeof cargarProductosPublicos === 'function') await cargarProductosPublicos();
};

window.eliminarProductoAdminClick = async function(id) {
    if (!confirm('Eliminar producto?')) return;
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo eliminar: ${error.message}`, false);
        return;
    }
    mostrarMensaje('Producto eliminado', true);
    await cargarProductosAdmin();
    if (typeof cargarProductosPublicos === 'function') await cargarProductosPublicos();
};

async function cargarSolicitudesAdmin() {
    const container = document.getElementById('admin-solicitudes');
    if (!container) return;
    const { data, error } = await supabaseClient.from('solicitudes_membresia').select('*').eq('estado', 'pendiente').order('fecha_solicitud', { ascending: false });
    if (error) {
        container.innerHTML = '<div class="loading">No se pudieron cargar las solicitudes.</div>';
        return;
    }
    container.innerHTML = (data || []).length ? `
        <table class="tabla-datos">
            <thead><tr><th>Fecha</th><th>Nombre</th><th>Email</th><th>Telefono</th><th>Acciones</th></tr></thead>
            <tbody>${data.map((solicitud) => `
                <tr>
                    <td>${new Date(solicitud.fecha_solicitud).toLocaleDateString('es')}</td>
                    <td>${escapeHtml(solicitud.nombre)} ${escapeHtml(solicitud.apellido)}</td>
                    <td>${escapeHtml(solicitud.email || '-')}</td>
                    <td>${escapeHtml(solicitud.telefono)}</td>
                    <td><button class="btn-aprobar" onclick="aprobarSolicitudAdmin('${solicitud.id}')">Aprobar</button> <button class="btn-rechazar" onclick="rechazarSolicitudAdmin('${solicitud.id}')">Rechazar</button></td>
                </tr>
            `).join('')}</tbody>
        </table>
    ` : '<div class="loading">No hay solicitudes pendientes.</div>';
}

window.aprobarSolicitudAdmin = async function(id) {
    const { data: solicitud, error: loadError } = await supabaseClient.from('solicitudes_membresia').select('*').eq('id', id).single();
    if (loadError || !solicitud) {
        mostrarMensaje('No se pudo cargar la solicitud', false);
        return;
    }
    const { error: insertError } = await supabaseClient.from('socios').insert([{
        nombre: solicitud.nombre,
        apellido: solicitud.apellido,
        cedula: solicitud.cedula,
        telefono: solicitud.telefono,
        email: solicitud.email,
        estado: 'activo',
        rol: 'socio'
    }]);
    if (insertError) {
        mostrarMensaje(`No se pudo crear el socio: ${insertError.message}`, false);
        return;
    }
    await supabaseClient.from('solicitudes_membresia').update({ estado: 'aprobado' }).eq('id', id);
    mostrarMensaje('Socio aprobado', true);
    await cargarSolicitudesAdmin();
    await cargarAdminData();
};

window.rechazarSolicitudAdmin = async function(id) {
    const { error } = await supabaseClient.from('solicitudes_membresia').update({ estado: 'rechazado' }).eq('id', id);
    if (error) {
        mostrarMensaje(`No se pudo rechazar: ${error.message}`, false);
        return;
    }
    await cargarSolicitudesAdmin();
};

async function cargarSociosAdmin() {
    const container = document.getElementById('admin-socios');
    if (!container) return;
    const { data, error } = await supabaseClient.from('socios').select('*').order('fecha_ingreso', { ascending: false });
    if (error) {
        container.innerHTML = '<div class="loading">No se pudieron cargar los socios.</div>';
        return;
    }
    container.innerHTML = (data || []).length ? `
        <table class="tabla-datos">
            <thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead>
            <tbody>${data.map((socio) => `
                <tr>
                    <td>${escapeHtml(socio.email || '-')}</td>
                    <td>${escapeHtml(socio.nombre)} ${escapeHtml(socio.apellido)}</td>
                    <td>${escapeHtml(socio.rol || 'socio')}</td>
                    <td>${escapeHtml(socio.estado || '-')}</td>
                </tr>
            `).join('')}</tbody>
        </table>
    ` : '<div class="loading">No hay socios.</div>';
}

async function cargarReservasAdmin() {
    const container = document.getElementById('admin-reservasAdmin');
    if (!container) return;
    const { data, error } = await supabaseClient.from('reservas_mensuales').select('*, socios(nombre, apellido)').order('fecha_retiro', { ascending: false });
    if (error) {
        container.innerHTML = '<div class="loading">No se pudieron cargar las reservas.</div>';
        return;
    }
    container.innerHTML = (data || []).length ? `
        <table class="tabla-datos">
            <thead><tr><th>Fecha</th><th>Socio</th><th>Cantidad</th><th>Estado</th></tr></thead>
            <tbody>${data.map((reserva) => `
                <tr>
                    <td>${new Date(reserva.fecha_retiro).toLocaleDateString('es')}</td>
                    <td>${escapeHtml(reserva.socios?.nombre || '-')} ${escapeHtml(reserva.socios?.apellido || '')}</td>
                    <td>${reserva.cantidad_gramos}g</td>
                    <td>${escapeHtml(reserva.estado)}</td>
                </tr>
            `).join('')}</tbody>
        </table>
    ` : '<div class="loading">No hay reservas.</div>';
}

async function cargarManualAdmin() {
    const container = document.getElementById('admin-manual');
    if (!container) return;

    container.innerHTML = `
        <div class="section" style="background: rgba(8, 15, 6, 0.18); margin-top: 10px;">
            <h3 style="color:#e8d8cc; margin-bottom: 8px;">Manual de usuario para administradores</h3>
            <p style="color:#ead6c7; line-height:1.7;">Esta guía resume cómo usar cada herramienta del panel. La idea es que cualquier persona del equipo pueda entrar, entender el flujo y mantener el sitio sin depender de soporte técnico.</p>

            <div class="manual-grid">
                <article class="manual-card">
                    <h3>Noticias y novedades</h3>
                    <p>Usá esta sección para publicar anuncios, avances, lanzamientos o recordatorios visibles en la home.</p>
                    <ul>
                        <li>Completá título y contenido antes de publicar.</li>
                        <li>Podés subir hasta 3 imágenes por novedad.</li>
                        <li>Si una novedad queda incompleta, el sitio mostrará un respaldo automático.</li>
                    </ul>
                </article>

                <article class="manual-card">
                    <h3>Productos y variedades</h3>
                    <p>Desde aquí se agregan, editan y ordenan las variedades visibles en catálogo.</p>
                    <ul>
                        <li>Cargá nombre, perfil, precio y descripción clara.</li>
                        <li>Podés usar URLs o subir imágenes, con máximo de 3 por producto.</li>
                        <li>Marcá disponibilidad para habilitar o pausar pedidos.</li>
                    </ul>
                </article>

                <article class="manual-card">
                    <h3>Actividades, sorteos y regalos</h3>
                    <p>Esta sección concentra acciones de calendario y contenido promocional.</p>
                    <ul>
                        <li>Elegí el tipo correcto: actividad, sorteo o regalo.</li>
                        <li>Agregá fecha, hora, descripción e imágenes si hace falta.</li>
                        <li>También acá se permiten hasta 3 imágenes.</li>
                    </ul>
                </article>

                <article class="manual-card">
                    <h3>Solicitudes y socios</h3>
                    <p>Permite revisar ingresos pendientes y ver la base actual de usuarios cargados.</p>
                    <ul>
                        <li>Revisá datos antes de aprobar una solicitud.</li>
                        <li>Confirmá siempre email y teléfono cuando aplique.</li>
                        <li>La tabla de socios sirve como referencia rápida de estado y rol.</li>
                    </ul>
                </article>

                <article class="manual-card">
                    <h3>Reservas y mensajes</h3>
                    <p>Acá podés monitorear movimientos y enviar comunicaciones internas.</p>
                    <ul>
                        <li>Usá mensajes para avisos generales o comunicaciones puntuales.</li>
                        <li>Verificá el destinatario antes de enviar.</li>
                        <li>Consultá el historial para controlar qué ya fue comunicado.</li>
                    </ul>
                </article>

                <article class="manual-card">
                    <h3>Buenas prácticas</h3>
                    <p>Pequeñas reglas que ayudan a mantener consistencia y orden en todo el sitio.</p>
                    <ul>
                        <li>Evitá títulos demasiado largos.</li>
                        <li>Usá imágenes livianas y bien encuadradas.</li>
                        <li>Antes de cerrar cambios, revisá la vista pública del sitio.</li>
                    </ul>
                </article>
            </div>

            <div class="manual-destacado">
                <strong style="display:block; color: var(--accent-strong); margin-bottom: 8px;">Recordatorio importante</strong>
                El panel permite cargar hasta 3 imágenes por contenido visual. Si algo no aparece como esperabas, recargá la página y revisá primero la vista pública para confirmar el resultado final.
            </div>
        </div>
    `;
}

async function cargarSociosParaMensajes() {
    const select = document.getElementById('mensajeDestinatario');
    if (!select) return;
    const { data } = await supabaseClient.from('socios').select('id, email, nombre, apellido').eq('estado', 'activo');
    select.innerHTML = '<option value="todos">Todos los socios</option>' + (data || []).map((socio) => `
        <option value="${socio.id}">${escapeHtml(socio.nombre)} ${escapeHtml(socio.apellido)} (${escapeHtml(socio.email || '-')})</option>
    `).join('');
}

async function cargarHistorialMensajes() {
    const container = document.getElementById('mensajesHistorial');
    if (!container) return;
    const { data, error } = await supabaseClient.from('notificaciones_programadas').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) {
        container.innerHTML = '<div class="loading">No se pudo cargar el historial.</div>';
        return;
    }
    container.innerHTML = (data || []).length ? data.map((mensaje) => `
        <div class="mensaje-item">
            <div class="mensaje-fecha">${new Date(mensaje.created_at).toLocaleString()}</div>
            <div class="mensaje-destino">Destino: ${mensaje.tipo === 'todos' ? 'Todos los socios' : 'Socio especifico'}</div>
            <div class="mensaje-texto">${escapeHtml(mensaje.mensaje)}</div>
        </div>
    `).join('') : '<div class="loading">No hay mensajes enviados.</div>';
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-admin-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-admin-btn').forEach((other) => other.classList.remove('active'));
            btn.classList.add('active');
            const section = btn.dataset.adminSection;
            ['noticias', 'productos', 'actividades', 'solicitudes', 'socios', 'reservasAdmin', 'mensajes', 'manual'].forEach((key) => {
                const el = document.getElementById(`admin-${key}`);
                if (el) el.style.display = key === section ? 'block' : 'none';
            });
        });
    });

    document.getElementById('enviarMensajeBtn')?.addEventListener('click', async () => {
        const destinatario = document.getElementById('mensajeDestinatario').value;
        const asunto = document.getElementById('mensajeAsunto').value;
        const texto = document.getElementById('mensajeTexto').value;
        if (!texto.trim()) {
            mostrarMensaje('Escribe un mensaje', false);
            return;
        }
        const mensajeCompleto = asunto ? `${asunto}\n\n${texto}` : texto;
        if (destinatario === 'todos') {
            const { data: socios } = await supabaseClient.from('socios').select('id').eq('estado', 'activo');
            for (const socio of socios || []) {
                await supabaseClient.from('notificaciones_programadas').insert([{ socio_id: socio.id, tipo: 'comunicado', mensaje: mensajeCompleto, fecha_programada: new Date(), estado: 'pendiente', canal: 'email' }]);
            }
            mostrarMensaje(`Mensaje cargado para ${socios?.length || 0} socios`, true);
        } else {
            await supabaseClient.from('notificaciones_programadas').insert([{ socio_id: destinatario, tipo: 'comunicado', mensaje: mensajeCompleto, fecha_programada: new Date(), estado: 'pendiente', canal: 'email' }]);
            mostrarMensaje('Mensaje cargado', true);
        }
        document.getElementById('mensajeAsunto').value = '';
        document.getElementById('mensajeTexto').value = '';
        await cargarHistorialMensajes();
    });
});

console.log('Admin loaded');
