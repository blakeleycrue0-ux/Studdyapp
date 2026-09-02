/* ==========================================================================
   Agenda: exámenes, entregas y otras fechas.
   Lo que hay aquí es lo que alimenta el aviso de "qué te viene encima" del
   Inicio y lo que decide qué conviene repasar antes.
   ========================================================================== */

Studdy.views.agenda = (function () {
  'use strict';

  var TIPOS = [
    { id: 'examen', etiqueta: 'Examen' },
    { id: 'entrega', etiqueta: 'Entrega' },
    { id: 'otro', etiqueta: 'Otro' },
  ];

  async function render(vista, partes) {
    if (partes[0] === 'nuevo') return renderForm(vista);

    vista.innerHTML = Studdy.loadingHtml('Cargando tu agenda…');

    var eventos = await cargar();

    var boton = '<a class="btn btn--primary btn--sm" href="#/agenda/nuevo">+ Añadir</a>';

    var html = Studdy.app.cabecera('Agenda', textoResumen(eventos), boton);

    if (!eventos.length) {
      html += '<div class="empty">' +
        '<div class="empty__icon">' + Studdy.icons.reloj + '</div>' +
        '<p class="empty__title">No tienes nada apuntado</p>' +
        '<p class="empty__text">Apunta tus exámenes y entregas y te aviso de lo que ' +
          'tienes cerca, con lo que deberías repasar.</p>' +
        '<a class="btn btn--primary" href="#/agenda/nuevo">Añadir el primero</a>' +
        '</div>';
      vista.innerHTML = html;
      return;
    }

    // Agrupados por día, los pendientes primero
    var pendientes = eventos.filter(function (e) { return !e.done; });
    var hechos = eventos.filter(function (e) { return e.done; });

    html += grupos(pendientes);

    if (hechos.length) {
      html += '<p class="section-title">Ya pasados</p>' + hechos.map(fila).join('');
    }

    vista.innerHTML = html;
    conectar(vista);
  }

  function textoResumen(eventos) {
    var proximos = eventos.filter(function (e) { return !e.done && dias(e.date) >= 0; });
    if (!proximos.length) return 'Nada pendiente';
    var d = dias(proximos[0].date);
    if (d === 0) return 'Tienes algo hoy';
    if (d === 1) return 'Lo próximo es mañana';
    return 'Lo próximo, en ' + d + ' días';
  }

  function grupos(eventos) {
    if (!eventos.length) return '<p style="color:var(--ink-3);font-size:14.5px">Nada pendiente.</p>';

    var porDia = {};
    eventos.forEach(function (e) {
      (porDia[e.date] = porDia[e.date] || []).push(e);
    });

    return Object.keys(porDia).sort().map(function (fecha) {
      return '<div class="agenda-day">' +
        '<div class="agenda-day__label">' + etiquetaDia(fecha) + '</div>' +
        porDia[fecha].map(fila).join('') +
        '</div>';
    }).join('');
  }

  function etiquetaDia(fecha) {
    var d = dias(fecha);
    if (d < 0) return 'Ya pasó · ' + formato(fecha);
    if (d === 0) return '<b>Hoy</b> · ' + formato(fecha);
    if (d === 1) return '<b>Mañana</b> · ' + formato(fecha);
    return formato(fecha) + ' · en ' + d + ' días';
  }

  function fila(e) {
    var asignatura = e.subject_id ? Studdy.app.subjectName(e.subject_id) : '';
    var d = dias(e.date);
    var cuenta = (!e.done && d >= 0 && d <= 7)
      ? '<span class="countdown">' + (d === 0 ? 'hoy' : d + 'd') + '</span>' : '';

    return (
      '<div class="event event--' + e.kind + (e.done ? ' is-done' : '') + '" data-id="' + e.id + '">' +
        '<button class="event__check" data-hecho="' + e.id + '" aria-label="Marcar como hecho">' +
          Studdy.icons.ok +
        '</button>' +
        '<div class="event__body">' +
          '<div class="event__kind">' + tipoEtiqueta(e.kind) + '</div>' +
          '<div class="event__title">' + Studdy.escapeHtml(e.title) + cuenta + '</div>' +
          '<div class="event__meta">' +
            [asignatura, e.notes].filter(Boolean).map(Studdy.escapeHtml).join(' · ') +
          '</div>' +
        '</div>' +
        '<button class="chip__remove" data-borrar="' + e.id + '" aria-label="Borrar">' +
          Studdy.icons.cerrar +
        '</button>' +
      '</div>'
    );
  }

  function tipoEtiqueta(id) {
    var t = TIPOS.filter(function (x) { return x.id === id; })[0];
    return t ? t.etiqueta : 'Otro';
  }

  // ------------------------------------------------------------------------

  function conectar(vista) {
    vista.addEventListener('click', function (e) {
      var hecho = e.target.closest('[data-hecho]');
      var borrar = e.target.closest('[data-borrar]');

      if (hecho) {
        var caja = hecho.closest('.event');
        var marcado = !caja.classList.contains('is-done');
        caja.classList.toggle('is-done', marcado);
        actualizar(hecho.dataset.hecho, { done: marcado }).catch(function () {
          caja.classList.toggle('is-done', !marcado);
        });
      }

      if (borrar) {
        var caja2 = borrar.closest('.event');
        caja2.style.opacity = '.4';
        eliminar(borrar.dataset.borrar)
          .then(function () { caja2.remove(); })
          .catch(function () { caja2.style.opacity = ''; });
      }
    });
  }

  // ------------------------------------------------------------------------
  // Alta
  // ------------------------------------------------------------------------

  function renderForm(vista) {
    var hoy = new Date().toISOString().slice(0, 10);

    vista.innerHTML =
      Studdy.app.volver('#/agenda', 'Agenda') +
      Studdy.app.cabecera('Añadir a la agenda') +
      '<div class="block">' +
        '<label class="field" style="display:block;margin-bottom:18px">' +
          '<span class="field__label">¿Qué es?</span>' +
          '<input class="input" type="text" id="title" maxlength="120" spellcheck="false">' +
        '</label>' +

        '<div class="seg" id="kind">' +
          TIPOS.map(function (t, i) {
            return '<button type="button" data-kind="' + t.id + '"' +
              (i === 0 ? ' class="is-on"' : '') + '>' + t.etiqueta + '</button>';
          }).join('') +
        '</div>' +

        '<label class="field" style="display:block;margin-bottom:18px">' +
          '<span class="field__label">Fecha</span>' +
          '<input class="input" type="date" id="date" min="' + hoy + '">' +
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
          '<span class="field__label">Notas (opcional)</span>' +
          '<textarea class="textarea" id="notes" style="min-height:90px"></textarea>' +
        '</label>' +
      '</div>' +
      '<div id="err"></div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="guardar" disabled>Guardar</button>';

    var titulo = Studdy.$('#title', vista);
    var fecha = Studdy.$('#date', vista);
    var boton = Studdy.$('#guardar', vista);
    var err = Studdy.$('#err', vista);
    var kind = 'examen';

    function revisar() { boton.disabled = !(titulo.value.trim() && fecha.value); }

    titulo.addEventListener('input', revisar);
    fecha.addEventListener('change', revisar);

    Studdy.$('#kind', vista).addEventListener('click', function (e) {
      var b = e.target.closest('[data-kind]');
      if (!b) return;
      kind = b.dataset.kind;
      Studdy.$$('[data-kind]', vista).forEach(function (x) {
        x.classList.toggle('is-on', x === b);
      });
    });

    boton.addEventListener('click', function () {
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Guardando…';

      crear({
        title: titulo.value.trim(),
        kind: kind,
        date: fecha.value,
        subject_id: Studdy.$('#subject', vista).value || null,
        notes: Studdy.$('#notes', vista).value.trim() || null,
      })
        .then(function () { Studdy.app.navigate('#/agenda'); })
        .catch(function (e2) {
          err.innerHTML = Studdy.errorHtml(traducir(e2.message));
          boton.disabled = false;
          boton.textContent = 'Guardar';
        });
    });

    titulo.focus();
  }

  // ------------------------------------------------------------------------
  // Datos
  // ------------------------------------------------------------------------

  async function cargar() {
    var client = await Studdy.getClient();
    var out = await client.from('events').select('*').order('date', { ascending: true });
    if (out.error) throw new Error(traducir(out.error.message));
    return out.data || [];
  }

  async function crear(fila) {
    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    fila.profile_id = user.id;
    var out = await client.from('events').insert(fila);
    if (out.error) throw new Error(out.error.message);
  }

  async function actualizar(id, cambios) {
    var client = await Studdy.getClient();
    var out = await client.from('events').update(cambios).eq('id', id);
    if (out.error) throw new Error(out.error.message);
  }

  async function eliminar(id) {
    var client = await Studdy.getClient();
    var out = await client.from('events').delete().eq('id', id);
    if (out.error) throw new Error(out.error.message);
  }

  function traducir(mensaje) {
    if (/relation .* does not exist/i.test(mensaje || '')) {
      return 'Falta la tabla de la agenda. Ejecuta supabase/migracion-02-funciones.sql en Supabase.';
    }
    return mensaje;
  }

  // ------------------------------------------------------------------------

  function dias(fecha) {
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var d = new Date(fecha + 'T00:00:00');
    return Math.round((d - hoy) / 86400000);
  }

  function formato(fecha) {
    return new Date(fecha + 'T00:00:00')
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  return { render: render, cargar: cargar, dias: dias };
})();
