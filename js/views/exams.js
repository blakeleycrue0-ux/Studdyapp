/* ==========================================================================
   Examen de un apunte: generación, respuesta y corrección.

   Las preguntas tipo test se corrigen solas. Las de desarrollo corto se
   muestran junto a la respuesta esperada para comparar, y no puntúan, porque
   no hay forma honesta de puntuarlas automáticamente.
   ========================================================================== */

Studdy.views.exams = (function () {
  'use strict';

  async function renderPanel(panel, apunte) {
    panel.innerHTML = Studdy.loadingHtml('Cargando el examen…');

    var client = await Studdy.getClient();
    var res = await client
      .from('exams')
      .select('*')
      .eq('note_id', apunte.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (res.error) throw new Error(res.error.message);
    var examen = (res.data || [])[0] || null;

    if (!examen) {
      panel.innerHTML = Studdy.views.notebook.vacio(
        Studdy.icons.examen,
        'Todavía no hay examen',
        'Preguntas tipo test y de desarrollo corto, con la dificultad de tu curso.',
        'Generar examen'
      ) + '<div id="err" style="margin-top:14px"></div>';

      conectarGenerar(panel, apunte);
      return;
    }

    pintarExamen(panel, apunte, examen);
  }

  // ------------------------------------------------------------------------

  function normalizar(datos) {
    if (Array.isArray(datos)) return datos;
    if (datos && Array.isArray(datos.questions)) return datos.questions;
    return [];
  }

  var LETRAS = ['A', 'B', 'C', 'D'];

  function pintarExamen(panel, apunte, examen) {
    var preguntas = normalizar(examen.questions_json);

    panel.innerHTML =
      '<div id="resultado"></div>' +
      '<div id="quiz">' + preguntas.map(pintarPregunta).join('') + '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="corregir">Corregir examen</button>' +
      '<div id="err" style="margin-top:14px"></div>';

    Studdy.$('#corregir', panel).addEventListener('click', function () {
      corregir(panel, apunte, examen, preguntas);
    });
  }

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
        }).join('') + '</div>';
    } else {
      cuerpo = '<textarea class="textarea" style="min-height:100px" data-corta="' + i + '"></textarea>';
    }

    return (
      '<article class="question" data-pregunta="' + i + '">' +
        '<p class="question__num">Pregunta ' + (i + 1) +
          (pregunta.type === 'corta' ? ' · desarrollo' : ' · test') + '</p>' +
        '<h2 class="question__text">' + Studdy.escapeHtml(pregunta.question) + '</h2>' +
        cuerpo +
      '</article>'
    );
  }

  // ------------------------------------------------------------------------
  // Corrección
  // ------------------------------------------------------------------------

  function corregir(panel, apunte, examen, preguntas) {
    var aciertos = 0;
    var fallos = 0;
    var desarrollo = 0;

    preguntas.forEach(function (pregunta, i) {
      var articulo = Studdy.$('[data-pregunta="' + i + '"]', panel);

      if (pregunta.type === 'test') {
        var elegido = Studdy.$('input[name="q' + i + '"]:checked', articulo);
        var indiceElegido = elegido ? parseInt(elegido.value, 10) : null;
        var acertada = indiceElegido === pregunta.correct_option;

        if (acertada) aciertos++; else fallos++;

        articulo.classList.add(acertada ? 'is-correct' : 'is-wrong');

        Studdy.$$('.answer', articulo).forEach(function (etiqueta, j) {
          var caja = Studdy.$('.answer__box', etiqueta);
          Studdy.$('input', etiqueta).disabled = true;
          if (j === pregunta.correct_option) caja.classList.add('is-right');
          else if (j === indiceElegido) caja.classList.add('is-chosen-wrong');
        });

        articulo.insertAdjacentHTML('beforeend',
          acertada
            ? '<p class="verdict verdict--ok">' + Studdy.icons.ok + 'Correcta</p>'
            : '<p class="verdict verdict--ko">' + Studdy.icons.ko +
              (indiceElegido === null ? 'Sin responder' : 'Incorrecta') +
              ' · la correcta era la ' + LETRAS[pregunta.correct_option] + '</p>');
      } else {
        desarrollo++;
        var textarea = Studdy.$('[data-corta="' + i + '"]', articulo);
        if (textarea) textarea.disabled = true;

        articulo.insertAdjacentHTML('beforeend',
          '<div class="expected"><b>Respuesta esperada</b>' +
            Studdy.escapeHtml(pregunta.expected_answer || '') + '</div>' +
          '<p class="verdict verdict--info">' + Studdy.icons.info +
            'Compárala con la tuya. Las de desarrollo no puntúan.</p>');
      }
    });

    Studdy.$('#corregir', panel).remove();

    var totalTest = aciertos + fallos;
    var pct = totalTest ? Math.round((aciertos / totalTest) * 100) : 0;

    Studdy.$('#resultado', panel).innerHTML =
      resultado(pct, aciertos, fallos, desarrollo, totalTest) +
      '<div style="display:flex;gap:9px;margin-bottom:20px">' +
        '<button class="btn btn--ghost btn--sm" id="repetir">Repetir</button>' +
        '<button class="btn btn--ghost btn--sm" id="otro">Generar otro examen</button>' +
      '</div>';

    Studdy.$('#repetir', panel).addEventListener('click', function () {
      pintarExamen(panel, apunte, examen);
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    conectarGenerar(panel, apunte, '#otro');

    Studdy.$('#resultado', panel).scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (totalTest) guardarIntento(examen.id, aciertos, totalTest);
  }

  function resultado(pct, aciertos, fallos, desarrollo, totalTest) {
    var veredicto;
    if (!totalTest) veredicto = 'Examen de desarrollo';
    else if (pct >= 90) veredicto = 'Te lo sabes';
    else if (pct >= 70) veredicto = 'Bien, casi está';
    else if (pct >= 50) veredicto = 'A medias';
    else veredicto = 'Toca repasar esto';

    return (
      '<div class="result">' +
        (totalTest
          ? '<div class="ring ring--lg result__ring" style="--pct:' + pct + '">' +
              '<div class="ring__inner">' + pct + '%</div>' +
            '</div>'
          : '') +
        '<p class="result__verdict">' + Studdy.escapeHtml(veredicto) + '</p>' +
        '<p class="result__detail">' +
          (totalTest
            ? aciertos + ' de ' + totalTest + ' preguntas tipo test'
            : 'Compara tus respuestas con las esperadas') +
        '</p>' +
        '<div class="result__breakdown">' +
          celda('ok', aciertos, 'acertadas') +
          celda('ko', fallos, 'falladas') +
          celda('na', desarrollo, 'a comparar') +
        '</div>' +
      '</div>'
    );
  }

  function celda(tipo, valor, etiqueta) {
    return '<div class="result__cell result__cell--' + tipo + '">' +
      '<b>' + valor + '</b><span>' + Studdy.escapeHtml(etiqueta) + '</span></div>';
  }

  // Guarda el intento para poder enseñar el porcentaje de acierto en Inicio.
  // Si la tabla todavía no existe, se ignora sin romper nada.
  async function guardarIntento(examId, score, total) {
    try {
      var client = await Studdy.getClient();
      var userRes = await client.auth.getUser();
      var user = userRes.data ? userRes.data.user : null;
      if (!user) return;

      var out = await client.from('exam_attempts')
        .insert({ exam_id: examId, profile_id: user.id, score: score, total: total });

      if (!out.error) await Studdy.app.reloadAttempts();
    } catch (e) { /* la tabla es opcional */ }
  }

  // ------------------------------------------------------------------------

  function conectarGenerar(panel, apunte, selector) {
    var boton = Studdy.$(selector || '#generar', panel);
    if (!boton) return;

    var etiqueta = boton.textContent;

    boton.addEventListener('click', function () {
      var err = Studdy.$('#err', panel);
      if (err) err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generar(apunte)
        .then(function () {
          Studdy.app.bumpCount(apunte.id, 'exams');
          Studdy.app.navigate('#/n/' + apunte.id + '/examen');
        })
        .catch(function (e) {
          if (err) err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = etiqueta;
        });
    });
  }

  async function generar(apunte) {
    var respuesta = await Studdy.ai('exam', { content: apunte.content });

    var client = await Studdy.getClient();
    var out = await client
      .from('exams')
      .insert({ note_id: apunte.id, questions_json: respuesta.questions });

    if (out.error) throw new Error(out.error.message);
  }

  return { renderPanel: renderPanel };
})();
