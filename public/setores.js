/* ============================================================
   Pyro Tools · páginas dos setores (versão Firebase)
   Hoje do setor, Pendências, Material por obra, Gargalos, Divergências,
   Fornecedores, Painel da Diretoria e Ocorrências da obra.
   Tudo é calculado com os dados reais do Pyro das obras liberadas
   (o administrador libera em Configurações > Páginas por setor).
   Carrega depois do Pyro e usa as funções dele (S, by, nm, entOf, ...).
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || typeof views === 'undefined') return;
  const FB = window.PYRO_FB;
  const PAGS = ['hoje', 'pend', 'materiais', 'garg', 'div', 'forn', 'dir', 'ocor'];
  const NOME = { hoje: 'Hoje do setor', pend: 'Pendências', materiais: 'Material por obra', garg: 'Gargalos', div: 'Divergências', forn: 'Fornecedores', dir: 'Painel da Diretoria', ocor: 'Ocorrências da obra' };
  const CURTO = { hoje: 'Hoje', pend: 'Pendências', materiais: 'Material', garg: 'Gargalos', div: 'Diverg.', forn: 'Fornec.', dir: 'Diretoria', ocor: 'Ocorr.' };
  const ICO = { hoje: 'sun', pend: 'todo', materiais: 'box', garg: 'alert', div: 'scale', forn: 'users', dir: 'chart', ocor: 'flag' };
  Object.assign(ICONS, {
    todo: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'
  });
  Object.assign(TITLES, NOME);
  S.pendencias = S.pendencias || []; S.ocorrencias = S.ocorrencias || [];
  let EQUIPE = [];
  const X = { pmax: 60, obra: '', todas: false, pq: '', pset: '', psit: 'abertas', pdono: '', mcat: '', mq: '', dq: '', oq: '', osit: 'abertas' };

  /* ---------- utilidades ---------- */
  const edita = v => FB.modo(v) === 'edita';
  const restrito = () => FB.restrito();
  const lib = () => FB.obrasLib();
  const setorNome = k => k === 'admin' ? 'Administrador' : (FB.NOMES_SETOR[k] || k || '—');
  const curtoObra = o => String(o.nome || '').split(' - ')[0].split(' — ')[0];
  const fz = s => typeof fold === 'function' ? fold(s) : String(s || '').toLowerCase();
  function obrasEscopo() {
    const ativas = S.obras.filter(o => o.status !== 'concluida');
    if (restrito()) return sortNome(ativas);
    if (X.todas) return sortNome(ativas);
    const ids = lib().ids; return sortNome(ativas.filter(o => ids.includes(o.id)));
  }
  function obrasSel() { const all = obrasEscopo(); if (X.obra && !all.some(o => o.id === X.obra)) X.obra = ''; return X.obra ? all.filter(o => o.id === X.obra) : all; }
  const nomesObra = o => [o.nome].concat(o.aliases || []).filter(Boolean);
  function obraDaLinha(r) { return S.obras.find(o => nomesObra(o).includes(r.obra)); }
  function linhasObra(o) { const n = nomesObra(o); return S.painel_pedidos.filter(r => n.includes(r.obra)); }
  const pedsObra = o => S.pedidos.filter(p => p.obraId === o.id && p.status !== 'cancelado' && !p.demo);
  const sem = (tone, txt) => `<span class="pill ${tone}"><i class="sx-dot" aria-hidden="true"></i>${esc(txt)}</span>`;
  const quando = d => { if (!d) return 'sem data'; const n = dayDiff(d, today()); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n < 0 ? `há ${-n} d` : `em ${n} d`; };

  /* ---------- barra de escopo (obras) ---------- */
  function escopoHtml(semTodas) {
    const all = obrasEscopo(), selAll = !X.obra;
    const ext = !restrito() ? `<span style="flex:1"></span><button class="toggle" data-sx="todas" aria-pressed="${X.todas}" title="${FB.claude ? 'Mostra também as demais obras ativas' : 'Compras e o administrador podem ver também as obras que ainda não foram liberadas para os setores'}"><span class="sw"></span>${FB.claude ? 'Incluir as outras obras' : 'Incluir obras não liberadas'}</button>` : '';
    return `<div class="filters" role="group" aria-label="Obras">${semTodas ? '' : `<button class="chip" data-sx="obra" data-id="" aria-pressed="${selAll}">${restrito() ? 'Todas as minhas obras' : (X.todas ? 'Todas as obras' : 'Obras liberadas')}</button>`}
      ${all.map(o => `<button class="chip" data-sx="obra" data-id="${esc(o.id)}" aria-pressed="${X.obra === o.id}">${esc(curtoObra(o))}</button>`).join('')}${ext}</div>`;
  }
  function cab(titulo, sub, extra) {
    return `<div class="head"><div><p class="eyebrow">${esc(FB.claude ? 'Setores' : setorNome(FB.setor))}</p><h1>${esc(titulo)}</h1>${sub ? `<p class="muted" style="margin:6px 0 0;max-width:760px">${sub}</p>` : ''}</div><div class="badges">${extra || ''}</div></div>`;
  }
  const btnXls = (id, nome) => `<button class="btn w" data-sx="xls" data-id="${id}" data-n="${esc(nome)}">${ic('download', 15)} Baixar Excel</button>`;
  const btnPrint = () => `<button class="btn w" data-sx="print">${ic('print', 15)} Imprimir</button>`;

  /* tabelas: guardam as linhas para o Excel */
  const TAB = {};
  function tabela(id, cols, rows, vazio, max) {
    TAB[id] = { cols, rows };
    if (!rows.length) return `<p class="muted" style="margin:0;padding:14px 16px">${vazio || 'Nada por aqui.'}</p>`;
    const mais = max && rows.length > max ? `<div style="padding:10px 16px 14px"><button class="btn sm" data-sx="mais" data-id="${id}">Mostrar mais (${rows.length - max} restantes)</button> <span class="muted" style="font-size:12px">O Excel sempre leva todas.</span></div>` : '';
    return `<div class="tablewrap"><table><thead><tr>${cols.map(c => `<th${c.r ? ' class="r"' : ''}>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${(max ? rows.slice(0, max) : rows).map(r => `<tr${r._click ? ` data-sx="${r._click[0]}" data-id="${esc(r._click[1])}" style="cursor:pointer"` : ''}>${cols.map(c => `<td${c.r ? ' class="r mono"' : ''}>${c.h ? c.h(r) : esc(c.v(r))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${mais}`;
  }
  async function excel(id, nome) {
    const t = TAB[id]; if (!t) return;
    try {
      if (!window.XLSX) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const dados = t.rows.map(r => Object.fromEntries(t.cols.filter(c => !c.noX).map(c => [c.l, c.x ? c.x(r) : c.v(r)])));
      const ws = XLSX.utils.json_to_sheet(dados), wb = XLSX.utils.book_new();
      ws['!cols'] = t.cols.filter(c => !c.noX).map(c => ({ wch: Math.min(60, Math.max(10, c.l.length + 2, ...dados.slice(0, 200).map(d => String(d[c.l] ?? '').length))) }));
      XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 30));
      const nomeArq = `Pyro - ${nome} - ${today()}.xlsx`;
      const blob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (window.pyroSave) await window.pyroSave(nomeArq, blob); else XLSX.writeFile(wb, nomeArq);
    } catch (e) { toast('Não foi possível gerar o Excel (sem internet?)'); }
  }

  /* ---------- situação dos itens do Recebimento ---------- */
  function situacaoLinha(r) {
    const q = +r.qtdePedida || 0, rc = rowQtdRec(r), pv = r.previsaoChegada || '';
    if (q > 0 && rc >= q) return { k: 'ok', tone: 'ok', txt: rc > q ? 'Recebido (a mais)' : 'Recebido' };
    if (pv && pv < today()) return { k: 'atr', tone: 'bad', txt: rc > 0 ? 'Parcial, previsão vencida' : 'Previsão vencida' };
    if (rc > 0) return { k: 'par', tone: 'acc', txt: 'Parcial' };
    if (!pv) return { k: 'sp', tone: 'warn', txt: 'Sem previsão' };
    return { k: 'prev', tone: dayDiff(pv, today()) <= 3 ? 'warn' : 'muted', txt: 'Previsto ' + fd(pv) };
  }
  const pedidoChave = r => String(r.pedido || 'Sem pedido').trim();

  /* ---------- pendências automáticas (a partir dos dados) ---------- */
  function autoPend() {
    const L = [], t = today(), obras = obrasEscopo(), ids = obras.map(o => o.id);
    const add = x => L.push(Object.assign({ auto: true, status: 'aberta' }, x));
    S.entregas.forEach(e => {
      const p = by('pedidos', e.pedidoId); if (!p || !ids.includes(p.obraId) || e.status === 'recebido' || p.status === 'cancelado') return;
      const forn = nm('fornecedores', p.fornecedorId, 'sem fornecedor');
      if (isLate(e)) add({ id: 'atr_' + e.id, tone: 'bad', titulo: `Entrega atrasada há ${dayDiff(t, e.dataPrevista)} d: ${p.item}`, detalhe: `${forn} · previsto ${fdy(e.dataPrevista)}${reagN(e) ? ' · ' + reagN(e) + ' reprogramação(ões)' : ''}`, obraId: p.obraId, setores: ['compras', 'obras', 'pcp'], setor: 'compras', prazo: t, pedidoId: p.id, tipo: 'Atraso' });
      else if (e.dataPrevista && dayDiff(e.dataPrevista, t) <= 2) add({ id: 'rec_' + e.id, tone: 'warn', titulo: `Receber ${quando(e.dataPrevista)}: ${p.item}`, detalhe: `${forn} · ${e.tipo === 'coleta' ? 'coleta' : 'entrega'} prevista ${fdy(e.dataPrevista)}${e.janela ? ' · ' + e.janela : ''}`, obraId: p.obraId, setores: ['almox', 'obras'], setor: 'almox', prazo: e.dataPrevista, pedidoId: p.id, tipo: 'Recebimento' });
      if (reagN(e) >= 3) add({ id: 'rg_' + e.id, tone: 'warn', titulo: `Fornecedor inconstante: ${reagN(e)} reprogramações em ${p.item}`, detalhe: forn, obraId: p.obraId, setores: ['compras', 'diretoria'], setor: 'compras', prazo: t, pedidoId: p.id, tipo: 'Fornecedor' });
    });
    S.pedidos.forEach(p => {
      if (!ids.includes(p.obraId)) return;
      if (p.status === 'comprado' && !p.semReceb) { const e = entOf(p.id); if (!e || (!e.dataPrevista && e.status !== 'recebido')) add({ id: 'sp_' + p.id, tone: 'warn', titulo: `Comprado sem previsão de entrega: ${p.item}`, detalhe: nm('fornecedores', p.fornecedorId, 'sem fornecedor') + (p.pc ? ' · ' + p.pc : ''), obraId: p.obraId, setores: ['compras', 'pcp'], setor: 'compras', prazo: t, pedidoId: p.id, tipo: 'Previsão' }); }
      if (p.status === 'aprov_obra') add({ id: 'apo_' + p.id, tone: 'warn', titulo: `Aprovar na obra: ${p.item}`, detalhe: 'Pedido aguardando aprovação da Obra' + (p.pc ? ' · ' + p.pc : ''), obraId: p.obraId, setores: ['obras', 'compras'], setor: 'obras', prazo: t, pedidoId: p.id, tipo: 'Aprovação' });
      if (p.status === 'aprov_int') add({ id: 'api_' + p.id, tone: 'warn', titulo: `Aprovação interna: ${p.item}`, detalhe: 'Pedido aguardando aprovação interna', obraId: p.obraId, setores: ['diretoria', 'compras'], setor: 'diretoria', prazo: t, pedidoId: p.id, tipo: 'Aprovação' });
      if ((p.status === 'cotacao' || p.status === 'analise') && p.inicioCotacao && dayDiff(t, p.inicioCotacao) > 7) add({ id: 'cot_' + p.id, tone: 'warn', titulo: `${PSTAT[p.status]} há ${dayDiff(t, p.inicioCotacao)} d: ${p.item}`, detalhe: p.pc || p.op || '', obraId: p.obraId, setores: ['compras', 'pcp', 'projeto'], setor: 'compras', prazo: t, pedidoId: p.id, tipo: 'Cotação' });
    });
    obras.forEach(o => {
      const g = {};
      linhasObra(o).forEach(r => { const s = situacaoLinha(r); if (s.k !== 'atr') return; const k = pedidoChave(r); (g[k] = g[k] || []).push(r); });
      Object.entries(g).forEach(([k, rs]) => {
        const pv = rs.map(r => r.previsaoChegada).sort()[0];
        add({ id: 'pv_' + hsh(o.id + '|' + k), tone: 'bad', titulo: `${k}: ${rs.length} ${rs.length > 1 ? 'itens' : 'item'} com previsão vencida`, detalhe: `${rs[0].categoria || ''} · ${rs[0].fornecedor || ''} · previsto ${fdy(pv)}`, obraId: o.id, setores: ['pcp', 'obras', 'compras', 'almox'], setor: 'compras', prazo: t, painel: { obra: o.id, pedido: k }, tipo: 'Material' });
      });
    });
    divergencias().forEach(d => add({ id: 'div_' + d.id, tone: 'warn', titulo: d.titulo, detalhe: d.detalhe, obraId: d.obraId, setores: ['almox', 'compras'], setor: 'almox', prazo: t, tipo: 'Divergência', painel: d.painel, pedidoId: d.pedidoId }));
    return L;
  }
  /* pendências manuais + automáticas (a manual com o mesmo id "assume" a automática) */
  function todasPend() {
    const ids = obrasEscopo().map(o => o.id), man = S.pendencias.filter(x => ids.includes(x.obraId));
    const mm = new Map(man.map(x => [x.id, x]));
    const au = autoPend().map(a => mm.has(a.id) ? Object.assign({}, a, mm.get(a.id), { auto: true, assumida: true }) : a);
    const auIds = new Set(au.map(a => a.id));
    return au.concat(man.filter(x => !auIds.has(x.id)).map(x => Object.assign({ tone: x.urg ? 'bad' : 'warn' }, x)));
  }
  function tonePend(x) { if (x.status === 'concluida') return 'ok'; if (x.prazo && x.prazo < today()) return 'bad'; return x.tone || 'warn'; }
  const doSetor = x => FB.setor === 'admin' || x.setor === FB.setor || (x.setores || []).includes(FB.setor);

  /* ---------- divergências ---------- */
  function divergencias() {
    const L = [], obras = obrasEscopo();
    obras.forEach(o => {
      linhasObra(o).forEach(r => {
        const q = +r.qtdePedida || 0, rc = rowQtdRec(r);
        if (q > 0 && rc > q) L.push({ id: 'm' + r.id, tipo: 'Recebido a mais', tone: 'warn', titulo: `Recebido a mais: ${r.descricao}`, detalhe: `${pedidoChave(r)} · pedido ${q}, recebido ${rc} (+${r2(rc - q)})`, obraId: o.id, qtd: q, rec: rc, dif: r2(rc - q), pedido: pedidoChave(r), item: r.descricao, forn: r.fornecedor, nf: (r.recebimentos || []).map(x => x.nf).filter(Boolean).join(', '), painel: { obra: o.id, pedido: pedidoChave(r) } });
        else if (!q && rc > 0) L.push({ id: 'z' + r.id, tipo: 'Recebido sem quantidade pedida', tone: 'warn', titulo: `Recebido sem quantidade no pedido: ${r.descricao}`, detalhe: `${pedidoChave(r)} · recebido ${rc}`, obraId: o.id, qtd: 0, rec: rc, dif: rc, pedido: pedidoChave(r), item: r.descricao, forn: r.fornecedor, nf: (r.recebimentos || []).map(x => x.nf).filter(Boolean).join(', '), painel: { obra: o.id, pedido: pedidoChave(r) } });
        else if (rc > 0 && rc < q && r.previsaoChegada && r.previsaoChegada < today()) L.push({ id: 'p' + r.id, tipo: 'Faltou parte (parcial vencido)', tone: 'bad', titulo: `Faltou parte: ${r.descricao}`, detalhe: `${pedidoChave(r)} · pedido ${q}, recebido ${rc} (faltam ${r2(q - rc)})`, obraId: o.id, qtd: q, rec: rc, dif: r2(rc - q), pedido: pedidoChave(r), item: r.descricao, forn: r.fornecedor, nf: (r.recebimentos || []).map(x => x.nf).filter(Boolean).join(', '), painel: { obra: o.id, pedido: pedidoChave(r) } });
      });
      S.nfs.forEach(n => {
        if (n.obraId !== o.id || n.foraBudget || n.semFinanceiro || (n.pedidoId && by('pedidos', n.pedidoId))) return;
        L.push({ id: 'nf' + n.id, tipo: 'Nota sem pedido ligado', tone: 'warn', titulo: `Nota ${n.numero || 's/n'} sem pedido ligado`, detalhe: `${nm('fornecedores', n.fornecedorId, 'sem fornecedor')} · ${brl2(n.valor)}${n.emissao ? ' · emitida ' + fdy(n.emissao) : ''}`, obraId: o.id, qtd: '', rec: '', dif: '', pedido: '', item: 'NF ' + (n.numero || ''), forn: nm('fornecedores', n.fornecedorId, ''), nf: n.numero || '' });
      });
    });
    return L;
  }

  /* ---------- páginas ---------- */
  function atalhos(atual) {
    const ps = PAGS.filter(p => p !== atual && FB.pagOk(p));
    return ps.length ? `<div class="sx-atalhos" role="navigation" aria-label="Páginas do setor">${ps.map(p => `<button class="btn w" data-act="nav" data-v="${p}">${ic(ICO[p], 16)} ${esc(NOME[p])}</button>`).join('')}</div>` : '';
  }
  function listaPend(L, max, vazio) {
    if (!L.length) return `<p class="muted" style="margin:0;padding:6px 0">${vazio}</p>`;
    return `<div class="rows" style="gap:8px">${L.slice(0, max).map(x => `<div class="sx-pi"><span class="linha ${tonePend(x)}">${ic(x.status === 'concluida' ? 'check' : 'alert', 15)}</span>
      <button type="button" class="sx-pt" data-sx="ver-pend" data-id="${esc(x.id)}"><b>${esc(x.titulo)}</b><span class="muted">${esc(nm('obras', x.obraId, ''))}${x.detalhe ? ' · ' + esc(x.detalhe) : ''}</span>
      <span class="sx-meta">${x.dono ? `<span class="pill acc">${esc(x.dono)}</span>` : (x.assumida ? '' : '<span class="pill muted">sem dono</span>')} <span class="pill muted">${esc(x.tipo || 'Manual')}</span> ${x.prazo ? `<span class="pill ${x.prazo < today() && x.status !== 'concluida' ? 'bad' : 'muted'}">prazo ${fd(x.prazo)}</span>` : ''}</span></button>
      ${botoesPend(x)}</div>`).join('')}</div>${L.length > max ? `<div style="margin-top:10px"><button class="btn sm" data-act="nav" data-v="pend">Ver todas (${L.length})</button></div>` : ''}`;
  }
  function botoesPend(x) {
    if (!FB.colOk('pendencias') || !(edita('pend') || edita('hoje') || edita('div') || edita('ocor'))) return '';
    if (x.status === 'concluida') return `<button class="btn sm" data-sx="reabrir" data-id="${esc(x.id)}">Reabrir</button>`;
    return `<span class="sx-acts">${!x.dono ? `<button class="btn sm" data-sx="assumir" data-id="${esc(x.id)}">Assumir</button>` : ''}<button class="btn sm pri" data-sx="concluir" data-id="${esc(x.id)}">${ic('check', 13)} Concluir</button></span>`;
  }

  views.hoje = function () {
    const obras = obrasSel(), ids = obras.map(o => o.id), t = today();
    const ents = S.entregas.filter(e => { const p = by('pedidos', e.pedidoId); return p && ids.includes(p.obraId) && e.status !== 'recebido' && p.status !== 'cancelado'; });
    const atr = ents.filter(isLate).length, hoje = ents.filter(e => e.dataPrevista === t).length, sem7 = ents.filter(e => e.dataPrevista && e.dataPrevista >= t && dayDiff(e.dataPrevista, t) <= 7).length;
    const P = todasPend().filter(x => ids.includes(x.obraId) && x.status !== 'concluida');
    const meu = P.filter(doSetor).sort((a, b) => ({ bad: 0, warn: 1 }[tonePend(a)] ?? 2) - ({ bad: 0, warn: 1 }[tonePend(b)] ?? 2) || String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
    const rows = obras.flatMap(linhasObra), done = rows.filter(rowDone).length;
    const oc = S.ocorrencias.filter(x => ids.includes(x.obraId) && x.status !== 'resolvida').length;
    const h = new Date().getHours(), sau = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const dt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return `<div class="head"><div><p class="eyebrow">${esc(dt)}${FB.claude ? '' : ' · ' + esc(setorNome(FB.setor))}</p><h1>${sau}${FB.nome ? ', ' + esc(String(FB.nome).split(' ')[0]) : ''}.</h1><p class="muted" style="margin:6px 0 0">O que precisa de você hoje nas obras ${esc(obras.map(curtoObra).join(' e ') || '—')}.</p></div><div class="badges">${btnPrint()}</div></div>
      ${escopoHtml()}
      <section aria-label="Indicadores"><div class="kpis">
        ${kpi('Resolver hoje', meu.length, 'pendências do seu setor', meu.length ? 'warn' : 'ok')}
        ${kpi('Entregas atrasadas', atr, atr ? 'cobrar o fornecedor' : 'nenhuma no momento', atr ? 'bad' : 'ok')}
        ${kpi('Chegam hoje', hoje, 'entregas e coletas previstas')}
        ${kpi('Chegam em 7 dias', sem7, 'previsão dos fornecedores')}
        ${kpi('Material recebido', (rows.length ? pct(done, rows.length) : 0) + '%', `${done} de ${rows.length} itens do Recebimento`, rows.length && done === rows.length ? 'ok' : '')}
        ${kpi('Ocorrências abertas', oc, 'registradas pela obra', oc ? 'warn' : '')}
      </div></section>
      ${atalhos('hoje')}
      <section class="panel"><div class="sec-h"><h2>Resolver hoje</h2><span class="sub">${meu.length} do seu setor · atrasadas primeiro</span></div><div style="padding:0 16px 16px">${listaPend(meu, 12, 'Nada pendente para o seu setor hoje.')}</div></section>`;
  };

  views.pend = function () {
    const obras = obrasSel(), ids = obras.map(o => o.id);
    let L = todasPend().filter(x => ids.includes(x.obraId));
    const abertas = L.filter(x => x.status !== 'concluida').length;
    if (X.psit === 'abertas') L = L.filter(x => x.status !== 'concluida'); else if (X.psit === 'concluidas') L = L.filter(x => x.status === 'concluida');
    if (X.pset === 'meu') L = L.filter(doSetor); else if (X.pset) L = L.filter(x => x.setor === X.pset || (x.setores || []).includes(X.pset));
    if (X.pdono) L = L.filter(x => X.pdono === '-' ? !x.dono : x.dono === X.pdono);
    if (X.pq) L = L.filter(x => matchQ(fz([x.titulo, x.detalhe, x.dono, x.tipo, nm('obras', x.obraId, '')].join(' ')), X.pq));
    const ordem = { bad: 0, warn: 1, acc: 2, muted: 3, ok: 4 };
    L.sort((a, b) => (ordem[tonePend(a)] ?? 3) - (ordem[tonePend(b)] ?? 3) || String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
    const donos = [...new Set(EQUIPE.map(p => p.nome).concat(S.pendencias.map(x => x.dono)).filter(Boolean))].sort();
    const pode = FB.colOk('pendencias') && (edita('pend') || edita('hoje'));
        const tab = tabela('pend', [
      { l: 'Situação', h: x => sem(tonePend(x), x.status === 'concluida' ? 'Concluída' : tonePend(x) === 'bad' ? 'Atrasada' : 'Aberta'), v: x => x.status === 'concluida' ? 'Concluída' : tonePend(x) === 'bad' ? 'Atrasada' : 'Aberta' },
      { l: 'O que fazer', h: x => `<button type="button" class="sx-pt" data-sx="ver-pend" data-id="${esc(x.id)}"><b>${esc(x.titulo)}</b><span class="muted">${esc(x.detalhe || '')}</span></button>`, v: x => x.titulo, x: x => x.titulo + (x.detalhe ? ' · ' + x.detalhe : '') },
      { l: 'Obra', v: x => curtoObra(by('obras', x.obraId) || { nome: '—' }) },
      { l: 'Setor', v: x => setorNome(x.setor) },
      { l: 'Dono', v: x => x.dono || '—' },
      { l: 'Prazo', h: x => x.prazo ? `${fdy(x.prazo)}<div class="muted" style="font-size:12px">${quando(x.prazo)}</div>` : '—', v: x => x.prazo ? fdy(x.prazo) : '' },
      { l: 'Origem', v: x => x.auto ? 'Automática · ' + (x.tipo || '') : (x.tipo || 'Manual') },
      { l: '', h: x => botoesPend(x), v: () => '', noX: true }
    ], L, 'Nenhuma pendência com esses filtros.', X.pmax);
    return cab('Pendências', 'Tudo que está parado, com dono e prazo. As automáticas nascem dos dados do Pyro (atrasos, previsões vencidas, divergências, aprovações) e somem sozinhas quando o problema é resolvido. Assumir coloca seu nome nela.',
      `${btnXls('pend', 'Pendências')}${btnPrint()}${pode ? `<button class="btn pri w" data-sx="nova-pend">${ic('plus')} Nova pendência</button>` : ''}`)
      + escopoHtml()
      + `<section class="panel"><div class="sec-h"><h2>${L.length} pendência(s)</h2><span class="sub">${abertas} abertas nas obras selecionadas</span>
        <div class="filters"><input class="f" type="search" data-sxf="pq" placeholder="Buscar" value="${esc(X.pq)}" aria-label="Buscar pendência">
        <select class="f" data-sxf="psit" aria-label="Situação">${opts([['abertas', 'Abertas'], ['concluidas', 'Concluídas'], ['todas', 'Todas']], X.psit)}</select>
        <select class="f" data-sxf="pset" aria-label="Setor">${opts([['meu', 'Do meu setor']].concat(Object.entries(FB.NOMES_SETOR)), X.pset, 'Todos os setores')}</select>
        <select class="f" data-sxf="pdono" aria-label="Dono">${opts([['-', 'Sem dono']].concat(donos.map(d => [d, d])), X.pdono, 'Qualquer dono')}</select></div></div>${tab}</section>`;
  };

  function resumoPedidos(o) {
    const g = {};
    linhasObra(o).forEach(r => { if (X.mcat && r.categoria !== X.mcat) return; const k = pedidoChave(r); (g[k] = g[k] || { pedido: k, cat: r.categoria || '', forn: r.fornecedor || '', rows: [] }).rows.push(r); });
    return Object.values(g).map(x => {
      const n = x.rows.length, ok = x.rows.filter(rowDone).length, atr = x.rows.filter(r => situacaoLinha(r).k === 'atr').length, par = x.rows.filter(r => situacaoLinha(r).k === 'par').length;
      const abertas = x.rows.filter(r => !rowDone(r)), prev = abertas.map(r => r.previsaoChegada).filter(Boolean).sort();
      const tone = ok === n ? 'ok' : atr ? 'bad' : prev.length < abertas.length ? 'warn' : 'muted';
      return Object.assign(x, { n, ok, atr, par, pct: pct(ok, n), prev: prev[prev.length - 1] || '', prox: prev[0] || '', tone, obraId: o.id, _click: ['ver-painel', o.id + '§' + x.pedido] });
    }).sort((a, b) => ({ bad: 0, warn: 1, muted: 2, ok: 3 }[a.tone] - { bad: 0, warn: 1, muted: 2, ok: 3 }[b.tone]) || String(a.pedido).localeCompare(String(b.pedido), 'pt', { numeric: true }));
  }
  views.materiais = function () {
    const obras = obrasSel();
    const cats = [...new Set(obras.flatMap(linhasObra).map(r => r.categoria).filter(Boolean))].sort();
    let corpo = '';
    obras.forEach(o => {
      const rows = linhasObra(o).filter(r => !X.mcat || r.categoria === X.mcat);
      const porCat = {};
      rows.forEach(r => { const c = r.categoria || 'Sem categoria'; const x = porCat[c] = porCat[c] || { n: 0, ok: 0, atr: 0, sp: 0 }; x.n++; if (rowDone(r)) x.ok++; const s = situacaoLinha(r).k; if (s === 'atr') x.atr++; if (s === 'sp') x.sp++; });
      let peds = resumoPedidos(o);
      if (X.mq) peds = peds.filter(p => matchQ(fz(p.pedido + ' ' + p.forn + ' ' + p.cat + ' ' + p.rows.map(r => r.descricao).join(' ')), X.mq));
      const tid = 'mat_' + o.id;
      corpo += `<section class="panel" style="margin-bottom:18px"><div class="sec-h"><h2>${esc(o.nome)}</h2><span class="sub">${rows.filter(rowDone).length} de ${rows.length} itens recebidos · ${pct(rows.filter(rowDone).length, rows.length)}%</span><span style="flex:1"></span>${btnXls(tid, 'Material ' + curtoObra(o))}</div>
        <div class="sx-cats">${Object.entries(porCat).map(([c, x]) => `<div class="rrow"><div class="rt"><b>${esc(c)}</b><span class="mono muted">${x.ok}/${x.n} · ${pct(x.ok, x.n)}%${x.atr ? ` · <span style="color:var(--bad)">${x.atr} vencidos</span>` : ''}${x.sp ? ` · ${x.sp} sem previsão` : ''}</span></div>${bar(pct(x.ok, x.n), x.ok === x.n ? 'ok' : x.atr ? 'bad' : '')}</div>`).join('') || '<p class="muted" style="margin:0">Sem itens no Recebimento para esta obra.</p>'}</div>
        ${tabela(tid, [
          { l: 'Situação', h: p => sem(p.tone, p.tone === 'ok' ? 'Completo' : p.tone === 'bad' ? 'Atrasado' : p.tone === 'warn' ? 'Sem previsão' : 'Em andamento'), v: p => p.tone === 'ok' ? 'Completo' : p.tone === 'bad' ? 'Atrasado' : p.tone === 'warn' ? 'Sem previsão' : 'Em andamento' },
          { l: 'Pedido (PC / OP)', h: p => `<b>${esc(p.pedido)}</b>`, v: p => p.pedido },
          { l: 'Categoria', v: p => p.cat }, { l: 'Fornecedor', v: p => p.forn },
          { l: 'Recebido', h: p => `<div style="min-width:120px">${bar(p.pct, p.tone === 'ok' ? 'ok' : p.tone === 'bad' ? 'bad' : '')}<span class="mono muted" style="font-size:12px">${p.ok}/${p.n} itens · ${p.pct}%</span></div>`, v: p => `${p.ok}/${p.n}`, x: p => p.pct + '%' },
          { l: 'Próxima chegada', v: p => p.tone === 'ok' ? '—' : (p.prox ? fdy(p.prox) : 'sem previsão') },
          { l: 'Tudo chega até', v: p => p.tone === 'ok' ? 'recebido' : (p.prev ? fdy(p.prev) : 'sem previsão') }
        ], peds, 'Nenhum pedido com esses filtros.')}</section>`;
    });
    return cab('Material por obra', 'O que já chegou e o que falta, por categoria e por pedido, a partir do Recebimento. Clique num pedido para ver item por item.', btnPrint())
      + escopoHtml()
      + `<div class="filters" style="margin-bottom:14px"><select class="f" data-sxf="mcat" aria-label="Categoria">${opts(cats.map(c => [c, c]), X.mcat, 'Todas as categorias')}</select><input class="f" type="search" data-sxf="mq" placeholder="Buscar pedido, item ou fornecedor" value="${esc(X.mq)}" aria-label="Buscar material" style="min-width:min(300px,100%)"></div>`
      + (corpo || '<div class="empty-card"><h2>Nenhuma obra liberada</h2><p>Peça ao administrador para liberar as obras do seu setor.</p></div>');
  };

  function statsForn(ids) {
    const m = {};
    S.entregas.forEach(e => {
      const p = by('pedidos', e.pedidoId); if (!p || !ids.includes(p.obraId) || p.status === 'cancelado') return;
      const k = p.fornecedorId || '?', x = m[k] = m[k] || { id: k, nome: nm('fornecedores', k, 'Sem fornecedor'), n: 0, rec: 0, prazo: 0, atr: 0, maxAtr: 0, reag: 0, abertos: 0, obras: new Set(), itensVenc: 0 };
      x.n++; x.reag += reagN(e); x.obras.add(p.obraId);
      if (e.status === 'recebido') { x.rec++; if (!reagN(e) && (!e.dataPrevista || !e.dataChegada || e.dataChegada <= e.dataPrevista)) x.prazo++; }
      else { x.abertos++; if (isLate(e)) { x.atr++; x.maxAtr = Math.max(x.maxAtr, dayDiff(today(), e.dataPrevista)); } }
    });
    const nomes = S.obras.filter(o => ids.includes(o.id)).flatMap(nomesObra);
    S.painel_pedidos.forEach(r => { if (!nomes.includes(r.obra) || situacaoLinha(r).k !== 'atr') return; const f = S.fornecedores.find(f => fz(f.nome) === fz(r.fornecedor)); const k = f ? f.id : 'p:' + r.fornecedor; const x = m[k] = m[k] || { id: k, nome: f ? f.nome : (r.fornecedor || 'Sem fornecedor'), n: 0, rec: 0, prazo: 0, atr: 0, maxAtr: 0, reag: 0, abertos: 0, obras: new Set(), itensVenc: 0 }; x.itensVenc++; const o = obraDaLinha(r); if (o) x.obras.add(o.id); });
    return Object.values(m).map(x => Object.assign(x, { pont: x.rec ? pct(x.prazo, x.rec) : null, nObras: x.obras.size }));
  }
  views.garg = function () {
    const obras = obrasSel(), ids = obras.map(o => o.id);
    const F = statsForn(ids).filter(x => x.atr || x.itensVenc || x.reag >= 2).sort((a, b) => (b.atr * 3 + b.itensVenc + b.reag) - (a.atr * 3 + a.itensVenc + a.reag));
    const late = S.entregas.filter(e => { const p = by('pedidos', e.pedidoId); return p && ids.includes(p.obraId) && isLate(e) && p.status !== 'cancelado'; }).map(e => ({ e, p: by('pedidos', e.pedidoId), d: dayDiff(today(), e.dataPrevista), _click: ['ver-ped', e.pedidoId] })).sort((a, b) => b.d - a.d);
    const mx = Math.max(1, ...F.map(x => x.atr * 3 + x.itensVenc + x.reag));
    return cab('Gargalos', 'Onde as compras estão travando: fornecedores com entregas atrasadas, itens com previsão vencida e muitas reprogramações.', `${btnXls('garg_e', 'Entregas atrasadas')}${btnPrint()}`)
      + escopoHtml()
      + `<div class="two"><section class="panel"><div class="sec-h"><h2>Entregas atrasadas</h2><span class="sub">${late.length} · mais antigas primeiro</span></div>${tabela('garg_e', [
          { l: 'Atraso', h: x => sem(x.d > 7 ? 'bad' : 'warn', x.d + ' d'), v: x => x.d, r: 1 },
          { l: 'Pedido', h: x => `<b>${esc(x.p.item)}</b><div class="muted" style="font-size:12px">${esc([x.p.pc, x.p.op].filter(Boolean).join(' · '))}</div>`, v: x => x.p.item },
          { l: 'Obra', v: x => curtoObra(by('obras', x.p.obraId) || { nome: '' }) },
          { l: 'Fornecedor', v: x => nm('fornecedores', x.p.fornecedorId, '') },
          { l: 'Previsto', v: x => fdy(x.e.dataPrevista) },
          { l: 'Reprog.', v: x => reagN(x.e), r: 1 }
        ], late, 'Nenhuma entrega atrasada. Bom sinal.')}</section>
        <section class="panel"><div class="sec-h"><h2>Por fornecedor</h2><span class="sub">peso: atrasos, itens vencidos e reprogramações</span></div><div class="rows">${F.slice(0, 12).map(x => `<div class="rrow"><div class="rt"><b>${esc(x.nome)}</b><span class="mono muted">${x.atr} atrasada(s) · ${x.itensVenc} item(ns) vencido(s) · ${x.reag} reprog.</span></div>${bar((x.atr * 3 + x.itensVenc + x.reag) / mx * 100, x.atr ? 'bad' : 'warn')}</div>`).join('') || '<p class="muted" style="margin:0">Nenhum fornecedor travando as obras selecionadas.</p>'}</div></section></div>`;
  };

  views.div = function () {
    const obras = obrasSel(), ids = obras.map(o => o.id);
    let L = divergencias().filter(d => ids.includes(d.obraId));
    if (X.dq) L = L.filter(d => matchQ(fz([d.titulo, d.detalhe, d.forn, d.nf].join(' ')), X.dq));
    const pm = new Map(S.pendencias.map(p => [p.id, p]));
    const pode = FB.colOk('pendencias') && edita('div');
    const por = {}; L.forEach(d => por[d.tipo] = (por[d.tipo] || 0) + 1);
    return cab('Divergências', 'Itens que chegaram diferente do pedido (a mais, a menos, sem quantidade) e notas sem pedido ligado. Vire pendência para o setor resolver.', `${btnXls('div', 'Divergências')}${btnPrint()}`)
      + escopoHtml()
      + `<div class="kpis" style="margin-bottom:16px">${['Recebido a mais', 'Faltou parte (parcial vencido)', 'Recebido sem quantidade pedida', 'Nota sem pedido ligado'].map(k => kpi(k, por[k] || 0, '', por[k] ? 'warn' : 'ok')).join('')}</div>
      <section class="panel"><div class="sec-h"><h2>${L.length} divergência(s)</h2><input class="f" type="search" data-sxf="dq" placeholder="Buscar item, NF, fornecedor" value="${esc(X.dq)}" aria-label="Buscar divergência"></div>${tabela('div', [
        { l: 'Tipo', h: d => sem(d.tone, d.tipo), v: d => d.tipo },
        { l: 'Item', h: d => `<b>${esc(d.item)}</b><div class="muted" style="font-size:12px">${esc(d.pedido)}</div>`, v: d => d.item },
        { l: 'Obra', v: d => curtoObra(by('obras', d.obraId) || { nome: '' }) },
        { l: 'Fornecedor', v: d => d.forn || '' },
        { l: 'Pedido', v: d => d.qtd, r: 1 }, { l: 'Recebido', v: d => d.rec, r: 1 }, { l: 'Diferença', v: d => d.dif === '' ? '' : (d.dif > 0 ? '+' : '') + d.dif, r: 1 },
        { l: 'NF', v: d => d.nf || '' },
        { l: 'Pendência', h: d => { const p = pm.get('div_' + d.id); return p ? sem(p.status === 'concluida' ? 'ok' : 'acc', p.status === 'concluida' ? 'Resolvida' : 'Com ' + (p.dono || setorNome(p.setor))) : (pode ? `<button class="btn sm" data-sx="assumir" data-id="div_${esc(d.id)}">Assumir</button>` : '—'); }, v: d => { const p = pm.get('div_' + d.id); return p ? (p.status === 'concluida' ? 'Resolvida' : 'Com ' + (p.dono || setorNome(p.setor))) : 'Sem dono'; } }
      ], L, 'Nenhuma divergência nas obras selecionadas.')}</section>`;
  };

  views.forn = function () {
    const ids = obrasSel().map(o => o.id);
    const F = statsForn(ids).filter(x => x.n || x.itensVenc).sort((a, b) => (a.pont ?? 101) - (b.pont ?? 101) || b.atr - a.atr);
    const tone = x => x.pont === null ? 'muted' : x.pont >= 80 && !x.atr ? 'ok' : x.pont >= 50 ? 'warn' : 'bad';
    return cab('Fornecedores', 'Pontualidade de cada fornecedor nas obras selecionadas: entregas no prazo (sem reprogramação e chegando até a data prometida), atrasos agora e reprogramações.', `${btnXls('forn', 'Fornecedores')}${btnPrint()}`)
      + escopoHtml()
      + `<section class="panel"><div class="sec-h"><h2>${F.length} fornecedor(es)</h2><span class="sub">menos pontuais primeiro</span></div>${tabela('forn', [
        { l: 'Situação', h: x => sem(tone(x), x.pont === null ? 'Sem histórico' : x.pont + '% no prazo'), v: x => x.pont === null ? 'Sem histórico' : x.pont + '%' },
        { l: 'Fornecedor', h: x => `<b>${esc(x.nome)}</b>`, v: x => x.nome },
        { l: 'Entregas', v: x => x.n, r: 1 }, { l: 'Recebidas', v: x => x.rec, r: 1 }, { l: 'No prazo', v: x => x.prazo, r: 1 },
        { l: 'Em aberto', v: x => x.abertos, r: 1 }, { l: 'Atrasadas agora', v: x => x.atr, r: 1 }, { l: 'Maior atraso', v: x => x.maxAtr ? x.maxAtr + ' d' : '—', r: 1 },
        { l: 'Reprogramações', v: x => x.reag, r: 1 }, { l: 'Itens vencidos (Receb.)', v: x => x.itensVenc, r: 1 }, { l: 'Obras', v: x => x.nObras, r: 1 }
      ], F, 'Sem entregas registradas nas obras selecionadas.')}</section>`;
  };

  views.dir = function () {
    const obras = obrasSel(), P = todasPend();
    const cards = obras.map(o => {
      const st = obraStats(o), rows = linhasObra(o), ok = rows.filter(rowDone).length, venc = rows.filter(r => situacaoLinha(r).k === 'atr').length;
      const pa = P.filter(x => x.obraId === o.id && x.status !== 'concluida').length, oc = S.ocorrencias.filter(x => x.obraId === o.id && x.status !== 'resolvida').length;
      const bp = st.orc ? pctF(st.fat, st.orc) : 0, mat = rows.length ? pct(ok, rows.length) : st.pct;
      const risco = st.atrasos >= 3 || bp > 100 || venc >= 20 ? 'bad' : st.atrasos || venc || bp > 90 ? 'warn' : 'ok';
      return { o, st, rows: rows.length, ok, venc, pa, oc, bp, mat, risco };
    });
    TAB.dir = { cols: [{ l: 'Obra', v: c => c.o.nome }, { l: 'Risco', v: c => ({ ok: 'Baixo', warn: 'Atenção', bad: 'Alto' }[c.risco]) }, { l: 'Material recebido %', v: c => c.mat }, { l: 'Itens recebidos', v: c => c.ok + '/' + c.rows }, { l: 'Itens vencidos', v: c => c.venc }, { l: 'Entregas atrasadas', v: c => c.st.atrasos }, { l: 'Budget do contrato', v: c => c.st.orc }, { l: 'Consumido (NF)', v: c => r2(c.st.fat) }, { l: 'Consumido %', v: c => c.bp }, { l: 'Em pedidos', v: c => r2(c.st.comp) }, { l: 'Pendências abertas', v: c => c.pa }, { l: 'Ocorrências abertas', v: c => c.oc }], rows: cards };
    const T = k => cards.reduce((a, c) => a + (typeof k === 'function' ? k(c) : c[k]), 0);
    return cab('Painel da Diretoria', 'Uma linha por obra: material, budget, atrasos e pendências, com o risco em semáforo.', `${btnXls('dir', 'Diretoria')}${btnPrint()}`)
      + escopoHtml()
      + `<div class="kpis" style="margin-bottom:18px">${kpi('Obras acompanhadas', cards.length, '')}${kpi('Em risco alto', cards.filter(c => c.risco === 'bad').length, 'atrasos, budget ou itens vencidos', cards.some(c => c.risco === 'bad') ? 'bad' : 'ok')}${kpi('Material recebido', (T('rows') ? pct(T('ok'), T('rows')) : 0) + '%', `${T('ok')} de ${T('rows')} itens`)}${kpi('Entregas atrasadas', T(c => c.st.atrasos), '', T(c => c.st.atrasos) ? 'bad' : 'ok')}${kpi('Pendências abertas', T('pa'), '')}${kpi('Budget consumido', brlK(T(c => c.st.fat)), 'de ' + brlK(T(c => c.st.orc)))}</div>
      <div class="sx-dir">${cards.map(c => `<section class="panel sx-dc"><div class="sec-h"><h2>${esc(c.o.nome)}</h2>${sem(c.risco, { ok: 'Risco baixo', warn: 'Atenção', bad: 'Risco alto' }[c.risco])}</div><div class="rows" style="padding:0 16px 16px">
        <div class="rrow"><div class="rt"><b>Material recebido</b><span class="mono muted">${c.ok}/${c.rows} itens · ${c.mat}%</span></div>${bar(c.mat, c.mat === 100 ? 'ok' : '')}</div>
        <div class="rrow"><div class="rt"><b>Budget consumido</b><span class="mono muted">${c.st.orc ? brl2(c.st.fat) + ' de ' + brl2(c.st.orc) + ' · ' + pctTxt(c.bp) + '%' : 'sem budget cadastrado'}</span></div>${bar(c.bp, c.bp > 100 ? 'bad' : c.bp > 90 ? 'warn' : '')}</div>
        <div class="sx-nums"><span><b>${c.st.atrasos}</b> entregas atrasadas</span><span><b>${c.venc}</b> itens com previsão vencida</span><span><b>${c.st.reag}</b> reprogramações</span><span><b>${c.pa}</b> pendências</span><span><b>${c.oc}</b> ocorrências</span></div>
        ${FB.pagOk('obras') ? `<div><button class="btn sm" data-act="open-obra" data-id="${esc(c.o.id)}">Abrir obra ${ic('arrow', 13)}</button></div>` : ''}</div></section>`).join('') || '<p class="muted">Nenhuma obra.</p>'}</div>`;
  };

  views.ocor = function () {
    const ids = obrasSel().map(o => o.id);
    let L = S.ocorrencias.filter(x => ids.includes(x.obraId));
    if (X.osit === 'abertas') L = L.filter(x => x.status !== 'resolvida'); else if (X.osit === 'resolvidas') L = L.filter(x => x.status === 'resolvida');
    if (X.oq) L = L.filter(x => matchQ(fz([x.tipo, x.desc, x.por].join(' ')), X.oq));
    L.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    const pode = edita('ocor');
    return cab('Ocorrências da obra', 'A obra avisa o que aconteceu (falta de material, material danificado, medida errada) com foto. Cada ocorrência vira uma pendência para Compras.', `${btnXls('ocor', 'Ocorrências')}${pode ? `<button class="btn pri w" data-sx="nova-ocor">${ic('plus')} Registrar ocorrência</button>` : ''}`)
      + escopoHtml()
      + `<section class="panel"><div class="sec-h"><h2>${L.length} ocorrência(s)</h2><div class="filters"><input class="f" type="search" data-sxf="oq" placeholder="Buscar" value="${esc(X.oq)}" aria-label="Buscar ocorrência"><select class="f" data-sxf="osit" aria-label="Situação">${opts([['abertas', 'Abertas'], ['resolvidas', 'Resolvidas'], ['todas', 'Todas']], X.osit)}</select></div></div>${tabela('ocor', [
        { l: 'Situação', h: x => sem(x.status === 'resolvida' ? 'ok' : x.urg ? 'bad' : 'warn', x.status === 'resolvida' ? 'Resolvida' : x.urg ? 'Urgente' : 'Aberta'), v: x => x.status === 'resolvida' ? 'Resolvida' : x.urg ? 'Urgente' : 'Aberta' },
        { l: 'Quando', v: x => x.criadoEm ? new Date(x.criadoEm).toLocaleDateString('pt-BR') : '' },
        { l: 'Obra', v: x => curtoObra(by('obras', x.obraId) || { nome: '' }) },
        { l: 'Tipo', v: x => x.tipo || '' },
        { l: 'O que aconteceu', h: x => `${esc(x.desc || '')}${(x.anexos || []).length ? '<div style="margin-top:4px">' + anexLinks(x.anexos) + '</div>' : ''}`, v: x => x.desc || '' },
        { l: 'Registrado por', v: x => (x.por || '') + (x.setor ? ' · ' + setorNome(x.setor) : '') },
        { l: '', h: x => pode ? (x.status === 'resolvida' ? `<button class="btn sm" data-sx="ocor-st" data-id="${esc(x.id)}" data-v="aberta">Reabrir</button>` : `<button class="btn sm pri" data-sx="ocor-st" data-id="${esc(x.id)}" data-v="resolvida">${ic('check', 13)} Resolvida</button>`) : '', v: () => '', noX: true }
      ], L, 'Nenhuma ocorrência registrada.')}</section>`;
  };

  /* ---------- detalhe: linha do tempo do pedido e itens do Recebimento ---------- */
  function linhaTempo(p) {
    const ev = [], e = entOf(p.id);
    if (p.inicioCotacao) ev.push([p.inicioCotacao, 'Cotação iniciada', '']);
    if (p.createdAt) ev.push([iso(new Date(p.createdAt)), 'Pedido cadastrado no Pyro', PSTAT[p.status] || '']);
    (e && e.reagend || []).forEach(r => ev.push([r.em || '', 'Data reprogramada', `${fdy(r.de)} → ${fdy(r.para)}${r.motivo ? ' · ' + r.motivo : ''}`]));
    (e && e.cobrancas || []).forEach(c => ev.push([String(c.em || '').slice(0, 10), 'Fornecedor cobrado', c.obs || c.canal || '']));
    if (e && e.dataPrevista && e.status !== 'recebido') ev.push([e.dataPrevista, 'Previsão de chegada', isLate(e) ? 'atrasada' : quando(e.dataPrevista)]);
    (e && e.recebimentos || []).forEach(r => ev.push([r.data || '', 'Recebimento registrado', [r.nf ? 'NF ' + r.nf : '', r.obs || ''].filter(Boolean).join(' · ')]));
    if (e && e.status === 'recebido' && e.dataChegada && !(e.recebimentos || []).length) ev.push([e.dataChegada, 'Chegou', e.nf ? 'NF ' + e.nf : '']);
    S.nfs.filter(n => n.pedidoId === p.id && !nfDup(n)).forEach(n => ev.push([n.emissao || n.chegada || '', 'Nota fiscal ' + (n.numero || ''), brl2(n.valor)]));
    ev.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return `<ol class="sx-tl">${ev.map(x => `<li${x[0] > today() ? ' class="fut"' : ''}><span class="mono">${x[0] ? fdy(x[0]) : '—'}</span><b>${esc(x[1])}</b>${x[2] ? `<span class="muted">${esc(x[2])}</span>` : ''}</li>`).join('') || '<li>Sem eventos registrados.</li>'}</ol>`;
  }
  function verPedido(pid) {
    const p = by('pedidos', pid); if (!p) return;
    const e = entOf(p.id), it = p.itens || [];
    modal(p.item || 'Pedido', `<div class="full"><p class="muted" style="margin:0 0 10px">${esc(nm('obras', p.obraId))} · ${esc(nm('fornecedores', p.fornecedorId, 'sem fornecedor'))}${p.pc ? ' · ' + esc(p.pc) : ''}${p.op ? ' · ' + esc(p.op) : ''}${p.erpPedido ? ' · ERP ' + esc(p.erpPedido) : ''}</p>
      <p style="margin:0 0 12px">${sem(p.status === 'recebido' ? 'ok' : e && isLate(e) ? 'bad' : 'acc', p.status === 'comprado' && e ? estLabel(e) : PSTAT[p.status] || p.status)} ${reagBadge(reagN(e), true)} ${flags(p)}</p>
      <h3 style="margin:8px 0 6px;font-size:14px">Linha do tempo</h3>${linhaTempo(p)}
      ${it.length ? `<h3 style="margin:14px 0 6px;font-size:14px">Itens (${it.length})</h3><div class="tablewrap"><table><thead><tr><th>Item</th><th class="r">Pedido</th><th class="r">Recebido</th></tr></thead><tbody>${it.slice(0, 80).map(i => `<tr><td>${esc([i.cod, i.desc, i.acab].filter(Boolean).join(' · '))}</td><td class="r mono">${esc(i.qtd)}</td><td class="r mono" style="${(+i.rec || 0) !== (+i.qtd || 0) ? 'color:var(--warn)' : ''}">${esc(i.rec || 0)}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true });
  }
  function verPainel(oid, pedido) {
    const o = by('obras', oid); if (!o) return;
    const rs = linhasObra(o).filter(r => pedidoChave(r) === pedido).sort((a, b) => rowOrdem(a) - rowOrdem(b));
    modal(pedido, `<div class="full"><p class="muted" style="margin:0 0 10px">${esc(o.nome)} · ${esc(rs[0] ? rs[0].fornecedor || '' : '')} · ${rs.filter(rowDone).length} de ${rs.length} itens recebidos</p>
      <div class="tablewrap"><table><thead><tr><th>Situação</th><th>Item</th><th class="r">Pedido</th><th class="r">Recebido</th><th>Previsão</th><th>NF</th></tr></thead><tbody>${rs.map(r => { const s = situacaoLinha(r); return `<tr><td>${sem(s.tone, s.txt)}</td><td>${esc([r.codigo, r.descricao, r.acabamento].filter(Boolean).join(' · '))}</td><td class="r mono">${esc(r.qtdePedida)}</td><td class="r mono">${r2(rowQtdRec(r))}</td><td>${r.previsaoChegada ? fdy(r.previsaoChegada) : '—'}</td><td class="mono">${esc((r.recebimentos || []).map(x => x.nf).filter(Boolean).join(', '))}</td></tr>`; }).join('')}</tbody></table></div></div>`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true });
  }
  function verPend(id) {
    const x = todasPend().find(p => p.id === id); if (!x) return;
    if (x.pedidoId && by('pedidos', x.pedidoId) && !x.historico) { verPedido(x.pedidoId); return; }
    if (x.painel && !x.historico) { verPainel(x.painel.obra, x.painel.pedido); return; }
    modal(x.titulo, `<div class="full"><p style="margin:0 0 8px">${sem(tonePend(x), x.status === 'concluida' ? 'Concluída' : 'Aberta')} <span class="pill muted">${esc(x.tipo || 'Manual')}</span></p>
      <p class="muted" style="margin:0 0 10px">${esc(nm('obras', x.obraId))}${x.detalhe ? ' · ' + esc(x.detalhe) : ''}</p>
      <p style="margin:0 0 6px"><b>Setor:</b> ${esc(setorNome(x.setor))} · <b>Dono:</b> ${esc(x.dono || 'sem dono')} · <b>Prazo:</b> ${x.prazo ? fdy(x.prazo) : '—'}</p>
      ${x.pedidoId && by('pedidos', x.pedidoId) ? `<h3 style="margin:12px 0 6px;font-size:14px">Pedido</h3>${linhaTempo(by('pedidos', x.pedidoId))}` : ''}
      <h3 style="margin:12px 0 6px;font-size:14px">Histórico</h3><ol class="sx-tl">${(x.historico || []).map(h => `<li><span class="mono">${new Date(h.em).toLocaleString('pt-BR').slice(0, 16)}</span><b>${esc(h.txt)}</b><span class="muted">${esc(h.por || '')}</span></li>`).join('') || '<li>Sem histórico.</li>'}</ol></div>`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true });
  }

  /* ---------- gravações ---------- */
  const hist = (x, txt) => (x.historico || []).concat([{ em: Date.now(), por: FB.nome, txt }]);
  async function gravaPend(base, campos, txt) {
    const o = Object.assign({}, base, campos);
    ['auto', 'assumida', 'tone', 'setores', 'painel', '_click'].forEach(k => delete o[k]);
    if (base.auto) { o.tipo = base.tipo; o.origem = 'auto'; }
    o.historico = hist(base, txt); o.atualizadoEm = Date.now();
    if (!o.criadoEm) { o.criadoEm = Date.now(); o.criadoPor = FB.nome; }
    await put('pendencias', o, false);
    toast(txt);
  }
  function acaoPend(act, id) {
    const x = todasPend().find(p => p.id === id); if (!x) return;
    if (act === 'assumir') return gravaPend(x, { dono: FB.nome, setor: FB.setor === 'admin' ? (x.setor || 'compras') : FB.setor }, 'Assumida por ' + FB.nome);
    if (act === 'concluir') return gravaPend(x, { status: 'concluida', concluidaEm: Date.now(), dono: x.dono || FB.nome }, 'Concluída por ' + FB.nome);
    if (act === 'reabrir') return gravaPend(x, { status: 'aberta' }, 'Reaberta por ' + FB.nome);
  }
  function novaPend() {
    const obras = obrasEscopo();
    const pessoas = [...new Set(EQUIPE.map(p => p.nome).filter(Boolean))].sort();
    modal('Nova pendência', `${fld('O que precisa ser feito', 'titulo', '', 'text', 'required', 'full')}
      ${fsel('Obra', 'obraId', obras.map(o => [o.id, o.nome]), X.obra || (obras[0] || {}).id)}
      ${fsel('Setor responsável', 'setor', Object.entries(FB.NOMES_SETOR), FB.setor === 'admin' ? 'compras' : FB.setor)}
      ${fsel('Dono', 'dono', pessoas.map(p => [p, p]), '', 'Sem dono por enquanto')}
      ${fld('Prazo', 'prazo', addDays(today(), 2), 'date')}
      <label class="fld full"><span>Detalhes</span><textarea name="detalhe" rows="3"></textarea></label>
      ${chk('Urgente', 'urg', false)}`, {
      submit: 'Criar pendência', onSubmit: async f => {
        if (!need(f, ['titulo', 'obraId'])) return false;
        const o = { id: 'pd' + uid(), titulo: val(f, 'titulo'), obraId: val(f, 'obraId'), setor: val(f, 'setor'), dono: val(f, 'dono'), prazo: val(f, 'prazo'), detalhe: val(f, 'detalhe'), urg: !!f.elements.urg.checked, status: 'aberta', tipo: 'Manual', origem: 'manual', criadoEm: Date.now(), criadoPor: FB.nome, historico: [{ em: Date.now(), por: FB.nome, txt: 'Criada por ' + FB.nome }] };
        await put('pendencias', o); toast('Pendência criada');
      }
    });
  }
  function novaOcor() {
    const obras = obrasEscopo();
    modal('Registrar ocorrência', `${fsel('Obra', 'obraId', obras.map(o => [o.id, o.nome]), X.obra || (obras[0] || {}).id, '', '', 'required')}
      ${fsel('Tipo', 'tipo', ['Falta de material', 'Material danificado', 'Medida ou item errado', 'Entrega fora do combinado', 'Atraso na obra', 'Outro'].map(x => [x, x]), 'Falta de material')}
      <label class="fld full"><span>O que aconteceu</span><textarea name="desc" rows="3" required placeholder="Ex.: chegaram 10 vidros, 2 trincados (pavimento 5)"></textarea></label>
      <label class="fld full"><span>Foto (pelo celular abre a câmera) ou PDF</span><input type="file" name="foto" accept="image/*,application/pdf" capture="environment"></label>
      ${chk('Urgente (trava a obra)', 'urg', false)}`, {
      submit: 'Registrar', onSubmit: async f => {
        if (!need(f, ['obraId', 'desc'])) return false;
        const anexos = [], arq = f.elements.foto.files[0];
        if (arq) { try { toast('Enviando foto…'); const AS = await window.claude.use('assets'); const r = await AS.upload(arq); anexos.push({ id: r.id, name: arq.name, size: r.sizeBytes, type: r.contentType }); } catch (e) { toast('Não foi possível enviar a foto'); return false; } }
        const o = { id: 'oc' + uid(), obraId: val(f, 'obraId'), tipo: val(f, 'tipo'), desc: val(f, 'desc'), urg: !!f.elements.urg.checked, anexos, status: 'aberta', por: FB.nome, setor: FB.setor, criadoEm: Date.now() };
        await put('ocorrencias', o);
        if (FB.colOk('pendencias')) await put('pendencias', { id: 'oc_' + o.id, titulo: `${o.tipo}: ${o.desc.slice(0, 80)}`, detalhe: 'Ocorrência registrada por ' + FB.nome, obraId: o.obraId, setor: 'compras', dono: '', prazo: o.urg ? today() : addDays(today(), 2), urg: o.urg, status: 'aberta', tipo: 'Ocorrência', origem: 'ocorrencia', ocorrenciaId: o.id, criadoEm: Date.now(), criadoPor: FB.nome, historico: [{ em: Date.now(), por: FB.nome, txt: 'Criada a partir de ocorrência' }] }, true);
        toast('Ocorrência registrada e enviada para Compras');
      }
    });
  }

  /* ---------- administrador: liberar obras para os setores ---------- */
  function obrasLibHtml() {
    if (FB.setor !== 'admin' || FB.claude) return '';
    const L = lib(), ob = sortNome(S.obras);
    return `<section class="panel" style="margin-top:6px"><div class="sec-h"><h2>Obras liberadas para os setores</h2><span class="sub">Compras e o administrador veem todas. Os demais setores só recebem do servidor os dados das obras liberadas aqui.</span></div>
      <div class="tablewrap"><table><thead><tr><th>Obra</th><th>Nomes no Recebimento</th><th class="r">Pedidos</th><th class="r">Itens do Receb.</th><th>Situação</th><th></th></tr></thead><tbody>${ob.map(o => { const on = L.ids.includes(o.id); return `<tr><td class="t">${esc(o.nome)}${o.status === 'concluida' ? ' <span class="pill muted">concluída</span>' : ''}</td><td class="muted" style="font-size:12.5px">${esc((o.aliases || []).join(', ') || '—')}</td><td class="r mono">${pedsObra(o).length}</td><td class="r mono">${linhasObra(o).length}</td>
        <td>${on ? sem('ok', 'Liberada') : sem('muted', 'Só Compras')}</td><td class="r"><button class="btn sm ${on ? '' : 'pri'}" data-sx="lib" data-id="${esc(o.id)}" data-v="${on ? '0' : '1'}">${ic(on ? 'lock' : 'unlock', 13)} ${on ? 'Bloquear' : 'Liberar para os setores'}</button></td></tr>`; }).join('')}</tbody></table></div></section>`;
  }
  function btnLib(o) {
    if (FB.setor !== 'admin' || FB.claude) return '';
    const on = lib().ids.includes(o.id);
    return `<button class="btn w ${on ? '' : 'pri'}" data-sx="lib" data-id="${esc(o.id)}" data-v="${on ? '0' : '1'}" title="${on ? 'Os setores veem esta obra. Clique para bloquear.' : 'Só Compras vê esta obra. Clique para liberar para os demais setores.'}">${ic(on ? 'unlock' : 'lock', 15)} ${on ? 'Liberada para os setores' : 'Liberar para os setores'}</button>`;
  }
  async function liberar(id, on) {
    const o = by('obras', id); if (!o) return;
    if (!on && !confirm(`Bloquear "${o.nome}" para os setores? Só Compras e o administrador continuam vendo.`)) return;
    const ids = lib().ids.filter(x => x !== id); if (on) ids.push(id);
    const nomes = [...new Set(S.obras.filter(x => ids.includes(x.id)).flatMap(nomesObra))];
    try { await FB.salvarAcessos(FB.pags(), { ids, nomes }); toast(on ? `${o.nome} liberada para os setores` : `${o.nome} bloqueada para os setores`); render(); }
    catch (e) { toast('Não foi possível salvar'); }
  }

  /* ---------- menu ---------- */
  function navHtml(nv, curto) {
    const itens = PAGS.filter(p => FB.pagOk(p)).filter(p => !curto || (restrito() ? ['hoje', 'pend', 'materiais', 'ocor'] : ['hoje']).includes(p)).map(p => nv(p, ICO[p], curto ? CURTO[p] : NOME[p])).join('');
    const ext = (window.PYRO_SX && PYRO_SX.extra || []).filter(x => x.ok() && (!curto || x.curto)).map(x => nv(x.v, x.ic, curto ? x.curto : x.nome)).join('');
    return (itens || ext) && !curto ? `<div class="lbl">Setores</div>${itens}${ext}` : itens + ext;
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-sx]'); if (!b) return;
    const a = b.dataset.sx, id = b.dataset.id;
    if (a === 'obra') { X.obra = id; render(); }
    else if (a === 'todas') { X.todas = !X.todas; X.obra = ''; render(); }
    else if (a === 'xls') excel(id, b.dataset.n || 'Pyro');
    else if (a === 'print') window.print();
    else if (a === 'mais') { X.pmax += 100; render(); }
    else if (a === 'assumir' || a === 'concluir' || a === 'reabrir') { ev.stopPropagation(); acaoPend(a, id); }
    else if (a === 'nova-pend') novaPend();
    else if (a === 'nova-ocor') novaOcor();
    else if (a === 'ver-pend') verPend(id);
    else if (a === 'ver-ped') verPedido(id);
    else if (a === 'ver-painel') { const [o, p] = id.split('§'); verPainel(o, p); }
    else if (a === 'ocor-st') { const x = S.ocorrencias.find(o => o.id === id); if (x) put('ocorrencias', Object.assign({}, x, { status: b.dataset.v, resolvidaEm: b.dataset.v === 'resolvida' ? Date.now() : null, resolvidaPor: FB.nome })).then(() => toast(b.dataset.v === 'resolvida' ? 'Ocorrência resolvida' : 'Ocorrência reaberta')); }
    else if (a === 'lib') liberar(id, b.dataset.v === '1');
  });
  let tq = null;
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t.dataset || !t.dataset.sxf) return;
    X[t.dataset.sxf] = t.value;
    if (t.tagName === 'SELECT') { render(); return; }
    clearTimeout(tq); tq = setTimeout(() => { const id = t.dataset.sxf; render(); const n = document.querySelector(`[data-sxf="${id}"]`); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } }, 250);
  });

  /* ---------- estilo ---------- */
  const st = document.createElement('style');
  st.textContent = `.sx-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;margin-right:6px;vertical-align:1px}
  .sx-atalhos{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
  .sx-pi{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}
  .sx-pi:last-child{border-bottom:0}
  .sx-pt{display:flex;flex-direction:column;gap:3px;text-align:left;background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;min-width:0}
  .sx-pt b{font-weight:600}.sx-pt .muted{font-size:12.5px}
  .sx-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .sx-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
  .sx-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;padding:0 16px 14px}
  .sx-dir{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:16px}
  .sx-nums{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:13px}.sx-nums b{font-family:var(--mono,monospace)}
  .sx-tl{list-style:none;margin:0;padding:0 0 0 14px;border-left:2px solid var(--line)}
  .sx-tl li{position:relative;display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 0 6px 6px;font-size:13.5px}
  .sx-tl li::before{content:'';position:absolute;left:-20px;top:11px;width:10px;height:10px;border-radius:50%;background:var(--acc)}
  .sx-tl li.fut::before{background:var(--line)}.sx-tl li .mono{min-width:84px;color:var(--muted)}
  @media (max-width:700px){.sx-pi{grid-template-columns:auto 1fr}.sx-pi>.sx-acts,.sx-pi>.btn{grid-column:2;justify-content:flex-start}}
  @media print{.side,.bottomnav,.topbar2,.badges,.filters,.sx-atalhos,footer,.wm,[data-sx="assumir"],[data-sx="concluir"],.sx-acts{display:none!important}.content{margin:0!important}}`;
  document.head.appendChild(st);

  /* ---------- dados próprios (pendências, ocorrências, equipe) ---------- */
  FB.ready.then(() => {
    /* o navegador pode ter colocado o e-mail do login na busca de Entregas: limpa */
    try { ['q'].forEach(k => { if (/@/.test(UI.E[k] || '')) { UI.E[k] = ''; saveUI(); scheduleRender(); } }); } catch (e) {}
    const ouvir = c => { if (!FB.colOk(c) || !FB.db) return; FB.db.collection(c).onSnapshot(s => { S[c] = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); scheduleRender(); }, () => {}); };
    ouvir('pendencias'); ouvir('ocorrencias');
    FB.ouvirEquipe(l => { EQUIPE = l; });
    if (FB.setor === 'admin') {
      let feito = false;
      const iv = setInterval(() => {
        if (feito || !LOADED.has('entregas') || !LOADED.has('pedidos')) return;
        feito = true; clearInterval(iv);
        FB.prepararEntregas(S.entregas, S.pedidos).then(n => { if (n) console.info('[pyro] obra gravada em', n, 'entrega(s)'); }, e => console.warn('[pyro] entregas', e));
      }, 2000);
    }
  });

  window.PYRO_SX = { nav: navHtml, obrasLibHtml, btnLib, autoPend, todasPend, divergencias, X, extra: [],
    h: { tabela, excel, sem, cab, btnXls, btnPrint, linhasObra, nomesObra, situacaoLinha, obrasEscopo, obrasSel, escopoHtml, curtoObra, quando, edita, setorNome, fz } };
})();
