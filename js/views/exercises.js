/* ==========================================================================
   Ejercicios resueltos paso a paso.
   Puedes escribir el enunciado, hacerle una foto, o las dos cosas.
   ========================================================================== */

Studdy.views.exercises = (function () {
  'use strict';

  var MAX_LADO = 1600;   // px: la foto se reduce antes de enviarla
  var MAX_BYTES = 4500000;

  async function render(vista, partes) {
    if (partes[0]) return renderDetalle(vista, partes[0]);
    return renderInicio(vista);
  }

  // ------------------------------------------------------------------------

  async function renderInicio(vista) {
    vista.innerHTML =
      Studdy.app.volver('#/inicio', 'Inicio') +
      Studdy.app.cabecera('Resolver un ejercicio',
        'Te lo explico paso a paso, no solo el resultado.') +

      '<div class="block">' +
        '<label class="field" style="display:block;margin-bottom:16px">' +
          '<span class="field__label">Asignatura (opcional)</span>' +
          '<select class="select" id="subject">' +
            '<option value="">Sin asignatura</option>' +
            Studdy.app.state.subjects.map(function (a) {
              return '<option value="' + a.id + '">' + Studdy.escapeHtml(a.name) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +

        '<label class="field" style="display:block;margin-bottom:16px">' +
          '<span class="field__label">Enunciado</span>' +
          '<textarea class="textarea" id="prompt" style="min-height:120px"></textarea>' +
        '</label>' +

        '<div class="photo-drop" id="drop" role="button" tabindex="0">' +
          '<div class="dropzone__icon">' + Studdy.icons.subir + '</div>' +
          '<p class="dropzone__title">Hazle una foto al ejercicio</p>' +
          '<p class="dropzone__hint">O súbela desde la galería</p>' +
        '</div>' +
        '<input type="file" id="file" accept="image/*" hidden>' +

        '<div class="photo-preview" id="preview">' +
          '<img id="img" alt="Foto del ejercicio">' +
          '<button class="photo-preview__x" id="quitar" aria-label="Quitar foto">' +
            Studdy.icons.cerrar + '</button>' +
        '</div>' +
      '</div>' +

      '<div id="err"></div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="resolver" disabled>Resolver</button>' +
      '<div id="salida" style="margin-top:18px"></div>' +
      '<div id="historial" style="margin-top:8px"></div>';

    conectar(vista);
    pintarHistorial(vista);
  }

  function conectar(vista) {
    var drop = Studdy.$('#drop', vista);
    var file = Studdy.$('#file', vista);
    var preview = Studdy.$('#preview', vista);
    var img = Studdy.$('#img', vista);
    var quitar = Studdy.$('#quitar', vista);
    var prompt = Studdy.$('#prompt', vista);
    var boton = Studdy.$('#resolver', vista);
    var err = Studdy.$('#err', vista);

    var imagen = null;

    function revisar() { boton.disabled = !(prompt.value.trim() || imagen); }

    drop.addEventListener('click', function () { file.click(); });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); }
    });

    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) tomar(e.dataTransfer.files[0]);
    });

    file.addEventListener('change', function () {
      if (file.files && file.files[0]) tomar(file.files[0]);
    });

    quitar.addEventListener('click', function () {
      imagen = null;
      file.value = '';
      preview.classList.remove('is-shown');
      revisar();
    });

    prompt.addEventListener('input', revisar);

    function tomar(f) {
      if (!/^image\//.test(f.type)) {
        err.innerHTML = Studdy.errorHtml('Eso no es una imagen.');
        return;
      }
      err.innerHTML = '';

      reducir(f)
        .then(function (out) {
          imagen = out;
          img.src = 'data:' + out.media_type + ';base64,' + out.data;
          preview.classList.add('is-shown');
          revisar();
        })
        .catch(function (e) { err.innerHTML = Studdy.errorHtml(e.message); });
    }

    boton.addEventListener('click', function () {
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Resolviendo…';

      var salida = Studdy.$('#salida', vista);
      salida.innerHTML = Studdy.loadingHtml('Leyendo el ejercicio…');

      var subjectId = Studdy.$('#subject', vista).value || null;

      resolver(prompt.value.trim(), imagen, subjectId)
        .then(function (solucion) {
          salida.innerHTML = '<div class="block"><div class="prose">' +
            Studdy.renderMarkdown(solucion) + '</div></div>';
          salida.scrollIntoView({ behavior: 'smooth', block: 'start' });
          pintarHistorial(vista);
        })
        .catch(function (e) {
          salida.innerHTML = '';
          err.innerHTML = Studdy.errorHtml(e.message);
        })
        .then(function () {
          boton.disabled = false;
          boton.textContent = 'Resolver';
        });
    });
  }

  // Reduce la foto antes de mandarla: una foto de móvil sin tocar puede pesar
  // varios megas y no hace falta tanta resolución para leer un enunciado.
  function reducir(archivo) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();

      lector.onerror = function () { reject(new Error('No se ha podido leer la imagen.')); };

      lector.onload = function () {
        var img = new Image();

        img.onerror = function () { reject(new Error('No se ha podido abrir la imagen.')); };

        img.onload = function () {
          var escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
          var lienzo = document.createElement('canvas');
          lienzo.width = Math.round(img.width * escala);
          lienzo.height = Math.round(img.height * escala);
          lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);

          var url = lienzo.toDataURL('image/jpeg', 0.82);
          var base64 = url.split(',')[1];

          if (base64.length * 0.75 > MAX_BYTES) {
            reject(new Error('La foto pesa demasiado. Prueba con una más pequeña.'));
            return;
          }

          resolve({ media_type: 'image/jpeg', data: base64 });
        };

        img.src = lector.result;
      };

      lector.readAsDataURL(archivo);
    });
  }

  async function resolver(enunciado, imagen, subjectId) {
    var carga = { prompt: enunciado };
    if (imagen) carga.image = imagen;
    if (subjectId) carga.subject = Studdy.app.subjectName(subjectId);

    var r = await Studdy.ai('exercise', carga);

    // Se guarda el enunciado escrito, no la foto: en Storage tendríamos que
    // gestionar archivos y esta versión no lo necesita.
    try {
      var client = await Studdy.getClient();
      var userRes = await client.auth.getUser();
      var user = userRes.data ? userRes.data.user : null;
      if (user) {
        await client.from('exercises').insert({
          profile_id: user.id,
          subject_id: subjectId,
          prompt: enunciado || '(ejercicio en foto)',
          solution: r.solution,
        });
      }
    } catch (e) { /* el historial es un extra, no bloquea la respuesta */ }

    return r.solution;
  }

  // ------------------------------------------------------------------------

  async function pintarHistorial(vista) {
    var caja = Studdy.$('#historial', vista);
    if (!caja) return;

    var client = await Studdy.getClient();
    var out = await client
      .from('exercises')
      .select('id, prompt, subject_id, created_at')
      .order('created_at', { ascending: false })
      .limit(15);

    if (out.error || !out.data || !out.data.length) {
      caja.innerHTML = '';
      return;
    }

    caja.innerHTML = '<p class="section-title">Ya resueltos</p><div class="note-list">' +
      out.data.map(function (e) {
        var color = e.subject_id ? Studdy.app.subjectColor(e.subject_id) : 'sc-0';
        return '<a class="note-card ' + color + '" href="#/ejercicios/' + e.id + '">' +
          '<span class="note-card__spine"></span>' +
          '<span class="note-card__body">' +
            (e.subject_id
              ? '<span class="note-card__subject">' +
                  Studdy.escapeHtml(Studdy.app.subjectName(e.subject_id)) + '</span>'
              : '') +
            '<span class="note-card__title">' + Studdy.escapeHtml(recorta(e.prompt)) + '</span>' +
            '<span class="note-card__meta"><span class="pill">' +
              Studdy.formatDate(e.created_at) + '</span></span>' +
          '</span></a>';
      }).join('') + '</div>';
  }

  function recorta(texto) {
    var t = String(texto || '').trim().replace(/\s+/g, ' ');
    return t.length > 80 ? t.slice(0, 80) + '…' : t;
  }

  async function renderDetalle(vista, id) {
    var client = await Studdy.getClient();
    var out = await client.from('exercises').select('*').eq('id', id).maybeSingle();
    if (out.error) throw new Error(out.error.message);

    if (!out.data) {
      vista.innerHTML = Studdy.app.volver('#/ejercicios', 'Ejercicios') +
        Studdy.errorHtml('Ese ejercicio ya no está disponible.');
      return;
    }

    var e = out.data;

    vista.innerHTML =
      Studdy.app.volver('#/ejercicios', 'Ejercicios') +
      Studdy.app.cabecera('Ejercicio resuelto',
        [e.subject_id ? Studdy.app.subjectName(e.subject_id) : null,
         Studdy.formatDate(e.created_at)].filter(Boolean).join(' · ')) +
      '<div class="block">' +
        '<div class="block__head"><h2 class="block__title">Enunciado</h2></div>' +
        '<div class="note-source">' + Studdy.escapeHtml(e.prompt) + '</div>' +
      '</div>' +
      '<div class="block"><div class="prose">' +
        Studdy.renderMarkdown(e.solution) + '</div></div>';
  }

  return { render: render };
})();
