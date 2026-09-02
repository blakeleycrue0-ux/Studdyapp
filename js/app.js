/* ==========================================================================
   Studdy — armazón de la aplicación
   Estado compartido, carga de datos, enrutador por hash y cabecera.
   ========================================================================== */

Studdy.views = {};

Studdy.app = (function () {
  'use strict';

  var estado = {
    profile: null,
    subjects: [],
    notes: [],
  };

  var vista = Studdy.$('#view');

  // ------------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------------

  function start() {
    Studdy.requireSession()
      .then(function (session) {
        if (!session) return null;
        return cargarDatos();
      })
      .then(function (ok) {
        if (!ok) return;
        Studdy.$('#boot').remove();
        pintarCabecera();
        window.addEventListener('hashchange', enrutar);
        enrutar();
      })
      .catch(function (err) {
        var boot = Studdy.$('#boot');
        if (boot) boot.remove();
        vista.innerHTML = Studdy.errorHtml(err.message);
      });

    Studdy.$('#logout').addEventListener('click', function () {
      Studdy.signOut().then(function () {
        window.location.replace('index.html');
      });
    });
  }

  function cargarDatos() {
    return Studdy.getProfile().then(function (perfil) {
      // Sin perfil no hay app: el onboarding es obligatorio.
      if (!perfil) {
        window.location.replace('onboarding.html');
        return false;
      }
      estado.profile = perfil;
      return Promise.all([cargarAsignaturas(), cargarApuntes()]).then(function () {
        return true;
      });
    });
  }

  function cargarAsignaturas() {
    return Studdy.getClient()
      .then(function (client) {
        return client.from('subjects').select('*').order('name');
      })
      .then(function (out) {
        if (out.error) throw new Error(traducir(out.error));
        estado.subjects = out.data || [];
      });
  }

  function cargarApuntes() {
    return Studdy.getClient()
      .then(function (client) {
        return client
          .from('notes')
          .select('id, subject_id, content, created_at')
          .order('created_at', { ascending: false });
      })
      .then(function (out) {
        if (out.error) throw new Error(traducir(out.error));
        estado.notes = out.data || [];
      });
  }

  function traducir(error) {
    var mensaje = error.message || 'Error al leer los datos.';
    if (/relation .* does not exist/i.test(mensaje)) {
      return 'Las tablas todavía no existen en Supabase. Ejecuta supabase/schema.sql.';
    }
    return mensaje;
  }

  // ------------------------------------------------------------------------
  // Cabecera
  // ------------------------------------------------------------------------

  function describirNivel(perfil) {
    if (!perfil) return '';

    switch (perfil.level) {
      case 'ESO':
        return (perfil.course ? perfil.course + ' de la ESO' : 'ESO');
      case 'Bachillerato':
        return [
          perfil.course ? perfil.course + ' de Bachillerato' : 'Bachillerato',
          perfil.branch,
        ].filter(Boolean).join(' · ');
      case 'FP':
        return [
          perfil.fp_grade ? 'FP de Grado ' + perfil.fp_grade : 'FP',
          perfil.fp_cycle,
          perfil.fp_family,
        ].filter(Boolean).join(' · ');
      case 'Universidad':
        return [
          perfil.university_degree,
          perfil.course ? perfil.course + ' curso' : null,
        ].filter(Boolean).join(' · ');
      default:
        return perfil.level || '';
    }
  }

  function pintarCabecera() {
    Studdy.$('#user-name').textContent = estado.profile.name;
    Studdy.$('#user-level').textContent = describirNivel(estado.profile);
  }

  // ------------------------------------------------------------------------
  // Enrutador
  // ------------------------------------------------------------------------

  var RUTAS = {
    apuntes: function (params) { return Studdy.views.notes.render(vista, params); },
    flashcards: function (params) { return Studdy.views.flashcards.render(vista, params); },
    examenes: function (params) { return Studdy.views.exams.render(vista, params); },
    chat: function (params) { return Studdy.views.chat.render(vista, params); },
    presentaciones: function (params) { return Studdy.views.presentations.render(vista, params); },
  };

  function enrutar() {
    var partes = (window.location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    var seccion = partes[0] || 'apuntes';
    var param = partes[1] || null;

    if (!RUTAS[seccion]) {
      window.location.hash = '#/apuntes';
      return;
    }

    Studdy.$$('.nav-link').forEach(function (link) {
      link.classList.toggle('is-active', link.dataset.section === seccion);
    });

    vista.innerHTML = Studdy.loadingHtml('Cargando…');
    window.scrollTo(0, 0);

    Promise.resolve()
      .then(function () { return RUTAS[seccion]({ id: param }); })
      .catch(function (err) {
        vista.innerHTML = Studdy.errorHtml(err.message);
      });
  }

  function navegar(hash) {
    if (window.location.hash === hash) enrutar();
    else window.location.hash = hash;
  }

  // ------------------------------------------------------------------------
  // Acceso al estado desde las vistas
  // ------------------------------------------------------------------------

  function subjectName(id) {
    var s = estado.subjects.filter(function (x) { return x.id === id; })[0];
    return s ? s.name : 'Sin asignatura';
  }

  function findNote(id) {
    return estado.notes.filter(function (n) { return n.id === id; })[0] || null;
  }

  return {
    start: start,
    state: estado,
    navigate: navegar,
    reloadNotes: cargarApuntes,
    reloadSubjects: cargarAsignaturas,
    describeLevel: describirNivel,
    subjectName: subjectName,
    findNote: findNote,
  };
})();
