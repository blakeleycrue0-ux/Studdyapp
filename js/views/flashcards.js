/* ==========================================================================
   Flashcards: generación a partir de un apunte y repaso tarjeta a tarjeta.
   ========================================================================== */

Studdy.views.flashcards = (function () {
  'use strict';

  function render(vista, params) {
    if (params.id) return renderMazo(vista, params.id);
    return renderLista(vista);
  }

  // ------------------------------------------------------------------------
  // Lista de apuntes sobre los que se pueden hacer flashcards
  // ------------------------------------------------------------------------

  async function renderLista(vista) {
    var apuntes = Studdy.app.state.notes;

    if (!apuntes.length) {
      vista.innerHTML = cabecera('Flashcards',
        'Preguntas y respuestas generadas desde tus propios apuntes.') + sinApuntes();
      return;
    }

    var client = await Studdy.getClient();
    var res = await client.from('flashcards').select('note_id');
    if (res.error) throw new Error(res.error.message);

    var conteo = contarPorApunte(res.data);

    vista.innerHTML =
      cabecera('Flashcards', 'Elige un apunte para repasarlo con tarjetas.') +
      '<div class="picker">' +
      apuntes.map(function (apunte) {
        var total = conteo[apunte.id] || 0;
        return (
          '<div class="picker__item">' +
            '<div class="picker__body">' +
              '<div class="picker__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</div>' +
              '<div class="picker__meta">' +
                Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) +
                (total ? ' · ' + total + (total === 1 ? ' tarjeta' : ' tarjetas') : '') +
              '</div>' +
            '</div>' +
            '<a class="btn ' + (total ? 'btn--soft' : 'btn--ghost') + ' btn--sm" ' +
              'href="#/flashcards/' + apunte.id + '">' +
              (total ? 'Repasar' : 'Generar') +
            '</a>' +
          '</div>'
        );
      }).join('') +
      '</div>';
  }

  // ------------------------------------------------------------------------
  // Mazo de un apunte
  // ------------------------------------------------------------------------

  async function renderMazo(vista, noteId) {
    var apunte = Studdy.app.findNote(noteId);
    if (!apunte) {
      vista.innerHTML = Studdy.views.notes.volver('#/flashcards', 'Flashcards') +
        Studdy.errorHtml('Ese apunte no existe o ya no está disponible.');
      return;
    }

    var client = await Studdy.getClient();
    var res = await client
      .from('flashcards')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });

    if (res.error) throw new Error(res.error.message);
    var tarjetas = res.data || [];

    var encabezado =
      Studdy.views.notes.volver('#/flashcards', 'Flashcards') +
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</h1>' +
        '<p class="page-head__sub">' + Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) + '</p>' +
      '</div></div>';

    if (!tarjetas.length) {
      vista.innerHTML = encabezado +
        '<div class="empty">' +
          '<div class="empty__icon">' + ICONO + '</div>' +
          '<p class="empty__title">Este apunte todavía no tiene flashcards</p>' +
          '<p class="empty__text">La IA creará preguntas y respuestas a partir de su contenido.</p>' +
          '<button class="btn btn--primary" id="generar">Generar flashcards</button>' +
        '</div>' +
        '<div id="error" style="margin-top:16px"></div>';

      Studdy.$('#generar', vista).addEventListener('click', function () {
        var boton = this;
        var error = Studdy.$('#error', vista);
        error.innerHTML = '';
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Generando…';

        generar(apunte)
          .then(function () { renderMazo(vista, noteId); })
          .catch(function (err) {
            error.innerHTML = Studdy.errorHtml(err.message);
            boton.disabled = false;
            boton.textContent = 'Generar flashcards';
          });
      });
      return;
    }

    vista.innerHTML = encabezado + '<div class="deck" id="deck"></div>';
    montarMazo(Studdy.$('#deck', vista), tarjetas);
  }

  function montarMazo(contenedor, tarjetas) {
    var indice = 0;

    contenedor.innerHTML =
      '<p class="deck__counter" id="counter"></p>' +
      '<div class="flip" id="flip" role="button" tabindex="0" aria-label="Dar la vuelta a la tarjeta">' +
        '<div class="flip__inner">' +
          '<div class="flip__side flip__side--front">' +
            '<span class="flip__label">Pregunta</span>' +
            '<p class="flip__text" id="front"></p>' +
            '<span class="flip__hint">Haz clic para ver la respuesta</span>' +
          '</div>' +
          '<div class="flip__side flip__side--back">' +
            '<span class="flip__label">Respuesta</span>' +
            '<p class="flip__text" id="back"></p>' +
            '<span class="flip__hint">Haz clic para volver</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="deck__nav">' +
        '<button class="btn btn--ghost" id="prev">Anterior</button>' +
        '<button class="btn btn--primary" id="next">Siguiente</button>' +
      '</div>';

    var flip = Studdy.$('#flip', contenedor);
    var front = Studdy.$('#front', contenedor);
    var back = Studdy.$('#back', contenedor);
    var counter = Studdy.$('#counter', contenedor);
    var prev = Studdy.$('#prev', contenedor);
    var next = Studdy.$('#next', contenedor);

    function pintar() {
      // Si la tarjeta estaba dada la vuelta, se espera a que termine el giro
      // antes de cambiar el texto: así no se ve la respuesta de la siguiente
      // tarjeta a mitad de la animación.
      var estabaVuelta = flip.classList.contains('is-flipped');
      flip.classList.remove('is-flipped');

      window.setTimeout(function () {
        front.textContent = tarjetas[indice].question;
        back.textContent = tarjetas[indice].answer;
      }, estabaVuelta ? 300 : 0);

      counter.textContent = (indice + 1) + ' de ' + tarjetas.length;
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

    prev.addEventListener('click', function () {
      if (indice > 0) { indice--; pintar(); }
    });

    next.addEventListener('click', function () {
      if (indice < tarjetas.length - 1) { indice++; pintar(); }
    });

    pintar();
  }

  // ------------------------------------------------------------------------

  async function generar(apunte) {
    var respuesta = await Studdy.ai('flashcards', { content: apunte.content });

    var filas = respuesta.flashcards.map(function (f) {
      return { note_id: apunte.id, question: f.question, answer: f.answer };
    });

    var client = await Studdy.getClient();
    var out = await client.from('flashcards').insert(filas);
    if (out.error) throw new Error(out.error.message);
  }

  function contarPorApunte(filas) {
    var conteo = {};
    (filas || []).forEach(function (f) {
      conteo[f.note_id] = (conteo[f.note_id] || 0) + 1;
    });
    return conteo;
  }

  function cabecera(titulo, subtitulo) {
    return '<div class="page-head"><div>' +
      '<h1 class="page-head__title">' + Studdy.escapeHtml(titulo) + '</h1>' +
      '<p class="page-head__sub">' + Studdy.escapeHtml(subtitulo) + '</p>' +
      '</div></div>';
  }

  function sinApuntes() {
    return '<div class="empty">' +
      '<div class="empty__icon">' + ICONO + '</div>' +
      '<p class="empty__title">Aún no tienes apuntes</p>' +
      '<p class="empty__text">Las flashcards se generan a partir de un apunte, ' +
        'así que primero sube uno.</p>' +
      '<a class="btn btn--primary" href="#/apuntes/subir">Subir tu primer apunte</a>' +
      '</div>';
  }

  var ICONO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="14" height="15" rx="2.5"/>' +
    '<path d="M6.5 3.5h11a3 3 0 0 1 3 3v11"/><path d="M6.5 12.5h6M6.5 16.5h3.5"/></svg>';

  return { render: render, cabecera: cabecera, icono: ICONO };
})();
