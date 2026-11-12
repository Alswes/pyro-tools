/* ============================================================
   Pyro Tools · ponte com o Firebase
   - Login (e-mail e senha) antes de abrir o painel
   - Setores: quais páginas cada um vê e se pode editar
   - Entrega ao Pyro o mesmo "window.claude.use('db')" que ele usava no Claude,
     agora apontando para o Firestore. Assim o resto do Pyro não muda.
   A proteção de verdade está em firestore.rules (no servidor).
   ============================================================ */
(function () {
  'use strict';
  var CFG = window.FIREBASE_CONFIG;
  var ADMIN = String(window.PYRO_ADMIN_EMAIL || '').trim().toLowerCase();

  /* ---------- setores e páginas (o administrador libera em Configurações > Páginas por setor) ---------- */
  var PAINEL = ['painel_pedidos', 'painel_obras', 'painel_importacoes', 'painel_meta'];
  var ANEX = ['anexos', 'anexos_partes'];
  var PAGINAS = [['home', 'Home'], ['hoje', 'Hoje do setor'], ['dir', 'Painel da Diretoria'], ['obras', 'Obras'], ['receb', 'Pedidos e Recebimento'], ['entregas', 'Entregas e Coletas'], ['nfs', 'Notas Fiscais'], ['relatorios', 'Relatórios'],
    ['pend', 'Pendências'], ['materiais', 'Material por obra'], ['garg', 'Gargalos'], ['div', 'Divergências'], ['forn', 'Fornecedores'], ['ocor', 'Ocorrências da obra'], ['roteiro', 'Roteiro de entregas (Logística)'], ['cot', 'Cotações'], ['aprov', 'Aprovações da Diretoria'], ['ind', 'Indicadores de compras'], ['avf', 'Avaliação de fornecedores'], ['erp', 'Pedidos do ERP']];
  var NOVAS = ['hoje', 'dir', 'pend', 'materiais', 'garg', 'div', 'forn', 'ocor', 'roteiro', 'cot', 'aprov', 'ind', 'avf', 'erp'];
  var VERSAO_CFG = 10; /* v10: lista 'cancela' (quem pode cancelar pedido de compra, conferida nas regras do banco); v8: quem registra chegada grava as não conformidades (ocorrencias) */
  window.PYRO_FB_VER = '0.16.1';
  var ROT = ['rot_entregas', 'rot_coletas', 'rot_config'];
  /* obras liberadas para os setores (Compras e o administrador veem todas) */
  var OBRAS_PADRAO = { ids: ['dm_o1', 'dm_o2'], nomes: ['Edifício Aurora', 'Residencial Parque Verde'] }; /* obras dos dados de exemplo */
  var CFG_OBRAS = JSON.parse(JSON.stringify(OBRAS_PADRAO));
  var NOMES_SETOR = { compras: 'Compras', almox: 'Recebimento / Logística', pcp: 'PCP', obras: 'Obras', projeto: 'Projeto', diretoria: 'Diretoria', consulta: 'Consulta' };
  /* começo: cada setor vê o que já existe no Pyro; o administrador libera o resto quando quiser */
  var PADRAO = {
    compras:   { home: 'ver', obras: 'ver', receb: 'ver', entregas: 'ver', nfs: 'ver', relatorios: 'ver', hoje: 'edita', dir: 'ver', pend: 'edita', materiais: 'ver', garg: 'ver', div: 'ver', forn: 'ver', ocor: 'ver', roteiro: 'ver', cot: 'edita', ind: 'ver', avf: 'ver', erp: 'ver' },
    almox:     { receb: 'ver', entregas: 'edita', hoje: 'edita', pend: 'edita', div: 'edita', garg: 'ver', ocor: 'ver', roteiro: 'edita' },
    pcp:       { receb: 'ver', hoje: 'edita', pend: 'edita', materiais: 'ver', garg: 'ver' },
    obras:     { receb: 'ver', entregas: 'ver', hoje: 'edita', pend: 'edita', materiais: 'ver', garg: 'ver', ocor: 'edita', roteiro: 'ver' },
    projeto:   { receb: 'ver', hoje: 'edita', pend: 'edita', materiais: 'ver', ocor: 'ver' },
    diretoria: { home: 'ver', obras: 'ver', receb: 'ver', dir: 'ver', forn: 'ver', ind: 'ver', aprov: 'edita', avf: 'ver' },
    consulta:  { receb: 'ver' }
  };
  var BASE = ['obras', 'fornecedores', 'colaboradores', 'pedidos', 'entregas', 'nfs', 'painel_pedidos'];
  var SETX = BASE.concat(['painel_obras', 'painel_meta', 'pendencias', 'ocorrencias']);
  var LER = { home: BASE, obras: BASE, relatorios: BASE, receb: PAINEL, entregas: BASE.concat(ANEX).concat(['ocorrencias', 'pendencias']), nfs: ['nfs', 'pedidos', 'obras', 'fornecedores', 'entregas'].concat(ANEX),
    hoje: SETX, dir: SETX, pend: SETX, materiais: SETX, garg: SETX, div: SETX, forn: SETX, ocor: SETX.concat(ANEX), roteiro: ROT.concat(ANEX), cot: SETX.concat(['cotacoes']), aprov: SETX.concat(['cotacoes']), ind: SETX, avf: SETX.concat(['cotacoes']), erp: ['erp_pedidos', 'nfs', 'pedidos', 'fornecedores', 'obras'] };
  var LER_EDITA = { receb: ['pedidos', 'entregas', 'nfs', 'obras', 'fornecedores', 'colaboradores'] }; /* quem edita o Recebimento sincroniza com os pedidos */
  var GRAVAR = { home: ['pedidos', 'entregas'], obras: ['pedidos', 'entregas'], relatorios: ['entregas'], receb: PAINEL.concat(['pedidos', 'entregas', 'nfs', 'ocorrencias', 'pendencias']),
    entregas: ['entregas', 'pedidos', 'nfs', 'painel_pedidos', 'ocorrencias', 'pendencias'].concat(ANEX), nfs: ['nfs', 'entregas'].concat(ANEX),
    hoje: ['pendencias'], pend: ['pendencias'], div: ['pendencias'], ocor: ['ocorrencias', 'pendencias'].concat(ANEX), roteiro: ROT.concat(ANEX), cot: ['cotacoes', 'pedidos', 'entregas'], aprov: ['cotacoes', 'pedidos', 'entregas'] };
  var AREA = { home: 'ped', obras: 'ped', receb: 'ped', entregas: 'ent', relatorios: 'ent', nfs: 'nf', hoje: 'set', pend: 'set', div: 'set', ocor: 'set', roteiro: 'rot', cot: 'cot' };
  function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }
  function calcular(pags) {
    var ler = {}, gravar = {}, cancela = [];
    Object.keys(NOMES_SETOR).forEach(function (k) {
      /* cancelar pedido de compra: quem edita Home, Obras ou Pedidos e Recebimento (o mesmo que edita pedidos na obra) */
      if (['home', 'obras', 'receb'].some(function (v) { return (pags[k] || {})[v] === 'edita'; })) cancela.push(k);
      var m = pags[k] || {}, L = [], G = [];
      PAGINAS.forEach(function (pg) {
        var v = m[pg[0]]; if (v !== 'ver' && v !== 'edita') return;
        L = L.concat(LER[pg[0]] || []);
        if (v === 'edita') { L = L.concat(LER_EDITA[pg[0]] || []).concat(GRAVAR[pg[0]] || []); G = G.concat(GRAVAR[pg[0]] || []); }
      });
      ler[k] = uniq(L); gravar[k] = uniq(G);
    });
    return { ler: ler, gravar: gravar, cancela: cancela };
  }
  var CFG_PAGS = JSON.parse(JSON.stringify(PADRAO));
  function modoReal(v) {
    if (P.setor === 'admin') return 'edita';
    if (v === 'obra') v = 'obras';
    if (v === 'config') return 'ver'; /* todos abrem Configurações > Aparência para trocar o tema */
    return (CFG_PAGS[P.setor] || {})[v] || 'oculta';
  }
  function modo(v) {
    if (v === 'entregas' && modoReal('entregas') === 'oculta' && modoReal('roteiro') !== 'oculta') return 'ver';
    if (P.setor === 'admin') return 'edita';
    if (v === 'obra') v = 'obras';
    if (v === 'config') return 'ver';
    return (CFG_PAGS[P.setor] || {})[v] || 'oculta';
  }
  function descSetor(k) {
    var m = CFG_PAGS[k] || {}, ed = [], ve = [];
    PAGINAS.forEach(function (pg) { if (m[pg[0]] === 'edita') ed.push(pg[1]); else if (m[pg[0]] === 'ver') ve.push(pg[1]); });
    return (ed.length ? 'Edita: ' + ed.join(', ') + '. ' : '') + (ve.length ? 'Só vê: ' + ve.join(', ') + '.' : '') || 'Nenhuma página liberada.';
  }
  function montarSetores() {
    var o = { admin: { nome: 'Administrador', desc: 'Tudo, incluindo usuários, páginas por setor e backup.', escreve: true } };
    Object.keys(NOMES_SETOR).forEach(function (k) {
      var m = CFG_PAGS[k] || {};
      o[k] = { nome: NOMES_SETOR[k], desc: descSetor(k), escreve: Object.keys(m).some(function (p) { return m[p] === 'edita'; }) };
    });
    return o;
  }
  var SETORES = montarSetores();

  /* ---------- estilo da tela de login ---------- */
  var css = '' +
    '#fbGate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;' +
    'background:radial-gradient(1200px 600px at 50% -10%,#8E0E17 0%,#3A0609 45%,#120708 100%);font-family:Figtree,system-ui,sans-serif;color:#F4E2B8}' +
    '#fbGate[hidden]{display:none!important}' +
    '#fbGate .box{width:min(380px,100%);background:#F7EEDC;color:#2A1A10;border-radius:18px;padding:28px 26px 22px;box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 0 0 1px rgba(201,161,90,.55)}' +
    '#fbGate h1{font-family:Cinzel,Georgia,serif;font-size:26px;letter-spacing:.04em;margin:0 0 2px;color:#6E0B10}' +
    '#fbGate .sub{margin:0 0 18px;font-size:13px;color:#7A5A3A}' +
    '#fbGate label{display:block;font-size:12px;font-weight:600;margin:12px 0 5px;color:#5A3A22}' +
    '#fbGate input{width:100%;box-sizing:border-box;font:inherit;font-size:15px;padding:10px 12px;border-radius:10px;border:1px solid #D9C29A;background:#FFFBF2;color:#2A1A10}' +
    '#fbGate input:focus{outline:2px solid #B3121B;outline-offset:1px}' +
    '#fbGate .pri{margin-top:18px;width:100%;font:inherit;font-weight:700;font-size:15px;padding:11px;border:0;border-radius:10px;cursor:pointer;color:#FFF3DA;background:linear-gradient(180deg,#B3121B,#7A0A10);box-shadow:inset 0 0 0 1px #C9A15A}' +
    '#fbGate .pri[disabled]{opacity:.6;cursor:wait}' +
    '#fbGate .lnk{background:none;border:0;padding:0;margin-top:12px;font:inherit;font-size:13px;color:#8E0E17;text-decoration:underline;cursor:pointer}' +
    '#fbGate .msg{min-height:18px;margin-top:10px;font-size:13px;color:#8E0E17}' +
    '#fbGate .msg.ok{color:#2E6B2E}' +
    '#fbGate .foot{margin-top:16px;font-size:11px;color:#9A7A5A;text-align:center}' +
    '.fbuser{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:600;padding:6px 10px;border-radius:999px;border:1px solid var(--line,#ddd);background:var(--surface,#fff);color:inherit;cursor:pointer;max-width:240px}' +
    '.fbuser span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '#fbConta{position:fixed;inset:0;z-index:9998;display:grid;place-items:center;background:rgba(20,8,8,.55);padding:16px;font-family:Figtree,system-ui,sans-serif}' +
    '#fbConta .box{width:min(460px,100%);max-height:90vh;overflow:auto;background:#F7EEDC;color:#2A1A10;border-radius:16px;padding:22px;box-shadow:0 24px 60px rgba(0,0,0,.4)}' +
    '#fbConta h2{font-family:Cinzel,Georgia,serif;margin:0 0 4px;color:#6E0B10;font-size:20px}' +
    '#fbConta table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}' +
    '#fbConta td{padding:5px 4px;border-bottom:1px solid #E6D6B8}' +
    '#fbConta .ok{color:#2E6B2E;font-weight:700}#fbConta .no{color:#8E0E17;font-weight:700}' +
    '#fbConta .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}' +
    '#fbConta button{font:inherit;font-size:13px;font-weight:600;padding:8px 12px;border-radius:9px;border:1px solid #D9C29A;background:#FFFBF2;color:#2A1A10;cursor:pointer}' +
    '#fbConta button.pri{background:linear-gradient(180deg,#B3121B,#7A0A10);color:#FFF3DA;border-color:#C9A15A}' +
    '#fbConta input{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border-radius:9px;border:1px solid #D9C29A;background:#FFFBF2;margin-top:6px}';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- sem configuração: avisa e para ---------- */
  var semConfig = !CFG || !CFG.apiKey || /COLE_AQUI/.test(CFG.apiKey) || typeof firebase === 'undefined';

  var resolveReady;
  var ready = new Promise(function (r) { resolveReady = r; });
  var P = window.PYRO_FB = {
    SETORES: SETORES, PAGINAS: PAGINAS, NOMES_SETOR: NOMES_SETOR, ready: ready, setor: '', nome: '', email: '', uid: '',
    modo: modo, modoReal: modoReal,
    pags: function () { return CFG_PAGS; },
    pagOk: function (v) { return modo(v) !== 'oculta'; },
    primeiraPag: function () { var p = PAGINAS.filter(function (x) { return x[0] !== 'roteiro' && modo(x[0]) !== 'oculta'; })[0]; return p ? p[0] : 'receb'; },
    colOk: function (c) { if (P.setor === 'admin') return true; return (calcular(CFG_PAGS).ler[P.setor] || []).indexOf(c) >= 0; },
    podeCancelar: function () { return P.setor === 'admin' || calcular(CFG_PAGS).cancela.indexOf(P.setor) >= 0; },
    restrito: function () { return P.setor !== 'admin' && P.setor !== 'compras'; },
    obrasLib: function () { return CFG_OBRAS; },
    escreve: function () { return P.setor === 'admin' || PAGINAS.some(function (x) { return modo(x[0]) === 'edita'; }); },
    areas: function () { if (P.setor === 'admin') return ['ped', 'ent', 'nf', 'cfg']; return uniq(PAGINAS.filter(function (x) { return modo(x[0]) === 'edita'; }).map(function (x) { return AREA[x[0]]; })); },
    recEdita: function () { return modo('receb') === 'edita'; },
    soRec: function () { var v = PAGINAS.filter(function (x) { return x[0] !== 'roteiro' && modo(x[0]) !== 'oculta'; }); return P.setor !== 'admin' && v.length === 1 && v[0][0] === 'receb'; },
    semPaginas: function () { return P.setor !== 'admin' && !PAGINAS.some(function (x) { return modo(x[0]) !== 'oculta'; }); }
  };

  function montarGate() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var g = el('<div id="fbGate" role="dialog" aria-modal="true" aria-label="Entrar no Pyro Tools"><div class="box">' +
      '<h1>Pyro Tools</h1><p class="sub">Follow-up de compras · Empresa Exemplo</p>' +
      '<form id="fbForm" novalidate>' +
      '<label for="fbEmail">E-mail</label><input id="fbEmail" type="email" autocomplete="username" required>' +
      '<label for="fbSenha">Senha</label><input id="fbSenha" type="password" autocomplete="current-password" required>' +
      '<button class="pri" id="fbEntrar" type="submit">Entrar</button>' +
      '</form>' +
      '<button class="lnk" id="fbEsqueci" type="button">Esqueci minha senha</button>' +
      '<div class="msg" id="fbMsg" role="status" aria-live="polite"></div>' +
      '<div class="foot">Acesso liberado pelo administrador. Desenvolvido por Wallety_IT</div>' +
      '</div></div>');
    (document.body || document.documentElement).appendChild(g);
    return g;
  }

  function msg(t, ok) { var m = document.getElementById('fbMsg'); if (m) { m.textContent = t || ''; m.className = 'msg' + (ok ? ' ok' : ''); } }
  function erroAuth(e) {
    var c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'E-mail ou senha incorretos.';
    if (/too-many-requests/.test(c)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    if (/invalid-email/.test(c)) return 'E-mail inválido.';
    if (/network/.test(c)) return 'Sem conexão com a internet.';
    if (/email-already-in-use/.test(c)) return 'Esse e-mail já tem conta.';
    if (/weak-password/.test(c)) return 'Senha fraca: use pelo menos 6 caracteres.';
    if (/requires-recent-login/.test(c)) return 'Por segurança, saia e entre de novo antes de trocar a senha.';
    return 'Não foi possível concluir (' + (c || 'erro') + ').';
  }

  function iniciar() {
    var gate = montarGate();
    if (semConfig) {
      msg('Firebase ainda não configurado: preencha o arquivo firebase-config.js (veja o LEIA-ME).');
      document.getElementById('fbEntrar').disabled = true;
      return;
    }
    var app = firebase.initializeApp(CFG);
    var auth = firebase.auth(); auth.languageCode = 'pt-BR';
    var fs = firebase.firestore();
    /* experimentalAutoDetectLongPolling: em redes de empresa com proxy/antivírus que seguram a conexão ao vivo, o Firestore troca sozinho para um modo compatível e as atualizações continuam chegando sem F5 */
    try { fs.settings({ ignoreUndefinedProperties: true, merge: true, experimentalAutoDetectLongPolling: true }); } catch (e) { try { fs.settings({ ignoreUndefinedProperties: true, merge: true }); } catch (e2) {} }
    /* guarda os dados no navegador: ao abrir de novo, mostra na hora e baixa só o que mudou */
    try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
    P.auth = auth; P.fs = fs; P.app = app;

    document.getElementById('fbForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var em = document.getElementById('fbEmail').value.trim(), se = document.getElementById('fbSenha').value;
      if (!em || !se) { msg('Preencha e-mail e senha.'); return; }
      var b = document.getElementById('fbEntrar'); b.disabled = true; msg('Entrando…', true);
      auth.signInWithEmailAndPassword(em, se).catch(function (e) { msg(erroAuth(e)); b.disabled = false; });
    });
    document.getElementById('fbEsqueci').addEventListener('click', function () {
      var em = document.getElementById('fbEmail').value.trim();
      if (!em) { msg('Digite seu e-mail acima e clique de novo em "Esqueci minha senha".'); return; }
      auth.sendPasswordResetEmail(em).then(function () { msg('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.', true); })
        .catch(function (e) { msg(erroAuth(e)); });
    });

    var jaEntrou = false;
    auth.onAuthStateChanged(function (u) {
      if (!u) {
        if (jaEntrou) { location.reload(); return; }
        gate.hidden = false; document.getElementById('fbEntrar').disabled = false; return;
      }
      var email = String(u.email || '').toLowerCase();
      fs.collection('usuarios').doc(u.uid).get().then(function (d) {
        var p = d.exists ? d.data() : null;
        if (ADMIN && email === ADMIN) { P.setor = 'admin'; P.nome = (p && p.nome) || 'Administrador'; }
        else if (p && p.ativo === true && NOMES_SETOR[p.setor]) { P.setor = p.setor; P.nome = p.nome || email; }
        else { semAcesso(email); return; }
        P.email = email; P.uid = u.uid; jaEntrou = true;
        return fs.collection('config').doc('acesso').get().then(function (c) {
          var cfg = c.exists ? c.data() : null;
          if (cfg && cfg.paginas) CFG_PAGS = cfg.paginas;
          if (cfg && cfg.obrasLib) CFG_OBRAS = { ids: cfg.obrasLib, nomes: cfg.obrasLibNomes || [] };
          var atualizar = !cfg || !cfg.obrasLib || (cfg.versao || 0) < VERSAO_CFG;
          if (atualizar && cfg && (cfg.versao || 0) < 9) { /* v9: Avaliação de fornecedores para Compras e Diretoria */
            ['compras', 'diretoria'].forEach(function (k) { CFG_PAGS[k] = CFG_PAGS[k] || {}; if (!CFG_PAGS[k].avf || CFG_PAGS[k].avf === 'oculta') CFG_PAGS[k].avf = 'ver'; }); }
          if (atualizar && cfg && (cfg.versao || 0) < 7) { /* v7: a Diretoria aprova ou reprova as cotações (página Aprovações da Diretoria) */
            CFG_PAGS.diretoria = CFG_PAGS.diretoria || {}; if (!CFG_PAGS.diretoria.aprov || CFG_PAGS.diretoria.aprov === 'oculta') CFG_PAGS.diretoria.aprov = 'edita'; }
          if (atualizar && cfg && (cfg.versao || 0) < 6) { /* v6: Compras edita o Hoje do setor e consulta os Pedidos do ERP; Diretoria vê os Indicadores de compras */
            Object.keys(NOMES_SETOR).forEach(function (k) { CFG_PAGS[k] = CFG_PAGS[k] || {}; if (!CFG_PAGS[k].receb || CFG_PAGS[k].receb === 'oculta') CFG_PAGS[k].receb = 'ver'; });
            CFG_PAGS.compras = CFG_PAGS.compras || {}; CFG_PAGS.compras.hoje = 'edita'; CFG_PAGS.compras.pend = 'edita'; if (!CFG_PAGS.compras.erp) CFG_PAGS.compras.erp = 'ver';
            CFG_PAGS.diretoria = CFG_PAGS.diretoria || {}; if (!CFG_PAGS.diretoria.ind) CFG_PAGS.diretoria.ind = 'ver'; }
          if (atualizar && cfg && (cfg.versao || 0) < 5) { /* v5: todos consultam Pedidos e Recebimento; Compras só consulta e faz cotações */
            Object.keys(NOMES_SETOR).forEach(function (k) { CFG_PAGS[k] = CFG_PAGS[k] || {}; if (!CFG_PAGS[k].receb || CFG_PAGS[k].receb === 'oculta') CFG_PAGS[k].receb = 'ver'; });
            CFG_PAGS.compras = JSON.parse(JSON.stringify(PADRAO.compras)); }
          if (atualizar && cfg && (cfg.versao || 0) < 4) CFG_PAGS.diretoria = JSON.parse(JSON.stringify(PADRAO.diretoria)); /* v4: Diretoria só com Home, Obras, Pedidos e Recebimento, Fornecedores e Painel da Diretoria */
          if (atualizar) Object.keys(PADRAO).forEach(function (k) { CFG_PAGS[k] = CFG_PAGS[k] || {}; NOVAS.forEach(function (p) { if (!(p in CFG_PAGS[k]) && PADRAO[k][p]) CFG_PAGS[k][p] = PADRAO[k][p]; }); });
          if (atualizar && P.setor === 'admin') return P.salvarAcessos(CFG_PAGS, CFG_OBRAS);
        }).catch(function () {}).then(function () {
          SETORES = P.SETORES = montarSetores();
          if (P.semPaginas()) { semAcesso(email, 'O setor ' + (NOMES_SETOR[P.setor] || P.setor) + ' ainda não tem nenhuma página liberada. Fale com o administrador.'); return; }
          var soRoteiro = P.setor !== 'admin' && PAGINAS.every(function (x) { return x[0] === 'roteiro' ? modo(x[0]) !== 'oculta' : modo(x[0]) === 'oculta'; });
          if (soRoteiro && window.PYRO_PAGINA !== 'roteiro') { location.replace('entregas.html'); return; }
          gate.hidden = true;
          /* tira o formulário de login da página: assim o navegador não preenche o e-mail nos campos de busca */
          var fm = document.getElementById('fbForm'); if (fm) fm.remove();
          GESTO = 0; resolveReady();
          try { var kl = 'pyro_login_' + P.uid; if (!sessionStorage.getItem(kl)) { sessionStorage.setItem(kl, '1'); var ua = navigator.userAgent, nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador', so = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : ''; P.audit({ acao: 'login', col: '', docId: '', rotulo: nav + (so ? ' · ' + so : ''), celular: /Mobi|Android|iPhone/.test(ua) }); } } catch (e) {}
          /* o administrador mudou as páginas: avisa para atualizar */
          var primeira = true;
          fs.collection('config').doc('acesso').onSnapshot(function (d2) {
            if (primeira) { primeira = false; return; }
            if (P.setor !== 'admin') aviso('O administrador mudou as páginas liberadas para o seu setor.');
          }, function () {});
        });
      }).catch(function () { semAcesso(email); });
    });
    function semAcesso(email, txt) {
      gate.hidden = false;
      document.getElementById('fbForm').style.display = 'none';
      document.getElementById('fbEsqueci').textContent = 'Sair e entrar com outro e-mail';
      document.getElementById('fbEsqueci').onclick = function () { auth.signOut().then(function () { location.reload(); }); };
      msg(txt || ('O usuário ' + email + ' ainda não tem acesso liberado. Fale com o administrador.'));
    }
  }

  /* ---------- o que o Pyro enxerga como "window.claude" ---------- */
  var dl = {
    save: function (o) {
      return new Promise(function (res) {
        var data = o.data, blob = (data instanceof Blob) ? data : new Blob([data], { type: /\.json$/i.test(o.filename) ? 'application/json' : 'application/octet-stream' });
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = o.filename || 'arquivo'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 30000); res(true);
      });
    }
  };
  var userApi = {
    can: function (n) { return Promise.resolve(n === 'data.write' ? P.escreve() : null); },
    canEdit: function () { return Promise.resolve(P.setor === 'admin'); },
    isOwner: function () { return P.setor === 'admin'; },
    id: function () { return Promise.resolve(P.uid); },
    me: function () { return Promise.resolve({ id: P.uid, name: P.nome }); },
    profiles: function () { return Promise.resolve({}); }
  };
  /* setores (menos Compras) só recebem do servidor as obras liberadas */
  function filtroObra(n) {
    if (!P.restrito()) return null;
    if (['pedidos', 'entregas', 'nfs', 'pendencias', 'ocorrencias'].indexOf(n) >= 0) return { campo: 'obraId', vals: CFG_OBRAS.ids };
    if (n === 'painel_pedidos') return { campo: 'obra', vals: CFG_OBRAS.nomes };
    if (n === 'painel_obras') return { campo: 'nome', vals: CFG_OBRAS.nomes };
    if (n === 'obras') return { campo: '__id__', vals: CFG_OBRAS.ids };
    if (n === 'painel_importacoes') return { campo: '', vals: [] };
    return null;
  }
  function juntar(snaps) {
    var m = {}; snaps.forEach(function (s) { s.docs.forEach(function (d) { m[d.id] = d; }); });
    var docs = Object.keys(m).map(function (k) { return m[k]; });
    return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); } };
  }
  function colFiltrada(n, f) {
    var base = P.fs.collection(n);
    function qs() { return f.campo ? f.vals.map(function (v) { return f.campo === '__id__' ? base.where(firebase.firestore.FieldPath.documentId(), '==', v) : base.where(f.campo, '==', v); }) : []; }
    return {
      doc: function (id) { return base.doc(id); },
      get: function () { return Promise.all(qs().map(function (q) { return q.get(); })).then(juntar); },
      onSnapshot: function (next, err) {
        var partes = qs(), res = new Array(partes.length);
        if (!partes.length) { setTimeout(function () { next(juntar([])); }, 0); return function () {}; }
        var un = partes.map(function (q, i) { return q.onSnapshot(function (s) { res[i] = s; if (res.every(Boolean)) next(juntar(res)); }, err); });
        return function () { un.forEach(function (u) { u(); }); };
      }
    };
  }
  /* ---------- auditoria: toda gravação feita pelo Pyro vira um registro (quem, quando, antes e depois) ---------- */
  var AUD_SKIP = { auditoria: 1, chat: 1, presenca: 1, anexos_partes: 1 };
  var AUD_IGN = { updatedAt: 1, atualizadoEm: 1, atualizadoPor: 1, importadoEm: 1 };
  var AUD_FILA = [], AUD_T = null;
  function audVal(v) { if (v === undefined) return '__ausente__'; var j; try { j = JSON.stringify(v); } catch (e) { return '__erro__'; } return j && j.length > 1500 ? { __trunc: true, previa: j.slice(0, 300) } : v; }
  function audDiff(antes, depois) {
    var a = {}, d = {}, n = 0, ks = {}; Object.keys(antes || {}).forEach(function (k) { ks[k] = 1; }); Object.keys(depois || {}).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) { if (AUD_IGN[k] || k === 'id') return; var x = antes ? antes[k] : undefined, y = depois ? depois[k] : undefined; if (JSON.stringify(x) === JSON.stringify(y)) return; a[k] = audVal(x); d[k] = audVal(y); n++; });
    return n ? { antes: a, depois: d } : null;
  }
  function audRot(o) { o = o || {}; return String(o.item || o.titulo || o.descricao || (o.numero ? 'NF ' + o.numero : '') || o.nome || o.desc || o.pc || '').slice(0, 120); }
  /* gravação sem clique ou tecla nos últimos 30 s = feita pelo próprio Pyro (sincronização), não pela pessoa */
  var GESTO = 0; P.gesto = function () { GESTO = Date.now(); };
  ['pointerdown', 'keydown'].forEach(function (t) { addEventListener(t, P.gesto, true); });
  P.audit = function (e) {
    if (!P.uid || !P.fs) return;
    if (e.acao !== 'login' && Date.now() - GESTO > 30000) e.auto = true;
    AUD_FILA.push(Object.assign({ id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), em: Date.now(), uid: P.uid, email: P.email, nome: P.nome, setor: P.setor, pag: (window.UI && window.UI.view) || window.PYRO_PAGINA || '' }, e));
    clearTimeout(AUD_T); AUD_T = setTimeout(audFlush, 1200);
  };
  function audFlush() {
    var f = AUD_FILA; AUD_FILA = []; if (!f.length) return;
    /* importação ou ação em massa: mais de 40 gravações na mesma coleção viram um registro só */
    var por = {}; f.forEach(function (e) { var k = e.acao === 'login' ? e.id : e.col + '|' + e.acao; (por[k] = por[k] || []).push(e); });
    var out = [];
    Object.keys(por).forEach(function (k) { var g = por[k]; if (g.length <= 40) { out = out.concat(g); return; }
      out.push(Object.assign({}, g[0], { massa: true, qtd: g.length, ids: g.slice(0, 60).map(function (x) { return x.docId; }), rotulo: g.length + ' registros', antes: null, depois: null, docId: '' })); });
    for (var i = 0; i < out.length; i += 400) { var b = P.fs.batch(); out.slice(i, i + 400).forEach(function (e) { b.set(P.fs.collection('auditoria').doc(e.id), JSON.parse(JSON.stringify(e))); }); b.commit().catch(function (er) { console.warn('[pyro] auditoria', er && er.code); }); }
  }
  addEventListener('pagehide', function () { try { audFlush(); } catch (e) {} });
  function antesDe(ref) {
    return ref.get({ source: 'cache' }).catch(function () { return ref.get(); }).then(function (d) { return d && d.exists ? d.data() : null; }).catch(function () { return null; });
  }
  function audDoc(n, ref) {
    if (AUD_SKIP[n]) return ref;
    var w = Object.create(ref);
    w.set = function (dados, op) { return antesDe(ref).then(function (old) { return ref.set(dados, op).then(function (r) { var novo = op && op.merge ? Object.assign({}, old || {}, dados) : dados; var df = audDiff(old, novo); if (df) P.audit({ acao: old ? 'alterou' : 'criou', col: n, docId: ref.id, rotulo: audRot(novo), obra: novo.obraId || novo.obra || '', antes: old ? df.antes : null, depois: df.depois }); return r; }); }); };
    w.update = function (dados) { return w.set(dados, { merge: true }); };
    w['delete'] = function () { return antesDe(ref).then(function (old) { return ref['delete']().then(function (r) { if (old) P.audit({ acao: 'excluiu', col: n, docId: ref.id, rotulo: audRot(old), obra: old.obraId || old.obra || '', antes: JSON.parse(JSON.stringify(old, function (k, v) { return v; })), depois: null }); return r; }); }); };
    return w;
  }
  /* itens de pedidos cancelados não aparecem em Pedidos e Recebimento (nem nas contas de material) */
  function semCancelados(snap) {
    var docs = snap.docs.filter(function (d) { try { return !d.data().cancelado; } catch (e) { return true; } });
    return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (f) { docs.forEach(f); }, metadata: snap.metadata };
  }
  function audCol(n, c) {
    if (AUD_SKIP[n]) return c; var w = Object.create(c); w.doc = function (id) { return audDoc(n, c.doc(id)); };
    if (n === 'painel_pedidos') {
      w.get = function () { return c.get.apply(c, arguments).then(semCancelados); };
      w.onSnapshot = function (a, b, d) { if (typeof a !== 'function') return c.onSnapshot(a, function (s) { return b(semCancelados(s)); }, d); return c.onSnapshot(function (s) { return a(semCancelados(s)); }, b); };
    }
    return w;
  }
  var dbApi = {
    collection: function (n) { var f = filtroObra(n); return audCol(n, f ? colFiltrada(n, f) : P.fs.collection(n)); },
    doc: function (p) { var a = String(p).split('/'); return audDoc(a[0], P.fs.doc(p)); }
  };
  P.db = dbApi;
  window.claude = {
    use: function (name) {
      return ready.then(function () { return name === 'db' ? dbApi : name === 'user' ? userApi : name === 'downloads' ? dl : (name === 'assets' && P.escreve()) ? assets : null; });
    }
  };

  /* ---------- administração de usuários (só o administrador) ---------- */
  P.criarUsuario = function (o) {
    var email = String(o.email || '').trim().toLowerCase();
    var sec = (firebase.apps.filter(function (a) { return a.name === 'cadastro'; })[0]) || firebase.initializeApp(CFG, 'cadastro');
    return sec.auth().createUserWithEmailAndPassword(email, o.senha).then(function (cred) {
      var uid = cred.user.uid;
      return sec.auth().signOut().then(function () {
        return P.fs.collection('usuarios').doc(uid).set({ nome: o.nome, email: email, setor: o.setor, ativo: true, criadoEm: Date.now(), criadoPor: P.email });
      }).then(function () { return uid; });
    }).catch(function (e) { throw new Error(erroAuth(e)); });
  };
  P.atualizarUsuario = function (uid, campos) { return P.fs.collection('usuarios').doc(uid).set(campos, { merge: true }); };
  P.redefinirSenha = function (email) { return P.auth.sendPasswordResetEmail(email); };
  P.ouvirUsuarios = function (cb) { return P.fs.collection('usuarios').onSnapshot(function (s) { cb(s.docs.map(function (d) { var x = d.data(); x.uid = d.id; return x; })); }, function () { cb([]); }); };
  P.salvarAcessos = function (pags, obras) {
    var c = calcular(pags); obras = obras || CFG_OBRAS;
    return P.fs.collection('config').doc('acesso').set({ versao: VERSAO_CFG, paginas: pags, ler: c.ler, gravar: c.gravar, cancela: c.cancela, obrasLib: uniq(obras.ids), obrasLibNomes: uniq(obras.nomes), atualizadoEm: Date.now(), por: P.email })
      .then(function () { CFG_PAGS = JSON.parse(JSON.stringify(pags)); CFG_OBRAS = { ids: uniq(obras.ids), nomes: uniq(obras.nomes) }; SETORES = P.SETORES = montarSetores(); });
  };
  /* lista pública de pessoas (nome e setor) para escolher o responsável das pendências */
  P.salvarEquipe = function (lista) {
    var pessoas = lista.filter(function (u) { return u.ativo; }).map(function (u) { return { nome: u.nome || u.email, setor: u.setor, email: u.email || '' }; });
    pessoas.push({ nome: P.nome, setor: 'admin', email: P.email });
    return P.fs.collection('config').doc('equipe').set({ pessoas: pessoas, atualizadoEm: Date.now() });
  };
  P.ouvirEquipe = function (cb) { return P.fs.collection('config').doc('equipe').onSnapshot(function (d) { cb(d.exists ? (d.data().pessoas || []) : []); }, function () { cb([]); }); };
  /* entregas antigas sem obra: grava a obra do pedido (necessário para liberar por obra) */
  P.prepararEntregas = function (entregas, pedidos) {
    var mapa = {}; pedidos.forEach(function (p) { mapa[p.id] = p.obraId; });
    var falt = entregas.filter(function (e) { return !e.obraId && mapa[e.pedidoId]; });
    var i = 0;
    function lote() { if (i >= falt.length) return Promise.resolve(falt.length); var b = P.fs.batch(), fim = Math.min(falt.length, i + 400);
      for (; i < fim; i++) b.set(P.fs.collection('entregas').doc(String(falt[i].id)), { obraId: mapa[falt[i].pedidoId] }, { merge: true });
      return b.commit().then(lote); }
    return lote();
  };
  P.PADRAO = PADRAO;

  /* ---------- anexos (foto da nota, romaneio, PDF) guardados no próprio banco, em partes ---------- */
  var PARTE = 700000;
  function lerArquivo(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(f); }); }
  function reduzirImagem(f) {
    return new Promise(function (res) {
      if (!/^image\//.test(f.type) || f.size < 500000) { res(f); return; }
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var M = 1800, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, M / Math.max(w, h));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
        cv.toBlob(function (b) { res(b ? new File([b], f.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : f); }, 'image/jpeg', 0.78);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(f); };
      img.src = url;
    });
  }
  var assets = {
    upload: function (file) {
      if (file.size > 12 * 1024 * 1024) return Promise.reject({ code: 'too_large' });
      return reduzirImagem(file).then(function (f) {
        return lerArquivo(f).then(function (b64) {
          var id = 'ax' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), n = Math.ceil(b64.length / PARTE) || 1, b = P.fs.batch();
          b.set(P.fs.collection('anexos').doc(id), { nome: file.name, tipo: f.type || 'application/octet-stream', tamanho: f.size, partes: n, criadoEm: Date.now(), por: P.email });
          for (var k = 0; k < n; k++) b.set(P.fs.collection('anexos_partes').doc(id + '_' + k), { a: id, k: k, d: b64.slice(k * PARTE, (k + 1) * PARTE) });
          return b.commit().then(function () { return { id: id, url: '#', sizeBytes: f.size, contentType: f.type }; });
        });
      });
    }
  };
  P.abrirAnexo = function (id) {
    var w = null;
    return P.fs.collection('anexos').doc(id).get().then(function (m) {
      if (!m.exists) throw new Error('nao');
      var meta = m.data(), ps = [];
      for (var k = 0; k < (meta.partes || 1); k++) ps.push(P.fs.collection('anexos_partes').doc(id + '_' + k).get());
      return Promise.all(ps).then(function (docs) {
        var b64 = docs.map(function (d) { return d.exists ? d.data().d : ''; }).join(''), bin = atob(b64), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        var url = URL.createObjectURL(new Blob([u8], { type: meta.tipo }));
        var a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      });
    }).catch(function () { aviso('Este anexo está guardado no Pyro antigo (Claude) e não abre aqui.'); });
  };
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('[data-fbanexo]');
    if (a) { ev.preventDefault(); P.abrirAnexo(a.getAttribute('data-fbanexo')); return; }
    var b = ev.target.closest && ev.target.closest('a[href^="/_blob/"]');
    if (b) { ev.preventDefault(); P.abrirAnexo(b.getAttribute('href').slice(7)); }
  });
  function aviso(t) {
    var old = document.getElementById('fbAviso'); if (old) old.remove();
    var b = el('<div id="fbAviso" role="status" style="position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:9997;display:flex;gap:12px;align-items:center;background:#2A0A0D;color:#F4E2B8;padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:600 13.5px Figtree,system-ui,sans-serif;max-width:calc(100% - 32px)"><span>' + esc(t) + '</span><button type="button" style="font:inherit;border:0;border-radius:9px;padding:6px 10px;cursor:pointer;background:#9E0F17;color:#FFF3DA">Atualizar</button><button type="button" aria-label="Fechar" style="font:inherit;border:0;background:none;color:#F4E2B8;cursor:pointer">✕</button></div>');
    var bt = b.querySelectorAll('button'); bt[0].onclick = function () { location.reload(); }; bt[1].onclick = function () { b.remove(); };
    if (/Pyro antigo/.test(t)) bt[0].remove();
    document.body.appendChild(b);
  }

  P.sair = function () { return P.auth.signOut().then(function () { location.reload(); }); };

  /* importa um backup do Pyro em lotes (bem mais rápido que um por um) */
  P.importar = function (dados, cols, modo, atuais, progresso) {
    var ops = [];
    cols.forEach(function (k) {
      var arr = Array.isArray(dados[k]) ? dados[k].filter(function (x) { return x && x.id; }) : [];
      arr.forEach(function (x) { ops.push({ t: 'set', c: k, id: String(x.id), d: JSON.parse(JSON.stringify(x)) }); });
      if (modo === 'replace' && Array.isArray(dados[k])) {
        var keep = {}; arr.forEach(function (x) { keep[x.id] = 1; });
        (atuais[k] || []).forEach(function (x) { if (!keep[x.id]) ops.push({ t: 'del', c: k, id: String(x.id) }); });
      }
    });
    var i = 0, LOTE = 400;
    function proximo() {
      if (i >= ops.length) return Promise.resolve(ops.length);
      var b = P.fs.batch(), fim = Math.min(ops.length, i + LOTE);
      for (; i < fim; i++) { var o = ops[i], ref = P.fs.collection(o.c).doc(o.id); if (o.t === 'set') b.set(ref, o.d); else b.delete(ref); }
      return b.commit().then(function () { if (progresso) progresso(i, ops.length); return proximo(); });
    }
    return proximo();
  };

  /* ---------- minha conta: trocar senha e testar acesso ---------- */
  P.minhaConta = function () {
    var s = SETORES[P.setor] || {};
    var old = document.getElementById('fbConta'); if (old) old.remove();
    var pags = P.setor === 'admin' ? 'Todas, mais Configurações' : PAGINAS.filter(function (x) { return modo(x[0]) !== 'oculta'; }).map(function (x) { return x[1] + (modo(x[0]) === 'ver' ? ' (só vê)' : ' (edita)'); }).join(', ');
    var box = el('<div id="fbConta" role="dialog" aria-modal="true" aria-label="Minha conta"><div class="box">' +
      '<h2>Minha conta</h2><div style="font-size:13px">' + esc(P.nome) + ' · ' + esc(P.email) + '</div>' +
      '<div style="font-size:13px;margin-top:6px"><b>Setor:</b> ' + esc(s.nome || P.setor) + (s.escreve ? '' : ' · somente leitura') + '</div>' +
      '<div style="font-size:13px;margin-top:4px"><b>Páginas:</b> ' + esc(pags) + '</div>' +
      '<div style="margin-top:16px;font-weight:700;font-size:13px">Trocar senha</div>' +
      '<input id="fbS0" type="password" placeholder="Senha atual" autocomplete="current-password">' +
      '<input id="fbS1" type="password" placeholder="Nova senha (mínimo 6 caracteres)" autocomplete="new-password">' +
      '<div class="row"><button class="pri" id="fbTrocar" type="button">Salvar nova senha</button><button id="fbTeste" type="button">Testar meu acesso</button><button id="fbSair" type="button">Sair</button><button id="fbFechar" type="button">Fechar</button></div>' +
      '<div id="fbContaMsg" style="font-size:13px;margin-top:10px;color:#8E0E17" role="status"></div><div id="fbTesteRes"></div>' +
      '</div></div>');
    document.body.appendChild(box);
    var m = function (t, ok) { var x = document.getElementById('fbContaMsg'); x.textContent = t; x.style.color = ok ? '#2E6B2E' : '#8E0E17'; };
    box.addEventListener('click', function (e) { if (e.target === box) box.remove(); });
    document.getElementById('fbFechar').onclick = function () { box.remove(); };
    document.getElementById('fbSair').onclick = function () { P.sair(); };
    document.getElementById('fbTrocar').onclick = function () {
      var a = document.getElementById('fbS0').value, n = document.getElementById('fbS1').value;
      if (!a || !n) { m('Preencha a senha atual e a nova.'); return; }
      if (n.length < 6) { m('A nova senha precisa ter pelo menos 6 caracteres.'); return; }
      var u = P.auth.currentUser, cred = firebase.auth.EmailAuthProvider.credential(u.email, a);
      u.reauthenticateWithCredential(cred).then(function () { return u.updatePassword(n); })
        .then(function () { m('Senha alterada.', true); document.getElementById('fbS0').value = document.getElementById('fbS1').value = ''; })
        .catch(function (e) { m(erroAuth(e)); });
    };
    document.getElementById('fbTeste').onclick = function () {
      var cols = ['painel_pedidos', 'painel_obras', 'pedidos', 'entregas', 'nfs', 'obras', 'fornecedores', 'colaboradores', 'pendencias', 'ocorrencias', 'rot_entregas', 'rot_coletas', 'anexos', 'usuarios'];
            var res = document.getElementById('fbTesteRes'); res.innerHTML = '<div style="font-size:13px;margin-top:10px">Testando no servidor…</div>';
      Promise.all(cols.map(function (c) {
        var f = filtroObra(c), q = f && f.campo && f.vals.length ? (f.campo === '__id__' ? P.fs.collection(c).where(firebase.firestore.FieldPath.documentId(), '==', f.vals[0]) : P.fs.collection(c).where(f.campo, '==', f.vals[0])) : P.fs.collection(c);
        return q.limit(1).get().then(function () { return [c, true]; }, function () { return [c, false]; });
      })).then(function (r) {
        res.innerHTML = '<table><tbody>' + r.map(function (x) {
          var esperado = x[0] === 'usuarios' ? P.setor === 'admin' : P.colOk(x[0]);
          return '<tr><td>' + x[0] + '</td><td class="' + (x[1] ? 'ok' : 'no') + '">' + (x[1] ? 'pode ler' : 'bloqueado') + '</td><td style="font-size:11px;color:' + (x[1] === esperado ? '#2E6B2E' : '#8E0E17') + '">' + (x[1] === esperado ? 'como esperado' : 'DIFERENTE do esperado') + '</td></tr>';
        }).join('') + '</tbody></table>';
      });
    };
  };

  /* ---------- versão nova publicada: avisa quem está com o Pyro aberto ---------- */
  var VERSAO = null;
  function checarVersao() {
    fetch('versao.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.build) return;
      if (VERSAO === null) { VERSAO = j.build; return; }
      if (j.build !== VERSAO && !document.getElementById('fbNova')) {
        var b = el('<div id="fbNova" role="status" style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9997;display:flex;gap:12px;align-items:center;' +
          'background:#2A0A0D;color:#F4E2B8;padding:10px 14px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:600 13.5px Figtree,system-ui,sans-serif">' +
          '<span>Saiu uma versão nova do Pyro (' + esc(j.versao || '') + '). Seus dados estão salvos.</span>' +
          '<button type="button" style="font:inherit;border:0;border-radius:9px;padding:7px 12px;cursor:pointer;background:linear-gradient(180deg,#B3121B,#7A0A10);color:#FFF3DA">Atualizar agora</button></div>');
        b.querySelector('button').onclick = function () { location.reload(); };
        document.body.appendChild(b);
      }
    }).catch(function () {});
  }
  if (location.protocol !== 'file:') { setTimeout(checarVersao, 3000); setInterval(checarVersao, 3 * 60 * 1000); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
