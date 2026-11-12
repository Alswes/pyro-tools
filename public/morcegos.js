/* ============================================================
   Pyro Tools · tema Noturno (preto e amarelo)
   - enxame de morcegos no lugar do fogo: ao clicar e ao concluir uma entrega ou coleta
   - cores do tema no Roteiro e no Pedidos e Recebimento
   - mascote Pyro com máscara, capa e emblema de chama
   ============================================================ */
(function () {
  'use strict';
  if (window.__morcegos) return; window.__morcegos = 1;
  const LSUI = 'ae_followup_ui_v1';
  function noturno() {
    try { if (typeof UI !== 'undefined' && UI && UI.skin) return UI.skin === 'noturno'; } catch (e) {}
    try { const u = JSON.parse(localStorage.getItem(LSUI) || 'null'); return !!u && u.skin === 'noturno'; } catch (e) { return false; }
  }
  window.pyroNoturno = noturno;

  /* ---------- mascote ---------- */
  window.pyroNoturnoSVG = function (svg) {
    const M = { '#FF8A1F': '#2E3036', '#FF6A1A': '#24262B', '#FF4A12': '#1A1B1F', '#FFC42E': '#E0B000', '#FFE27A': '#FFE066', '#D63A0B': '#141518', '#FFD23F': '#F5C400', '#F0560F': '#202227', '#8A2A0A': '#0B0B0C', '#FF7F8A': '#C94A55', '#FF9A6B': '#3A3C42',
      /* mesmo mascote nas cores do Carmesim (Roteiro) */
      '#4A060A': '#2E3036', '#9E0F17': '#24262B', '#D3252D': '#1A1B1F', '#FF7A1A': '#E0B000', '#FFD36B': '#FFE066', '#6E0B10': '#141518', '#C9A15A': '#F5C400', '#7A0A10': '#202227', '#2A0306': '#0B0B0C', '#E0393E': '#C94A55', '#FF5A3C': '#3A3C42', '#FFE7B0': '#FFFFFF' };
    let o = String(svg);
    for (const k in M) o = o.split(k).join(M[k]).split(k.toLowerCase()).join(M[k]);
    /* capa (atrás dos braços e do corpo) */
    o = o.replace(/(<ellipse cx="14" cy="67")/, '<path d="M31 32 C19 50 9 78 11 96 L50 90 L89 96 C91 78 81 50 69 32 Z" fill="#0E0F12" stroke="#F5C400" stroke-opacity=".55" stroke-width="1.2" stroke-linejoin="round"/>$1');
    /* máscara nos olhos */
    o = o.replace(/(<ellipse cx="39\.5" cy="50")/, '<path d="M22 47 C27 37 42 38 50 43 C58 38 73 37 78 47 C77 59 63 62 56 58 C53 56 47 56 44 58 C37 62 23 59 22 47 Z" fill="#0B0B0C"/>$1');
    /* emblema: a chama do Pyro na barriga */
    o = o.replace(/(<path d="M50 93 C38 93[^>]*\/>)/, '$1<path d="M50 77 C53 81 56 83 55 87 C54 90 51.5 91 50 91 C48.5 91 46 90 45 87 C44 83 47 81 50 77 Z" fill="#0B0B0C"/>');
    return o.replace('Pyro, o mascote do Pyro Tools', 'Pyro, o mascote do Pyro Tools (tema Noturno)');
  };

  /* ---------- cores do tema nas páginas do Roteiro e do Recebimento (variáveis --p-*) ---------- */
  const CSS_P = `html[data-noturno]{--p-bg:#07080A!important;--p-surface:#111215!important;--p-surface2:#181A1E!important;--p-line:#2B2D33!important;--p-fg:#EDEDEF!important;--p-muted:#9A9CA3!important;--p-faint:#6E7077!important;
--p-accent:#F5C400!important;--p-accent-d:#D9AD00!important;--p-accent-ink:#0B0B0C!important;--p-accent-soft:rgba(245,196,0,.14)!important;--p-info:#F5C400!important;--p-info-soft:rgba(245,196,0,.12)!important;
--p-ok:#7CCB6B!important;--p-ok-soft:rgba(124,203,107,.14)!important;--p-warn:#FFB224!important;--p-warn-soft:rgba(255,178,36,.14)!important;--p-bad:#FF5C61!important;--p-bad-soft:rgba(255,92,97,.15)!important;
--p-grad:linear-gradient(135deg,#F5C400,#FFE066)!important;--p-hero:linear-gradient(135deg,#15161A,#0B0C0E)!important;--p-shadow:0 0 0 1px #1E2025!important;color-scheme:dark}
html[data-noturno] body{background:radial-gradient(1000px 480px at 80% -10%,rgba(245,196,0,.08),transparent 60%),#07080A!important;color:#EDEDEF}
html[data-noturno] .pbrand b{background:linear-gradient(135deg,#F5C400,#FFE066)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}`;
  window.pyroNoturnoDoc = function (doc, on) {
    try {
      if (!doc || !doc.documentElement) return;
      const r = doc.documentElement;
      if (on) { r.setAttribute('data-noturno', ''); r.setAttribute('data-theme', 'dark'); } else r.removeAttribute('data-noturno');
      if (on && !doc.getElementById('pyro-noturno')) { const st = doc.createElement('style'); st.id = 'pyro-noturno'; st.textContent = CSS_P; (doc.head || r).appendChild(st); }
      doc.querySelectorAll('.pbrand svg, #sidebarLogo svg').forEach(s => { if (!s.dataset.orig) s.dataset.orig = s.outerHTML; const alvo = on ? window.pyroNoturnoSVG(s.dataset.orig) : s.dataset.orig; if (s.outerHTML !== alvo) { const t = doc.createElement('div'); t.innerHTML = alvo; const n = t.firstElementChild; if (n) { n.dataset.orig = s.dataset.orig; s.replaceWith(n); } } });
    } catch (e) {}
  };
  /* página do Roteiro (fora do Pyro principal): aplica sozinha */
  if (typeof applyTheme !== 'function') {
    const ap = () => window.pyroNoturnoDoc(document, noturno());
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ap); else ap();
    addEventListener('storage', ev => { if (ev.key === LSUI) ap(); });
    setTimeout(ap, 1200); setInterval(() => { if (noturno() || document.documentElement.hasAttribute('data-noturno')) ap(); }, 3000);
  }

  /* ---------- morcego (desenho próprio, simples) ---------- */
  function morcego(ctx, x, y, s, f, rot, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.quadraticCurveTo(-6, -6 - 4 * f, -14, -3 - 7 * f);
    ctx.quadraticCurveTo(-11, -1 - 2 * f, -12, 3 - 3 * f);
    ctx.quadraticCurveTo(-8, 1, -7, 4 - f);
    ctx.quadraticCurveTo(-4, 2, -3, 5);
    ctx.quadraticCurveTo(-1, 3, 0, 6);
    ctx.quadraticCurveTo(1, 3, 3, 5);
    ctx.quadraticCurveTo(4, 2, 7, 4 - f);
    ctx.quadraticCurveTo(8, 1, 12, 3 - 3 * f);
    ctx.quadraticCurveTo(11, -1 - 2 * f, 14, -3 - 7 * f);
    ctx.quadraticCurveTo(6, -6 - 4 * f, 0, -2);
    ctx.closePath();
    ctx.fillStyle = '#0B0B0C'; ctx.fill();
    ctx.lineWidth = 0.9 / s; ctx.strokeStyle = 'rgba(245,196,0,.9)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -1.5, 2.3, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function tela() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), cv = document.createElement('canvas');
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.cssText = `position:fixed;left:0;top:0;width:${innerWidth}px;height:${innerHeight}px;pointer-events:none;z-index:10001`;
    document.body.appendChild(cv); const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    ctx.shadowColor = 'rgba(245,196,0,.45)'; ctx.shadowBlur = 6;
    return { cv, ctx };
  }
  const R = (a, b) => a + Math.random() * (b - a);
  const reduzir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* clique: uma revoada pequena saindo do botão */
  function revoada(r) {
    if (reduzir()) return;
    const { cv, ctx } = tela(), n = Math.max(5, Math.min(10, Math.round(r.width / 18))), t0 = performance.now(), dur = 850;
    const B = Array.from({ length: n }, () => ({ x: r.left + R(.15, .85) * r.width, y: r.top + R(.2, .8) * r.height, vx: R(-2.2, 2.2), vy: R(-3.8, -1.6), s: R(.55, .95), ph: R(0, 6.28), fq: R(26, 34) }));
    (function tick(now) {
      const el = now - t0, p = el / dur; ctx.clearRect(0, 0, innerWidth, innerHeight);
      B.forEach(b => { b.x += b.vx + Math.sin(el / 90 + b.ph) * .6; b.y += b.vy; b.vy -= .02; morcego(ctx, b.x, b.y, b.s * (1 + p * .3), Math.sin(el / 1000 * b.fq + b.ph), b.vx * .05, Math.max(0, 1 - p * p)); });
      if (el < dur) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  }

  /* concluir entrega ou coleta: o enxame cobre o card, consome e leva para Finalizados */
  function destinoFinalizados() {
    const el = [...document.querySelectorAll('h1,h2,h3,h4,.col-title,.lane-title,.k-col h3,[class*="col"] > *')].find(e => /finalizad/i.test(e.textContent || '') && e.getBoundingClientRect().width);
    if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return { x: innerWidth + 60, y: -60 };
  }
  function enxameNoCard(el, done) {
    if (!el) { done && done(); return; }
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) { done && done(); return; }
    const g = el.cloneNode(true); g.removeAttribute('data-open');
    g.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:10000;pointer-events:none;transition:none;transform-origin:50% 50%`;
    document.body.appendChild(g); el.style.visibility = 'hidden';
    if (reduzir()) { g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => { g.remove(); done && done(); }; return; }
    const { cv, ctx } = tela(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dest = destinoFinalizados();
    const n = Math.max(26, Math.min(70, Math.round(r.width * r.height / 1100))), dur = 2300, t0 = performance.now();
    const B = Array.from({ length: n }, (_, i) => {
      const a = R(0, 6.283), d = R(320, 560);
      return { sx: cx + Math.cos(a) * d, sy: cy + Math.sin(a) * d, tx: r.left + R(.06, .94) * r.width, ty: r.top + R(.08, .92) * r.height, ex: dest.x + R(-40, 40), ey: dest.y + R(-30, 30), s: R(.7, 1.25), ph: R(0, 6.28), fq: R(24, 34), atraso: R(0, .12), saida: R(0, .1) };
    });
    const ease = t => 1 - Math.pow(1 - t, 3), easeIn = t => t * t;
    let fim = false;
    (function tick(now) {
      const el2 = now - t0, p = Math.min(1, el2 / dur); ctx.clearRect(0, 0, innerWidth, innerHeight);
      /* card sendo consumido: fecha das bordas para o centro, escurece e encolhe */
      const c = Math.max(0, Math.min(1, (p - .28) / .42));
      g.style.clipPath = `inset(${c * 50}% ${c * 50}% ${c * 50}% ${c * 50}% round ${12 + c * 30}px)`;
      g.style.filter = `brightness(${1 - c * .75}) saturate(${1 - c})`; g.style.transform = `scale(${1 - c * .12})`; g.style.opacity = String(1 - Math.max(0, c - .85) / .15);
      B.forEach(b => {
        let x, y, a = 1;
        if (p < .35) { const t = ease(Math.max(0, Math.min(1, (p - b.atraso) / (.35 - b.atraso)))); x = b.sx + (b.tx - b.sx) * t; y = b.sy + (b.ty - b.sy) * t + Math.sin(t * 9 + b.ph) * 14 * (1 - t); }
        else if (p < .7) { const w = (el2 / 1000) * 5 + b.ph; x = b.tx + Math.cos(w) * 9; y = b.ty + Math.sin(w * 1.3) * 7; }
        else { const t = easeIn(Math.max(0, Math.min(1, (p - .7 - b.saida) / (.3 - b.saida)))); x = b.tx + (b.ex - b.tx) * t + Math.sin(t * 7 + b.ph) * 18; y = b.ty + (b.ey - b.ty) * t; a = 1 - Math.max(0, t - .75) / .25; }
        morcego(ctx, x, y, b.s, Math.sin(el2 / 1000 * b.fq + b.ph), 0, a);
      });
      if (p >= .74 && !fim) { fim = true; g.remove(); done && done(); }
      if (p < 1) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  }
  window.pyroEnxame = enxameNoCard; window.pyroRevoada = revoada;

  /* troca o fogo pelos morcegos quando o tema Noturno está ativo */
  function ligar() {
    const burn = window.pyroBurnCard;
    if (burn && !burn.__noturno) { const w = function (el, done) { return noturno() ? enxameNoCard(el, done) : burn(el, done); }; w.__noturno = 1; window.pyroBurnCard = w; }
    else if (!burn) { const w = function (el, done) { return noturno() ? enxameNoCard(el, done) : (done && done()); }; w.__noturno = 1; window.pyroBurnCard = w; }
    const skip = window.__flameSkip;
    if (!skip || !skip.__noturno) { const s = function () { return noturno() || !!(skip && skip()); }; s.__noturno = 1; s.__antes = skip; window.__flameSkip = s; }
  }
  const SEL = 'button,.btn,[role="button"],.nav-item,.nv,.prio-opt,.status-opt,.radio-pill,.chip,.add-slot,.db-seg,.seg-tabs button,.config-tabs button';
  document.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || !noturno()) return;
    const el = ev.target.closest && ev.target.closest(SEL); if (!el || el.disabled) return;
    const s = window.__flameSkip; if (s && s.__antes && s.__antes()) return;
    revoada(el.getBoundingClientRect());
  }, true);
  ligar(); addEventListener('load', () => setTimeout(ligar, 0)); setTimeout(ligar, 1500); setTimeout(ligar, 4000);
})();
