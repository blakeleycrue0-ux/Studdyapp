/* ==========================================================================
   Onboarding: una pregunta por pantalla.

   Regla que gobierna todo el archivo: ningún campo arranca con valor. No hay
   placeholders que parezcan datos, ni opciones preseleccionadas, ni ejemplos.
   El estado empieza vacío y solo se llena con lo que responde el usuario.

   Entre pregunta y pregunta hay pantallas que no piden nada: la bienvenida,
   el resumen de lo que va a poder hacer, la curva de su objetivo y la
   preparación final. Sirven para que el recorrido respire y para que lo que
   ha contestado tenga una consecuencia visible.

   Las pantallas que se muestran dependen del nivel: quien va a FP no ve las
   de Bachillerato y al revés.
   ========================================================================== */

(function () {
  'use strict';

  var estado = {
    name: '', level: '', course: '', branch: '',
    fp_grade: '', fp_family: '', fp_cycle: '',
    university_degree: '', subjects: [],
    goal_now: '', goal_target: '', goal_days: '',
  };

  var indice = 0;
  var yendoAtras = false;
  var preparando = false;

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

    bienvenida: {
      pregunta: 'Bienvenido a Studdy',
      hint: 'Un minuto de preguntas y la IA sabrá a qué nivel escribirte. ' +
        'Ni por encima ni por debajo de tu curso.',
      nota: 'No pedimos nada del colegio. Solo lo que nos cuentes tú.',
      cta: 'Empezar',
      sinAtras: true,
      cuerpo: function () {
        return montaje() + bullets([
          ['subir', 't-violet', 'Subes un tema', 'PDF o texto pegado'],
          ['chispa', 't-amber', 'La IA lo trabaja', 'A la dificultad de tu curso'],
          ['diana', 't-green', 'Tú lo estudias', 'Esquema, tarjetas, examen'],
        ]);
      },
      conectar: function () {},
      valido: function () { return true; },
    },

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

    saludo: {
      pregunta: function () { return 'Encantado, ' + primerNombre() + '.'; },
      hint: 'Esto es lo que vas a poder sacar de cada apunte que subas.',
      cta: 'Suena bien',
      cuerpo: function () {
        return bullets([
          ['esquema', 't-violet', 'Esquemas', 'El tema ordenado y jerarquizado'],
          ['flashcards', 't-blue', 'Flashcards', 'Con repaso espaciado día a día'],
          ['examen', 't-coral', 'Exámenes', 'Test y desarrollo, con corrección'],
          ['presentacion', 't-amber', 'Presentaciones', 'Listas para exponer en clase'],
          ['chat', 't-green', 'Un chat que ya te conoce', 'Sabe tu curso y tus asignaturas'],
        ]);
      },
      conectar: function () {},
      valido: function () { return true; },
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
    },

    // --- Objetivo -----------------------------------------------------------

    nota_actual: {
      pregunta: '¿Por qué nota andas ahora?',
      hint: 'Tu media aproximada. Nadie más la va a ver, y sirve para saber ' +
        'desde dónde partes.',
      cuerpo: function () { return notas(1, 10, 'goal_now'); },
      conectar: function () { conectarNotas('goal_now', function () {
        // Si la meta se queda por debajo de la nota de partida, se descarta.
        if (estado.goal_target && Number(estado.goal_target) <= Number(estado.goal_now)) {
          estado.goal_target = '';
        }
      }); },
      valido: function () { return !!estado.goal_now; },
    },

    nota_meta: {
      pregunta: '¿A qué nota quieres llegar?',
      hint: function () {
        return 'Tiene que ser mayor que ' + estado.goal_now + ', que es de donde sales.';
      },
      cuerpo: function () {
        return notas(Number(estado.goal_now) + 1, 10, 'goal_target');
      },
      conectar: function () { conectarNotas('goal_target'); },
      valido: function () { return !!estado.goal_target; },
    },

    dedicacion: {
      pregunta: '¿Cuántos días a la semana vas a estudiar?',
      hint: 'Sé realista. Es mejor tres días de verdad que siete de mentira.',
      cuerpo: function () {
        return opciones([
          ['2', 'Dos días', 'Fin de semana y poco más', 'reloj'],
          ['3', 'Tres días', 'Un rato entre semana', 'reloj'],
          ['5', 'Cinco días', 'De lunes a viernes', 'rayo'],
          ['7', 'Todos los días', 'Sin excepción', 'fuego'],
        ].map(function (o, i) {
          return { valor: o[0], etiqueta: o[1], sub: o[2], icono: o[3], color: color(i + 1) };
        }), 'goal_days');
      },
      conectar: function () { conectarOpciones('goal_days'); },
      valido: function () { return !!estado.goal_days; },
    },

    grafica: {
      pregunta: function () {
        return 'De ' + estado.goal_now + ' a ' + estado.goal_target + ', ' +
          primerNombre() + '.';
      },
      hint: function () {
        return 'Estudiando ' + textoDias() + ', el salto entra en unas ' +
          plan().semanas + ' semanas.';
      },
      nota: 'La curva es una estimación con tus dos números, no una promesa.',
      cta: 'Me comprometo',
      cuerpo: function () {
        var p = plan();
        return '<div class="goal-card">' +
          '<div class="goal-card__head">' +
            '<span class="pill pill--accent">' + Studdy.icons.diana + 'Tu objetivo</span>' +
            '<span class="goal-card__fecha">' + Studdy.escapeHtml(p.fecha) + '</span>' +
          '</div>' +
          Studdy.charts.curva({
            desde: Number(estado.goal_now),
            hasta: Number(estado.goal_target),
            etiquetaIni: 'Ahora ' + estado.goal_now,
            etiquetaFin: estado.goal_target,
            pasos: ['Hoy', 'En ' + p.semanas + ' semanas'],
            alt: 'Curva estimada de ' + estado.goal_now + ' a ' + estado.goal_target,
          }) +
        '</div>' +
        bullets([
          ['reloj', 't-blue', textoDias(true), 'La cadencia que has elegido'],
          ['flashcards', 't-violet', 'Repaso espaciado', 'Studdy te dirá qué tarjetas tocan cada día'],
          ['fuego', 't-coral', 'Racha real', 'Cuenta los días que de verdad has trabajado'],
        ]);
      },
      conectar: function () {},
      valido: function () { return true; },
    },

    preparando: {
      pregunta: 'Preparando tu Studdy',
      sinAtras: true,
      sinBoton: true,
      cuerpo: function () {
        return '<div class="setup">' +
          '<div class="setup__pct"><span id="pct">0</span><i>%</i></div>' +
          '<div class="progress progress--lg">' +
            '<div class="progress__fill" id="setup-fill" style="width:0%"></div>' +
          '</div>' +
          '<ol class="setup__list" id="pasos">' +
            pasosPreparacion().map(function (p, i) {
              return '<li class="setup__step" data-paso="' + i + '">' +
                '<span class="setup__mark"><i>' + (i + 1) + '</i>' + Studdy.icons.ok + '</span>' +
                '<span class="setup__text">' + Studdy.escapeHtml(p) + '</span>' +
              '</li>';
            }).join('') +
          '</ol>' +
        '</div>';
      },
      conectar: arrancarPreparacion,
      valido: function () { return true; },
    },
  };

  // Qué pantallas tocan según el nivel elegido.
  function secuencia() {
    var s = ['bienvenida', 'nombre', 'saludo', 'nivel'];

    if (estado.level === 'ESO') s.push('eso_curso');
    else if (estado.level === 'Bachillerato') s.push('bach_curso', 'bach_rama');
    else if (estado.level === 'FP') s.push('fp_familia', 'fp_grado', 'fp_ciclo');
    else if (estado.level === 'Universidad') s.push('uni_carrera', 'uni_curso');

    // El tramo final entra entero en cuanto hay nivel: si se fuera añadiendo
    // a medida que responde, la barra de progreso llegaría al 100% a mitad de
    // camino y luego retrocedería. Ninguna de estas pantallas es alcanzable
    // sin haber contestado la anterior, porque el botón se queda bloqueado.
    if (estado.level) {
      s.push('asignaturas', 'nota_actual', 'nota_meta', 'dedicacion',
             'grafica', 'preparando');
    }

    return s;
  }

  // ------------------------------------------------------------------------
  // El objetivo, calculado
  // ------------------------------------------------------------------------

  // Cuántas semanas para pasar de una nota a otra con N días de estudio a la
  // semana. Es una regla de tres, no un modelo: cada décima de salto pide
  // aproximadamente una sesión y media de trabajo.
  function plan() {
    var salto = Math.max(0.5, Number(estado.goal_target) - Number(estado.goal_now));
    var dias = Math.max(1, Number(estado.goal_days) || 3);
    var semanas = Math.round((salto * 15) / dias);

    semanas = Math.min(24, Math.max(3, semanas));

    var fin = new Date();
    fin.setDate(fin.getDate() + semanas * 7);

    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    return {
      semanas: semanas,
      fecha: fin.getDate() + ' ' + MESES[fin.getMonth()] + ' ' + fin.getFullYear(),
      iso: fin.toISOString().slice(0, 10),
    };
  }

  function textoDias(mayus) {
    var d = Number(estado.goal_days);
    var t = d === 7 ? 'todos los días' : d + ' días a la semana';
    return mayus ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }

  function primerNombre() {
    return estado.name.split(/\s+/)[0] || estado.name;
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

  // Rejilla de notas: botones redondos del 1 al 10.
  function notas(desde, hasta, campo) {
    var html = '';
    for (var v = desde; v <= hasta; v++) {
      html += '<button class="grade' + (estado[campo] === String(v) ? ' is-on' : '') + '" ' +
        'type="button" data-nota="' + v + '">' + v + '</button>';
    }
    return '<div class="grade-grid">' + html + '</div>';
  }

  function conectarNotas(campo, alCambiar) {
    Studdy.$$('[data-nota]', el.body).forEach(function (boton) {
      boton.addEventListener('click', function () {
        estado[campo] = boton.dataset.nota;
        if (alCambiar) alCambiar();
        Studdy.$$('.grade', el.body).forEach(function (g) { g.classList.remove('is-on'); });
        boton.classList.add('is-on');
        revisar();
      });
    });
  }

  // Filas con icono para las pantallas que no preguntan nada.
  function bullets(lista) {
    return '<ul class="perks stagger">' + lista.map(function (b) {
      return '<li class="perk ' + b[1] + '">' +
        '<span class="tile">' + Studdy.icons[b[0]] + '</span>' +
        '<span class="perk__body">' +
          '<span class="perk__title">' + Studdy.escapeHtml(b[2]) + '</span>' +
          '<span class="perk__text">' + Studdy.escapeHtml(b[3]) + '</span>' +
        '</span>' +
      '</li>';
    }).join('') + '</ul>';
  }

  // Tres fichas apiladas que giran: el adorno de la bienvenida.
  function montaje() {
    return '<div class="stack" aria-hidden="true">' +
      '<span class="stack__card stack__card--3 t-coral">' + Studdy.icons.examen + '</span>' +
      '<span class="stack__card stack__card--2 t-blue">' + Studdy.icons.flashcards + '</span>' +
      '<span class="stack__card stack__card--1">' + Studdy.icons.esquema + '</span>' +
    '</div>';
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

  function texto(v) { return typeof v === 'function' ? v() : v; }

  function pintar() {
    var lista = secuencia();
    if (indice >= lista.length) indice = lista.length - 1;

    var p = PANTALLAS[lista[indice]];
    var hint = texto(p.hint);

    el.body.innerHTML =
      '<div class="flow__question">' +
        '<span class="bubble">' + Studdy.escapeHtml(texto(p.pregunta)) + '</span>' +
        (hint ? '<p class="flow__hint">' + Studdy.escapeHtml(hint) + '</p>' : '') +
      '</div>' +
      p.cuerpo();

    el.body.classList.remove('is-entering', 'is-back');
    void el.body.offsetWidth;
    el.body.classList.add(yendoAtras ? 'is-back' : 'is-entering');
    yendoAtras = false;

    p.conectar();

    el.fill.style.width = ((indice + 1) / lista.length) * 100 + '%';
    el.back.hidden = indice === 0 || !!p.sinAtras;
    el.next.hidden = !!p.sinBoton;
    el.next.textContent = p.cta || 'Continuar';

    var nota = texto(p.nota);
    el.note.hidden = !nota;
    if (nota) el.note.innerHTML = Studdy.icons.escudo + Studdy.escapeHtml(nota);

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
    }
  });

  el.back.addEventListener('click', function () {
    if (indice === 0 || preparando) return;
    indice--;
    yendoAtras = true;
    pintar();
    window.scrollTo(0, 0);
  });

  // ------------------------------------------------------------------------
  // Preparación final
  //
  // El porcentaje no es decorativo: cada tramo se cierra cuando termina de
  // verdad el paso que lo acompaña. Solo se le pone un mínimo de tiempo para
  // que se pueda leer lo que está pasando.
  // ------------------------------------------------------------------------

  function pasosPreparacion() {
    var n = estado.subjects.length;
    return [
      'Creando tu perfil',
      'Guardando ' + n + (n === 1 ? ' asignatura' : ' asignaturas'),
      'Ajustando la IA a ' + nivelCorto(),
      'Dejándote el inicio listo',
    ];
  }

  function nivelCorto() {
    if (estado.level === 'ESO') return estado.course + ' de la ESO';
    if (estado.level === 'Bachillerato') return estado.course + ' de Bachillerato';
    if (estado.level === 'FP') return 'FP de grado ' + estado.fp_grade;
    if (estado.level === 'Universidad') return estado.university_degree;
    return estado.level;
  }

  var TRAMOS = [22, 58, 80, 100];

  function arrancarPreparacion() {
    if (preparando) return;
    preparando = true;

    var pct = Studdy.$('#pct', el.body);
    var fill = Studdy.$('#setup-fill', el.body);
    var pasos = Studdy.$$('.setup__step', el.body);

    var actual = 0;
    pasos[0].classList.add('is-doing');

    function hasta(objetivo) {
      return new Promise(function (listo) {
        var t0 = performance.now();
        var desde = actual;
        (function paso(t) {
          var k = Math.min(1, (t - t0) / 520);
          actual = desde + (objetivo - desde) * k;
          pct.textContent = Math.round(actual);
          fill.style.width = actual + '%';
          if (k < 1) requestAnimationFrame(paso); else listo();
        })(t0);
      });
    }

    function cerrar(i) {
      pasos[i].classList.remove('is-doing');
      pasos[i].classList.add('is-done');
      if (pasos[i + 1]) pasos[i + 1].classList.add('is-doing');
      return hasta(TRAMOS[i]);
    }

    var client, userId;

    Studdy.getClient()
      .then(function (c) { client = c; return c.auth.getUser(); })
      .then(function (res) {
        var user = res.data ? res.data.user : null;
        if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');
        userId = user.id;
        return guardarPerfil(client, user.id);
      })
      .then(function () { return cerrar(0); })
      .then(function () { return guardarAsignaturas(client, userId); })
      .then(function () { return cerrar(1); })
      .then(function () { return cerrar(2); })
      .then(function () { return cerrar(3); })
      .then(function () {
        return new Promise(function (r) { setTimeout(r, 380); });
      })
      .then(function () { window.location.href = 'app.html'; })
      .catch(function (err) {
        preparando = false;
        el.error.innerHTML = Studdy.errorHtml(err.message);
        el.next.hidden = false;
        el.next.disabled = false;
        el.next.textContent = 'Reintentar';
        el.next.onclick = function () {
          el.next.onclick = null;
          el.error.innerHTML = '';
          pintar();
        };
      });
  }

  // ------------------------------------------------------------------------
  // Guardado
  // ------------------------------------------------------------------------

  function guardarPerfil(client, id) {
    var p = plan();

    var base = {
      id: id,
      name: estado.name,
      level: estado.level,
      course: estado.course || null,
      branch: estado.branch || null,
      fp_grade: estado.fp_grade || null,
      fp_family: estado.fp_family || null,
      fp_cycle: estado.fp_cycle || null,
      university_degree: estado.university_degree || null,
    };

    var conObjetivo = Object.assign({}, base, {
      goal_now: Number(estado.goal_now),
      goal_target: Number(estado.goal_target),
      goal_days: Number(estado.goal_days),
      goal_date: p.iso,
    });

    // Las columnas del objetivo llegaron en la migración 03. Si todavía no se
    // ha ejecutado, el perfil se guarda igual sin ellas en vez de romper.
    return escribirPerfil(client, conObjetivo).catch(function (err) {
      if (!/column .* does not exist|could not find the .* column/i.test(err.message)) throw err;
      return escribirPerfil(client, base);
    });
  }

  function escribirPerfil(client, fila) {
    return client.from('profiles').upsert(fila).select().single().then(function (out) {
      if (out.error) throw new Error(traducir(out.error));
    });
  }

  function guardarAsignaturas(client, id) {
    var filas = estado.subjects.map(function (n) {
      return { profile_id: id, name: n };
    });
    return client.from('subjects').insert(filas).then(function (out) {
      if (out.error) throw new Error(traducir(out.error));
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
