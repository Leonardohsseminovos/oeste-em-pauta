/* Oeste em Pauta — scripts do portal
   Para ligar a rádio de verdade, coloque o endereço do streaming (MP3/AAC/HLS compatível) em STREAM_URL.
   Enquanto estiver vazio, o player toca uma trilha de demonstração gerada no próprio navegador. */
const STREAM_URL = '';

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Data de hoje */
  const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const d = new Date();
  const hoje = dias[d.getDay()].replace(/^./, c => c.toUpperCase()) + ', ' + d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
  $$('[data-today]').forEach(el => { el.textContent = hoje; });

  /* Toast */
  let toastT;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400);
  }

  /* Menu lateral */
  const drawer = $('#drawer');
  $$('[data-menu-open]').forEach(b => b.addEventListener('click', () => { drawer.hidden = false; $('.drawer-close', drawer).focus(); }));
  $$('[data-menu-close]').forEach(b => b.addEventListener('click', () => { drawer.hidden = true; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer && !drawer.hidden) drawer.hidden = true; });

  /* Newsletter */
  $$('form[data-news]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const ok = $('.ok', f);
    if (ok) ok.textContent = 'Pronto! Você vai receber o resumo do Oeste em Pauta todas as manhãs.';
    f.reset();
  }));
  $$('form[role="search"]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); const q = $('input', f).value.trim(); toast(q ? 'Busca por “' + q + '” (demonstração)' : 'Digite o que você procura'); }));

  /* Compartilhar */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const url = location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copiado'), () => toast('Copie o link na barra de endereço'));
    else toast('Copie o link na barra de endereço');
  }));

  /* ---------------- Rádio ---------------- */
  const tracks = [
    { title: 'Manhã Oeste — notícias e música', artist: 'Ao vivo com Ana Ribeiro', dur: 0 },
    { title: 'Estrada de Terra', artist: 'Trio Interior', dur: 214 },
    { title: 'Pôr do Sol no Paranapanema', artist: 'Marina Sertão', dur: 187 },
    { title: 'Boletim Agro — cotações do dia', artist: 'Redação Oeste em Pauta', dur: 95 },
    { title: 'Cidade Grande, Coração do Interior', artist: 'Os Viajantes', dur: 241 }
  ];
  const st = { i: 1, t: 0, playing: false, vol: 0.7 };
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function paint() {
    const tr = tracks[st.i], live = !tr.dur;
    document.body.classList.toggle('playing', st.playing);
    $$('[data-pl="title"]').forEach(e => { e.textContent = tr.title; });
    $$('[data-pl="artist"]').forEach(e => { e.textContent = tr.artist; });
    $$('[data-pl="status"]').forEach(e => { e.textContent = st.playing ? (live ? 'No ar agora' : 'Tocando agora') : 'Clique para ouvir'; });
    $$('[data-pl="elapsed"]').forEach(e => { e.textContent = fmt(st.t); });
    $$('[data-pl="dur"]').forEach(e => { e.textContent = live ? 'AO VIVO' : fmt(tr.dur); });
    $$('[data-pl="fill"]').forEach(e => { e.style.width = (live ? 100 : Math.min(100, st.t / tr.dur * 100)) + '%'; });
    $$('[data-pl="toggle"]').forEach(b => b.setAttribute('aria-label', st.playing ? 'Pausar rádio' : 'Ouvir rádio'));
  }

  /* Áudio: streaming real ou trilha de demonstração (Web Audio) */
  let ctx, master, schedT, nextTime = 0, step = 0, el;
  const prog = [[48, 52, 55, 59], [43, 47, 50, 55], [45, 48, 52, 55], [41, 45, 48, 52]]; // Cmaj7 G Am F
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(freq, t, len, type, gain, cutoff) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.05);
  }
  function schedule() {
    const beat = 60 / 84 / 2; // colcheias a 84 bpm
    while (nextTime < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % 4, chord = prog[bar], s = step % 8;
      if (s === 0) chord.forEach(m => note(mtof(m), nextTime, beat * 8.5, 'triangle', 0.05, 1200));
      if (s === 0) note(mtof(chord[0] - 12), nextTime, beat * 3.5, 'sine', 0.12, 400);
      if (s === 4) note(mtof(chord[0] - 12), nextTime, beat * 3, 'sine', 0.09, 400);
      const arp = [0, 2, 1, 3, 2, 1, 3, 2][s];
      note(mtof(chord[arp] + 12), nextTime, beat * 1.6, 'square', 0.018, 2200);
      nextTime += beat; step++;
    }
  }
  function startAudio() {
    if (STREAM_URL) {
      if (!el) { el = new Audio(STREAM_URL); el.preload = 'none'; }
      el.volume = st.vol; return el.play().catch(() => toast('Não foi possível conectar à rádio agora'));
    }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = st.vol * 0.8; master.connect(ctx.destination);
    }
    ctx.resume(); nextTime = ctx.currentTime + 0.05;
    clearInterval(schedT); schedT = setInterval(schedule, 120); schedule();
  }
  function stopAudio() {
    if (el) el.pause();
    if (ctx) { clearInterval(schedT); ctx.suspend(); }
  }
  function setVol(v) {
    st.vol = v; if (el) el.volume = v; if (master) master.gain.value = v * 0.8;
    $$('[data-pl="vol"]').forEach(r => { r.value = Math.round(v * 100); });
  }

  $$('[data-pl="toggle"]').forEach(b => b.addEventListener('click', () => {
    st.playing = !st.playing; st.playing ? startAudio() : stopAudio(); paint();
  }));
  $$('[data-pl="next"]').forEach(b => b.addEventListener('click', () => { st.i = (st.i + 1) % tracks.length; st.t = 0; if (!st.playing) { st.playing = true; startAudio(); } paint(); }));
  $$('[data-pl="prev"]').forEach(b => b.addEventListener('click', () => { st.i = (st.i - 1 + tracks.length) % tracks.length; st.t = 0; if (!st.playing) { st.playing = true; startAudio(); } paint(); }));
  $$('[data-pl="vol"]').forEach(r => r.addEventListener('input', () => setVol(r.value / 100)));
  $$('[data-pl="go"]').forEach(b => b.addEventListener('click', () => { if (!st.playing) { st.playing = true; startAudio(); paint(); } }));

  setInterval(() => {
    if (!st.playing) return;
    const tr = tracks[st.i];
    if (tr.dur && st.t + 1 >= tr.dur) { st.i = (st.i + 1) % tracks.length; st.t = 0; } else st.t++;
    paint();
  }, 1000);
  paint();

  /* Mini player quando o player do topo sai da tela */
  const mini = $('.mini'), top = $('.player');
  if (mini && top && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { mini.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(top);
  }
})();
