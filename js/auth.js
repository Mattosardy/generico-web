function mostrarPanelLogin() {
    document.getElementById('panelLogin').style.display = 'block';
    document.getElementById('panelRegister').style.display = 'none';
    document.getElementById('panelForgot').style.display = 'none';
}

function mostrarPanelRegister() {
    document.getElementById('panelLogin').style.display = 'none';
    document.getElementById('panelRegister').style.display = 'block';
    document.getElementById('panelForgot').style.display = 'none';
}

function mostrarPanelForgot() {
    document.getElementById('panelLogin').style.display = 'none';
    document.getElementById('panelRegister').style.display = 'none';
    document.getElementById('panelForgot').style.display = 'block';
}

function actualizarBotonesSesion(autenticado) {
    const mostrarLogin = autenticado ? 'none' : 'inline-block';
    const mostrarLogout = autenticado ? 'inline-block' : 'none';
    ['btnLogin', 'mobileBtnLogin'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = mostrarLogin;
    });
    ['btnLogout', 'mobileBtnLogout'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = mostrarLogout;
    });
}

async function actualizarUIporRol() {
    const usuario = await obtenerUsuarioActual();
    appState.usuarioActual = usuario;

    if (usuario) {
        const socio = await obtenerSocioPorEmail(usuario.email);
        if (socio.success && socio.data) {
            appState.rolUsuario = socio.data.rol || 'socio';
            appState.socioData = socio.data;
            document.getElementById('userName').innerHTML =
                `<i class="fas fa-${appState.rolUsuario === 'maestro' ? 'crown' : (appState.rolUsuario === 'admin' ? 'user-shield' : 'user')}"></i> ${escapeHtml(socio.data.nombre)} ${escapeHtml(socio.data.apellido)}`;
        } else {
            appState.rolUsuario = 'socio';
            appState.socioData = null;
            document.getElementById('userName').innerHTML = `<i class="fas fa-user"></i> ${escapeHtml(usuario.email)}`;
        }
        actualizarBotonesSesion(true);
    } else {
        appState.rolUsuario = 'invitado';
        appState.socioData = null;
        appState.gramosReservadosCiclo = 0;
        appState.cicloClubActual = null;
        document.getElementById('userName').innerHTML = '<i class="fas fa-user"></i> Invitado';
        actualizarBotonesSesion(false);
        mostrarPanelLogin();
    }

    document.querySelectorAll('.socio-only').forEach((el) => {
        el.style.display = appState.rolUsuario !== 'invitado' ? 'inline-block' : 'none';
    });
    document.querySelectorAll('.admin-only').forEach((el) => {
        el.style.display = (appState.rolUsuario === 'admin' || appState.rolUsuario === 'maestro') ? 'inline-block' : 'none';
    });
    document.querySelectorAll('.maestro-only').forEach((el) => {
        el.style.display = appState.rolUsuario === 'maestro' ? 'inline-block' : 'none';
    });

    if (appState.rolUsuario !== 'invitado' && appState.socioData?.id && typeof cargarReservasSocio === 'function') {
        await cargarReservasSocio();
    }
    if (appState.rolUsuario === 'admin' && typeof cargarAdminData === 'function') {
        await cargarAdminData();
    }
    if (appState.rolUsuario === 'maestro' && typeof cargarMaestroDataCompleta === 'function') {
        await cargarMaestroDataCompleta();
    }
}

async function iniciarSesion() {
    if (typeof mostrarSeccion === 'function') mostrarSeccion('login');
    mostrarPanelLogin();
}

async function cerrarSesionHandler() {
    const resultado = await cerrarSesion();
    if (!resultado.success) {
        mostrarMensaje('No se pudo cerrar sesion', false);
        return;
    }
    localStorage.setItem('cururu_seccion_activa', 'inicio');
    await verificarSesion();
    mostrarMensaje('Sesion cerrada', true);
    if (typeof mostrarSeccion === 'function') mostrarSeccion('inicio');
}

console.log('Auth loaded');
