/* ==========================================================================
   Onboarding en 4 pasos.

   Regla que gobierna todo este archivo: ningún campo arranca con valor. No hay
   placeholders que parezcan datos, ni opciones preseleccionadas, ni listas con
   ejemplos. El estado empieza literalmente vacío y solo se llena con lo que
   escribe el usuario.
   ========================================================================== */

(function () {
  'use strict';

  // Las familias y los ciclos salen del catálogo de js/data/fp.js
  var FAMILIAS_FP = Studdy.fp.familias;

  var RAMAS_BACHILLERATO = ['Ciencias', 'Humanidades y CCSS', 'Artes'];

  // Estado: todo vacío al empezar.
  var estado = {
    name: '',
    level: '',
    course: '',
    branch: '',
    fp_grade: '',
    fp_family: '',
    fp_cycle: '',
    university_degree: '',
    subjects: [],
  };

  var pasoActual = 1;
  var TOTAL = 4;

  var el = {
    boot: Studdy.$('#boot'),
    error: Studdy.$('#error'),
    fill: Studdy.$('#progress-fill'),
    label: Studdy.$('#progress-label'),
    name: Studdy.$('#name'),
    levels: Studdy.$('#levels'),
    step3Question: Studdy.$('#step3-question'),
    step3Hint: Studdy.$('#step3-hint'),
    step3Fields: Studdy.$('#step3-fields'),
    subjectsEmpty: Studdy.$('#subjects-empty'),
    subjectsList: Studdy.$('#subjects-list'),
    adder: Studdy.$('#subject-adder'),
    subjectInput: Studdy.$('#subject-input'),
    subjectConfirm: Studdy.$('#subject-confirm'),
    subjectOpen: Studdy.$('#subject-open'),
    back: Studdy.$('#back'),
    next: Studdy.$('#next'),
    finish: Studdy.$('#finish'),
  };

  // ------------------------------------------------------------------------
  // Arranque: hace falta sesión. Si el perfil ya existe, este formulario no
  // pinta nada y se pasa directamente al dashboard.
  // ------------------------------------------------------------------------

  Studdy.requireSession()
    .then(function (session) {
      if (!session) return null;
      return Studdy.getProfile();
    })
    .then(function (perfil) {
      if (perfil) {
        window.location.replace('app.html');
        return;
      }
      el.boot.remove();
      el.name.focus();
    })
    .catch(function (err) {
      el.boot.remove();
      mostrarError(err.message);
    });

  // ------------------------------------------------------------------------
  // Paso 1 — nombre
  // ------------------------------------------------------------------------

  el.name.addEventListener('input', function () {
    estado.name = el.name.value.trim();
    actualizarNavegacion();
  });

  // ------------------------------------------------------------------------
  // Paso 2 — nivel
  // ------------------------------------------------------------------------

  el.levels.addEventListener('change', function (evento) {
    if (evento.target.name !== 'level') return;

    // Cambiar de nivel invalida lo contestado en el paso 3.
    if (estado.level !== evento.target.value) {
      estado.course = '';
      estado.branch = '';
      estado.fp_grade = '';
      estado.fp_family = '';
      estado.fp_cycle = '';
      estado.university_degree = '';
    }

    estado.level = evento.target.value;
    construirPaso3();
    actualizarNavegacion();
  });

  // ------------------------------------------------------------------------
  // Paso 3 — se reconstruye según el nivel elegido
  // ------------------------------------------------------------------------

  function construirPaso3() {
    var html = '';

    switch (estado.level) {
      case 'ESO':
        el.step3Question.textContent = '¿En qué curso de la ESO estás?';
        el.step3Hint.textContent = '';
        html = campoSelect('course', 'Curso', ['1º', '2º', '3º', '4º']);
        break;

      case 'Bachillerato':
        el.step3Question.textContent = 'Cuéntanos más de tu Bachillerato';
        el.step3Hint.textContent = 'El curso y la rama que estás cursando.';
        html =
          campoSelect('course', 'Curso', ['1º', '2º']) +
          campoSelect('branch', 'Rama', RAMAS_BACHILLERATO);
        break;

      case 'FP':
        el.step3Question.textContent = 'Cuéntanos más de tu ciclo';
        el.step3Hint.textContent = 'Elige el grado y la familia, y te salen sus ciclos.';
        html =
          campoSelect('fp_family', 'Familia profesional', FAMILIAS_FP) +
          '<div id="grado-wrap"></div>' +
          '<div id="ciclo-wrap"></div>';
        break;

      case 'Universidad':
        el.step3Question.textContent = 'Cuéntanos qué carrera estudias';
        el.step3Hint.textContent = '';
        html =
          campoTexto('university_degree', 'Carrera') +
          campoSelect('course', 'Curso', ['1º', '2º', '3º', '4º', '5º', '6º']);
        break;

      default:
        el.step3Question.textContent = 'Concreta tu curso';
        el.step3Hint.textContent = '';
        html = '';
    }

    el.step3Fields.innerHTML = html;

    if (estado.level === 'FP') refrescarFp();
    conectarCampos();
  }

  // Conecta (o reconecta) todos los campos del paso 3 con el estado.
  function conectarCampos() {
    Studdy.$$('[data-campo]', el.step3Fields).forEach(function (campo) {
      if (campo.dataset.conectado) return;
      campo.dataset.conectado = '1';

      campo.addEventListener(campo.tagName === 'SELECT' ? 'change' : 'input', function () {
        estado[campo.dataset.campo] = campo.value.trim();

        // La familia decide qué grados existen; grado y familia deciden los ciclos.
        if (campo.dataset.campo === 'fp_family') {
          estado.fp_grade = '';
          estado.fp_cycle = '';
          refrescarFp();
          conectarCampos();
        } else if (campo.dataset.campo === 'fp_grade') {
          estado.fp_cycle = '';
          refrescarCiclos();
          conectarCampos();
        }

        // "Otro" abre un campo de texto para escribir el ciclo a mano.
        if (campo.dataset.campo === 'fp_cycle_pick') {
          estado.fp_cycle = campo.value === '__otro__' ? '' : campo.value;
          refrescarOtro(campo.value === '__otro__');
          conectarCampos();
        }

        actualizarNavegacion();
      });
    });
  }

  // Solo se ofrecen los grados que esa familia tiene realmente.
  function refrescarFp() {
    var wrap = Studdy.$('#grado-wrap', el.step3Fields);
    if (!wrap) return;

    if (!estado.fp_family) {
      wrap.innerHTML = '';
      var ciclos = Studdy.$('#ciclo-wrap', el.step3Fields);
      if (ciclos) ciclos.innerHTML = '';
      return;
    }

    wrap.innerHTML = '<div style="margin-top:22px">' +
      campoSelect('fp_grade', 'Grado', Studdy.fp.grados(estado.fp_family)) + '</div>';

    refrescarCiclos();
  }

  // Pinta el selector de ciclo con los que existen para ese grado y familia.
  function refrescarCiclos() {
    var wrap = Studdy.$('#ciclo-wrap', el.step3Fields);
    if (!wrap) return;

    if (!estado.fp_grade || !estado.fp_family) {
      wrap.innerHTML = '';
      return;
    }

    var lista = Studdy.fp.ciclos(estado.fp_family, estado.fp_grade);

    // Sin ciclos recogidos para esa combinación, se escribe a mano y ya.
    if (!lista.length) {
      wrap.innerHTML = '<div style="margin-top:22px">' +
        campoTexto('fp_cycle', 'Ciclo formativo') + '</div>';
      return;
    }

    var opciones = lista.map(function (c) {
      return '<option value="' + Studdy.escapeHtml(c) + '"' +
        (estado.fp_cycle === c ? ' selected' : '') + '>' + Studdy.escapeHtml(c) + '</option>';
    }).join('');

    var esOtro = !!estado.fp_cycle && lista.indexOf(estado.fp_cycle) === -1;
    var sinElegir = !estado.fp_cycle && !esOtro;

    wrap.innerHTML =
      '<label class="field" style="margin-top:22px">' +
        '<span class="field__label">Ciclo formativo</span>' +
        '<select class="select" data-campo="fp_cycle_pick">' +
          '<option value="" disabled hidden' + (sinElegir ? ' selected' : '') + '>' +
            'Selecciona tu ciclo</option>' +
          opciones +
          '<option value="__otro__"' + (esOtro ? ' selected' : '') + '>' +
            'Mi ciclo no está en la lista</option>' +
        '</select>' +
      '</label>' +
      '<div id="otro-wrap"></div>';

    refrescarOtro(esOtro);
  }

  function refrescarOtro(mostrar) {
    var wrap = Studdy.$('#otro-wrap', el.step3Fields);
    if (!wrap) return;
    wrap.innerHTML = mostrar
      ? '<div style="margin-top:22px">' + campoTexto('fp_cycle', 'Escribe tu ciclo') + '</div>'
      : '';
  }

  // Un <select> siempre arranca en la opción vacía: nada preseleccionado.
  function campoSelect(campo, etiqueta, opciones) {
    var options = opciones
      .map(function (o) {
        var sel = estado[campo] === o ? ' selected' : '';
        return '<option value="' + Studdy.escapeHtml(o) + '"' + sel + '>' + Studdy.escapeHtml(o) + '</option>';
      })
      .join('');

    var vacioSeleccionado = estado[campo] ? '' : ' selected';

    return (
      '<label class="field">' +
      '<span class="field__label">' + Studdy.escapeHtml(etiqueta) + '</span>' +
      '<select class="select" data-campo="' + campo + '">' +
      '<option value="" disabled hidden' + vacioSeleccionado + '>Selecciona una opción</option>' +
      options +
      '</select>' +
      '</label>'
    );
  }

  function campoTexto(campo, etiqueta) {
    return (
      '<label class="field">' +
      '<span class="field__label">' + Studdy.escapeHtml(etiqueta) + '</span>' +
      '<input class="input" type="text" data-campo="' + campo + '" spellcheck="false" ' +
      'maxlength="120" value="' + Studdy.escapeHtml(estado[campo]) + '">' +
      '</label>'
    );
  }

  // ------------------------------------------------------------------------
  // Paso 4 — asignaturas
  // ------------------------------------------------------------------------

  el.subjectOpen.addEventListener('click', function () {
    el.adder.classList.add('is-open');
    el.subjectOpen.hidden = true;
    el.subjectInput.focus();
  });

  el.subjectConfirm.addEventListener('click', anadirAsignatura);

  el.subjectInput.addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      anadirAsignatura();
    } else if (evento.key === 'Escape') {
      cerrarAdder();
    }
  });

  function anadirAsignatura() {
    var nombre = el.subjectInput.value.trim();
    if (!nombre) {
      el.subjectInput.focus();
      return;
    }

    var repetida = estado.subjects.some(function (s) {
      return s.toLowerCase() === nombre.toLowerCase();
    });

    if (!repetida) estado.subjects.push(nombre);

    el.subjectInput.value = '';
    el.subjectInput.focus();
    pintarAsignaturas();
    actualizarNavegacion();
  }

  function cerrarAdder() {
    el.adder.classList.remove('is-open');
    el.subjectOpen.hidden = false;
    el.subjectInput.value = '';
  }

  function pintarAsignaturas() {
    el.subjectsEmpty.hidden = estado.subjects.length > 0;

    el.subjectsList.innerHTML = estado.subjects
      .map(function (nombre, i) {
        return (
          '<span class="chip">' + Studdy.escapeHtml(nombre) +
          '<button class="chip__remove" type="button" data-quitar="' + i + '" ' +
          'aria-label="Quitar ' + Studdy.escapeHtml(nombre) + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" ' +
          'stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button></span>'
        );
      })
      .join('');
  }

  el.subjectsList.addEventListener('click', function (evento) {
    var boton = evento.target.closest('[data-quitar]');
    if (!boton) return;
    estado.subjects.splice(parseInt(boton.dataset.quitar, 10), 1);
    pintarAsignaturas();
    actualizarNavegacion();
  });

  // ------------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------------

  function pasoCompleto(paso) {
    switch (paso) {
      case 1:
        return estado.name.length > 0;
      case 2:
        return estado.level.length > 0;
      case 3:
        if (estado.level === 'ESO') return !!estado.course;
        if (estado.level === 'Bachillerato') return !!estado.course && !!estado.branch;
        if (estado.level === 'FP') return !!estado.fp_grade && !!estado.fp_family && !!estado.fp_cycle;
        if (estado.level === 'Universidad') return !!estado.university_degree && !!estado.course;
        return false;
      case 4:
        return estado.subjects.length > 0;
      default:
        return false;
    }
  }

  function actualizarNavegacion() {
    var completo = pasoCompleto(pasoActual);
    el.next.disabled = !completo;
    el.finish.disabled = !completo;
  }

  function irAPaso(paso) {
    pasoActual = paso;

    Studdy.$$('.step-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', parseInt(panel.dataset.step, 10) === paso);
    });

    el.fill.style.width = (paso / TOTAL) * 100 + '%';
    el.label.textContent = 'Paso ' + paso + ' de ' + TOTAL;

    el.back.hidden = paso === 1;
    el.next.hidden = paso === TOTAL;
    el.finish.hidden = paso !== TOTAL;

    el.error.innerHTML = '';
    actualizarNavegacion();

    var primero = Studdy.$('.step-panel.is-active input, .step-panel.is-active select');
    if (primero && primero.type !== 'radio') primero.focus();
  }

  el.next.addEventListener('click', function () {
    if (!pasoCompleto(pasoActual)) return;
    irAPaso(Math.min(pasoActual + 1, TOTAL));
  });

  el.back.addEventListener('click', function () {
    irAPaso(Math.max(pasoActual - 1, 1));
  });

  // ------------------------------------------------------------------------
  // Finalizar: guarda perfil y asignaturas en Supabase
  // ------------------------------------------------------------------------

  el.finish.addEventListener('click', function () {
    if (!pasoCompleto(4)) return;

    el.error.innerHTML = '';
    el.finish.disabled = true;
    el.back.disabled = true;
    el.finish.innerHTML = '<span class="spinner"></span> Guardando…';

    guardar()
      .then(function () {
        window.location.href = 'app.html';
      })
      .catch(function (err) {
        mostrarError(err.message);
        el.finish.disabled = false;
        el.back.disabled = false;
        el.finish.textContent = 'Finalizar';
      });
  });

  function guardar() {
    var client;

    return Studdy.getClient()
      .then(function (c) {
        client = c;
        return c.auth.getUser();
      })
      .then(function (res) {
        var user = res.data ? res.data.user : null;
        if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

        return client.from('profiles').upsert({
          id: user.id,
          name: estado.name,
          level: estado.level,
          course: estado.course || null,
          branch: estado.branch || null,
          fp_grade: estado.fp_grade || null,
          fp_family: estado.fp_family || null,
          fp_cycle: estado.fp_cycle || null,
          university_degree: estado.university_degree || null,
        }).select().single().then(function (out) {
          if (out.error) throw new Error(traducir(out.error));
          return user.id;
        });
      })
      .then(function (profileId) {
        var filas = estado.subjects.map(function (nombre) {
          return { profile_id: profileId, name: nombre };
        });
        return client.from('subjects').insert(filas).then(function (out) {
          if (out.error) throw new Error(traducir(out.error));
        });
      });
  }

  function traducir(error) {
    var mensaje = error.message || 'No se han podido guardar tus datos.';
    if (/relation .* does not exist/i.test(mensaje)) {
      return 'Las tablas todavía no existen en Supabase. Ejecuta supabase/schema.sql.';
    }
    if (/row-level security/i.test(mensaje)) {
      return 'Supabase ha rechazado la escritura por las políticas RLS. ' +
        'Comprueba que has ejecutado supabase/schema.sql completo.';
    }
    return mensaje;
  }

  function mostrarError(mensaje) {
    el.error.innerHTML = Studdy.errorHtml(mensaje);
  }

  // Estado inicial
  pintarAsignaturas();
  irAPaso(1);
})();
