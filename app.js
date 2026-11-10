/* CPP Estudio — app sin conexión, en español e inglés. Todo el avance se guarda en este dispositivo. */
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
const plainCache = new Map();
const plain = html => { if (!html) return ''; let v = plainCache.get(html); if (v == null) { const d = document.createElement('div'); d.innerHTML = html; v = d.textContent; if (html.length < 2000) plainCache.set(html, v); } return v; };
const view = $('#view');
let toastT;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }

// ---------- avance (localStorage) ----------
const KEY = 'cpp-estudio-v1';
const blank = () => ({ read: {}, cards: {}, qa: {}, best: {}, last: {}, apos: {}, adone: {}, scroll: {}, sims: [], speed: 1, lastCh: null, lang: 'es', name: '', time: [] });
let S = blank();
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sin datos */ }
let saveT;
function save(now) {
  clearTimeout(saveT);
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast(t('saveFail')); } };
  now ? w() : (saveT = setTimeout(w, 250));
}

// ---------- idioma ----------
const L = () => (S.lang === 'en' ? 'en' : 'es');
const EN = () => L() === 'en';
const T = {
  es: {
    app: 'Estudio CPP', back: 'Volver', langAria: 'Cambiar a inglés', saveFail: 'No se pudo guardar el avance',
    tab_home: 'Inicio', tab_test: 'Simulacro', tab_buscar: 'Buscar', tab_audios: 'Audios', tab_ajustes: 'Ajustes',
    err: 'Algo falló al abrir esta pantalla.', toHome: 'Volver al inicio',
    loadFail: 'No se pudo cargar el contenido. Abre la app una vez con internet.',
    hello: n => `Hola, ${n}`, yourProgress: 'Tu avance', heroSub: 'Los seis tomos de Protection of Assets (2021)',
    mRead: 'Capítulos leídos', mCards: 'Fichas dominadas', mQs: 'Preguntas acertadas',
    cont: 'Continuar', startStudy: 'Empezar a estudiar', startSub: 'Abre el primer capítulo',
    quick: 'Acceso rápido', qSim: 'Simulacro', qSimS: 'Preguntas mezcladas', qCards: 'Fichas', qCardsS: n => `${n} pendientes`,
    qWrong: 'Mis fallos', qWrongS: n => n ? `${n} por repasar` : 'Ninguno todavía', qAudio: 'Audios', qAudioS: 'Escucha sin conexión',
    volumes: 'Tomos', nChapters: n => `${n} capítulos`, factRead: (a, b) => `${a}/${b} leídos`, factCards: (a, b) => `${a}/${b} fichas`, factTest: p => `${p}% test`,
    simVol: 'Simulacro del tomo', cardsN: n => `Fichas (${n})`, chapters: 'Capítulos',
    pages: p => `págs. ${p}`, testBest: b => `test ${b}%`, testNone: 'test sin hacer', ojoN: n => `${n} ojo`,
    tResumen: 'Resumen', tFichas: 'Fichas', tTest: 'Test', tOjo: 'Ojo',
    idea: 'Idea central', langNoteSum: 'El resumen está en español. Fichas, tests e idea central cambian de idioma.',
    langNoteOjo: 'Estas notas están en español.',
    markRead: 'Marcar como leído', isRead: '✓ Leído', markedRead: 'Capítulo marcado como leído',
    prev: 'Anterior', next: 'Siguiente',
    cardsHead: (n, k) => `${n} fichas, ${k} dominadas`, pendBtn: n => `Pendientes (${n})`, allBtn: 'Todas',
    testHead: n => `${n} preguntas de opción múltiple`, bestLast: (b, l) => `Mejor resultado: ${b}%. Último: ${l}%.`, notYet: 'Aún no lo has hecho.',
    shuffled: 'Las opciones se barajan en cada intento.', autoNote: 'Hecho con las preguntas de repaso: las opciones falsas son respuestas de otras preguntas.',
    startTest: 'Empezar test', ojoIntro: 'Trampas y discrepancias del libro que conviene recordar para el examen.', ojoNone: 'Este capítulo no tiene notas de «ojo para el examen».',
    noPend: 'No hay fichas pendientes aquí.', front: 'Pregunta', backF: 'Respuesta', tapFlip: 'Toca la ficha para ver la respuesta', tapBack: 'Toca para volver a la pregunta',
    again: '✗ Repasar', knew: '✓ La sé', knewOf: (a, b) => `Sabías ${a} de ${b}`, deckDone: 'Mazo terminado',
    reviewMissed: n => `Repasar las ${n} que fallaste`, reshuffle: 'Barajar de nuevo',
    cPend: 'Fichas pendientes', cAll: 'Todas las fichas', cOf: d => `Fichas: ${d}`,
    cNote: n => `${n} fichas sin dominar. Toca la ficha para voltearla y marca si la sabías.`, practiceAll: n => `Practicar todas (${n})`,
    qOf: (i, n) => `Pregunta ${i} de ${n}`, nOk: n => `${n} aciertos`, right: 'Correcto.', wrong: 'Incorrecto.',
    autoE: 'La respuesta correcta viene de las preguntas de repaso del capítulo.', nextQ: 'Siguiente', seeRes: 'Ver resultado', quit: 'Terminar aquí',
    resOk: (a, b) => `${a} de ${b} correctas`, resTime: s => `Tiempo: ${s}`, retryMissed: n => `Repetir las ${n} falladas`, retake: 'Repetir test', close: 'Cerrar', toReview: 'Para repasar',
    simTitle: 'Simulacro', simH: 'Preguntas mezcladas de varios capítulos', simSub: 'Con explicación al responder cada pregunta.',
    include: 'Qué entra', everything: 'Todo', myWrong: n => `Mis fallos (${n})`, howMany: 'Cuántas preguntas', allQ: 'Todas',
    startN: n => `Empezar (${n} preguntas)`, recent: 'Últimos intentos', lFull: 'Simulacro general', lWrong: 'Repaso de fallos', lVol: d => `Simulacro: ${d}`, lTest: 'Test',
    searchPh: 'Busca un concepto: VRIN, Abilene, EBITDA…', searchHelp: 'Escribe al menos 2 letras. Busca en resúmenes, fichas y notas de examen.',
    searchEs: '', inSum: n => `${n} en el resumen`, inCards: n => `${n} en fichas`, noRes: v => `Sin resultados para «${v}».`,
    audioH: 'Audios', audioSub: 'Se guardan dentro de la app en este dispositivo y se escuchan sin conexión.', addAudio: 'Añadir audios desde Archivos',
    noIDB: 'Este navegador no permite guardar audios.', at: s => `vas en ${s}`, listened: 'escuchado ✓',
    audioEmpty: 'Aún no has añadido audios. Descárgalos de NotebookLM al iPhone (app Archivos) y añádelos aquí.',
    audioTotal: (n, mb) => `${n} ${n === 1 ? 'audio' : 'audios'}, ${mb} en este dispositivo.`, rename: 'Renombrar', del: 'Borrar', audioName: 'Nombre del audio',
    delQ: n => `¿Borrar «${n}» de este dispositivo?`, audioDeleted: 'Audio borrado', saving: (i, n, f) => `Guardando ${i} de ${n}: ${f}…`,
    noSpace: 'No hay espacio suficiente en el dispositivo', cantSave: f => `No se pudo guardar ${f}`, savedN: n => `${n} audios guardados`, saved1: 'Audio guardado',
    audioMissing: 'No se encontró el audio', play: 'Reproducir', pause: 'Pausar', back15: 'Atrás 15 segundos', fwd30: 'Adelante 30 segundos', speed: 'Velocidad', seek: 'Posición',
    setTitle: 'Ajustes', version: v => `Versión ${v}`, language: 'Idioma', profile: 'Perfil', nameLbl: 'Tu nombre (opcional)', nameNote: 'Solo se guarda en este dispositivo y aparece en el inicio.',
    offline: 'Sin conexión', standalone: 'Estás usando la app instalada.',
    installHow: 'En el iPhone: botón Compartir, «Añadir a pantalla de inicio», y ábrela desde el icono. La app instalada guarda su propio avance y audios, separados de Safari.',
    used: 'Espacio usado', of: 'de', persistent: 'Almacenamiento persistente', on: 'activado', notConf: 'no confirmado',
    persist: 'Asegurar datos', checkUpd: 'Buscar actualización', persistOk: 'Almacenamiento persistente activado',
    persistNo: 'El sistema no lo concedió (las apps instaladas en iPhone suelen conservar sus datos igualmente)',
    noSW: 'Modo sin conexión no disponible en este navegador', checked: 'Comprobado', noNet: 'Sin internet: se comprobará más tarde',
    backup: 'Copia de seguridad del avance', backupNote: 'Guarda lo leído, las fichas, los tests y la posición de los audios (los audios no se incluyen). Úsala para pasar el avance a otro dispositivo.',
    exp: 'Exportar', imp: 'Importar', reset: 'Reiniciar', rCards: 'Reiniciar fichas', rTests: 'Reiniciar tests', rAll: 'Borrar todo el avance',
    rCardsQ: '¿Reiniciar todas las fichas?', rTestsQ: '¿Reiniciar resultados de tests y simulacros?', rAllQ: '¿Borrar TODO el avance de este dispositivo? Los audios y la bitácora de tiempo se conservan.',
    timeTitle: 'Tiempo de estudio', timeKicker: 'Tiempo total en la app', timeSess: (n, d) => `${n} ${n === 1 ? 'sesión' : 'sesiones'} desde el ${d}`,
    timeToday: 'Hoy', time7: 'Últimos 7 días', timeLog: 'Bitácora', timeLive: 'en curso', seeLog: 'Ver bitácora',
    timeHow: 'Cuenta el tiempo con la app abierta en pantalla y mientras suena un audio. Si la dejas abierta sin tocarla 10 minutos, deja de contar. Cada celular lleva su propia bitácora.',
    timeEmpty: 'Todavía no hay sesiones registradas.', timeMore: 'Ver días anteriores', timeDel: 'Borrar bitácora',
    timeDelQ: '¿Borrar toda la bitácora de tiempo de este dispositivo?', timeDelOk: 'Bitácora borrada', lt1: 'menos de 1 min',
    rCardsOk: 'Fichas reiniciadas', rTestsOk: 'Tests reiniciados', rAllOk: 'Avance borrado',
    impQ: 'Esto reemplaza el avance de este dispositivo por el del archivo. ¿Continuar?', impOk: 'Avance importado', impBad: 'El archivo no es una copia válida del avance',
    upd: 'Hay una versión nueva del contenido.', updBtn: 'Actualizar',
    offOk: 'Lista para usar sin conexión', offPrep: 'Preparando el modo sin conexión: abre la app una vez con internet.',
    offNoSW: 'Este navegador no permite el modo sin conexión.', offFile: 'Abierta como archivo: sin modo sin conexión.',
  },
  en: {
    app: 'CPP Study', back: 'Back', langAria: 'Switch to Spanish', saveFail: "Couldn't save your progress",
    tab_home: 'Home', tab_test: 'Mock exam', tab_buscar: 'Search', tab_audios: 'Audio', tab_ajustes: 'Settings',
    err: 'Something went wrong opening this screen.', toHome: 'Back to home',
    loadFail: "Couldn't load the content. Open the app once with an internet connection.",
    hello: n => `Hi, ${n}`, yourProgress: 'Your progress', heroSub: 'All six volumes of Protection of Assets (2021)',
    mRead: 'Chapters read', mCards: 'Flashcards mastered', mQs: 'Questions answered right',
    cont: 'Continue', startStudy: 'Start studying', startSub: 'Open the first chapter',
    quick: 'Quick access', qSim: 'Mock exam', qSimS: 'Mixed questions', qCards: 'Flashcards', qCardsS: n => `${n} to review`,
    qWrong: 'My mistakes', qWrongS: n => n ? `${n} to review` : 'None yet', qAudio: 'Audio', qAudioS: 'Listen offline',
    volumes: 'Volumes', nChapters: n => `${n} chapters`, factRead: (a, b) => `${a}/${b} read`, factCards: (a, b) => `${a}/${b} cards`, factTest: p => `${p}% test`,
    simVol: 'Volume mock exam', cardsN: n => `Flashcards (${n})`, chapters: 'Chapters',
    pages: p => `pp. ${p}`, testBest: b => `test ${b}%`, testNone: 'test not taken', ojoN: n => `${n} ${n === 1 ? 'trap' : 'traps'}`,
    tResumen: 'Summary', tFichas: 'Cards', tTest: 'Test', tOjo: 'Traps',
    idea: 'Central idea', langNoteSum: 'This summary is in Spanish. Flashcards, tests and the central idea are in English.',
    langNoteOjo: 'These notes are in Spanish.',
    markRead: 'Mark as read', isRead: '✓ Read', markedRead: 'Chapter marked as read',
    prev: 'Previous', next: 'Next',
    cardsHead: (n, k) => `${n} flashcards, ${k} mastered`, pendBtn: n => `To review (${n})`, allBtn: 'All',
    testHead: n => `${n} multiple-choice questions`, bestLast: (b, l) => `Best score: ${b}%. Last: ${l}%.`, notYet: 'Not taken yet.',
    shuffled: 'Options are shuffled on every attempt.', autoNote: 'Built from the review questions: the wrong options are answers to other questions.',
    startTest: 'Start test', ojoIntro: 'Book traps and inconsistencies worth remembering for the exam.', ojoNone: 'This chapter has no exam-trap notes.',
    noPend: 'No flashcards left to review here.', front: 'Question', backF: 'Answer', tapFlip: 'Tap the card to see the answer', tapBack: 'Tap to go back to the question',
    again: '✗ Review again', knew: '✓ I knew it', knewOf: (a, b) => `You knew ${a} of ${b}`, deckDone: 'Deck finished',
    reviewMissed: n => `Review the ${n} you missed`, reshuffle: 'Shuffle again',
    cPend: 'Flashcards to review', cAll: 'All flashcards', cOf: d => `Flashcards: ${d}`,
    cNote: n => `${n} flashcards not mastered yet. Tap a card to flip it, then mark whether you knew it.`, practiceAll: n => `Practice all (${n})`,
    qOf: (i, n) => `Question ${i} of ${n}`, nOk: n => `${n} correct`, right: 'Correct.', wrong: 'Incorrect.',
    autoE: 'The correct answer comes from the chapter review questions.', nextQ: 'Next', seeRes: 'See result', quit: 'End here',
    resOk: (a, b) => `${a} of ${b} correct`, resTime: s => `Time: ${s}`, retryMissed: n => `Retry the ${n} you missed`, retake: 'Retake test', close: 'Close', toReview: 'To review',
    simTitle: 'Mock exam', simH: 'Mixed questions from several chapters', simSub: 'With an explanation after each answer.',
    include: 'What to include', everything: 'Everything', myWrong: n => `My mistakes (${n})`, howMany: 'How many questions', allQ: 'All',
    startN: n => `Start (${n} questions)`, recent: 'Recent attempts', lFull: 'Full mock exam', lWrong: 'Mistakes review', lVol: d => `Mock exam: ${d}`, lTest: 'Test',
    searchPh: 'Search a concept: VRIN, Abilene, EBITDA…', searchHelp: 'Type at least 2 letters. Searches summaries, flashcards and exam notes.',
    searchEs: '', inSum: n => `${n} in the summary`, inCards: n => `${n} in flashcards`, noRes: v => `No results for “${v}”.`,
    audioH: 'Audio', audioSub: 'Stored inside the app on this device and playable offline.', addAudio: 'Add audio from Files',
    noIDB: "This browser can't store audio.", at: s => `at ${s}`, listened: 'listened ✓',
    audioEmpty: 'No audio yet. Download it from NotebookLM to your iPhone (Files app) and add it here.',
    audioTotal: (n, mb) => `${n} ${n === 1 ? 'file' : 'files'}, ${mb} on this device.`, rename: 'Rename', del: 'Delete', audioName: 'Audio name',
    delQ: n => `Delete “${n}” from this device?`, audioDeleted: 'Audio deleted', saving: (i, n, f) => `Saving ${i} of ${n}: ${f}…`,
    noSpace: 'Not enough space on this device', cantSave: f => `Couldn't save ${f}`, savedN: n => `${n} files saved`, saved1: 'Audio saved',
    audioMissing: 'Audio not found', play: 'Play', pause: 'Pause', back15: 'Back 15 seconds', fwd30: 'Forward 30 seconds', speed: 'Speed', seek: 'Position',
    setTitle: 'Settings', version: v => `Version ${v}`, language: 'Language', profile: 'Profile', nameLbl: 'Your name (optional)', nameNote: 'Stored only on this device and shown on the home screen.',
    offline: 'Offline', standalone: "You're using the installed app.",
    installHow: 'On iPhone: tap Share, then “Add to Home Screen”, and open it from the icon. The installed app keeps its own progress and audio, separate from Safari.',
    used: 'Storage used', of: 'of', persistent: 'Persistent storage', on: 'on', notConf: 'not confirmed',
    persist: 'Protect data', checkUpd: 'Check for update', persistOk: 'Persistent storage is on',
    persistNo: "The system didn't grant it (installed iPhone apps usually keep their data anyway)",
    noSW: 'Offline mode is not available in this browser', checked: 'Checked', noNet: 'No internet: it will check later',
    backup: 'Progress backup', backupNote: 'Saves chapters read, flashcards, tests and audio positions (audio files are not included). Use it to move your progress to another device.',
    exp: 'Export', imp: 'Import', reset: 'Reset', rCards: 'Reset flashcards', rTests: 'Reset tests', rAll: 'Erase all progress',
    rCardsQ: 'Reset all flashcards?', rTestsQ: 'Reset test and mock exam results?', rAllQ: 'Erase ALL progress on this device? Audio files and the study-time log are kept.',
    timeTitle: 'Study time', timeKicker: 'Total time in the app', timeSess: (n, d) => `${n} ${n === 1 ? 'session' : 'sessions'} since ${d}`,
    timeToday: 'Today', time7: 'Last 7 days', timeLog: 'Log', timeLive: 'in progress', seeLog: 'See log',
    timeHow: 'Time counts while the app is open on screen and while audio is playing. If you leave it open without touching it for 10 minutes, it stops counting. Each phone keeps its own log.',
    timeEmpty: 'No sessions recorded yet.', timeMore: 'Show earlier days', timeDel: 'Delete log',
    timeDelQ: 'Delete the whole study-time log on this device?', timeDelOk: 'Log deleted', lt1: 'under 1 min',
    rCardsOk: 'Flashcards reset', rTestsOk: 'Tests reset', rAllOk: 'Progress erased',
    impQ: "This replaces this device's progress with the file's. Continue?", impOk: 'Progress imported', impBad: "That file isn't a valid progress backup",
    upd: 'A new version of the content is available.', updBtn: 'Update',
    offOk: 'Ready to use offline', offPrep: 'Preparing offline mode: open the app once with an internet connection.',
    offNoSW: "This browser doesn't support offline mode.", offFile: 'Opened as a file: no offline mode.',
  },
};
const t = (k, ...a) => { const v = T[L()][k] ?? T.es[k] ?? k; return typeof v === 'function' ? v(...a) : v; };
const locale = () => (EN() ? 'en-US' : 'es-MX');

// ---------- iconos ----------
// Logotipo SBM en Dodger Laser, convertido a trazos vectoriales
const SBM_MARK = '<svg class="sbm" role="img" aria-label="SBM" viewBox="44 -524 2837 524"><path d="M752 -197H193Q164 -197 137.5 -205.5Q111 -214 90.0 -230.0Q69 -246 56.5 -267.5Q44 -289 44 -315V-328H745Q773 -328 800.0 -319.0Q827 -310 848.0 -294.5Q869 -279 881.5 -257.0Q894 -235 894 -209V-135Q894 -103 880.5 -78.0Q867 -53 844.5 -36.0Q822 -19 792.5 -9.5Q763 0 732 0H44V-137H752ZM44 -387V-389Q44 -420 57.5 -445.5Q71 -471 93.5 -488.0Q116 -505 145.0 -514.5Q174 -524 206 -524H894V-387Z M982 0V-328H1832V-326Q1832 -319 1827.5 -309.5Q1823 -300 1816.0 -290.5Q1809 -281 1802.0 -273.5Q1795 -266 1789 -262Q1794 -258 1801.5 -250.0Q1809 -242 1815.5 -233.0Q1822 -224 1827.0 -214.5Q1832 -205 1832 -198V-135Q1832 -103 1818.5 -78.0Q1805 -53 1782.5 -36.0Q1760 -19 1730.5 -9.5Q1701 0 1670 0ZM982 -387V-524H1670Q1701 -524 1730.5 -514.5Q1760 -505 1782.5 -488.0Q1805 -471 1818.5 -445.5Q1832 -420 1832 -389V-387ZM1124 -197V-137H1690V-197Z M2276 -328 2401 -167 2525 -328H2697L2445 0H2356L2105 -328ZM2881 0H2739V-328H2881ZM1920 -328H2062V0H1920ZM2125 -524 2231 -387H1920V-524ZM2570 -387 2676 -524H2881V-387Z"/></svg>';
const svg = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
const ICONS = {
  business: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  physical: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>',
  personnel: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17.5c.8-1.8 2.2-2.7 4-2.7s3.2.9 4 2.7"/>',
  investigations: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  crisis: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  security: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  sim: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  cards: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v11"/>',
  wrong: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  audio: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
};
const icon = (k, cls = '') => `<span class="ic ${cls}">${svg(ICONS[k] || ICONS.business)}</span>`;

// ---------- datos ----------
const IDX = window.CPP_INDEX || [];
let DATA = {};
const CH = {};          // id capítulo -> {c, d, i}
const CARD = {};        // id ficha -> ficha
const ALLCARDS = [];
const ALLQ = [];
function indexData() {
  for (const d of Object.values(DATA)) {
    d.chapters.forEach((c, i) => {
      CH[c.id] = { c, d, i };
      c.cards.forEach((k, j) => { k.id = `${c.id}-k${j}`; k.ch = c; k.d = d; CARD[k.id] = k; ALLCARDS.push(k); });
      c.quiz.forEach((q, j) => { if (q.auto) q.dist = q.d; q.id = `${c.id}-q${j}`; q.ch = c; q.d = d; ALLQ.push(q); });
      c.text = null;
    });
  }
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}

// Resúmenes en inglés: archivos aparte (data/en/), se cargan solo al usar EN
let enReady = null;
function loadEN() {
  if (!enReady) {
    enReady = Promise.all(IDX.filter(d => d.ready && d.en).map(d => loadScript(`data/en/${d.id}.js`)))
      .then(() => {
        const E = window.CPP_EN || {};
        for (const { c, d } of Object.values(CH)) {
          const x = E[d.id] && E[d.id][c.id];
          if (x && x.html) { c.htmle = x.html; c.toce = x.toc; c.ojoe = x.ojo; c.texte = null; }
        }
      })
      .catch(e => { enReady = null; console.warn('EN', e); });
  }
  return enReady;
}
const hasEN = c => EN() && !!c.htmle;
const sumHtml = c => hasEN(c) ? c.htmle : c.html;
const sumToc = c => hasEN(c) ? c.toce : c.toc;
const ojoOf = c => hasEN(c) ? c.ojoe : c.ojo;
const sumText = c => {
  if (hasEN(c)) { if (c.texte == null) c.texte = plain(c.htmle); return c.texte; }
  if (c.text == null) c.text = plain(c.html); return c.text;
};

// textos según idioma
const domT = d => EN() ? d.title : d.es;
const TITLE_EN = { 'Con contenido de examen': 'Appendices with exam content', 'Apéndices': 'Appendices' };
const chT = c => (EN() && TITLE_EN[c.title]) || c.title;
const domSub = d => EN() ? '' : d.title;
const chLabel = c => EN() ? (c.label || `Chapter ${c.num}`).replace(/^Capítulo/, 'Chapter').replace(/^Apéndices/, 'Appendices').replace(/^Apéndice/, 'Appendix') : (c.label || `Capítulo ${c.num}`);
const chShort = c => EN() ? (c.short || `Ch. ${c.num}`).replace(/^Cap\./, 'Ch.').replace(/^Ap\./, 'App.') : (c.short || `Cap. ${c.num}`);
const cardQ = k => (EN() && k.qe) || k.q;
const cardA = k => (EN() && k.ae) || k.a;
const ideaOf = c => (EN() && c.ideae) || c.idea;
// Pregunta de test resuelta en el idioma actual: {p, o[], c, e}
function Q(q) {
  if (q.auto) {
    const k = CARD[q.k];
    const ds = (q.dist || []).map(id => CARD[id]).filter(Boolean);
    if (!k) return { p: '', o: [], c: 0, e: '' };
    return { p: plain(cardQ(k)), o: [k, ...ds].map(x => plain(cardA(x))), c: 0, e: '', auto: true };
  }
  if (EN() && q.qe) return { p: q.qe, o: q.oe, c: q.c, e: q.ee };
  return { p: q.q, o: q.o, c: q.c, e: q.e };
}
const correctIdx = q => (q.auto ? 0 : q.c);

// métricas
const known = list => list.filter(k => S.cards[k.id] === 2).length;
const answeredOk = list => list.filter(q => S.qa[q.id]?.ok).length;
const wrongQs = () => ALLQ.filter(q => S.qa[q.id] && !S.qa[q.id].ok);
const pendingCards = list => list.filter(k => S.cards[k.id] !== 2);
const meter = (p, cls = '') => `<div class="meter ${cls}"><i style="width:${p}%"></i></div>`;

// ---------- cabecera y navegación ----------
function header(title, back, brand = false) {
  const h = $('#ttl');
  if (brand) h.innerHTML = `<span class="brand">${SBM_MARK}<span>${esc(t('app'))}</span></span>`;
  else h.textContent = title;
  const b = $('#back');
  if (back) { b.hidden = false; b.href = back; } else b.hidden = true;
  document.title = brand ? `SBM · ${t('app')}` : `${title} · CPP`;
  syncHeader();
}
function syncHeader() { document.documentElement.style.setProperty('--hdr', ($('#top').offsetHeight - (parseFloat(getComputedStyle($('#top')).paddingTop) || 0)) + 'px'); }
window.addEventListener('resize', syncHeader);
function setTab(tb) { $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tb)); }

function applyLang() {
  document.documentElement.lang = L();
  $$('#tabbar a').forEach(a => { $('span', a).textContent = t('tab_' + a.dataset.tab); });
  $$('#lang span').forEach(s => s.classList.toggle('on', s.dataset.l === L()));
  $('#lang').setAttribute('aria-label', t('langAria'));
  $('#back').setAttribute('aria-label', t('back'));
  $('#updText').textContent = t('upd');
  $('#updBtn').textContent = t('updBtn');
  $('#mBack').setAttribute('aria-label', t('back15'));
  $('#mFwd').setAttribute('aria-label', t('fwd30'));
  $('#mSpeed').setAttribute('aria-label', t('speed'));
  $('#mSeek').setAttribute('aria-label', t('seek'));
  miniUI();
}
let KEEP = null; // sesión a conservar al cambiar de idioma
async function setLang(l) {
  if (l === L()) return;
  S.lang = l; save(true);
  applyLang();
  if (l === 'en') await loadEN();
  KEEP = SESSION;
  const y = window.scrollY;
  route(true);
  KEEP = null;
  requestAnimationFrame(() => window.scrollTo(0, y));
}

let SESSION = null;
let scrollSaver = null;
function route(keepScroll) {
  SESSION = null;
  if (scrollSaver) { window.removeEventListener('scroll', scrollSaver); scrollSaver = null; }
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const p = path.split('/').filter(Boolean).map(decodeURIComponent);
  const q = new URLSearchParams(qs || '');
  if (keepScroll !== true) window.scrollTo(0, 0);
  try {
    switch (p[0]) {
      case undefined: case '': setTab('home'); return home();
      case 'd': setTab('home'); return domainView(p[1]);
      case 'c': setTab('home'); return chapterView(p[1], p[2] || 'resumen', q, keepScroll === true);
      case 'test': setTab('test'); return testSetup(q);
      case 'fichas': setTab('home'); return cardsGlobal(p[1] || 'pend');
      case 'buscar': setTab('buscar'); return searchView(q.get('q') || '');
      case 'audios': setTab('audios'); return audiosView();
      case 'ajustes': setTab('ajustes'); return settingsView();
      case 'tiempo': setTab('ajustes'); return timeView(q.get('todo') === '1');
      default: location.hash = '#/';
    }
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="empty">${esc(t('err'))}<br><a href="#/">${esc(t('toHome'))}</a></div>`;
  }
}

// ---------- inicio ----------
function home() {
  header('', null, true);
  const chs = Object.values(CH).map(x => x.c);
  const readN = chs.filter(c => S.read[c.id]).length;
  const kn = known(ALLCARDS), ok = answeredOk(ALLQ);
  const wrong = wrongQs().length, pend = pendingCards(ALLCARDS).length;
  const last = S.lastCh && CH[S.lastCh] ? CH[S.lastCh].c : null;
  const first = IDX.find(d => d.ready) && DATA[IDX.find(d => d.ready).id]?.chapters[0];
  const metric = (label, a, b, shown) => `<div class="metric"><div class="top"><span>${esc(label)}</span><b>${shown}</b></div>${meter(pct(a, b))}</div>`;
  view.innerHTML = `
    <section class="panel stripe hero">
      <div class="kicker">Certified Protection Professional</div>
      <h2>${esc(S.name ? t('hello', S.name) : t('yourProgress'))}</h2>
      <p class="sub">${esc(t('heroSub'))}</p>
      <div class="metrics">
        ${metric(t('mRead'), readN, chs.length, `${readN}/${chs.length}`)}
        ${metric(t('mCards'), kn, ALLCARDS.length, `${pct(kn, ALLCARDS.length)}%`)}
        ${metric(t('mQs'), ok, ALLQ.length, `${pct(ok, ALLQ.length)}%`)}
      </div>
      ${last ? `<a class="btn red block cont" href="#/c/${last.id}/resumen"><small>${esc(t('cont'))}</small><span>${esc(chShort(last))}: ${esc(chT(last))}</span></a>`
        : first ? `<a class="btn red block cont" href="#/c/${first.id}/resumen"><small>${esc(t('startStudy'))}</small><span>${esc(chShort(first))}: ${esc(chT(first))}</span></a>` : ''}
    </section>
    <h3 class="label">${esc(t('quick'))}</h3>
    <div class="tiles">
      <a class="tile" href="#/test">${icon('sim')}<b>${esc(t('qSim'))}</b><span>${esc(t('qSimS'))}</span></a>
      <a class="tile" href="#/fichas/pend">${icon('cards')}<b>${esc(t('qCards'))}</b><span>${esc(t('qCardsS', pend))}</span></a>
      <a class="tile" href="#/test?scope=fallos">${icon('wrong')}<b>${esc(t('qWrong'))}</b><span>${esc(t('qWrongS', wrong))}</span></a>
      <a class="tile" href="#/audios">${icon('audio')}<b>${esc(t('qAudio'))}</b><span>${esc(t('qAudioS'))}</span></a>
    </div>
    <h3 class="label">${esc(t('volumes'))}</h3>
    <div class="list">${IDX.map(d => {
      if (!d.ready || !DATA[d.id]) return '';
      const cs = DATA[d.id].chapters;
      const cards = cs.flatMap(c => c.cards), qs = cs.flatMap(c => c.quiz);
      const rd = cs.filter(c => S.read[c.id]).length, kd = known(cards);
      const sub = domSub(d);
      return `<a class="item" href="#/d/${d.id}">${icon(d.id, rd === cs.length ? 'ok' : '')}
        <div class="grow"><div class="t">${esc(domT(d))}</div><div class="s">${sub ? esc(sub) + ', ' : ''}${esc(t('nChapters', cs.length))}</div>
        ${meter(pct(rd, cs.length))}
        <div class="facts"><span class="fact ${rd === cs.length ? 'ok' : ''}">${esc(t('factRead', rd, cs.length))}</span><span class="fact ${kd === cards.length ? 'ok' : ''}">${esc(t('factCards', kd, cards.length))}</span><span class="fact">${esc(t('factTest', pct(answeredOk(qs), qs.length)))}</span></div></div>
        <span class="chev">›</span></a>`;
    }).join('')}</div>
    <p class="status" id="offline-note"></p>`;
  offlineStatus().then(s => { const n = $('#offline-note'); if (n) n.innerHTML = `<span class="dot ${s.ok ? 'ok' : ''}"></span>${esc(s.text)}`; });
}

// ---------- tomo ----------
function domainView(id) {
  const d = DATA[id];
  if (!d) { location.hash = '#/'; return; }
  header(domT(d), '#/');
  const cs = d.chapters;
  const cards = cs.flatMap(c => c.cards), qs = cs.flatMap(c => c.quiz);
  const rd = cs.filter(c => S.read[c.id]).length, kd = known(cards), ok = answeredOk(qs);
  const metric = (label, a, b, shown) => `<div class="metric"><div class="top"><span>${esc(label)}</span><b>${shown}</b></div>${meter(pct(a, b))}</div>`;
  view.innerHTML = `
    <section class="panel stripe">
      <div class="dhead">${icon(id)}<div><h2>${esc(domT(d))}</h2><p>${domSub(d) ? esc(domSub(d)) + ', ' : ''}${esc(t('nChapters', cs.length))}</p></div></div>
      <div class="metrics">
        ${metric(t('mRead'), rd, cs.length, `${rd}/${cs.length}`)}
        ${metric(t('mCards'), kd, cards.length, `${pct(kd, cards.length)}%`)}
        ${metric(t('mQs'), ok, qs.length, `${pct(ok, qs.length)}%`)}
      </div>
      <div class="row"><a class="btn red" href="#/test?scope=${d.id}">${esc(t('simVol'))}</a><a class="btn" href="#/fichas/${d.id}">${esc(t('cardsN', pendingCards(cards).length))}</a></div>
    </section>
    <h3 class="label">${esc(t('chapters'))}</h3>
    <div class="list">${cs.map(c => {
      const r = !!S.read[c.id], best = S.best[c.id], k = known(c.cards);
      return `<a class="item" href="#/c/${c.id}/resumen">${r ? icon('check', 'ok') : `<span class="ic num">${esc(c.num.length > 2 ? c.num.slice(0, 2) : c.num)}</span>`}
        <div class="grow"><div class="t">${esc(chT(c))}</div><div class="s">${esc(chLabel(c))}${c.pages ? ', ' + esc(t('pages', c.pages)) : ''}</div>
        <div class="facts"><span class="fact ${k === c.cards.length && k ? 'ok' : ''}">${esc(t('factCards', k, c.cards.length))}</span>
        <span class="fact ${best >= 80 ? 'ok' : ''}">${esc(best != null ? t('testBest', best) : t('testNone'))}</span>
        ${ojoOf(c).length ? `<span class="fact warn">${esc(t('ojoN', ojoOf(c).length))}</span>` : ''}</div></div><span class="chev">›</span></a>`;
    }).join('')}</div>`;
}

// ---------- capítulo ----------
function chapterView(id, tab, q, keepScroll) {
  const x = CH[id];
  if (!x) { location.hash = '#/'; return; }
  const { c, d, i } = x;
  S.lastCh = id; save();
  header(`${chShort(c)}: ${chT(c)}`, `#/d/${d.id}`);
  const tabs = [['resumen', t('tResumen'), ''], ['fichas', t('tFichas'), c.cards.length], ['test', t('tTest'), c.quiz.length], ['ojo', t('tOjo'), ojoOf(c).length]];
  view.innerHTML = `
    <div class="tabs-wrap"><nav class="tabs">${tabs.map(([k, l, n]) => `<a href="#/c/${id}/${k}" class="${k === tab ? 'on' : ''}">${esc(l)}${n !== '' ? ` <small>${n}</small>` : ''}</a>`).join('')}</nav></div>
    <div id="pane"></div>`;
  const pane = $('#pane');
  const prev = d.chapters[i - 1], next = d.chapters[i + 1];
  const nav = `<div class="chnav">${prev ? `<a class="btn" href="#/c/${prev.id}/${tab}">‹ ${esc(chShort(prev))}</a>` : ''}${next ? `<a class="btn" href="#/c/${next.id}/${tab}">${esc(chShort(next))} ›</a>` : ''}</div>`;
  const meta = `<div class="kicker">${esc(chLabel(c))}${c.pages ? '&ensp;&ensp;' + esc(t('pages', c.pages)) : ''}</div>`;
  const langNote = key => EN() ? `<div class="langnote"><b>ES</b><span>${esc(t(key))}</span></div>` : '';

  if (tab === 'resumen') {
    const idea = ideaOf(c);
    pane.innerHTML = `
      <section class="panel stripe chead">${meta}<h2>${esc(chT(c))}</h2>
        ${idea ? `<div class="idea"><div class="kicker">${esc(t('idea'))}</div><p class="txt">${idea}</p></div>` : ''}
      </section>
      ${hasEN(c) ? '' : langNote('langNoteSum')}
      ${sumToc(c).length > 1 ? `<div class="toc">${sumToc(c).map(s => `<a href="#" data-jump="${id}-${s.id}">${esc(s.t)}</a>`).join('')}</div>` : ''}
      <article class="prose" id="prose" lang="${hasEN(c) ? 'en' : 'es'}">${sumHtml(c)}</article>
      <div class="readbox"><button class="btn block ${S.read[id] ? 'okb' : 'red'}" id="readBtn">${esc(S.read[id] ? t('isRead') : t('markRead'))}</button></div>
      ${nav}`;
    $$('[data-jump]', pane).forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    $('#readBtn').onclick = () => {
      if (S.read[id]) delete S.read[id]; else S.read[id] = Date.now();
      save();
      const b = $('#readBtn'); b.className = 'btn block ' + (S.read[id] ? 'okb' : 'red'); b.textContent = S.read[id] ? t('isRead') : t('markRead');
      if (S.read[id]) toast(t('markedRead'));
    };
    const term = q.get('q');
    if (term) {
      const firstHit = highlight($('#prose'), term);
      if (firstHit) setTimeout(() => firstHit.scrollIntoView({ block: 'center' }), 60);
    } else if (S.scroll[id] && !keepScroll) {
      setTimeout(() => window.scrollTo(0, S.scroll[id]), 30);
    }
    let tm;
    scrollSaver = () => { clearTimeout(tm); tm = setTimeout(() => { S.scroll[id] = Math.round(window.scrollY); save(); }, 400); };
    window.addEventListener('scroll', scrollSaver, { passive: true });
  } else if (tab === 'fichas') {
    const pend = pendingCards(c.cards);
    const k = known(c.cards);
    pane.innerHTML = `<section class="panel"><div class="metric"><div class="top"><span>${esc(t('cardsHead', c.cards.length, k))}</span><b>${pct(k, c.cards.length)}%</b></div>${meter(pct(k, c.cards.length))}</div>
      <div class="row" style="margin-top:14px"><button class="btn" id="cP" ${pend.length ? '' : 'disabled'}>${esc(t('pendBtn', pend.length))}</button><button class="btn" id="cA">${esc(t('allBtn'))}</button></div></section>
      <div id="cardsArea" style="margin-top:14px"></div>${nav}`;
    $('#cP').onclick = () => startCards(pend, $('#cardsArea'));
    $('#cA').onclick = () => startCards(c.cards, $('#cardsArea'));
    startCards(pend.length ? pend : [], $('#cardsArea'));
  } else if (tab === 'test') {
    pane.innerHTML = `<div id="quizArea"></div>${nav}`;
    const intro = () => {
      const best = S.best[id], last = S.last[id];
      $('#quizArea').innerHTML = `<section class="panel stripe">${meta}<h2 style="margin:6px 0 0;font:700 21px/1.25 var(--display)">${esc(t('testHead', c.quiz.length))}</h2>
        <p class="note">${esc(best != null ? t('bestLast', best, last) : t('notYet'))} ${esc(t('shuffled'))}${c.quiz[0]?.auto ? ' ' + esc(t('autoNote')) : ''}</p>
        <button class="btn red block" id="qGo" ${c.quiz.length ? '' : 'disabled'}>${esc(t('startTest'))}</button></section>`;
      $('#qGo').onclick = () => startQuiz(c.quiz, $('#quizArea'), { key: id, onExit: intro });
    };
    if (KEEP?.kind === 'quiz') startQuiz(c.quiz, $('#quizArea'), { key: id, onExit: intro });
    else intro();
  } else {
    const oj = ojoOf(c), ol = hasEN(c) ? 'en' : 'es';
    pane.innerHTML = oj.length ? `<p class="note" style="margin-top:0">${esc(t('ojoIntro'))}</p>${hasEN(c) ? '' : langNote('langNoteOjo')}
      <div class="list">${oj.map(o => `<div class="panel stripe ojo-card"><div class="where">${esc(o.s)}</div><div class="h" lang="${ol}">${o.h}</div></div>`).join('')}</div>${nav}`
      : `<div class="empty">${esc(t('ojoNone'))}</div>${nav}`;
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
  let ses;
  if (KEEP?.kind === 'cards') { ses = KEEP; KEEP = null; }
  else {
    if (!list.length) { area.innerHTML = `<div class="empty">${esc(t('noPend'))}</div>`; return; }
    ses = { kind: 'cards', deck: shuffle(list), all: list, i: 0, ok: 0, again: [], flipped: false, opts };
  }
  opts = ses.opts;
  SESSION = ses;
  const draw = () => {
    if (SESSION !== ses) return;
    if (ses.i >= ses.deck.length) {
      const p = pct(ses.ok, ses.deck.length);
      area.innerHTML = `<section class="panel result"><div class="ring" style="--p:${p}"><b>${p}%</b></div><div><h3>${esc(t('deckDone'))}</h3><p>${esc(t('knewOf', ses.ok, ses.deck.length))}</p></div></section>
        <div class="row" style="margin-top:10px">${ses.again.length ? `<button class="btn red" id="fAgain">${esc(t('reviewMissed', ses.again.length))}</button>` : ''}<button class="btn" id="fAll">${esc(t('reshuffle'))}</button></div>`;
      $('#fAgain', area)?.addEventListener('click', () => startCards(ses.again, area, opts));
      $('#fAll', area).onclick = () => startCards(ses.all, area, opts);
      return;
    }
    const k = ses.deck[ses.i];
    const ctx = opts.ctx ? `<div class="ctx">${esc(domT(k.d))}, ${esc(chShort(k.ch))}</div>` : '';
    area.innerHTML = `
      <div class="deckbar"><b>${ses.i + 1} / ${ses.deck.length}</b><span class="tally"><span class="y">✓ ${ses.ok}</span><span class="n">✗ ${ses.again.length}</span></span></div>
      <div class="flip"><div class="flash ${ses.flipped ? 'on' : ''}" id="flash" role="button" tabindex="0" aria-label="${esc(t('tapFlip'))}">
        <div class="face front"><div class="k">${esc(t('front'))}</div>${ctx}<div class="txt"><div>${cardQ(k)}</div></div><div class="hint">${esc(t('tapFlip'))}</div></div>
        <div class="face back"><div class="k">${esc(t('backF'))}</div>${ctx}<div class="txt"><div>${cardA(k)}</div></div><div class="hint">${esc(t('tapBack'))}</div></div>
      </div></div>
      <div class="deck-actions">
        <button class="btn bad" id="fNo" ${ses.flipped || ses.seen ? '' : 'disabled'}>${esc(t('again'))}</button>
        <button class="btn okb" id="fYes" ${ses.flipped || ses.seen ? '' : 'disabled'}>${esc(t('knew'))}</button>
      </div>`;
    const fl = $('#flash', area);
    const flip = () => {
      ses.flipped = !ses.flipped; ses.seen = true;
      fl.classList.toggle('on', ses.flipped);
      $('#fNo', area).disabled = false; $('#fYes', area).disabled = false;
    };
    fl.onclick = flip;
    fl.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
    const mark = good => {
      S.cards[k.id] = good ? 2 : 1; save();
      if (good) ses.ok++; else ses.again.push(k);
      ses.i++; ses.flipped = false; ses.seen = false; draw();
    };
    $('#fNo', area).onclick = () => mark(false);
    $('#fYes', area).onclick = () => mark(true);
  };
  ses.redraw = draw;
  draw();
}

function cardsGlobal(scope) {
  let list, title;
  if (scope === 'pend') { list = pendingCards(ALLCARDS); title = t('cPend'); }
  else if (DATA[scope]) { list = pendingCards(DATA[scope].chapters.flatMap(c => c.cards)); title = t('cOf', domT(DATA[scope])); }
  else { list = ALLCARDS; title = t('cAll'); }
  header(title, scope === 'pend' || !DATA[scope] ? '#/' : `#/d/${scope}`);
  view.innerHTML = `<p class="note" style="margin-top:0">${esc(t('cNote', list.length))}</p><div id="cardsArea"></div>
    <a class="btn block" href="#/fichas/todas" style="margin-top:14px">${esc(t('practiceAll', ALLCARDS.length))}</a>`;
  startCards(scope === 'todas' ? ALLCARDS : list, $('#cardsArea'), { ctx: true });
}

// ---------- test ----------
function startQuiz(questions, area, opts = {}) {
  let ses;
  if (KEEP?.kind === 'quiz') { ses = KEEP; KEEP = null; opts = ses.opts; questions = ses.questions; }
  else ses = { kind: 'quiz', questions, opts, qs: shuffle(questions).map(q => ({ q, order: shuffle(Q(q).o.map((_, j) => j)) })), i: 0, picks: [], t0: Date.now() };
  SESSION = ses;
  const letters = 'ABCDEFG';
  const isOk = j => ses.picks[j] === correctIdx(ses.qs[j].q);
  const draw = () => {
    if (SESSION !== ses) return;
    if (ses.done || ses.i >= ses.qs.length) return result();
    const { q, order } = ses.qs[ses.i];
    const R = Q(q), c = correctIdx(q);
    const picked = ses.picks[ses.i];
    const okN = ses.picks.filter((p, j) => p != null && isOk(j)).length;
    area.innerHTML = `
      <div class="qhead"><b>${esc(t('qOf', ses.i + 1, ses.qs.length))}</b><span class="y">${esc(t('nOk', okN))}</span></div>
      ${meter(pct(ses.i, ses.qs.length), 'qbar')}
      <section class="panel stripe qcard">
        ${opts.ctx ? `<div class="ctx">${esc(domT(q.d))}, ${esc(chShort(q.ch))}</div>` : ''}
        <p class="prompt">${esc(R.p)}</p>
        ${order.map((j, n) => {
          let cls = '';
          if (picked != null) { if (j === c) cls = 'right'; else if (j === picked) cls = 'wrong'; }
          return `<button class="opt ${cls}" data-j="${j}" ${picked != null ? 'disabled' : ''}><span class="l">${letters[n]}</span><span class="o">${esc(R.o[j])}</span></button>`;
        }).join('')}
        ${picked != null ? `<div class="explain"><b class="${picked === c ? 'y' : 'n'}">${esc(picked === c ? t('right') : t('wrong'))}</b> ${esc(R.e || t('autoE'))}</div>
          <button class="btn red block" id="qNext">${esc(ses.i + 1 < ses.qs.length ? t('nextQ') : t('seeRes'))}</button>` : ''}
      </section>
      <button class="quit" id="qQuit">${esc(t('quit'))}</button>`;
    $$('.opt', area).forEach(b => b.onclick = () => {
      const j = +b.dataset.j;
      ses.picks[ses.i] = j;
      const r = S.qa[q.id] || { n: 0, w: 0 };
      r.n++; r.ok = j === c; if (!r.ok) r.w++; r.t = Date.now();
      S.qa[q.id] = r; save();
      draw();
      $('#qNext', area)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    $('#qNext', area)?.addEventListener('click', () => { ses.i++; draw(); window.scrollTo(0, Math.max(0, area.getBoundingClientRect().top + window.scrollY - 130)); });
    $('#qQuit', area).onclick = () => { ses.qs = ses.qs.slice(0, ses.picks.filter(p => p != null).length); ses.done = true; result(); };
  };
  const result = () => {
    const done = ses.qs.length;
    const ok = ses.qs.filter((x, j) => isOk(j)).length;
    const p = pct(ok, done);
    if (!ses.recorded) {
      ses.recorded = true; ses.secs = Math.round((Date.now() - ses.t0) / 1000);
      if (opts.key && done === questions.length) { S.last[opts.key] = p; S.best[opts.key] = Math.max(S.best[opts.key] ?? 0, p); }
      if (done) { S.sims.unshift({ t: Date.now(), n: done, ok, s: opts.label || opts.key || 'test', secs: ses.secs }); S.sims = S.sims.slice(0, 40); }
      save(true);
    }
    ses.done = true;
    const wrongL = ses.qs.filter((x, j) => !isOk(j));
    area.innerHTML = `
      <section class="panel result"><div class="ring" style="--p:${p}"><b>${p}%</b></div><div><h3>${esc(t('resOk', ok, done))}</h3><p>${esc(t('resTime', fmtTime(ses.secs)))}</p></div></section>
      <div class="row" style="margin-top:10px">${wrongL.length ? `<button class="btn red" id="rWrong">${esc(t('retryMissed', wrongL.length))}</button>` : ''}<button class="btn" id="rAgain">${esc(t('retake'))}</button></div>
      ${opts.onExit ? `<button class="quit" id="rExit">${esc(t('close'))}</button>` : ''}
      ${wrongL.length ? `<h3 class="label">${esc(t('toReview'))}</h3><div class="list review">${wrongL.map(x => { const R = Q(x.q); return `<div class="item"><div class="grow"><div class="t">${esc(R.p)}</div>
        <div class="s ans">${esc(R.o[R.c])}</div>${R.e ? `<div class="s ex">${esc(R.e)}</div>` : ''}
        <div class="s"><a href="#/c/${x.q.ch.id}/resumen">${esc(domT(x.q.d))}, ${esc(chShort(x.q.ch))}</a></div></div></div>`; }).join('')}</div>` : ''}`;
    $('#rWrong', area)?.addEventListener('click', () => startQuiz(wrongL.map(x => x.q), area, { ...opts, key: null }));
    $('#rAgain', area).onclick = () => startQuiz(questions, area, opts);
    $('#rExit', area)?.addEventListener('click', () => opts.onExit());
    if (!KEEP) window.scrollTo(0, 0);
  };
  ses.redraw = draw;
  draw();
}

function testSetup(q) {
  header(t('simTitle'), null);
  const ready = IDX.filter(d => d.ready && DATA[d.id]);
  let scope = q.get('scope') || 'all';
  let n = 25;
  const pool = () => scope === 'fallos' ? wrongQs() : scope === 'all' ? ALLQ : ALLQ.filter(x => x.d.id === scope);
  const draw = () => {
    const P = pool();
    view.innerHTML = `
      <section class="panel stripe hero" id="simHero"><div class="kicker">${esc(t('simTitle'))}</div><h2>${esc(t('simH'))}</h2><p class="sub">${esc(t('simSub'))}</p></section>
      <section class="panel setup" id="simSetup" style="margin-top:10px">
        <div class="k">${esc(t('include'))}</div>
        <div class="chips" id="sc">
          <button class="chip ${scope === 'all' ? 'on' : ''}" data-v="all">${esc(t('everything'))}</button>
          ${ready.map(d => `<button class="chip ${scope === d.id ? 'on' : ''}" data-v="${d.id}">${esc(domT(d))}</button>`).join('')}
          <button class="chip ${scope === 'fallos' ? 'on' : ''}" data-v="fallos">${esc(t('myWrong', wrongQs().length))}</button>
        </div>
        <div class="k">${esc(t('howMany'))}</div>
        <div class="chips" id="nn">${[10, 25, 50, 0].map(v => `<button class="chip ${n === v ? 'on' : ''}" data-v="${v}">${v || esc(t('allQ'))}</button>`).join('')}</div>
        <button class="btn red block" id="go" ${P.length ? '' : 'disabled'}>${esc(t('startN', n ? Math.min(n, P.length) : P.length))}</button>
      </section>
      <div id="quizArea"></div>
      ${S.sims.length ? `<div id="hist"><h3 class="label">${esc(t('recent'))}</h3><div class="list">${S.sims.slice(0, 8).map(s => `<div class="item"><span class="ic num" style="width:auto;padding:0 10px;min-width:52px">${pct(s.ok, s.n)}%</span><div class="grow"><div class="t">${esc(labelOf(s.s))}</div><div class="s">${s.ok}/${s.n}, ${new Date(s.t).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}, ${fmtTime(s.secs)}</div></div></div>`).join('')}</div></div>` : ''}`;
    $$('#sc .chip').forEach(b => b.onclick = () => { scope = b.dataset.v; draw(); });
    $$('#nn .chip').forEach(b => b.onclick = () => { n = +b.dataset.v; draw(); });
    const begin = qs => {
      $('#simHero').hidden = true; $('#simSetup').hidden = true;
      if ($('#hist')) $('#hist').hidden = true;
      startQuiz(qs, $('#quizArea'), { ctx: true, label: scope, onExit: draw });
    };
    $('#go').onclick = () => begin(shuffle(P).slice(0, n || P.length));
    if (KEEP?.kind === 'quiz') begin([]);
  };
  draw();
}
function labelOf(s) {
  if (s === 'all') return t('lFull');
  if (s === 'fallos') return t('lWrong');
  if (DATA[s]) return t('lVol', domT(DATA[s]));
  if (CH[s]) return `${domT(CH[s].d)}, ${chShort(CH[s].c)}`;
  return t('lTest');
}

// ---------- búsqueda ----------
function searchView(term) {
  header(t('tab_buscar'), null);
  view.innerHTML = `<div class="searchbox">${svg(ICONS.search)}<input class="search" id="sq" type="search" placeholder="${esc(t('searchPh'))}" value="${esc(term)}" autocomplete="off" enterkeyhint="search"></div><div id="sr" style="margin-top:14px"></div>`;
  const input = $('#sq');
  let tm;
  const run = () => {
    const v = input.value.trim();
    history.replaceState(null, '', '#/buscar' + (v ? '?q=' + encodeURIComponent(v) : ''));
    const out = $('#sr');
    if (v.length < 2) { out.innerHTML = `<p class="note">${esc(t('searchHelp') + t('searchEs'))}</p>`; return; }
    const lo = v.toLowerCase();
    const hits = [];
    for (const { c, d } of Object.values(CH)) {
      const txt = sumText(c), Lw = txt.toLowerCase();
      let k = Lw.indexOf(lo), count = 0;
      const first = k;
      while (k !== -1) { count++; k = Lw.indexOf(lo, k + lo.length); }
      const cardList = c.cards.filter(x => plain(x.q + ' ' + x.a + ' ' + (x.qe || '') + ' ' + (x.ae || '')).toLowerCase().includes(lo));
      if (count || cardList.length) {
        let snip = '';
        const mk = (s, at) => { const a = Math.max(0, at - 60), b = Math.min(s.length, at + lo.length + 80); return (a ? '…' : '') + esc(s.slice(a, at)) + '<mark>' + esc(s.slice(at, at + lo.length)) + '</mark>' + esc(s.slice(at + lo.length, b)) + (b < s.length ? '…' : ''); };
        if (first !== -1) snip = mk(txt, first);
        else {
          const s = plain(cardQ(cardList[0])) + ' ' + plain(cardA(cardList[0]));
          const at = s.toLowerCase().indexOf(lo);
          snip = at !== -1 ? mk(s, at) : esc(s.slice(0, 140));
        }
        hits.push({ c, d, count, cardHits: cardList.length, snip });
      }
    }
    hits.sort((a, b) => (b.count + b.cardHits) - (a.count + a.cardHits));
    out.innerHTML = hits.length ? `<div class="list">${hits.map(h => `<a class="item hit" href="#/c/${h.c.id}/${h.count ? 'resumen?q=' + encodeURIComponent(v) : 'fichas'}"><div class="grow">
      <div class="t">${esc(chShort(h.c))}: ${esc(chT(h.c))}</div><div class="s">${esc(domT(h.d))}</div>
      <div class="snip">${h.snip}</div><div class="facts">${h.count ? `<span class="fact">${esc(t('inSum', h.count))}</span>` : ''}${h.cardHits ? `<span class="fact">${esc(t('inCards', h.cardHits))}</span>` : ''}</div></div><span class="chev">›</span></a>`).join('')}</div>`
      : `<div class="empty">${esc(t('noRes', v))}</div>`;
  };
  input.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 200); });
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
      const tr = db.transaction(stores, mode); let out;
      Promise.resolve(fn(tr)).then(v => { out = v; });
      tr.oncomplete = () => res(out); tr.onerror = () => rej(tr.error); tr.onabort = () => rej(tr.error || new Error('abort'));
    });
  },
  req: r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async list() { return (await this.tx(['meta'], 'readonly', tr => this.req(tr.objectStore('meta').getAll()))).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })); },
  async get(id) { return this.tx(['data'], 'readonly', tr => this.req(tr.objectStore('data').get(id))); },
  async getMeta(id) { return this.tx(['meta'], 'readonly', tr => this.req(tr.objectStore('meta').get(id))); },
  async add(meta, buf) { return this.tx(['meta', 'data'], 'readwrite', tr => { tr.objectStore('meta').put(meta); tr.objectStore('data').put({ id: meta.id, buf }); }); },
  async putMeta(meta) { return this.tx(['meta'], 'readwrite', tr => { tr.objectStore('meta').put(meta); }); },
  async del(id) { return this.tx(['meta', 'data'], 'readwrite', tr => { tr.objectStore('meta').delete(id); tr.objectStore('data').delete(id); }); },
};

const player = $('#player');
let current = null;
let curURL = null;
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

async function loadAudio(id, autoplay = true) {
  const meta = await ADB.getMeta(id);
  const rec = await ADB.get(id);
  if (!meta || !rec) { toast(t('audioMissing')); return; }
  if (curURL) URL.revokeObjectURL(curURL);
  curURL = URL.createObjectURL(new Blob([rec.buf], { type: meta.type || 'audio/mp4' }));
  current = meta;
  player.src = curURL;
  player.playbackRate = S.speed || 1;
  const startAt = S.apos[id] || 0;
  const seekStart = () => { if (startAt && startAt < (player.duration || Infinity) - 3) player.currentTime = startAt; player.playbackRate = S.speed || 1; };
  player.addEventListener('loadedmetadata', seekStart, { once: true });
  $('#mini').hidden = false; document.body.classList.add('has-mini');
  $('#mTitle').textContent = meta.name;
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: meta.name, artist: 'SBM · CPP', artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
  }
  if (autoplay) player.play().catch(() => {});
  miniUI();
  if (location.hash.startsWith('#/audios')) audiosView();
}
let seeking = false, posT = 0;
function miniUI() {
  $('#mPlay').innerHTML = player.paused ? ICON_PLAY : ICON_PAUSE;
  $('#mPlay').setAttribute('aria-label', player.paused ? t('play') : t('pause'));
  $('#mSpeed').textContent = (S.speed || 1) + '×';
  const d = player.duration || 0;
  $('#mTime').textContent = fmtTime(player.currentTime);
  $('#mDur').textContent = d && isFinite(d) ? '−' + fmtTime(d - player.currentTime) : '';
  if (!seeking) $('#mSeek').value = d && isFinite(d) ? Math.round(1000 * player.currentTime / d) : 0;
}
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
const seekEl = $('#mSeek');
seekEl.addEventListener('input', () => { seeking = true; const d = player.duration || 0; $('#mTime').textContent = fmtTime(d * seekEl.value / 1000); });
seekEl.addEventListener('change', () => { const d = player.duration || 0; if (d) player.currentTime = d * seekEl.value / 1000; seeking = false; });
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
  header(t('audioH'), null);
  view.innerHTML = `<section class="panel stripe hero"><div class="kicker">NotebookLM</div><h2>${esc(t('audioH'))}</h2><p class="sub">${esc(t('audioSub'))}</p>
      <label class="btn red block" for="afile" style="margin-top:16px">${esc(t('addAudio'))}</label>
      <input type="file" id="afile" accept="audio/*,.m4a,.mp3,.wav,.aac,.mp4" multiple hidden>
      <p class="note" id="aStatus" style="margin-bottom:0"></p></section>
    <div id="alist" style="margin-top:14px"><p class="loading">…</p></div>`;
  $('#afile').onchange = e => importAudios([...e.target.files]);
  let items = [];
  try { items = await ADB.list(); } catch (e) { $('#alist').innerHTML = `<div class="empty">${esc(t('noIDB'))}</div>`; return; }
  if (!location.hash.startsWith('#/audios')) return;
  const total = items.reduce((s, x) => s + x.size, 0);
  $('#alist').innerHTML = items.length ? `
    <div class="list">${items.map(m => {
      const pos = S.apos[m.id] || 0, playing = current?.id === m.id && !player.paused;
      return `<div class="item arow"><button class="play ${playing ? '' : 'idle'}" data-play="${m.id}" aria-label="${esc(playing ? t('pause') : t('play'))}">${playing ? ICON_PAUSE : ICON_PLAY}</button>
        <div class="grow"><div class="t">${esc(m.name)}</div><div class="s">${fmtMB(m.size)}${m.dur ? ', ' + fmtTime(m.dur) : ''}${pos > 5 ? ', ' + esc(t('at', fmtTime(pos))) : ''}${S.adone[m.id] ? ', ' + esc(t('listened')) : ''}</div>
        ${m.dur && pos > 5 ? meter(pct(pos, m.dur)) : ''}</div>
        <button class="iconbtn sm" data-ren="${m.id}" aria-label="${esc(t('rename'))}">Aa</button>
        <button class="iconbtn sm" data-del="${m.id}" aria-label="${esc(t('del'))}">✕</button></div>`;
    }).join('')}</div><p class="note">${esc(t('audioTotal', items.length, fmtMB(total)))}</p>`
    : `<div class="empty">${esc(t('audioEmpty'))}</div>`;
  $$('[data-play]').forEach(b => b.onclick = () => {
    const id = b.dataset.play;
    if (current?.id === id) { player.paused ? player.play().catch(() => {}) : player.pause(); setTimeout(audiosView, 50); }
    else loadAudio(id);
  });
  $$('[data-ren]').forEach(b => b.onclick = async () => {
    const m = items.find(x => x.id === b.dataset.ren);
    const name = prompt(t('audioName'), m.name);
    if (name && name.trim()) { m.name = name.trim(); await ADB.putMeta(m); if (current?.id === m.id) { current.name = m.name; $('#mTitle').textContent = m.name; } audiosView(); }
  });
  $$('[data-del]').forEach(b => b.onclick = async () => {
    const m = items.find(x => x.id === b.dataset.del);
    if (!confirm(t('delQ', m.name))) return;
    if (current?.id === m.id) { player.pause(); player.removeAttribute('src'); player.load(); current = null; $('#mini').hidden = true; document.body.classList.remove('has-mini'); }
    await ADB.del(m.id); delete S.apos[m.id]; delete S.adone[m.id]; save();
    toast(t('audioDeleted')); audiosView();
  });
}

async function importAudios(files) {
  if (!files.length) return;
  const st = $('#aStatus');
  if (navigator.storage?.persist) { try { await navigator.storage.persist(); } catch (e) { /* opcional */ } }
  let n = 0;
  for (const f of files) {
    n++;
    if (st) st.textContent = t('saving', n, files.length, f.name);
    try {
      const buf = await f.arrayBuffer();
      const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const meta = { id, name: f.name.replace(/\.[^.]+$/, ''), size: f.size, type: f.type || guessType(f.name), added: Date.now(), dur: 0 };
      meta.dur = await probeDuration(buf, meta.type);
      await ADB.add(meta, buf);
    } catch (e) {
      console.error(e);
      toast(e && e.name === 'QuotaExceededError' ? t('noSpace') : t('cantSave', f.name));
    }
  }
  if (st) st.textContent = '';
  toast(files.length > 1 ? t('savedN', files.length) : t('saved1'));
  audiosView();
}
function guessType(name) {
  const e = name.split('.').pop().toLowerCase();
  return { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg' }[e] || 'audio/mpeg';
}
function probeDuration(buf, type) {
  return new Promise(res => {
    const a = new Audio(); const u = URL.createObjectURL(new Blob([buf], { type }));
    let fin = false;
    const done = v => { if (fin) return; fin = true; URL.revokeObjectURL(u); res(v && isFinite(v) ? Math.round(v) : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => done(a.duration); a.onerror = () => done(0);
    setTimeout(() => done(0), 8000); a.src = u;
  });
}

// ---------- tiempo de estudio ----------
// Sesiones en S.time: {s: inicio, e: fin, a: tiempo activo} en milisegundos. Solo en este dispositivo.
const IDLE = 10 * 60 * 1000;   // sin tocar la app 10 min: deja de contar
const MERGE = 5 * 60 * 1000;   // volver antes de 5 min continúa la misma sesión
let runStart = null, cur = null, curBase = 0, lastAct = Date.now();
const audioOn = () => !player.paused && !player.ended && !!player.src;
const visible = () => document.visibilityState === 'visible';
const clockActive = now => audioOn() || (visible() && now - lastAct < IDLE);
function clockOn(now) {
  if (runStart != null) return;
  if (!Array.isArray(S.time)) S.time = [];
  const last = S.time[S.time.length - 1];
  if (last && now - last.e < MERGE && now >= last.e) cur = last;
  else { cur = { s: now, e: now, a: 0 }; S.time.push(cur); }
  curBase = cur.a; runStart = now;
}
function clockFlush(now) { if (runStart == null) return; cur.a = curBase + Math.max(0, now - runStart); cur.e = Math.max(cur.e, now); }
function clockOff(end) {
  if (runStart == null) return;
  clockFlush(Math.max(runStart, end));
  runStart = null;
  if (cur.a < 5000 && S.time[S.time.length - 1] === cur) S.time.pop();   // aperturas de segundos no cuentan
  cur = null; save(true);
}
function clockTick() {
  const now = Date.now();
  if (audioOn()) lastAct = now;
  if (runStart != null && !clockActive(now)) return clockOff(visible() ? lastAct : now);
  if (runStart == null) { if (visible() && clockActive(now)) clockOn(now); return; }
  clockFlush(now); save();
}
function initClock() {
  const touch = () => { lastAct = Date.now(); if (runStart == null && visible()) clockOn(lastAct); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, touch, { passive: true, capture: true }));
  document.addEventListener('scroll', touch, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    const now = Date.now();
    if (visible()) { lastAct = now; clockOn(now); }
    else if (audioOn()) { clockFlush(now); save(true); }
    else clockOff(now);
  });
  window.addEventListener('pagehide', () => { clockFlush(Date.now()); save(true); });
  player.addEventListener('play', () => { lastAct = Date.now(); clockOn(lastAct); });
  const stop = () => { lastAct = Date.now(); if (!visible()) clockOff(lastAct); else { clockFlush(lastAct); save(); } };
  player.addEventListener('pause', stop);
  player.addEventListener('ended', stop);
  setInterval(clockTick, 15000);
  if (visible()) clockOn(Date.now());
}
const timeTotal = () => { clockFlush(Date.now()); return (S.time || []).reduce((n, x) => n + x.a, 0); };
function fmtDur(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return t('lt1');
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} h ${String(r).padStart(2, '0')} min` : `${m} min`;
}
const hhmm = ms => new Date(ms).toLocaleTimeString(locale(), EN() ? { hour: 'numeric', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit', hour12: false });
function dayLabel(ms) {
  const d = new Date(ms), now = new Date();
  const o = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== now.getFullYear()) o.year = 'numeric';
  const s = d.toLocaleDateString(locale(), o);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function timeView(all) {
  header(t('timeTitle'), '#/ajustes');
  const now = Date.now();
  clockFlush(now);
  const list = (S.time || []).filter(x => x.a >= 1000);
  const total = list.reduce((n, x) => n + x.a, 0);
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const today = list.filter(x => x.s >= d0.getTime()).reduce((n, x) => n + x.a, 0);
  const week = list.filter(x => x.s >= d0.getTime() - 6 * 864e5).reduce((n, x) => n + x.a, 0);
  const days = [];
  for (const x of list.slice().reverse()) {
    const k = new Date(x.s).toDateString();
    if (!days.length || days[days.length - 1].k !== k) days.push({ k, s: x.s, items: [], total: 0 });
    const g = days[days.length - 1]; g.items.push(x); g.total += x.a;
  }
  const shown = all ? days : days.slice(0, 30);
  view.innerHTML = `
    <section class="panel stripe hero">
      <div class="kicker">${esc(t('timeKicker'))}</div>
      <div class="bigtime">${esc(fmtDur(total))}</div>
      <p class="sub">${list.length ? esc(t('timeSess', list.length, new Date(list[0].s).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }))) : esc(t('timeEmpty'))}</p>
      <div class="row tstats"><div><span>${esc(t('timeToday'))}</span><b>${esc(fmtDur(today))}</b></div><div><span>${esc(t('time7'))}</span><b>${esc(fmtDur(week))}</b></div></div>
    </section>
    <p class="note">${esc(t('timeHow'))}</p>
    ${shown.length ? `<h3 class="label">${esc(t('timeLog'))}</h3>
    <div class="list">${shown.map(g => `<section class="panel day">
      <div class="dayh"><b>${esc(dayLabel(g.s))}</b><span>${esc(fmtDur(g.total))}</span></div>
      ${g.items.map(x => `<div class="kv"><span>${esc(hhmm(x.s))} – ${x === cur && runStart != null ? `<span class="fact ok">${esc(t('timeLive'))}</span>` : esc(hhmm(x.e))}</span><span>${esc(fmtDur(x.a))}</span></div>`).join('')}
    </section>`).join('')}</div>` : ''}
    ${!all && days.length > 30 ? `<a class="btn block" href="#/tiempo?todo=1" style="margin-top:10px">${esc(t('timeMore'))}</a>` : ''}
    ${list.length ? `<button class="btn bad block" id="tDel" style="margin-top:22px">${esc(t('timeDel'))}</button>` : ''}`;
  $('#tDel')?.addEventListener('click', () => {
    if (!confirm(t('timeDelQ'))) return;
    const running = runStart != null;
    if (running) runStart = null;
    S.time = []; cur = null; save(true);
    if (running) clockOn(Date.now());
    toast(t('timeDelOk')); timeView(false);
  });
}

// ---------- ajustes ----------
async function offlineStatus() {
  if (!('serviceWorker' in navigator)) return { ok: false, text: t('offNoSW') };
  if (location.protocol === 'file:') return { ok: false, text: t('offFile') };
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.active && navigator.serviceWorker.controller) return { ok: true, text: t('offOk') };
  return { ok: false, text: t('offPrep') };
}
async function settingsView() {
  header(t('setTitle'), null);
  let est = null, persisted = null;
  try { est = await navigator.storage?.estimate?.(); persisted = await navigator.storage?.persisted?.(); } catch (e) { /* opcional */ }
  if (!location.hash.startsWith('#/ajustes')) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  view.innerHTML = `
    <h3 class="label">${esc(t('timeTitle'))}</h3>
    <a class="item" href="#/tiempo">${icon('clock')}<div class="grow"><div class="t bigt">${esc(fmtDur(timeTotal()))}</div><div class="s">${esc(t('timeKicker'))}</div></div><span class="s">${esc(t('seeLog'))}</span><span class="chev">›</span></a>
    <h3 class="label">${esc(t('language'))}</h3>
    <section class="panel"><div class="seg2" id="langSeg"><button data-l="es" class="${L() === 'es' ? 'on' : ''}">Español</button><button data-l="en" class="${L() === 'en' ? 'on' : ''}">English</button></div></section>
    <h3 class="label">${esc(t('profile'))}</h3>
    <section class="panel"><label class="field">${esc(t('nameLbl'))}<input id="nm" type="text" autocomplete="given-name" maxlength="40" value="${esc(S.name || '')}"></label><p class="note" style="margin-bottom:0">${esc(t('nameNote'))}</p></section>
    <h3 class="label">${esc(t('offline'))}</h3>
    <section class="panel">
      <div class="status" id="offst" style="justify-content:flex-start;margin:0 0 6px"></div>
      <p class="note">${esc(standalone ? t('standalone') : t('installHow'))}</p>
      ${est ? `<div class="kv"><span>${esc(t('used'))}</span><span>${fmtMB(est.usage || 0)}${est.quota ? ` ${esc(t('of'))} ${fmtMB(est.quota)}` : ''}</span></div>` : ''}
      <div class="kv"><span>${esc(t('persistent'))}</span><span class="${persisted ? 'ok-text' : ''}">${esc(persisted ? t('on') : t('notConf'))}</span></div>
      <div class="row" style="margin-top:10px"><button class="btn" id="persist">${esc(t('persist'))}</button><button class="btn" id="upd">${esc(t('checkUpd'))}</button></div>
    </section>
    <h3 class="label">${esc(t('backup'))}</h3>
    <section class="panel">
      <p class="note" style="margin-top:0">${esc(t('backupNote'))}</p>
      <div class="row"><button class="btn red" id="exp">${esc(t('exp'))}</button><label class="btn" for="impf">${esc(t('imp'))}</label></div>
      <input type="file" id="impf" accept="application/json,.json" hidden>
    </section>
    <h3 class="label">${esc(t('reset'))}</h3>
    <section class="panel"><div class="row"><button class="btn" id="rCards">${esc(t('rCards'))}</button><button class="btn" id="rTests">${esc(t('rTests'))}</button></div>
    <button class="btn bad block" id="rAll" style="margin-top:8px">${esc(t('rAll'))}</button></section>
    <p class="note" style="text-align:center;margin-top:22px">${esc(t('version', window.CPP_VERSION || '—'))}</p>`;
  offlineStatus().then(s => { const e = $('#offst'); if (e) e.innerHTML = `<span class="dot ${s.ok ? 'ok' : ''}"></span>${esc(s.text)}`; });
  $$('#langSeg button').forEach(b => b.onclick = () => setLang(b.dataset.l));
  let nt;
  $('#nm').addEventListener('input', e => { clearTimeout(nt); nt = setTimeout(() => { S.name = e.target.value.trim(); save(); }, 300); });
  $('#persist').onclick = async () => { const ok = await navigator.storage?.persist?.(); toast(ok ? t('persistOk') : t('persistNo')); settingsView(); };
  $('#upd').onclick = async () => { const r = await navigator.serviceWorker?.getRegistration(); if (!r) return toast(t('noSW')); try { await r.update(); } catch (e) { /* sin red */ } toast(navigator.onLine ? t('checked') : t('noNet')); };
  $('#exp').onclick = exportProgress;
  $('#impf').onchange = e => importProgress(e.target.files[0]);
  $('#rCards').onclick = () => { if (confirm(t('rCardsQ'))) { S.cards = {}; save(true); toast(t('rCardsOk')); } };
  $('#rTests').onclick = () => { if (confirm(t('rTestsQ'))) { S.qa = {}; S.best = {}; S.last = {}; S.sims = []; save(true); toast(t('rTestsOk')); } };
  $('#rAll').onclick = () => { if (confirm(t('rAllQ'))) { const keep = { speed: S.speed, lang: S.lang, name: S.name, time: S.time }; S = Object.assign(blank(), keep); save(true); toast(t('rAllOk')); } };
}
async function exportProgress() {
  const name = `cpp-avance-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify({ app: 'cpp-estudio', v: 1, at: new Date().toISOString(), data: S })], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'CPP' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
async function importProgress(f) {
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (j.app !== 'cpp-estudio' || !j.data) throw new Error('formato');
    if (!confirm(t('impQ'))) return;
    runStart = null; cur = null;
    S = Object.assign(blank(), j.data); if (!Array.isArray(S.time)) S.time = []; save(true); clockOn(Date.now()); applyLang(); toast(t('impOk')); settingsView();
  } catch (e) { toast(t('impBad')); }
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
  applyLang();
  $('#lang').onclick = () => setLang(EN() ? 'es' : 'en');
  try {
    await Promise.all(IDX.filter(d => d.ready).map(d => loadScript(`data/${d.id}.js`)));
  } catch (e) {
    view.innerHTML = `<div class="empty">${esc(t('loadFail'))}</div>`;
    return;
  }
  DATA = window.CPP_DATA || {};
  indexData();
  if (EN()) await loadEN();
  window.addEventListener('hashchange', route);
  syncHeader();
  route();
  registerSW();
  initClock();
  loadScript('assets.js').catch(() => {});
  if (S.lastAudio) ADB.getMeta(S.lastAudio).then(m => m && loadAudio(m.id, false)).catch(() => {});
  player.addEventListener('play', () => { if (current) { S.lastAudio = current.id; save(); } });
}
start();
})();
