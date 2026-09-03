/* ==========================================================================
   Inicio.
   Qué tienes encima, dónde lo dejaste, cuánto llevas y qué puedes hacer.
   Todos los números salen de la base de datos.
   ========================================================================== */

Studdy.views.home = (function () {
  'use strict';

  function render(vista) {
    var s = Studdy.app.state;

    vista.innerHTML =
      saludo(s.profile) +
      '<div class="quick stagger">' + accesos() + '</div>' +
      '<div id="agenda-slot"></div>' +
      continuar() +
      '<div id="repaso-slot"></div>' +
      progreso(s) +
      herramientas() +
      asignaturas(s);

    pintarAgenda(vista);
    pintarRepaso(vista);
  }

  // ------------------------------------------------------------------------

  function saludo(perfil) {
    return (
      '<div class="appbar">' +
        '<div>' +
          '<span class="hello">' + franja() + '</span>' +
          '<span class="hello__name">' + Studdy.escapeHtml(perfil.name) + '</span>' +
        '</div>' +
        '<div class="appbar__spacer"></div>' +
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

  function accesos() {
    return [
      ['#/apuntes/subir', 'subir', 'Subir apunte', true, ''],
      ['#/ejercicios', 'diana', 'Resolver', false, 't-blue'],
      ['#/chat', 'chispa', 'Preguntar', false, 't-violet'],
    ].map(function (a) {
      return '<a class="quick__item' + (a[3] ? ' quick__item--accent' : '') + ' ' + a[4] +
        '" href="' + a[0] + '">' +
        '<span class="tile">' + Studdy.icons[a[1]] + '</span>' +
        '<span class="quick__label">' + Studdy.escapeHtml(a[2]) + '</span>' +
      '</a>';
    }).join('');
  }

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
          '<div class="stagger">' +
          proximos.map(function (e) {
            var d = Studdy.views.agenda.dias(e.date);
            var asignatura = e.subject_id ? Studdy.app.subjectName(e.subject_id) : '';
            return (
              '<div class="event event--' + e.kind + '">' +
                '<span class="tile tile--sm">' +
                  Studdy.icons[e.kind === 'entrega' ? 'apunte' : 'examen'] + '</span>' +
                '<div class="event__body">' +
                  '<div class="event__kind">' +
                    (e.kind === 'examen' ? 'Examen' : e.kind === 'entrega' ? 'Entrega' : 'Otro') +
                  '</div>' +
                  '<div class="event__title">' + Studdy.escapeHtml(e.title) +
                    '<span class="countdown">' +
                      (d === 0 ? 'hoy' : d === 1 ? 'mañana' : d + 'd') +
                    '</span></div>' +
                  (asignatura ? '<div class="event__meta">' + Studdy.escapeHtml(asignatura) + '</div>' : '') +
                '</div>' +
              '</div>'
            );
          }).join('') +
          '</div>' +
          '<a class="btn btn--soft btn--sm" href="#/agenda">Ver toda la agenda</a>';
      })
      .catch(function () { /* sin tabla de agenda, no se pinta nada */ });
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
        '<span class="tile">' + Studdy.icons.apunte + '</span>' +
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
          '<a class="resume t-green" href="#/repasar">' +
            '<span class="tile">' + Studdy.icons.flashcards + '</span>' +
            '<span class="resume__body">' +
              '<span class="resume__kicker">Repaso de hoy</span>' +
              '<span class="resume__title">' + datos.cola.length +
                (datos.cola.length === 1 ? ' tarjeta te espera' : ' tarjetas te esperan') + '</span>' +
              '<span class="resume__meta">de ' + datos.total + ' que tienes en total</span>' +
            '</span>' +
            '<span class="resume__go">' + Studdy.icons.flecha + '</span>' +
          '</a>';
      })
      .catch(function () { /* sin tabla de repaso, no se pinta */ });
  }

  // ------------------------------------------------------------------------

  function progreso(s) {
    if (!s.notes.length) {
      return (
        '<p class="section-title">Empieza por aquí</p>' +
        '<div class="empty">' +
          '<div class="empty__icon">' + Studdy.icons.apunte + '</div>' +
          '<p class="empty__title">Aún no tienes apuntes</p>' +
          '<p class="empty__text">Sube un PDF o pega el texto de un tema. De ahí salen ' +
            'su esquema, sus flashcards, un examen y una presentación.</p>' +
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

    var html = '<p class="section-title">Tu progreso</p><div class="stats stagger">';

    var intentos = s.attempts;
    if (intentos && intentos.length) {
      var ac = intentos.reduce(function (a, i) { return a + (i.score || 0); }, 0);
      var to = intentos.reduce(function (a, i) { return a + (i.total || 0); }, 0);
      var pct = to ? Math.round((ac / to) * 100) : 0;

      html +=
        '<div class="stat stat--wide">' +
          '<span class="ring" style="--pct:' + pct + '">' +
            '<span class="ring__inner">' + pct + '%</span></span>' +
          '<div>' +
            '<div class="stat__value" style="font-size:22px">' + ac + ' de ' + to + '</div>' +
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
      ['#/agenda', 'reloj', 'Agenda', 'Exámenes y entregas', 't-coral'],
      ['#/ejercicios', 'diana', 'Ejercicios', 'Resueltos paso a paso', 't-blue'],
      ['#/trabajos', 'lapiz', 'Trabajos', 'Guion y revisión', 't-violet'],
      ['#/tema', 'presentacion', 'Presentación', 'De un tema suelto', 't-amber'],
    ];

    return '<p class="section-title">Herramientas</p><div class="tool-grid stagger">' +
      h.map(function (x) {
        return '<a class="tool-card ' + x[4] + '" href="' + x[0] + '">' +
          '<span class="tile">' + Studdy.icons[x[1]] + '</span>' +
          '<span class="tool-card__title">' + Studdy.escapeHtml(x[2]) + '</span>' +
          '<span class="tool-card__text">' + Studdy.escapeHtml(x[3]) + '</span>' +
        '</a>';
      }).join('') + '</div>';
  }

  // ------------------------------------------------------------------------

  function asignaturas(s) {
    if (!s.subjects.length) return '';

    return (
      '<p class="section-title">Tus asignaturas</p><div class="subject-grid stagger">' +
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
