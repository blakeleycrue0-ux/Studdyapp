/* ==========================================================================
   Chat.

   Pensado como un asistente de IA, no como una app de mensajería: lo que
   escribes tú va en burbuja a la derecha, y lo que responde la IA va a texto
   corrido y a todo el ancho, igual que en ChatGPT o Gemini.

   Dos modos: general (pestaña de abajo) y sobre un apunte concreto (pestaña
   del cuaderno). El nivel y las asignaturas los añade la función serverless
   leyendo el perfil. El historial vive en memoria durante la visita.
   ========================================================================== */

Studdy.views.chat = (function () {
  'use strict';

  var historiales = {};

  // Pregunta escrita en el Inicio y todavía sin mandar. El chat la recoge al
  // montarse y la envía sola, así el salto entre pantallas no se nota.
  var pendiente = null;

  function historial(clave) {
    if (!historiales[clave]) historiales[clave] = [];
    return historiales[clave];
  }

  // ------------------------------------------------------------------------

  function render(vista) {
    var perfil = Studdy.app.state.profile;

    vista.innerHTML =
      '<div class="appbar">' +
        '<div><h1 class="topbar__title">Chat</h1></div>' +
        '<div class="appbar__spacer"></div>' +
        '<a class="avatar" href="#/perfil">' +
          Studdy.escapeHtml(Studdy.app.initials(perfil.name)) + '</a>' +
      '</div>' +
      armazon('');

    montar(vista, 'global', null);
  }

  function renderPanel(panel, apunte) {
    panel.innerHTML = armazon(' chat--embedded');
    montar(panel, apunte.id, apunte);
  }

  // ------------------------------------------------------------------------

  function armazon(clase) {
    return (
      '<div class="chat' + clase + '">' +
        '<div class="chat__log" id="log"></div>' +
        '<div class="chat__quick" id="quick"></div>' +
        '<div class="chat__composer">' +
          '<textarea class="chat__input" id="input" rows="1" ' +
            'placeholder="Pregunta lo que sea…" aria-label="Escribe tu mensaje"></textarea>' +
          '<button class="chat__send" id="send" disabled aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  // Atajos sobre el campo: escriben la pregunta por ti.
  function atajos(apunte) {
    return apunte
      ? ['Explícamelo más fácil', 'Ponme un ejemplo',
         '¿Qué entra en el examen?', 'Hazme un resumen corto']
      : ['Explícame un concepto', 'Ayúdame con un ejercicio',
         'Cómo estudio para un examen', 'Resúmeme un tema'];
  }

  function montar(raiz, clave, apunte) {
    var log = Studdy.$('#log', raiz);
    var input = Studdy.$('#input', raiz);
    var enviar = Studdy.$('#send', raiz);
    var quick = Studdy.$('#quick', raiz);

    quick.innerHTML = atajos(apunte).map(function (a) {
      return '<button type="button" data-texto="' + Studdy.escapeHtml(a) + '">' +
        Studdy.escapeHtml(a) + '</button>';
    }).join('');

    quick.addEventListener('click', function (e) {
      var b = e.target.closest('[data-texto]');
      if (b) mandar(b.dataset.texto);
    });

    pintar();

    input.addEventListener('input', function () {
      enviar.disabled = !input.value.trim();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 140) + 'px';
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) mandar(input.value.trim());
      }
    });

    enviar.addEventListener('click', function () {
      if (input.value.trim()) mandar(input.value.trim());
    });

    log.addEventListener('click', function (e) {
      var s = e.target.closest('.chat__suggestion');
      if (s) mandar(s.dataset.texto);
    });

    if (pendiente && clave === 'global') {
      var traida = pendiente;
      pendiente = null;
      mandar(traida);
    }

    function pintar() {
      var mensajes = historial(clave);

      if (!mensajes.length) {
        var nombre = Studdy.app.state.profile.name;
        log.innerHTML =
          '<div class="chat__intro">' +
            '<h2 class="chat__intro-title">Hola, <b>' + Studdy.escapeHtml(nombre) + '</b>.<br>' +
              (apunte ? '¿Qué no te cuadra de este apunte?' : '¿Qué estudiamos hoy?') + '</h2>' +
            '<p class="chat__intro-text">' +
              (apunte
                ? 'Tengo delante este apunte, pregúntame sobre él.'
                : 'Respondo al nivel de tu curso, sin que tengas que explicármelo.') +
            '</p>' +
            '<div class="chat__suggestions stagger">' +
              atajos(apunte).map(function (a) {
                return '<button class="chat__suggestion ' + a[2] + '" type="button" ' +
                  'data-texto="' + Studdy.escapeHtml(a[0]) + '">' +
                  '<span class="tile tile--sm">' + Studdy.icons[a[1]] + '</span>' +
                  Studdy.escapeHtml(a[0]) + '</button>';
              }).join('') +
            '</div>' +
          '</div>';
        return;
      }

      log.innerHTML = '';
      mensajes.forEach(function (m) {
        burbuja(log, m.role === 'user' ? 'user' : 'ai', m.content);
      });
      abajo(log);
    }

    function mandar(texto) {
      historial(clave).push({ role: 'user', content: texto });

      input.value = '';
      input.style.height = 'auto';
      input.disabled = true;
      enviar.disabled = true;

      pintar();

      var pensando = burbuja(log, 'ai', '');
      pensando.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
      abajo(log);

      var carga = { messages: historial(clave) };
      if (apunte) {
        carga.noteContent = apunte.content;
        carga.noteSubject = Studdy.app.subjectName(apunte.subject_id);
      }

      Studdy.ai('chat', carga)
        .then(function (r) {
          historial(clave).push({ role: 'assistant', content: r.reply });
          pintar();
        })
        .catch(function (err) {
          // El turno fallido no se guarda: si no, se reenviaría cada vez.
          historial(clave).pop();
          pintar();
          burbuja(log, 'error', err.message);
          input.value = texto;
        })
        .then(function () {
          input.disabled = false;
          enviar.disabled = !input.value.trim();
          abajo(log);
        });
    }
  }

  function burbuja(log, tipo, texto) {
    var intro = Studdy.$('.chat__intro', log);
    if (intro) intro.remove();

    var el = document.createElement('div');
    el.className = 'msg msg--' + tipo;
    el.textContent = texto;
    log.appendChild(el);
    return el;
  }

  function abajo(log) { log.scrollTop = log.scrollHeight; }

  return {
    render: render,
    renderPanel: renderPanel,
    // La llama el Inicio antes de navegar aquí.
    preguntar: function (texto) { pendiente = texto; },
  };
})();
