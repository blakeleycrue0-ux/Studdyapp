/* ==========================================================================
   Chat IA.

   El contexto de sistema (nivel, curso y asignaturas) lo añade la función
   serverless leyendo el perfil del propio usuario, así que aquí solo se
   envían los mensajes. El historial vive en memoria durante la visita: esta
   versión no lo guarda en Supabase.
   ========================================================================== */

Studdy.views.chat = (function () {
  'use strict';

  var historial = [];

  function render(vista) {
    var perfil = Studdy.app.state.profile;

    vista.innerHTML =
      '<div class="page-head"><div>' +
        '<h1 class="page-head__title">Chat</h1>' +
        '<p class="page-head__sub">Ya sabe que estás en ' +
          Studdy.escapeHtml(Studdy.app.describeLevel(perfil)) +
          ', no hace falta que se lo expliques.</p>' +
      '</div></div>' +

      '<div class="chat">' +
        '<div class="chat__log" id="log"></div>' +
        '<div class="chat__composer">' +
          '<textarea class="chat__input" id="input" rows="1" ' +
            'aria-label="Escribe tu mensaje"></textarea>' +
          '<button class="chat__send" id="send" disabled aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" ' +
            'stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    var log = Studdy.$('#log', vista);
    var input = Studdy.$('#input', vista);
    var enviar = Studdy.$('#send', vista);

    pintarHistorial(log);

    input.addEventListener('input', function () {
      enviar.disabled = !input.value.trim();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) mandar();
      }
    });

    enviar.addEventListener('click', function () {
      if (input.value.trim()) mandar();
    });

    function mandar() {
      var texto = input.value.trim();

      historial.push({ role: 'user', content: texto });
      input.value = '';
      input.style.height = 'auto';
      enviar.disabled = true;
      input.disabled = true;

      pintarHistorial(log);
      var pensando = anadirBurbuja(log, 'ai', '');
      pensando.innerHTML = '<span class="spinner" style="vertical-align:-3px"></span>';
      abajo(log);

      Studdy.ai('chat', { messages: historial })
        .then(function (respuesta) {
          historial.push({ role: 'assistant', content: respuesta.reply });
          pintarHistorial(log);
        })
        .catch(function (err) {
          // El turno que ha fallado no se queda en el historial: si no, se
          // reenviaría en cada intento posterior.
          historial.pop();
          pintarHistorial(log);
          anadirBurbuja(log, 'error', err.message);
          input.value = texto;
        })
        .then(function () {
          input.disabled = false;
          enviar.disabled = !input.value.trim();
          input.focus();
          abajo(log);
        });
    }

    input.focus();
  }

  function pintarHistorial(log) {
    if (!historial.length) {
      log.innerHTML =
        '<div class="chat__intro">' +
          '<div class="chat__intro-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.4A7.5 7.5 0 1 1 20.5 12.5Z"/>' +
            '<path d="m13.6 8.2.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z"/></svg>' +
          '</div>' +
          '<p>Pregúntale lo que no entiendas de cualquier asignatura. Responde ' +
            'al nivel de tu curso.</p>' +
        '</div>';
      return;
    }

    log.innerHTML = '';
    historial.forEach(function (mensaje) {
      anadirBurbuja(log, mensaje.role === 'user' ? 'user' : 'ai', mensaje.content);
    });
    abajo(log);
  }

  function anadirBurbuja(log, tipo, texto) {
    var intro = Studdy.$('.chat__intro', log);
    if (intro) intro.remove();

    var burbuja = document.createElement('div');
    burbuja.className = 'msg msg--' + tipo;
    burbuja.textContent = texto;
    log.appendChild(burbuja);
    return burbuja;
  }

  function abajo(log) {
    log.scrollTop = log.scrollHeight;
  }

  return { render: render };
})();
