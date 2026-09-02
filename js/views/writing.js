/* ==========================================================================
   Trabajos y redacciones.

   Tres modos sobre el mismo documento: montar el guion, escribir un borrador
   y revisar lo que ya has escrito. El texto es tuyo y se guarda en Supabase;
   la IA propone, no sustituye.
   ========================================================================== */

Studdy.views.writing = (function () {
  'use strict';

  var MODOS = [
    { id: 'guion', etiqueta: 'Guion', accion: 'Montar el guion' },
    { id: 'borrador', etiqueta: 'Borrador', accion: 'Escribir un borrador' },
    { id: 'revision', etiqueta: 'Revisión', accion: 'Revisar lo escrito' },
  ];

  async function render(vista, partes) {
    if (partes[0] === 'nuevo') return renderNuevo(vista);
    if (partes[0]) return renderEditor(vista, partes[0]);
    return renderLista(vista);
  }

  // ------------------------------------------------------------------------

  async function renderLista(vista) {
    vista.innerHTML = Studdy.loadingHtml('Cargando tus trabajos…');

    var client = await Studdy.getClient();
    var out = await client
      .from('documents')
      .select('id, title, subject_id, updated_at')
      .order('updated_at', { ascending: false });

    if (out.error) {
      vista.innerHTML = Studdy.app.volver('#/inicio', 'Inicio') +
        Studdy.app.cabecera('Trabajos') + Studdy.errorHtml(traducir(out.error.message));
      return;
    }

    var docs = out.data || [];

    var html = Studdy.app.volver('#/inicio', 'Inicio') +
      Studdy.app.cabecera('Trabajos', 'Guion, borrador y revisión de tus redacciones',
        '<a class="btn btn--primary btn--sm" href="#/trabajos/nuevo">+ Nuevo</a>');

    if (!docs.length) {
      html += '<div class="empty">' +
        '<div class="empty__icon">' + Studdy.icons.apunte + '</div>' +
        '<p class="empty__title">No tienes ningún trabajo</p>' +
        '<p class="empty__text">Dime de qué va y qué te piden, y montamos el guion ' +
          'antes de ponerte a escribir.</p>' +
        '<a class="btn btn--primary" href="#/trabajos/nuevo">Empezar uno</a>' +
        '</div>';
    } else {
      html += '<div class="note-list">' + docs.map(function (d) {
        var color = d.subject_id ? Studdy.app.subjectColor(d.subject_id) : 'sc-3';
        return '<a class="note-card ' + color + '" href="#/trabajos/' + d.id + '">' +
          '<span class="note-card__spine"></span>' +
          '<span class="note-card__body">' +
            (d.subject_id
              ? '<span class="note-card__subject">' +
                  Studdy.escapeHtml(Studdy.app.subjectName(d.subject_id)) + '</span>'
              : '') +
            '<span class="note-card__title">' + Studdy.escapeHtml(d.title) + '</span>' +
            '<span class="note-card__meta"><span class="pill">Editado ' +
              Studdy.formatDate(d.updated_at) + '</span></span>' +
          '</span></a>';
      }).join('') + '</div>';
    }

    vista.innerHTML = html;
  }

  // ------------------------------------------------------------------------

  function renderNuevo(vista) {
    vista.innerHTML =
      Studdy.app.volver('#/trabajos', 'Trabajos') +
      Studdy.app.cabecera('Nuevo trabajo') +
      '<div class="block">' +
        '<label class="field" style="display:block;margin-bottom:18px">' +
          '<span class="field__label">¿Sobre qué es?</span>' +
          '<input class="input" type="text" id="title" maxlength="160" spellcheck="false">' +
        '</label>' +
        '<label class="field" style="display:block;margin-bottom:18px">' +
          '<span class="field__label">Asignatura (opcional)</span>' +
          '<select class="select" id="subject">' +
            '<option value="">Sin asignatura</option>' +
            Studdy.app.state.subjects.map(function (a) {
              return '<option value="' + a.id + '">' + Studdy.escapeHtml(a.name) + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<label class="field" style="display:block">' +
          '<span class="field__label">¿Qué pide el profesor?</span>' +
          '<textarea class="textarea" id="req" style="min-height:110px"></textarea>' +
        '</label>' +
      '</div>' +
      '<div id="err"></div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="crear" disabled>Crear</button>';

    var titulo = Studdy.$('#title', vista);
    var boton = Studdy.$('#crear', vista);
    var err = Studdy.$('#err', vista);

    titulo.addEventListener('input', function () { boton.disabled = !titulo.value.trim(); });

    boton.addEventListener('click', function () {
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Creando…';

      crear({
        title: titulo.value.trim(),
        subject_id: Studdy.$('#subject', vista).value || null,
        requirements: Studdy.$('#req', vista).value.trim() || null,
      })
        .then(function (id) { Studdy.app.navigate('#/trabajos/' + id); })
        .catch(function (e) {
          err.innerHTML = Studdy.errorHtml(traducir(e.message));
          boton.disabled = false;
          boton.textContent = 'Crear';
        });
    });

    titulo.focus();
  }

  // ------------------------------------------------------------------------

  async function renderEditor(vista, id) {
    var client = await Studdy.getClient();
    var out = await client.from('documents').select('*').eq('id', id).maybeSingle();
    if (out.error) throw new Error(traducir(out.error.message));

    if (!out.data) {
      vista.innerHTML = Studdy.app.volver('#/trabajos', 'Trabajos') +
        Studdy.errorHtml('Ese trabajo ya no está disponible.');
      return;
    }

    var doc = out.data;

    vista.innerHTML =
      Studdy.app.volver('#/trabajos', 'Trabajos') +
      Studdy.app.cabecera(doc.title,
        [doc.subject_id ? Studdy.app.subjectName(doc.subject_id) : null,
         doc.requirements ? 'con instrucciones' : null].filter(Boolean).join(' · ')) +

      '<div class="seg" id="modos">' +
        MODOS.map(function (m, i) {
          return '<button type="button" data-modo="' + m.id + '"' +
            (i === 0 ? ' class="is-on"' : '') + '>' + m.etiqueta + '</button>';
        }).join('') +
      '</div>' +

      '<button class="btn btn--primary btn--block" id="pedir">Montar el guion</button>' +
      '<div id="err" style="margin-top:14px"></div>' +
      '<div id="salida" style="margin-top:16px"></div>' +

      '<div class="block" style="margin-top:18px">' +
        '<div class="block__head">' +
          '<h2 class="block__title">Tu texto</h2>' +
          '<span id="estado" style="font-size:13px;color:var(--ink-3)"></span>' +
        '</div>' +
        '<textarea class="textarea" id="texto" style="min-height:240px"></textarea>' +
        '<button class="btn btn--soft btn--sm" id="guardar" style="margin-top:12px">Guardar</button>' +
      '</div>';

    var texto = Studdy.$('#texto', vista);
    texto.value = doc.content || '';

    var modo = 'guion';
    var pedir = Studdy.$('#pedir', vista);
    var err = Studdy.$('#err', vista);
    var salida = Studdy.$('#salida', vista);
    var estado = Studdy.$('#estado', vista);

    Studdy.$('#modos', vista).addEventListener('click', function (e) {
      var b = e.target.closest('[data-modo]');
      if (!b) return;
      modo = b.dataset.modo;
      Studdy.$$('[data-modo]', vista).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      pedir.textContent = MODOS.filter(function (m) { return m.id === modo; })[0].accion;
    });

    pedir.addEventListener('click', function () {
      err.innerHTML = '';
      pedir.disabled = true;
      var etiqueta = pedir.textContent;
      pedir.innerHTML = '<span class="spinner"></span> Trabajando…';
      salida.innerHTML = Studdy.loadingHtml('La IA está con ello…');

      Studdy.ai('writing', {
        mode: modo,
        title: doc.title,
        requirements: doc.requirements,
        content: texto.value.trim(),
        subject: doc.subject_id ? Studdy.app.subjectName(doc.subject_id) : '',
      })
        .then(function (r) {
          salida.innerHTML =
            '<div class="block"><div class="prose">' + Studdy.renderMarkdown(r.result) + '</div>' +
            (modo === 'revision' ? '' :
              '<div class="action-row" style="margin-top:16px">' +
                '<button class="btn btn--soft btn--sm" id="volcar">Pasarlo a mi texto</button>' +
              '</div>') +
            '</div>';

          var volcar = Studdy.$('#volcar', salida);
          if (volcar) {
            volcar.addEventListener('click', function () {
              texto.value = texto.value.trim()
                ? texto.value.trim() + '\n\n' + r.result
                : r.result;
              estado.textContent = 'Sin guardar';
              texto.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
          }
        })
        .catch(function (e) {
          salida.innerHTML = '';
          err.innerHTML = Studdy.errorHtml(e.message);
        })
        .then(function () {
          pedir.disabled = false;
          pedir.textContent = etiqueta;
        });
    });

    texto.addEventListener('input', function () { estado.textContent = 'Sin guardar'; });

    Studdy.$('#guardar', vista).addEventListener('click', function () {
      var boton = this;
      boton.disabled = true;
      estado.textContent = 'Guardando…';

      guardar(id, texto.value)
        .then(function () { estado.textContent = 'Guardado'; })
        .catch(function (e) { estado.textContent = ''; err.innerHTML = Studdy.errorHtml(e.message); })
        .then(function () { boton.disabled = false; });
    });
  }

  // ------------------------------------------------------------------------

  async function crear(fila) {
    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    fila.profile_id = user.id;
    var out = await client.from('documents').insert(fila).select('id').single();
    if (out.error) throw new Error(out.error.message);
    return out.data.id;
  }

  async function guardar(id, contenido) {
    var client = await Studdy.getClient();
    var out = await client
      .from('documents')
      .update({ content: contenido, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (out.error) throw new Error(out.error.message);
  }

  function traducir(mensaje) {
    if (/relation .* does not exist/i.test(mensaje || '')) {
      return 'Falta la tabla de trabajos. Ejecuta supabase/migracion-02-funciones.sql en Supabase.';
    }
    return mensaje;
  }

  return { render: render };
})();
