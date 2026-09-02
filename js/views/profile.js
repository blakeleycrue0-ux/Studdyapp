/* ==========================================================================
   Perfil: los datos que introdujiste en el onboarding y el cierre de sesión.
   ========================================================================== */

Studdy.views.profile = (function () {
  'use strict';

  function render(vista) {
    var app = Studdy.app;
    var p = app.state.profile;

    vista.innerHTML =
      '<div class="profile-hero">' +
        '<div class="profile-hero__avatar">' + Studdy.escapeHtml(app.initials(p.name)) + '</div>' +
        '<h1 class="profile-hero__name">' + Studdy.escapeHtml(p.name) + '</h1>' +
        '<p class="profile-hero__level">' + Studdy.escapeHtml(app.describeLevel(p)) + '</p>' +
      '</div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Tus datos</h2></div>' +
        filas(p).join('') +
      '</div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Asignaturas</h2></div>' +
        (app.state.subjects.length
          ? '<div class="subject-grid">' + app.state.subjects.map(function (a) {
              var n = app.notesOfSubject(a.id).length;
              return '<a class="subject-tile ' + app.subjectColor(a.id) + '" ' +
                'href="#/apuntes/asignatura/' + a.id + '">' +
                '<span class="subject-tile__name">' + Studdy.escapeHtml(a.name) + '</span>' +
                '<span class="subject-tile__count">' + n +
                  (n === 1 ? ' apunte' : ' apuntes') + '</span></a>';
            }).join('') + '</div>'
          : '<p style="color:var(--ink-3);font-size:14.5px">No hay asignaturas.</p>') +
      '</div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Herramientas</h2></div>' +
        '<a class="btn btn--soft btn--block" href="#/apuntes/tema">' +
          'Presentación de un tema suelto</a>' +
      '</div>' +

      '<button class="btn btn--ghost btn--block" id="logout">' +
        Studdy.icons.salir + 'Cerrar sesión</button>';

    Studdy.$('#logout', vista).addEventListener('click', function () {
      Studdy.signOut().then(function () { window.location.replace('index.html'); });
    });
  }

  function filas(p) {
    var datos = [['Nivel', p.level]];

    if (p.level === 'ESO' || p.level === 'Bachillerato') {
      datos.push(['Curso', p.course]);
      if (p.branch) datos.push(['Rama', p.branch]);
    } else if (p.level === 'FP') {
      datos.push(['Grado', p.fp_grade]);
      datos.push(['Familia profesional', p.fp_family]);
      datos.push(['Ciclo', p.fp_cycle]);
    } else if (p.level === 'Universidad') {
      datos.push(['Carrera', p.university_degree]);
      datos.push(['Curso', p.course]);
    }

    datos.push(['En Studdy desde', Studdy.formatDate(p.created_at)]);

    return datos
      .filter(function (d) { return d[1]; })
      .map(function (d) {
        return '<div class="data-row">' +
          '<span class="data-row__key">' + Studdy.escapeHtml(d[0]) + '</span>' +
          '<span class="data-row__val">' + Studdy.escapeHtml(d[1]) + '</span>' +
          '</div>';
      });
  }

  return { render: render };
})();
