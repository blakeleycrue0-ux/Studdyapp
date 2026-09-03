/* ==========================================================================
   Landing: las dos piezas que se montan con JavaScript.

   1. La demo de la pantalla de objetivo, dibujada con el mismo motor de
      gráficas que usa la app.
   2. El carrusel de reseñas.
   ========================================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------------------
  // RESEÑAS
  //
  // OJO: estas fichas son EJEMPLOS. Studdy todavía no tiene usuarios, así que
  // no hay reseñas reales que enseñar. Por eso cada tarjeta lleva la etiqueta
  // "Ejemplo" y la sección lo dice encima: nadie que entre puede confundirlas
  // con opiniones de personas reales.
  //
  // Cuando haya reseñas de verdad, se sustituye esta lista por las suyas y se
  // quitan la etiqueta de la tarjeta y la línea de aviso de index.html.
  // ------------------------------------------------------------------------

  var RESENAS = [
    {
      estrellas: 5,
      texto: 'Subo el tema de historia y me saca el esquema con las fechas ' +
        'separadas de las causas. Antes tardaba una tarde en hacerlo yo.',
      quien: 'Estudiante de 2º de Bachillerato',
      nivel: 'Humanidades',
    },
    {
      estrellas: 5,
      texto: 'Lo que más uso son las flashcards. Me dice cuáles tocan cada día ' +
        'y no tengo que decidir yo por dónde empezar.',
      quien: 'Estudiante de 4º de la ESO',
      nivel: 'ESO',
    },
    {
      estrellas: 4,
      texto: 'Los exámenes que genera están al nivel de los del instituto, no ' +
        'son preguntas de cultura general. Eso es lo que buscaba.',
      quien: 'Estudiante de 1º de Bachillerato',
      nivel: 'Ciencias',
    },
    {
      estrellas: 5,
      texto: 'La presentación para exponer la sacó de mis apuntes en un minuto. ' +
        'Solo tuve que cambiarle dos diapositivas.',
      quien: 'Estudiante de FP de Grado Superior',
      nivel: 'Informática',
    },
    {
      estrellas: 5,
      texto: 'El chat ya sabe en qué curso estoy, así que no le tengo que ' +
        'explicar el contexto cada vez que le pregunto una duda.',
      quien: 'Estudiante de Universidad',
      nivel: 'Grado',
    },
    {
      estrellas: 4,
      texto: 'Ver los días que llevo seguidos me da rabia romperlos. Suena ' +
        'tonto pero es lo que hace que me siente.',
      quien: 'Estudiante de 3º de la ESO',
      nivel: 'ESO',
    },
  ];

  // ------------------------------------------------------------------------
  // Demo de la pantalla de objetivo
  // ------------------------------------------------------------------------

  function pintarDemo() {
    var slot = document.getElementById('demo-objetivo');
    if (!slot || !window.Studdy || !Studdy.charts) return;

    var fin = new Date();
    fin.setMonth(fin.getMonth() + 3);
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    var fecha = fin.getDate() + ' ' + MESES[fin.getMonth()] + ' ' + fin.getFullYear();

    slot.innerHTML =
      '<div class="goal-card">' +
        '<div class="goal-card__head">' +
          '<span class="pill pill--accent">' + Studdy.icons.diana + 'De 6 a 8</span>' +
          '<span class="goal-card__fecha">' + Studdy.escapeHtml(fecha) + '</span>' +
        '</div>' +
        Studdy.charts.curva({
          desde: 6, hasta: 8,
          etiquetaIni: 'Ahora 6',
          etiquetaFin: '8',
          pasos: ['Hoy', 'En 3 meses'],
          alt: 'Curva estimada de un 6 a un 8',
        }) +
        '<p class="goal-card__pie">' + Studdy.icons.info +
          'Estimación con los números que tú das. La app no promete notas.</p>' +
      '</div>';
  }

  function pintarSemana() {
    var slot = document.getElementById('demo-semana');
    if (!slot || !window.Studdy || !Studdy.charts) return;

    // Ejemplo de la pantalla, no datos de nadie: en la app estas barras salen
    // de lo que hayas hecho tú.
    var dias = [
      { etiqueta: 'L', valor: 3 }, { etiqueta: 'M', valor: 5 },
      { etiqueta: 'X', valor: 2 }, { etiqueta: 'J', valor: 6 },
      { etiqueta: 'V', valor: 4 }, { etiqueta: 'S', valor: 0 },
      { etiqueta: 'D', valor: 4, hoy: true },
    ];

    slot.innerHTML =
      '<div class="demo-card">' +
        '<div class="demo-card__head">' +
          '<div>' +
            '<b>6 días activos</b>' +
            '<span>24 cosas hechas esta semana</span>' +
          '</div>' +
          '<span class="pill pill--accent">' + Studdy.icons.fuego + '6 días</span>' +
        '</div>' +
        Studdy.charts.barras(dias) +
      '</div>';
  }

  // ------------------------------------------------------------------------
  // Carrusel de reseñas
  // ------------------------------------------------------------------------

  function estrellas(n) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<svg class="star' + (i <= n ? ' star--on' : '') + '" viewBox="0 0 24 24" ' +
        'aria-hidden="true"><path d="m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.1-5.9 3.1 1.2-6.5' +
        'L2.5 9.5l6.6-.9 2.9-6Z"/></svg>';
    }
    return '<span class="stars" aria-label="' + n + ' de 5 estrellas">' + html + '</span>';
  }

  function pintarResenas() {
    var pista = document.getElementById('resenas-pista');
    var puntos = document.getElementById('resenas-puntos');
    if (!pista || !window.Studdy) return;

    pista.innerHTML = RESENAS.map(function (r) {
      return '<article class="review">' +
        '<div class="review__top">' +
          estrellas(r.estrellas) +
          '<span class="review__tag">Ejemplo</span>' +
        '</div>' +
        '<p class="review__text">' + Studdy.escapeHtml(r.texto) + '</p>' +
        '<div class="review__quien">' +
          '<span class="review__nombre">' + Studdy.escapeHtml(r.quien) + '</span>' +
          '<span class="review__nivel">' + Studdy.escapeHtml(r.nivel) + '</span>' +
        '</div>' +
      '</article>';
    }).join('');

    puntos.innerHTML = RESENAS.map(function (r, i) {
      return '<button class="dot' + (i === 0 ? ' is-on' : '') + '" type="button" ' +
        'data-i="' + i + '" aria-label="Reseña ' + (i + 1) + '"></button>';
    }).join('');

    var tarjetas = Array.prototype.slice.call(pista.children);

    // El punto activo se decide mirando qué tarjeta está más centrada, así
    // funciona igual si el usuario arrastra que si pulsa un punto.
    var pendiente = false;
    pista.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () {
        pendiente = false;
        var centro = pista.scrollLeft + pista.clientWidth / 2;
        var mejor = 0, corta = Infinity;

        tarjetas.forEach(function (t, i) {
          var d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - centro);
          if (d < corta) { corta = d; mejor = i; }
        });

        Studdy.$$('.dot', puntos).forEach(function (p, i) {
          p.classList.toggle('is-on', i === mejor);
        });
      });
    });

    puntos.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      var t = tarjetas[parseInt(b.dataset.i, 10)];
      pista.scrollTo({ left: t.offsetLeft - 20, behavior: 'smooth' });
    });
  }

  // ------------------------------------------------------------------------

  pintarDemo();
  pintarSemana();
  pintarResenas();
})();
