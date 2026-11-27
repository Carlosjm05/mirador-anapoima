/* Mirador de Anapoima: comportamiento compartido por todas las páginas.
   Cada bloque revisa si su sección existe en la página antes de arrancar. */
(function () {
  'use strict';
  var WA = '573183334706';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var M = function (n) { return '$' + Math.round(n).toLocaleString('es-CO'); };
  var num = function (v) { return Number(String(v).replace(/\D/g, '')) || 0; };
  var celular = function (v) { var d = String(v).replace(/\D/g, ''); if (d.length === 12 && d.indexOf('57') === 0) d = d.slice(2); return d.length === 10 && d[0] === '3' ? d : ''; };
  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var guardar = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var leer = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };

  /* ---------- Medición y WhatsApp ---------- */
  window.dataLayer = window.dataLayer || [];
  var evento = function (nombre, datos) { var o = { event: nombre }; for (var k in (datos || {})) o[k] = datos[k]; window.dataLayer.push(o); };
  var campana = (function () {
    try {
      var q = new URLSearchParams(location.search);
      var f = q.get('utm_source'), c = q.get('utm_campaign');
      if (q.get('fbclid') && !f) f = 'facebook';
      if (q.get('gclid') && !f) f = 'google';
      if (f) { try { sessionStorage.setItem('mirador-ref', f + (c ? ' / ' + c : '')); } catch (e) {} }
      try { return sessionStorage.getItem('mirador-ref') || ''; } catch (e) { return f || ''; }
    } catch (e) { return ''; }
  })();
  var wa = function (txt) { return 'https://wa.me/' + WA + '?text=' + encodeURIComponent(txt + (campana ? '\n(Ref: ' + campana + ')' : '')); };
  $$('[data-wa]').forEach(function (a) {
    a.href = wa(a.getAttribute('data-wa')); a.target = '_blank'; a.rel = 'noopener';
    a.addEventListener('click', function () { evento('clic_whatsapp', { ubicacion: a.getAttribute('data-donde') || '', pagina: document.body.getAttribute('data-pagina') }); });
  });
  $$('[data-evento]').forEach(function (a) { a.addEventListener('click', function () { evento(a.getAttribute('data-evento')); }); });

  /* ---------- Cabecera y menú ---------- */
  var env = $('#cab-env'), cab = $('#cab'), bMenu = $('.cab__menu');
  var alBajar = function () { if (env) env.classList.toggle('is-baja', window.scrollY > 20); };
  window.addEventListener('scroll', alBajar, { passive: true }); alBajar();
  if (bMenu) {
    var cerrarMenu = function () { cab.classList.remove('is-abierto'); bMenu.setAttribute('aria-expanded', 'false'); bMenu.setAttribute('aria-label', 'Abrir menú'); };
    bMenu.addEventListener('click', function () {
      var abierto = cab.classList.toggle('is-abierto');
      bMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      bMenu.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
    $$('#menu a').forEach(function (a) { a.addEventListener('click', cerrarMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });
  }

  /* ---------- Aparición al bajar y contadores ----------
     Solo se esconde lo que está fuera de pantalla al cargar; lo visible nunca parpadea. */
  var contar = function (el) {
    var fin = Number(el.getAttribute('data-contar')), miles = el.hasAttribute('data-miles');
    if (quieto || !fin) return;
    var t0 = null, dur = 1400;
    var paso = function (t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), v = Math.round(fin * (1 - Math.pow(1 - p, 3)));
      el.textContent = miles ? v.toLocaleString('es-CO') : v;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  if ('IntersectionObserver' in window && !quieto) {
    var alto = window.innerHeight;
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove('esperando');
        $$('[data-contar]', en.target).concat(en.target.hasAttribute('data-contar') ? [en.target] : []).forEach(function (c) { if (!c.dataset.contado) { c.dataset.contado = '1'; contar(c); } });
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-revelar]').forEach(function (el) {
      if (el.getBoundingClientRect().top > alto * 0.92) { el.classList.add('esperando'); obs.observe(el); }
    });
    var obsC = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { var c = en.target; if (!c.dataset.contado) { c.dataset.contado = '1'; contar(c); } obsC.unobserve(c); } });
    }, { threshold: 0.6 });
    $$('[data-contar]').forEach(function (c) { if (!c.closest('[data-revelar].esperando') && c.getBoundingClientRect().top > alto * 0.9) obsC.observe(c); });
  }

  /* ---------- Profundidad suave en las fotos de fondo (con inercia) ---------- */
  var pars = $$('[data-parallax]');
  if (pars.length && !quieto && window.innerWidth > 720) {
    var estadoP = pars.map(function () { return { actual: 0, meta: 0 }; }), corriendo = false;
    var metas = function () {
      var h = window.innerHeight;
      pars.forEach(function (img, i) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > h + 100) return;
        estadoP[i].meta = ((r.top + r.height / 2 - h / 2) / h) * -22;
      });
    };
    var bucle = function () {
      var falta = false;
      pars.forEach(function (img, i) {
        var e = estadoP[i], d = e.meta - e.actual;
        if (Math.abs(d) > 0.05) { e.actual += d * 0.09; falta = true; }
        img.style.transform = 'translate3d(0,' + e.actual.toFixed(2) + 'px,0) scale(1.06)';
      });
      if (falta) requestAnimationFrame(bucle); else corriendo = false;
    };
    var empujar = function () { metas(); if (!corriendo) { corriendo = true; requestAnimationFrame(bucle); } };
    window.addEventListener('scroll', empujar, { passive: true });
    window.addEventListener('resize', empujar);
    metas(); estadoP.forEach(function (e) { e.actual = e.meta; }); empujar();
  }

  /* ---------- Vitrina centrada (inicio) ---------- */
  var vit = $('#vitrina');
  if (vit) {
    var pista = $('.vitrina__pista', vit), items = $$('.vitrina__item', vit), puntos = $('#vitrina-puntos'), iv = 1, temp = null;
    items.forEach(function (_, i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Vista ' + (i + 1)); b.addEventListener('click', function () { ir(i); reiniciar(); }); puntos.appendChild(b); });
    var ir = function (i) {
      iv = (i + items.length) % items.length;
      var it = items[iv];
      var desp = it.offsetLeft - (vit.clientWidth - it.offsetWidth) / 2;
      pista.style.transform = 'translateX(' + (-desp) + 'px)';
      items.forEach(function (x, k) { x.classList.toggle('is-activo', k === iv); x.setAttribute('tabindex', k === iv ? '0' : '-1'); });
      $$('button', puntos).forEach(function (b, k) { b.setAttribute('aria-current', k === iv ? 'true' : 'false'); });
    };
    var reiniciar = function () { clearInterval(temp); if (!quieto) temp = setInterval(function () { ir(iv + 1); }, 6500); };
    $$('[data-vitrina]').forEach(function (b) { b.addEventListener('click', function () { ir(iv + Number(b.getAttribute('data-vitrina'))); reiniciar(); }); });
    vit.addEventListener('mouseenter', function () { clearInterval(temp); });
    vit.addEventListener('mouseleave', reiniciar);
    var x0 = null;
    vit.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    vit.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { ir(iv + (dx < 0 ? 1 : -1)); reiniciar(); } x0 = null; });
    window.addEventListener('resize', function () { ir(iv); });
    ir(1); reiniciar();
  }


  /* ---------- Un día en tu casa: la panorámica cambia con el scroll ---------- */
  var dia = $('#dia');
  if (dia && !quieto) {
    dia.classList.add('dia--vivo');
    var fijo = $('.dia__fijo', dia), capas = $$('.dia__capa', dia), momentos = $$('.dia__momento', dia);
    var astro = $('#dia-astro'), av = $('#dia-avance'), luces = $('#dia-luces');
    var semL = 11, azarL = function () { semL = (semL * 16807) % 2147483647; return (semL - 1) / 2147483646; };
    var crearLuces = function () {
      var W = fijo.clientWidth, H = fijo.clientHeight, ratio = 2000 / 946;
      var iw = Math.max(W, H * ratio), ih = iw / ratio, ox = (iw - W) / 2, oy = (ih - H) / 2, html = '';
      semL = 11;
      for (var i = 0; i < 90; i++) {
        var x = 0.5 + azarL() * 0.48, y = 0.4 + azarL() * 0.075 + (x - 0.5) * 0.03;
        var px = x * iw - ox, py = y * ih - oy;
        if (px < 4 || px > W - 4) continue;
        html += '<i style="left:' + px.toFixed(0) + 'px;top:' + py.toFixed(0) + 'px;--r:-' + (azarL() * 2.6).toFixed(2) + 's"></i>';
      }
      luces.innerHTML = html;
    };
    var centros = [0, 0.34, 0.67, 1];
    var pD = 0, metaD = 0;
    var pintarDia = function () {
      var p = pD;
      capas.forEach(function (c, i) { c.style.opacity = Math.max(0, 1 - Math.abs(p - centros[i]) / 0.34).toFixed(3); });
      luces.style.opacity = Math.max(0, (p - 0.72) / 0.28).toFixed(3);
      var W = fijo.clientWidth, H = fijo.clientHeight, x, y;
      if (p < 0.82) { var t = p / 0.82; x = W * (0.08 + 0.84 * t); y = H * (0.44 - 0.34 * Math.sin(Math.PI * t)); astro.classList.remove('es-luna'); }
      else { var u = (p - 0.82) / 0.18; x = W * (0.62 + 0.12 * u); y = H * (0.3 - 0.12 * u); astro.classList.add('es-luna'); }
      astro.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      var idx = Math.min(3, Math.floor(metaD * 4));
      momentos.forEach(function (m, i) { m.classList.toggle('is-activo', i === idx); });
      var reloj = av.parentElement, cs = getComputedStyle(reloj), ancho = reloj.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      av.style.width = (ancho * p).toFixed(1) + 'px';
    };
    var corriendoD = false;
    var bucleD = function () {
      var d = metaD - pD;
      if (Math.abs(d) > 0.0004) { pD += d * 0.1; pintarDia(); requestAnimationFrame(bucleD); }
      else { pD = metaD; pintarDia(); corriendoD = false; }
    };
    var empujarD = function () {
      var r = dia.getBoundingClientRect(), total = dia.offsetHeight - fijo.offsetHeight;
      metaD = Math.min(1, Math.max(0, -r.top / (total || 1)));
      if (!corriendoD) { corriendoD = true; requestAnimationFrame(bucleD); }
    };
    window.addEventListener('scroll', empujarD, { passive: true });
    window.addEventListener('resize', function () { crearLuces(); empujarD(); });
    crearLuces(); empujarD(); pD = metaD; pintarDia();
  }

  /* ---------- Proceso de compra (proyecto) ---------- */
  var PASOS = [
    { t: 'Asesoría', p: 'Te atendemos, resolvemos tus dudas y te mostramos los lotes disponibles.', f: 'vista-pueblo' },
    { t: 'Visita', p: 'Conoces el condominio en persona o por videollamada, con cita previa.', f: 'senderos' },
    { t: 'Separación', p: 'Separas tu lote desde $5.000.000 en la cuenta del proyecto. Ese valor hace parte de la cuota inicial.', f: 'lote-arboles' },
    { t: 'Escritura', p: 'Firmas en notaría y registras el lote a tu nombre, con escritura individual.', f: 'mirador-pueblo' }
  ];
  if ($('.proceso__lista')) {
    var fotoA = $('#proceso-img'), fotoB = $('#proceso-img-2'), caja = $('#proceso-texto'), pasoActual = 0, espera = null;
    var activar = function (b) {
      var i = Number(b.getAttribute('data-paso'));
      $$('.proceso__lista [data-paso]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      if (i === pasoActual) return;
      pasoActual = i;
      var d = PASOS[i], visible = fotoA.classList.contains('oculta') ? fotoB : fotoA, oculta = visible === fotoA ? fotoB : fotoA;
      oculta.src = 'fotos/' + d.f + '.webp';
      var hecho = false;
      var mostrarNueva = function () { if (hecho) return; hecho = true; oculta.classList.remove('oculta'); visible.classList.add('oculta'); };
      if (oculta.decode) oculta.decode().then(mostrarNueva, mostrarNueva);
      setTimeout(mostrarNueva, 700);
      caja.classList.add('cambiando');
      clearTimeout(espera);
      espera = setTimeout(function () { $('#proceso-t').textContent = d.t; $('#proceso-p').textContent = d.p; caja.classList.remove('cambiando'); }, 280);
    };
    $$('.proceso__lista [data-paso]').forEach(function (b) {
      b.addEventListener('click', function () { activar(b); });
      b.addEventListener('mouseenter', function () { if (window.innerWidth > 900) activar(b); });
    });
  }

  /* ---------- Formularios que terminan en WhatsApp ---------- */
  var conectar = function (cfg) {
    var form = typeof cfg.form === 'string' ? $(cfg.form) : cfg.form;
    if (!form) return function () {};
    var btn = cfg.boton(form), msj = cfg.msj(form), intento = false;
    var revisar = function () {
      var r = cfg.validar(form);
      cfg.campos.forEach(function (k) { var el = $(k[0], form); if (!el) return; var caja = el.closest('.campo') || el.closest('.consentimiento'); if (caja) caja.classList.toggle('is-error', intento && !r.ok[k[1]]); });
      if (msj) msj.textContent = intento ? r.error : '';
      btn.setAttribute('aria-disabled', r.listo ? 'false' : 'true');
      btn.href = r.listo ? wa(r.texto) : '#';
      return r;
    };
    form.addEventListener('input', revisar);
    form.addEventListener('change', revisar);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function (e) { intento = true; var r = revisar(); if (!r.listo) { e.preventDefault(); return; } evento(cfg.evento); });
    revisar();
    return revisar;
  };
  var nombreOk = function (v) { return v.trim().length >= 3; };
  var errBase = function (ok) { return !ok.nombre ? 'Escribe tu nombre.' : !ok.tel ? 'Escribe un WhatsApp válido (10 dígitos).' : ''; };

  $$('.js-portafolio').forEach(function (f) {
    conectar({
      form: f, evento: 'portafolio_pedido',
      boton: function (fm) { return $('.js-enviar', fm); }, msj: function (fm) { return $('.form-msj', fm); },
      campos: [['[name=nombre]', 'nombre'], ['[name=tel]', 'tel']],
      validar: function (fm) {
        var n = $('[name=nombre]', fm).value.trim(), t = celular($('[name=tel]', fm).value);
        var ok = { nombre: nombreOk(n), tel: !!t };
        return { ok: ok, listo: ok.nombre && ok.tel, error: errBase(ok), texto: 'Hola, soy ' + n + '. Quiero recibir el portafolio del Condominio Mirador de Anapoima con precios y fotos.\nMi WhatsApp: ' + t };
      }
    });
  });

  /* ---------- Pestañas genéricas ---------- */
  $$('.pestanas [role=tab]').forEach(function (t) {
    t.addEventListener('click', function () {
      $$('.pestanas [role=tab]').forEach(function (x) { var sel = x === t; x.setAttribute('aria-selected', sel ? 'true' : 'false'); var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !sel; });
    });
  });

  /* ---------- Contacto: visita, asesoría, calendario, qué llevar y buscador ---------- */
  var hoyISO = (function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })();
  var fechaTexto = function (f) { try { return new Date(f + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return f; } };
  if ($('#form-visita')) {
    var vF = $('#v-fecha'); vF.min = hoyISO;
    conectar({
      form: '#form-visita', evento: 'visita_agendada',
      boton: function () { return $('#v-enviar'); }, msj: function () { return $('#v-msj'); },
      campos: [['#v-nombre', 'nombre'], ['#v-tel', 'tel'], ['#v-fecha', 'fecha'], ['#v-ok', 'ok']],
      validar: function () {
        var n = $('#v-nombre').value.trim(), t = celular($('#v-tel').value), f = vF.value, p = $('#v-personas').value;
        var ok = { nombre: nombreOk(n), tel: !!t, fecha: !!f, ok: $('#v-ok').checked };
        var error = errBase(ok) || (!ok.fecha ? 'Elige la fecha en que te gustaría venir.' : !ok.ok ? 'Acepta el tratamiento de datos para continuar.' : '');
        return { ok: ok, listo: ok.nombre && ok.tel && ok.fecha && ok.ok, error: error, texto: 'Hola, soy ' + n + '. Quiero agendar una visita al Condominio Mirador de Anapoima.\nFecha preferida: ' + fechaTexto(f) + '\nVisitantes: ' + p + '\nMi WhatsApp: ' + t };
      }
    });
    vF.addEventListener('change', function () { var c = $('#cal-fecha'); if (c && !c.value) { c.value = vF.value; c.dispatchEvent(new Event('input')); } });
  }
  if ($('#f-asesoria')) {
    conectar({
      form: '#f-asesoria', evento: 'formulario_asesoria',
      boton: function () { return $('#a-enviar'); }, msj: function () { return $('#a-msj'); },
      campos: [['#a-nombre', 'nombre'], ['#a-tel', 'tel'], ['#a-ok', 'ok']],
      validar: function () {
        var n = $('#a-nombre').value.trim(), t = celular($('#a-tel').value), b = ($('input[name="busca"]:checked') || {}).value || '';
        var ok = { nombre: nombreOk(n), tel: !!t, ok: $('#a-ok').checked };
        var error = errBase(ok) || (!ok.ok ? 'Acepta el tratamiento de datos para continuar.' : '');
        return { ok: ok, listo: ok.nombre && ok.tel && ok.ok, error: error, texto: 'Hola, soy ' + n + '. Quiero asesoría sobre el Condominio Mirador de Anapoima.' + (b ? ' Busco un lote para ' + b + '.' : '') + '\nMi WhatsApp: ' + t };
      }
    });
  }
  if ($('#cal-fecha')) {
    var cF = $('#cal-fecha'), cH = $('#cal-hora'), cG = $('#cal-google'), cW = $('#cal-wa'), cM = $('#cal-msj');
    cF.min = hoyISO;
    var armarCal = function () {
      var f = cF.value;
      [cG, cW].forEach(function (b) { b.setAttribute('aria-disabled', f ? 'false' : 'true'); });
      if (!f) { cG.href = '#'; cW.href = '#'; return; }
      var h = Number(cH.value), d = f.replace(/-/g, '');
      var ini = d + 'T' + String(h).padStart(2, '0') + '0000', fin = d + 'T' + String(h + 2).padStart(2, '0') + '0000';
      cG.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Visita al Condominio Mirador de Anapoima')
        + '&dates=' + ini + '/' + fin + '&ctz=America/Bogota'
        + '&details=' + encodeURIComponent('Visita con cita previa. Confirma la hora por WhatsApp al 318 333 4706.\nCómo llegar: https://www.google.com/maps/dir/?api=1&destination=4.5575911,-74.5475816')
        + '&location=' + encodeURIComponent('Condominio Mirador de Anapoima, Anapoima, Cundinamarca');
      cW.href = wa('Hola, quiero confirmar una visita al Condominio Mirador de Anapoima el ' + fechaTexto(f) + ' a las ' + cH.options[cH.selectedIndex].text + '.');
      cM.textContent = '';
    };
    [cF, cH].forEach(function (el) { el.addEventListener('input', armarCal); el.addEventListener('change', armarCal); });
    [cG, cW].forEach(function (b) { b.addEventListener('click', function (e) { if (!cF.value) { e.preventDefault(); cM.textContent = 'Elige primero el día de la visita.'; } else evento(b === cG ? 'visita_calendario' : 'visita_confirmar'); }); });
    armarCal();
  }
  if ($('#llevar')) {
    var marcados = leer('mirador-llevar', []), cajas = $$('#llevar input');
    var progreso = function () { var n = cajas.filter(function (c) { return c.checked; }).length; $('#llevar-barra').style.width = (n / cajas.length * 100) + '%'; };
    cajas.forEach(function (c) { c.checked = marcados.indexOf(c.value) > -1; c.addEventListener('change', function () { guardar('mirador-llevar', cajas.filter(function (x) { return x.checked; }).map(function (x) { return x.value; })); progreso(); }); });
    progreso();
  }
  if ($('#faq-buscar')) {
    var sinTilde = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
    $('#faq-buscar').addEventListener('input', function (e) {
      var q = sinTilde(e.target.value.trim()), vistos = 0;
      $$('#faq-lista details').forEach(function (d) {
        var si = !q || sinTilde(d.textContent).indexOf(q) > -1;
        d.hidden = !si; if (si) vistos++;
        if (q && si) d.open = true;
      });
      $('#faq-nada').hidden = vistos > 0;
    });
  }

  /* ---------- Plano de lotes (datos de ejemplo) ---------- */
  var COLOR = { disponible: '#7FA05A', reservado: '#D6A85A', vendido: '#CBC4B9' };
  var ETQ = { disponible: 'Disponible', reservado: 'Reservado', vendido: 'Vendido' };
  var FOTOS_LOTE = ['lote-arboles', 'loma', 'lotes-verdes', 'senderos', 'vias-internas', 'mirador-pueblo'];
  var plano = $('#plano');
  if (plano) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var nodo = function (tag, at) { var n = document.createElementNS(svgNS, tag); for (var k in at) n.setAttribute(k, at[k]); return n; };
    var VIAS = ['M 30 470 C 170 470, 220 380, 330 380 S 520 450, 640 400 S 820 320, 870 300', 'M 330 380 C 300 300, 360 240, 470 230 S 680 250, 780 170', 'M 470 230 C 430 170, 470 110, 560 90'];
    var gVias = $('#plano-vias'), gLotes = $('#plano-lotes'), gExtra = $('#plano-extras');
    VIAS.forEach(function (d) {
      gVias.appendChild(nodo('path', { d: d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 20, 'stroke-linecap': 'round' }));
      gVias.appendChild(nodo('path', { d: d, fill: 'none', stroke: '#E2DBCC', 'stroke-width': 2, 'stroke-dasharray': '8 10', 'stroke-linecap': 'round' }));
    });
    var semilla = 7, azar = function () { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
    var LOTES = [], TOTAL = 70, PASO = 34;
    var rutas = VIAS.map(function (d) { var p = nodo('path', { d: d }); gVias.appendChild(p); return p; });
    var puntosVia = [];
    rutas.forEach(function (p) { var L = p.getTotalLength(); for (var s = 0; s <= L; s += 6) puntosVia.push(p.getPointAtLength(s)); });
    var libre = function (cx, cy, r) {
      for (var i = 0; i < puntosVia.length; i++) { var q = puntosVia[i]; if (Math.hypot(q.x - cx, q.y - cy) < r + 9) return false; }
      for (var j = 0; j < LOTES.length; j++) { var o = LOTES[j]; if (Math.hypot(o.cx - cx, o.cy - cy) < (r + o.r) * .92) return false; }
      return cx > 20 && cx < 880 && cy > 20 && cy < 540;
    };
    rutas.forEach(function (p) {
      var L = p.getTotalLength();
      for (var s = 26; s < L - 14 && LOTES.length < TOTAL; s += PASO) {
        var a = p.getPointAtLength(s - 1), b = p.getPointAtLength(s + 1), ang = Math.atan2(b.y - a.y, b.x - a.x);
        [-1, 1].forEach(function (lado) {
          if (LOTES.length >= TOTAL) return;
          var w = PASO - 5, h = 34 + azar() * 8, off = 14 + h / 2, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          var cx = mx - lado * off * Math.sin(ang), cy = my + lado * off * Math.cos(ang), r = Math.max(w, h) / 2 * .8;
          var e = azar(), ar = azar();
          if (!libre(cx, cy, r)) return;
          LOTES.push({ x: mx, y: my, ang: ang * 180 / Math.PI, lado: lado, w: w, h: h, cx: cx, cy: cy, r: r, estado: e < .62 ? 'disponible' : (e < .78 ? 'reservado' : 'vendido'), area: Math.round((1000 + ar * 650) / 10) * 10 });
        });
      }
    });
    rutas.forEach(function (p) { gVias.removeChild(p); });
    LOTES.forEach(function (l, i) { l.num = i + 1; l.foto = FOTOS_LOTE[i % FOTOS_LOTE.length]; });
    LOTES.forEach(function (l) {
      var g = nodo('g', { class: 'lote', transform: 'translate(' + l.x.toFixed(1) + ' ' + l.y.toFixed(1) + ') rotate(' + l.ang.toFixed(1) + ')', tabindex: 0, role: 'button', 'aria-label': 'Lote ' + l.num + ', ' + ETQ[l.estado] });
      var y0 = l.lado < 0 ? -(14 + l.h) : 14;
      g.appendChild(nodo('path', { d: 'M ' + (-l.w / 2) + ' ' + y0 + ' h ' + l.w + ' v ' + l.h + ' h ' + (-l.w) + ' z', fill: COLOR[l.estado], stroke: '#FFFFFF', 'stroke-width': 2 }));
      var t = nodo('text', { x: 0, y: y0 + l.h / 2 + 4, 'text-anchor': 'middle', 'font-family': 'Plus Jakarta Sans, sans-serif', 'font-size': 11, 'font-weight': 700, fill: l.estado === 'vendido' ? '#766E64' : '#FFFFFF', 'pointer-events': 'none' });
      if (Math.abs(l.ang) > 90) t.setAttribute('transform', 'rotate(180 0 ' + (y0 + l.h / 2) + ')');
      t.textContent = l.num; g.appendChild(t);
      l.g = g; gLotes.appendChild(g);
      g.addEventListener('click', function () { elegir(l, false); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(l, false); } });
    });
    var rotulo = function (x, y, txt, at) { var t = nodo('text', Object.assign({ x: x, y: y, 'text-anchor': 'middle', 'font-family': 'Plus Jakarta Sans, sans-serif', 'font-size': 12, 'font-weight': 700, 'letter-spacing': 1.2 }, at)); t.textContent = txt; gExtra.appendChild(t); };
    gExtra.appendChild(nodo('rect', { x: 18, y: 492, width: 104, height: 32, rx: 16, fill: '#173A34' }));
    rotulo(70, 513, 'PORTERÍA', { fill: '#FFFFFF' });
    gExtra.appendChild(nodo('ellipse', { cx: 770, cy: 470, rx: 64, ry: 40, fill: '#DCE5CC' }));
    rotulo(770, 474, 'ZONA VERDE', { fill: '#4D6B2C' });
    rotulo(870, 36, 'VISTA AL PUEBLO ↑', { 'text-anchor': 'end', fill: '#8B847B' });
    var cuenta = function (e) { return LOTES.filter(function (l) { return l.estado === e; }).length; };
    $('#n-disp').textContent = '(' + cuenta('disponible') + ')';
    $('#n-res').textContent = '(' + cuenta('reservado') + ')';
    $('#n-vend').textContent = '(' + cuenta('vendido') + ')';

    /* Favoritos y comparador */
    var favs = leer('mirador-favoritos', []), comp = leer('mirador-comparar', []);
    var porNum = function (n) { return LOTES[n - 1]; };
    var esFav = function (n) { return favs.indexOf(n) > -1; }, enComp = function (n) { return comp.indexOf(n) > -1; };
    var alternarFav = function (n) { if (esFav(n)) favs = favs.filter(function (x) { return x !== n; }); else { favs.push(n); evento('lote_favorito', { lote: n }); } guardar('mirador-favoritos', favs); pintarMarcas(); };
    var alternarComp = function (n) { if (enComp(n)) comp = comp.filter(function (x) { return x !== n; }); else { if (comp.length >= 3) comp.shift(); comp.push(n); } guardar('mirador-comparar', comp); pintarMarcas(); };
    var pintarMarcas = function () {
      $$('[data-fav]').forEach(function (b) { b.setAttribute('aria-pressed', esFav(Number(b.getAttribute('data-fav'))) ? 'true' : 'false'); });
      $$('[data-comp]').forEach(function (b) { var s = enComp(Number(b.getAttribute('data-comp'))); b.setAttribute('aria-pressed', s ? 'true' : 'false'); b.textContent = s ? 'Comparando' : 'Comparar'; });
      if (loteActual) { $('#f-fav').setAttribute('aria-pressed', esFav(loteActual.num) ? 'true' : 'false'); var fc = $('#f-comp'); fc.setAttribute('aria-pressed', enComp(loteActual.num) ? 'true' : 'false'); fc.textContent = enComp(loteActual.num) ? 'Comparando' : 'Comparar'; }
      var barra = $('#mis-lotes'), lista = favs.slice().sort(function (a, b) { return a - b; });
      barra.classList.toggle('is-visible', lista.length > 0 || comp.length > 0);
      $('#mis-lotes-txt').textContent = lista.length ? (lista.length === 1 ? '1 lote guardado' : lista.length + ' lotes guardados') : comp.length + ' para comparar';
      $('#abrir-comparador').textContent = 'Comparar (' + comp.length + ')';
      $('#mis-lotes-wa').href = wa('Hola, vengo de la página del Condominio Mirador de Anapoima. Me interesan estos lotes:\n' + (lista.length ? lista : comp).map(function (n) { var l = porNum(n); return '• Lote ' + n + ' (' + l.area.toLocaleString('es-CO') + ' m²)'; }).join('\n') + '\n¿Me cuentan precio y disponibilidad?');
    };
    $('#f-fav').addEventListener('click', function () { if (loteActual) alternarFav(loteActual.num); });
    $('#f-comp').addEventListener('click', function () { if (loteActual) alternarComp(loteActual.num); });
    var dlg = $('#comparador');
    $('#abrir-comparador').addEventListener('click', function () {
      var ls = comp.map(porNum);
      $('#comparador-tabla').innerHTML = ls.length < 2
        ? '<p class="comparador__vacio">Marca «Comparar» en al menos dos lotes para verlos lado a lado.</p>'
        : '<table><thead><tr><th></th>' + ls.map(function (l) { return '<td><b>Lote ' + l.num + '</b></td>'; }).join('') + '</tr></thead><tbody>'
          + '<tr><th>Área (ejemplo)</th>' + ls.map(function (l) { return '<td>' + l.area.toLocaleString('es-CO') + ' m²</td>'; }).join('') + '</tr>'
          + '<tr><th>Estado</th>' + ls.map(function (l) { return '<td><span class="estado estado--' + l.estado + '">' + ETQ[l.estado] + '</span></td>'; }).join('') + '</tr>'
          + '<tr><th>Precio</th>' + ls.map(function () { return '<td>Desde $220.000.000</td>'; }).join('') + '</tr>'
          + '<tr><th>Separación</th>' + ls.map(function () { return '<td>Desde $5.000.000</td>'; }).join('') + '</tr>'
          + '<tr><th></th>' + ls.map(function (l) { return '<td><a class="btn btn--wa" style="min-height:42px;padding:4px 4px 4px 14px;font-size:13.5px" target="_blank" rel="noopener" href="' + wa('Hola, quiero información del lote ' + l.num + ' del Condominio Mirador de Anapoima.') + '">Preguntar<span class="btn__c" style="width:34px;height:34px"><svg><use href="#i-wa"/></svg></span></a></td>'; }).join('') + '</tr>'
          + '</tbody></table>';
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      evento('comparar_lotes', { cantidad: ls.length });
    });
    $('[data-cerrar-comp]').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

    /* Ficha y marcador */
    var marcador = $('#marcador'), loteActual = null;
    var elegir = function (l, desplazar) {
      if (loteActual) loteActual.g.classList.remove('is-activo');
      loteActual = l; l.g.classList.add('is-activo');
      marcador.style.left = (l.cx / 900 * 100) + '%'; marcador.style.top = (l.cy / 560 * 100) + '%';
      marcador.classList.add('is-visible');
      $('#ficha-vacia').hidden = true; $('#ficha-lote').hidden = false;
      $('#f-num').textContent = l.num;
      var e = $('#f-estado-chip'); e.className = 'estado estado--' + l.estado; e.textContent = ETQ[l.estado];
      $('#f-area-txt').textContent = l.area.toLocaleString('es-CO') + ' m²';
      var w1 = $('#f-wa');
      w1.href = wa('Hola, vengo de la página del Condominio Mirador de Anapoima. Quiero información del lote ' + l.num + ' (' + l.area.toLocaleString('es-CO') + ' m²).');
      w1.hidden = l.estado === 'vendido';
      $('#f-simular').href = 'financiacion.html?lote=' + l.num + '&area=' + l.area + '#simulador';
      $('#f-simular').hidden = l.estado === 'vendido';
      pintarMarcas();
      evento('ver_lote', { lote: l.num, estado: l.estado });
      if (desplazar) document.getElementById('plano-seccion').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
    };

    /* Filtros del buscador y tarjetas */
    var fEstado = $('#f-estado'), fArea = $('#f-area'), caja = $('#tarjetas-lote'), verMas = $('#ver-mas'), todos = false;
    var pasa = function (l) {
      var es = fEstado.value, ar = fArea.value;
      if (es && l.estado !== es) return false;
      if (!es && l.estado === 'vendido') return false;
      if (ar) { var r = ar.split('-').map(Number); if (l.area < r[0] || l.area >= r[1]) return false; }
      return true;
    };
    var filtrar = function () {
      var ok = LOTES.filter(pasa);
      LOTES.forEach(function (l) { l.g.style.opacity = pasa(l) ? '' : '.18'; });
      $('#n-filtrados').textContent = ok.length;
      var mostrar = todos ? ok : ok.slice(0, 8);
      caja.innerHTML = mostrar.map(function (l) {
        return '<article class="lote-tarjeta" data-revelar><div class="lote-tarjeta__foto"><img src="fotos/' + l.foto + '-900.webp" alt="" width="900" height="506" loading="lazy"><span class="lote-tarjeta__eti vidrio" style="color:#fff">Ejemplo · ' + ETQ[l.estado] + '</span></div>'
          + '<div class="lote-tarjeta__cuerpo"><b>Lote ' + l.num + '</b><span>' + l.area.toLocaleString('es-CO') + ' m² · desde $220.000.000</span></div>'
          + '<div class="lote-tarjeta__acc"><button class="btn btn--linea" type="button" data-ver="' + l.num + '">Ver en el plano<span class="btn__c"><svg><use href="#i-flecha"/></svg></span></button>'
          + '<button class="btn-fav" type="button" data-fav="' + l.num + '" aria-pressed="false" aria-label="Guardar el lote ' + l.num + '"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>'
          + '<button class="btn-comp" type="button" data-comp="' + l.num + '" aria-pressed="false">Comparar</button></div></article>';
      }).join('');
      verMas.hidden = ok.length <= 8;
      verMas.firstChild.textContent = todos ? 'Ver menos' : 'Ver todos';
      pintarMarcas();
    };
    caja.addEventListener('click', function (e) {
      var v = e.target.closest('[data-ver]'), f = e.target.closest('[data-fav]'), c = e.target.closest('[data-comp]');
      if (v) elegir(porNum(Number(v.getAttribute('data-ver'))), true);
      if (f) alternarFav(Number(f.getAttribute('data-fav')));
      if (c) alternarComp(Number(c.getAttribute('data-comp')));
    });
    verMas.addEventListener('click', function () { todos = !todos; filtrar(); });
    [fEstado, fArea].forEach(function (s) { s.addEventListener('change', function () { filtrar(); evento('filtrar_lotes', { estado: fEstado.value, area: fArea.value }); }); });
    $('#buscador').addEventListener('submit', function (e) { e.preventDefault(); });
    filtrar();
  }

  /* ---------- Simulador y presupuesto (financiación) ---------- */
  var CFG = { precioDesde: 220000000, sepMin: 5000000, cuotaInicial: 44000000, plazoMax: 24 };
  if ($('#sim')) {
    var modo = 'financiado', simulado = false, calc = null, filasTxt = [], loteURL = null;
    try { var q = new URLSearchParams(location.search); if (q.get('lote')) loteURL = { num: q.get('lote'), area: Number(q.get('area')) || 0 }; } catch (e) {}
    if (loteURL) { $('#sim-lote').hidden = false; $('#sim-lote-txt').textContent = 'Simulando el lote ' + loteURL.num + (loteURL.area ? ' · ' + loteURL.area.toLocaleString('es-CO') + ' m²' : ''); }
    var meses = function (n) { return n + (n === 1 ? ' mes' : ' meses'); };
    var calcular = function () {
      var fin = modo === 'financiado', P = num($('#s-valor').value), S = num($('#s-sep').value);
      var N = Math.min(CFG.plazoMax, Math.max(1, Number($('#s-plazo').value) || CFG.plazoMax));
      var CI = fin ? CFG.cuotaInicial : 0, sI = fin ? Math.max(CI - S, 0) : 0;
      var sD = fin ? Math.max(P - Math.max(CI, S), 0) : Math.max(P - S, 0), cB = 0, cF = 0;
      if (fin && sD > 0) { if (N <= 1) { cB = sD; cF = sD; } else { cB = Math.floor(sD / N / 1000) * 1000; cF = sD - cB * (N - 1); } }
      return { fin: fin, P: P, S: S, N: N, CI: CI, sI: sI, sD: sD, cB: cB, cF: cF };
    };
    var revisarCotiza = function () {};
    var pintar = function () {
      var c = calcular(); calc = c;
      var sepErr = c.S < CFG.sepMin, valErr = c.P < CFG.precioDesde;
      var eS = $('#s-sep-error'), eV = $('#s-valor-error');
      eS.hidden = !sepErr; eS.textContent = sepErr ? 'La separación mínima es ' + M(CFG.sepMin) + '.' : '';
      eV.hidden = !valErr; eV.textContent = valErr ? 'Los lotes están desde ' + M(CFG.precioDesde) + '.' : '';
      $('#c-sep').classList.toggle('is-error', sepErr); $('#c-valor').classList.toggle('is-error', valErr);
      $('#bloque-plazo').hidden = !c.fin; $('#s-plazo-txt').textContent = meses(c.N);
      filasTxt = c.fin
        ? [['Valor del lote', M(c.P)], ['Cuota inicial', M(c.CI)], ['Separación (parte de la inicial)', M(c.S)], ['Resto de la inicial', M(c.sI)], ['Total a financiar', M(c.sD)], ['Plazo', meses(c.N)]]
        : [['Valor del lote', M(c.P)], ['Separación', M(c.S)], ['Saldo a pagar de contado', M(c.sD)]];
      $('#sim-filas').innerHTML = filasTxt.map(function (f) { return '<li><span>' + f[0] + '</span><b>' + f[1] + '</b></li>'; }).join('');
      var et = $('#cuota-et'), val = $('#cuota-valor'), det = $('#cuota-detalle');
      if (sepErr || valErr) { et.textContent = 'Revisa los valores'; val.textContent = '—'; det.textContent = ''; }
      else if (c.fin) { et.textContent = c.N > 1 ? 'Tu cuota mensual aproximada' : 'Pago único del saldo'; val.textContent = M(c.N > 1 ? c.cB : c.cF); det.textContent = c.N > 1 ? meses(c.N - 1) + ' así y una última cuota de ' + M(c.cF) + '.' : 'Pagas el saldo en un solo mes.'; }
      else { et.textContent = 'Saldo a pagar de contado'; val.textContent = M(c.sD); det.textContent = 'Después de la separación de ' + M(c.S) + '.'; }
      var pagos = c.fin
        ? [{ k: 'sep', v: c.S, t: 'Sep.' }, { k: 'ini', v: c.sI, t: 'Inicial' }].concat(Array.apply(null, Array(c.N)).map(function (_, i) { return { k: 'mes', v: i === c.N - 1 ? c.cF : c.cB, t: 'M' + (i + 1) }; }))
        : [{ k: 'sep', v: c.S, t: 'Sep.' }, { k: 'mes', v: c.sD, t: 'Saldo' }];
      var max = Math.max.apply(null, pagos.map(function (p) { return p.v; })) || 1;
      $('#barras').innerHTML = pagos.map(function (p) { return '<div class="' + p.k + '"><i style="height:' + Math.max(2, p.v / max * 100) + '%"></i><small>' + p.t + '</small></div>'; }).join('');
      revisarCotiza();
    };
    var formatear = function (inp) { inp.addEventListener('input', function () { var n = num(inp.value); inp.value = n ? n.toLocaleString('es-CO') : ''; }); };
    formatear($('#s-valor')); formatear($('#s-sep'));
    $('#sim').addEventListener('input', function () { pintar(); if (!simulado) { simulado = true; evento('simulacion'); } });
    $('#sim').addEventListener('submit', function (e) { e.preventDefault(); });
    $$('[data-modo]').forEach(function (b) { b.addEventListener('click', function () { modo = b.getAttribute('data-modo'); $$('[data-modo]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); pintar(); }); });
    $('#sim-lote-quitar').addEventListener('click', function () { $('#sim-lote').hidden = true; loteURL = null; pintar(); });
    revisarCotiza = conectar({
      form: '#cotiza', evento: 'cotizacion_pedida',
      boton: function () { return $('#c-enviar'); }, msj: function () { return $('#c-msj'); },
      campos: [['#c-nombre', 'nombre'], ['#c-tel', 'tel']],
      validar: function () {
        var n = $('#c-nombre').value.trim(), t = celular($('#c-tel').value), ok = { nombre: nombreOk(n), tel: !!t };
        var c = calc || calcular(), datosOk = c.S >= CFG.sepMin && c.P >= CFG.precioDesde;
        var error = errBase(ok) || (!datosOk ? 'Revisa los valores de la simulación.' : '');
        var lote = loteURL && !$('#sim-lote').hidden ? ' del lote ' + loteURL.num : '';
        var txt = 'Hola, soy ' + n + '. Quiero una cotización personalizada' + lote + ' en el Condominio Mirador de Anapoima. Mi simulación:\n' + filasTxt.map(function (f) { return f[0] + ': ' + f[1]; }).join('\n') + (c.fin && c.sD > 0 ? '\nCuota aproximada: ' + M(c.cB) : '') + '\nMi WhatsApp: ' + t;
        return { ok: ok, listo: ok.nombre && ok.tel && datosOk, error: error, texto: txt };
      }
    });
    pintar();

    /* Pestañas: calcular cuota o presupuesto */
    $$('[data-modo-sim]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cual = b.getAttribute('data-modo-sim');
        $$('[data-modo-sim]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        $('#sim').hidden = cual !== 'sim'; $('#presupuesto').hidden = cual !== 'presupuesto';
        if (cual === 'presupuesto') evento('presupuesto_abierto');
      });
    });
    var ppC = $('#pp-cuota'), ppP = $('#pp-plazo');
    formatear(ppC);
    var presupuesto = function () {
      var cuota = num(ppC.value), n = Number(ppP.value), tope = CFG.cuotaInicial + cuota * n;
      $('#pp-plazo-txt').textContent = meses(n);
      $('#pp-valor').textContent = M(tope);
      var falta = CFG.precioDesde - CFG.cuotaInicial, minimo = Math.ceil(falta / n / 1000) * 1000;
      var m = $('#pp-msj');
      if (tope >= CFG.precioDesde) { m.className = 'ok'; m.textContent = 'Te alcanza para los lotes desde $220.000.000. Tu asesor te muestra cuáles encajan con ese valor.'; }
      else { m.className = 'no'; m.textContent = 'Para un lote desde $220.000.000 en ' + meses(n) + ' necesitas cuotas de unos ' + M(minimo) + ' al mes. Prueba con más meses o pregúntanos por opciones.'; }
      $('#pp-wa').href = wa('Hola, vengo de la página del Condominio Mirador de Anapoima. Puedo pagar unos ' + M(cuota) + ' al mes durante ' + meses(n) + ', además de la cuota inicial. ¿Qué lotes me recomiendan?');
    };
    [ppC, ppP].forEach(function (el) { el.addEventListener('input', presupuesto); });
    presupuesto();
  }

  /* ---------- Galería: carrusel con arrastre y mosaico por categorías ---------- */
  var FOTOS = [
    { f: 'porteria', t: 'Zona de acceso del condominio', c: 'entrada' },
    { f: 'via-postes', t: 'Vía de acceso con red de energía', c: 'vias' },
    { f: 'vias-internas', t: 'Trazado de vías internas', c: 'vias' },
    { f: 'valle', t: 'Vía interna con vista al valle', c: 'vias' },
    { f: 'lotes-verdes', t: 'Lotes y vías internas', c: 'lotes' },
    { f: 'lote-arboles', t: 'Lote con árboles y pasto', c: 'lotes' },
    { f: 'senderos', t: 'Senderos entre la vegetación', c: 'verdes' },
    { f: 'loma', t: 'Lote en la parte alta', c: 'lotes' },
    { f: 'montanas', t: 'Lotes con montañas al fondo', c: 'vistas' },
    { f: 'vista-pueblo', t: 'Lotes con el pueblo al fondo', c: 'vistas' },
    { f: 'mirador-pueblo', t: 'Punto alto con vista al pueblo', c: 'vistas' },
    { f: 'panoramica', t: 'Vista hacia el casco urbano', c: 'vistas' }
  ];
  var NOMBRE = { vistas: 'Vista', lotes: 'Lote', vias: 'Vía', verdes: 'Zona verde', entrada: 'Entrada' };
  var visor = $('#visor'), visibles = FOTOS, actual = 0;
  var mostrar = function (i) { actual = (i + visibles.length) % visibles.length; $('#visor-img').src = 'fotos/' + visibles[actual].f + '.webp'; $('#visor-img').alt = visibles[actual].t; $('#visor-txt').textContent = (actual + 1) + ' de ' + visibles.length + ' · ' + visibles[actual].t; };
  var abrir = function (lista, i) { visibles = lista; mostrar(i); if (typeof visor.showModal === 'function') visor.showModal(); else visor.setAttribute('open', ''); };
  if (visor) {
    $('[data-cerrar]', visor).addEventListener('click', function () { visor.close(); });
    $('[data-ant]', visor).addEventListener('click', function () { mostrar(actual - 1); });
    $('[data-sig]', visor).addEventListener('click', function () { mostrar(actual + 1); });
    visor.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') mostrar(actual - 1); if (e.key === 'ArrowRight') mostrar(actual + 1); });
    visor.addEventListener('click', function (e) { if (e.target === visor || e.target.classList.contains('visor__img')) visor.close(); });
  }
  var carr = $('#carrusel');
  if (carr) {
    carr.innerHTML = FOTOS.map(function (x, i) {
      return '<button class="carrusel__item" type="button" data-i="' + i + '"><span class="carrusel__foto"><img src="fotos/' + x.f + '-900.webp" alt="' + x.t + '" width="900" height="506" loading="lazy"><span class="carrusel__chips"><span class="vidrio" style="color:#fff">' + NOMBRE[x.c] + '</span><span class="vidrio" style="color:#fff">' + String(i + 1).padStart(2, '0') + '</span></span><span class="carrusel__ver vidrio" style="color:#fff">Ver</span></span><b>' + x.t + '</b><small>Condominio Mirador de Anapoima</small></button>';
    }).join('');
    var movido = false, x0 = 0, s0 = 0, abajo = false;
    carr.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; abajo = true; movido = false; x0 = e.clientX; s0 = carr.scrollLeft; });
    window.addEventListener('pointermove', function (e) { if (!abajo) return; var dx = e.clientX - x0; if (Math.abs(dx) > 5) { movido = true; carr.classList.add('arrastrando'); } carr.scrollLeft = s0 - dx; });
    window.addEventListener('pointerup', function () { abajo = false; carr.classList.remove('arrastrando'); });
    carr.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (!b) return; if (movido) { e.preventDefault(); movido = false; return; } abrir(FOTOS, Number(b.getAttribute('data-i'))); });
    $$('[data-carrusel]').forEach(function (b) { b.addEventListener('click', function () { carr.scrollBy({ left: Number(b.getAttribute('data-carrusel')) * Math.max(300, carr.clientWidth * .6), behavior: quieto ? 'auto' : 'smooth' }); }); });
  }
  var bento = $('#bento');
  if (bento) {
    var CATS = [['todas', 'Todas'], ['vistas', 'Vistas'], ['lotes', 'Lotes'], ['vias', 'Vías'], ['verdes', 'Zonas verdes'], ['entrada', 'Entrada']];
    var filtro = 'todas', filtros = $('#filtros'), lista = [];
    var orden = FOTOS.slice().reverse();
    var armar = function () {
      lista = filtro === 'todas' ? orden : orden.filter(function (x) { return x.c === filtro; });
      bento.innerHTML = lista.map(function (x, i) {
        var cls = filtro === 'todas' ? (i === 0 ? ' foto--g' : (i === 3 || i === 8 ? ' foto--a' : '')) : '';
        return '<button class="foto' + cls + '" type="button" data-i="' + i + '"><img src="fotos/' + x.f + (cls === ' foto--g' ? '' : '-900') + '.webp" alt="' + x.t + '" width="900" height="506" loading="lazy"><span class="foto__chip vidrio" style="color:#fff">' + NOMBRE[x.c] + '</span><span class="foto__pie">' + x.t + '</span></button>';
      }).join('');
    };
    CATS.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = c[1]; b.setAttribute('aria-pressed', c[0] === filtro ? 'true' : 'false');
      b.addEventListener('click', function () { filtro = c[0]; $$('button', filtros).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); armar(); });
      filtros.appendChild(b);
    });
    bento.addEventListener('click', function (e) { var b = e.target.closest('[data-i]'); if (b) abrir(lista, Number(b.getAttribute('data-i'))); });
    armar();
  }
})();
