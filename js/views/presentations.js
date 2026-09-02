/* ==========================================================================
   Presentaciones.
   Dentro de un apunte, como una pestaña más del cuaderno; y aparte, a partir
   de un tema escrito a mano, sin necesidad de tener el apunte subido.
   ========================================================================== */

Studdy.views.presentations = (function () {
  'use strict';

  // ------------------------------------------------------------------------
  // Pestaña dentro del cuaderno
  // ------------------------------------------------------------------------

  async function renderPanel(panel, apunte) {
    panel.innerHTML = Studdy.loadingHtml('Cargando la presentación…');

    var client = await Studdy.getClient();
    var res = await client
      .from('presentations')
      .select('*')
      .eq('note_id', apunte.id)
      .order('created_at', { ascending: false });

    if (res.error) throw new Error(res.error.message);
    var guardadas = res.data || [];

    if (!guardadas.length) {
      panel.innerHTML = Studdy.views.notebook.vacio(
        Studdy.icons.presentacion,
        'Todavía no hay presentación',
        'Diapositivas con título y puntos clave, sacadas de este apunte.',
        'Generar presentación'
      ) + '<div id="err" style="margin-top:14px"></div>';

      conectarGenerar(panel, apunte);
      return;
    }

    var actual = guardadas[0];
    var contenido = actual.content_json || {};
    var diapositivas = contenido.slides || [];

    panel.innerHTML =
      (guardadas.length > 1 ? selector(guardadas, actual.id) : '') +
      '<div id="carrusel"></div>' +
      '<div style="margin-top:18px;text-align:center">' +
        '<button class="btn btn--ghost btn--sm" id="otra">Generar otra</button>' +
        '<div id="err" style="margin-top:12px"></div>' +
      '</div>';

    montarCarrusel(Studdy.$('#carrusel', panel), diapositivas, contenido.title);
    conectarGenerar(panel, apunte, '#otra');

    var lista = Studdy.$('#version', panel);
    if (lista) {
      lista.addEventListener('change', function () {
        var elegida = guardadas.filter(function (p) { return p.id === lista.value; })[0];
        if (!elegida) return;
        var c = elegida.content_json || {};
        montarCarrusel(Studdy.$('#carrusel', panel), c.slides || [], c.title);
      });
    }
  }

  function selector(guardadas, actualId) {
    return (
      '<label class="field" style="margin-bottom:14px;display:block">' +
        '<span class="field__label">Versión</span>' +
        '<select class="select" id="version">' +
        guardadas.map(function (p, i) {
          var c = p.content_json || {};
          return '<option value="' + p.id + '"' + (p.id === actualId ? ' selected' : '') + '>' +
            Studdy.escapeHtml(c.title || 'Presentación') + ' · ' +
            Studdy.formatDate(p.created_at) + (i === 0 ? ' (última)' : '') +
            '</option>';
        }).join('') +
        '</select>' +
      '</label>'
    );
  }

  // ------------------------------------------------------------------------
  // Presentación a partir de un tema suelto
  // ------------------------------------------------------------------------

  function renderTopic(vista) {
    vista.innerHTML =
      Studdy.app.volver('#/apuntes', 'Apuntes') +
      Studdy.app.cabecera('Presentación de un tema',
        'Sin apunte de por medio: escribe el tema y la IA monta las diapositivas.') +

      '<div class="block">' +
        '<label class="field" style="margin-bottom:18px;display:block">' +
          '<span class="field__label">Tema</span>' +
          '<input class="input" type="text" id="topic" maxlength="160" spellcheck="false">' +
        '</label>' +
        '<button class="btn btn--primary btn--block" id="generar" disabled>' +
          'Generar presentación</button>' +
        '<div id="err" style="margin-top:14px"></div>' +
      '</div>';

    var input = Studdy.$('#topic', vista);
    var boton = Studdy.$('#generar', vista);
    var err = Studdy.$('#err', vista);

    input.addEventListener('input', function () {
      boton.disabled = !input.value.trim();
    });

    boton.addEventListener('click', function () {
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generarDesdeTema(input.value.trim())
        .then(function (id) { Studdy.app.navigate('#/p/' + id); })
        .catch(function (e) {
          err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = 'Generar presentación';
        });
    });

    input.focus();
  }

  // ------------------------------------------------------------------------
  // Presentación suelta, vista a pantalla completa
  // ------------------------------------------------------------------------

  async function render(vista, partes) {
    var id = partes[0];

    var client = await Studdy.getClient();
    var res = await client.from('presentations').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);

    var presentacion = res.data;
    if (!presentacion) {
      vista.innerHTML = Studdy.app.volver('#/apuntes', 'Apuntes') +
        Studdy.errorHtml('Esa presentación no existe o ya no está disponible.');
      return;
    }

    var contenido = presentacion.content_json || {};

    vista.innerHTML =
      Studdy.app.volver('#/apuntes', 'Apuntes') +
      Studdy.app.cabecera(contenido.title || presentacion.topic || 'Presentación') +
      '<div id="carrusel"></div>';

    montarCarrusel(Studdy.$('#carrusel', vista), contenido.slides || [], contenido.title);
  }

  // ------------------------------------------------------------------------
  // Carrusel
  // ------------------------------------------------------------------------

  function montarCarrusel(contenedor, diapositivas, titulo) {
    if (!diapositivas.length) {
      contenedor.innerHTML = Studdy.errorHtml('Esta presentación no tiene diapositivas.');
      return;
    }

    var indice = 0;

    contenedor.innerHTML =
      '<div id="slide"></div>' +
      '<div class="carousel__nav">' +
        '<button class="icon-btn" id="prev" aria-label="Anterior">' + Studdy.icons.chevronIzq + '</button>' +
        '<span class="carousel__count" id="count"></span>' +
        '<button class="icon-btn" id="next" aria-label="Siguiente">' + Studdy.icons.chevron + '</button>' +
      '</div>';

    var slide = Studdy.$('#slide', contenedor);
    var contador = Studdy.$('#count', contenedor);
    var anterior = Studdy.$('#prev', contenedor);
    var siguiente = Studdy.$('#next', contenedor);

    function pintar() {
      var d = diapositivas[indice];
      var puntos = Array.isArray(d.points) ? d.points : [];

      slide.innerHTML =
        '<div class="slide' + (indice === 0 ? ' slide--cover' : '') + '">' +
          '<h2 class="slide__title">' + Studdy.escapeHtml(d.title) + '</h2>' +
          '<ul class="slide__points">' +
            puntos.map(function (p) { return '<li>' + Studdy.escapeHtml(p) + '</li>'; }).join('') +
          '</ul>' +
        '</div>';

      contador.textContent = (indice + 1) + ' / ' + diapositivas.length;
      anterior.disabled = indice === 0;
      siguiente.disabled = indice === diapositivas.length - 1;
    }

    anterior.addEventListener('click', function () { if (indice > 0) { indice--; pintar(); } });
    siguiente.addEventListener('click', function () {
      if (indice < diapositivas.length - 1) { indice++; pintar(); }
    });

    pintar();
  }

  // ------------------------------------------------------------------------
  // Generación
  // ------------------------------------------------------------------------

  function conectarGenerar(panel, apunte, selectorBoton) {
    var boton = Studdy.$(selectorBoton || '#generar', panel);
    if (!boton) return;

    var etiqueta = boton.textContent;

    boton.addEventListener('click', function () {
      var err = Studdy.$('#err', panel);
      if (err) err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generarDesdeApunte(apunte)
        .then(function () {
          Studdy.app.bumpCount(apunte.id, 'presentations');
          Studdy.app.navigate('#/n/' + apunte.id + '/presentacion');
        })
        .catch(function (e) {
          if (err) err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = etiqueta;
        });
    });
  }

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

  return {
    renderPanel: renderPanel,
    renderTopic: renderTopic,
    render: render,
  };
})();
