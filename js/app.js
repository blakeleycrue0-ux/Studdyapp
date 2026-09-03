/* ==========================================================================
   Studdy — armazón de la aplicación
   Estado compartido, carga de datos y enrutador por hash.
   ========================================================================== */

Studdy.views = {};

Studdy.app = (function () {
  'use strict';

  var CLAVE_ULTIMO = 'studdy:ultimo-apunte';

  var estado = {
    profile: null,
    subjects: [],
    notes: [],
    // noteId -> { summary, flashcards, exams, presentations }
    counts: {},
    // null si la tabla exam_attempts todavía no existe en Supabase
    attempts: null,
  };

  var vista = Studdy.$('#view');

  // ------------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------------

  function start() {
    Studdy.requireSession()
      .then(function (session) {
        if (!session) return false;
        return cargarDatos();
      })
      .then(function (ok) {
        if (!ok) return;
        Studdy.$('#boot').remove();
        window.addEventListener('hashchange', enrutar);
        enrutar();
      })
      .catch(function (err) {
        var boot = Studdy.$('#boot');
        if (boot) boot.remove();
        vista.innerHTML = Studdy.errorHtml(err.message);
      });
  }

  function cargarDatos() {
    return Studdy.getProfile().then(function (perfil) {
      if (!perfil) {
        window.location.replace('onboarding.html');
        return false;
      }
      estado.profile = perfil;
      return Promise.all([
        cargarAsignaturas(),
        cargarApuntes().then(cargarContadores),
        cargarIntentos(),
      ]).then(function () { return true; });
    });
  }

  function cargarAsignaturas() {
    return Studdy.getClient()
      .then(function (c) { return c.from('subjects').select('*').order('name'); })
      .then(function (out) {
        if (out.error) throw new Error(traducir(out.error));
        estado.subjects = out.data || [];
      });
  }

  function cargarApuntes() {
    return Studdy.getClient()
      .then(function (c) {
        return c.from('notes')
          .select('id, subject_id, content, created_at')
          .order('created_at', { ascending: false });
      })
      .then(function (out) {
        if (out.error) throw new Error(traducir(out.error));
        estado.notes = out.data || [];
      });
  }

  // Cuántas cosas ha generado ya cada apunte. Alimenta las insignias de las
  // pestañas del cuaderno y las etiquetas de la lista de apuntes.
  function cargarContadores() {
    return Studdy.getClient().then(function (c) {
      return Promise.all([
        c.from('summaries').select('note_id'),
        c.from('flashcards').select('note_id'),
        c.from('exams').select('note_id'),
        c.from('presentations').select('note_id'),
      ]).then(function (res) {
        var counts = {};
        estado.notes.forEach(function (n) {
          counts[n.id] = { summary: 0, flashcards: 0, exams: 0, presentations: 0 };
        });

        var claves = ['summary', 'flashcards', 'exams', 'presentations'];
        res.forEach(function (r, i) {
          if (r.error) return;
          (r.data || []).forEach(function (fila) {
            if (fila.note_id && counts[fila.note_id]) counts[fila.note_id][claves[i]]++;
          });
        });

        estado.counts = counts;
      });
    });
  }

  // La tabla de intentos es opcional: si todavía no se ha ejecutado su
  // migración, la app funciona igual y solo se oculta el dato de aciertos.
  function cargarIntentos() {
    return Studdy.getClient()
      .then(function (c) {
        return c.from('exam_attempts')
          .select('score, total, created_at')
          .order('created_at', { ascending: false });
      })
      .then(function (out) {
        estado.attempts = out.error ? null : (out.data || []);
      })
      .catch(function () { estado.attempts = null; });
  }

  function traducir(error) {
    var mensaje = error.message || 'Error al leer los datos.';
    if (/relation .* does not exist/i.test(mensaje)) {
      return 'Las tablas todavía no existen en Supabase. Ejecuta supabase/schema.sql.';
    }
    return mensaje;
  }

  // ------------------------------------------------------------------------
  // Enrutador
  // ------------------------------------------------------------------------

  var RUTAS = {
    inicio: function (p) { return Studdy.views.home.render(vista, p); },
    apuntes: function (p) { return Studdy.views.notes.render(vista, p); },
    n: function (p) { return Studdy.views.notebook.render(vista, p); },
    chat: function (p) { return Studdy.views.chat.render(vista, p); },
    p: function (p) { return Studdy.views.presentations.render(vista, p); },
    agenda: function (p) { return Studdy.views.agenda.render(vista, p); },
    repasar: function (p) { return Studdy.views.review.render(vista, p); },
    ejercicios: function (p) { return Studdy.views.exercises.render(vista, p); },
    trabajos: function (p) { return Studdy.views.writing.render(vista, p); },
    tema: function () { return Studdy.views.presentations.renderTopic(vista); },
    perfil: function (p) { return Studdy.views.profile.render(vista, p); },
  };

  // Qué pestaña de abajo se ilumina en cada sección.
  var TAB_DE_SECCION = {
    inicio: 'inicio', agenda: 'inicio', ejercicios: 'inicio',
    trabajos: 'inicio', tema: 'inicio', p: 'inicio',
    apuntes: 'apuntes', n: 'apuntes',
    repasar: 'repasar',
    chat: 'chat',
    perfil: 'perfil',
  };

  function enrutar() {
    var partes = (window.location.hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
    var seccion = partes[0] || 'inicio';

    if (!RUTAS[seccion]) {
      window.location.hash = '#/inicio';
      return;
    }

    var activa = TAB_DE_SECCION[seccion];
    Studdy.$$('.tab').forEach(function (tab) {
      tab.classList.toggle('is-active', tab.dataset.section === activa);
    });

    vista.innerHTML = Studdy.loadingHtml('Cargando…');
    window.scrollTo(0, 0);

    Promise.resolve()
      .then(function () { return RUTAS[seccion](partes.slice(1)); })
      .catch(function (err) {
        vista.innerHTML = Studdy.errorHtml(err.message);
      });
  }

  function navegar(hash) {
    if (window.location.hash === hash) enrutar();
    else window.location.hash = hash;
  }

  // ------------------------------------------------------------------------
  // Consultas sobre el estado
  // ------------------------------------------------------------------------

  function findNote(id) {
    return estado.notes.filter(function (n) { return n.id === id; })[0] || null;
  }

  function findSubject(id) {
    return estado.subjects.filter(function (s) { return s.id === id; })[0] || null;
  }

  function subjectName(id) {
    var s = findSubject(id);
    return s ? s.name : 'Sin asignatura';
  }

  var COLORES = ['t-violet', 't-blue', 't-green', 't-coral', 't-pink', 't-amber', 't-cyan', 't-lime'];

  // Color estable por asignatura: mismo id, mismo color siempre.
  function subjectColor(id) {
    var suma = 0;
    var texto = String(id || '');
    for (var i = 0; i < texto.length; i++) suma = (suma * 31 + texto.charCodeAt(i)) >>> 0;
    return COLORES[suma % COLORES.length];
  }

  // Para listas donde cada fila lleva un color distinto por posición.
  function colorAt(i) { return COLORES[i % COLORES.length]; }

  function notesOfSubject(subjectId) {
    return estado.notes.filter(function (n) { return n.subject_id === subjectId; });
  }

  function countsFor(noteId) {
    return estado.counts[noteId] || { summary: 0, flashcards: 0, exams: 0, presentations: 0 };
  }

  function bumpCount(noteId, clave, cantidad) {
    if (!estado.counts[noteId]) {
      estado.counts[noteId] = { summary: 0, flashcards: 0, exams: 0, presentations: 0 };
    }
    estado.counts[noteId][clave] += (cantidad == null ? 1 : cantidad);
  }

  // ------------------------------------------------------------------------
  // Último apunte abierto — alimenta el "Continuar" del inicio
  // ------------------------------------------------------------------------

  function recordarApunte(noteId) {
    try { localStorage.setItem(CLAVE_ULTIMO, noteId); } catch (e) { /* modo privado */ }
  }

  function ultimoApunte() {
    var id;
    try { id = localStorage.getItem(CLAVE_ULTIMO); } catch (e) { return null; }
    return id ? findNote(id) : null;
  }

  // ------------------------------------------------------------------------
  // Nivel académico en texto
  // ------------------------------------------------------------------------

  function describirNivel(perfil) {
    if (!perfil) return '';
    switch (perfil.level) {
      case 'ESO':
        return perfil.course ? perfil.course + ' de la ESO' : 'ESO';
      case 'Bachillerato':
        return [perfil.course ? perfil.course + ' de Bachillerato' : 'Bachillerato', perfil.branch]
          .filter(Boolean).join(' · ');
      case 'FP':
        return [perfil.fp_grade ? 'FP de Grado ' + perfil.fp_grade : 'FP', perfil.fp_cycle, perfil.fp_family]
          .filter(Boolean).join(' · ');
      case 'Universidad':
        return [perfil.university_degree, perfil.course ? perfil.course + ' curso' : null]
          .filter(Boolean).join(' · ');
      default:
        return perfil.level || '';
    }
  }

  function iniciales(nombre) {
    return String(nombre || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (p) { return p.charAt(0).toUpperCase(); })
      .join('') || '?';
  }

  // ------------------------------------------------------------------------
  // Trozos de interfaz reutilizados por varias vistas
  // ------------------------------------------------------------------------

  function volver(href, texto) {
    return '<a class="back-link" href="' + href + '" aria-label="Volver a ' +
      Studdy.escapeHtml(texto) + '">' + Studdy.icons.atras +
      '<span>' + Studdy.escapeHtml(texto) + '</span></a>';
  }

  function cabecera(titulo, subtitulo, extra) {
    return '<div class="topbar">' +
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px">' +
        '<div>' +
          '<h1 class="topbar__title">' + Studdy.escapeHtml(titulo) + '</h1>' +
          (subtitulo ? '<p class="topbar__sub">' + Studdy.escapeHtml(subtitulo) + '</p>' : '') +
        '</div>' +
        (extra || '') +
      '</div>' +
    '</div>';
  }

  return {
    start: start,
    state: estado,
    navigate: navegar,
    reloadNotes: function () { return cargarApuntes().then(cargarContadores); },
    reloadSubjects: cargarAsignaturas,
    reloadAttempts: cargarIntentos,
    describeLevel: describirNivel,
    initials: iniciales,
    findNote: findNote,
    findSubject: findSubject,
    subjectName: subjectName,
    subjectColor: subjectColor,
    colorAt: colorAt,
    notesOfSubject: notesOfSubject,
    countsFor: countsFor,
    bumpCount: bumpCount,
    rememberNote: recordarApunte,
    lastNote: ultimoApunte,
    volver: volver,
    cabecera: cabecera,
  };
})();
