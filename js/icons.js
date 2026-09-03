/* Iconos compartidos. Se guardan aquí para no repetir el mismo SVG en cinco
   vistas distintas y para que todos tengan el mismo trazo. */

Studdy.icons = (function () {
  'use strict';

  function svg(cuerpo, grosor) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (grosor || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + cuerpo + '</svg>';
  }

  return {
    apunte: svg('<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/>' +
      '<path d="M14 2.5v5h5M8.5 13h7M8.5 17h4.5"/>'),

    esquema: svg('<rect x="8.5" y="2.5" width="12" height="5" rx="1.5"/>' +
      '<rect x="8.5" y="16.5" width="12" height="5" rx="1.5"/>' +
      '<rect x="8.5" y="9.5" width="12" height="5" rx="1.5"/>' +
      '<path d="M3.5 5h2.5v14H3.5M6 12h2.5"/>'),

    flashcards: svg('<rect x="2.5" y="6.5" width="14" height="15" rx="2.5"/>' +
      '<path d="M6.5 3.5h11a3 3 0 0 1 3 3v11"/><path d="M6.5 12.5h6M6.5 16.5h3.5"/>'),

    examen: svg('<path d="M8.5 3.5h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-14a2 2 0 0 0-2-2h-2"/>' +
      '<rect x="8.5" y="1.8" width="7" height="4" rx="1.4"/><path d="M8.6 13.2l2 2 4.3-4.4"/>'),

    chat: svg('<path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.4A7.5 7.5 0 1 1 20.5 12.5Z"/>' +
      '<path d="m13.6 8.2.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z"/>'),

    presentacion: svg('<rect x="2.5" y="3.5" width="19" height="12.5" rx="2"/>' +
      '<path d="M12 16v5M8.5 21h7"/><path d="M6.5 12.2 9.8 8.6l2.4 2.3 3.1-3.6"/>'),

    subir: svg('<path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/>' +
      '<path d="M3.5 15v3.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V15"/>'),

    carpeta: svg('<path d="M3 7.5A2 2 0 0 1 5 5.5h3.6a2 2 0 0 1 1.5.7l1 1.3H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z"/>'),

    flecha: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.2),
    atras: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 2.2),
    chevron: svg('<path d="M9 6l6 6-6 6"/>', 2.2),
    chevronIzq: svg('<path d="M15 6l-6 6 6 6"/>', 2.2),

    ok: svg('<path d="M20 6 9 17l-5-5"/>', 2.4),
    ko: svg('<path d="M18 6 6 18M6 6l12 12"/>', 2.4),
    info: svg('<circle cx="12" cy="12" r="9.2"/><path d="M12 11v5M12 7.8h.01"/>', 2),

    rayo: svg('<path d="M13.5 2.5 4 14h6.5l-.5 7.5L19.5 10H13l.5-7.5Z"/>'),
    diana: svg('<circle cx="12" cy="12" r="8.8"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>'),
    reloj: svg('<circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.2 1.9"/>'),
    salir: svg('<path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5"/><path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.5"/>'),
    cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.6),

    // Añadidos para el rediseño
    chispa: svg('<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7L12 3Z"/><path d="M18.5 15.5l.7 1.9 1.8.7-1.8.7-.7 1.9-.7-1.9-1.8-.7 1.8-.7.7-1.9Z"/>'),
    mas: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
    camara: svg('<path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.2-2h7l1.2 2h1.8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z"/><circle cx="12" cy="13" r="3.4"/>'),
    micro: svg('<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"/>'),
    fuego: svg('<path d="M12 2.5s5.5 4.2 5.5 9.2a5.5 5.5 0 1 1-11 0c0-2 .8-3.6 1.8-4.8.3 1.4 1.2 2.3 2.2 2.3 1.4 0 1.5-1.9 1.5-6.7Z"/>'),
    pegar: svg('<rect x="8" y="8" width="12.5" height="12.5" rx="2.5"/><path d="M16 8V5.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h2.5"/>'),
    lapiz: svg('<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"/>'),
    campana: svg('<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5Z"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>'),
    escudo: svg('<path d="M12 2.5 4.5 6v6c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 2.5Z"/>'),
    grafico: svg('<path d="M4 19.5V13M10 19.5V7M16 19.5v-4M21 19.5H3"/>', 2.2),
  };
})();
