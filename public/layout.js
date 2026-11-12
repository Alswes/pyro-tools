/* ============================================================
   Pyro Tools (Firebase) · v0.15.1: no celular só o ☰ abre o menu · v0.14.2 · menu lateral flexível e visível · v0.15: favoritos, grupos e Instalar app
   - Celular e tablet (até 900px): o menu lateral fica sempre visível como trilho de ícones
     (no lugar da barra de baixo); o botão ☰ abre o menu com os nomes por cima da página.
   - Computador: o botão « » recolhe o menu para só ícones ou abre com os nomes (fica salvo).
   - Menu rola sozinho quando a tela é baixa; nada fica escondido.
   - Celular: o chat entra no menu (sem botão flutuante por cima do conteúdo).
   ============================================================ */
(function () {
  'use strict';
  const H = document.documentElement, KEY = 'pyro_sd', MOB = 900;
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const svg = d => `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC_MENU = svg('<path d="M4 6h16M4 12h16M4 18h16"/>'), IC_CHAT = svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
  const mob = () => innerWidth <= MOB;

  function aplicar() { const s = LS.get(KEY); H.classList.toggle('sd-mini', s === 'mini'); H.classList.toggle('sd-wide', s === 'wide'); }
  function fechar() { H.classList.remove('sd-open'); document.querySelectorAll('[data-sd="tg"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  function alternar() {
    const t = document.querySelector('.sd-tg');
    if (mob()) { const ab = !H.classList.contains('sd-open'); H.classList.toggle('sd-open', ab); document.querySelectorAll('[data-sd="tg"]').forEach(b => b.setAttribute('aria-expanded', String(ab))); if (ab) { const f = document.querySelector('.side [aria-current="page"]') || document.querySelector('.side .nv'); if (f) setTimeout(() => f.focus({ preventScroll: false }), 220); } return; }
    const side = document.querySelector('.side'); const mini = side && side.getBoundingClientRect().width < 130;
    LS.set(KEY, mini ? 'wide' : 'mini'); aplicar();
  }
  function injetar() {
    const side = document.querySelector('.side'); if (!side || side.querySelector('.sd-tg')) return;
    const brand = side.querySelector('.brand');
    const tg = `<button type="button" class="nv sd-tg" data-sd="tg" aria-label="Abrir ou recolher o menu" aria-expanded="false" title="Abrir ou recolher o menu">${IC_MENU}<span>Recolher menu</span></button>`;
    if (brand) brand.insertAdjacentHTML('afterend', tg); else side.insertAdjacentHTML('afterbegin', tg);
    organizar(side);
    const grow = side.querySelector('.grow');
    const ch = `<button type="button" class="nv sd-chat" data-sd="chat" title="Conversas" aria-label="Conversas">${IC_CHAT}<span>Conversas</span><i class="sd-n" hidden></i></button>`;
    const IC_INST = svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>');
    const inst = standalone() ? '' : `<button type="button" class="nv sd-inst" data-sd="inst" title="Instalar o Pyro como aplicativo" aria-label="Instalar o Pyro como aplicativo"${instalar || ios() ? '' : ' hidden'}>${IC_INST}<span>Instalar app</span></button>`;
    if (grow) grow.insertAdjacentHTML('beforebegin', ch + inst); else side.insertAdjacentHTML('beforeend', ch + inst);
    const cur = side.querySelector('[aria-current="page"]'); if (cur && cur.scrollIntoView && side.scrollHeight > side.clientHeight) { const r = cur.getBoundingClientRect(), sr = side.getBoundingClientRect(); if (r.bottom > sr.bottom || r.top < sr.top) side.scrollTop += r.top - sr.top - sr.height / 2; }
    const crumb = document.querySelector('.topbar2 .crumb');
    if (crumb && !crumb.querySelector('.sd-hb')) crumb.insertAdjacentHTML('afterbegin', `<button type="button" class="ibtn sd-hb" data-sd="tg" aria-label="Abrir o menu" aria-expanded="false" title="Menu">${IC_MENU}</button>`);
    ajustarTb(); const tbEl = document.querySelector('.topbar2'); if (tbEl && window.ResizeObserver && !tbEl._ro) { tbEl._ro = new ResizeObserver(ajustarTb); tbEl._ro.observe(tbEl); }
    if (!document.querySelector('.sd-bk')) { const bk = document.createElement('div'); bk.className = 'sd-bk'; bk.addEventListener('click', fechar); document.body.appendChild(bk); }
    badge();
  }
  /* v0.15 (M3): favoritos no topo e grupos que recolhem (Principal, Setores, Sistema) */
  const FAV = 'pyro_sd_fav', GRP = 'pyro_sd_grp';
  const lista = k => { try { const v = JSON.parse(LS.get(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
  const estrela = (v, on) => `<span class="sd-star${on ? ' on' : ''}" data-sd="fav" data-v="${v}" role="button" tabindex="0" aria-label="${on ? 'Tirar dos favoritos' : 'Favoritar'}" title="${on ? 'Tirar dos favoritos' : 'Favoritar (vai para o topo do menu)'}">${on ? '★' : '☆'}</span>`;
  function organizar(side) {
    const favs = lista(FAV), fech = lista(GRP);
    const itens = [...side.querySelectorAll('.nv[data-act="nav"][data-v]')].filter(b => b.dataset.v !== 'config' || true);
    itens.forEach(b => { if (!b.querySelector('.sd-star')) b.insertAdjacentHTML('beforeend', estrela(b.dataset.v, favs.includes(b.dataset.v))); });
    const fv = favs.map(v => itens.find(b => b.dataset.v === v)).filter(Boolean);
    if (fv.length) {
      const ref = side.querySelector('.sd-tg'), box = document.createElement('div'); box.className = 'sd-favbox';
      box.innerHTML = '<div class="lbl sd-favlbl">Favoritos</div>';
      fv.forEach(b => { const c = b.cloneNode(true); c.classList.add('sd-favit'); box.appendChild(c); b.classList.add('sd-isfav'); });
      ref.insertAdjacentElement('afterend', box);
    }
    [...side.querySelectorAll(':scope > .lbl')].forEach(l => {
      const nome = l.textContent.trim(), fechado = fech.includes(nome);
      l.dataset.sd = 'grp'; l.setAttribute('role', 'button'); l.tabIndex = 0; l.setAttribute('aria-expanded', String(!fechado)); l.title = fechado ? 'Mostrar este grupo' : 'Recolher este grupo';
      if (!fechado) return;
      let e = l.nextElementSibling;
      while (e && !e.matches('.lbl,.grow,.sd-chat,.bkcard')) { if (e.matches('.nv') && e.getAttribute('aria-current') !== 'page') e.classList.add('sd-grp-hid'); e = e.nextElementSibling; }
    });
    rotulos();
  }
  function rotulos() { const side = document.querySelector('.side'); if (side) requestAnimationFrame(() => side.classList.toggle('sd-lab', side.getBoundingClientRect().width >= 130)); }
  function alternarLista(k, v) { const a = lista(k), i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); LS.set(k, JSON.stringify(a)); if (typeof render === 'function') render(); }
  /* o Pedidos e Recebimento (iframe) começa logo abaixo da barra do topo, mesmo quando ela muda de altura */
  function ajustarTb() { const h = document.getElementById('recHost'), tb = document.querySelector('.topbar2'); if (h && tb) h.style.setProperty('--tb', Math.max(0, Math.round(tb.getBoundingClientRect().bottom)) + 'px'); }
  function badge() {
    const n = document.querySelector('.ch-root .ch-n'), b = document.querySelector('.sd-n'); if (!b) return;
    const on = n && !n.hidden && n.textContent.trim(); b.hidden = !on; b.textContent = on ? n.textContent.trim() : '';
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-sd]');
    if (b) { ev.preventDefault(); ev.stopPropagation(); if (b.dataset.sd === 'tg') { alternar(); rotulos(); } else if (b.dataset.sd === 'inst') instalarApp(); else if (b.dataset.sd === 'fav') alternarLista(FAV, b.dataset.v); else if (b.dataset.sd === 'grp') alternarLista(GRP, b.textContent.trim()); else if (b.dataset.sd === 'chat') { fechar(); const f = document.querySelector('.ch-root .ch-fab'); if (f) f.click(); } return; }
    if (ev.target.closest && ev.target.closest('.side .nv[data-act]')) fechar();
  }, true);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && H.classList.contains('sd-open')) fechar();
    const b = ev.target.closest && ev.target.closest('.sd-star,.lbl[data-sd="grp"]'); if (b && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); b.click(); }
  });
  addEventListener('resize', () => { if (!mob()) fechar(); rotulos(); ajustarTb(); });

  /* v0.15 (M2): Pyro como aplicativo no celular e no computador */
  let instalar = null;
  addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); instalar = ev; document.querySelectorAll('.sd-inst').forEach(b => b.hidden = false); });
  addEventListener('appinstalled', () => { instalar = null; document.querySelectorAll('.sd-inst').forEach(b => b.hidden = true); });
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function instalarApp() {
    if (instalar) { instalar.prompt(); try { await instalar.userChoice; } catch (e) {} instalar = null; document.querySelectorAll('.sd-inst').forEach(b => b.hidden = true); return; }
    const msg = ios() ? 'No iPhone: toque em Compartilhar (quadrado com seta) e depois em Adicionar à Tela de Início.' : 'No Chrome: menu ⋮ > Instalar app (ou Adicionar à tela inicial).';
    if (typeof toast === 'function') toast(msg); else alert(msg);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

  const app = document.getElementById('app');
  if (app) new MutationObserver(injetar).observe(app, { childList: true });
  setInterval(badge, 1500);
  aplicar(); injetar();

  const st = document.createElement('style');
  st.textContent = `
  .sd-chat,.sd-bk,.side .nv.sd-chat{display:none}
  .sd-inst[hidden]{display:none!important}
  .sd-n{position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:8px;background:var(--bad);color:#fff;font:700 10px/16px var(--f-mono,monospace);text-align:center;padding:0 3px;font-style:normal}
  .side .nv{position:relative}
  .sd-star{display:none;margin-left:auto;font-size:15px;line-height:1;color:var(--muted);opacity:0;padding:2px 4px;border-radius:6px;cursor:pointer}
  .side.sd-lab .sd-star{display:inline!important}.side.sd-lab .nv:hover .sd-star,.side.sd-lab .sd-star.on,.side.sd-lab .sd-star:focus{opacity:1}.sd-star.on{color:var(--accent)}
  .side.sd-lab .sd-grp-hid,.side .sd-isfav{display:none!important}
  .side .sd-favbox{display:contents}
  .side.sd-lab .lbl[data-sd="grp"]{cursor:pointer;user-select:none;display:flex!important;align-items:center;justify-content:space-between}
  .side.sd-lab .lbl[data-sd="grp"]::after{content:'▾';font-size:11px;opacity:.7;transition:transform .15s}.side.sd-lab .lbl[aria-expanded="false"]::after{transform:rotate(-90deg)}
  .side .lbl[data-sd="grp"]:hover{color:var(--fg)}
  .side{scrollbar-width:thin;overscroll-behavior:contain}
  /* computador: menu recolhido (só ícones) */
  @media(min-width:${MOB + 1}px){
    html.sd-mini .shell{grid-template-columns:84px minmax(0,1fr)!important}
    html.sd-mini .side{padding:14px 8px!important;align-items:center!important}
    html.sd-mini .side .lbl,html.sd-mini .side .sidefoot,html.sd-mini .side .nv>span,html.sd-mini .side .brand>div,html.sd-mini .side .bkcard .t,html.sd-mini .side .bkcard .s{display:none!important}
    html.sd-mini .side .brand{justify-content:center;padding:0 0 10px!important}
    html.sd-mini .side .nv{width:48px!important;height:44px!important;min-height:44px;padding:0!important;justify-content:center!important;flex:none}
    html.sd-mini .side .bkcard{padding:0!important;border:0!important;background:transparent!important;align-items:center}
    html.sd-mini .side .bkcard .btn{width:48px;height:44px;padding:0;font-size:0;gap:0;justify-content:center}
    html.sd-mini:not([data-skin~="studio"]) #recHost{left:84px}
    html.sd-wide[data-skin~="studio"] .shell{grid-template-columns:236px minmax(0,1fr)!important}
    html.sd-wide[data-skin~="studio"] .side{align-items:stretch!important}
    html.sd-wide[data-skin~="studio"] .side .nv>span{display:inline!important}
    html.sd-wide[data-skin~="studio"] .side .lbl,html.sd-wide[data-skin~="studio"] .side .brand>div{display:block!important}
    html.sd-wide[data-skin~="studio"] .side .brand{justify-content:flex-start!important}
    html.sd-wide[data-skin~="studio"] .side .nv{width:100%!important;height:40px!important;padding:0 12px!important;justify-content:flex-start!important;gap:12px!important;font-size:14px}
    html.sd-wide[data-skin~="studio"] #recHost{left:264px!important}
  }
  /* tela baixa: itens mais juntos para caber mais sem rolar */
  @media(min-width:${MOB + 1}px) and (max-height:780px){
    .side .nv{padding-top:6px;padding-bottom:6px}.side .lbl{padding-top:6px;padding-bottom:2px}.side .brand{padding-bottom:6px}.side .bkcard .s{display:none}
    [data-skin~="studio"] .side .nv,html.sd-mini .side .nv{height:40px!important;min-height:40px}
  }
  /* celular e tablet (v0.15.1): sem barra lateral fixa; só o ☰ no topo abre o menu por cima da página */
  .topbar2 .sd-hb{display:none!important}
  @media(max-width:${MOB}px){
    .shell{grid-template-columns:minmax(0,1fr)!important;padding:0!important}
    .shell>.content{grid-column:1;min-width:0}
    [data-skin~="studio"] .shell>.content{padding:0 8px}
    .topbar2 .sd-hb{display:inline-grid!important;place-items:center;flex:none;margin-right:4px}
    .side{display:flex!important;flex-direction:column;position:fixed!important;left:0!important;top:0!important;bottom:0;height:100vh!important;height:100dvh!important;width:min(280px,86vw)!important;padding:12px 10px calc(12px + env(safe-area-inset-bottom,0px))!important;gap:2px!important;align-items:stretch!important;overflow-y:auto!important;overflow-x:hidden;border-radius:0 18px 18px 0!important;border:0!important;box-shadow:none!important;z-index:400;background:var(--rail,var(--surface))!important;transform:translateX(-105%);visibility:hidden;transition:transform .2s ease,visibility 0s linear .2s}
    html.sd-open .side{transform:none;visibility:visible;box-shadow:0 0 40px rgba(0,0,0,.45)!important;transition:transform .2s ease}
    .side .nv{width:100%!important;height:44px!important;min-height:44px;padding:0 12px!important;justify-content:flex-start!important;gap:12px!important;font-size:14px!important;flex:none;border-radius:12px!important;border-left:0!important}
    .side .nv>span{display:inline!important}
    .side .lbl,.side .brand>div{display:block!important}
    .side .brand{flex-direction:row!important;justify-content:flex-start!important;padding:0 4px 8px!important;margin:0!important;border:0!important}
    .side .brand svg{width:40px!important;height:40px!important}
    .side .sidefoot{display:none!important}
    .side .grow{flex:1 0 8px}
    .side .sd-tg span{font-size:0}.side .sd-tg span::before{content:'Fechar menu';font-size:14px}
    .sd-chat,.side .nv.sd-chat{display:flex}
    .topbar2 .tools{gap:2px!important;flex-wrap:wrap;min-width:0}.topbar2 .tools [data-act="nav"][data-v="config"]{display:none!important}.topbar2 .fbuser span{max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle}
    .crumb{display:flex;align-items:center;min-width:0}
    .bottomnav{display:none!important}
    #recHost{left:0!important;right:0!important;bottom:0!important;border-radius:0!important}
    .wm{bottom:6px!important;right:8px!important}
    .ch-root{bottom:10px!important;right:10px!important}
    .ch-root .ch-fab{display:none}
    .ch-pan{max-height:calc(100dvh - 80px)!important;width:min(360px,calc(100vw - 20px))!important}
    html.sd-open .sd-bk{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:399}
    html.sd-open{overflow:hidden}
  }
  @media print{.side,.sd-bk{display:none!important}}`;
  document.head.appendChild(st);
})();
