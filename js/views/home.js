/* ==========================================================================
   Inicio.

   Lo primero que se ve: qué tienes encima, dónde lo dejaste, cuánto llevas
   y todo lo que puedes hacer. Los números salen de la base de datos; ninguno
   es inventado.
   ========================================================================== */

Studdy.views.home = (function () {
  'use strict';

  function render(vista) {
    var s = Studdy.app.state;

    vista.innerHTML =
      saludo(s.profile) +
      accesosRapidos(s) +
      '<div id="agenda-slot"></div>' +
      continuar() +
      '<div id="repaso-slot"></div>' +
      progreso(s) +
      herramientas() +
      asignaturas(s);

    // Agenda y repaso se piden aparte para que el inicio pinte ya, sin
    // esperar a dos consultas más.
    pintarAgenda(vista);
    pintarRepaso(vista);
  }

  // ------------------------------------------------------------------------

  function saludo(perfil) {
    return (
      '<div class="topbar">' +
        '<div><span class="hello">' + franja() +
          '<span class="hello__name">' + Studdy.escapeHtml(perfil.name) + '</span>' +
        '</span></div>' +
        '<a class="avatar" href="#/perfil" aria-label="Tu perfil">' +
          Studdy.escapeHtml(Studdy.app.initials(perfil.name)) +
        '</a>' +
      '</div>'
    );
  }

  function franja() {
    var h = new Date().getHours();
    if (h < 6) return 'Buenas noches';
    if (h < 13) return 'Buenos días';
    if (h < 21) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // ------------------------------------------------------------------------

  function accesosRapidos() {
    return (
      '<div class="quick">' +
        item('#/apuntes/subir', Studdy.icons.subir, 'Subir apunte', true) +
        item('#/ejercicios', Studdy.icons.diana, 'Resolver ejercicio', false) +
        item('#/chat', Studdy.icons.chat, 'Preguntar', false) +
      '</div>'
    );
  }

  function item(href, icono, etiqueta, acento) {
    return (
      '<a class="quick__item' + (acento ? ' quick__item--accent' : '') + '" href="' + href + '">' +
        '<span class="quick__icon">' + icono + '</span>' +
        '<span class="quick__label">' + Studdy.escapeHtml(etiqueta) + '</span>' +
      '</a>'
    );
  }

  // ------------------------------------------------------------------------
  // Lo que tienes encima
  // ------------------------------------------------------------------------

  function pintarAgenda(vista) {
    var slot = Studdy.$('#agenda-slot', vista);
    if (!slot) return;

    Studdy.views.agenda.cargar()
      .then(function (eventos) {
        var proximos = eventos
          .filter(function (e) { return !e.done && Studdy.views.agenda.dias(e.date) >= 0; })
          .slice(0, 3);

        if (!proximos.length) return;

        slot.innerHTML =
          '<p class="section-title">Lo que tienes cerca</p>' +
          proximos.map(function (e) {
            var d = Studdy.views.agenda.dias(e.date);
            var asignatura = e.subject_id ? Studdy.app.subjectName(e.subject_id) : '';
            return (
              '<div class="event event--' + e.kind + '">' +
                '<div class="event__body">' +
                  '<div class="event__kind">' +
                    (e.kind === 'examen' ? 'Examen' : e.kind === 'entrega' ? 'Entrega' : 'Otro') +
                  '</div>' +
                  '<div class="event__title">' + Studdy.escapeHtml(e.title) +
                    '<span class="countdown">' +
                      (d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + 'd') +
                    '</span></div>' +
                  (asignatura
                    ? '<div class="event__meta">' + Studdy.escapeHtml(asignatura) + '</div>'
                    : '') +
                '</div>' +
              '</div>'
            );
          }).join('') +
          '<a class="btn btn--ghost btn--sm" href="#/agenda">Ver toda la agenda</a>';
      })
      .catch(function () {
        // Sin la tabla de agenda el inicio funciona igual: no se pinta nada.
      });
  }

  // ------------------------------------------------------------------------

  function continuar() {
    var apunte = Studdy.app.lastNote();
    if (!apunte) return '';

    var c = Studdy.app.countsFor(apunte.id);
    var hechos = [
      c.summary ? 'Esquema' : null,
      c.flashcards ? c.flashcards + ' tarjetas' : null,
      c.exams ? 'Examen' : null,
      c.presentations ? 'Presentación' : null,
    ].filter(Boolean).join(' · ');

    return (
      '<p class="section-title">Continuar</p>' +
      '<a class="resume ' + Studdy.app.subjectColor(apunte.subject_id) + '" href="#/n/' + apunte.id + '">' +
        '<span class="resume__body">' +
          '<span class="resume__kicker">' +
            Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) + '</span>' +
          '<span class="resume__title">' +
            Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</span>' +
          '<span class="resume__meta">' +
            Studdy.escapeHtml(hechos || 'Sin generar nada todavía') + '</span>' +
        '</span>' +
        '<span class="resume__go">' + Studdy.icons.flecha + '</span>' +
      '</a>'
    );
  }

  // ------------------------------------------------------------------------

  function pintarRepaso(vista) {
    var slot = Studdy.$('#repaso-slot', vista);
    if (!slot) return;

    Studdy.views.review.cargar()
      .then(function (datos) {
        if (!datos.cola.length) return;

        slot.innerHTML =
          '<p class="section-title">Toca repasar</p>' +
          '<a class="resume" href="#/repasar" style="border-left-color:var(--green-600)">' +
            '<span class="resume__body">' +
              '<span class="resume__kicker">Repaso de hoy</span>' +
              '<span class="resume__title">' + datos.cola.length +
                (datos.cola.length === 1 ? ' tarjeta te espera' : ' tarjetas te esperan') + '</span>' +
              '<span class="resume__meta">de ' + datos.total + ' que tienes en total</span>' +
            '</span>' +
            '<span class="resume__go">' + Studdy.icons.flecha + '</span>' +
          '</a>';
      })
      .catch(function () {
        // Sin la tabla de repaso, esta tarjeta simplemente no aparece.
      });
  }

  // ------------------------------------------------------------------------

  function progreso(s) {
    if (!s.notes.length) {
      return (
        '<p class="section-title">Empieza por aquí</p>' +
        '<div class="empty">' +
          '<div class="empty__icon">' + Studdy.icons.apunte + '</div>' +
          '<p class="empty__title">Aún no tienes apuntes</p>' +
          '<p class="empty__text">Sube un PDF o pega el texto de un tema. A partir de ahí ' +
            'salen su esquema, sus flashcards, un examen y una presentación.</p>' +
          '<a class="btn btn--primary" href="#/apuntes/subir">Subir tu primer apunte</a>' +
        '</div>'
      );
    }

    var t = s.notes.reduce(function (acc, n) {
      var c = Studdy.app.countsFor(n.id);
      acc.flashcards += c.flashcards;
      acc.exams += c.exams;
      acc.presentations += c.presentations;
      return acc;
    }, { flashcards: 0, exams: 0, presentations: 0 });

    var html = '<p class="section-title">Tu progreso</p><div class="stats">';

    var intentos = s.attempts;
    if (intentos && intentos.length) {
      var aciertos = intentos.reduce(function (a, i) { return a + (i.score || 0); }, 0);
      var preguntas = intentos.reduce(function (a, i) { return a + (i.total || 0); }, 0);
      var pct = preguntas ? Math.round((aciertos / preguntas) * 100) : 0;

      html +=
        '<div class="stat stat--wide">' +
          '<span class="ring" style="--pct:' + pct + '">' +
            '<span class="ring__inner">' + pct + '%</span></span>' +
          '<div>' +
            '<div class="stat__value" style="font-size:20px">' + aciertos + ' de ' + preguntas + '</div>' +
            '<div class="stat__label">preguntas tipo test acertadas en ' +
              intentos.length + (intentos.length === 1 ? ' examen' : ' exámenes') + '</div>' +
          '</div>' +
        '</div>';
    }

    html +=
      stat(s.notes.length, s.notes.length === 1 ? 'apunte' : 'apuntes') +
      stat(t.flashcards, 'flashcards') +
      stat(t.exams, t.exams === 1 ? 'examen' : 'exámenes') +
      stat(t.presentations, t.presentations === 1 ? 'presentación' : 'presentaciones') +
      '</div>';

    return html;
  }

  function stat(valor, etiqueta) {
    return '<div class="stat"><div class="stat__value">' + valor + '</div>' +
      '<div class="stat__label">' + Studdy.escapeHtml(etiqueta) + '</div></div>';
  }

  // ------------------------------------------------------------------------

  function herramientas() {
    var h = [
      ['#/agenda', Studdy.icons.reloj, 'Agenda', 'Exámenes y entregas', 'sc-2'],
      ['#/ejercicios', Studdy.icons.diana, 'Ejercicios', 'Resueltos paso a paso', 'sc-1'],
      ['#/trabajos', Studdy.icons.apunte, 'Trabajos', 'Guion, borrador y revisión', 'sc-3'],
      ['#/tema', Studdy.icons.presentacion, 'Presentación', 'De un tema suelto', 'sc-4'],
    ];

    return '<p class="section-title">Herramientas</p><div class="tool-grid">' +
      h.map(function (x) {
        return '<a class="tool-card ' + x[4] + '" href="' + x[0] + '">' +
          '<span class="tool-card__icon">' + x[1] + '</span>' +
          '<span class="tool-card__title">' + Studdy.escapeHtml(x[2]) + '</span>' +
          '<span class="tool-card__text">' + Studdy.escapeHtml(x[3]) + '</span>' +
          '</a>';
      }).join('') + '</div>';
  }

  // ------------------------------------------------------------------------

  function asignaturas(s) {
    if (!s.subjects.length) return '';

    return (
      '<p class="section-title">Tus asignaturas</p><div class="subject-grid">' +
      s.subjects.map(function (a) {
        var n = Studdy.app.notesOfSubject(a.id).length;
        return '<a class="subject-tile ' + Studdy.app.subjectColor(a.id) + '" ' +
          'href="#/apuntes/asignatura/' + a.id + '">' +
          '<span class="subject-tile__name">' + Studdy.escapeHtml(a.name) + '</span>' +
          '<span class="subject-tile__count">' + n +
            (n === 1 ? ' apunte' : ' apuntes') + '</span></a>';
      }).join('') + '</div>'
    );
  }

  return { render: render };
})();
