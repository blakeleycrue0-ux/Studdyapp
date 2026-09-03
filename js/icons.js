/* ==========================================================================
   Iconos.

   Solo quedan los que son un control: una flecha que lleva a algún sitio, una
   equis que cierra, una marca que confirma. Todo lo demás —los pictogramas
   decorativos que acompañaban a cada apunte, cada asignatura y cada
   herramienta— se ha retirado del diseño: ahora esa jerarquía la marcan la
   tipografía, las líneas y el espacio.

   Los nombres antiguos siguen existiendo devolviendo cadena vacía, para que
   ninguna vista se rompa por pedir un icono que ya no se dibuja.
   ========================================================================== */

Studdy.icons = (function () {
  'use strict';

  function svg(cuerpo, grosor) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
      (grosor || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + cuerpo + '</svg>';
  }

  var iconos = {
    // --- Controles ---
    flecha:      svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 1.9),
    atras:       svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 1.9),
    chevron:     svg('<path d="M9 6l6 6-6 6"/>', 1.9),
    chevronIzq:  svg('<path d="M15 6l-6 6 6 6"/>', 1.9),
    ok:          svg('<path d="M20 6 9 17l-5-5"/>', 2.2),
    ko:          svg('<path d="M18 6 6 18M6 6l12 12"/>', 2.2),
    cerrar:      svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
    mas:         svg('<path d="M12 5v14M5 12h14"/>', 2),
    info:        svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8h.01"/>', 1.7),
  };

  // Los decorativos ya no se dibujan.
  ['apunte', 'esquema', 'flashcards', 'examen', 'chat', 'presentacion', 'subir',
   'carpeta', 'rayo', 'diana', 'reloj', 'salir', 'chispa', 'camara', 'micro',
   'fuego', 'pegar', 'lapiz', 'campana', 'escudo', 'grafico'
  ].forEach(function (nombre) { iconos[nombre] = ''; });

  return iconos;
})();
