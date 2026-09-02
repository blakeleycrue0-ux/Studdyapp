/* ==========================================================================
   Flashcards de un apunte: generación y repaso tarjeta a tarjeta.
   Se pinta dentro de la pestaña correspondiente del cuaderno.
   ========================================================================== */

Studdy.views.flashcards = (function () {
  'use strict';

  async function renderPanel(panel, apunte) {
    panel.innerHTML = Studdy.loadingHtml('Cargando las tarjetas…');

    var client = await Studdy.getClient();
    var res = await client
      .from('flashcards')
      .select('*')
      .eq('note_id', apunte.id)
      .order('created_at', { ascending: true });

    if (res.error) throw new Error(res.error.message);
    var tarjetas = res.data || [];

    if (!tarjetas.length) {
      panel.innerHTML = Studdy.views.notebook.vacio(
        Studdy.icons.flashcards,
        'Todavía no hay flashcards',
        'La IA sacará preguntas y respuestas de este apunte para que las repases.',
        'Generar flashcards'
      ) + '<div id="err" style="margin-top:14px"></div>';

      conectarGenerar(panel, apunte);
      return;
    }

    panel.innerHTML = mazo(tarjetas) +
      '<div style="margin-top:16px;text-align:center">' +
        '<button class="btn btn--ghost btn--sm" id="mas">Generar más tarjetas</button>' +
        '<div id="err" style="margin-top:12px"></div>' +
      '</div>';

    montarMazo(panel, tarjetas);
    conectarGenerar(panel, apunte, '#mas');
  }

  // ------------------------------------------------------------------------

  function mazo(tarjetas) {
    return (
      '<p class="deck__counter" id="counter"></p>' +
      '<div class="deck__progress"><span id="bar"></span></div>' +
      '<div class="flip" id="flip" role="button" tabindex="0" aria-label="Dar la vuelta a la tarjeta">' +
        '<div class="flip__inner">' +
          '<div class="flip__side flip__side--front">' +
            '<span class="flip__label">Pregunta</span>' +
            '<p class="flip__text" id="front"></p>' +
            '<span class="flip__hint">Toca para ver la respuesta</span>' +
          '</div>' +
          '<div class="flip__side flip__side--back">' +
            '<span class="flip__label">Respuesta</span>' +
            '<p class="flip__text" id="back"></p>' +
            '<span class="flip__hint">Toca para volver</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="deck__nav">' +
        '<button class="btn btn--ghost" id="prev">Anterior</button>' +
        '<button class="btn btn--primary" id="next">Siguiente</button>' +
      '</div>'
    );
  }

  function montarMazo(panel, tarjetas) {
    var indice = 0;

    var flip = Studdy.$('#flip', panel);
    var front = Studdy.$('#front', panel);
    var back = Studdy.$('#back', panel);
    var counter = Studdy.$('#counter', panel);
    var bar = Studdy.$('#bar', panel);
    var prev = Studdy.$('#prev', panel);
    var next = Studdy.$('#next', panel);

    function pintar() {
      // Si la tarjeta estaba dada la vuelta se espera a que termine el giro
      // antes de cambiar el texto, para no enseñar la respuesta a medias.
      var estabaVuelta = flip.classList.contains('is-flipped');
      flip.classList.remove('is-flipped');

      window.setTimeout(function () {
        front.textContent = tarjetas[indice].question;
        back.textContent = tarjetas[indice].answer;
      }, estabaVuelta ? 280 : 0);

      counter.textContent = (indice + 1) + ' de ' + tarjetas.length;
      bar.style.width = ((indice + 1) / tarjetas.length) * 100 + '%';
      prev.disabled = indice === 0;
      next.disabled = indice === tarjetas.length - 1;
    }

    flip.addEventListener('click', function () { flip.classList.toggle('is-flipped'); });
    flip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip.classList.toggle('is-flipped');
      }
    });

    prev.addEventListener('click', function () { if (indice > 0) { indice--; pintar(); } });
    next.addEventListener('click', function () {
      if (indice < tarjetas.length - 1) { indice++; pintar(); }
    });

    pintar();
  }

  // ------------------------------------------------------------------------

  function conectarGenerar(panel, apunte, selector) {
    var boton = Studdy.$(selector || '#generar', panel);
    if (!boton) return;

    var etiqueta = boton.textContent;

    boton.addEventListener('click', function () {
      var err = Studdy.$('#err', panel);
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generar(apunte)
        .then(function (n) {
          Studdy.app.bumpCount(apunte.id, 'flashcards', n);
          Studdy.app.navigate('#/n/' + apunte.id + '/flashcards');
        })
        .catch(function (e) {
          err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = etiqueta;
        });
    });
  }

  async function generar(apunte) {
    var respuesta = await Studdy.ai('flashcards', { content: apunte.content });

    var filas = respuesta.flashcards.map(function (f) {
      return { note_id: apunte.id, question: f.question, answer: f.answer };
    });

    var client = await Studdy.getClient();
    var out = await client.from('flashcards').insert(filas);
    if (out.error) throw new Error(out.error.message);
    return filas.length;
  }

  return { renderPanel: renderPanel };
})();
