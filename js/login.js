/* ==========================================================================
   Acceso: correo y contraseña, o Google.

   Además convierte las cuentas anónimas antiguas: si en este dispositivo ya
   hay una sesión sin cuenta con apuntes dentro, al registrarse se enlaza esa
   misma sesión en lugar de crear una nueva, así no se pierde nada.
   ========================================================================== */

(function () {
  'use strict';

  var panel = Studdy.$('#panel');
  var modo = 'entrar';          // entrar | crear | olvidada | nueva
  var anonimo = null;           // sesión anónima previa con datos, si la hay

  var ICONO_GOOGLE =
    '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.4-.2-2.1H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.8Z"/>' +
    '<path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8A10.9 10.9 0 0 0 12 23Z"/>' +
    '<path fill="#FBBC05" d="M6 14.4a6.5 6.5 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4Z"/>' +
    '<path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A10.9 10.9 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.4 6-4.4Z"/></svg>';

  var ICONO_OJO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>' +
    '<circle cx="12" cy="12" r="2.8"/></svg>';

  var ICONO_OJO_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/>' +
    '<path d="M10.6 6.1A9.9 9.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.3 4"/>' +
    '<path d="M6.3 8A16.6 16.6 0 0 0 2 12s3.6 6.5 10 6.5c1.4 0 2.6-.3 3.7-.8"/>' +
    '<path d="M9.5 10.4a2.8 2.8 0 0 0 4 3.9"/></svg>';

  var ICONO_INFO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.2"/>' +
    '<path d="M12 11v5M12 7.8h.01"/></svg>';

  // ------------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------------

  var MARCA_GOOGLE = 'studdy:volviendo-de-google';

  // Lee los parámetros que Supabase deja al volver, vengan en el hash
  // (?#access_token=…) o en la query (?code=…).
  function paramsDeVuelta() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    var query = (window.location.search || '').replace(/^\?/, '');
    var p = {};

    [hash, query].forEach(function (trozo) {
      if (!trozo) return;
      trozo.split('&').forEach(function (par) {
        var i = par.indexOf('=');
        if (i < 0) return;
        p[decodeURIComponent(par.slice(0, i))] = decodeURIComponent(par.slice(i + 1).replace(/\+/g, ' '));
      });
    });

    return p;
  }

  // Deja la barra de direcciones limpia una vez recogido lo que traía.
  function limpiarUrl() {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function marcar(valor) {
    try {
      if (valor) sessionStorage.setItem(MARCA_GOOGLE, '1');
      else sessionStorage.removeItem(MARCA_GOOGLE);
    } catch (e) { /* modo privado */ }
  }

  function veniaDeGoogle() {
    try { return sessionStorage.getItem(MARCA_GOOGLE) === '1'; } catch (e) { return false; }
  }

  function arrancar() {
    var params = paramsDeVuelta();
    var esRecuperacion = params.type === 'recovery';

    // Si Google o Supabase devuelven un error, se dice; antes esto dejaba la
    // pantalla de acceso como si no hubiera pasado nada.
    if (params.error || params.error_description) {
      var boot0 = Studdy.$('#boot');
      if (boot0) boot0.remove();
      marcar(false);
      limpiarUrl();
      pintar();
      error(traducirOAuth(params.error, params.error_description));
      return;
    }

    // Un código de OAuth solo se puede canjear una vez, y supabase-js ya lo
    // hace solo al arrancar. Por eso aquí se mira primero si hay sesión y el
    // canje a mano queda como último recurso.
    Studdy.getSession()
      .then(function (sesion) {
        if (sesion || !params.code || params.access_token) return sesion;
        return Studdy.exchangeCode(params.code)
          .catch(function () { return null; })
          .then(function () { return Studdy.getSession(); });
      })
      .then(function (sesion) {
        return Studdy.currentUser().then(function (usuario) {
          return { sesion: sesion, usuario: usuario };
        });
      })
      .then(function (estado) {
        Studdy.$('#boot').remove();

        if (esRecuperacion && estado.sesion) {
          modo = 'nueva';
          pintar();
          return;
        }

        // Sesión completa: adentro.
        if (estado.sesion && estado.usuario && !estado.usuario.is_anonymous) {
          seguir();
          return;
        }

        // Sesión anónima de la versión anterior: se ofrece conservarla.
        if (estado.sesion && estado.usuario && estado.usuario.is_anonymous) {
          return Studdy.getProfile().then(function (perfil) {
            if (perfil) {
              anonimo = perfil;
              modo = 'crear';
            }
            pintar();
          });
        }

        // Se ha vuelto de Google pero no hay sesión ni nada en la URL: casi
        // siempre significa que la dirección de vuelta no está permitida en
        // Supabase, así que se dice en lugar de dejar la pantalla muda.
        var mudo = veniaDeGoogle();
        marcar(false);
        limpiarUrl();
        pintar();

        if (mudo) {
          error('Google te ha identificado, pero Supabase no ha devuelto la sesión a esta ' +
            'página. Revisa Authentication → URL Configuration: el Site URL debe ser ' +
            window.location.origin + ' y en Redirect URLs tiene que estar ' +
            window.location.origin + '/**');
        }
      })
      .catch(function (err) {
        var boot = Studdy.$('#boot');
        if (boot) boot.remove();
        marcar(false);
        pintar();
        error(err.message);
      });
  }

  var ERRORES_OAUTH = [
    [/access_denied/i, 'Has cancelado el acceso con Google.'],
    [/redirect_uri_mismatch/i,
      'La dirección de vuelta no coincide con la que hay en Google Cloud. ' +
      'En Authorised redirect URIs debe estar la de Supabase, terminada en /auth/v1/callback.'],
    [/admin|policy|blocked|disallowed_useragent/i,
      'Google ha bloqueado el acceso. Si estás usando la cuenta del instituto, ' +
      'puede que su administrador no permita aplicaciones externas.'],
    [/bad_oauth_state|invalid_request|flow_state/i,
      'La vuelta de Google ha caducado o se ha abierto en otra pestaña. Inténtalo otra vez.'],
    [/provider is not enabled/i,
      'El acceso con Google no está activado en Supabase.'],
    [/unable to exchange external code|invalid_client|unauthorized_client/i,
      'Google ha rechazado el acceso. Lo más habitual es que el Client Secret ' +
      'guardado en Supabase esté incompleto o tenga un espacio: bórralo entero y ' +
      'vuelve a pegarlo desde Google Cloud, comprobando que no le falta ningún ' +
      'carácter al final. Si el secret es correcto y estabas usando la cuenta del ' +
      'instituto, entonces es que tu centro no permite aplicaciones externas.'],
    [/invalid_grant|code was already redeemed|expired/i,
      'El código de Google ya se había usado o ha caducado. Vuelve a intentarlo ' +
      'desde el principio, sin recargar la página a medias.'],
  ];

  function traducirOAuth(codigo, descripcion) {
    var texto = (codigo || '') + ' ' + (descripcion || '');
    for (var i = 0; i < ERRORES_OAUTH.length; i++) {
      if (ERRORES_OAUTH[i][0].test(texto)) return ERRORES_OAUTH[i][1];
    }
    return descripcion || codigo || 'No se ha podido completar el acceso con Google.';
  }

  function seguir() {
    Studdy.getProfile()
      .then(function (perfil) {
        window.location.replace(perfil ? 'app.html' : 'onboarding.html');
      })
      .catch(function () { window.location.replace('onboarding.html'); });
  }

  // ------------------------------------------------------------------------
  // Pintado
  // ------------------------------------------------------------------------

  function pintar() {
    if (modo === 'olvidada') return pintarOlvidada();
    if (modo === 'nueva') return pintarNueva();

    var creando = modo === 'crear';

    panel.innerHTML =
      '<h1 class="panel__title">' + (creando ? 'Crea tu cuenta' : 'Entra en Studdy') + '</h1>' +
      '<p class="panel__lead">' +
        (creando
          ? 'Para que tus apuntes te sigan en cualquier dispositivo.'
          : 'Con tu correo o con Google.') +
      '</p>' +

      '<div class="auth-seg" id="seg">' +
        '<button type="button" data-modo="entrar"' + (creando ? '' : ' class="is-on"') + '>Entrar</button>' +
        '<button type="button" data-modo="crear"' + (creando ? ' class="is-on"' : '') + '>Crear cuenta</button>' +
      '</div>' +

      (anonimo
        ? '<div class="banner">' + ICONO_INFO +
            '<span><b>Tienes apuntes guardados aquí</b>' +
            'Los de ' + Studdy.escapeHtml(anonimo.name) + '. Crea tu cuenta y se quedan contigo; ' +
            'si entras con otra, se quedan atrás.</span>' +
          '</div>'
        : '') +

      '<div class="panel__error" id="error"></div>' +

      '<div class="auth-fields">' +
        '<label class="field">' +
          '<span class="field__label">Correo electrónico</span>' +
          '<input class="input" type="email" id="email" autocomplete="email" ' +
            'inputmode="email" spellcheck="false">' +
        '</label>' +
        '<label class="field">' +
          '<span class="field__label">Contraseña</span>' +
          '<span class="pw">' +
            '<input class="input" type="password" id="password" ' +
              'autocomplete="' + (creando ? 'new-password' : 'current-password') + '">' +
            '<button class="pw__eye" type="button" id="ojo" aria-label="Mostrar contraseña">' +
              ICONO_OJO + '</button>' +
          '</span>' +
        '</label>' +
      '</div>' +

      '<button class="btn btn--primary btn--lg btn--block" id="enviar" disabled>' +
        (creando ? (anonimo ? 'Crear cuenta y conservar mis apuntes' : 'Crear cuenta') : 'Entrar') +
      '</button>' +

      '<div class="auth-divider">o</div>' +

      '<button class="btn btn--google btn--lg btn--block" id="google">' +
        ICONO_GOOGLE + 'Continuar con Google</button>' +

      '<p class="auth-note">Si tu instituto tiene bloqueadas las apps externas, ' +
        'usa una cuenta personal o entra con correo y contraseña.</p>' +

      (creando
        ? '<p class="auth-note">Con al menos 8 caracteres. Te enviaremos un correo ' +
          'para confirmar que la dirección es tuya.</p>'
        : '<div class="auth-links">' +
            '<button class="auth-link" data-ir="olvidada">He olvidado la contraseña</button>' +
          '</div>');

    conectar(creando);
  }

  function conectar(creando) {
    var email = Studdy.$('#email', panel);
    var pass = Studdy.$('#password', panel);
    var enviar = Studdy.$('#enviar', panel);

    function revisar() {
      enviar.disabled = !(valido(email.value) && pass.value.length >= (creando ? 8 : 1));
    }

    email.addEventListener('input', revisar);
    pass.addEventListener('input', revisar);

    pass.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !enviar.disabled) enviar.click();
    });

    Studdy.$('#ojo', panel).addEventListener('click', function () {
      var visible = pass.type === 'text';
      pass.type = visible ? 'password' : 'text';
      this.innerHTML = visible ? ICONO_OJO : ICONO_OJO_OFF;
      this.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });

    Studdy.$('#seg', panel).addEventListener('click', function (e) {
      var b = e.target.closest('[data-modo]');
      if (!b) return;
      modo = b.dataset.modo;
      pintar();
    });

    var olvidada = Studdy.$('[data-ir="olvidada"]', panel);
    if (olvidada) {
      olvidada.addEventListener('click', function () { modo = 'olvidada'; pintar(); });
    }

    enviar.addEventListener('click', function () {
      ocupado(enviar, creando ? 'Creando…' : 'Entrando…');
      error('');

      var tarea = creando
        ? (anonimo
            ? Studdy.upgradeAnonymous(email.value.trim(), pass.value)
            : Studdy.signUp(email.value.trim(), pass.value))
        : Studdy.signInWithPassword(email.value.trim(), pass.value);

      tarea
        .then(function (r) {
          if (r && r.necesitaConfirmar) {
            confirmacion(email.value.trim());
            return;
          }
          seguir();
        })
        .catch(function (err) {
          error(err.message);
          libre(enviar, creando ? (anonimo ? 'Crear cuenta y conservar mis apuntes' : 'Crear cuenta') : 'Entrar');
        });
    });

    Studdy.$('#google', panel).addEventListener('click', function () {
      ocupado(this, 'Abriendo Google…');
      error('');

      // Con datos anónimos por conservar se enlaza la cuenta en vez de entrar
      // como si fuese alguien nuevo.
      marcar(true);
      var tarea = anonimo ? Studdy.linkGoogle() : Studdy.signInWithGoogle();

      tarea.catch(function (err) {
        marcar(false);
        error(err.message);
        libre(Studdy.$('#google', panel), 'Continuar con Google');
        Studdy.$('#google', panel).insertAdjacentHTML('afterbegin', ICONO_GOOGLE);
      });
    });

    email.focus();
  }

  // ------------------------------------------------------------------------

  function pintarOlvidada() {
    panel.innerHTML =
      '<h1 class="panel__title">Recuperar contraseña</h1>' +
      '<p class="panel__lead">Te mandamos un enlace para poner una nueva.</p>' +
      '<div class="panel__error" id="error"></div>' +
      '<div class="auth-fields">' +
        '<label class="field">' +
          '<span class="field__label">Correo electrónico</span>' +
          '<input class="input" type="email" id="email" autocomplete="email" ' +
            'inputmode="email" spellcheck="false">' +
        '</label>' +
      '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="enviar" disabled>Enviar enlace</button>' +
      '<div class="auth-links">' +
        '<button class="auth-link" data-ir="entrar">Volver</button>' +
      '</div>';

    var email = Studdy.$('#email', panel);
    var enviar = Studdy.$('#enviar', panel);

    email.addEventListener('input', function () { enviar.disabled = !valido(email.value); });
    Studdy.$('[data-ir="entrar"]', panel).addEventListener('click', function () {
      modo = 'entrar'; pintar();
    });

    enviar.addEventListener('click', function () {
      ocupado(enviar, 'Enviando…');
      error('');

      Studdy.resetPassword(email.value.trim())
        .then(function () {
          panel.innerHTML =
            '<h1 class="panel__title">Mira tu correo</h1>' +
            '<p class="panel__lead">Si hay una cuenta con <b>' +
              Studdy.escapeHtml(email.value.trim()) + '</b>, te acaba de llegar un enlace ' +
              'para poner una contraseña nueva.</p>' +
            '<a class="btn btn--ghost btn--block" href="login.html">Volver</a>';
        })
        .catch(function (err) {
          error(err.message);
          libre(enviar, 'Enviar enlace');
        });
    });

    email.focus();
  }

  function pintarNueva() {
    panel.innerHTML =
      '<h1 class="panel__title">Nueva contraseña</h1>' +
      '<p class="panel__lead">Escribe la que quieras usar a partir de ahora.</p>' +
      '<div class="panel__error" id="error"></div>' +
      '<div class="auth-fields">' +
        '<label class="field">' +
          '<span class="field__label">Contraseña</span>' +
          '<span class="pw">' +
            '<input class="input" type="password" id="password" autocomplete="new-password">' +
            '<button class="pw__eye" type="button" id="ojo" aria-label="Mostrar contraseña">' +
              ICONO_OJO + '</button>' +
          '</span>' +
        '</label>' +
      '</div>' +
      '<button class="btn btn--primary btn--lg btn--block" id="enviar" disabled>Guardar</button>' +
      '<p class="auth-note">Al menos 8 caracteres.</p>';

    var pass = Studdy.$('#password', panel);
    var enviar = Studdy.$('#enviar', panel);

    pass.addEventListener('input', function () { enviar.disabled = pass.value.length < 8; });

    Studdy.$('#ojo', panel).addEventListener('click', function () {
      var visible = pass.type === 'text';
      pass.type = visible ? 'password' : 'text';
      this.innerHTML = visible ? ICONO_OJO : ICONO_OJO_OFF;
    });

    enviar.addEventListener('click', function () {
      ocupado(enviar, 'Guardando…');
      error('');

      Studdy.updatePassword(pass.value)
        .then(seguir)
        .catch(function (err) {
          error(err.message);
          libre(enviar, 'Guardar');
        });
    });

    pass.focus();
  }

  function confirmacion(correo) {
    panel.innerHTML =
      '<h1 class="panel__title">Confirma tu correo</h1>' +
      '<p class="panel__lead">Te hemos enviado un enlace a <b>' +
        Studdy.escapeHtml(correo) + '</b>. Ábrelo y ya estarás dentro.</p>' +
      '<p class="auth-note">Si no aparece, mira en spam.</p>' +
      '<a class="btn btn--ghost btn--block" style="margin-top:18px" href="login.html">Volver</a>';
  }

  // ------------------------------------------------------------------------

  function valido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(correo || '').trim());
  }

  function ocupado(boton, texto) {
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> ' + texto;
  }

  function libre(boton, texto) {
    boton.disabled = false;
    boton.textContent = texto;
  }

  function error(mensaje) {
    var caja = Studdy.$('#error', panel);
    if (caja) caja.innerHTML = mensaje ? Studdy.errorHtml(mensaje) : '';
  }

  // Se arranca al final, cuando ya están definidas las tablas de errores que
  // usa el camino de vuelta de Google.
  arrancar();
})();
