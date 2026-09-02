/* ==========================================================================
   Inicio: lo primero que se ve al abrir la app.
   Accesos rápidos, el apunte donde lo dejaste, progreso real y asignaturas.
   Todos los números salen de la base de datos; ninguno es inventado.
   ========================================================================== */

Studdy.views.home = (function () {
  'use strict';

  function render(vista) {
    var app = Studdy.app;
    var s = app.state;

    vista.innerHTML =
      saludo(s.profile) +
      accesosRapidos(s) +
      continuar() +
      progreso(s) +
      asignaturas(s);
  }

  // ------------------------------------------------------------------------

  function saludo(perfil) {
    return (
      '<div class="topbar">' +
        '<div>' +
          '<span class="hello">' + franjaHoraria() +
            '<span class="hello__name">' + Studdy.escapeHtml(perfil.name) + '</span>' +
          '</span>' +
        '</div>' +
        '<a class="avatar" href="#/perfil" aria-label="Tu perfil">' +
          Studdy.escapeHtml(Studdy.app.initials(perfil.name)) +
        '</a>' +
      '</div>'
    );
  }

  function franjaHoraria() {
    var h = new Date().getHours();
    if (h < 6) return 'Buenas noches';
    if (h < 13) return 'Buenos días';
    if (h < 21) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // ------------------------------------------------------------------------

  function accesosRapidos(s) {
    var ultimo = Studdy.app.lastNote() || s.notes[0];
    var destinoExamen = ultimo ? '#/n/' + ultimo.id + '/examen' : '#/apuntes';

    return (
      '<div class="quick">' +
        item('#/apuntes/subir', Studdy.icons.subir, 'Subir apunte', true) +
        item(destinoExamen, Studdy.icons.examen, 'Hacer examen', false) +
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
            Studdy.escapeHtml(hechos || 'Sin generar nada todavía') +
          '</span>' +
        '</span>' +
        '<span class="resume__go">' + Studdy.icons.flecha + '</span>' +
      '</a>'
    );
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
            'podrás sacar su esquema, sus flashcards, un examen y una presentación.</p>' +
          '<a class="btn btn--primary" href="#/apuntes/subir">Subir tu primer apunte</a>' +
        '</div>'
      );
    }

    var totales = s.notes.reduce(function (acc, n) {
      var c = Studdy.app.countsFor(n.id);
      acc.flashcards += c.flashcards;
      acc.exams += c.exams;
      acc.presentations += c.presentations;
      return acc;
    }, { flashcards: 0, exams: 0, presentations: 0 });

    var html = '<p class="section-title">Tu progreso</p><div class="stats">';

    // Aciertos: solo si existe la tabla de intentos y hay alguno registrado.
    var intentos = s.attempts;
    if (intentos && intentos.length) {
      var aciertos = intentos.reduce(function (a, i) { return a + (i.score || 0); }, 0);
      var preguntas = intentos.reduce(function (a, i) { return a + (i.total || 0); }, 0);
      var pct = preguntas ? Math.round((aciertos / preguntas) * 100) : 0;

      html +=
        '<div class="stat stat--wide">' +
          '<span class="ring" style="--pct:' + pct + '">' +
            '<span class="ring__inner">' + pct + '%</span>' +
          '</span>' +
          '<div>' +
            '<div class="stat__value" style="font-size:20px">' + aciertos + ' de ' + preguntas + '</div>' +
            '<div class="stat__label">preguntas tipo test acertadas en ' +
              intentos.length + (intentos.length === 1 ? ' examen' : ' exámenes') + '</div>' +
          '</div>' +
        '</div>';
    }

    html +=
      stat(s.notes.length, s.notes.length === 1 ? 'apunte' : 'apuntes') +
      stat(totales.flashcards, 'flashcards') +
      stat(totales.exams, totales.exams === 1 ? 'examen' : 'exámenes') +
      stat(totales.presentations, totales.presentations === 1 ? 'presentación' : 'presentaciones') +
      '</div>';

    return html;
  }

  function stat(valor, etiqueta) {
    return '<div class="stat">' +
      '<div class="stat__value">' + valor + '</div>' +
      '<div class="stat__label">' + Studdy.escapeHtml(etiqueta) + '</div>' +
      '</div>';
  }

  // ------------------------------------------------------------------------

  function asignaturas(s) {
    if (!s.subjects.length) return '';

    return (
      '<p class="section-title">Tus asignaturas</p>' +
      '<div class="subject-grid">' +
      s.subjects.map(function (a) {
        var n = Studdy.app.notesOfSubject(a.id).length;
        return (
          '<a class="subject-tile ' + Studdy.app.subjectColor(a.id) + '" ' +
            'href="#/apuntes/asignatura/' + a.id + '">' +
            '<span class="subject-tile__name">' + Studdy.escapeHtml(a.name) + '</span>' +
            '<span class="subject-tile__count">' + n +
              (n === 1 ? ' apunte' : ' apuntes') + '</span>' +
          '</a>'
        );
      }).join('') +
      '</div>'
    );
  }

  return { render: render };
})();
