/* ============================================================
   Pyro Tools · MODO DEMONSTRAÇÃO (versão de portfólio)

   Com window.PYRO_DEMO = true (em firebase-config.js) este arquivo coloca no
   lugar do Firebase um banco de mentira que mora só no navegador de quem está
   vendo. Assim o Pyro abre direto, sem login e sem projeto no Firebase.

   - Todos os dados são FICTÍCIOS (obras, fornecedores, pedidos, notas, pessoas).
   - Nada é enviado para servidor nenhum: fica no localStorage do navegador.
   - Os dados voltam ao começo a cada dia (ou no botão "Reiniciar").
   - O seletor "Ver como" troca o setor, para mostrar o que cada um enxerga.

   No uso real (PYRO_DEMO = false) este arquivo não faz nada: o Pyro fala com o
   Firestore e quem protege os dados é o firestore.rules, no servidor.
   Aqui as permissões valem só na tela, porque não existe servidor.
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_DEMO) return;

  var ADMIN_EMAIL = 'admin@exemplo.com';
  window.PYRO_ADMIN_EMAIL = ADMIN_EMAIL;
  window.FIREBASE_CONFIG = { apiKey: 'modo-demonstracao', projectId: 'demo-local' };

  /* ---------- datas ---------- */
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var HOJE = iso(new Date());
  function dia(n) { var d = new Date(HOJE + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function seg(n) { var d = new Date(HOJE + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + n); return iso(d); } /* segunda-feira desta semana + n */

  /* ---------- pessoas da demonstração (todas inventadas) ---------- */
  var PESSOAS = [
    { uid: 'demo_admin', email: ADMIN_EMAIL, nome: 'Administrador', setor: 'admin', rotulo: 'Administrador (vê e edita tudo)' },
    { uid: 'demo_compras', email: 'compras@exemplo.com', nome: 'Marcos', setor: 'compras', rotulo: 'Compras' },
    { uid: 'demo_almox', email: 'recebimento@exemplo.com', nome: 'Jonas', setor: 'almox', rotulo: 'Recebimento / Logística' },
    { uid: 'demo_pcp', email: 'pcp@exemplo.com', nome: 'Helena', setor: 'pcp', rotulo: 'PCP' },
    { uid: 'demo_obras', email: 'obras@exemplo.com', nome: 'Rogério', setor: 'obras', rotulo: 'Obras' },
    { uid: 'demo_projeto', email: 'projeto@exemplo.com', nome: 'Bianca', setor: 'projeto', rotulo: 'Projeto' },
    { uid: 'demo_diretoria', email: 'diretoria@exemplo.com', nome: 'Diretoria', setor: 'diretoria', rotulo: 'Diretoria' },
    { uid: 'demo_consulta', email: 'consulta@exemplo.com', nome: 'Visitante', setor: 'consulta', rotulo: 'Consulta (só leitura)' }
  ];
  var SS_USER = 'pyro_demo_user', LS_DB = 'pyro_demo_db_v2', VERS = 3;
  function pessoaAtual() {
    var id = ''; try { id = sessionStorage.getItem(SS_USER) || ''; } catch (e) {}
    return PESSOAS.filter(function (p) { return p.uid === id; })[0] || PESSOAS[0];
  }

  /* ============================================================
     DADOS FICTÍCIOS
     ============================================================ */
  function dadosFicticios() {
    var db = {}, agora = Date.now();
    function put(col, o) { (db[col] = db[col] || {})[o.id] = o; }
    var REC_CAT = { perfis: 'Perfil', vidros: 'Vidros', acessorios: 'Acessórios', outros: 'Uso e Consumo' };

    PESSOAS.forEach(function (p) { if (p.setor !== 'admin') put('usuarios', { id: p.uid, nome: p.nome, email: p.email, setor: p.setor, ativo: true, criadoEm: agora, criadoPor: ADMIN_EMAIL }); });

    var C = { c1: 'Marcos', c2: 'Patrícia', c3: 'Rogério' };
    put('colaboradores', { id: 'dm_c1', nome: 'Marcos', funcao: 'Comprador' });
    put('colaboradores', { id: 'dm_c2', nome: 'Patrícia', funcao: 'Compradora' });
    put('colaboradores', { id: 'dm_c3', nome: 'Rogério', funcao: 'Obras' });

    var F = {
      f1: { nome: 'Perfis Aurora (exemplo)', cats: ['perfis'], contato: 'Comercial' },
      f2: { nome: 'Extrusão Modelo (exemplo)', cats: ['perfis', 'acessorios'], contato: 'Vendas' },
      f3: { nome: 'Vidraçaria Modelo (exemplo)', cats: ['vidros'], contato: 'Atendimento' },
      f4: { nome: 'Ferragens Sul (exemplo)', cats: ['acessorios', 'outros'], contato: 'Balcão' },
      f5: { nome: 'Vedações Norte (exemplo)', cats: ['outros'], contato: 'Comercial' }
    };
    Object.keys(F).forEach(function (k) { put('fornecedores', Object.assign({ id: 'dm_' + k, cnpj: '', email: '', createdAt: agora }, F[k])); });

    var O = {
      o1: { nome: 'Edifício Aurora', cliente: 'Construtora Exemplo A', cnpj: '00.000.000/0001-00', budgetTotal: 1800000, budgetCat: { perfis: 800000, vidros: 600000, acessorios: 250000, outros: 150000 } },
      o2: { nome: 'Residencial Parque Verde', cliente: 'Construtora Exemplo B', cnpj: '00.000.000/0002-00', budgetTotal: 950000, budgetCat: { perfis: 400000, vidros: 330000, acessorios: 140000, outros: 80000 } },
      o3: { nome: 'Torre Mirante', cliente: 'Construtora Exemplo C', cnpj: '00.000.000/0003-00', budgetTotal: 620000, budgetCat: { perfis: 280000, vidros: 210000, acessorios: 90000, outros: 40000 } }
    };
    Object.keys(O).forEach(function (k) {
      put('obras', Object.assign({ id: 'dm_' + k, status: 'ativa', aliases: [], responsaveis: [], createdAt: agora }, O[k]));
      put('painel_obras', { id: 'dm_po_' + k, nome: O[k].nome, ativo: 'Sim' });
    });

    /* pedidos: [chave, obra, fase, categoria, descrição, OP, PC, comprador, início (dias), status, fornecedor, curva A, crítico, entrega, itens]
       itens:   [código, descrição, acabamento, quantidade, unidade, valor total, fração já recebida] */
    var P = [
      ['p1', 'o1', 'Tipo', 'perfis', 'Perfis de alumínio linha 25', 'OP-2041', 'PC-8810', 'c1', -40, 'recebido', 'f1', 1, 0,
        { d: -12, st: 'recebido', ch: -10, nf: '48213', rom: 'R-771', venc: 12 },
        [['PF-2501', 'Montante linha 25', 'Anodizado fosco', 420, 'BR', 148000, 1], ['PF-2502', 'Travessa linha 25', 'Anodizado fosco', 380, 'BR', 112000, 1], ['PF-2510', 'Baguete linha 25', 'Anodizado fosco', 600, 'BR', 50000, 1]]],
      ['p2', 'o1', 'Tipo', 'vidros', 'Vidro laminado 8mm', 'OP-2042', 'PC-8822', 'c2', -30, 'comprado', 'f3', 1, 1,
        { d: -4, st: 'producao', re: [[-20, -12, 'Fornecedor atrasou a produção'], [-12, -8, 'Falta de matéria-prima'], [-8, -4, 'Fornecedor atrasou a produção']] },
        [['VD-0844', 'Vidro laminado 4+4 incolor 1200x2100', '', 180, 'PC', 171000, 0], ['VD-0845', 'Vidro laminado 4+4 incolor 800x2100', '', 150, 'PC', 114000, 0]]],
      ['p3', 'o1', 'Tipo', 'acessorios', 'Fechaduras e roldanas', 'OP-2043', 'PC-8830', 'c1', -25, 'recebido', 'f4', 0, 0,
        { d: -6, st: 'recebido', ch: -6, nf: '50122', rom: 'R-802', venc: -1 },
        [['AC-1101', 'Fechadura de embutir', 'Preto', 320, 'PC', 54000, 1], ['AC-1140', 'Roldana dupla 40mm', '', 1280, 'PC', 42000, 1]]],
      ['p4', 'o1', 'Tipo', 'perfis', 'Perfis linha 30 (janelas)', 'OP-2044', 'PC-8841', 'c1', -20, 'comprado', 'f2', 1, 0,
        { d: 6, st: 'aguardando', tipo: 'coleta' },
        [['PF-3001', 'Marco linha 30', 'Pintura branca', 300, 'BR', 96000, 0], ['PF-3004', 'Folha linha 30', 'Pintura branca', 340, 'BR', 92000, 0]]],
      ['p5', 'o1', 'Complemento', 'vidros', 'Vidro temperado 10mm (guarda-corpo)', 'OP-2050', '', 'c2', -9, 'cotacao', '', 1, 1, null, []],
      ['p6', 'o1', 'Complemento', 'outros', 'Selante estrutural e vedações', 'OP-2051', '', 'c1', -3, 'aprov_obra', '', 0, 0, null, []],
      ['p7', 'o2', 'Modelo', 'perfis', 'Perfis linha 25 (modelo)', 'OP-2101', 'PC-8905', 'c1', -28, 'recebido', 'f1', 1, 0,
        { d: -15, st: 'recebido', ch: -14, nf: '49877', rom: 'R-760', venc: 5 },
        [['PF-2501', 'Montante linha 25', 'Anodizado fosco', 160, 'BR', 64000, 1], ['PF-2502', 'Travessa linha 25', 'Anodizado fosco', 150, 'BR', 56000, 1]]],
      ['p8', 'o2', 'Modelo', 'vidros', 'Vidro insulado 6+12+6', 'OP-2102', 'PC-8911', 'c2', -22, 'recebido', 'f3', 1, 0,
        { d: -9, st: 'recebido', ch: -9, nf: '51003', rom: 'R-815' },
        [['VD-0612', 'Vidro insulado 6+12+6 1000x1800', '', 140, 'PC', 140000, 1]]],
      ['p9', 'o2', 'Tipo', 'perfis', 'Perfis linha 30', 'OP-2110', 'PC-8930', 'c1', -14, 'comprado', 'f2', 1, 0,
        { d: 3, st: 'producao', re: [[-2, 3, 'Logística / transporte']] },
        [['PF-3001', 'Marco linha 30', 'Anodizado bronze', 360, 'BR', 118000, 0], ['PF-3004', 'Folha linha 30', 'Anodizado bronze', 300, 'BR', 92000, 0]]],
      ['p10', 'o2', 'Tipo', 'acessorios', 'Ferragens e puxadores', 'OP-2111', 'PC-8931', 'c1', -10, 'comprado', 'f4', 0, 0,
        { d: 1, st: 'aguardando' },
        [['AC-2203', 'Puxador concha', 'Inox escovado', 480, 'PC', 38000, 0], ['AC-2210', 'Fecho central', 'Preto', 520, 'PC', 26000, 0]]],
      ['p11', 'o2', 'Tipo', 'vidros', 'Vidro laminado 10mm', 'OP-2112', '', 'c3', -6, 'aprov_int', '', 1, 1, null, []],
      ['p12', 'o2', 'Aditivo', 'outros', 'Contramarcos adicionais', 'OP-2120', '', 'c2', -2, 'cotacao', '', 0, 0, null, []],
      ['p13', 'o3', 'Embasamento', 'perfis', 'Perfis linha 42 (fachada)', 'OP-2201', 'PC-9012', 'c2', -18, 'comprado', 'f1', 1, 1,
        { d: 9, st: 'producao' },
        [['PF-4201', 'Coluna linha 42', 'Anodizado natural', 220, 'BR', 132000, 0], ['PF-4207', 'Travessa linha 42', 'Anodizado natural', 260, 'BR', 98000, 0]]],
      ['p14', 'o3', 'Embasamento', 'outros', 'Fita de vedação e silicone', 'OP-2202', 'PC-9015', 'c1', -11, 'recebido', 'f5', 0, 0,
        { d: -3, st: 'recebido', ch: -2, nf: '52240', rom: 'R-840', venc: 20 },
        [['UC-0310', 'Silicone neutro 280g', 'Preto', 600, 'TB', 15000, 1], ['UC-0322', 'Fita dupla face 12mm', '', 240, 'RL', 9600, 1]]]
    ];
    P.forEach(function (r, idx) {
      var k = r[0], o = 'dm_' + r[1], f = r[10] ? 'dm_' + r[10] : '', en = r[13], linhas = r[14] || [], id = 'dm_' + k, st = r[9];
      var valor = linhas.reduce(function (a, l) { return a + l[5]; }, 0), erp = (st === 'comprado' || st === 'recebido') ? String(4100 + idx + 1) : '';
      put('pedidos', {
        id: id, obraId: o, fase: r[2], categoria: r[3], item: r[4], op: r[5], pc: r[6], respId: 'dm_' + r[7], inicioCotacao: dia(r[8]), status: st, fornecedorId: f,
        erpPedido: erp, valor: valor, curvaA: !!r[11], critico: !!r[12], alterado: k === 'p6', justificativa: k === 'p6' ? 'Obra alterou a cor do acabamento após aprovação do projeto.' : '',
        itens: [], createdAt: agora - (60 - idx) * 60000, updatedAt: agora
      });
      linhas.forEach(function (l, i) {
        var qRec = Math.round(l[3] * l[6]), vRec = Math.round(l[5] * l[6]);
        put('painel_pedidos', {
          id: 'dm_r_' + k + '_' + (i + 1), importKey: 'demo|' + k + '|linha' + (i + 1), origem: 'PC', pyPedidoId: id,
          obra: O[r[1]].nome, pedido: r[6], fornecedor: F[r[10]].nome, codigo: l[0], categoria: REC_CAT[r[3]], descricao: l[1], acabamento: l[2], tipo: '',
          qtdePedida: l[3], unidade: l[4], valorPedido: l[5], dataPedido: dia(r[8] + 4), codigoErp: erp, previsaoChegada: en ? dia(en.d) : '', statusErp: '', fase: r[2], obs: '',
          recebimentos: qRec ? [{ id: 'dm_rc_' + k + '_' + (i + 1), nf: en && en.nf || '', data: en && en.ch !== undefined ? dia(en.ch) : '', qtd: qRec, valor: vRec }] : [],
          hasAnexo: false, anexoNome: ''
        });
      });
      if (en) put('entregas', {
        id: 'dm_e_' + k, pedidoId: id, obraId: o, tipo: en.tipo || 'entrega', status: en.st, dataPrevista: dia(en.d), dataChegada: en.ch !== undefined ? dia(en.ch) : '', nf: en.nf || '', romaneio: en.rom || '',
        reagend: (en.re || []).map(function (x) { return { de: dia(x[0]), para: dia(x[1]), motivo: x[2], em: dia(x[0]) }; }), criadoEm: agora
      });
      if (en && en.nf) put('nfs', {
        id: 'dm_n_' + k, numero: en.nf, romaneio: en.rom, pedidoId: id, obraId: o, fornecedorId: f, valor: valor, chegada: dia(en.ch), emissao: dia(en.ch - 2),
        vencimento: en.venc !== undefined ? dia(en.venc) : '', status: en.venc !== undefined ? 'boleto' : 'recebida', createdAt: agora
      });
    });

    /* pendências e ocorrências dos setores */
    function pend(id, titulo, obra, setor, dono, prazo, urg, detalhe) {
      put('pendencias', { id: id, titulo: titulo, obraId: 'dm_' + obra, setor: setor, dono: dono, prazo: dia(prazo), detalhe: detalhe, urg: !!urg, status: 'aberta', tipo: 'Manual', origem: 'manual', criadoEm: agora, criadoPor: 'Administrador', historico: [{ em: agora, por: 'Administrador', txt: 'Criada por Administrador' }] });
    }
    pend('dm_pd1', 'Cobrar nova data do vidro laminado 8mm', 'o1', 'compras', 'Marcos', 0, 1, 'Entrega já foi reprogramada três vezes pelo fornecedor.');
    pend('dm_pd2', 'Conferir medidas dos vidros antes da liberação', 'o2', 'projeto', 'Bianca', 2, 0, 'Revisar o caixilho do pavimento tipo antes de fechar a compra.');
    pend('dm_pd3', 'Separar área para receber os perfis linha 30', 'o1', 'almox', 'Jonas', 4, 0, 'Coleta prevista para a próxima semana.');
    pend('dm_pd4', 'Definir a cor do guarda-corpo com o cliente', 'o1', 'obras', 'Rogério', -1, 1, 'Sem a definição a cotação do vidro temperado não fecha.');
    put('ocorrencias', { id: 'dm_oc1', obraId: 'dm_o2', tipo: 'Material danificado', desc: 'Chegaram 140 vidros insulados, 3 com trinca no canto (pavimento modelo).', urg: false, anexos: [], status: 'aberta', por: 'Jonas', setor: 'almox', criadoEm: agora - 3 * 86400000 });
    put('ocorrencias', { id: 'dm_oc2', obraId: 'dm_o1', tipo: 'Entrega fora do combinado', desc: 'Fornecedor entregou as ferragens no período da tarde, fora da janela combinada.', urg: false, anexos: [], status: 'resolvida', por: 'Rogério', setor: 'obras', criadoEm: agora - 6 * 86400000, resolvidaEm: agora - 5 * 86400000, resolvidaPor: 'Marcos' });

    /* Roteiro de entregas e coletas da semana (Logística) */
    put('rot_config', { id: 'geral', fornecedores: Object.keys(F).map(function (k) { return F[k].nome; }), obras: Object.keys(O).map(function (k) { return O[k].nome; }), camposEntregas: [], camposColetas: [], janelas: { manha: { inicio: '07:00', fim: '10:00' }, tarde: { inicio: '13:00', fim: '17:00' } } });
    [['re1', 'f1', 'PC-8810', 'o1', 0, 'manha', 'entregue', ''], ['re2', 'f3', 'PC-8822', 'o1', 0, 'tarde', 'entregue_parcial', 'Faltaram 4 painéis, previsão de complemento em 2 dias.'],
     ['re3', 'f4', 'PC-8931', 'o2', 1, 'manha', 'a_caminho', ''], ['re4', 'f2', 'PC-8930', 'o2', 3, 'tarde', 'a_caminho', ''], ['re5', 'f1', 'PC-9012', 'o3', 4, 'manha', 'a_caminho', '']
    ].forEach(function (x) {
      var o = { id: 'dm_' + x[0], fornecedor: F[x[1]].nome, pedidoCompra: x[2], anexoLink: '', obra: O[x[3]].nome, data: seg(x[4]), periodo: x[5], status: x[6], obs: x[7], criadoEm: agora };
      if (x[6] === 'entregue') o.finalizadoEm = agora;
      put('rot_entregas', o);
    });
    put('rot_coletas', { id: 'dm_rc1', fornecedor: F.f2.nome, data: seg(2), periodo: 'manha', peso: '480', quantidade: '12', endereco: 'Rua Exemplo, 220 — Cidade/UF', status: 'a_caminho', obs: 'Coleta dos perfis linha 30 (PC-8841).', criadoEm: agora });
    return db;
  }

  /* ============================================================
     BANCO DE MENTIRA (mesmo jeito de usar do Firestore)
     ============================================================ */
  var DB = null;
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function carregar() {
    try { var j = JSON.parse(localStorage.getItem(LS_DB) || 'null'); if (j && j.v === VERS && j.dia === HOJE && j.db) return j.db; } catch (e) {}
    return null;
  }
  var tSalvar = 0, PESADAS = { anexos_partes: 1, chat_arq: 1 };
  function salvar() {
    clearTimeout(tSalvar);
    tSalvar = setTimeout(function () {
      var leve = {}; Object.keys(DB).forEach(function (c) { if (!PESADAS[c]) leve[c] = DB[c]; });
      try { localStorage.setItem(LS_DB, JSON.stringify({ v: VERS, dia: HOJE, db: leve })); } catch (e) { /* sem espaço: segue só na memória */ }
    }, 60);
  }
  DB = carregar();
  if (!DB) { DB = dadosFicticios(); salvar(); }

  var ouvintes = [], pend = {}, tAviso = 0;
  function avisar(col) {
    pend[col] = 1; clearTimeout(tAviso);
    tAviso = setTimeout(function () { var p = pend; pend = {}; ouvintes.slice().forEach(function (o) { if (p[o.col] && o.vivo) { try { o.fn(); } catch (e) { console.error('[demo] ouvinte', e); } } }); }, 0);
  }
  /* outra aba ou tela embutida gravou: recarrega e avisa quem está ouvindo */
  addEventListener('storage', function (ev) {
    if (ev.key !== LS_DB || !ev.newValue) return;
    try {
      var j = JSON.parse(ev.newValue); if (!j || !j.db) return;
      var cols = {}; Object.keys(DB).concat(Object.keys(j.db)).forEach(function (c) { cols[c] = 1; });
      Object.keys(cols).forEach(function (c) { if (PESADAS[c]) return; var a = JSON.stringify(DB[c] || {}), b = JSON.stringify(j.db[c] || {}); if (a !== b) { DB[c] = j.db[c] || {}; avisar(c); } });
    } catch (e) {}
  });

  var DOC_ID = { __docId: true }, META = { fromCache: false, hasPendingWrites: false };
  function campo(obj, id, f) { if (f === DOC_ID) return id; var v = obj; String(f).split('.').forEach(function (k) { v = v == null ? undefined : v[k]; }); return v; }
  function mesclar(a, b) {
    var o = Object.assign({}, a);
    Object.keys(b).forEach(function (k) { var v = b[k]; o[k] = (v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) ? mesclar(o[k], v) : v; });
    return o;
  }
  function docSnap(col, id) {
    var d = (DB[col] || {})[id], c = d === undefined ? undefined : clone(d);
    return { id: id, exists: c !== undefined, ref: docRef(col, id), metadata: META, data: function () { return c === undefined ? undefined : clone(c); }, get: function (f) { return c === undefined ? undefined : campo(c, id, f); } };
  }
  function qSnap(col, q) {
    var m = DB[col] || {}, ids = Object.keys(m).sort();
    q.filtros.forEach(function (f) {
      ids = ids.filter(function (id) {
        var v = campo(m[id], id, f[0]), x = f[2];
        switch (f[1]) {
          case '==': return v === x; case '!=': return v !== undefined && v !== x;
          case '<': return v < x; case '<=': return v <= x; case '>': return v > x; case '>=': return v >= x;
          case 'in': return Array.isArray(x) && x.indexOf(v) >= 0; case 'array-contains': return Array.isArray(v) && v.indexOf(x) >= 0;
          default: return true;
        }
      });
    });
    if (q.ordem) { var f0 = q.ordem[0], s = q.ordem[1] === 'desc' ? -1 : 1; ids = ids.filter(function (id) { return campo(m[id], id, f0) !== undefined; }).sort(function (a, b) { var x = campo(m[a], a, f0), y = campo(m[b], b, f0); return x < y ? -s : x > y ? s : 0; }); }
    if (q.lim) ids = ids.slice(0, q.lim);
    var docs = ids.map(function (id) { return docSnap(col, id); });
    return { docs: docs, size: docs.length, empty: !docs.length, metadata: META, forEach: function (f) { docs.forEach(f); }, docChanges: function () { return docs.map(function (d, i) { return { type: 'added', doc: d, newIndex: i, oldIndex: -1 }; }); } };
  }
  function ouvir(col, snap, args) {
    var a = Array.prototype.slice.call(args); if (a[0] && typeof a[0] !== 'function') a.shift(); /* opções na frente */
    var next = typeof a[0] === 'function' ? a[0] : (a[0] && a[0].next) || function () {};
    var o = { col: col, vivo: true, fn: function () { next(snap()); } };
    ouvintes.push(o); setTimeout(function () { if (o.vivo) { try { o.fn(); } catch (e) { console.error('[demo] ouvinte', e); } } }, 0);
    return function () { o.vivo = false; var i = ouvintes.indexOf(o); if (i >= 0) ouvintes.splice(i, 1); };
  }
  function gravar(col, id, dados, op) {
    var m = DB[col] = DB[col] || {}, novo = clone(dados) || {};
    m[id] = (op && (op.merge || op.mergeFields) && m[id]) ? mesclar(m[id], novo) : novo;
    salvar(); avisar(col);
  }
  function apagar(col, id) { if (DB[col] && DB[col][id] !== undefined) { delete DB[col][id]; salvar(); avisar(col); } }
  function novoId() { var s = '', a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < 20; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
  function docRef(col, id) {
    return {
      id: id, path: col + '/' + id,
      get: function () { return Promise.resolve(docSnap(col, id)); },
      set: function (d, op) { gravar(col, id, d, op); return Promise.resolve(); },
      update: function (d) { gravar(col, id, d, { merge: true }); return Promise.resolve(); },
      'delete': function () { apagar(col, id); return Promise.resolve(); },
      onSnapshot: function () { return ouvir(col, function () { return docSnap(col, id); }, arguments); }
    };
  }
  function consulta(col, q) {
    var c = {
      where: function (f, op, v) { return consulta(col, { filtros: q.filtros.concat([[f, op, v]]), ordem: q.ordem, lim: q.lim }); },
      orderBy: function (f, dir) { return consulta(col, { filtros: q.filtros, ordem: [f, dir || 'asc'], lim: q.lim }); },
      limit: function (n) { return consulta(col, { filtros: q.filtros, ordem: q.ordem, lim: n }); },
      get: function () { return Promise.resolve(qSnap(col, q)); },
      onSnapshot: function () { return ouvir(col, function () { return qSnap(col, q); }, arguments); }
    };
    return c;
  }
  function colRef(col) {
    var c = consulta(col, { filtros: [], ordem: null, lim: 0 });
    c.id = col; c.path = col;
    c.doc = function (id) { return docRef(col, id == null || id === '' ? novoId() : String(id)); };
    c.add = function (d) { var r = docRef(col, novoId()); return r.set(d).then(function () { return r; }); };
    return c;
  }
  var fs = {
    settings: function () {}, enablePersistence: function () { return Promise.resolve(); },
    collection: function (n) { return colRef(String(n)); },
    doc: function (p) { var a = String(p).split('/'); return docRef(a[0], a.slice(1).join('/')); },
    batch: function () {
      var ops = [];
      return {
        set: function (r, d, op) { ops.push(function () { return r.set(d, op); }); return this; },
        update: function (r, d) { ops.push(function () { return r.update(d); }); return this; },
        'delete': function (r) { ops.push(function () { return r['delete'](); }); return this; },
        commit: function () { ops.forEach(function (f) { f(); }); ops = []; return Promise.resolve(); }
      };
    }
  };

  /* ---------- login de mentira: entra direto como a pessoa escolhida em "Ver como" ---------- */
  function usuario(p) {
    return { uid: p.uid, email: p.email, displayName: p.nome, reauthenticateWithCredential: function () { return Promise.resolve(); }, updatePassword: function () { return Promise.resolve(); } };
  }
  var auth = {
    languageCode: 'pt-BR', currentUser: usuario(pessoaAtual()),
    onAuthStateChanged: function (cb) { setTimeout(function () { cb(auth.currentUser); }, 0); return function () {}; },
    signInWithEmailAndPassword: function () { return Promise.resolve({ user: auth.currentUser }); },
    sendPasswordResetEmail: function () { return Promise.resolve(); },
    signOut: function () { try { sessionStorage.removeItem(SS_USER); } catch (e) {} return Promise.resolve(); }
  };
  var authCadastro = {
    createUserWithEmailAndPassword: function (email) { return Promise.resolve({ user: { uid: 'demo_' + novoId().slice(0, 10), email: email } }); },
    signOut: function () { return Promise.resolve(); }
  };
  var apps = [];
  var fake = {
    apps: apps,
    initializeApp: function (cfg, nome) { var app = { name: nome || '[DEFAULT]', options: cfg, auth: function () { return nome ? authCadastro : auth; }, firestore: function () { return fs; } }; apps.push(app); return app; },
    auth: function () { return auth; },
    firestore: function () { return fs; }
  };
  fake.auth.EmailAuthProvider = { credential: function () { return {}; } };
  fake.firestore.FieldPath = { documentId: function () { return DOC_ID; } };
  window.firebase = fake;

  /* ============================================================
     FAIXA "DEMONSTRAÇÃO" (só na página principal, não nas telas embutidas)
     ============================================================ */
  window.PYRO_DEMO_API = {
    pessoas: PESSOAS, atual: pessoaAtual,
    verComo: function (uid) { try { sessionStorage.setItem(SS_USER, uid); } catch (e) {} location.reload(); },
    reiniciar: function () { try { localStorage.removeItem(LS_DB); sessionStorage.removeItem(SS_USER); } catch (e) {} location.reload(); }
  };
  var embutida = false; try { embutida = window.top !== window.self; } catch (e) { embutida = true; }
  if (embutida) return;
  function faixa() {
    if (document.getElementById('pyroDemo')) return;
    var st = document.createElement('style');
    st.textContent = '#pyroDemo{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:9000;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 16px);box-sizing:border-box;' +
      'padding:6px 8px 6px 12px;border-radius:999px;background:#1E1B18;color:#FBEFD9;border:1px solid #E8590C;box-shadow:0 8px 24px rgba(0,0,0,.35);font:600 12.5px Figtree,system-ui,sans-serif}' +
      '#pyroDemo b{color:#FFB020;white-space:nowrap}#pyroDemo .dm-t{white-space:nowrap;opacity:.85;font-weight:500}' +
      '#pyroDemo select,#pyroDemo button{font:inherit;color:inherit;background:#2E2925;border:1px solid #5A4A3C;border-radius:999px;padding:5px 10px;cursor:pointer;max-width:46vw}' +
      '#pyroDemo button:hover,#pyroDemo select:hover{border-color:#E8590C}#pyroDemo .dm-x{padding:5px 9px}' +
      '#pyroDemo.min .dm-t,#pyroDemo.min select,#pyroDemo.min .dm-r{display:none}' +
      '@media(max-width:700px){#pyroDemo{bottom:74px}#pyroDemo .dm-t{display:none}#pyroDemo select{max-width:38vw}}@media print{#pyroDemo{display:none}}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'pyroDemo'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Modo demonstração');
    var b = document.createElement('b'); b.textContent = 'Demonstração'; d.appendChild(b);
    var t = document.createElement('span'); t.className = 'dm-t'; t.textContent = 'dados fictícios · Ver como'; d.appendChild(t);
    var s = document.createElement('select'); s.setAttribute('aria-label', 'Ver como (setor)');
    PESSOAS.forEach(function (p) { var o = document.createElement('option'); o.value = p.uid; o.textContent = p.rotulo; s.appendChild(o); });
    s.value = pessoaAtual().uid; s.onchange = function () { window.PYRO_DEMO_API.verComo(s.value); }; d.appendChild(s);
    var r = document.createElement('button'); r.type = 'button'; r.className = 'dm-r'; r.textContent = 'Reiniciar'; r.title = 'Volta os dados fictícios ao começo';
    r.onclick = function () { window.PYRO_DEMO_API.reiniciar(); }; d.appendChild(r);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'dm-x'; x.textContent = '–'; x.title = 'Recolher ou abrir esta faixa'; x.setAttribute('aria-label', 'Recolher ou abrir a faixa de demonstração');
    x.onclick = function () { d.classList.toggle('min'); x.textContent = d.classList.contains('min') ? '+' : '–'; }; d.appendChild(x);
    document.body.appendChild(d);
  }
  if (document.body) faixa(); else document.addEventListener('DOMContentLoaded', faixa);
})();
