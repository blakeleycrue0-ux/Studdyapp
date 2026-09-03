/* ==========================================================================
   Repaso espaciado.

   Reúne las flashcards de todos tus apuntes y te enseña solo las que tocan
   hoy. Lo que fallas vuelve pronto; lo que aciertas se espacia. El estado de
   cada tarjeta vive en la tabla card_reviews.
   ========================================================================== */

Studdy.views.review = (function () {
  'use strict';

  var TOPE = 25;

  async function render(vista) {
    vista.innerHTML = Studdy.loadingHtml('Preparando tu repaso…');

    var datos;
    try {
      datos = await cargar();
    } catch (e) {
      vista.innerHTML = Studdy.app.cabecera('Repasar') + Studdy.errorHtml(e.message);
      return;
    }

    if (!datos.total) {
      vista.innerHTML = Studdy.app.cabecera('Repasar') +
        '<div class="empty">' +
          '<p class="empty__title">Todavía no tienes tarjetas</p>' +
          '<p class="empty__text">Genera flashcards dentro de un apunte y aparecerán ' +
            'aquí para repasarlas cuando toque.</p>' +
          '<a class="btn btn--primary" href="#/apuntes">Ir a mis apuntes</a>' +
        '</div>';
      return;
    }

    if (!datos.cola.length) {
      vista.innerHTML = Studdy.app.cabecera('Repasar') +
        '<div class="empty">' +
          '<p class="empty__title">Por hoy has terminado</p>' +
          '<p class="empty__text">No te toca ninguna tarjeta. ' +
            (datos.proxima
              ? 'La siguiente vuelve ' + cuando(datos.proxima) + '.'
              : 'Vuelve mañana.') + '</p>' +
          '<a class="btn btn--ghost" href="#/apuntes">Ver mis apuntes</a>' +
        '</div>' +
        resumen(datos);
      return;
    }

    montar(vista, datos);
  }

  function resumen(datos) {
    return '<p class="section-title">Tus tarjetas</p><div class="stats">' +
      '<div class="stat"><div class="stat__value">' + datos.total + '</div>' +
        '<div class="stat__label">en total</div></div>' +
      '<div class="stat"><div class="stat__value">' + datos.nuevas + '</div>' +
        '<div class="stat__label">sin estrenar</div></div>' +
      '</div>';
  }

  // ------------------------------------------------------------------------

  function montar(vista, datos) {
    var cola = datos.cola;
    var indice = 0;
    var hechas = 0;

    vista.innerHTML =
      Studdy.app.cabecera('Repasar') +
      '<div class="review-head">' +
        '<div class="review-head__num" id="quedan">' + cola.length + '</div>' +
        '<div class="review-head__text">tarjetas te tocan hoy<br>' +
          'de ' + datos.total + ' que tienes en total</div>' +
      '</div>' +
      '<div id="zona"></div>';

    var zona = Studdy.$('#zona', vista);
    var quedan = Studdy.$('#quedan', vista);

    pintar();

    function pintar() {
      if (indice >= cola.length) {
        zona.innerHTML =
          '<div class="empty">' +
            '<p class="empty__title">Repaso terminado</p>' +
            '<p class="empty__text">' + hechas +
              (hechas === 1 ? ' tarjeta repasada.' : ' tarjetas repasadas.') +
              ' Las que has fallado volverán pronto.</p>' +
            '<a class="btn btn--primary" href="#/inicio">Volver al inicio</a>' +
          '</div>';
        quedan.textContent = '0';
        return;
      }

      var carta = cola[indice];
      quedan.textContent = String(cola.length - indice);

      zona.innerHTML =
        '<p class="deck__counter">' + Studdy.escapeHtml(carta.subject || '') + '</p>' +
        '<div class="flip" id="flip" role="button" tabindex="0">' +
          '<div class="flip__inner">' +
            '<div class="flip__side flip__side--front">' +
              '<span class="flip__label">Pregunta</span>' +
              '<p class="flip__text">' + Studdy.escapeHtml(carta.question) + '</p>' +
              '<span class="flip__hint">Toca para ver la respuesta</span>' +
            '</div>' +
            '<div class="flip__side flip__side--back">' +
              '<span class="flip__label">Respuesta</span>' +
              '<p class="flip__text">' + Studdy.escapeHtml(carta.answer) + '</p>' +
              '<span class="flip__hint">¿Te la sabías?</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="notas"></div>';

      var flip = Studdy.$('#flip', zona);
      var notas = Studdy.$('#notas', zona);

      function voltear() {
        flip.classList.add('is-flipped');
        // Las opciones solo aparecen cuando ya has visto la respuesta:
        // puntuarte antes no tendría sentido.
        notas.innerHTML =
          '<div class="grade-row">' +
            '<button class="grade grade--mal" data-nota="mal">Mal<span>vuelve ya</span></button>' +
            '<button class="grade grade--medio" data-nota="medio">Regular<span>pronto</span></button>' +
            '<button class="grade grade--bien" data-nota="bien">Bien<span>más adelante</span></button>' +
          '</div>';
      }

      flip.addEventListener('click', function () {
        if (!flip.classList.contains('is-flipped')) voltear();
      });
      flip.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && !flip.classList.contains('is-flipped')) {
          e.preventDefault();
          voltear();
        }
      });

      notas.addEventListener('click', function (e) {
        var b = e.target.closest('[data-nota]');
        if (!b) return;

        Studdy.$$('[data-nota]', notas).forEach(function (x) { x.disabled = true; });

        hechas++;
        guardarNota(carta, b.dataset.nota).catch(function () { /* se reintenta al próximo repaso */ });

        indice++;
        pintar();
        window.scrollTo(0, 0);
      });
    }
  }

  // ------------------------------------------------------------------------
  // Datos
  // ------------------------------------------------------------------------

  async function cargar() {
    var client = await Studdy.getClient();

    var cardsRes = await client.from('flashcards').select('id, question, answer, note_id');
    if (cardsRes.error) throw new Error(cardsRes.error.message);
    var tarjetas = cardsRes.data || [];

    var revRes = await client.from('card_reviews').select('flashcard_id, due_at, ease, interval_days, reps, lapses');
    if (revRes.error) {
      throw new Error(/relation .* does not exist/i.test(revRes.error.message)
        ? 'Falta la tabla de repaso. Ejecuta supabase/migracion-02-funciones.sql en Supabase.'
        : revRes.error.message);
    }

    var porTarjeta = {};
    (revRes.data || []).forEach(function (r) { porTarjeta[r.flashcard_id] = r; });

    var ahora = Date.now();
    var cola = [];
    var nuevas = 0;
    var proxima = null;

    tarjetas.forEach(function (t) {
      var apunte = Studdy.app.findNote(t.note_id);
      t.subject = apunte ? Studdy.app.subjectName(apunte.subject_id) : '';

      var estado = porTarjeta[t.id];

      if (!estado) {
        nuevas++;
        cola.push(t);
        return;
      }

      var vence = new Date(estado.due_at).getTime();
      if (vence <= ahora) {
        t.estado = estado;
        cola.push(t);
      } else if (proxima === null || vence < proxima) {
        proxima = vence;
      }
    });

    // Las que ya fallaste alguna vez primero, y sin pasarse del tope diario.
    cola.sort(function (a, b) {
      var la = a.estado ? a.estado.lapses : 0;
      var lb = b.estado ? b.estado.lapses : 0;
      return lb - la;
    });

    return {
      cola: cola.slice(0, TOPE),
      total: tarjetas.length,
      nuevas: nuevas,
      proxima: proxima,
    };
  }

  // Variante ligera de SM-2: suficiente para que el repaso tenga sentido sin
  // convertir esto en Anki.
  function siguienteEstado(estado, nota) {
    var ease = estado ? Number(estado.ease) : 2.5;
    var intervalo = estado ? estado.interval_days : 0;
    var reps = estado ? estado.reps : 0;
    var lapses = estado ? estado.lapses : 0;

    if (nota === 'mal') {
      ease = Math.max(1.3, ease - 0.2);
      reps = 0;
      lapses++;
      intervalo = 0;
    } else if (nota === 'medio') {
      ease = Math.max(1.3, ease - 0.05);
      reps++;
      intervalo = intervalo ? Math.max(1, Math.round(intervalo * 1.2)) : 1;
    } else {
      ease = Math.min(2.8, ease + 0.05);
      reps++;
      if (reps === 1) intervalo = 1;
      else if (reps === 2) intervalo = 3;
      else intervalo = Math.max(1, Math.round(intervalo * ease));
    }

    // Fallar no la manda a mañana: vuelve dentro de un rato, en este repaso.
    var vence = nota === 'mal'
      ? new Date(Date.now() + 10 * 60000)
      : new Date(Date.now() + intervalo * 86400000);

    return {
      ease: ease,
      interval_days: intervalo,
      reps: reps,
      lapses: lapses,
      due_at: vence.toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async function guardarNota(carta, nota) {
    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) return;

    var fila = siguienteEstado(carta.estado, nota);
    fila.profile_id = user.id;
    fila.flashcard_id = carta.id;

    var out = await client
      .from('card_reviews')
      .upsert(fila, { onConflict: 'profile_id,flashcard_id' });

    if (out.error) throw new Error(out.error.message);
  }

  function cuando(ts) {
    var d = Math.round((ts - Date.now()) / 86400000);
    if (d <= 0) return 'hoy mismo';
    if (d === 1) return 'mañana';
    return 'en ' + d + ' días';
  }

  return { render: render, cargar: cargar };
})();
