/* ==========================================================================
   Chat.
   Dos modos: general (pestaña de abajo) y sobre un apunte concreto (pestaña
   del cuaderno). En el segundo se le pasa el contenido del apunte para que
   responda sobre ese material.

   El nivel, curso y asignaturas los añade la función serverless leyendo el
   perfil del propio usuario. El historial vive en memoria durante la visita.
   ========================================================================== */

Studdy.views.chat = (function () {
  'use strict';

  // clave -> [{role, content}]. 'global' para el chat general, el id del
  // apunte para cada cuaderno.
  var historiales = {};

  function historial(clave) {
    if (!historiales[clave]) historiales[clave] = [];
    return historiales[clave];
  }

  // ------------------------------------------------------------------------

  function render(vista) {
    var perfil = Studdy.app.state.profile;

    vista.innerHTML =
      Studdy.app.cabecera('Chat',
        'Ya sabe que estás en ' + Studdy.app.describeLevel(perfil) + '.') +
      armazon('');

    montar(vista, 'global', null, [
      'Explícame un concepto que no entiendo',
      'Hazme un resumen de un tema',
      '¿Cómo me organizo para un examen?',
    ]);
  }

  function renderPanel(panel, apunte) {
    panel.innerHTML = armazon(' chat--embedded');

    montar(panel, apunte.id, apunte, [
      'Explícamelo más fácil',
      'Ponme un ejemplo',
      '¿Qué es lo más importante de esto?',
    ]);
  }

  // ------------------------------------------------------------------------

  function armazon(clase) {
    return (
      '<div class="chat' + clase + '">' +
        '<div class="chat__log" id="log"></div>' +
        '<div class="chat__composer">' +
          '<textarea class="chat__input" id="input" rows="1" aria-label="Escribe tu mensaje"></textarea>' +
          '<button class="chat__send" id="send" disabled aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function montar(raiz, clave, apunte, sugerencias) {
    var log = Studdy.$('#log', raiz);
    var input = Studdy.$('#input', raiz);
    var enviar = Studdy.$('#send', raiz);

    pintar();

    input.addEventListener('input', function () {
      enviar.disabled = !input.value.trim();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 130) + 'px';
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
      var sug = e.target.closest('.chat__suggestion');
      if (sug) mandar(sug.textContent);
    });

    function pintar() {
      var mensajes = historial(clave);

      if (!mensajes.length) {
        log.innerHTML =
          '<div class="chat__intro">' +
            '<div class="chat__intro-icon">' + Studdy.icons.chat + '</div>' +
            '<p>' + (apunte
              ? 'Pregúntame lo que quieras sobre este apunte.'
              : 'Pregúntame lo que no entiendas. Respondo al nivel de tu curso.') + '</p>' +
            '<div class="chat__suggestions">' +
              sugerencias.map(function (t) {
                return '<button class="chat__suggestion" type="button">' +
                  Studdy.escapeHtml(t) + '</button>';
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
      pensando.innerHTML = '<span class="spinner" style="vertical-align:-3px"></span>';
      abajo(log);

      var carga = { messages: historial(clave) };
      if (apunte) {
        carga.noteContent = apunte.content;
        carga.noteSubject = Studdy.app.subjectName(apunte.subject_id);
      }

      Studdy.ai('chat', carga)
        .then(function (respuesta) {
          historial(clave).push({ role: 'assistant', content: respuesta.reply });
          pintar();
        })
        .catch(function (err) {
          // El turno que ha fallado no se queda guardado: si no, se
          // reenviaría en cada intento posterior.
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

  return { render: render, renderPanel: renderPanel };
})();
