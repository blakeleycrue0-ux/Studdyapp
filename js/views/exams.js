/* ==========================================================================
   Exámenes: generación a partir de un apunte, respuesta y corrección.

   Las preguntas tipo test se corrigen solas. Las de desarrollo corto se
   muestran junto a la respuesta esperada para que el estudiante se compare,
   y no puntúan, porque no hay forma honesta de puntuarlas automáticamente.
   ========================================================================== */

Studdy.views.exams = (function () {
  'use strict';

  function render(vista, params) {
    if (params.id) return renderExamen(vista, params.id);
    return renderLista(vista);
  }

  // ------------------------------------------------------------------------

  async function renderLista(vista) {
    var apuntes = Studdy.app.state.notes;

    if (!apuntes.length) {
      vista.innerHTML = cabecera('Exámenes',
        'Preguntas con la dificultad de tu curso, generadas desde tus apuntes.') +
        '<div class="empty">' +
          '<div class="empty__icon">' + ICONO + '</div>' +
          '<p class="empty__title">Aún no tienes apuntes</p>' +
          '<p class="empty__text">Los exámenes se generan a partir de un apunte, ' +
            'así que primero sube uno.</p>' +
          '<a class="btn btn--primary" href="#/apuntes/subir">Subir tu primer apunte</a>' +
        '</div>';
      return;
    }

    var client = await Studdy.getClient();
    var res = await client.from('exams').select('note_id');
    if (res.error) throw new Error(res.error.message);

    var existentes = {};
    (res.data || []).forEach(function (e) { existentes[e.note_id] = true; });

    vista.innerHTML =
      cabecera('Exámenes', 'Elige un apunte y ponte a prueba.') +
      '<div class="picker">' +
      apuntes.map(function (apunte) {
        var tiene = !!existentes[apunte.id];
        return (
          '<div class="picker__item">' +
            '<div class="picker__body">' +
              '<div class="picker__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</div>' +
              '<div class="picker__meta">' +
                Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) +
                (tiene ? ' · examen guardado' : '') +
              '</div>' +
            '</div>' +
            '<a class="btn ' + (tiene ? 'btn--soft' : 'btn--ghost') + ' btn--sm" ' +
              'href="#/examenes/' + apunte.id + '">' + (tiene ? 'Hacer' : 'Generar') + '</a>' +
          '</div>'
        );
      }).join('') +
      '</div>';
  }

  // ------------------------------------------------------------------------

  async function renderExamen(vista, noteId) {
    var apunte = Studdy.app.findNote(noteId);
    if (!apunte) {
      vista.innerHTML = Studdy.views.notes.volver('#/examenes', 'Exámenes') +
        Studdy.errorHtml('Ese apunte no existe o ya no está disponible.');
      return;
    }

    var client = await Studdy.getClient();
    var res = await client
      .from('exams')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (res.error) throw new Error(res.error.message);
    var examen = (res.data || [])[0] || null;

    var encabezado =
      Studdy.views.notes.volver('#/examenes', 'Exámenes') +
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</h1>' +
        '<p class="page-head__sub">' + Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) + '</p>' +
      '</div></div>';

    if (!examen) {
      vista.innerHTML = encabezado +
        '<div class="empty">' +
          '<div class="empty__icon">' + ICONO + '</div>' +
          '<p class="empty__title">Este apunte todavía no tiene examen</p>' +
          '<p class="empty__text">La IA preparará preguntas tipo test y de desarrollo ' +
            'corto ajustadas a tu curso.</p>' +
          '<button class="btn btn--primary" id="generar">Generar examen</button>' +
        '</div>' +
        '<div id="error" style="margin-top:16px"></div>';

      Studdy.$('#generar', vista).addEventListener('click', function () {
        var boton = this;
        var error = Studdy.$('#error', vista);
        error.innerHTML = '';
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner"></span> Generando…';

        generar(apunte)
          .then(function () { renderExamen(vista, noteId); })
          .catch(function (err) {
            error.innerHTML = Studdy.errorHtml(err.message);
            boton.disabled = false;
            boton.textContent = 'Generar examen';
          });
      });
      return;
    }

    var preguntas = normalizar(examen.questions_json);
    vista.innerHTML = encabezado +
      '<div id="quiz">' + preguntas.map(pintarPregunta).join('') + '</div>' +
      '<button class="btn btn--primary btn--lg" id="corregir">Corregir examen</button>';

    Studdy.$('#corregir', vista).addEventListener('click', function () {
      corregir(vista, preguntas);
    });
  }

  function normalizar(datos) {
    if (Array.isArray(datos)) return datos;
    if (datos && Array.isArray(datos.questions)) return datos.questions;
    return [];
  }

  var LETRAS = ['A', 'B', 'C', 'D'];

  function pintarPregunta(pregunta, i) {
    var cuerpo;

    if (pregunta.type === 'test') {
      cuerpo = '<div class="answers">' +
        pregunta.options.map(function (opcion, j) {
          return (
            '<label class="answer">' +
              '<input type="radio" name="q' + i + '" value="' + j + '">' +
              '<span class="answer__box">' +
                '<span class="answer__letter">' + LETRAS[j] + '</span>' +
                '<span>' + Studdy.escapeHtml(opcion) + '</span>' +
              '</span>' +
            '</label>'
          );
        }).join('') +
        '</div>';
    } else {
      cuerpo = '<textarea class="textarea" style="min-height:110px" ' +
        'data-corta="' + i + '"></textarea>';
    }

    return (
      '<article class="question" data-pregunta="' + i + '">' +
        '<p class="question__num">Pregunta ' + (i + 1) +
          (pregunta.type === 'corta' ? ' · desarrollo corto' : ' · test') + '</p>' +
        '<h2 class="question__text">' + Studdy.escapeHtml(pregunta.question) + '</h2>' +
        cuerpo +
      '</article>'
    );
  }

  // ------------------------------------------------------------------------
  // Corrección
  // ------------------------------------------------------------------------

  function corregir(vista, preguntas) {
    var aciertos = 0;
    var totalTest = 0;

    preguntas.forEach(function (pregunta, i) {
      var articulo = Studdy.$('[data-pregunta="' + i + '"]', vista);

      if (pregunta.type === 'test') {
        totalTest++;

        var elegido = Studdy.$('input[name="q' + i + '"]:checked', articulo);
        var indiceElegido = elegido ? parseInt(elegido.value, 10) : null;
        var acertada = indiceElegido === pregunta.correct_option;

        if (acertada) aciertos++;

        articulo.classList.add(acertada ? 'is-correct' : 'is-wrong');

        Studdy.$$('.answer', articulo).forEach(function (etiqueta, j) {
          var caja = Studdy.$('.answer__box', etiqueta);
          var input = Studdy.$('input', etiqueta);
          input.disabled = true;
          if (j === pregunta.correct_option) caja.classList.add('is-right');
          else if (j === indiceElegido) caja.classList.add('is-chosen-wrong');
        });

        articulo.insertAdjacentHTML('beforeend',
          acertada
            ? '<p class="verdict verdict--ok">' + ICONO_OK + 'Correcta</p>'
            : '<p class="verdict verdict--ko">' + ICONO_KO +
              (indiceElegido === null ? 'Sin responder' : 'Incorrecta') +
              ' · la correcta era la ' + LETRAS[pregunta.correct_option] + '</p>');
      } else {
        var textarea = Studdy.$('[data-corta="' + i + '"]', articulo);
        if (textarea) textarea.disabled = true;

        articulo.insertAdjacentHTML('beforeend',
          '<div class="expected"><b>Respuesta esperada</b>' +
            Studdy.escapeHtml(pregunta.expected_answer || '') + '</div>' +
          '<p class="verdict verdict--info">' + ICONO_INFO +
            'Compárala con la tuya. Las preguntas de desarrollo no puntúan.</p>');
      }
    });

    var boton = Studdy.$('#corregir', vista);
    boton.remove();

    var resumen = document.createElement('div');
    resumen.className = 'score';
    resumen.innerHTML =
      '<div class="score__value">' + aciertos + ' / ' + totalTest + '</div>' +
      '<p class="score__label">' +
        (totalTest
          ? 'preguntas tipo test acertadas'
          : 'este examen no tiene preguntas tipo test') +
      '</p>';

    var quiz = Studdy.$('#quiz', vista);
    quiz.parentNode.insertBefore(resumen, quiz);
    resumen.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ------------------------------------------------------------------------

  async function generar(apunte) {
    var respuesta = await Studdy.ai('exam', { content: apunte.content });

    var client = await Studdy.getClient();
    var out = await client
      .from('exams')
      .insert({ note_id: apunte.id, questions_json: respuesta.questions });

    if (out.error) throw new Error(out.error.message);
  }

  function cabecera(titulo, subtitulo) {
    return '<div class="page-head"><div>' +
      '<h1 class="page-head__title">' + Studdy.escapeHtml(titulo) + '</h1>' +
      '<p class="page-head__sub">' + Studdy.escapeHtml(subtitulo) + '</p>' +
      '</div></div>';
  }

  var ICONO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8.5 3.5h-2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-14a2 2 0 0 0-2-2h-2"/>' +
    '<rect x="8.5" y="1.8" width="7" height="4" rx="1.4"/><path d="M8.6 13.2l2 2 4.3-4.4"/></svg>';

  var ICONO_OK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  var ICONO_KO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var ICONO_INFO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/>' +
    '<path d="M12 11v5M12 7.8h.01"/></svg>';

  return { render: render };
})();
