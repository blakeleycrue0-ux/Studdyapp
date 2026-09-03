/* ==========================================================================
   Gráficas en SVG puro. Sin librerías, sin canvas.

   Cada función devuelve una cadena de HTML lista para insertar. Los estilos
   y las animaciones viven en el CSS (.chart*), así que aquí solo se calcula
   geometría.
   ========================================================================== */

Studdy.charts = (function () {
  'use strict';

  var contador = 0;
  function uid(prefijo) { contador++; return prefijo + '-' + contador; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function esc(s) { return Studdy.escapeHtml(String(s)); }

  // ------------------------------------------------------------------------
  // Curva de proyección.
  //
  // Dibuja una S que sale de `desde` y se acerca a `hasta`. No es una
  // predicción: es la forma que tiene una curva de aprendizaje constante,
  // dibujada con los dos números que ha dado el usuario. Quien la mire debe
  // leer siempre debajo que es una estimación.
  //
  //   { desde, hasta, pasos: ['Sem 1', …], etiquetaFin }
  // ------------------------------------------------------------------------

  function curva(o) {
    var W = 320, H = 180;
    var x0 = 10, x1 = W - 10, y0 = 30, y1 = H - 28;

    var desde = Number(o.desde);
    var hasta = Number(o.hasta);
    var min = Math.max(0, Math.min(desde, hasta) - 1.4);
    var max = Math.min(10.6, Math.max(desde, hasta) + 0.7);
    if (max - min < 1) max = min + 1;

    function X(t) { return x0 + (x1 - x0) * t; }
    function Y(v) { return y1 - (y1 - y0) * ((v - min) / (max - min)); }

    // smoothstep: arranca lento, acelera y se aplana al final.
    function valor(t) { return desde + (hasta - desde) * (t * t * (3 - 2 * t)); }

    var puntos = [];
    for (var i = 0; i <= 48; i++) {
      var t = i / 48;
      puntos.push(r2(X(t)) + ' ' + r2(Y(valor(t))));
    }

    var linea = 'M' + puntos.join(' L');
    var area = linea + ' L' + r2(x1) + ' ' + y1 + ' L' + x0 + ' ' + y1 + ' Z';

    var grad = uid('grad');
    var yMeta = r2(Y(hasta));
    var yIni = r2(Y(desde));

    var ejes = (o.pasos || []).map(function (p, k, todos) {
      var t = todos.length === 1 ? 1 : k / (todos.length - 1);
      return '<span style="left:' + r2(t * 100) + '%">' + esc(p) + '</span>';
    }).join('');

    return '' +
      '<div class="chart chart--curva">' +
        '<svg class="chart__svg" viewBox="0 0 ' + W + ' ' + H + '" ' +
             'role="img" aria-label="' + esc(o.alt || 'Curva de progreso estimada') + '">' +
          '<defs><linearGradient id="' + grad + '" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--accent)" stop-opacity=".34"/>' +
            '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>' +
          '</linearGradient></defs>' +

          '<line class="chart__base" x1="' + x0 + '" y1="' + y1 + '" x2="' + r2(x1) + '" y2="' + y1 + '"/>' +
          '<line class="chart__meta" x1="' + x0 + '" y1="' + yMeta + '" x2="' + r2(x1) + '" y2="' + yMeta + '"/>' +

          '<path class="chart__area" d="' + area + '" fill="url(#' + grad + ')"/>' +
          '<path class="chart__linea" d="' + linea + '" pathLength="100"/>' +

          '<circle class="chart__punto chart__punto--ini" cx="' + x0 + '" cy="' + yIni + '" r="4.5"/>' +
          '<circle class="chart__punto chart__punto--fin" cx="' + r2(x1) + '" cy="' + yMeta + '" r="5.5"/>' +
        '</svg>' +

        '<span class="chart__globo chart__globo--ini" style="top:' + r2((yIni / H) * 100) + '%">' +
          esc(o.etiquetaIni || desde) + '</span>' +
        '<span class="chart__globo chart__globo--fin" style="top:' + r2((yMeta / H) * 100) + '%">' +
          esc(o.etiquetaFin || hasta) + '</span>' +

        (ejes ? '<div class="chart__eje">' + ejes + '</div>' : '') +
      '</div>';
  }

  // ------------------------------------------------------------------------
  // Barras. datos: [{ etiqueta, valor, hoy }]
  // ------------------------------------------------------------------------

  function barras(datos, o) {
    o = o || {};
    var tope = datos.reduce(function (m, d) { return Math.max(m, d.valor); }, 0);
    if (!tope) tope = 1;

    return '<div class="chart-barras' + (o.clase ? ' ' + o.clase : '') + '">' +
      datos.map(function (d, i) {
        var alto = Math.round((d.valor / tope) * 100);
        return '<div class="barra' + (d.hoy ? ' barra--hoy' : '') +
            (d.valor ? '' : ' barra--cero') + '">' +
          '<span class="barra__valor">' + (d.valor || '') + '</span>' +
          '<span class="barra__caja">' +
            '<span class="barra__fill" style="--h:' + Math.max(alto, d.valor ? 8 : 3) +
              '%;--d:' + (i * 55) + 'ms"></span>' +
          '</span>' +
          '<span class="barra__etiqueta">' + esc(d.etiqueta) + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // ------------------------------------------------------------------------
  // Línea simple sobre una serie de valores 0..100. datos: [{etiqueta, valor}]
  // ------------------------------------------------------------------------

  function serie(datos, o) {
    o = o || {};
    var W = 320, H = 130, x0 = 8, x1 = W - 8, y0 = 14, y1 = H - 24;

    if (datos.length < 2) return '';

    function X(i) { return x0 + (x1 - x0) * (i / (datos.length - 1)); }
    function Y(v) { return y1 - (y1 - y0) * (Math.max(0, Math.min(100, v)) / 100); }

    var d = datos.map(function (p, i) {
      return (i ? 'L' : 'M') + r2(X(i)) + ' ' + r2(Y(p.valor));
    }).join(' ');

    var area = d + ' L' + r2(X(datos.length - 1)) + ' ' + y1 + ' L' + x0 + ' ' + y1 + ' Z';
    var grad = uid('gs');

    return '<div class="chart chart--serie">' +
      '<svg class="chart__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
           'aria-label="' + esc(o.alt || 'Evolución') + '">' +
        '<defs><linearGradient id="' + grad + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="var(--tile,var(--accent))" stop-opacity=".3"/>' +
          '<stop offset="100%" stop-color="var(--tile,var(--accent))" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        '<line class="chart__base" x1="' + x0 + '" y1="' + y1 + '" x2="' + r2(x1) + '" y2="' + y1 + '"/>' +
        '<path class="chart__area" d="' + area + '" fill="url(#' + grad + ')"/>' +
        '<path class="chart__linea chart__linea--tinte" d="' + d + '" pathLength="100"/>' +
        datos.map(function (p, i) {
          return '<circle class="chart__nodo" cx="' + r2(X(i)) + '" cy="' + r2(Y(p.valor)) +
            '" r="3.4" style="--d:' + (400 + i * 70) + 'ms"/>';
        }).join('') +
      '</svg>' +
      '<div class="chart__eje chart__eje--extremos">' +
        '<span style="left:0">' + esc(datos[0].etiqueta) + '</span>' +
        '<span style="left:100%">' + esc(datos[datos.length - 1].etiqueta) + '</span>' +
      '</div>' +
    '</div>';
  }

  return { curva: curva, barras: barras, serie: serie };
})();
