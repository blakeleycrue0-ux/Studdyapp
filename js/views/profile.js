/* ==========================================================================
   Perfil.

   Todo lo que sale aquí está calculado con datos reales: los días de racha
   salen de tu actividad guardada, no de un contador inventado.
   ========================================================================== */

Studdy.views.profile = (function () {
  'use strict';

  function render(vista) {
    var app = Studdy.app;
    var p = app.state.profile;

    pintar(vista, p, null, null);

    // La cuenta y la racha se piden aparte para no retrasar el pintado.
    Promise.all([Studdy.currentUser(), Studdy.app.activity()])
      .then(function (res) { pintar(vista, p, res[0], res[1]); })
      .catch(function () { /* se queda lo ya pintado */ });
  }

  function pintar(vista, p, usuario, actividad) {
    var app = Studdy.app;
    var s = app.state;

    var tarjetas = s.notes.reduce(function (n, x) {
      return n + app.countsFor(x.id).flashcards;
    }, 0);

    var acierto = '—';
    if (s.attempts && s.attempts.length) {
      var ac = s.attempts.reduce(function (a, i) { return a + (i.score || 0); }, 0);
      var to = s.attempts.reduce(function (a, i) { return a + (i.total || 0); }, 0);
      if (to) acierto = Math.round((ac / to) * 100) + '%';
    }

    vista.innerHTML =
      '<div class="profile-hero">' +
        '<div class="profile-hero__avatar">' +
          Studdy.escapeHtml(app.initials(p.name)) + '</div>' +
        '<h1 class="profile-hero__name">' + Studdy.escapeHtml(p.name) + '</h1>' +
        '<p class="profile-hero__level">' + Studdy.escapeHtml(app.describeLevel(p)) + '</p>' +
      '</div>' +

      '<div class="profile-stats stagger">' +
        stat(actividad ? actividad.racha : '·', actividad && actividad.racha === 1 ? 'día seguido' : 'días seguidos') +
        stat(tarjetas, 'tarjetas') +
        stat(acierto, 'de acierto') +
      '</div>' +

      quincena(actividad) +

      '<p class="section-title">Atajos</p>' +
      '<div class="menu-list stagger">' +
        fila('#/apuntes', 'apunte', 't-violet', 'Mis apuntes',
          s.notes.length + (s.notes.length === 1 ? ' apunte' : ' apuntes')) +
        fila('#/agenda', 'reloj', 't-coral', 'Agenda', 'Exámenes y entregas') +
        fila('#/trabajos', 'lapiz', 't-blue', 'Trabajos', 'Guion, borrador y revisión') +
        fila('#/tema', 'presentacion', 't-amber', 'Presentación', 'De un tema suelto') +
      '</div>' +

      '<p class="section-title">Tus asignaturas</p>' +
      (s.subjects.length
        ? '<div class="subject-grid stagger">' + s.subjects.map(function (a) {
            var n = app.notesOfSubject(a.id).length;
            return '<a class="subject-tile ' + app.subjectColor(a.id) + '" ' +
              'href="#/apuntes/asignatura/' + a.id + '">' +
              '<span class="subject-tile__name">' + Studdy.escapeHtml(a.name) + '</span>' +
              '<span class="subject-tile__count">' + n +
                (n === 1 ? ' apunte' : ' apuntes') + '</span></a>';
          }).join('') + '</div>'
        : '<p style="color:var(--ink-3);font-size:15px">No hay asignaturas.</p>') +

      '<p class="section-title">Tus estudios</p>' +
      '<div class="block">' + filasEstudios(p).join('') + '</div>' +

      '<p class="section-title">Tu cuenta</p>' +
      '<div class="block">' + filasCuenta(usuario).join('') + '</div>' +

      '<button class="btn btn--ghost btn--block" id="logout" style="margin-top:8px">' +
        Studdy.icons.salir + 'Cerrar sesión</button>';

    var salir = Studdy.$('#logout', vista);
    if (salir) {
      salir.addEventListener('click', function () {
        Studdy.signOut().then(function () { window.location.replace('index.html'); });
      });
    }
  }

  // ------------------------------------------------------------------------

  // Las dos últimas semanas, día a día. Sale de la actividad ya guardada.
  function quincena(actividad) {
    if (!actividad || !actividad.total) return '';

    var dias = Studdy.app.lastDays(actividad.dias, 14);
    var activos = dias.filter(function (d) { return d.valor; }).length;

    return (
      '<p class="section-title">Tus dos últimas semanas</p>' +
      '<div class="block">' +
        '<div class="block__head" style="margin-bottom:18px">' +
          '<div>' +
            '<div class="block__title">' + activos + ' de 14 días</div>' +
            '<p class="block__sub">con algo hecho en Studdy</p>' +
          '</div>' +
          '<span class="pill">' + actividad.total +
            (actividad.total === 1 ? ' día en total' : ' días en total') + '</span>' +
        '</div>' +
        Studdy.charts.barras(dias, { clase: 'chart-barras--fina' }) +
      '</div>'
    );
  }

  function stat(valor, etiqueta) {
    return '<div class="profile-stat"><b>' + Studdy.escapeHtml(String(valor)) + '</b>' +
      '<span>' + Studdy.escapeHtml(etiqueta) + '</span></div>';
  }

  function fila(href, icono, color, titulo, sub) {
    return '<a class="row-card ' + color + '" href="' + href + '">' +
      '<span class="tile">' + Studdy.icons[icono] + '</span>' +
      '<span class="row-card__body">' +
        '<span class="row-card__label">' + Studdy.escapeHtml(titulo) + '</span>' +
        '<span class="row-card__sub">' + Studdy.escapeHtml(sub) + '</span>' +
      '</span>' +
      '<span class="row-card__go">' + Studdy.icons.chevron + '</span>' +
    '</a>';
  }

  function dato(clave, valor) {
    return '<div class="data-row">' +
      '<span class="data-row__key">' + Studdy.escapeHtml(clave) + '</span>' +
      '<span class="data-row__val">' + Studdy.escapeHtml(valor) + '</span>' +
      '</div>';
  }

  function filasEstudios(p) {
    var datos = [['Nivel', p.level]];

    if (p.level === 'ESO' || p.level === 'Bachillerato') {
      datos.push(['Curso', p.course]);
      if (p.branch) datos.push(['Rama', p.branch]);
    } else if (p.level === 'FP') {
      datos.push(['Grado', p.fp_grade]);
      datos.push(['Familia', p.fp_family]);
      datos.push(['Ciclo', p.fp_cycle]);
    } else if (p.level === 'Universidad') {
      datos.push(['Carrera', p.university_degree]);
      datos.push(['Curso', p.course]);
    }

    if (p.goal_now != null && p.goal_target != null) {
      datos.push(['Objetivo', 'de ' + p.goal_now + ' a ' + p.goal_target]);
      if (p.goal_days) {
        datos.push(['Ritmo', p.goal_days === 7 ? 'todos los días'
          : p.goal_days + ' días a la semana']);
      }
      if (p.goal_date) datos.push(['Fecha que te pusiste', Studdy.formatDate(p.goal_date)]);
    }

    datos.push(['En Studdy desde', Studdy.formatDate(p.created_at)]);

    return datos.filter(function (d) { return d[1]; }).map(function (d) { return dato(d[0], d[1]); });
  }

  function filasCuenta(usuario) {
    if (!usuario) return [dato('Cargando…', '')];

    var proveedores = (usuario.identities || [])
      .map(function (i) { return i.provider; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; })
      .map(function (x) {
        return x === 'google' ? 'Google' : x === 'email' ? 'Correo y contraseña' : x;
      });

    return [
      dato('Correo', usuario.email || '—'),
      dato('Entras con', proveedores.join(' y ') || '—'),
    ];
  }

  return { render: render };
})();
