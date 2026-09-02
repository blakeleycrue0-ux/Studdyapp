/* ==========================================================================
   Perfil: los datos que introdujiste en el onboarding y el cierre de sesión.
   ========================================================================== */

Studdy.views.profile = (function () {
  'use strict';

  function render(vista) {
    var app = Studdy.app;
    var p = app.state.profile;

    pintar(vista, app, p, null);

    // El correo y el proveedor se piden aparte para no retrasar el pintado.
    Studdy.currentUser().then(function (usuario) {
      if (usuario) pintar(vista, app, p, usuario);
    });
  }

  function pintar(vista, app, p, usuario) {

    vista.innerHTML =
      '<div class="profile-hero">' +
        '<div class="profile-hero__avatar">' + Studdy.escapeHtml(app.initials(p.name)) + '</div>' +
        '<h1 class="profile-hero__name">' + Studdy.escapeHtml(p.name) + '</h1>' +
        '<p class="profile-hero__level">' + Studdy.escapeHtml(app.describeLevel(p)) + '</p>' +
      '</div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Tu cuenta</h2></div>' +
        filasCuenta(usuario).join('') +
      '</div>' +

      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Tus estudios</h2></div>' +
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
        '<a class="btn btn--soft btn--block" href="#/tema">' +
          'Presentación de un tema suelto</a>' +
      '</div>' +

      '<button class="btn btn--ghost btn--block" id="logout">' +
        Studdy.icons.salir + 'Cerrar sesión</button>';

    Studdy.$('#logout', vista).addEventListener('click', function () {
      Studdy.signOut().then(function () { window.location.replace('index.html'); });
    });
  }

  function filasCuenta(usuario) {
    if (!usuario) return [fila('Cargando…', '')];

    var proveedores = (usuario.identities || [])
      .map(function (i) { return i.provider; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });

    var comoEntras = proveedores.length
      ? proveedores.map(function (x) {
          return x === 'google' ? 'Google' : x === 'email' ? 'Correo y contraseña' : x;
        }).join(' y ')
      : (usuario.is_anonymous ? 'Sin cuenta (solo este dispositivo)' : '—');

    return [
      fila('Correo', usuario.email || '—'),
      fila('Entras con', comoEntras),
    ];
  }

  function fila(clave, valor) {
    return '<div class="data-row">' +
      '<span class="data-row__key">' + Studdy.escapeHtml(clave) + '</span>' +
      '<span class="data-row__val">' + Studdy.escapeHtml(valor) + '</span>' +
      '</div>';
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
      .map(function (d) { return fila(d[0], d[1]); });
  }

  return { render: render };
})();
