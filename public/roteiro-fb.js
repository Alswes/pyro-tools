/* ============================================================
   Roteiro de entregas e coletas (Logística) no Firebase
   Usa o mesmo login do Pyro (fb-bridge.js). Os dados ficam em
   rot_entregas, rot_coletas e rot_config, separados do Pyro.
   ============================================================ */
(function () {
  'use strict';
  window.PYRO_PAGINA = 'roteiro';
  var P = window.PYRO_FB; if (!P || !window.claude) return;
  var MAP = { entregas: 'rot_entregas', coletas: 'rot_coletas', config: 'rot_config' };
  function caminho(p) { var a = String(p).split('/'); a[0] = MAP[a[0]] || a[0]; return a.join('/'); }
  var usar = window.claude.use;
  var bloqueado = false;
  window.claude.use = function (n) {
    return P.ready.then(function () {
      if (!P.pagOk('roteiro')) { if (!bloqueado) { bloqueado = true; semAcesso(); } return new Promise(function () {}); }
      if (P.modo('roteiro') !== 'edita') document.documentElement.classList.add('fb-ro');
      if (n === 'db') return { collection: function (c) { return P.fs.collection(MAP[c] || c); }, doc: function (p) { return P.fs.doc(caminho(p)); } };
      return usar(n);
    });
  };
  function semAcesso() {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:9990;display:grid;place-items:center;background:#E9DFC9;font:15px Figtree,system-ui,sans-serif;color:#2B1A10;padding:16px';
    d.innerHTML = '<div style="max-width:420px;text-align:center;background:#F7F0E1;border:1px solid #C7AE7E;border-radius:16px;padding:24px"><h2 style="font-family:Cinzel,Georgia,serif;margin:0 0 8px">Roteiro de entregas</h2><p>Seu setor ainda não tem acesso a esta página. Fale com o administrador.</p><p><a href="index.html">Voltar ao Pyro Tools</a></p></div>';
    document.body.appendChild(d);
  }
  /* estilo: modo só leitura e links do Claude escondidos */
  var st = document.createElement('style');
  st.textContent = 'a[href*="modulo-antigo"]{display:none!important}' +
    '.fb-ro .add-slot,.fb-ro .btn-primary,.fb-ro .logi-btn,.fb-ro .modal-foot .btn-primary,.fb-ro .modal-foot .btn-danger{display:none!important}' +
    '.fb-ro .dcard{cursor:default}' +
    '#rotConta{display:flex;align-items:center;gap:8px;width:100%;margin-top:4px;padding:8px 10px;border-radius:12px;border:1px solid var(--p-line,#C7AE7E);background:transparent;color:inherit;font:600 12.5px Figtree,system-ui,sans-serif;cursor:pointer}' +
    '#rotImp{position:fixed;right:16px;bottom:16px;z-index:300;max-width:360px;background:#F7F0E1;color:#2B1A10;border:1px solid #C7AE7E;border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25);font:13.5px Figtree,system-ui,sans-serif}' +
    '#rotImp b{display:block;margin-bottom:6px}#rotImp button{font:inherit;font-weight:600;margin-top:8px;padding:7px 12px;border-radius:9px;border:1px solid #C7AE7E;background:#FFFBF2;cursor:pointer}';
  document.head.appendChild(st);
  /* dentro do Pyro (aba Roteiro semanal): sem o menu lateral, só o calendário */
  if (/[?&]embed=1/.test(location.search)) {
    document.documentElement.classList.add('rot-embed');
    var se = document.createElement('style');
    se.textContent = '.rot-embed .pwm,.rot-embed #rotConta,.rot-embed .sidebar-logo,.rot-embed .nav-section-label,.rot-embed .sidebar-nav a.nav-item,.rot-embed .sidebar-toggle,.rot-embed .theme-row{display:none!important}' +
      '@media(min-width:901px){.rot-embed .sidebar{width:64px!important}.rot-embed .nav-item{justify-content:center;padding:11px 0}.rot-embed .nav-item span.nav-label{display:none}.rot-embed .nav-item .nav-badge{position:absolute;top:4px;right:6px;margin-left:0}.rot-embed .sync-pill span.txt{display:none}}' +
      '.rot-embed body{background:transparent!important}.rot-embed .topbar{position:static}';
    document.head.appendChild(se);
  }

  P.ready.then(function () {
    if (!P.pagOk('roteiro')) return;
    /* botão "minha conta" no rodapé do menu */
    var tenta = setInterval(function () {
      var foot = document.querySelector('.sidebar-foot'); if (!foot) return;
      clearInterval(tenta);
      var b = document.createElement('button'); b.id = 'rotConta'; b.type = 'button'; b.title = 'Minha conta: trocar senha, testar acesso, sair';
      b.textContent = '👤 ' + (P.nome || 'Minha conta'); b.onclick = function () { P.minhaConta(); };
      foot.insertBefore(b, foot.firstChild);
    }, 400);
    /* administrador: trazer os dados do roteiro que estava no Claude */
    if (P.setor !== 'admin') return;
    Promise.all([P.fs.collection('rot_entregas').limit(1).get(), P.fs.collection('rot_coletas').limit(1).get()]).then(function (r) {
      var vazio = r[0].empty && r[1].empty;
      if (!vazio && !/importar/.test(location.hash)) return;
      var box = document.createElement('div'); box.id = 'rotImp';
      box.innerHTML = (vazio ? '<b>Roteiro vazio no Firebase</b>' : '<b>Importar roteiro</b>') + 'Para trazer as entregas e coletas que estavam no Claude, escolha o arquivo <i>roteiro-do-claude.json</i>.<br><input type="file" accept=".json,application/json" style="margin-top:8px;max-width:100%"><div class="msg" style="margin-top:6px"></div><button type="button">Agora não</button>';
      document.body.appendChild(box);
      box.querySelector('button').onclick = function () { box.remove(); };
      box.querySelector('input').onchange = function (ev) {
        var f = ev.target.files[0], msg = box.querySelector('.msg'); if (!f) return;
        f.text().then(function (t) {
          var j = JSON.parse(t), ops = [];
          ['rot_entregas', 'rot_coletas', 'rot_config'].forEach(function (c) { (j[c] || []).forEach(function (x) { if (x && x.id) { var o = Object.assign({}, x); delete o.id; ops.push([c, String(x.id), o]); } }); });
          if (!ops.length) throw new Error('vazio');
          msg.textContent = 'Importando ' + ops.length + ' registros…';
          var i = 0;
          function lote() { if (i >= ops.length) return Promise.resolve(); var b = P.fs.batch(), fim = Math.min(ops.length, i + 400); for (; i < fim; i++) b.set(P.fs.collection(ops[i][0]).doc(ops[i][1]), ops[i][2]); return b.commit().then(lote); }
          return lote().then(function () { msg.textContent = 'Pronto: ' + ops.length + ' registros importados.'; setTimeout(function () { box.remove(); }, 2500); });
        }).catch(function () { msg.textContent = 'Não foi possível importar. Confira se escolheu o arquivo roteiro-do-claude.json.'; });
      };
    }).catch(function () {});
  });
})();
