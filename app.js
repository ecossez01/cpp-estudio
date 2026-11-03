/* CPP Estudio — app sin conexión. Todo el avance se guarda en este dispositivo. */
(() => {
'use strict';

// ---------- utilidades ----------
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const fmtTime = s => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
const fmtMB = b => (b / 1048576).toFixed(b > 1048576 * 100 ? 0 : 1) + ' MB';
const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
const view = $('#view');
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

// ---------- avance (localStorage) ----------
const KEY = 'cpp-estudio-v1';
const blank = () => ({ read: {}, cards: {}, qa: {}, best: {}, last: {}, apos: {}, adone: {}, scroll: {}, sims: [], speed: 1, lastCh: null });
let S = blank();
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sin datos */ }
let saveT;
function save(now) {
  clearTimeout(saveT);
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('No se pudo guardar el avance'); } };
  now ? w() : (saveT = setTimeout(w, 250));
}

// ---------- datos ----------
const IDX = window.CPP_INDEX || [];
let DATA = {};
const CH = {};          // id capítulo -> {c, d, i}
const ALLCARDS = [];    // {id, q, a, c, d}
const ALLQ = [];        // {id, q, o, c, e, ch, d}
function indexData() {
  for (const d of Object.values(DATA)) {
    d.chapters.forEach((c, i) => {
      CH[c.id] = { c, d, i };
      c.cards.forEach((k, j) => { k.id = `${c.id}-k${j}`; k.ch = c; k.d = d; ALLCARDS.push(k); });
      c.quiz.forEach((q, j) => { q.id = `${c.id}-q${j}`; q.ch = c; q.d = d; ALLQ.push(q); });
      c.text = null;
    });
  }
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
const chLabel = c => c.label || `Capítulo ${c.num}`;
const chShort = c => c.short || `Cap. ${c.num}`;

// métricas
const known = list => list.filter(k => S.cards[k.id] === 2).length;
const answeredOk = list => list.filter(q => S.qa[q.id]?.ok).length;
const wrongQs = () => ALLQ.filter(q => S.qa[q.id] && !S.qa[q.id].ok);
const pendingCards = list => list.filter(k => S.cards[k.id] !== 2);

// ---------- cabecera y navegación ----------
function header(title, back, extra = '') {
  $('#ttl').textContent = title;
  const b = $('#back');
  if (back) { b.hidden = false; b.href = back; } else b.hidden = true;
  $('#topx').innerHTML = extra;
  document.title = title === 'CPP Estudio' ? title : `${title} · CPP`;
  syncHeader();
}
function syncHeader() { document.documentElement.style.setProperty('--hdr', $('#top').offsetHeight + 'px'); }
window.addEventListener('resize', syncHeader);
function setTab(t) { $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === t)); }

let SESSION = null;
let scrollSaver = null;
function route() {
  SESSION = null;
  if (scrollSaver) { window.removeEventListener('scroll', scrollSaver); scrollSaver = null; }
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const p = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(qs || '');
  window.scrollTo(0, 0);
  try {
    switch (p[0]) {
      case undefined: case '': setTab('home'); return home();
      case 'd': setTab('home'); return domainView(p[1]);
      case 'c': setTab('home'); return chapterView(p[1], p[2] || 'resumen', q);
      case 'test': setTab('test'); return testSetup(q);
      case 'fichas': setTab('home'); return cardsGlobal(p[1] || 'pend');
      case 'buscar': setTab('buscar'); return searchView(q.get('q') || '');
      case 'audios': setTab('audios'); return audiosView();
      case 'ajustes': setTab('ajustes'); return settingsView();
      default: location.hash = '#/';
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty">Algo falló al abrir esta pantalla.<br><a href="#/">Volver al inicio</a></div>`;
  }
}

// ---------- inicio ----------
function home() {
  header('CPP Estudio', null);
  const chs = Object.values(CH).map(x => x.c);
  const readN = chs.filter(c => S.read[c.id]).length;
  const kn = known(ALLCARDS);
  const ok = answeredOk(ALLQ);
  const wrong = wrongQs().length;
  const pend = pendingCards(ALLCARDS).length;
  const last = S.lastCh && CH[S.lastCh] ? CH[S.lastCh].c : null;
  view.innerHTML = `
    <div class="hero"><h2>Certified Protection Professional</h2><p>Protection of Assets 2021 · todo guardado en este dispositivo</p></div>
    <div class="stats">
      <div class="stat"><b>${readN}/${chs.length}</b><span>capítulos leídos</span></div>
      <div class="stat"><b>${pct(kn, ALLCARDS.length)}%</b><span>fichas dominadas</span></div>
      <div class="stat"><b>${pct(ok, ALLQ.length)}%</b><span>preguntas acertadas</span></div>
    </div>
    ${last ? `<a class="btn primary block" href="#/c/${last.id}/resumen">Seguir: ${esc(chShort(last))} · ${esc(last.title)}</a>` : `<a class="btn primary block" href="#/d/${esc(IDX.find(d => d.ready)?.id || '')}">Empezar a estudiar</a>`}
    <div class="row" style="margin-top:8px">
      <a class="btn" href="#/test">Simulacro</a>
      <a class="btn" href="#/fichas/pend">Fichas (${pend})</a>
    </div>
    ${wrong ? `<a class="btn block" style="margin-top:8px" href="#/test?scope=fallos">Repasar mis fallos (${wrong})</a>` : ''}
    <h3 class="sec-title">Dominios</h3>
    <div class="list">${IDX.map(d => {
      if (!d.ready) return `<div class="item off"><div class="num">·</div><div class="grow"><div class="t">${esc(d.title)}</div><div class="s">${esc(d.es)} · contenido pendiente de cargar</div></div></div>`;
      const dd = DATA[d.id]; const cs = dd.chapters;
      const cards = cs.flatMap(c => c.cards), qs = cs.flatMap(c => c.quiz);
      const rd = cs.filter(c => S.read[c.id]).length;
      return `<a class="item" href="#/d/${d.id}"><div class="num ${rd === cs.length ? 'done' : ''}">${rd === cs.length ? '✓' : pct(rd, cs.length) + '%'}</div><div class="grow"><div class="t">${esc(d.title)}</div><div class="s">${esc(d.es)} · ${cs.length} capítulos</div>
        <div class="pills"><span class="pill">${rd}/${cs.length} leídos</span><span class="pill ${known(cards) === cards.length ? 'ok' : ''}">${known(cards)}/${cards.length} fichas</span><span class="pill">${pct(answeredOk(qs), qs.length)}% test</span></div></div><span class="chev">›</span></a>`;
    }).join('')}</div>
    <p class="note" id="offline-note"></p>`;
  offlineStatus().then(t => { const n = $('#offline-note'); if (n) n.innerHTML = t; });
}

// ---------- dominio ----------
function domainView(id) {
  const d = DATA[id];
  if (!d) { location.hash = '#/'; return; }
  header(d.title, '#/');
  const cards = d.chapters.flatMap(c => c.cards);
  view.innerHTML = `
    <div class="hero"><h2>${esc(d.title)}</h2><p>${esc(d.es)}</p></div>
    <div class="row">
      <a class="btn" href="#/test?scope=${d.id}">Simulacro</a>
      <a class="btn" href="#/fichas/${d.id}">Fichas (${pendingCards(cards).length})</a>
    </div>
    <h3 class="sec-title">Capítulos</h3>
    <div class="list">${d.chapters.map(c => {
      const rd = !!S.read[c.id]; const best = S.best[c.id];
      return `<a class="item" href="#/c/${c.id}/resumen"><div class="num ${rd ? 'done' : ''}">${rd ? '✓' : esc(c.num)}</div>
        <div class="grow"><div class="t">${esc(c.title)}</div><div class="s">${esc(chLabel(c))}${c.pages ? ' · págs. ' + esc(c.pages) : ''}</div>
        <div class="pills"><span class="pill ${known(c.cards) === c.cards.length && c.cards.length ? 'ok' : ''}">${known(c.cards)}/${c.cards.length} fichas</span>
        <span class="pill ${best >= 80 ? 'ok' : ''}">${best != null ? 'test ' + best + '%' : 'test sin hacer'}</span>
        ${c.ojo.length ? `<span class="pill amber">${c.ojo.length} ojo</span>` : ''}</div></div><span class="chev">›</span></a>`;
    }).join('')}</div>`;
}

// ---------- capítulo ----------
function chapterView(id, tab, q) {
  const x = CH[id];
  if (!x) { location.hash = '#/'; return; }
  const { c, d, i } = x;
  S.lastCh = id; save();
  header(`${chShort(c)} · ${c.title}`, `#/d/${d.id}`);
  const tabs = [['resumen', 'Resumen', ''], ['fichas', 'Fichas', c.cards.length], ['test', 'Test', c.quiz.length], ['ojo', 'Ojo', c.ojo.length]];
  view.innerHTML = `
    <div class="tabs-wrap"><div class="tabs">${tabs.map(([k, l, n]) => `<a href="#/c/${id}/${k}" class="${k === tab ? 'on' : ''}">${l}${n !== '' ? ` <small>${n}</small>` : ''}</a>`).join('')}</div></div>
    <div id="pane"></div>`;
  const pane = $('#pane');
  const prev = d.chapters[i - 1], next = d.chapters[i + 1];
  const nav = `<div class="chnav">${prev ? `<a class="btn" href="#/c/${prev.id}/${tab}">‹ ${esc(chShort(prev))}</a>` : ''}${next ? `<a class="btn" href="#/c/${next.id}/${tab}">${esc(chShort(next))} ›</a>` : ''}</div>`;

  if (tab === 'resumen') {
    pane.innerHTML = `
      <div class="chhead"><div class="meta">${esc(chLabel(c))}${c.pages ? ' · págs. ' + esc(c.pages) : ''}</div><h2>${esc(c.title)}</h2></div>
      ${c.idea ? `<div class="idea"><b>Idea central</b>${c.idea}</div>` : ''}
      ${c.toc.length > 1 ? `<div class="toc">${c.toc.map(t => `<a href="#" data-jump="${id}-${t.id}">${esc(t.t)}</a>`).join('')}</div>` : ''}
      <article class="prose" id="prose">${c.html}</article>
      <div class="readbox"><button class="btn block ${S.read[id] ? 'ok' : 'primary'}" id="readBtn">${S.read[id] ? '✓ Leído' : 'Marcar como leído'}</button></div>
      ${nav}`;
    $$('[data-jump]', pane).forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    $('#readBtn').onclick = () => {
      if (S.read[id]) delete S.read[id]; else S.read[id] = Date.now();
      save();
      const b = $('#readBtn'); b.className = 'btn block ' + (S.read[id] ? 'ok' : 'primary'); b.textContent = S.read[id] ? '✓ Leído' : 'Marcar como leído';
      if (S.read[id]) toast('Capítulo marcado como leído');
    };
    const term = q.get('q');
    if (term) {
      const first = highlight($('#prose'), term);
      if (first) setTimeout(() => first.scrollIntoView({ block: 'center' }), 60);
    } else if (S.scroll[id]) {
      setTimeout(() => window.scrollTo(0, S.scroll[id]), 30);
    }
    let t;
    scrollSaver = () => { clearTimeout(t); t = setTimeout(() => { S.scroll[id] = Math.round(window.scrollY); save(); }, 400); };
    window.addEventListener('scroll', scrollSaver, { passive: true });
  } else if (tab === 'fichas') {
    const pend = pendingCards(c.cards);
    pane.innerHTML = `<div class="card"><div class="t" style="font-weight:600">${c.cards.length} fichas · ${known(c.cards)} dominadas</div>
      <div class="bar" style="margin:10px 0 12px"><i style="width:${pct(known(c.cards), c.cards.length)}%"></i></div>
      <div class="row"><button class="btn primary" id="cP" ${pend.length ? '' : 'disabled'}>Pendientes (${pend.length})</button><button class="btn" id="cA">Todas</button></div></div>
      <div id="cardsArea"></div>${nav}`;
    $('#cP').onclick = () => startCards(pend, $('#cardsArea'));
    $('#cA').onclick = () => startCards(c.cards, $('#cardsArea'));
    startCards(pend, $('#cardsArea'));
  } else if (tab === 'test') {
    const best = S.best[id], last = S.last[id];
    pane.innerHTML = `<div id="quizArea"></div>${nav}`;
    const intro = () => {
      $('#quizArea').innerHTML = `<div class="card"><div style="font-weight:600">${c.quiz.length} preguntas de opción múltiple</div>
        <p class="note" style="margin:6px 0 12px">${best != null ? `Mejor resultado: ${best}% · último: ${last}%` : 'Aún no lo has hecho.'} Las opciones se barajan en cada intento.${c.quiz[0]?.auto ? ' Hecho con tus preguntas de repaso: las opciones falsas son respuestas de otras preguntas.' : ''}</p>
        <button class="btn primary block" id="qGo">Empezar test</button></div>`;
      $('#qGo').onclick = () => startQuiz(c.quiz, $('#quizArea'), { key: id, onExit: intro });
    };
    intro();
  } else {
    pane.innerHTML = c.ojo.length ? `<p class="note" style="margin-top:0">Trampas y discrepancias del libro que conviene recordar para el examen.</p>
      ${c.ojo.map(o => `<div class="card ojo-card"><div class="pill amber" style="display:inline-block;margin-bottom:6px">${esc(o.s)}</div><div>${o.h}</div></div>`).join('')}${nav}`
      : `<div class="empty">Este capítulo no tiene notas de «ojo para el examen».</div>${nav}`;
  }
}

function highlight(root, term) {
  const needle = term.toLowerCase();
  const nodes = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) if (w.currentNode.nodeValue.toLowerCase().includes(needle)) nodes.push(w.currentNode);
  let first = null;
  for (const n of nodes) {
    const v = n.nodeValue, lo = v.toLowerCase(); const frag = document.createDocumentFragment();
    let pos = 0, k;
    while ((k = lo.indexOf(needle, pos)) !== -1) {
      frag.append(v.slice(pos, k));
      const m = document.createElement('mark'); m.textContent = v.slice(k, k + term.length); frag.append(m);
      if (!first) first = m;
      pos = k + term.length;
    }
    frag.append(v.slice(pos));
    n.parentNode.replaceChild(frag, n);
  }
  return first;
}

// ---------- fichas ----------
function startCards(list, area, opts = {}) {
  if (!list.length) { area.innerHTML = `<div class="empty">No hay fichas pendientes aquí. ¡Bien!</div>`; return; }
  const ses = { deck: shuffle(list), i: 0, ok: 0, again: [], flipped: false };
  SESSION = ses;
  const draw = () => {
    if (SESSION !== ses) return;
    if (ses.i >= ses.deck.length) {
      area.innerHTML = `<div class="card score"><b>${ses.ok}/${ses.deck.length}</b><span>las sabías</span></div>
        <div class="row">${ses.again.length ? `<button class="btn primary" id="fAgain">Repasar las ${ses.again.length} que fallaste</button>` : ''}<button class="btn" id="fAll">Barajar de nuevo</button></div>`;
      $('#fAgain', area)?.addEventListener('click', () => startCards(ses.again, area, opts));
      $('#fAll', area).onclick = () => startCards(list, area, opts);
      return;
    }
    const k = ses.deck[ses.i];
    area.innerHTML = `
      <div class="progress-line"><span>${ses.i + 1} / ${ses.deck.length}</span><span>✓ ${ses.ok} · ✗ ${ses.again.length}</span></div>
      <div class="flash" id="flash" role="button" aria-label="Voltear ficha">
        ${opts.ctx ? `<div class="ctx">${esc(k.d.title)} · ${esc(chShort(k.ch))}</div>` : ''}
        <div class="q">${k.q}</div>
        <div class="a" ${ses.flipped ? '' : 'hidden'}>${k.a}</div>
        <div class="hint">${ses.flipped ? '¿La sabías?' : 'Toca para ver la respuesta'}</div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn bad" id="fNo" ${ses.flipped ? '' : 'disabled'}>✗ Repasar</button>
        <button class="btn ok" id="fYes" ${ses.flipped ? '' : 'disabled'}>✓ La sé</button>
      </div>`;
    $('#flash', area).onclick = () => { ses.flipped = !ses.flipped; draw(); };
    const mark = good => {
      S.cards[k.id] = good ? 2 : 1; save();
      if (good) ses.ok++; else ses.again.push(k);
      ses.i++; ses.flipped = false; draw();
    };
    $('#fNo', area).onclick = () => mark(false);
    $('#fYes', area).onclick = () => mark(true);
  };
  draw();
}

function cardsGlobal(scope) {
  let list, title;
  if (scope === 'pend') { list = pendingCards(ALLCARDS); title = 'Fichas pendientes'; }
  else if (DATA[scope]) { list = pendingCards(DATA[scope].chapters.flatMap(c => c.cards)); title = `Fichas · ${DATA[scope].title}`; }
  else { list = ALLCARDS; title = 'Todas las fichas'; }
  header(title, scope === 'pend' || !DATA[scope] ? '#/' : `#/d/${scope}`);
  view.innerHTML = `<p class="note" style="margin-top:0">${list.length} fichas sin dominar. Toca la ficha para ver la respuesta y marca si la sabías.</p><div id="cardsArea"></div>
    <a class="btn block" href="#/fichas/todas" style="margin-top:14px">Practicar todas (${ALLCARDS.length})</a>`;
  startCards(scope === 'todas' ? ALLCARDS : list, $('#cardsArea'), { ctx: true });
}

// ---------- test ----------
function startQuiz(questions, area, opts = {}) {
  const ses = { qs: shuffle(questions).map(q => ({ q, order: shuffle(q.o.map((_, j) => j)) })), i: 0, picks: [], t0: Date.now() };
  SESSION = ses;
  const letters = 'ABCDEFG';
  const draw = () => {
    if (SESSION !== ses) return;
    if (ses.i >= ses.qs.length) return result();
    const { q, order } = ses.qs[ses.i];
    const picked = ses.picks[ses.i];
    area.innerHTML = `
      <div class="progress-line"><span>Pregunta ${ses.i + 1} de ${ses.qs.length}</span><span>${ses.picks.filter((p, j) => p === ses.qs[j].q.c).length} aciertos</span></div>
      <div class="bar" style="margin-bottom:12px"><i style="width:${pct(ses.i, ses.qs.length)}%"></i></div>
      <div class="card qcard">
        ${opts.ctx ? `<div class="pill" style="display:inline-block;margin-bottom:8px">${esc(q.d.title)} · ${esc(chShort(q.ch))}</div>` : ''}
        <p class="prompt">${esc(q.q)}</p>
        ${order.map((j, n) => {
          let cls = '';
          if (picked != null) { if (j === q.c) cls = 'right'; else if (j === picked) cls = 'wrong'; }
          return `<button class="opt ${cls}" data-j="${j}" ${picked != null ? 'disabled' : ''}><b>${letters[n]}</b>${esc(q.o[j])}</button>`;
        }).join('')}
        ${picked != null ? `<div class="explain"><b class="${picked === q.c ? 'okk' : 'no'}">${picked === q.c ? 'Correcto.' : 'Incorrecto.'}</b> ${q.e ? esc(q.e) : 'Respuesta de las preguntas de repaso del capítulo.'}</div>
          <button class="btn primary block" id="qNext">${ses.i + 1 < ses.qs.length ? 'Siguiente' : 'Ver resultado'}</button>` : ''}
      </div>
      <button class="btn block" id="qQuit" style="margin-top:4px">Terminar aquí</button>`;
    $$('.opt', area).forEach(b => b.onclick = () => {
      const j = +b.dataset.j;
      ses.picks[ses.i] = j;
      const r = S.qa[q.id] || { n: 0, w: 0 };
      r.n++; r.ok = j === q.c; if (!r.ok) r.w++; r.t = Date.now();
      S.qa[q.id] = r; save();
      draw();
      $('#qNext', area)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    $('#qNext', area)?.addEventListener('click', () => { ses.i++; draw(); window.scrollTo(0, area.offsetTop - 120); });
    $('#qQuit', area).onclick = () => { ses.qs = ses.qs.slice(0, ses.picks.filter(p => p != null).length); result(); };
  };
  const result = () => {
    const done = ses.qs.length;
    const ok = ses.qs.filter((x, j) => ses.picks[j] === x.q.c).length;
    const p = pct(ok, done);
    if (opts.key && done === questions.length) {
      S.last[opts.key] = p;
      S.best[opts.key] = Math.max(S.best[opts.key] ?? 0, p);
    }
    if (done) { S.sims.unshift({ t: Date.now(), n: done, ok, s: opts.label || opts.key || 'test', secs: Math.round((Date.now() - ses.t0) / 1000) }); S.sims = S.sims.slice(0, 40); }
    save(true);
    const wrong = ses.qs.filter((x, j) => ses.picks[j] !== x.q.c);
    area.innerHTML = `
      <div class="card score"><b>${p}%</b><span>${ok} de ${done} correctas · ${fmtTime((Date.now() - ses.t0) / 1000)}</span></div>
      <div class="row">${wrong.length ? `<button class="btn primary" id="rWrong">Repetir las ${wrong.length} falladas</button>` : ''}<button class="btn" id="rAgain">Repetir test</button></div>
      ${opts.onExit ? `<button class="btn block" id="rExit" style="margin-top:8px">Cerrar</button>` : ''}
      ${wrong.length ? `<h3 class="sec-title">Para repasar</h3><div class="list review">${wrong.map(x => `<div class="item"><div class="grow"><div class="t">${esc(x.q.q)}</div>
        <div class="s"><b style="color:var(--ok)">${esc(x.q.o[x.q.c])}</b>${x.q.e ? ' — ' + esc(x.q.e) : ''}</div>
        <div class="s"><a href="#/c/${x.q.ch.id}/resumen">${esc(x.q.d.title)} · ${esc(chShort(x.q.ch))}</a></div></div></div>`).join('')}</div>` : ''}`;
    $('#rWrong', area)?.addEventListener('click', () => startQuiz(wrong.map(x => x.q), area, { ...opts, key: null }));
    $('#rAgain', area).onclick = () => startQuiz(questions, area, opts);
    $('#rExit', area)?.addEventListener('click', () => opts.onExit());
    window.scrollTo(0, 0);
  };
  draw();
}

function testSetup(q) {
  header('Simulacro', null);
  const ready = IDX.filter(d => d.ready);
  let scope = q.get('scope') || 'all';
  let n = 25;
  const pool = () => scope === 'fallos' ? wrongQs() : scope === 'all' ? ALLQ : ALLQ.filter(x => x.d.id === scope);
  const draw = () => {
    const P = pool();
    view.innerHTML = `
      <div class="hero"><h2>Simulacro</h2><p>Preguntas mezcladas de varios capítulos, con explicación al responder.</p></div>
      <div class="card">
        <div style="font-weight:600">Qué entra</div>
        <div class="seg" id="sc">
          <button data-v="all" class="${scope === 'all' ? 'on' : ''}">Todo</button>
          ${ready.map(d => `<button data-v="${d.id}" class="${scope === d.id ? 'on' : ''}">${esc(d.title)}</button>`).join('')}
          <button data-v="fallos" class="${scope === 'fallos' ? 'on' : ''}">Mis fallos (${wrongQs().length})</button>
        </div>
        <div style="font-weight:600">Cuántas preguntas</div>
        <div class="seg" id="nn">${[10, 25, 50, 0].map(v => `<button data-v="${v}" class="${n === v ? 'on' : ''}">${v || 'Todas'}</button>`).join('')}</div>
        <button class="btn primary block" id="go" ${P.length ? '' : 'disabled'}>Empezar (${n ? Math.min(n, P.length) : P.length} preguntas)</button>
      </div>
      <div id="quizArea"></div>
      ${S.sims.length ? `<div id="hist"><h3 class="sec-title">Últimos intentos</h3><div class="list">${S.sims.slice(0, 8).map(s => `<div class="item"><div class="grow"><div class="t">${pct(s.ok, s.n)}% · ${s.ok}/${s.n}</div><div class="s">${esc(labelOf(s.s))} · ${new Date(s.t).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${fmtTime(s.secs)}</div></div></div>`).join('')}</div></div>` : ''}`;
    $$('#sc button').forEach(b => b.onclick = () => { scope = b.dataset.v; draw(); });
    $$('#nn button').forEach(b => b.onclick = () => { n = +b.dataset.v; draw(); });
    $('#go').onclick = () => {
      const qs = shuffle(P).slice(0, n || P.length);
      const area = $('#quizArea');
      $('.card', view).hidden = true; $('.hero', view).hidden = true;
      if ($('#hist')) $('#hist').hidden = true;
      startQuiz(qs, area, { ctx: true, label: scope, onExit: draw });
    };
  };
  draw();
}
function labelOf(s) {
  if (s === 'all') return 'Simulacro general';
  if (s === 'fallos') return 'Repaso de fallos';
  if (DATA[s]) return `Simulacro · ${DATA[s].title}`;
  if (CH[s]) return `${CH[s].d.title} · ${chShort(CH[s].c)}`;
  return 'Test';
}

// ---------- búsqueda ----------
function searchView(term) {
  header('Buscar', null);
  view.innerHTML = `<input class="search" id="sq" type="search" placeholder="Busca un concepto: VRIN, Abilene, EBITDA…" value="${esc(term)}" autocomplete="off" enterkeyhint="search"><div id="sr" style="margin-top:12px"></div>`;
  const input = $('#sq');
  let t;
  const run = () => {
    const v = input.value.trim();
    history.replaceState(null, '', '#/buscar' + (v ? '?q=' + encodeURIComponent(v) : ''));
    const out = $('#sr');
    if (v.length < 2) { out.innerHTML = `<p class="note">Escribe al menos 2 letras. Busca en resúmenes, fichas y notas de examen.</p>`; return; }
    const lo = v.toLowerCase();
    const hits = [];
    for (const { c, d } of Object.values(CH)) {
      if (c.text == null) c.text = plain(c.html);
      const txt = c.text; const L = txt.toLowerCase();
      let k = L.indexOf(lo), count = 0, first = k;
      while (k !== -1) { count++; k = L.indexOf(lo, k + lo.length); }
      const cardHits = c.cards.filter(x => plain(x.q + ' ' + x.a).toLowerCase().includes(lo)).length;
      if (count || cardHits) {
        let snip = '';
        if (first !== -1) {
          const a = Math.max(0, first - 60), b = Math.min(txt.length, first + lo.length + 80);
          snip = (a ? '…' : '') + esc(txt.slice(a, first)) + '<mark>' + esc(txt.slice(first, first + lo.length)) + '</mark>' + esc(txt.slice(first + lo.length, b)) + (b < txt.length ? '…' : '');
        }
        hits.push({ c, d, count, cardHits, snip });
      }
    }
    hits.sort((a, b) => (b.count + b.cardHits) - (a.count + a.cardHits));
    out.innerHTML = hits.length ? `<div class="list">${hits.map(h => `<a class="item" href="#/c/${h.c.id}/resumen?q=${encodeURIComponent(v)}"><div class="grow">
      <div class="t">${esc(h.d.title)} · ${esc(chShort(h.c))} · ${esc(h.c.title)}</div>
      <div class="snip">${h.snip}</div><div class="pills"><span class="pill">${h.count} en el resumen</span>${h.cardHits ? `<span class="pill">${h.cardHits} en fichas</span>` : ''}</div></div><span class="chev">›</span></a>`).join('')}</div>`
      : `<div class="empty">Sin resultados para «${esc(v)}».</div>`;
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 200); });
  run();
  if (!term) setTimeout(() => input.focus(), 50);
}

// ---------- audios (IndexedDB) ----------
const ADB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('cpp-audios', 1);
      r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('meta', { keyPath: 'id' }); db.createObjectStore('data', { keyPath: 'id' }); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(stores, mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction(stores, mode); let out;
      Promise.resolve(fn(t)).then(v => { out = v; });
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort'));
    });
  },
  req: r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async list() { return (await this.tx(['meta'], 'readonly', t => this.req(t.objectStore('meta').getAll()))).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })); },
  async get(id) { return this.tx(['data'], 'readonly', t => this.req(t.objectStore('data').get(id))); },
  async getMeta(id) { return this.tx(['meta'], 'readonly', t => this.req(t.objectStore('meta').get(id))); },
  async add(meta, buf) { return this.tx(['meta', 'data'], 'readwrite', t => { t.objectStore('meta').put(meta); t.objectStore('data').put({ id: meta.id, buf }); }); },
  async putMeta(meta) { return this.tx(['meta'], 'readwrite', t => { t.objectStore('meta').put(meta); }); },
  async del(id) { return this.tx(['meta', 'data'], 'readwrite', t => { t.objectStore('meta').delete(id); t.objectStore('data').delete(id); }); },
};

const player = $('#player');
let current = null; // meta del audio cargado
let curURL = null;
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

async function loadAudio(id, autoplay = true) {
  const meta = await ADB.getMeta(id);
  const rec = await ADB.get(id);
  if (!meta || !rec) { toast('No se encontró el audio'); return; }
  if (curURL) URL.revokeObjectURL(curURL);
  curURL = URL.createObjectURL(new Blob([rec.buf], { type: meta.type || 'audio/mp4' }));
  current = meta;
  player.src = curURL;
  player.playbackRate = S.speed || 1;
  const start = S.apos[id] || 0;
  const seekStart = () => { if (start && start < (player.duration || Infinity) - 3) player.currentTime = start; player.playbackRate = S.speed || 1; };
  player.addEventListener('loadedmetadata', seekStart, { once: true });
  $('#mini').hidden = false; document.body.classList.add('has-mini');
  $('#mTitle').textContent = meta.name;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: meta.name, artist: 'CPP Estudio', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  }
  if (autoplay) player.play().catch(() => {});
  miniUI();
  if (location.hash.startsWith('#/audios')) audiosView();
}
function miniUI() {
  $('#mPlay').innerHTML = player.paused ? ICON_PLAY : ICON_PAUSE;
  $('#mPlay').setAttribute('aria-label', player.paused ? 'Reproducir' : 'Pausar');
  $('#mSpeed').textContent = (S.speed || 1) + '×';
  const d = player.duration || 0;
  $('#mTime').textContent = fmtTime(player.currentTime);
  $('#mDur').textContent = d && isFinite(d) ? '−' + fmtTime(d - player.currentTime) : '';
  if (!seeking) $('#mSeek').value = d && isFinite(d) ? Math.round(1000 * player.currentTime / d) : 0;
}
let seeking = false, posT = 0;
player.addEventListener('timeupdate', () => {
  miniUI();
  if (current && Date.now() - posT > 4000) { posT = Date.now(); S.apos[current.id] = player.currentTime; save(); }
});
player.addEventListener('play', miniUI);
player.addEventListener('pause', () => { miniUI(); if (current) { S.apos[current.id] = player.currentTime; save(true); } });
player.addEventListener('ended', () => { if (current) { S.apos[current.id] = 0; S.adone[current.id] = true; save(true); } miniUI(); });
const savePos = () => { if (current && player.currentTime) { S.apos[current.id] = player.currentTime; save(true); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') savePos(); });
window.addEventListener('pagehide', savePos);
$('#mPlay').onclick = () => player.paused ? player.play().catch(() => {}) : player.pause();
$('#mBack').onclick = () => { player.currentTime = Math.max(0, player.currentTime - 15); };
$('#mFwd').onclick = () => { player.currentTime = Math.min(player.duration || 0, player.currentTime + 30); };
$('#mSpeed').onclick = () => { const i = SPEEDS.indexOf(S.speed || 1); S.speed = SPEEDS[(i + 1) % SPEEDS.length]; player.playbackRate = S.speed; save(); miniUI(); };
const seek = $('#mSeek');
seek.addEventListener('input', () => { seeking = true; const d = player.duration || 0; $('#mTime').textContent = fmtTime(d * seek.value / 1000); });
seek.addEventListener('change', () => { const d = player.duration || 0; if (d) player.currentTime = d * seek.value / 1000; seeking = false; });
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  try {
    ms.setActionHandler('play', () => player.play());
    ms.setActionHandler('pause', () => player.pause());
    ms.setActionHandler('seekbackward', () => { player.currentTime = Math.max(0, player.currentTime - 15); });
    ms.setActionHandler('seekforward', () => { player.currentTime = Math.min(player.duration || 0, player.currentTime + 30); });
    ms.setActionHandler('seekto', e => { if (e.seekTime != null) player.currentTime = e.seekTime; });
  } catch (e) { /* no soportado */ }
}

async function audiosView() {
  header('Audios', null);
  view.innerHTML = `<div class="hero"><h2>Audios</h2><p>Se guardan dentro de la app en este dispositivo y se escuchan sin conexión.</p></div>
    <label class="btn primary block" for="afile">Añadir audios desde Archivos</label>
    <input type="file" id="afile" accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4" multiple hidden>
    <p class="note" id="aStatus"></p>
    <div id="alist"><p class="loading">Cargando…</p></div>`;
  $('#afile').onchange = e => importAudios([...e.target.files]);
  let items = [];
  try { items = await ADB.list(); } catch (e) { $('#alist').innerHTML = `<div class="empty">Este navegador no permite guardar audios (IndexedDB no disponible).</div>`; return; }
  if (!location.hash.startsWith('#/audios')) return;
  const total = items.reduce((s, x) => s + x.size, 0);
  $('#alist').innerHTML = items.length ? `
    <div class="list">${items.map(m => {
      const pos = S.apos[m.id] || 0, playing = current?.id === m.id;
      return `<div class="item"><button class="iconbtn" data-play="${m.id}" aria-label="Reproducir" style="background:var(--accent-soft)">${playing && !player.paused ? ICON_PAUSE : ICON_PLAY}</button>
        <div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${fmtMB(m.size)}${m.dur ? ' · ' + fmtTime(m.dur) : ''}${pos > 5 ? ' · vas en ' + fmtTime(pos) : ''}${S.adone[m.id] ? ' · escuchado ✓' : ''}</div></div>
        <button class="iconbtn sm" data-ren="${m.id}" aria-label="Renombrar">Aa</button>
        <button class="iconbtn sm" data-del="${m.id}" aria-label="Borrar" style="color:var(--bad)">✕</button></div>`;
    }).join('')}</div><p class="note">${items.length} audio${items.length > 1 ? 's' : ''} · ${fmtMB(total)} en este dispositivo.</p>`
    : `<div class="empty">Aún no has añadido audios.<br>Descárgalos de NotebookLM al iPhone (app Archivos) y añádelos aquí.</div>`;
  $$('[data-play]').forEach(b => b.onclick = () => {
    const id = b.dataset.play;
    if (current?.id === id) { player.paused ? player.play().catch(() => {}) : player.pause(); setTimeout(audiosView, 50); }
    else loadAudio(id);
  });
  $$('[data-ren]').forEach(b => b.onclick = async () => {
    const m = items.find(x => x.id === b.dataset.ren);
    const name = prompt('Nombre del audio', m.name);
    if (name && name.trim()) { m.name = name.trim(); await ADB.putMeta(m); if (current?.id === m.id) { current.name = m.name; $('#mTitle').textContent = m.name; } audiosView(); }
  });
  $$('[data-del]').forEach(b => b.onclick = async () => {
    const m = items.find(x => x.id === b.dataset.del);
    if (!confirm(`¿Borrar «${m.name}» de este dispositivo?`)) return;
    if (current?.id === m.id) { player.pause(); player.removeAttribute('src'); player.load(); current = null; $('#mini').hidden = true; document.body.classList.remove('has-mini'); }
    await ADB.del(m.id); delete S.apos[m.id]; delete S.adone[m.id]; save();
    toast('Audio borrado'); audiosView();
  });
}

async function importAudios(files) {
  if (!files.length) return;
  const st = $('#aStatus');
  if (navigator.storage?.persist) { try { await navigator.storage.persist(); } catch (e) { /* opcional */ } }
  let n = 0;
  for (const f of files) {
    n++;
    if (st) st.textContent = `Guardando ${n} de ${files.length}: ${f.name}…`;
    try {
      const buf = await f.arrayBuffer();
      const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const meta = { id, name: f.name.replace(/\.[^.]+$/, ''), size: f.size, type: f.type || guessType(f.name), added: Date.now(), dur: 0 };
      meta.dur = await probeDuration(buf, meta.type);
      await ADB.add(meta, buf);
    } catch (e) {
      console.error(e);
      toast(e && e.name === 'QuotaExceededError' ? 'No hay espacio suficiente en el dispositivo' : `No se pudo guardar ${f.name}`);
    }
  }
  if (st) st.textContent = '';
  toast(files.length > 1 ? `${files.length} audios guardados` : 'Audio guardado');
  audiosView();
}
function guessType(name) {
  const e = name.split('.').pop().toLowerCase();
  return { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg' }[e] || 'audio/mpeg';
}
function probeDuration(buf, type) {
  return new Promise(res => {
    const a = new Audio(); const u = URL.createObjectURL(new Blob([buf], { type }));
    const done = v => { URL.revokeObjectURL(u); res(v && isFinite(v) ? Math.round(v) : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0);
    setTimeout(() => done(0), 8000); a.src = u;
  });
}

// ---------- ajustes ----------
async function offlineStatus() {
  if (!('serviceWorker' in navigator)) return '<span class="status-warn">Este navegador no permite el modo sin conexión.</span>';
  if (location.protocol === 'file:') return '<span class="status-warn">Abierta como archivo: sin modo sin conexión.</span>';
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.active && navigator.serviceWorker.controller) return `<span class="status-ok">✓ Lista para usar sin conexión</span>`;
  return '<span class="status-warn">Preparando el modo sin conexión… abre la app una vez con internet.</span>';
}
async function settingsView() {
  header('Ajustes', null);
  let est = null, persisted = null;
  try { est = await navigator.storage?.estimate?.(); persisted = await navigator.storage?.persisted?.(); } catch (e) { /* opcional */ }
  if (!location.hash.startsWith('#/ajustes')) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  view.innerHTML = `
    <div class="hero"><h2>Ajustes</h2><p>Versión ${esc(window.CPP_VERSION || '—')}</p></div>
    <h3 class="sec-title">Sin conexión</h3>
    <div class="card">
      <div id="offst">…</div>
      <p class="note" style="margin:8px 0 0">${standalone ? 'Estás usando la app instalada.' : 'En el iPhone: botón Compartir → «Añadir a pantalla de inicio», y ábrela desde el icono. La app instalada guarda su propio avance y audios, separados de Safari.'}</p>
      ${est ? `<p class="note" style="margin:8px 0 0">Espacio usado por la app: ${fmtMB(est.usage || 0)}${est.quota ? ' de ' + fmtMB(est.quota) + ' disponibles' : ''}.</p>` : ''}
      <p class="note" style="margin:8px 0 0">Almacenamiento persistente: ${persisted ? '<span class="status-ok">activado</span>' : 'no confirmado'}.</p>
      <div class="row" style="margin-top:10px"><button class="btn" id="persist">Asegurar datos</button><button class="btn" id="upd">Buscar actualización</button></div>
    </div>
    <h3 class="sec-title">Copia de seguridad del avance</h3>
    <div class="card">
      <p class="note" style="margin-top:0">Guarda lo leído, las fichas, los tests y la posición de los audios (los audios no se incluyen). Úsala para pasar el avance a otro dispositivo.</p>
      <div class="row"><button class="btn primary" id="exp">Exportar</button><label class="btn" for="impf">Importar</label></div>
      <input type="file" id="impf" accept="application/json,.json" hidden>
    </div>
    <h3 class="sec-title">Reiniciar</h3>
    <div class="card"><div class="row"><button class="btn" id="rCards">Reiniciar fichas</button><button class="btn" id="rTests">Reiniciar tests</button></div>
    <button class="btn bad block" id="rAll" style="margin-top:8px">Borrar todo el avance</button></div>`;
  offlineStatus().then(t => { const e = $('#offst'); if (e) e.innerHTML = t; });
  $('#persist').onclick = async () => { const ok = await navigator.storage?.persist?.(); toast(ok ? 'Almacenamiento persistente activado' : 'El sistema no lo concedió (las apps instaladas en iPhone suelen conservar sus datos igualmente)'); settingsView(); };
  $('#upd').onclick = async () => { const r = await navigator.serviceWorker?.getRegistration(); if (!r) return toast('Sin service worker'); await r.update(); toast(navigator.onLine ? 'Comprobado' : 'Sin internet: se comprobará más tarde'); };
  $('#exp').onclick = exportProgress;
  $('#impf').onchange = e => importProgress(e.target.files[0]);
  $('#rCards').onclick = () => { if (confirm('¿Reiniciar todas las fichas?')) { S.cards = {}; save(true); toast('Fichas reiniciadas'); } };
  $('#rTests').onclick = () => { if (confirm('¿Reiniciar resultados de tests y simulacros?')) { S.qa = {}; S.best = {}; S.last = {}; S.sims = []; save(true); toast('Tests reiniciados'); } };
  $('#rAll').onclick = () => { if (confirm('¿Borrar TODO el avance de este dispositivo? Los audios se conservan.')) { const sp = S.speed; S = blank(); S.speed = sp; save(true); toast('Avance borrado'); } };
}
async function exportProgress() {
  const name = `cpp-avance-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify({ app: 'cpp-estudio', v: 1, at: new Date().toISOString(), data: S })], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Avance CPP' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function importProgress(f) {
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== 'cpp-estudio' || !j.data) throw new Error('formato');
    if (!confirm('Esto reemplaza el avance de este dispositivo por el del archivo. ¿Continuar?')) return;
    S = Object.assign(blank(), j.data); save(true); toast('Avance importado'); settingsView();
  } catch (e) { toast('El archivo no es una copia válida del avance'); }
}

// ---------- service worker ----------
function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const ask = w => {
      if (!w) return;
      $('#update').hidden = false;
      $('#updBtn').onclick = () => { w.postMessage('skip'); $('#update').hidden = true; };
    };
    if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); });
    });
  }).catch(e => console.warn('SW', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

// ---------- arranque ----------
async function start() {
  try {
    await Promise.all(IDX.filter(d => d.ready).map(d => loadScript(`data/${d.id}.js`)));
  } catch (e) {
    view.innerHTML = `<div class="empty">No se pudo cargar el contenido. Abre la app una vez con internet.</div>`;
    return;
  }
  DATA = window.CPP_DATA || {};
  indexData();
  window.addEventListener('hashchange', route);
  syncHeader();
  route();
  registerSW();
  loadScript('assets.js').catch(() => {});
  // Deja el último audio cargado (sin reproducir) en el minirreproductor
  if (S.lastAudio) ADB.getMeta(S.lastAudio).then(m => m && loadAudio(m.id, false)).catch(() => {});
  player.addEventListener('play', () => { if (current) { S.lastAudio = current.id; save(); } });
}
start();
})();
