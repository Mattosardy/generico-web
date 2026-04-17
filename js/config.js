// Global shared state for the front-end app.
window.configSistema = {
    horasLimitePrimer: 48,
    horasLimiteUltimo: 72
};

window.appState = {
    usuarioActual: null,
    rolUsuario: 'invitado',
    socioData: null,
    fechasEntrega: null,
    productoEditandoId: null,
    productoModalActual: null,
    gramosSeleccionadosPedido: null,
    galeriaActual: { imagenes: [], indice: 0, productoId: null },
    catalogoProductos: {},
    historiaGaleria: [],
    noticiaGaleriaActual: { imagenes: [], indice: 0 },
    reservasChart: null,
    sociosChart: null,
    configWhatsApp: { phoneNumberId: null, accessToken: null }
};

console.log('Config loaded');
