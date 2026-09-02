/* ==========================================================================
   Apuntes: dashboard, subida de apuntes y esquema generado por la IA.

   Nada de contenido de ejemplo: si el usuario no ha subido nada, lo que se ve
   es un estado vacío, no un apunte de muestra.
   ========================================================================== */

Studdy.views.notes = (function () {
  'use strict';

  var app = null;
  function state() { app = app || Studdy.app; return app.state; }

  // ------------------------------------------------------------------------

  function render(vista, params) {
    if (params.id === 'subir') return renderSubida(vista);
    if (params.id) return renderDetalle(vista, params.id);
    return renderDashboard(vista);
  }

  // ------------------------------------------------------------------------
  // Dashboard
  // ------------------------------------------------------------------------

  function renderDashboard(vista) {
    var s = state();
    var sinApuntes = s.notes.length === 0;

    var html =
      '<section class="greeting">' +
        '<h1 class="greeting__hello">Hola, ' + Studdy.escapeHtml(s.profile.name) + '</h1>' +
        '<div class="greeting__meta">' +
          '<span class="tag">' + Studdy.escapeHtml(Studdy.app.describeLevel(s.profile)) + '</span>' +
          '<span class="tag">' + s.subjects.length +
            (s.subjects.length === 1 ? ' asignatura' : ' asignaturas') + '</span>' +
        '</div>' +
      '</section>';

    if (sinApuntes) {
      html +=
        '<div class="empty">' +
          '<div class="empty__icon">' + ICONO_APUNTE + '</div>' +
          '<p class="empty__title">Aún no tienes apuntes</p>' +
          '<p class="empty__text">Sube un PDF o pega el texto de un tema y la IA te ' +
            'devolverá un esquema escrito para tu curso.</p>' +
          '<a class="btn btn--primary" href="#/apuntes/subir">Subir tu primer apunte</a>' +
        '</div>';
    } else {
      html +=
        '<div class="page-head">' +
          '<div>' +
            '<h2 class="page-head__title">Tus asignaturas</h2>' +
            '<p class="page-head__sub">' + s.notes.length +
              (s.notes.length === 1 ? ' apunte guardado' : ' apuntes guardados') + '</p>' +
          '</div>' +
          '<a class="btn btn--primary" href="#/apuntes/subir">+ Subir apunte</a>' +
        '</div>';
    }

    html += s.subjects.map(tarjetaAsignatura).join('');

    vista.innerHTML = html;
  }

  function tarjetaAsignatura(asignatura) {
    var apuntes = state().notes.filter(function (n) { return n.subject_id === asignatura.id; });

    var cuerpo = apuntes.length
      ? '<div class="note-list">' + apuntes.map(filaApunte).join('') + '</div>'
      : '<p class="subject-card__empty">Todavía no hay apuntes en esta asignatura.</p>';

    return (
      '<article class="subject-card">' +
        '<div class="subject-card__head">' +
          '<h3 class="subject-card__name">' + Studdy.escapeHtml(asignatura.name) + '</h3>' +
          '<span class="subject-card__count">' + apuntes.length +
            (apuntes.length === 1 ? ' apunte' : ' apuntes') + '</span>' +
        '</div>' +
        cuerpo +
      '</article>'
    );
  }

  function filaApunte(apunte) {
    return (
      '<a class="note-item" href="#/apuntes/' + apunte.id + '">' +
        '<span class="note-item__icon">' + ICONO_APUNTE + '</span>' +
        '<span class="note-item__body">' +
          '<span class="note-item__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</span>' +
          '<span class="note-item__meta">' + Studdy.formatDate(apunte.created_at) + '</span>' +
        '</span>' +
        '<span class="note-item__chevron">' + ICONO_CHEVRON + '</span>' +
      '</a>'
    );
  }

  // ------------------------------------------------------------------------
  // Subir apunte
  // ------------------------------------------------------------------------

  function renderSubida(vista) {
    var s = state();

    vista.innerHTML =
      volver('#/apuntes', 'Apuntes') +
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">Subir un apunte</h1>' +
        '<p class="page-head__sub">Sube un PDF o pega el texto. La IA generará el ' +
          'esquema ajustado a ' + Studdy.escapeHtml(Studdy.app.describeLevel(s.profile)) + '.</p>' +
      '</div></div>' +

      '<div class="block">' +
        '<label class="field" style="margin-bottom:24px;display:block">' +
          '<span class="field__label">Asignatura</span>' +
          '<select class="select" id="subject">' +
            '<option value="" disabled hidden selected>Selecciona una asignatura</option>' +
            s.subjects.map(function (a) {
              return '<option value="' + a.id + '">' + Studdy.escapeHtml(a.name) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<div class="dropzone" id="dropzone" role="button" tabindex="0">' +
          '<div class="dropzone__icon">' + ICONO_SUBIR + '</div>' +
          '<p class="dropzone__title">Arrastra un PDF aquí o haz clic para elegirlo</p>' +
          '<p class="dropzone__hint">Solo archivos PDF</p>' +
        '</div>' +
        '<input type="file" id="file" accept="application/pdf,.pdf" hidden>' +

        '<div class="file-pill" id="file-pill">' +
          ICONO_ARCHIVO +
          '<span class="file-pill__name" id="file-name"></span>' +
          '<button class="chip__remove" type="button" id="file-clear" aria-label="Quitar archivo">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
            '<path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +

        '<div class="divider-or">o pega el texto</div>' +

        '<label class="field">' +
          '<span class="visually-hidden">Texto del apunte</span>' +
          '<textarea class="textarea" id="text"></textarea>' +
        '</label>' +
      '</div>' +

      '<div id="upload-error"></div>' +
      '<button class="btn btn--primary btn--lg" id="submit" disabled>Subir y generar esquema</button>';

    conectarSubida(vista);
  }

  function conectarSubida(vista) {
    var dropzone = Studdy.$('#dropzone', vista);
    var inputArchivo = Studdy.$('#file', vista);
    var pill = Studdy.$('#file-pill', vista);
    var nombreArchivo = Studdy.$('#file-name', vista);
    var limpiar = Studdy.$('#file-clear', vista);
    var textarea = Studdy.$('#text', vista);
    var select = Studdy.$('#subject', vista);
    var boton = Studdy.$('#submit', vista);
    var error = Studdy.$('#upload-error', vista);

    var archivo = null;

    function revisar() {
      boton.disabled = !(select.value && (archivo || textarea.value.trim()));
    }

    function ponerArchivo(f) {
      if (!f) return;
      if (f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
        error.innerHTML = Studdy.errorHtml('Solo se admiten archivos PDF.');
        return;
      }
      error.innerHTML = '';
      archivo = f;
      nombreArchivo.textContent = f.name;
      pill.classList.add('is-shown');
      revisar();
    }

    dropzone.addEventListener('click', function () { inputArchivo.click(); });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputArchivo.click(); }
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add('is-over');
      });
    });

    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.remove('is-over');
      });
    });

    dropzone.addEventListener('drop', function (e) {
      ponerArchivo(e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    inputArchivo.addEventListener('change', function () {
      ponerArchivo(inputArchivo.files && inputArchivo.files[0]);
    });

    limpiar.addEventListener('click', function () {
      archivo = null;
      inputArchivo.value = '';
      pill.classList.remove('is-shown');
      revisar();
    });

    textarea.addEventListener('input', revisar);
    select.addEventListener('change', revisar);

    boton.addEventListener('click', function () {
      error.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Procesando…';

      subir(archivo, textarea.value.trim(), select.value, boton)
        .catch(function (err) {
          error.innerHTML = Studdy.errorHtml(err.message);
          boton.disabled = false;
          boton.textContent = 'Subir y generar esquema';
        });
    });
  }

  async function subir(archivo, textoPegado, subjectId, boton) {
    var contenido = textoPegado;

    if (archivo) {
      boton.innerHTML = '<span class="spinner"></span> Leyendo el PDF…';
      contenido = await extraerTextoPdf(archivo);
      if (!contenido.trim()) {
        throw new Error(
          'No se ha podido extraer texto de ese PDF. Puede ser un PDF escaneado ' +
          '(imágenes en lugar de texto). Prueba a pegar el texto directamente.'
        );
      }
    }

    if (!contenido.trim()) throw new Error('Añade un PDF o pega el texto del apunte.');

    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    boton.innerHTML = '<span class="spinner"></span> Guardando el apunte…';

    var insercion = await client
      .from('notes')
      .insert({ profile_id: user.id, subject_id: subjectId, content: contenido })
      .select()
      .single();

    if (insercion.error) throw new Error(insercion.error.message);
    var apunte = insercion.data;

    // El esquema se genera aquí mismo; si la IA falla, el apunte ya está a
    // salvo y se puede reintentar desde su ficha.
    boton.innerHTML = '<span class="spinner"></span> Generando el esquema…';
    try {
      await generarEsquema(apunte);
    } catch (err) {
      await Studdy.app.reloadNotes();
      Studdy.app.navigate('#/apuntes/' + apunte.id);
      return;
    }

    await Studdy.app.reloadNotes();
    Studdy.app.navigate('#/apuntes/' + apunte.id);
  }

  // Extrae el texto de un PDF en el navegador con pdf.js.
  async function extraerTextoPdf(archivo) {
    if (!window.pdfjsLib) throw new Error('No se ha podido cargar el lector de PDF.');

    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    var datos = await archivo.arrayBuffer();
    var pdf = await window.pdfjsLib.getDocument({ data: datos }).promise;
    var partes = [];

    for (var i = 1; i <= pdf.numPages; i++) {
      var pagina = await pdf.getPage(i);
      var contenido = await pagina.getTextContent();
      var texto = '';
      contenido.items.forEach(function (item) {
        texto += item.str;
        texto += item.hasEOL ? '\n' : ' ';
      });
      partes.push(texto.replace(/[ \t]+/g, ' ').trim());
    }

    return partes.join('\n\n').trim();
  }

  // ------------------------------------------------------------------------
  // Ficha del apunte + esquema
  // ------------------------------------------------------------------------

  async function renderDetalle(vista, noteId) {
    var apunte = Studdy.app.findNote(noteId);
    if (!apunte) {
      vista.innerHTML = volver('#/apuntes', 'Apuntes') +
        Studdy.errorHtml('Ese apunte no existe o ya no está disponible.');
      return;
    }

    var client = await Studdy.getClient();
    var res = await client
      .from('summaries')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (res.error) throw new Error(res.error.message);
    var esquema = (res.data || [])[0] || null;

    vista.innerHTML =
      volver('#/apuntes', 'Apuntes') +
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">' + Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</h1>' +
        '<p class="page-head__sub">' +
          Studdy.escapeHtml(Studdy.app.subjectName(apunte.subject_id)) + ' · ' +
          Studdy.formatDate(apunte.created_at) +
        '</p>' +
      '</div></div>' +

      '<div class="block" id="summary-block">' +
        (esquema
          ? '<div class="prose">' + Studdy.renderMarkdown(esquema.generated_content) + '</div>'
          : bloqueSinEsquema()) +
      '</div>' +

      '<div class="block">' +
        '<h2 class="block__title" style="margin-bottom:14px">Trabaja este apunte</h2>' +
        '<div class="action-row">' +
          '<a class="btn btn--soft" href="#/flashcards/' + apunte.id + '">Generar flashcards</a>' +
          '<a class="btn btn--soft" href="#/examenes/' + apunte.id + '">Generar examen</a>' +
          '<button class="btn btn--soft" id="gen-pres">Generar presentación</button>' +
        '</div>' +
        '<div id="pres-error" style="margin-top:14px"></div>' +
      '</div>' +

      '<div class="block">' +
        '<details class="disclosure" style="border-top:0;padding-top:0">' +
          '<summary>Ver el texto original del apunte</summary>' +
          '<div class="disclosure__body"><div class="note-source">' +
            Studdy.escapeHtml(apunte.content) +
          '</div></div>' +
        '</details>' +
      '</div>';

    conectarEsquema(vista, apunte);

    Studdy.$('#gen-pres', vista).addEventListener('click', function () {
      var boton = this;
      var error = Studdy.$('#pres-error', vista);
      error.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      Studdy.views.presentations.generarDesdeApunte(apunte)
        .then(function (id) { Studdy.app.navigate('#/presentaciones/' + id); })
        .catch(function (err) {
          error.innerHTML = Studdy.errorHtml(err.message);
          boton.disabled = false;
          boton.textContent = 'Generar presentación';
        });
    });
  }

  // Deja listo el botón de generar esquema. Se vuelve a llamar tras un fallo,
  // porque al repintar el bloque se pierde el listener anterior.
  function conectarEsquema(vista, apunte) {
    var boton = Studdy.$('#gen-summary', vista);
    if (!boton) return;

    boton.addEventListener('click', function () {
      var bloque = Studdy.$('#summary-block', vista);
      bloque.innerHTML = Studdy.loadingHtml('Generando el esquema…');

      generarEsquema(apunte)
        .then(function (texto) {
          bloque.innerHTML = '<div class="prose">' + Studdy.renderMarkdown(texto) + '</div>';
        })
        .catch(function (err) {
          bloque.innerHTML = bloqueSinEsquema() + Studdy.errorHtml(err.message);
          conectarEsquema(vista, apunte);
        });
    });
  }

  function bloqueSinEsquema() {
    return (
      '<div class="block__head"><h2 class="block__title">Esquema</h2></div>' +
      '<p style="color:var(--ink-3);font-size:15px;margin-bottom:18px">' +
        'Este apunte todavía no tiene esquema.</p>' +
      '<button class="btn btn--primary" id="gen-summary">Generar esquema</button>'
    );
  }

  // Genera el esquema con la IA y lo guarda en `summaries`.
  async function generarEsquema(apunte) {
    var respuesta = await Studdy.ai('summary', {
      content: apunte.content,
      subject: Studdy.app.subjectName(apunte.subject_id),
    });

    var client = await Studdy.getClient();
    var out = await client
      .from('summaries')
      .insert({ note_id: apunte.id, generated_content: respuesta.summary });

    if (out.error) throw new Error(out.error.message);
    return respuesta.summary;
  }

  // ------------------------------------------------------------------------

  function volver(href, texto) {
    return '<a class="back-link" href="' + href + '">' + ICONO_ATRAS +
      Studdy.escapeHtml(texto) + '</a>';
  }

  var ICONO_APUNTE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/>' +
    '<path d="M14 2.5v5h5M8.5 13h7M8.5 17h4.5"/></svg>';

  var ICONO_CHEVRON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  var ICONO_ATRAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';

  var ICONO_SUBIR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7.5 8.5 12 4l4.5 4.5"/>' +
    '<path d="M3.5 15v3.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V15"/></svg>';

  var ICONO_ARCHIVO =
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="flex:none">' +
    '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z"/>' +
    '<path d="M14 2.5v5h5"/></svg>';

  return {
    render: render,
    volver: volver,
    iconoAtras: ICONO_ATRAS,
  };
})();
