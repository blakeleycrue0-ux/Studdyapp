/* ==========================================================================
   Apuntes: listado (con filtro por asignatura) y subida de nuevos apuntes.
   La ficha de cada apunte vive en notebook.js.
   ========================================================================== */

Studdy.views.notes = (function () {
  'use strict';

  function render(vista, partes) {
    if (partes[0] === 'subir') return renderSubida(vista);
    if (partes[0] === 'tema') return Studdy.views.presentations.renderTopic(vista);
    if (partes[0] === 'asignatura') return renderLista(vista, partes[1] || null);
    return renderLista(vista, null);
  }

  // ------------------------------------------------------------------------
  // Listado
  // ------------------------------------------------------------------------

  function renderLista(vista, subjectId) {
    var app = Studdy.app;
    var s = app.state;

    var apuntes = subjectId ? app.notesOfSubject(subjectId) : s.notes;

    var boton = '<a class="btn btn--primary btn--sm" href="#/apuntes/subir">+ Subir</a>';

    var html = app.cabecera(
      'Apuntes',
      s.notes.length + (s.notes.length === 1 ? ' apunte guardado' : ' apuntes guardados'),
      boton
    );

    // Filtro por asignatura
    if (s.subjects.length > 1) {
      html += '<div class="chips-row">' +
        '<a class="filter-chip' + (subjectId ? '' : ' is-on') + '" href="#/apuntes">Todas</a>' +
        s.subjects.map(function (a) {
          return '<a class="filter-chip' + (subjectId === a.id ? ' is-on' : '') + '" ' +
            'href="#/apuntes/asignatura/' + a.id + '">' + Studdy.escapeHtml(a.name) + '</a>';
        }).join('') +
        '</div>';
    }

    if (!apuntes.length) {
      html += '<div class="empty">' +
        '<div class="empty__icon">' + Studdy.icons.apunte + '</div>' +
        '<p class="empty__title">' +
          (subjectId ? 'Nada en esta asignatura todavía' : 'Aún no tienes apuntes') + '</p>' +
        '<p class="empty__text">Sube un PDF o pega el texto de un tema y la IA te dará ' +
          'su esquema, escrito para tu curso.</p>' +
        '<a class="btn btn--primary" href="#/apuntes/subir">Subir un apunte</a>' +
        '</div>';
      vista.innerHTML = html;
      return;
    }

    html += '<div class="note-list stagger">' + apuntes.map(tarjeta).join('') + '</div>';
    vista.innerHTML = html;
  }

  function tarjeta(apunte) {
    var app = Studdy.app;
    var c = app.countsFor(apunte.id);

    var etiquetas = [
      c.summary ? tag(Studdy.icons.esquema, 'Esquema') : null,
      c.flashcards ? tag(Studdy.icons.flashcards, c.flashcards + ' tarjetas') : null,
      c.exams ? tag(Studdy.icons.examen, 'Examen') : null,
      c.presentations ? tag(Studdy.icons.presentacion, 'Presentación') : null,
    ].filter(Boolean);

    if (!etiquetas.length) etiquetas = ['<span class="tag">Sin generar nada aún</span>'];

    return (
      '<a class="note-card ' + app.subjectColor(apunte.subject_id) + '" href="#/n/' + apunte.id + '">' +
        '<span class="tile">' + Studdy.icons.apunte + '</span>' +
        '<span class="note-card__body">' +
          '<span class="note-card__subject">' +
            Studdy.escapeHtml(app.subjectName(apunte.subject_id)) + '</span>' +
          '<span class="note-card__title">' +
            Studdy.escapeHtml(Studdy.noteTitle(apunte.content)) + '</span>' +
          '<span class="note-card__meta">' + etiquetas.join('') + '</span>' +
        '</span>' +
      '</a>'
    );
  }

  function tag(icono, texto) {
    return '<span class="tag tag--on">' + icono + Studdy.escapeHtml(texto) + '</span>';
  }

  // ------------------------------------------------------------------------
  // Subir apunte
  // ------------------------------------------------------------------------

  function renderSubida(vista) {
    var app = Studdy.app;
    var s = app.state;

    vista.innerHTML =
      app.volver('#/apuntes', 'Apuntes') +
      app.cabecera('Subir un apunte',
        'La IA generará el esquema para ' + app.describeLevel(s.profile) + '.') +

      '<div class="block">' +
        '<label class="field" style="margin-bottom:20px;display:block">' +
          '<span class="field__label">Asignatura</span>' +
          '<select class="select" id="subject">' +
            '<option value="" disabled hidden selected>Selecciona una asignatura</option>' +
            s.subjects.map(function (a) {
              return '<option value="' + a.id + '">' + Studdy.escapeHtml(a.name) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<div class="dropzone" id="dropzone" role="button" tabindex="0">' +
          '<div class="dropzone__icon">' + Studdy.icons.subir + '</div>' +
          '<p class="dropzone__title">Toca para elegir un PDF</p>' +
          '<p class="dropzone__hint">O arrástralo aquí</p>' +
        '</div>' +
        '<input type="file" id="file" accept="application/pdf,.pdf" hidden>' +

        '<div class="file-pill" id="file-pill">' +
          Studdy.icons.apunte +
          '<span class="file-pill__name" id="file-name"></span>' +
          '<button class="chip__remove" type="button" id="file-clear" aria-label="Quitar archivo">' +
            Studdy.icons.cerrar +
          '</button>' +
        '</div>' +

        '<div class="divider-or">o pega el texto</div>' +

        '<label class="field">' +
          '<span class="visually-hidden">Texto del apunte</span>' +
          '<textarea class="textarea" id="text"></textarea>' +
        '</label>' +
      '</div>' +

      '<div id="upload-error"></div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="submit" disabled>' +
        'Subir y generar esquema</button>';

    conectarSubida(vista);
  }

  function conectarSubida(vista) {
    var dropzone = Studdy.$('#dropzone', vista);
    var inputArchivo = Studdy.$('#file', vista);
    var pillArchivo = Studdy.$('#file-pill', vista);
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
      pillArchivo.classList.add('is-shown');
      revisar();
    }

    dropzone.addEventListener('click', function () { inputArchivo.click(); });
    dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputArchivo.click(); }
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.remove('is-over'); });
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
      pillArchivo.classList.remove('is-shown');
      revisar();
    });

    textarea.addEventListener('input', revisar);
    select.addEventListener('change', revisar);

    boton.addEventListener('click', function () {
      error.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Procesando…';

      subir(archivo, textarea.value.trim(), select.value, boton).catch(function (err) {
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

    boton.innerHTML = '<span class="spinner"></span> Guardando…';

    var insercion = await client
      .from('notes')
      .insert({ profile_id: user.id, subject_id: subjectId, content: contenido })
      .select()
      .single();

    if (insercion.error) throw new Error(insercion.error.message);
    var apunte = insercion.data;

    // Si la IA falla el apunte ya está guardado: se abre igual y se puede
    // reintentar el esquema desde su propia ficha.
    boton.innerHTML = '<span class="spinner"></span> Generando el esquema…';
    try {
      await Studdy.views.notebook.generarEsquema(apunte);
    } catch (err) { /* se reintenta desde la ficha */ }

    await Studdy.app.reloadNotes();
    Studdy.app.rememberNote(apunte.id);
    Studdy.app.navigate('#/n/' + apunte.id);
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

  return { render: render };
})();
