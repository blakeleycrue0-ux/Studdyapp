/* ==========================================================================
   Presentaciones: se generan desde un apunte o desde un tema escrito a mano,
   y se pasan como un carrusel de diapositivas.
   ========================================================================== */

Studdy.views.presentations = (function () {
  'use strict';

  function render(vista, params) {
    if (params.id) return renderPase(vista, params.id);
    return renderLista(vista);
  }

  // ------------------------------------------------------------------------
  // Listado + generador
  // ------------------------------------------------------------------------

  async function renderLista(vista) {
    var apuntes = Studdy.app.state.notes;

    var client = await Studdy.getClient();
    var res = await client
      .from('presentations')
      .select('id, note_id, topic, content_json, created_at')
      .order('created_at', { ascending: false });

    if (res.error) throw new Error(res.error.message);
    var guardadas = res.data || [];

    vista.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">Presentaciones</h1>' +
        '<p class="page-head__sub">Diapositivas con título y puntos clave, ' +
          'a partir de un apunte o de un tema que escribas tú.</p>' +
      '</div></div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Generar una presentación</h2></div>' +

        (apuntes.length
          ? '<label class="field" style="margin-bottom:18px;display:block">' +
              '<span class="field__label">Desde un apunte</span>' +
              '<select class="select" id="note">' +
                '<option value="" disabled hidden selected>Selecciona un apunte</option>' +
                apuntes.map(function (n) {
                  return '<option value="' + n.id + '">' +
                    Studdy.escapeHtml(Studdy.noteTitle(n.content)) + ' — ' +
                    Studdy.escapeHtml(Studdy.app.subjectName(n.subject_id)) + '</option>';
                }).join('') +
              '</select>' +
            '</label>' +
            '<div class="divider-or">o escribe un tema</div>'
          : '') +

        '<label class="field" style="margin-bottom:20px;display:block">' +
          '<span class="field__label">Tema</span>' +
          '<input class="input" type="text" id="topic" maxlength="160" spellcheck="false">' +
        '</label>' +

        '<button class="btn btn--primary" id="generar" disabled>Generar presentación</button>' +
        '<div id="error" style="margin-top:16px"></div>' +
      '</div>' +

      (guardadas.length
        ? '<h2 class="block__title" style="margin:32px 0 14px">Guardadas</h2>' +
          '<div class="picker">' + guardadas.map(filaGuardada).join('') + '</div>'
        : '');

    conectarGenerador(vista);
  }

  function filaGuardada(presentacion) {
    var contenido = presentacion.content_json || {};
    var diapositivas = contenido.slides || [];
    var apunte = presentacion.note_id ? Studdy.app.findNote(presentacion.note_id) : null;

    var origen = apunte
      ? Studdy.app.subjectName(apunte.subject_id)
      : (presentacion.topic ? 'Tema libre' : '');

    return (
      '<div class="picker__item">' +
        '<div class="picker__body">' +
          '<div class="picker__title">' +
            Studdy.escapeHtml(contenido.title || presentacion.topic || 'Presentación') +
          '</div>' +
          '<div class="picker__meta">' +
            [origen, diapositivas.length + ' diapositivas',
             Studdy.formatDate(presentacion.created_at)].filter(Boolean).join(' · ') +
          '</div>' +
        '</div>' +
        '<a class="btn btn--soft btn--sm" href="#/presentaciones/' + presentacion.id + '">Ver</a>' +
      '</div>'
    );
  }

  function conectarGenerador(vista) {
    var selectApunte = Studdy.$('#note', vista);
    var inputTema = Studdy.$('#topic', vista);
    var boton = Studdy.$('#generar', vista);
    var error = Studdy.$('#error', vista);

    function revisar() {
      boton.disabled = !((selectApunte && selectApunte.value) || inputTema.value.trim());
    }

    if (selectApunte) {
      selectApunte.addEventListener('change', function () {
        // Apunte y tema son alternativas, no se combinan.
        inputTema.value = '';
        revisar();
      });
    }

    inputTema.addEventListener('input', function () {
      if (selectApunte && inputTema.value.trim()) selectApunte.selectedIndex = 0;
      revisar();
    });

    boton.addEventListener('click', function () {
      error.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      var tema = inputTema.value.trim();
      var noteId = selectApunte ? selectApunte.value : '';

      var tarea = tema
        ? generarDesdeTema(tema)
        : generarDesdeApunte(Studdy.app.findNote(noteId));

      tarea
        .then(function (id) { Studdy.app.navigate('#/presentaciones/' + id); })
        .catch(function (err) {
          error.innerHTML = Studdy.errorHtml(err.message);
          boton.disabled = false;
          boton.textContent = 'Generar presentación';
        });
    });
  }

  // ------------------------------------------------------------------------
  // Generación
  // ------------------------------------------------------------------------

  async function generarDesdeApunte(apunte) {
    if (!apunte) throw new Error('Ese apunte no existe o ya no está disponible.');

    var respuesta = await Studdy.ai('presentation', { content: apunte.content });
    return guardar({
      note_id: apunte.id,
      topic: null,
      content_json: { title: respuesta.title, slides: respuesta.slides },
    });
  }

  async function generarDesdeTema(tema) {
    var respuesta = await Studdy.ai('presentation', { topic: tema });
    return guardar({
      note_id: null,
      topic: tema,
      content_json: { title: respuesta.title, slides: respuesta.slides },
    });
  }

  async function guardar(fila) {
    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    fila.profile_id = user.id;

    var out = await client.from('presentations').insert(fila).select('id').single();
    if (out.error) throw new Error(out.error.message);
    return out.data.id;
  }

  // ------------------------------------------------------------------------
  // Carrusel
  // ------------------------------------------------------------------------

  async function renderPase(vista, id) {
    var client = await Studdy.getClient();
    var res = await client.from('presentations').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);

    var presentacion = res.data;
    if (!presentacion) {
      vista.innerHTML = Studdy.views.notes.volver('#/presentaciones', 'Presentaciones') +
        Studdy.errorHtml('Esa presentación no existe o ya no está disponible.');
      return;
    }

    var contenido = presentacion.content_json || {};
    var diapositivas = contenido.slides || [];

    if (!diapositivas.length) {
      vista.innerHTML = Studdy.views.notes.volver('#/presentaciones', 'Presentaciones') +
        Studdy.errorHtml('Esta presentación no tiene diapositivas.');
      return;
    }

    vista.innerHTML =
      Studdy.views.notes.volver('#/presentaciones', 'Presentaciones') +
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">' +
          Studdy.escapeHtml(contenido.title || presentacion.topic || 'Presentación') +
        '</h1>' +
      '</div></div>' +
      '<div id="slide"></div>' +
      '<div class="carousel__nav">' +
        '<button class="icon-btn" id="prev" aria-label="Diapositiva anterior">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
          'stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>' +
        '</button>' +
        '<span class="carousel__count" id="count"></span>' +
        '<button class="icon-btn" id="next" aria-label="Diapositiva siguiente">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
          'stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        '</button>' +
      '</div>';

    montarCarrusel(vista, diapositivas);
  }

  function montarCarrusel(vista, diapositivas) {
    var indice = 0;
    var contenedor = Studdy.$('#slide', vista);
    var contador = Studdy.$('#count', vista);
    var anterior = Studdy.$('#prev', vista);
    var siguiente = Studdy.$('#next', vista);

    function pintar() {
      var d = diapositivas[indice];
      var puntos = Array.isArray(d.points) ? d.points : [];

      contenedor.innerHTML =
        '<div class="slide' + (indice === 0 ? ' slide--cover' : '') + '">' +
          '<h2 class="slide__title">' + Studdy.escapeHtml(d.title) + '</h2>' +
          '<ul class="slide__points">' +
            puntos.map(function (p) {
              return '<li>' + Studdy.escapeHtml(p) + '</li>';
            }).join('') +
          '</ul>' +
        '</div>';

      contador.textContent = (indice + 1) + ' / ' + diapositivas.length;
      anterior.disabled = indice === 0;
      siguiente.disabled = indice === diapositivas.length - 1;
    }

    anterior.addEventListener('click', function () {
      if (indice > 0) { indice--; pintar(); }
    });

    siguiente.addEventListener('click', function () {
      if (indice < diapositivas.length - 1) { indice++; pintar(); }
    });

    document.addEventListener('keydown', function teclado(e) {
      // El listener se retira solo cuando el carrusel deja de estar en pantalla.
      if (!document.body.contains(contenedor)) {
        document.removeEventListener('keydown', teclado);
        return;
      }
      if (e.key === 'ArrowLeft' && indice > 0) { indice--; pintar(); }
      if (e.key === 'ArrowRight' && indice < diapositivas.length - 1) { indice++; pintar(); }
    });

    pintar();
  }

  return {
    render: render,
    generarDesdeApunte: generarDesdeApunte,
  };
})();
