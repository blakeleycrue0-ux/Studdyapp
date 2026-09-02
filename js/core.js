/* ==========================================================================
   Studdy — núcleo compartido
   Configuración, sesión de Supabase, llamadas a la IA y utilidades de DOM.
   JavaScript plano, sin módulos ni bundler: expone un único global `Studdy`.
   ========================================================================== */

window.Studdy = (function () {
  'use strict';

  var clientPromise = null;

  // ------------------------------------------------------------------------
  // Cliente de Supabase
  //
  // Las credenciales no están escritas en este archivo: se piden a la función
  // serverless /api/config, que las lee de las variables de entorno de Netlify.
  // ------------------------------------------------------------------------

  function getClient() {
    if (clientPromise) return clientPromise;

    clientPromise = fetch('/api/config')
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            throw new Error(body.error || 'No se ha podido cargar la configuración.');
          });
        }
        return res.json();
      })
      .then(function (cfg) {
        if (!window.supabase || !window.supabase.createClient) {
          throw new Error('No se ha podido cargar la librería de Supabase.');
        }
        return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
      })
      .catch(function (err) {
        clientPromise = null;
        throw err;
      });

    return clientPromise;
  }

  // ------------------------------------------------------------------------
  // Sesión
  // ------------------------------------------------------------------------

  function getSession() {
    return getClient()
      .then(function (client) { return client.auth.getSession(); })
      .then(function (res) { return res.data ? res.data.session : null; });
  }

  // Crea la sesión anónima solo si todavía no hay ninguna. Es lo que hace que
  // exista un auth.uid() real y, por tanto, que las políticas RLS puedan
  // aislar los datos de cada usuario.
  function signIn() {
    return getClient().then(function (client) {
      return client.auth.getSession().then(function (res) {
        if (res.data && res.data.session) return res.data.session;
        return client.auth.signInAnonymously().then(function (out) {
          if (out.error) throw new Error(traducirErrorAuth(out.error.message));
          return out.data.session;
        });
      });
    });
  }

  function traducirErrorAuth(mensaje) {
    if (/anonymous/i.test(mensaje || '')) {
      return 'Las sesiones anónimas no están activadas en Supabase. ' +
        'Actívalas en Authentication → Providers → Anonymous sign-ins.';
    }
    return mensaje || 'No se ha podido iniciar sesión.';
  }

  function signOut() {
    return getClient().then(function (client) { return client.auth.signOut(); });
  }

  // Envía a login.html a quien no tenga sesión.
  function requireSession() {
    return getSession().then(function (session) {
      if (!session) {
        window.location.replace('login.html');
        return null;
      }
      return session;
    });
  }

  // ------------------------------------------------------------------------
  // Perfil
  // ------------------------------------------------------------------------

  function getProfile() {
    return getClient().then(function (client) {
      return client.auth.getUser().then(function (res) {
        var user = res.data ? res.data.user : null;
        if (!user) return null;
        return client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
          .then(function (out) {
            if (out.error) throw new Error(out.error.message);
            return out.data;
          });
      });
    });
  }

  // ------------------------------------------------------------------------
  // IA
  //
  // Nunca se llama a la API de Anthropic desde el navegador: se llama a
  // /api/ai, que es quien tiene la clave y quien comprueba la sesión.
  // ------------------------------------------------------------------------

  function ai(action, payload) {
    return getSession().then(function (session) {
      if (!session) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

      var body = Object.assign({ action: action }, payload || {});

      return fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify(body),
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error(data.error || 'La IA no ha podido responder.');
          return data;
        });
      });
    });
  }

  // ------------------------------------------------------------------------
  // Utilidades de DOM
  // ------------------------------------------------------------------------

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var ICON_ALERT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/>' +
    '<path d="M12 7.6v5M12 16.2h.01"/></svg>';

  function errorHtml(mensaje) {
    return '<div class="alert alert--error">' + ICON_ALERT +
      '<span>' + escapeHtml(mensaje) + '</span></div>';
  }

  function loadingHtml(mensaje) {
    return '<div class="loading-row"><span class="spinner"></span><span>' +
      escapeHtml(mensaje) + '</span></div>';
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Título legible de un apunte: su primera línea con contenido, recortada.
  function noteTitle(content) {
    var linea = String(content || '')
      .split('\n')
      .map(function (l) { return l.replace(/^#+\s*/, '').trim(); })
      .filter(Boolean)[0] || 'Apunte sin título';
    return linea.length > 70 ? linea.slice(0, 70).trim() + '…' : linea;
  }

  // ------------------------------------------------------------------------
  // Markdown mínimo, solo lo que generan los esquemas: encabezados, listas,
  // negrita y cursiva. Se escapa el HTML antes de aplicar nada.
  // ------------------------------------------------------------------------

  function renderMarkdown(texto) {
    var lineas = escapeHtml(texto).split('\n');
    var html = '';
    var listaAbierta = 0;

    function cerrarListas(hasta) {
      while (listaAbierta > hasta) { html += '</ul>'; listaAbierta--; }
    }

    lineas.forEach(function (linea) {
      var enc = linea.match(/^(#{1,4})\s+(.*)$/);
      if (enc) {
        cerrarListas(0);
        var nivel = Math.min(enc[1].length + 1, 5);
        html += '<h' + nivel + '>' + inline(enc[2]) + '</h' + nivel + '>';
        return;
      }

      var item = linea.match(/^(\s*)[-*+]\s+(.*)$/);
      if (item) {
        var profundidad = item[1].length >= 2 ? 2 : 1;
        while (listaAbierta < profundidad) { html += '<ul>'; listaAbierta++; }
        cerrarListas(profundidad);
        html += '<li>' + inline(item[2]) + '</li>';
        return;
      }

      var numerado = linea.match(/^\s*\d+[.)]\s+(.*)$/);
      if (numerado) {
        while (listaAbierta < 1) { html += '<ul>'; listaAbierta++; }
        cerrarListas(1);
        html += '<li>' + inline(numerado[1]) + '</li>';
        return;
      }

      if (!linea.trim()) { cerrarListas(0); return; }

      cerrarListas(0);
      html += '<p>' + inline(linea.trim()) + '</p>';
    });

    cerrarListas(0);
    return html;
  }

  function inline(texto) {
    return texto
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }

  // ------------------------------------------------------------------------

  return {
    getClient: getClient,
    getSession: getSession,
    requireSession: requireSession,
    signIn: signIn,
    signOut: signOut,
    getProfile: getProfile,
    ai: ai,
    $: $,
    $$: $$,
    escapeHtml: escapeHtml,
    errorHtml: errorHtml,
    loadingHtml: loadingHtml,
    formatDate: formatDate,
    noteTitle: noteTitle,
    renderMarkdown: renderMarkdown,
  };
})();
