/* Conectiva Oeste — scripts do portal
   RÁDIO
   - STREAM_URL: endereço da transmissão ao vivo (ex.: Zeno.FM, Shoutcast, Icecast). Se preenchido, o player toca a rádio ao vivo.
   - Vazio: o player roda a programação automática abaixo (músicas em MP3 + vinheta + boletins de notícias lidos por voz).
   - Para trocar as músicas, substitua os arquivos .mp3 e edite a lista MUSICAS. */
const STREAM_URL = '';
const MUSICAS = [
  { src: 'estrada-de-terra.mp3', title: 'Estrada de Terra', artist: 'Trilha Conectiva Oeste · instrumental' },
  { src: 'manha-no-interior.mp3', title: 'Manhã no Interior', artist: 'Trilha Conectiva Oeste · instrumental' },
  { src: 'por-do-sol-no-paranapanema.mp3', title: 'Pôr do Sol no Paranapanema', artist: 'Trilha Conectiva Oeste · instrumental' },
  { src: 'rio-parana.mp3', title: 'Rio Paraná', artist: 'Trilha Conectiva Oeste · instrumental' },
  { src: 'cidade-viva.mp3', title: 'Cidade Viva', artist: 'Trilha Conectiva Oeste · instrumental' }
];
const VINHETA = 'vinheta-oeste-em-pauta.mp3';
const CLIMA = 'Em Presidente Prudente, tempo firme e máxima de 31 graus.';

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const script = document.currentScript || $('script[data-media]');
  const MEDIA = (script && script.dataset.media) || '';

  /* Data de hoje */
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d0 = new Date();
  const hoje = dias[d0.getDay()].replace(/^./, c => c.toUpperCase()) + ', ' + d0.getDate() + ' de ' + meses[d0.getMonth()] + ' de ' + d0.getFullYear();
  $$('[data-today]').forEach(el => { el.textContent = hoje; });

  /* Toast */
  let toastT;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* Menu lateral */
  const drawer = $('#drawer');
  $$('[data-menu-open]').forEach(b => b.addEventListener('click', () => { drawer.hidden = false; $('.drawer-close', drawer).focus(); }));
  $$('[data-menu-close]').forEach(b => b.addEventListener('click', () => { drawer.hidden = true; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer && !drawer.hidden) drawer.hidden = true; });

  /* Newsletter e busca */
  $$('form[data-news]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault(); const ok = $('.ok', f);
    if (ok) ok.textContent = 'Pronto! Você vai receber o resumo do Conectiva Oeste todas as manhãs.';
    f.reset();
  }));
  $$('form[role="search"]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const q = $('input', f).value.trim(); toast(q ? 'Busca por “' + q + '” (demonstração)' : 'Digite o que você procura'); }));

  /* Compartilhar */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => toast('Link copiado'), () => toast('Copie o link na barra de endereço'));
    else toast('Copie o link na barra de endereço');
  }));

  /* ================= RÁDIO ================= */
  const audio = new Audio(); audio.preload = 'auto';
  const st = { playing: false, vol: 0.8, idx: 0, item: null, speaking: false };

  // manchetes para o boletim: pega do próprio site
  function manchetes() {
    const seen = new Set(), out = [];
    $$('.tk a, .lead h1, .feed .t').forEach(a => { const t = a.textContent.trim(); if (t && !seen.has(t)) { seen.add(t); out.push(t); } });
    return out.length ? out : ['Acompanhe as principais notícias do Oeste Paulista no nosso site.'];
  }
  function horaFalada() {
    const d = new Date(), h = d.getHours(), m = d.getMinutes();
    return 'São ' + h + (h === 1 ? ' hora' : ' horas') + (m ? ' e ' + m + (m === 1 ? ' minuto' : ' minutos') : ' em ponto') + '.';
  }
  let headIdx = 0;
  function textoBoletim() {
    const hs = manchetes(), pick = [];
    for (let i = 0; i < 3; i++) pick.push(hs[(headIdx + i) % hs.length]);
    headIdx = (headIdx + 3) % hs.length;
    return ['Rádio Conectiva Oeste. Jornalismo e comunicação regional.', horaFalada(), 'Agora, as principais notícias da região.']
      .concat(pick.map(h => h.replace(/;/g, '.') + '.'))
      .concat([CLIMA, 'Mais notícias no site da Conectiva Oeste. Voltamos com música.']);
  }

  // grade automática: vinheta, boletim, duas músicas... repete
  function montarGrade() {
    const g = [{ type: 'vinheta' }, { type: 'boletim' }];
    MUSICAS.forEach((m, i) => {
      g.push({ type: 'musica', m });
      if (i % 2 === 1 && i < MUSICAS.length - 1) { g.push({ type: 'vinheta' }, { type: 'boletim' }); }
    });
    return g;
  }
  const grade = STREAM_URL ? [{ type: 'stream' }] : montarGrade();

  const vozes = () => (window.speechSynthesis ? speechSynthesis.getVoices() : []);
  function vozPt() {
    const v = vozes();
    return v.find(x => /pt-BR/i.test(x.lang) && /Google|Microsoft|Luciana|Francisca|Antonio/i.test(x.name)) || v.find(x => /pt-BR/i.test(x.lang)) || v.find(x => /^pt/i.test(x.lang)) || null;
  }
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};

  function info(item) {
    if (!item) return { title: 'Rádio Conectiva Oeste', artist: 'Clique para ouvir', kicker: 'Clique para ouvir' };
    if (item.type === 'stream') return { title: 'Rádio Conectiva Oeste', artist: 'Transmissão ao vivo', kicker: 'Ao vivo' };
    if (item.type === 'boletim') return { title: 'Boletim de notícias', artist: 'Redação Conectiva Oeste · ' + horaCurta(), kicker: 'Notícias agora' };
    if (item.type === 'vinheta') return { title: 'Rádio Conectiva Oeste', artist: 'Jornalismo e comunicação regional', kicker: 'No ar' };
    return { title: item.m.title, artist: item.m.artist, kicker: 'Tocando agora' };
  }
  function horaCurta() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  const fmt = s => (isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00');

  function proximoItem(off = 1) {
    let i = st.idx;
    for (let k = 0; k < grade.length; k++) {
      i = (i + off + grade.length) % grade.length;
      if (grade[i].type !== 'boletim' || window.speechSynthesis) return i;
    }
    return i;
  }

  function paint() {
    const it = info(st.playing || st.item ? st.item : null);
    document.body.classList.toggle('playing', st.playing);
    $$('[data-pl="title"]').forEach(e => { e.textContent = it.title; });
    $$('[data-pl="artist"]').forEach(e => { e.textContent = it.artist; });
    $$('[data-pl="status"]').forEach(e => { e.textContent = st.playing ? it.kicker : 'Clique para ouvir'; });
    $$('[data-pl="toggle"]').forEach(b => b.setAttribute('aria-label', st.playing ? 'Pausar rádio' : 'Ouvir rádio'));
    paintTime();
    paintQueue();
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({ title: it.title, artist: it.artist, album: 'Rádio Conectiva Oeste', artwork: [{ src: MEDIA + 'simbolo.png', sizes: '512x512', type: 'image/png' }] });
        navigator.mediaSession.playbackState = st.playing ? 'playing' : 'paused';
      } catch (e) {}
    }
  }
  function paintTime() {
    const it = st.item;
    const live = !it || it.type !== 'musica';
    const cur = live ? 0 : audio.currentTime, dur = live ? 0 : audio.duration;
    $$('[data-pl="elapsed"]').forEach(e => { e.textContent = live ? horaCurta() : fmt(cur); });
    $$('[data-pl="dur"]').forEach(e => { e.textContent = live ? 'AO VIVO' : fmt(dur); });
    $$('[data-pl="fill"]').forEach(e => { e.style.width = (live ? (st.playing ? 100 : 0) : (dur ? cur / dur * 100 : 0)) + '%'; });
  }
  function paintQueue() {
    const q = $('[data-pl="queue"]'); if (!q) return;
    const rows = []; let i = st.idx;
    for (let k = 0; k < 5; k++) {
      const it = grade[i]; const inf = info(it);
      rows.push('<li' + (k === 0 && st.playing ? ' class="now"' : '') + '><span class="qk">' + (k === 0 ? (st.playing ? 'Agora' : 'Primeiro') : 'A seguir') + '</span><span class="qt">' + inf.title + '</span><span class="qa">' + inf.artist + '</span></li>');
      i = (i + 1) % grade.length; if (grade.length === 1) break;
    }
    q.innerHTML = rows.join('');
  }

  function tocar(i) {
    st.idx = i; st.item = grade[i];
    audio.pause(); st.tok = null; if (window.speechSynthesis) speechSynthesis.cancel(); st.speaking = false;
    const it = st.item;
    if (it.type === 'stream') { audio.src = STREAM_URL; audio.volume = st.vol; audio.play().catch(erro); }
    else if (it.type === 'musica') { audio.src = MEDIA + it.m.src; audio.volume = st.vol; audio.play().catch(erro); }
    else if (it.type === 'vinheta') { audio.src = MEDIA + VINHETA; audio.volume = st.vol; audio.play().catch(erro); }
    else if (it.type === 'boletim') falar(textoBoletim());
    paint();
  }
  function erro() { toast('Não foi possível tocar agora. Tente de novo.'); st.playing = false; paint(); }
  function falar(frases) {
    if (!window.speechSynthesis) { avancar(); return; }
    st.speaking = true; let n = 0, started = false;
    const v = vozPt();
    const token = {}; st.tok = token;
    const total = frases.join(' ').length / 13 * 1000 + 6000;
    setTimeout(() => { if (st.tok === token && !started && st.speaking) { st.speaking = false; speechSynthesis.cancel(); avancar(); } }, 4000);
    setTimeout(() => { if (st.tok === token && st.speaking) { st.speaking = false; speechSynthesis.cancel(); avancar(); } }, total);
    frases.forEach((f, k) => {
      const u = new SpeechSynthesisUtterance(f);
      u.lang = 'pt-BR'; if (v) u.voice = v; u.rate = 1.02; u.pitch = 1; u.volume = st.vol;
      u.onstart = () => { started = true; };
      u.onend = () => { n++; if (n === frases.length && st.speaking && st.tok === token) { st.speaking = false; avancar(); } };
      u.onerror = () => { n++; if (n === frases.length && st.speaking && st.tok === token) { st.speaking = false; avancar(); } };
      speechSynthesis.speak(u);
    });
  }
  function avancar() { if (st.playing) tocar(proximoItem(1)); }
  audio.addEventListener('ended', avancar);
  audio.addEventListener('timeupdate', paintTime);
  audio.addEventListener('loadedmetadata', paintTime);

  function play() {
    st.playing = true;
    if (!st.item) { tocar(st.idx); return; }
    if (st.item.type === 'boletim') tocar(st.idx);
    else { audio.volume = st.vol; audio.play().catch(erro); }
    paint();
  }
  function pause() {
    st.playing = false; audio.pause();
    if (window.speechSynthesis && st.speaking) { speechSynthesis.cancel(); st.speaking = false; }
    paint();
  }
  function setVol(v) {
    st.vol = v; audio.volume = v;
    $$('[data-pl="vol"]').forEach(r => { r.value = Math.round(v * 100); });
  }

  $$('[data-pl="toggle"]').forEach(b => b.addEventListener('click', () => (st.playing ? pause() : play())));
  $$('[data-pl="go"]').forEach(b => b.addEventListener('click', () => { if (!st.playing) play(); }));
  $$('[data-pl="next"]').forEach(b => b.addEventListener('click', () => { st.playing = true; tocar(proximoItem(1)); }));
  $$('[data-pl="prev"]').forEach(b => b.addEventListener('click', () => { st.playing = true; tocar(audio.currentTime > 4 && st.item && st.item.type === 'musica' ? st.idx : proximoItem(-1)); }));
  $$('[data-pl="vol"]').forEach(r => r.addEventListener('input', () => setVol(r.value / 100)));
  $$('[data-pl="popup"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); pause();
    const w = window.open(a.href, 'radio-oeste-em-pauta', 'width=420,height=720,menubar=no,toolbar=no,location=no,status=no');
    if (!w) location.href = a.href;
  }));
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('nexttrack', () => { st.playing = true; tocar(proximoItem(1)); });
      navigator.mediaSession.setActionHandler('previoustrack', () => { st.playing = true; tocar(proximoItem(-1)); });
    } catch (e) {}
  }
  setInterval(() => { if (st.item && st.item.type !== 'musica') paintTime(); }, 10000);
  setVol(st.vol); paint();
  if (document.body.dataset.autoplayHint === 'on') toast('Toque no play para ouvir a rádio');

  /* Mini player quando o player do topo sai da tela */
  const mini = $('.mini'), top = $('.player');
  if (mini && top && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { mini.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(top);
  }
})();
