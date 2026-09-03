/* ==========================================================================
   Onboarding: una pregunta por pantalla.

   Regla que gobierna todo el archivo: ningún campo arranca con valor. No hay
   placeholders que parezcan datos, ni opciones preseleccionadas, ni ejemplos.
   El estado empieza vacío y solo se llena con lo que responde el usuario.

   Las pantallas que se muestran dependen del nivel: quien va a FP no ve las
   de Bachillerato y al revés.
   ========================================================================== */

(function () {
  'use strict';

  var estado = {
    name: '', level: '', course: '', branch: '',
    fp_grade: '', fp_family: '', fp_cycle: '',
    university_degree: '', subjects: [],
  };

  var indice = 0;
  var yendoAtras = false;

  var el = {
    boot: Studdy.$('#boot'),
    body: Studdy.$('#body'),
    fill: Studdy.$('#fill'),
    back: Studdy.$('#back'),
    next: Studdy.$('#next'),
    note: Studdy.$('#note'),
    error: Studdy.$('#error'),
  };

  var COLORES = ['t-violet', 't-blue', 't-green', 't-coral', 't-pink', 't-amber', 't-cyan', 't-lime'];
  function color(i) { return COLORES[i % COLORES.length]; }

  // ------------------------------------------------------------------------
  // Las pantallas
  // ------------------------------------------------------------------------

  var PANTALLAS = {
    nombre: {
      pregunta: '¿Cómo te llamas?',
      hint: 'Para que la app te hable a ti y no a un usuario cualquiera.',
      nota: 'Solo lo verás tú.',
      cuerpo: function () {
        return '<div class="flow__fields"><input class="input" type="text" id="campo" ' +
          'autocomplete="given-name" spellcheck="false" maxlength="60" value="' +
          Studdy.escapeHtml(estado.name) + '"></div>';
      },
      conectar: function () {
        var campo = Studdy.$('#campo', el.body);
        campo.addEventListener('input', function () {
          estado.name = campo.value.trim();
          revisar();
        });
        campo.addEventListener('keydown', enterAvanza);
        campo.focus();
      },
      valido: function () { return estado.name.length > 0; },
    },

    nivel: {
      pregunta: '¿Qué estás estudiando?',
      hint: 'Es lo que marca la dificultad de todo lo que genere la IA.',
      cuerpo: function () {
        return opciones([
          ['ESO', 'Educación Secundaria Obligatoria', 'apunte'],
          ['Bachillerato', '1º y 2º, con rama', 'esquema'],
          ['FP', 'Formación Profesional', 'diana'],
          ['Universidad', 'Grado o carrera', 'escudo'],
        ].map(function (o, i) {
          return { valor: o[0], etiqueta: o[0], sub: o[1], icono: o[2], color: color(i) };
        }), 'level');
      },
      conectar: function () { conectarOpciones('level', function (previo) {
        if (previo === estado.level) return;
        estado.course = ''; estado.branch = '';
        estado.fp_grade = ''; estado.fp_family = ''; estado.fp_cycle = '';
        estado.university_degree = '';
      }); },
      valido: function () { return !!estado.level; },
    },

    eso_curso: {
      pregunta: '¿En qué curso de la ESO?',
      cuerpo: function () {
        return opciones(['1º', '2º', '3º', '4º'].map(function (c, i) {
          return { valor: c, etiqueta: c + ' de la ESO', icono: 'apunte', color: color(i) };
        }), 'course');
      },
      conectar: function () { conectarOpciones('course'); },
      valido: function () { return !!estado.course; },
    },

    bach_curso: {
      pregunta: '¿Qué curso de Bachillerato?',
      cuerpo: function () {
        return opciones(['1º', '2º'].map(function (c, i) {
          return { valor: c, etiqueta: c + ' de Bachillerato', icono: 'esquema', color: color(i) };
        }), 'course');
      },
      conectar: function () { conectarOpciones('course'); },
      valido: function () { return !!estado.course; },
    },

    bach_rama: {
      pregunta: '¿Y de qué rama?',
      cuerpo: function () {
        return opciones([
          ['Ciencias', 'diana'],
          ['Humanidades y CCSS', 'apunte'],
          ['Artes', 'presentacion'],
        ].map(function (o, i) {
          return { valor: o[0], etiqueta: o[0], icono: o[1], color: color(i + 2) };
        }), 'branch');
      },
      conectar: function () { conectarOpciones('branch'); },
      valido: function () { return !!estado.branch; },
    },

    fp_familia: {
      pregunta: '¿De qué familia profesional?',
      hint: 'Las 26 oficiales de España.',
      cuerpo: function () {
        return opciones(Studdy.fp.familias.map(function (f, i) {
          return { valor: f, etiqueta: f, icono: 'carpeta', color: color(i) };
        }), 'fp_family');
      },
      conectar: function () { conectarOpciones('fp_family', function (previo) {
        if (previo !== estado.fp_family) { estado.fp_grade = ''; estado.fp_cycle = ''; }
      }); },
      valido: function () { return !!estado.fp_family; },
    },

    fp_grado: {
      pregunta: '¿Qué grado?',
      cuerpo: function () {
        return opciones(Studdy.fp.grados(estado.fp_family).map(function (g, i) {
          return { valor: g, etiqueta: 'Grado ' + g, icono: 'escudo', color: color(i) };
        }), 'fp_grade');
      },
      conectar: function () { conectarOpciones('fp_grade', function (previo) {
        if (previo !== estado.fp_grade) estado.fp_cycle = '';
      }); },
      valido: function () { return !!estado.fp_grade; },
    },

    fp_ciclo: {
      pregunta: '¿Cuál es tu ciclo?',
      cuerpo: function () {
        var lista = Studdy.fp.ciclos(estado.fp_family, estado.fp_grade);

        if (!lista.length) {
          return '<div class="flow__fields"><input class="input" type="text" id="campo" ' +
            'spellcheck="false" maxlength="120" value="' +
            Studdy.escapeHtml(estado.fp_cycle) + '"></div>';
        }

        var esOtro = !!estado.fp_cycle && lista.indexOf(estado.fp_cycle) === -1;

        return opciones(lista.map(function (c, i) {
          return { valor: c, etiqueta: c, icono: 'apunte', color: color(i) };
        }), 'fp_cycle') +
        '<button class="row-card t-cyan' + (esOtro ? ' is-on' : '') + '" type="button" id="otro" ' +
          'style="margin-top:12px">' +
          '<span class="tile">' + Studdy.icons.mas + '</span>' +
          '<span class="row-card__body"><span class="row-card__label">' +
            'Mi ciclo no está aquí</span></span>' +
        '</button>' +
        '<div id="otro-wrap">' + (esOtro
          ? '<input class="input" type="text" id="campo" style="margin-top:12px" ' +
            'spellcheck="false" maxlength="120" value="' + Studdy.escapeHtml(estado.fp_cycle) + '">'
          : '') + '</div>';
      },
      conectar: function () {
        conectarOpciones('fp_cycle');
        conectarTexto('fp_cycle');

        var otro = Studdy.$('#otro', el.body);
        if (!otro) return;

        otro.addEventListener('click', function () {
          estado.fp_cycle = '';
          Studdy.$$('.row-card', el.body).forEach(function (c) { c.classList.remove('is-on'); });
          otro.classList.add('is-on');
          Studdy.$('#otro-wrap', el.body).innerHTML =
            '<input class="input" type="text" id="campo" style="margin-top:12px" ' +
            'spellcheck="false" maxlength="120">';
          conectarTexto('fp_cycle');
          Studdy.$('#campo', el.body).focus();
          revisar();
        });
      },
      valido: function () { return !!estado.fp_cycle; },
    },

    uni_carrera: {
      pregunta: '¿Qué carrera estudias?',
      cuerpo: function () {
        return '<div class="flow__fields"><input class="input" type="text" id="campo" ' +
          'spellcheck="false" maxlength="120" value="' +
          Studdy.escapeHtml(estado.university_degree) + '"></div>';
      },
      conectar: function () {
        conectarTexto('university_degree');
        Studdy.$('#campo', el.body).focus();
      },
      valido: function () { return !!estado.university_degree; },
    },

    uni_curso: {
      pregunta: '¿En qué curso vas?',
      cuerpo: function () {
        return opciones(['1º', '2º', '3º', '4º', '5º', '6º'].map(function (c, i) {
          return { valor: c, etiqueta: c + ' curso', icono: 'escudo', color: color(i) };
        }), 'course');
      },
      conectar: function () { conectarOpciones('course'); },
      valido: function () { return !!estado.course; },
    },

    asignaturas: {
      pregunta: 'Añade tus asignaturas',
      hint: 'Las que estés dando este curso. Cada apunte irá dentro de una.',
      nota: 'Podrás cambiarlas cuando quieras.',
      cuerpo: function () {
        return '<div class="subject-empty" id="vacio">Todavía no has añadido ninguna.</div>' +
          '<div class="subject-list" id="lista"></div>' +
          '<div class="subject-adder" id="adder">' +
            '<input class="input" type="text" id="campo" spellcheck="false" maxlength="80">' +
            '<button class="btn btn--accent" type="button" id="add">Añadir</button>' +
          '</div>' +
          '<button class="btn btn--soft btn--block" type="button" id="abrir">' +
            Studdy.icons.mas + 'Añadir asignatura</button>';
      },
      conectar: conectarAsignaturas,
      valido: function () { return estado.subjects.length > 0; },
      ultima: true,
    },
  };

  // Qué pantallas tocan según el nivel elegido.
  function secuencia() {
    var s = ['nombre', 'nivel'];

    if (estado.level === 'ESO') s.push('eso_curso');
    else if (estado.level === 'Bachillerato') s.push('bach_curso', 'bach_rama');
    else if (estado.level === 'FP') s.push('fp_familia', 'fp_grado', 'fp_ciclo');
    else if (estado.level === 'Universidad') s.push('uni_carrera', 'uni_curso');

    if (estado.level) s.push('asignaturas');
    return s;
  }

  // ------------------------------------------------------------------------
  // Trozos reutilizados
  // ------------------------------------------------------------------------

  function opciones(lista, campo) {
    return '<div class="flow__fields stagger">' + lista.map(function (o) {
      var marcada = estado[campo] === o.valor;
      return '<button class="row-card ' + o.color + (marcada ? ' is-on' : '') + '" ' +
        'type="button" data-valor="' + Studdy.escapeHtml(o.valor) + '">' +
        '<span class="tile">' + Studdy.icons[o.icono] + '</span>' +
        '<span class="row-card__body">' +
          '<span class="row-card__label">' + Studdy.escapeHtml(o.etiqueta) + '</span>' +
          (o.sub ? '<span class="row-card__sub">' + Studdy.escapeHtml(o.sub) + '</span>' : '') +
        '</span>' +
      '</button>';
    }).join('') + '</div>';
  }

  function conectarOpciones(campo, alCambiar) {
    Studdy.$$('[data-valor]', el.body).forEach(function (boton) {
      boton.addEventListener('click', function () {
        var previo = estado[campo];
        estado[campo] = boton.dataset.valor;
        if (alCambiar) alCambiar(previo);

        Studdy.$$('.row-card', el.body).forEach(function (c) { c.classList.remove('is-on'); });
        boton.classList.add('is-on');

        var otroWrap = Studdy.$('#otro-wrap', el.body);
        if (otroWrap) otroWrap.innerHTML = '';

        revisar();
      });
    });
  }

  function conectarTexto(campo) {
    var input = Studdy.$('#campo', el.body);
    if (!input) return;
    input.addEventListener('input', function () {
      estado[campo] = input.value.trim();
      revisar();
    });
    input.addEventListener('keydown', enterAvanza);
  }

  function enterAvanza(e) {
    if (e.key === 'Enter' && !el.next.disabled) {
      e.preventDefault();
      el.next.click();
    }
  }

  // ------------------------------------------------------------------------
  // Asignaturas
  // ------------------------------------------------------------------------

  function conectarAsignaturas() {
    var abrir = Studdy.$('#abrir', el.body);
    var adder = Studdy.$('#adder', el.body);
    var campo = Studdy.$('#campo', el.body);
    var add = Studdy.$('#add', el.body);
    var lista = Studdy.$('#lista', el.body);

    pintarAsignaturas();

    abrir.addEventListener('click', function () {
      adder.classList.add('is-open');
      abrir.hidden = true;
      campo.focus();
    });

    add.addEventListener('click', anadir);

    campo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); anadir(); }
    });

    lista.addEventListener('click', function (e) {
      var b = e.target.closest('[data-quitar]');
      if (!b) return;
      estado.subjects.splice(parseInt(b.dataset.quitar, 10), 1);
      pintarAsignaturas();
      revisar();
    });

    function anadir() {
      var nombre = campo.value.trim();
      if (!nombre) { campo.focus(); return; }

      var repetida = estado.subjects.some(function (x) {
        return x.toLowerCase() === nombre.toLowerCase();
      });
      if (!repetida) estado.subjects.push(nombre);

      campo.value = '';
      campo.focus();
      pintarAsignaturas();
      revisar();
    }

    function pintarAsignaturas() {
      Studdy.$('#vacio', el.body).hidden = estado.subjects.length > 0;
      lista.innerHTML = estado.subjects.map(function (n, i) {
        return '<span class="chip">' + Studdy.escapeHtml(n) +
          '<button class="chip__remove" type="button" data-quitar="' + i + '" ' +
          'aria-label="Quitar ' + Studdy.escapeHtml(n) + '">' + Studdy.icons.cerrar + '</button></span>';
      }).join('');
    }
  }

  // ------------------------------------------------------------------------
  // Motor
  // ------------------------------------------------------------------------

  function pintar() {
    var lista = secuencia();
    if (indice >= lista.length) indice = lista.length - 1;

    var p = PANTALLAS[lista[indice]];

    el.body.innerHTML =
      '<div class="flow__question">' +
        '<span class="bubble">' + Studdy.escapeHtml(p.pregunta) + '</span>' +
        (p.hint ? '<p class="flow__hint">' + Studdy.escapeHtml(p.hint) + '</p>' : '') +
      '</div>' +
      p.cuerpo();

    el.body.classList.remove('is-entering', 'is-back');
    void el.body.offsetWidth;
    el.body.classList.add(yendoAtras ? 'is-back' : 'is-entering');
    yendoAtras = false;

    p.conectar();

    el.fill.style.width = ((indice + 1) / lista.length) * 100 + '%';
    el.back.hidden = indice === 0;
    el.next.textContent = p.ultima ? 'Finalizar' : 'Continuar';

    el.note.hidden = !p.nota;
    if (p.nota) el.note.innerHTML = Studdy.icons.escudo + Studdy.escapeHtml(p.nota);

    el.error.innerHTML = '';
    revisar();
  }

  function revisar() {
    var p = PANTALLAS[secuencia()[indice]];
    el.next.disabled = !p.valido();
  }

  el.next.addEventListener('click', function () {
    var lista = secuencia();
    var p = PANTALLAS[lista[indice]];
    if (!p.valido()) return;

    if (indice < lista.length - 1) {
      indice++;
      pintar();
      window.scrollTo(0, 0);
      return;
    }

    finalizar();
  });

  el.back.addEventListener('click', function () {
    if (indice === 0) return;
    indice--;
    yendoAtras = true;
    pintar();
    window.scrollTo(0, 0);
  });

  // ------------------------------------------------------------------------
  // Guardado
  // ------------------------------------------------------------------------

  function finalizar() {
    el.error.innerHTML = '';
    el.next.disabled = true;
    el.back.disabled = true;
    el.next.innerHTML = '<span class="spinner"></span> Guardando…';

    guardar()
      .then(function () { window.location.href = 'app.html'; })
      .catch(function (err) {
        el.error.innerHTML = Studdy.errorHtml(err.message);
        el.next.disabled = false;
        el.back.disabled = false;
        el.next.textContent = 'Finalizar';
      });
  }

  function guardar() {
    var client;

    return Studdy.getClient()
      .then(function (c) { client = c; return c.auth.getUser(); })
      .then(function (res) {
        var user = res.data ? res.data.user : null;
        if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

        return client.from('profiles').upsert({
          id: user.id,
          name: estado.name,
          level: estado.level,
          course: estado.course || null,
          branch: estado.branch || null,
          fp_grade: estado.fp_grade || null,
          fp_family: estado.fp_family || null,
          fp_cycle: estado.fp_cycle || null,
          university_degree: estado.university_degree || null,
        }).select().single().then(function (out) {
          if (out.error) throw new Error(traducir(out.error));
          return user.id;
        });
      })
      .then(function (profileId) {
        var filas = estado.subjects.map(function (n) {
          return { profile_id: profileId, name: n };
        });
        return client.from('subjects').insert(filas).then(function (out) {
          if (out.error) throw new Error(traducir(out.error));
        });
      });
  }

  function traducir(error) {
    var m = error.message || 'No se han podido guardar tus datos.';
    if (/relation .* does not exist/i.test(m)) {
      return 'Las tablas todavía no existen en Supabase. Ejecuta supabase/schema.sql.';
    }
    if (/row-level security/i.test(m)) {
      return 'Supabase ha rechazado la escritura por las políticas RLS. ' +
        'Comprueba que has ejecutado supabase/schema.sql completo.';
    }
    return m;
  }

  // ------------------------------------------------------------------------

  Studdy.requireSession()
    .then(function (sesion) { return sesion ? Studdy.getProfile() : null; })
    .then(function (perfil) {
      if (perfil) { window.location.replace('app.html'); return; }
      el.boot.remove();
      pintar();
    })
    .catch(function (err) {
      el.boot.remove();
      pintar();
      el.error.innerHTML = Studdy.errorHtml(err.message);
    });
})();
