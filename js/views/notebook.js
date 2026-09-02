/* ==========================================================================
   El cuaderno: un apunte deja de ser una ficha y pasa a ser un espacio de
   trabajo. Dentro están su esquema, sus flashcards, su examen, su
   presentación y un chat sobre ese apunte concreto.
   ========================================================================== */

Studdy.views.notebook = (function () {
  'use strict';

  var PESTANAS = [
    { id: 'esquema',      etiqueta: 'Esquema',      icono: 'esquema',      contador: 'summary' },
    { id: 'flashcards',   etiqueta: 'Flashcards',   icono: 'flashcards',   contador: 'flashcards' },
    { id: 'examen',       etiqueta: 'Examen',       icono: 'examen',       contador: 'exams' },
    { id: 'presentacion', etiqueta: 'Presentación', icono: 'presentacion', contador: 'presentations' },
    { id: 'chat',         etiqueta: 'Chat',         icono: 'chat',         contador: null },
  ];

  function render(vista, partes) {
    var noteId = partes[0];
    var pestana = partes[1] || 'esquema';
    var apunte = Studdy.app.findNote(noteId);

    if (!apunte) {
      vista.innerHTML = Studdy.app.volver('#/apuntes', 'Apuntes') +
        Studdy.errorHtml('Ese apunte no existe o ya no está disponible.');
      return;
    }

    Studdy.app.rememberNote(noteId);

    if (!PESTANAS.some(function (p) { return p.id === pestana; })) pestana = 'esquema';

    vista.innerHTML =
      Studdy.app.volver('#/apuntes', 'Apuntes') +
      cabecera(apunte) +
      barraPestanas(apunte, pestana) +
      '<div id="panel"></div>';

    var panel = Studdy.$('#panel', vista);
    return pintarPanel(panel, apunte, pestana);
  }

  // ------------------------------------------------------------------------

  function cabecera(apunte) {
    var app = Studdy.app;
    var c = app.countsFor(apunte.id);
    var palabras = String(apunte.content || '').trim().split(/\s+/).length;

    return (
      '<div class="nb-head ' + app.subjectColor(apunte.subject_id) + '">' +
        '<div class="nb-head__subject">' +
          Studdy.escapeHtml(app.subjectName(apunte.subject_id)) + '</div>' +
        '<h1 class="nb-head__title">' +
          Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</h1>' +
        '<div class="nb-head__meta">' +
          Studdy.formatDate(apunte.created_at) + ' · ' +
          palabras.toLocaleString('es-ES') + ' palabras' +
          (c.flashcards ? ' · ' + c.flashcards + ' tarjetas' : '') +
        '</div>' +
      '</div>'
    );
  }

  function barraPestanas(apunte, activa) {
    var c = Studdy.app.countsFor(apunte.id);

    return '<div class="nb-tabs">' + PESTANAS.map(function (p) {
      // Un número solo cuando aporta algo (varias tarjetas, varias versiones).
      // Si solo hay una cosa, un punto basta para decir "esto ya está hecho".
      var n = p.contador ? c[p.contador] : 0;
      var insignia = n > 1
        ? '<span class="nb-tab__badge">' + n + '</span>'
        : (n === 1 ? '<span class="nb-tab__done"></span>' : '');
      return (
        '<a class="nb-tab' + (p.id === activa ? ' is-on' : '') + '" ' +
          'href="#/n/' + apunte.id + '/' + p.id + '">' +
          Studdy.icons[p.icono] + Studdy.escapeHtml(p.etiqueta) + insignia +
        '</a>'
      );
    }).join('') + '</div>';
  }

  // ------------------------------------------------------------------------

  function pintarPanel(panel, apunte, pestana) {
    switch (pestana) {
      case 'flashcards':
        return Studdy.views.flashcards.renderPanel(panel, apunte);
      case 'examen':
        return Studdy.views.exams.renderPanel(panel, apunte);
      case 'presentacion':
        return Studdy.views.presentations.renderPanel(panel, apunte);
      case 'chat':
        return Studdy.views.chat.renderPanel(panel, apunte);
      default:
        return panelEsquema(panel, apunte);
    }
  }

  // ------------------------------------------------------------------------
  // Esquema
  // ------------------------------------------------------------------------

  async function panelEsquema(panel, apunte) {
    panel.innerHTML = Studdy.loadingHtml('Cargando el esquema…');

    var client = await Studdy.getClient();
    var res = await client
      .from('summaries')
      .select('*')
      .eq('note_id', apunte.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (res.error) throw new Error(res.error.message);
    var esquema = (res.data || [])[0] || null;

    if (!esquema) {
      panel.innerHTML = vacio(
        Studdy.icons.esquema,
        'Este apunte no tiene esquema',
        'La IA lo reorganizará en puntos jerárquicos con la profundidad de tu curso.',
        'Generar esquema'
      ) + '<div id="err" style="margin-top:14px"></div>';
      conectarGenerar(panel, apunte);
      return;
    }

    panel.innerHTML =
      '<div class="block"><div class="prose">' +
        Studdy.renderMarkdown(esquema.generated_content) +
      '</div></div>' +
      fuente(apunte);
  }

  function conectarGenerar(panel, apunte) {
    var boton = Studdy.$('#generar', panel);
    if (!boton) return;

    boton.addEventListener('click', function () {
      var err = Studdy.$('#err', panel);
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generarEsquema(apunte)
        .then(function () {
          Studdy.app.bumpCount(apunte.id, 'summary');
          Studdy.app.navigate('#/n/' + apunte.id + '/esquema');
        })
        .catch(function (e) {
          err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = 'Generar esquema';
        });
    });
  }

  async function generarEsquema(apunte) {
    var respuesta = await Studdy.ai('summary', {
      content: apunte.content,
      subject: Studdy.app.subjectName(apunte.subject_id),
    });

    var client = await Studdy.getClient();
    var out = await client
      .from('summaries')
      .insert({ note_id: apunte.id, generated_content: respuesta.summary });

    if (out.error) throw new Error(out.error.message);
    return respuesta.summary;
  }

  function fuente(apunte) {
    return (
      '<div class="block">' +
        '<details class="disclosure">' +
          '<summary>Ver el texto original</summary>' +
          '<div class="disclosure__body"><div class="note-source">' +
            Studdy.escapeHtml(apunte.content) +
          '</div></div>' +
        '</details>' +
      '</div>'
    );
  }

  // ------------------------------------------------------------------------
  // Bloque vacío reutilizado por todas las pestañas
  // ------------------------------------------------------------------------

  function vacio(icono, titulo, texto, etiquetaBoton) {
    return (
      '<div class="empty">' +
        '<div class="empty__icon">' + icono + '</div>' +
        '<p class="empty__title">' + Studdy.escapeHtml(titulo) + '</p>' +
        '<p class="empty__text">' + Studdy.escapeHtml(texto) + '</p>' +
        '<button class="btn btn--primary" id="generar">' +
          Studdy.escapeHtml(etiquetaBoton) + '</button>' +
      '</div>'
    );
  }

  return {
    render: render,
    generarEsquema: generarEsquema,
    vacio: vacio,
  };
})();
