(function () {
  'use strict';

  /* element helper: h('span', {class: 'x'}, ['text', child]) */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === '') return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  /* theme */
  var root = document.documentElement;
  try { var saved = localStorage.getItem('glava-theme'); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  document.getElementById('themeBtn').addEventListener('click', function () {
    var isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('glava-theme', next); } catch (e) {}
  });

  /* reveal on scroll */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  /* tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function select(t) {
    tabs.forEach(function (o) {
      var on = o === t;
      o.setAttribute('aria-selected', on ? 'true' : 'false');
      o.tabIndex = on ? 0 : -1;
      document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', function () { select(t); });
    document.getElementById(t.getAttribute('aria-controls')).setAttribute('tabindex', '0');
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') n = tabs[(i + tabs.length - 1) % tabs.length];
      else if (e.key === 'Home') n = tabs[0];
      else if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); n.focus(); select(n); }
    });
  });

  /* lightbox */
  var lb = document.getElementById('lightbox'), lbImg = document.getElementById('lbImg'), lbCap = document.getElementById('lbCap');
  function openLightbox(img) {
    lbImg.src = img.src; lbImg.alt = img.alt; lbCap.textContent = img.getAttribute('data-cap') || '';
    if (lb.showModal) lb.showModal(); else window.open(img.src, '_blank');
  }
  document.querySelectorAll('.shot img').forEach(function (img) {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Uvećaj snimak: ' + img.alt);
    img.addEventListener('click', function () { openLightbox(img); });
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(img); }
    });
  });
  document.getElementById('lbClose').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* class calculator: same rule as the application's computed_max_class */
  var NAMES = ['Javno', 'Interno', 'Poverljivo', 'Strogo poverljivo'];
  var tm = document.getElementById('tm'), dpa = document.getElementById('dpa'),
      nt = document.getElementById('nt'), zdr = document.getElementById('zdr');
  function computed() {
    if (tm.value === 'local') return 3;
    var full = dpa.checked && nt.checked && zdr.checked;
    if (full && (tm.value === 'convention108' || tm.value === 'eu_adequacy')) return 2;
    if (tm.value && dpa.checked && nt.checked) return 1;
    return 0;
  }
  function renderCalc() {
    var local = tm.value === 'local';
    [dpa, nt, zdr].forEach(function (c) { c.disabled = local; });
    var c = computed();
    document.querySelectorAll('.rung').forEach(function (r) {
      var v = +r.getAttribute('data-c');
      r.classList.toggle('ok', v <= c);
      r.classList.toggle('top', v === c);
    });
    var miss = [];
    if (!local) {
      if (!dpa.checked) miss.push('nema potpisanog ugovora o obradi podataka');
      if (!nt.checked) miss.push('nema zabrane obuke na podacima');
      if (!zdr.checked) miss.push('nema nultog zadržavanja podataka');
    }
    var parts = ['Najviša klasa podataka: ', h('b', { style: 'color:var(--yes)' }, [NAMES[c]]), '.'];
    if (local) parts.push(' Lokalnom provajderu ništa ne nedostaje.');
    else if (miss.length) parts.push(' Nedostaje: ', h('b', null, [miss.join(', ')]), '.');
    if (!local && c < 2 && miss.length === 0) {
      parts.push(' Za „Poverljivo“ je potreban prenos u EU, zemlju sa odlukom o adekvatnosti ili potpisnicu Konvencije 108.');
    }
    if (!local) parts.push(' „Strogo poverljivo“ dobija samo lokalni model.');
    document.getElementById('missing').replaceChildren.apply(document.getElementById('missing'),
      parts.map(function (p) { return typeof p === 'string' ? document.createTextNode(p) : p; }));
  }
  [tm, dpa, nt, zdr].forEach(function (el) { el.addEventListener('change', renderCalc); });
  renderCalc();

  /* comparison matrix. Status: y da, p delimično, n ne, u nije pronađeno, x bez AI.
     Cell: [status, note, [source numbers], searchSnippetFlag] */
  var COLS = [
    ['Glava', 'ovaj proizvod'],
    ['Paragraf Lex + AI', 'pravna baza, Novi Sad'],
    ['Pametni Advokat', 'organizer + AI, Leskovac'],
    ['Kruna AI', 'organizer + AI, Podgorica'],
    ['LEXA', 'program za kancelarije, Niš'],
    ['PravoVreme', 'elektronski rokovnik'],
    ['Casely', 'program za kancelarije'],
    ['Clio', 'svetski standard, Kanada'],
    ['Harvey', 'legal AI, SAD']
  ];
  var ROWS = [
    ['g', 'Šta Glava radi'],
    ['Upisnik stranaka, delovodnik, predmeti', [['y'], ['p', 'e-Delovodnik u proizvodu Kancelarko', [16]], ['p', 'predmeti', [1]], ['p', 'predmeti, klijenti', [5]], ['p', 'predmeti, arhiva akata', [12]], ['p', 'predmeti', [13]], ['p', '', [14]], ['p', 'predmeti (matters)', [24]], ['u', '', [27]]]],
    ['Provera sukoba interesa', [['y'], ['u'], ['u', '', [1]], ['u', '', [5]], ['u', '', [10]], ['u'], ['y', '', [14]], ['y', '', [19], 1], ['u']]],
    ['Kalendar, podsetnici, jutarnji pregled', [['y'], ['u'], ['p', 'kalendar, jutarnji pregled', [1]], ['p', 'podsetnici', [5, 8]], ['p', 'podsetnici mejlom', [11]], ['y', '', [13]], ['p', '', [14]], ['p', '', [20], 1], ['u']]],
    ['Kalkulatori rokova, AT, taksi; troškovnik', [['y'], ['u'], ['p', 'advokatska tarifa', [1]], ['p', 'advokatska tarifa', [3]], ['p', 'tarifa; rokovi se unose ručno', [11]], ['u'], ['u'], ['p', 'pravila sudova SAD i Kanade', [21], 1], ['u']]],
    ['OCR ćirilice i latinice, pretraga', [['y'], ['u'], ['u', '', [1]], ['p', 'fotografija dokumenta', [8]], ['p', 'pretraga teksta', [10]], ['u'], ['p', 'pretraga', [14]], ['p', 'pretraga teksta, najava', [24]], ['u']]],
    ['Prijemna pošta: otpremanje i mejl kancelarije', [['y'], ['u'], ['p', 'AI uvoz iz otpremanja', [1]], ['u', '', [7]], ['u', '', [10]], ['u'], ['u'], ['y', 'Maildrop, razvrstavanje pošte', [22], 1], ['u']]],
    ['AI nad dokumentima predmeta, citat sa brojem strane', [['y'], ['u', '', [15]], ['p', 'citati na nivou dokumenta', [2]], ['p', 'citati članova zakona', [6]], ['x'], ['x', 'samo glasovni unos'], ['x'], ['p', 'nivo citata nije pronađen', [23], 1], ['p', 'Vault, hronologije; citat po strani nije pronađen', [27]]]],
    ['Model po klasi poverljivosti; lokalni modeli', [['y'], ['u'], ['u', 'koristi OpenAI API', [2]], ['u', '', [9]], ['x'], ['u'], ['x'], ['u'], ['p', 'više modela u oblaku', [30]]]],
    ['Instalacija kod sebe ili oblak', [['y'], ['u'], ['u', 'veb', [1]], ['u', 'oblak', [9]], ['u', 'SaaS', [10]], ['u'], ['u', '', [14]], ['u', 'AWS', [18]], ['u', 'Azure', [28]]]],
    ['Budžeti za AI', [['y'], ['p', 'krediti', [15]], ['p', 'kvote', [2]], ['y', 'kvota, obaveštenje na 80%', [4]], ['x'], ['p', '30 obrada dnevno', [13]], ['x'], ['u'], ['u']]],
    ['Rokovi čuvanja, zabrana brisanja, izvoz', [['y'], ['u'], ['u'], ['p', 'čuvanje i izvoz po politici', [9]], ['u'], ['u'], ['u'], ['p', 'izvoz CSV', [25], 1], ['p', 'politike čuvanja', [28]]]],
    ['Dnevnik sa heš-lancem, 2FA', [['y'], ['u'], ['p', 'istorija izmena; 2FA „u planu“', [1]], ['p', 'SSO', [9]], ['p', 'dnevnik izmena', [10]], ['u'], ['u'], ['p', 'dnevnik, 2FA', [18]], ['p', 'audit log, SSO', [28]]]],
    ['Interfejs: ćirilica, latinica, engleski, ruski', [['y'], ['p', 'srpski; iOS: srpski, bosanski, engleski', [17]], ['p', 'srpski'], ['p', 'izdanja za Srbiju i Crnu Goru', [3]], ['p', 'srpski'], ['p', 'srpski'], ['p', 'srpski, engleski', [14]], ['u', 'samo prevod pregledača', [26], 1], ['u', '', [29]]]],
    ['Izolacija podataka kancelarije', [['y', 'zasebna šema baze'], ['u'], ['y', 'RLS', [1]], ['u'], ['u'], ['p', '', [13]], ['u'], ['u'], ['u']]],
    ['g', 'Gde su drugi jači'],
    ['Pravna baza i AI asistent za propise', [['n'], ['y', '', [15]], ['u'], ['y', '', [6]], ['u'], ['u'], ['u'], ['p', 'vLex', [32]], ['p', 'Knowledge', [27]]]],
    ['Fakturisanje', [['n', 'u planu'], ['p', 'Kancelarko', [16]], ['y', '', [1]], ['y', '', [3]], ['y', '', [10]], ['u'], ['y', '', [14]], ['y', '', [24]], ['u']]],
    ['Mobilna aplikacija', [['n'], ['y', '', [17]], ['u'], ['p', 'PWA', [8]], ['n', '', [10]], ['y', '', [13]], ['n', '', [14]], ['y', '', [24]], ['y', '', [31]]]]
  ];
  var LABEL = { y: '✓ da', p: 'delimično', n: 'ne', u: '—', x: 'bez AI' };
  var SOURCES = [
    ['https://pametniadvokat.rs/'],
    ['https://pametniadvokat.rs/ai-asistent-za-advokate'],
    ['https://kruna.ai/rs'],
    ['https://kruna.ai/rs/cenovnik'],
    ['https://kruna.ai/rs/funkcionalnosti/crm'],
    ['https://kruna.ai/rs/funkcionalnosti/ai-asistent'],
    ['https://kruna.ai/rs/funkcionalnosti/dokumenti'],
    ['https://kruna.ai/rs/mobilna-aplikacija'],
    ['https://kruna.ai/privacy'],
    ['https://lexa-software.com/'],
    ['https://lexa-software.com/funkcionalnosti/rokovi-i-rocista'],
    ['https://lexa-software.com/funkcionalnosti/evidencija-akata'],
    ['https://pravovreme.com/'],
    ['https://caselyapp.com/'],
    ['https://paragraf.rs/paragraf-ai/ai-asistent-pravni-konsultant-m.html'],
    ['https://paragraf.rs/kancelarko/novosti-novo-u-kancelarku.html'],
    ['https://apps.apple.com/ph/app/paragraf-lex/id1131205582', 'https://paragraf.rs/politika-privatnosti-android-app.html'],
    ['https://clio.com/security/'],
    ['https://help.clio.com/hc/articles/41182681954331'],
    ['https://clio.com/features/legal-calendaring-software/'],
    ['https://help.clio.com/hc/en-us/articles/9289840995867'],
    ['https://help.clio.com/hc/en-us/articles/9125239990555'],
    ['https://clio.com/duo'],
    ['https://lawnext.com/2026/10/cliocon-2026-a-quick-wrap-up-of-everything-clio-announced-today-and-its-a-lot.html'],
    ['https://help.clio.com/hc/en-us/articles/50633368921243'],
    ['https://clio.com/en-gb/blog/clio-speaks-your-language/'],
    ['https://harvey.ai/'],
    ['https://harvey.ai/security'],
    ['https://help.harvey.ai/en/articles/9626912-workflow-translation'],
    ['https://harvey.ai/blog/mistral-now-live-in-harvey'],
    ['https://harvey.ai/en-US/blog/top-5-product-releases-of-2025'],
    ['https://lawnext.com/2026/04/clio-work-clios-ai-workspace-is-now-available-to-solo-and-smaller-law-firms-as-a-standalone-product.html']
  ];

  var table = document.getElementById('matrix');
  var headRow = h('tr', null, [h('th', { scope: 'col' }, ['Funkcija'])].concat(COLS.map(function (c, i) {
    return h('th', { scope: 'col', 'class': i === 0 ? 'us' : null }, [c[0], h('small', null, [c[1]])]);
  })));
  table.appendChild(h('thead', null, [headRow]));
  var tbody = h('tbody');
  ROWS.forEach(function (r) {
    if (r[0] === 'g') {
      tbody.appendChild(h('tr', { 'class': 'group' }, [h('th', { colspan: String(COLS.length + 1) }, [r[1]])]));
      return;
    }
    var cells = r[1].map(function (c, i) {
      var kids = [h('span', { 'class': 'st ' + c[0], title: c[0] === 'u' ? 'nije pronađeno u javnim izvorima' : null }, [LABEL[c[0]]])];
      var refs = c[2] || [];
      if (refs.length) {
        var sup = h('sup', null, ['[']);
        refs.forEach(function (n, j) {
          if (j) sup.appendChild(document.createTextNode(','));
          sup.appendChild(h('a', { href: '#izvor-' + n, title: 'Izvor ' + n }, [String(n)]));
        });
        sup.appendChild(document.createTextNode((c[3] ? '†' : '') + ']'));
        kids.push(document.createTextNode(' '), sup);
      }
      if (c[1]) kids.push(h('span', { 'class': 'cell-note' }, [c[1]]));
      return h('td', { 'class': i === 0 ? 'us' : null }, kids);
    });
    tbody.appendChild(h('tr', null, [h('th', { scope: 'row' }, [r[0]])].concat(cells)));
  });
  table.appendChild(tbody);

  var list = document.getElementById('sourceList');
  SOURCES.forEach(function (urls, i) {
    var li = h('li', { id: 'izvor-' + (i + 1) });
    urls.forEach(function (u, j) {
      if (j) li.appendChild(h('br'));
      li.appendChild(h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, [u.replace(/^https:\/\//, '')]));
    });
    list.appendChild(li);
  });
  document.querySelectorAll('.matrix sup a').forEach(function (a) {
    a.addEventListener('click', function () { document.getElementById('izvori').open = true; });
  });
})();
