/* ==========================================================================
   Presentaciones.

   Diapositivas con diseño real (cuatro temas y cinco maquetaciones), pensadas
   para exponer en clase, y exportables a PowerPoint y PDF.

   Se generan desde un apunte —como pestaña del cuaderno— o desde un tema
   escrito a mano, sin apunte de por medio.
   ========================================================================== */

Studdy.views.presentations = (function () {
  'use strict';

  // Los mismos valores están en app.css como variables --sl-*, para que la
  // vista previa y el .pptx exportado no se separen nunca.
  var TEMAS = [
    { id: 'th-marino', nombre: 'Marino', bg: '0B1A3D', bg2: '04091A', ink: 'FFFFFF', soft: 'A8BEEA', acc: '86A6F2' },
    { id: 'th-noche',  nombre: 'Noche',  bg: '0A0B0E', bg2: '000000', ink: 'FFFFFF', soft: '9EA2AC', acc: '86A6F2' },
    { id: 'th-papel',  nombre: 'Papel',  bg: 'FFFFFF', bg2: 'EFF1F5', ink: '06070A', soft: '5A5D66', acc: '1B3B86' },
    { id: 'th-hueso',  nombre: 'Hueso',  bg: 'F5F3EE', bg2: 'E7E4DB', ink: '14150F', soft: '5F6055', acc: '1B3B86' },
  ];

  var CLAVE_TEMA = 'studdy:tema-diapos';

  function temaGuardado() {
    var id;
    try { id = localStorage.getItem(CLAVE_TEMA); } catch (e) { /* modo privado */ }
    return TEMAS.filter(function (t) { return t.id === id; })[0] || TEMAS[0];
  }

  function guardarTema(id) {
    try { localStorage.setItem(CLAVE_TEMA, id); } catch (e) { /* modo privado */ }
  }

  // ------------------------------------------------------------------------
  // Pestaña dentro del cuaderno
  // ------------------------------------------------------------------------

  async function renderPanel(panel, apunte) {
    panel.innerHTML = Studdy.loadingHtml('Cargando la presentación…');

    var client = await Studdy.getClient();
    var res = await client
      .from('presentations')
      .select('*')
      .eq('note_id', apunte.id)
      .order('created_at', { ascending: false });

    if (res.error) throw new Error(res.error.message);
    var guardadas = res.data || [];

    if (!guardadas.length) {
      panel.innerHTML = Studdy.views.notebook.vacio(
        Studdy.icons.presentacion,
        'Todavía no hay presentación',
        'Diapositivas con diseño, sacadas de este apunte y listas para exponer.',
        'Generar presentación'
      ) + '<div id="err" style="margin-top:14px"></div>';

      conectarGenerar(panel, apunte);
      return;
    }

    var actual = guardadas[0];

    panel.innerHTML =
      (guardadas.length > 1 ? selectorVersion(guardadas, actual.id) : '') +
      '<div id="deck"></div>' +
      '<div style="margin-top:16px;text-align:center">' +
        '<button class="btn btn--ghost btn--sm" id="otra">Generar otra versión</button>' +
        '<div id="err" style="margin-top:12px"></div>' +
      '</div>';

    montarDeck(Studdy.$('#deck', panel), actual.content_json || {});
    conectarGenerar(panel, apunte, '#otra');

    var lista = Studdy.$('#version', panel);
    if (lista) {
      lista.addEventListener('change', function () {
        var elegida = guardadas.filter(function (p) { return p.id === lista.value; })[0];
        if (elegida) montarDeck(Studdy.$('#deck', panel), elegida.content_json || {});
      });
    }
  }

  function selectorVersion(guardadas, actualId) {
    return (
      '<label class="field" style="margin-bottom:14px;display:block">' +
        '<span class="field__label">Versión</span>' +
        '<select class="select" id="version">' +
        guardadas.map(function (p, i) {
          var c = p.content_json || {};
          return '<option value="' + p.id + '"' + (p.id === actualId ? ' selected' : '') + '>' +
            Studdy.escapeHtml(c.title || 'Presentación') + ' · ' +
            Studdy.formatDate(p.created_at) + (i === 0 ? ' (última)' : '') + '</option>';
        }).join('') +
        '</select>' +
      '</label>'
    );
  }

  // ------------------------------------------------------------------------
  // Desde un tema suelto
  // ------------------------------------------------------------------------

  function renderTopic(vista) {
    vista.innerHTML =
      Studdy.app.volver('#/inicio', 'Inicio') +
      Studdy.app.cabecera('Presentación de un tema',
        'Sin apunte de por medio: escribe el tema y monto las diapositivas.') +
      '<div class="block">' +
        '<label class="field" style="margin-bottom:18px;display:block">' +
          '<span class="field__label">Tema</span>' +
          '<input class="input" type="text" id="topic" maxlength="160" spellcheck="false">' +
        '</label>' +
        '<button class="btn btn--primary btn--block" id="generar" disabled>' +
          'Generar presentación</button>' +
        '<div id="err" style="margin-top:14px"></div>' +
      '</div>';

    var input = Studdy.$('#topic', vista);
    var boton = Studdy.$('#generar', vista);
    var err = Studdy.$('#err', vista);

    input.addEventListener('input', function () { boton.disabled = !input.value.trim(); });

    boton.addEventListener('click', function () {
      err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generarDesdeTema(input.value.trim())
        .then(function (id) { Studdy.app.navigate('#/p/' + id); })
        .catch(function (e) {
          err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = 'Generar presentación';
        });
    });

    input.focus();
  }

  // ------------------------------------------------------------------------
  // Presentación suelta
  // ------------------------------------------------------------------------

  async function render(vista, partes) {
    var client = await Studdy.getClient();
    var res = await client.from('presentations').select('*').eq('id', partes[0]).maybeSingle();
    if (res.error) throw new Error(res.error.message);

    if (!res.data) {
      vista.innerHTML = Studdy.app.volver('#/inicio', 'Inicio') +
        Studdy.errorHtml('Esa presentación no existe o ya no está disponible.');
      return;
    }

    var contenido = res.data.content_json || {};

    vista.innerHTML =
      Studdy.app.volver('#/inicio', 'Inicio') +
      Studdy.app.cabecera(contenido.title || res.data.topic || 'Presentación') +
      '<div id="deck"></div>';

    montarDeck(Studdy.$('#deck', vista), contenido);
  }

  // ------------------------------------------------------------------------
  // El pase de diapositivas
  // ------------------------------------------------------------------------

  function montarDeck(contenedor, contenido) {
    var diapositivas = contenido.slides || [];
    if (!diapositivas.length) {
      contenedor.innerHTML = Studdy.errorHtml('Esta presentación no tiene diapositivas.');
      return;
    }

    var tema = temaGuardado();
    var indice = 0;

    contenedor.innerHTML =
      '<div class="theme-row" id="temas">' +
        TEMAS.map(function (t) {
          return '<button class="theme-dot ' + t.id + (t.id === tema.id ? ' is-on' : '') +
            '" data-tema="' + t.id + '" title="' + t.nombre + '" aria-label="Tema ' + t.nombre + '"></button>';
        }).join('') +
      '</div>' +
      '<div class="deck-frame ' + tema.id + '" id="frame"></div>' +
      '<div class="carousel__nav">' +
        '<button class="icon-btn" id="prev" aria-label="Anterior">' + Studdy.icons.chevronIzq + '</button>' +
        '<span class="carousel__count" id="count"></span>' +
        '<button class="icon-btn" id="next" aria-label="Siguiente">' + Studdy.icons.chevron + '</button>' +
      '</div>' +
      '<div class="thumbs ' + tema.id + '" id="thumbs"></div>' +
      '<div class="action-row" style="margin-top:14px">' +
        '<button class="btn btn--soft btn--sm" id="pptx">Descargar PowerPoint</button>' +
        '<button class="btn btn--soft btn--sm" id="pdf">Descargar PDF</button>' +
      '</div>' +
      '<div id="exp-err" style="margin-top:12px"></div>';

    var frame = Studdy.$('#frame', contenedor);
    var thumbs = Studdy.$('#thumbs', contenedor);
    var contador = Studdy.$('#count', contenedor);
    var anterior = Studdy.$('#prev', contenedor);
    var siguiente = Studdy.$('#next', contenedor);

    function pintar() {
      frame.innerHTML = htmlDiapositiva(diapositivas[indice], indice, diapositivas.length);
      contador.textContent = (indice + 1) + ' / ' + diapositivas.length;
      anterior.disabled = indice === 0;
      siguiente.disabled = indice === diapositivas.length - 1;

      Studdy.$$('.thumb', thumbs).forEach(function (t, i) {
        t.classList.toggle('is-on', i === indice);
      });
    }

    thumbs.innerHTML = diapositivas.map(function (d, i) {
      return '<button class="thumb" data-i="' + i + '" aria-label="Diapositiva ' + (i + 1) + '">' +
        '<span></span><b></b></button>';
    }).join('');

    thumbs.addEventListener('click', function (e) {
      var t = e.target.closest('.thumb');
      if (!t) return;
      indice = parseInt(t.dataset.i, 10);
      pintar();
    });

    anterior.addEventListener('click', function () { if (indice > 0) { indice--; pintar(); } });
    siguiente.addEventListener('click', function () {
      if (indice < diapositivas.length - 1) { indice++; pintar(); }
    });

    Studdy.$('#temas', contenedor).addEventListener('click', function (e) {
      var b = e.target.closest('[data-tema]');
      if (!b) return;
      tema = TEMAS.filter(function (t) { return t.id === b.dataset.tema; })[0];
      guardarTema(tema.id);

      TEMAS.forEach(function (t) {
        frame.classList.remove(t.id);
        thumbs.classList.remove(t.id);
      });
      frame.classList.add(tema.id);
      thumbs.classList.add(tema.id);

      Studdy.$$('[data-tema]', contenedor).forEach(function (x) {
        x.classList.toggle('is-on', x.dataset.tema === tema.id);
      });
    });

    Studdy.$('#pptx', contenedor).addEventListener('click', function () {
      exportar(this, Studdy.$('#exp-err', contenedor), function () {
        return exportarPptx(contenido, diapositivas, tema);
      });
    });

    Studdy.$('#pdf', contenedor).addEventListener('click', function () {
      exportarPdf(contenido, diapositivas, tema);
    });

    pintar();
  }

  function htmlDiapositiva(d, i, total) {
    var layout = ['portada', 'puntos', 'columnas', 'destacado', 'cierre'].indexOf(d.layout) >= 0
      ? d.layout : (i === 0 ? 'portada' : 'puntos');

    var puntos = (Array.isArray(d.points) ? d.points : []).map(function (p) {
      return '<li>' + Studdy.escapeHtml(p) + '</li>';
    }).join('');

    var eyebrow = layout === 'cierre' ? 'Para terminar'
      : (layout === 'destacado' ? 'Idea clave' : '');

    return (
      '<div class="slide slide--' + layout + '">' +
        (layout === 'portada' ? '<span class="slide__rule"></span>' : '') +
        (eyebrow ? '<p class="slide__eyebrow">' + eyebrow + '</p>' : '') +
        '<h2 class="slide__title">' + Studdy.escapeHtml(d.title) + '</h2>' +
        '<ul class="slide__points">' + puntos + '</ul>' +
        (layout === 'portada' ? '' : '<span class="slide__num">' + (i + 1) + '/' + total + '</span>') +
      '</div>'
    );
  }

  // ------------------------------------------------------------------------
  // Exportación
  // ------------------------------------------------------------------------

  function exportar(boton, err, tarea) {
    var etiqueta = boton.textContent;
    err.innerHTML = '';
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner"></span> Preparando…';

    Promise.resolve()
      .then(tarea)
      .catch(function (e) { err.innerHTML = Studdy.errorHtml(e.message); })
      .then(function () {
        boton.disabled = false;
        boton.textContent = etiqueta;
      });
  }

  // PptxGenJS se carga solo cuando hace falta, no en cada visita a la app.
  function cargarPptx() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);

    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js';
      s.onload = function () {
        if (window.PptxGenJS) resolve(window.PptxGenJS);
        else reject(new Error('No se ha podido cargar el generador de PowerPoint.'));
      };
      s.onerror = function () {
        reject(new Error('No se ha podido cargar el generador de PowerPoint. Comprueba tu conexión.'));
      };
      document.head.appendChild(s);
    });
  }

  async function exportarPptx(contenido, diapositivas, tema) {
    var Pptx = await cargarPptx();
    var pptx = new Pptx();

    pptx.layout = 'LAYOUT_16x9';
    pptx.title = contenido.title || 'Presentación';

    diapositivas.forEach(function (d, i) {
      var layout = d.layout || (i === 0 ? 'portada' : 'puntos');
      var slide = pptx.addSlide();
      slide.background = { color: tema.bg };

      // Círculo de acento, como en pantalla
      slide.addShape(pptx.ShapeType.ellipse, {
        x: 7.6, y: 3.6, w: 3.2, h: 3.2,
        fill: { color: tema.acc, transparency: 90 },
        line: { color: tema.acc, transparency: 100 },
      });

      var puntos = Array.isArray(d.points) ? d.points : [];

      if (layout === 'portada') {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y: 1.9, w: 1.2, h: 0.14,
          fill: { color: tema.acc }, line: { color: tema.acc },
        });
        slide.addText(d.title || '', {
          x: 0.6, y: 2.2, w: 8.4, h: 1.6,
          fontSize: 40, bold: true, color: tema.ink, fontFace: 'Arial',
        });
        slide.addText(puntos.join('  ·  '), {
          x: 0.6, y: 3.8, w: 8.4, h: 0.9,
          fontSize: 18, color: tema.soft, fontFace: 'Arial',
        });
        return;
      }

      if (layout === 'destacado') {
        slide.addText('IDEA CLAVE', {
          x: 0.6, y: 0.7, w: 8.4, h: 0.4,
          fontSize: 12, bold: true, color: tema.acc, charSpacing: 2, fontFace: 'Arial',
        });
        slide.addText(d.title || '', {
          x: 0.6, y: 1.3, w: 8.4, h: 0.8,
          fontSize: 20, color: tema.soft, fontFace: 'Arial',
        });
        slide.addText(puntos.join('\n'), {
          x: 0.8, y: 2.2, w: 8, h: 2.2,
          fontSize: 30, bold: true, color: tema.ink, align: 'center', fontFace: 'Arial',
        });
        return;
      }

      slide.addText(d.title || '', {
        x: 0.6, y: 0.6, w: 8.4, h: 1,
        fontSize: 28, bold: true, color: tema.ink, fontFace: 'Arial',
      });

      var vinetas = puntos.map(function (p) {
        return { text: p, options: { bullet: { code: '25CF' }, color: tema.ink, fontSize: 16, breakLine: true } };
      });

      if (layout === 'columnas' && puntos.length >= 4) {
        var mitad = Math.ceil(puntos.length / 2);
        slide.addText(vinetas.slice(0, mitad), { x: 0.6, y: 1.9, w: 4.1, h: 3, fontFace: 'Arial' });
        slide.addText(vinetas.slice(mitad), { x: 5, y: 1.9, w: 4.1, h: 3, fontFace: 'Arial' });
      } else {
        slide.addText(vinetas, { x: 0.6, y: 1.9, w: 8.4, h: 3, fontFace: 'Arial' });
      }

      slide.addText((i + 1) + '/' + diapositivas.length, {
        x: 8.4, y: 4.9, w: 1, h: 0.3,
        fontSize: 10, color: tema.soft, align: 'right', fontFace: 'Arial',
      });
    });

    await pptx.writeFile({ fileName: nombreArchivo(contenido) + '.pptx' });
  }

  // El PDF se saca por la impresión del navegador: en el móvil aparece como
  // "Guardar en Archivos / PDF" y evita cargar otra librería pesada.
  function exportarPdf(contenido, diapositivas, tema) {
    var capa = document.createElement('div');
    capa.id = 'print-slides';
    capa.className = tema.id;
    capa.innerHTML = diapositivas.map(function (d, i) {
      return '<div class="print-page">' + htmlDiapositiva(d, i, diapositivas.length) + '</div>';
    }).join('');

    document.body.appendChild(capa);
    document.body.classList.add('is-printing');

    var limpiar = function () {
      document.body.classList.remove('is-printing');
      capa.remove();
      window.removeEventListener('afterprint', limpiar);
    };

    window.addEventListener('afterprint', limpiar);
    window.print();
    // Safari en iOS no siempre lanza afterprint; se limpia igualmente.
    window.setTimeout(limpiar, 60000);
  }

  function nombreArchivo(contenido) {
    return String(contenido.title || 'presentacion')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim().replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 60) || 'presentacion';
  }

  // ------------------------------------------------------------------------
  // Generación
  // ------------------------------------------------------------------------

  function conectarGenerar(panel, apunte, selectorBoton) {
    var boton = Studdy.$(selectorBoton || '#generar', panel);
    if (!boton) return;

    var etiqueta = boton.textContent;

    boton.addEventListener('click', function () {
      var err = Studdy.$('#err', panel);
      if (err) err.innerHTML = '';
      boton.disabled = true;
      boton.innerHTML = '<span class="spinner"></span> Generando…';

      generarDesdeApunte(apunte)
        .then(function () {
          Studdy.app.bumpCount(apunte.id, 'presentations');
          Studdy.app.navigate('#/n/' + apunte.id + '/presentacion');
        })
        .catch(function (e) {
          if (err) err.innerHTML = Studdy.errorHtml(e.message);
          boton.disabled = false;
          boton.textContent = etiqueta;
        });
    });
  }

  async function generarDesdeApunte(apunte) {
    if (!apunte) throw new Error('Ese apunte no existe o ya no está disponible.');
    var r = await Studdy.ai('presentation', { content: apunte.content });
    return guardar({
      note_id: apunte.id,
      topic: null,
      content_json: { title: r.title, slides: r.slides },
    });
  }

  async function generarDesdeTema(tema) {
    var r = await Studdy.ai('presentation', { topic: tema });
    return guardar({
      note_id: null,
      topic: tema,
      content_json: { title: r.title, slides: r.slides },
    });
  }

  async function guardar(fila) {
    var client = await Studdy.getClient();
    var userRes = await client.auth.getUser();
    var user = userRes.data ? userRes.data.user : null;
    if (!user) throw new Error('Tu sesión ha caducado. Vuelve a entrar.');

    fila.profile_id = user.id;
    var out = await client.from('presentations').insert(fila).select('id').single();
    if (out.error) throw new Error(out.error.message);
    return out.data.id;
  }

  return {
    renderPanel: renderPanel,
    renderTopic: renderTopic,
    render: render,
  };
})();
