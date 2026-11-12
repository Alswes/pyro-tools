/* ============================================================
   Pyro Tools (Firebase) · v0.8
   - Aprovações da Diretoria (cotações), ligar nota ao pedido, itens do XML da NF-e, relatório sem previsão
   - Entregas e Coletas com o Roteiro semanal dentro (aba)
   - Cotações (Compras)
   - Indicadores de compras (mês e ano; obras e uso e consumo)
   - Pedidos do ERP x notas fiscais (administrador)
   - Indicadores da Diretoria na Home (obras liberadas)
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || !window.PYRO_SX || PYRO_FB.claude) return;
  const FB = window.PYRO_FB, SX = window.PYRO_SX, H = SX.h;
  const Y = { entTab: '', cq: '', cst: 'abertos', cobra: '', ano: today().slice(0, 4), imes: '', iseg: '', mq: '', mst: '', msem: false, mmes: '' };
  S.cotacoes = S.cotacoes || []; S.erp_pedidos = S.erp_pedidos || [];
  Object.assign(ICONS, {
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.2-1.6M12 6.5v11"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    erp: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h8"/>'
  });
  Object.assign(TITLES, { cot: 'Cotações', aprov: 'Aprovações da Diretoria', ind: 'Indicadores de compras', erp: 'Pedidos do ERP' });
  SX.extra.push(
    { v: 'cot', ic: 'coin', nome: 'Cotações', curto: 'Cotações', ok: () => FB.pagOk('cot') },
    { v: 'aprov', ic: 'check', nome: 'Aprovações da Diretoria', curto: 'Aprovar', ok: () => FB.pagOk('aprov') },
    { v: 'ind', ic: 'trend', nome: 'Indicadores de compras', curto: '', ok: () => FB.pagOk('ind') },
    { v: 'erp', ic: 'erp', nome: 'Pedidos do ERP', curto: '', ok: () => FB.pagOk('erp') }
  );
  const usoConsumo = o => !!o && /uso interno|uso e consumo|consumo|empresa exemplo/i.test(o.nome || '');
  const ehUC = p => usoConsumo(by('obras', p.obraId));
  const mesNome = m => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][(+m || 1) - 1];
  const cotDe = pid => S.cotacoes.find(c => c.pedidoId === pid);
  let EQUIPE = [];

  /* ================= Budget como na planilha de controle ================= */
  /* obra com budget só de materiais (total = perfis + vidros + acessórios): serviços ficam fora do consumo */
  window.soMateriais = o => { if (!o) return false; const b = o.budgetCat || {}, soma = ['perfis', 'vidros', 'acessorios'].reduce((a, c) => a + (+b[c] || 0), 0); return soma > 0 && !(+b.outros) && Math.abs((+o.budgetTotal || 0) - soma) < 1; };
  if (typeof obraStats === 'function') {
    const os0 = obraStats;
    obraStats = function (o, f) {
      const st = os0(o, f); if (!o) return st;
      const mat = soMateriais(o), ok = p => !mat || p.categoria !== 'outros';
      const comp = st.ps.filter(p => (p.status === 'comprado' || p.status === 'recebido') && ok(p)).reduce((a, p) => a + valPed(p), 0) + (st.soltas || 0);
      st.fatNotas = st.fat; st.comp = comp; st.fat = comp; st.soMateriais = mat;
      return st;
    };
  }

  /* ================= Entregas e Coletas + Roteiro semanal ================= */
  const entOrig = views.entregas;
  views.entregas = function () {
    const real = FB.modoReal('entregas') !== 'oculta', rot = FB.pagOk('roteiro');
    let tab = Y.entTab || (real ? 'ped' : 'rot'); if (!real) tab = 'rot'; if (!rot) tab = 'ped';
    Y.tabAtual = tab;
    const tabs = real && rot ? `<div class="tabs" role="tablist" aria-label="Entregas e coletas" style="margin:0 0 6px"><button role="tab" aria-selected="${tab === 'ped'}" data-y="enttab" data-v="ped">${ic('truck', 15)} Pedidos em entrega e coleta</button><button role="tab" aria-selected="${tab === 'rot'}" data-y="enttab" data-v="rot">${ic('clock', 15)} Roteiro semanal</button></div>` : '';
    if (tab === 'rot') return `<div class="head"><div><p class="eyebrow">Recebimento e Logística</p><h1>Entregas e Coletas</h1></div><div class="badges"><a class="btn w" href="entregas.html" target="_blank" rel="noopener">${ic('ext', 14)} Abrir o roteiro em tela cheia</a></div></div>${tabs}<div id="rotSlot" style="height:calc(100vh - 240px);min-height:480px"></div>`;
    return tabs + entOrig();
  };
  let ROT = null;
  function rotHost() {
    const slot = document.getElementById('rotSlot'), on = UI.view === 'entregas' && Y.tabAtual === 'rot' && !!slot;
    if (!ROT && !on) return;
    if (!ROT) {
      ROT = document.createElement('div'); ROT.id = 'rotHost';
      ROT.style.cssText = 'position:fixed;z-index:24;display:none;border:1px solid var(--line);border-radius:18px;overflow:hidden;background:var(--surface)';
      ROT.innerHTML = '<iframe title="Roteiro semanal de entregas e coletas" src="entregas.html?embed=1" style="width:100%;height:100%;border:0;display:block"></iframe>';
      document.body.appendChild(ROT);
    }
    if (!on) { ROT.style.display = 'none'; return; }
    const r = slot.getBoundingClientRect(), bn = document.querySelector('.bottomnav'), bh = bn && getComputedStyle(bn).display !== 'none' ? bn.getBoundingClientRect().height : 0;
    Object.assign(ROT.style, { display: 'block', left: Math.max(0, r.left) + 'px', width: r.width + 'px', top: Math.max(0, r.top) + 'px', bottom: (8 + bh) + 'px' });
  }
  if (typeof recHost === 'function') { const rh = recHost; recHost = function () { rh(); try { rotHost(); } catch (e) {} }; }
  addEventListener('resize', () => { try { rotHost(); } catch (e) {} });
  addEventListener('scroll', () => { try { if (ROT && ROT.style.display === 'block') rotHost(); } catch (e) {} }, { passive: true });

  /* ================= Cotações ================= */
  const ABERTOS = ['cotacao', 'analise', 'aprov_obra', 'aprov_int'];
  const pillCot = c => !c ? '' : c.status === 'aprovada' ? `<span class="pill ok">aprovada${c.aprovadaSetor === 'diretoria' ? ' pela Diretoria' : ''}</span>` : c.status === 'aguardando' ? '<span class="pill warn">aguardando a Diretoria</span>' : c.status === 'reprovada' ? `<span class="pill bad" title="${esc(c.motivo || '')}">reprovada</span>` : '';
  views.cot = function () {
    const pode = H.edita('cot');
    let L = S.pedidos.filter(p => p.status !== 'cancelado' && !p.demo);
    if (Y.cst === 'abertos') L = L.filter(p => ABERTOS.includes(p.status));
    else if (Y.cst === 'com') L = L.filter(p => cotDe(p.id));
    else if (Y.cst === 'aprov') L = L.filter(p => (cotDe(p.id) || {}).status === 'aprovada');
    else if (Y.cst === 'aguard') L = L.filter(p => ['aguardando', 'reprovada'].includes((cotDe(p.id) || {}).status));
    if (Y.cobra === '_uc') L = L.filter(ehUC); else if (Y.cobra) L = L.filter(p => p.obraId === Y.cobra);
    if (Y.cq) L = L.filter(p => matchQ(H.fz([p.item, p.pc, p.op, p.erpPedido, nm('obras', p.obraId, ''), nm('fornecedores', p.fornecedorId, '')].join(' ')), Y.cq));
    L.sort((a, b) => ABERTOS.indexOf(b.status) - ABERTOS.indexOf(a.status) || String(a.inicioCotacao || '').localeCompare(String(b.inicioCotacao || '')));
    const abertos = S.pedidos.filter(p => ABERTOS.includes(p.status)).length, comCot = S.cotacoes.filter(c => c.status !== 'aprovada').length, aprov = S.cotacoes.filter(c => c.status === 'aprovada' && (c.aprovadaEm || 0) > Date.now() - 30 * 864e5).length;
    const tab = H.tabela('cot', [
      { l: 'Pedido', h: p => `<div class="t">${esc(p.item || '—')}</div><div class="s">${esc([p.pc, p.op, p.erpPedido ? 'ERP ' + p.erpPedido : ''].filter(Boolean).join(' · '))}</div>`, v: p => p.item, x: p => [p.item, p.pc, p.op].filter(Boolean).join(' · ') },
      { l: 'Obra', h: p => `${esc(H.curtoObra(by('obras', p.obraId) || { nome: '—' }))}${ehUC(p) ? ' <span class="pill muted">uso e consumo</span>' : ''}`, v: p => nm('obras', p.obraId, '') },
      { l: 'Status', h: p => `<span class="pill ${p.status === 'comprado' || p.status === 'recebido' ? 'ok' : 'warn'}">${esc(PSTAT[p.status] || p.status)}</span>${p.inicioCotacao && ABERTOS.includes(p.status) ? `<div class="s">desde ${fd(p.inicioCotacao)}</div>` : ''}`, v: p => PSTAT[p.status] || p.status },
      { l: 'Cotações', h: p => { const c = cotDe(p.id), op = (c && c.opcoes || []).filter(o => +o.valor > 0); if (!op.length) return '<span class="muted">nenhuma</span>'; const m = Math.min(...op.map(o => +o.valor)); return `<b>${op.length}</b> · menor ${brl2(m)}`; }, v: p => ((cotDe(p.id) || {}).opcoes || []).filter(o => +o.valor > 0).length },
      { l: 'Escolhida', h: p => { const c = cotDe(p.id), o = c && c.opcoes && c.opcoes[c.escolhida]; if (!o) return '—'; return `<div class="t">${esc(o.fornecedor || nm('fornecedores', o.fornecedorId, ''))}</div><div class="s">${brl2(o.valor)}${o.prazo ? ' · entrega ' + fd(o.prazo) : ''}${o.faturamento ? ' · ' + esc(o.faturamento) : ''}</div>${pillCot(c)}`; }, v: p => { const c = cotDe(p.id), o = c && c.opcoes && c.opcoes[c.escolhida]; return o ? (o.fornecedor || nm('fornecedores', o.fornecedorId, '')) + ' · ' + brl2(o.valor) : ''; } },
      { l: '', h: p => `<span class="acts" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm ${pode && ABERTOS.includes(p.status) ? 'pri' : ''}" data-y="cot" data-id="${esc(p.id)}">${ic(pode ? 'edit' : 'eye', 13)} ${pode ? 'Cotações' : 'Ver'}</button>${((cotDe(p.id) || {}).opcoes || []).length ? `<button class="btn sm" data-y="cotmail" data-id="${esc(p.id)}" title="Enviar o comparativo para a Diretoria ou para a obra">${ic('mail', 13)} E-mail</button>` : ''}</span>${(() => { const c = cotDe(p.id); return c && c.enviadaEm ? `<div class="s muted" style="text-align:right">enviada à ${c.enviadaPara === 'obra' ? 'obra' : c.enviadaPara === 'diretoria' ? 'Diretoria' : 'pessoa'} em ${fd(iso(new Date(c.enviadaEm)))}</div>` : ''; })()}`, v: () => '', noX: true }
    ], L, 'Nenhum pedido com esses filtros.', 80);
    return H.cab('Cotações', 'Registre três ou mais cotações por pedido (preço, prazo de entrega e faturamento) e marque a escolhida. Ao aprovar, o pedido passa para Comprado e o painel inteiro é atualizado com o fornecedor, o valor e a previsão de entrega.', `${H.btnXls('cot', 'Cotações')}`)
      + `<div class="kpis" style="margin-bottom:16px">${kpi('Pedidos em cotação', abertos, 'cotação, análise ou aprovação', abertos ? 'warn' : 'ok')}${kpi('Cotações em andamento', comCot, 'registradas, ainda sem aprovação')}${kpi('Aguardando a Diretoria', S.cotacoes.filter(c => c.status === 'aguardando').length, 'enviadas para aprovação', S.cotacoes.some(c => c.status === 'aguardando') ? 'warn' : '')}${kpi('Reprovadas', S.cotacoes.filter(c => c.status === 'reprovada').length, 'voltaram para Compras rever', S.cotacoes.some(c => c.status === 'reprovada') ? 'bad' : '')}${kpi('Aprovadas em 30 dias', aprov, 'viraram compra')}</div>`
      + `<section class="panel"><div class="sec-h"><h2>${L.length} pedido(s)</h2><div class="filters"><input class="f" type="search" data-yf="cq" placeholder="Buscar item, PC, OP, ERP" value="${esc(Y.cq)}" aria-label="Buscar pedido">
        <select class="f" data-yf="cst" aria-label="Situação">${opts([['abertos', 'Em cotação'], ['com', 'Com cotação registrada'], ['aguard', 'Na Diretoria ou reprovada'], ['aprov', 'Cotação aprovada'], ['todos', 'Todos os pedidos']], Y.cst)}</select>
        <select class="f" data-yf="cobra" aria-label="Obra">${opts([['_uc', 'Uso e consumo']].concat(sortNome(S.obras).map(o => [o.id, o.nome])), Y.cobra, 'Todas as obras')}</select></div></div>${tab}</section>
      <p class="muted" style="font-size:12.5px;margin:0">Cotações de Uso e consumo vão para a aprovação da Diretoria antes de virar compra. As de obra podem ser aprovadas por Compras ou enviadas à Diretoria.</p>`;
  };
  const FATS = ['À vista', 'Boleto 28 dias', '28 ddl', '30/60/90 ddl', '28/56 ddl', 'Cartão', 'PIX'];
  function linhaCot(o, i, esc_ch) {
    const fs = sortNome(S.fornecedores), outro = !o.fornecedorId && !!o.fornecedor;
    return `<div class="cotrow" data-cot style="display:grid;grid-template-columns:auto minmax(150px,1.4fr) 120px 140px minmax(120px,1fr) minmax(120px,1fr) auto;gap:8px;align-items:center;margin-bottom:8px">
      <label title="Cotação escolhida" style="display:flex;align-items:center;gap:4px"><input type="radio" name="escolhida" value="${i}" ${esc_ch === i ? 'checked' : ''} style="width:17px;height:17px;accent-color:var(--accent)"></label>
      <span style="display:flex;flex-direction:column;gap:4px"><select class="f c-forn" aria-label="Fornecedor da cotação ${i + 1}">${opts(fs.map(f => [f.id, f.nome]).concat([['__outro', 'Outro (não cadastrado)']]), outro ? '__outro' : (o.fornecedorId || ''), 'Fornecedor…')}</select><input class="f c-outro" type="text" placeholder="Nome do fornecedor" value="${esc(outro ? o.fornecedor : '')}" ${outro ? '' : 'hidden'}></span>
      <input class="f c-val" type="text" inputmode="decimal" placeholder="Valor R$" value="${o.valor ? esc(String(o.valor).replace('.', ',')) : ''}" aria-label="Valor">
      <input class="f c-prazo" type="date" value="${esc(o.prazo || '')}" aria-label="Prazo de entrega" title="Prazo de entrega">
      <input class="f c-fat" type="text" list="cotFats" placeholder="Faturamento" value="${esc(o.faturamento || '')}" aria-label="Opção de faturamento">
      <input class="f c-obs" type="text" placeholder="Observação" value="${esc(o.obs || '')}" aria-label="Observação">
      <button type="button" class="btn sm ghost" data-delcot aria-label="Remover esta cotação">${ic('x', 13)}</button></div>`;
  }
  function abrirCotacoes(pid) {
    const p = by('pedidos', pid); if (!p) return;
    const pode = H.edita('cot'), c = cotDe(pid) || { id: 'cot_' + pid, pedidoId: pid, obraId: p.obraId, opcoes: [], escolhida: -1, status: 'em_cotacao' };
    const op = c.opcoes && c.opcoes.length ? c.opcoes : [{}, {}, {}];
    const cab = `<div class="full"><b>${esc(p.item || 'Pedido')}</b><div class="muted">${esc(nm('obras', p.obraId))} · ${esc([p.pc, p.op].filter(Boolean).join(' · '))} · ${esc(PSTAT[p.status] || p.status)}${p.valor ? ' · valor atual ' + brl2(p.valor) : ''}</div>${(p.itens || []).length ? `<div class="s muted" style="margin-top:4px">${(p.itens || []).length} item(ns): ${esc((p.itens || []).slice(0, 4).map(i => (i.qtd || '') + ' ' + (i.desc || i.cod || '')).join('; '))}${(p.itens || []).length > 4 ? '…' : ''}</div>` : ''}</div>`;
    if (!pode) {
      modal('Cotações', cab + `<div class="full tablewrap"><table><thead><tr><th></th><th>Fornecedor</th><th class="r">Valor</th><th>Entrega</th><th>Faturamento</th><th>Obs.</th></tr></thead><tbody>${(c.opcoes || []).map((o, i) => `<tr><td>${i === c.escolhida ? '<span class="pill ok">escolhida</span>' : ''}</td><td>${esc(o.fornecedor || nm('fornecedores', o.fornecedorId, ''))}</td><td class="r mono">${brl2(o.valor)}</td><td>${o.prazo ? fdy(o.prazo) : '—'}</td><td>${esc(o.faturamento || '')}</td><td>${esc(o.obs || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nenhuma cotação registrada.</td></tr>'}</tbody></table></div>`, { submit: 'Fechar', onSubmit: () => {}, wide: true, extra: (c.opcoes || []).length ? `<button type="button" class="btn" data-y="cotmail" data-id="${esc(pid)}" style="margin-right:auto">${ic('mail', 14)} Enviar por e-mail</button>` : '' });
      return;
    }
    const f = modal('Cotações do pedido', cab + `<div class="sect">Cotações · marque a bolinha da escolhida</div>
      <div class="full" style="overflow-x:auto"><div style="min-width:900px"><div class="s muted" style="display:grid;grid-template-columns:auto minmax(150px,1.4fr) 120px 140px minmax(120px,1fr) minmax(120px,1fr) auto;gap:8px;margin-bottom:4px;font-size:11.5px"><span>Escolhida</span><span>Fornecedor</span><span>Valor total (R$)</span><span>Prazo de entrega</span><span>Faturamento</span><span>Observação</span><span></span></div>
      <div id="cotRows">${op.map((o, i) => linhaCot(o, i, c.escolhida)).join('')}</div></div></div>
      <datalist id="cotFats">${FATS.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <div class="full"><button type="button" class="btn sm" data-addcot>${ic('plus', 13)} Adicionar cotação</button></div>
      <label class="fld full" style="margin-top:6px"><span>Ao salvar</span><select name="acao">${opts([['salvar', 'Só salvar as cotações'], ['aprov', 'Enviar para aprovação da Diretoria']].concat(podeAprovarDireto(p) ? [['aprovar', 'Aprovar agora: o pedido vira Comprado com o fornecedor, o valor e o prazo da escolhida']] : []), c.status === 'aguardando' ? 'aprov' : 'salvar')}</select></label>
      ${ehUC(p) && FB.setor !== 'admin' ? '<div class="full s muted">Uso e consumo: a compra só é feita depois da aprovação da Diretoria.</div>' : ''}
      ${c.status === 'aguardando' ? `<div class="full s" style="color:var(--warn)">Enviada para a Diretoria em ${new Date(c.aguardandoEm || Date.now()).toLocaleString('pt-BR').slice(0, 16)} por ${esc(c.aguardandoPor || '')}. Aguardando a decisão.</div>` : ''}
      ${c.status === 'reprovada' ? `<div class="full banner" style="margin:0"><span><b>Reprovada pela Diretoria</b> (${esc(c.reprovadaPor || '')}): ${esc(c.motivo || 'sem motivo informado')}. Revise e envie de novo.</span></div>` : ''}
      ${c.status === 'aprovada' ? `<div class="full s" style="color:var(--ok)">Aprovada em ${new Date(c.aprovadaEm).toLocaleString('pt-BR').slice(0, 16)} por ${esc(c.aprovadaPor || '')}.</div>` : ''}`,
      { submit: 'Salvar cotações', wide: true, extra: `<button type="button" class="btn" data-cotsend style="margin-right:auto">${ic('mail', 14)} Salvar e enviar por e-mail</button>`, onSubmit: async f => {
        const rows = [...f.querySelectorAll('[data-cot]')].map(r => { const fs = r.querySelector('.c-forn').value; return { fornecedorId: fs && fs !== '__outro' ? fs : '', fornecedor: fs === '__outro' ? r.querySelector('.c-outro').value.trim() : nm('fornecedores', fs, ''), valor: num(r.querySelector('.c-val').value), prazo: r.querySelector('.c-prazo').value, faturamento: r.querySelector('.c-fat').value.trim(), obs: r.querySelector('.c-obs').value.trim() }; });
        const ch = f.querySelector('input[name=escolhida]:checked'); let esc_i = ch ? +ch.value : -1;
        const keep = []; let novoEsc = -1;
        rows.forEach((o, i) => { if (o.fornecedorId || o.fornecedor || o.valor) { if (i === esc_i) novoEsc = keep.length; keep.push(o); } });
        const acao = f.elements.acao.value, aprovar = acao === 'aprovar', enviar = acao === 'aprov';
        if (aprovar || enviar) {
          const o = keep[novoEsc];
          if (!o) { toast('Marque a cotação escolhida antes de ' + (aprovar ? 'aprovar' : 'enviar')); return false; }
          if (enviar && keep.filter(x => +x.valor > 0).length < 3 && !confirm('Há menos de 3 cotações com valor. Enviar assim mesmo para a Diretoria?')) return false;
          if (!o.fornecedorId) { toast('Para ' + (aprovar ? 'aprovar' : 'enviar') + ', o fornecedor precisa estar cadastrado. Peça ao administrador para cadastrar ' + (o.fornecedor || 'o fornecedor') + '.'); return false; }
          if (!o.valor) { toast('Informe o valor da cotação escolhida'); return false; }
        }
        const doc = Object.assign({}, c, { opcoes: keep, escolhida: novoEsc, obraId: p.obraId, atualizadoEm: Date.now(), atualizadoPor: FB.nome });
        doc.resumo = resumoPed(p);
        if (aprovar) Object.assign(doc, { status: 'aprovada', aprovadaEm: Date.now(), aprovadaPor: FB.nome, aprovadaSetor: FB.setor, aplicada: true });
        else if (enviar) Object.assign(doc, { status: 'aguardando', aguardandoEm: Date.now(), aguardandoPor: FB.nome, motivo: '' });
        else if (doc.status !== 'aprovada' && doc.status !== 'aguardando') doc.status = 'em_cotacao';
        await put('cotacoes', doc);
        if (aprovar) {
          const o = keep[novoEsc];
          await aplicarAprovacao(doc);
          toast('Cotação aprovada: pedido Comprado com ' + nm('fornecedores', o.fornecedorId) + ' · ' + brl2(o.valor));
        } else if (enviar) {
          if (['cotacao', 'analise'].includes(p.status)) await put('pedidos', Object.assign({}, p, { status: 'aprov_int', updatedAt: Date.now() }), true);
          toast('Enviada para a aprovação da Diretoria');
        } else toast('Cotações salvas');
        if (f._enviar) setTimeout(() => abrirEmail(pid), 60);
      } });
    f.addEventListener('click', ev => { if (ev.target.closest('[data-cotsend]')) { f._enviar = true; f.requestSubmit ? f.requestSubmit() : f.querySelector('button[type=submit]').click(); } });
    f.addEventListener('click', ev => {
      if (ev.target.closest('[data-addcot]')) { const box = f.querySelector('#cotRows'), n = box.querySelectorAll('[data-cot]').length; box.insertAdjacentHTML('beforeend', linhaCot({}, n, -1)); return; }
      const d = ev.target.closest('[data-delcot]'); if (d) { d.closest('[data-cot]').remove(); f.querySelectorAll('#cotRows input[name=escolhida]').forEach((r, i) => r.value = i); }
    });
    f.addEventListener('change', ev => { if (ev.target.classList.contains('c-forn')) { const o = ev.target.parentNode.querySelector('.c-outro'); o.hidden = ev.target.value !== '__outro'; if (!o.hidden) o.focus(); } });
  }

  /* ================= Aprovação da Diretoria ================= */
  const podeAprovarDireto = p => FB.setor === 'admin' || (H.edita('cot') && !ehUC(p));
  const resumoPed = p => ({ item: p.item || '', pc: [p.pc, p.op, p.erpPedido ? 'ERP ' + p.erpPedido : ''].filter(Boolean).join(' · '), obra: nm('obras', p.obraId, ''), categoria: p.categoria || '', uc: ehUC(p), valorAtual: +p.valor || 0, itens: (p.itens || []).length });
  /* aplica a cotação aprovada no pedido: Comprado, fornecedor, valor e previsão de entrega */
  async function aplicarAprovacao(c) {
    const p = by('pedidos', c.pedidoId), o = c.opcoes && c.opcoes[c.escolhida];
    if (!p || !o || !o.fornecedorId) return false;
    await put('pedidos', Object.assign({}, p, { fornecedorId: o.fornecedorId, valor: o.valor, status: 'comprado', faturamento: o.faturamento || p.faturamento || '', cotacaoId: c.id, cotacaoAprovadaEm: today(), aprovadoPor: c.aprovadaPor || FB.nome, updatedAt: Date.now() }));
    const e = entOf(p.id);
    if (e && e.status !== 'recebido') { if (o.prazo) await put('entregas', Object.assign({}, e, { dataPrevista: o.prazo })); }
    else if (!e) await put('entregas', { id: 'rce_' + p.id, pedidoId: p.id, obraId: p.obraId, tipo: 'entrega', status: 'producao', dataPrevista: o.prazo || '', reagend: [], criadoEm: Date.now() });
    return true;
  }
  /* a Diretoria aprova uma obra que ela não vê (ex.: uso e consumo): Compras ou o administrador aplicam no pedido ao abrir o Pyro */
  const aplicando = new Set();
  async function aplicarPendentes() {
    if (!(FB.setor === 'admin' || H.edita('cot'))) return;
    for (const c of S.cotacoes.filter(c => c.status === 'aprovada' && c.aplicada === false && !aplicando.has(c.id))) {
      aplicando.add(c.id);
      try { if (await aplicarAprovacao(c)) { await put('cotacoes', Object.assign({}, c, { aplicada: true, aplicadaEm: Date.now(), aplicadaPor: FB.nome }), true); toast('Aprovação da Diretoria aplicada: ' + ((c.resumo || {}).item || 'pedido') + ' virou Comprado'); } } catch (e) { console.warn('[pyro] aplicar aprovação', e); }
    }
  }
  const aguardando = () => S.cotacoes.filter(c => c.status === 'aguardando').sort((a, b) => (a.aguardandoEm || 0) - (b.aguardandoEm || 0));
  function cartaoAprov(c, pode) {
    const p = by('pedidos', c.pedidoId), R = p ? resumoPed(p) : (c.resumo || {}), op = (c.opcoes || []).map((o, i) => Object.assign({ i }, o)).filter(o => o.fornecedor || o.fornecedorId || o.valor);
    const vals = op.filter(o => +o.valor > 0).map(o => +o.valor), menor = vals.length ? Math.min(...vals) : 0;
    const dias = c.aguardandoEm ? Math.floor((Date.now() - c.aguardandoEm) / 864e5) : 0;
    return `<section class="panel aprov-card" data-aprovcard="${esc(c.id)}"><div class="sec-h"><div><h2 style="margin:0">${esc(R.item || 'Pedido')}</h2><div class="s muted">${esc([R.obra, R.pc].filter(Boolean).join(' · '))}${R.uc ? ' · <span class="pill muted">uso e consumo</span>' : ''}</div></div><span class="sub">enviada por ${esc(c.aguardandoPor || '—')} ${dias ? 'há ' + dias + ' dia(s)' : 'hoje'}</span></div>
      <div class="tablewrap"><table><thead><tr><th></th><th>Fornecedor</th><th class="r">Valor</th><th>Entrega</th><th>Faturamento</th><th>Obs.</th></tr></thead><tbody>${op.map(o => `<tr><td><label style="display:flex;gap:6px;align-items:center"><input type="radio" name="ap_${esc(c.id)}" value="${o.i}" ${o.i === c.escolhida ? 'checked' : ''} ${pode ? '' : 'disabled'} style="width:17px;height:17px;accent-color:var(--accent)">${o.i === c.escolhida ? '<span class="pill ok">sugerida</span>' : ''}</label></td><td class="t">${esc(o.fornecedor || nm('fornecedores', o.fornecedorId, ''))}${o.fornecedorId ? '' : ' <span class="pill warn" title="Compras precisa cadastrar o fornecedor">sem cadastro</span>'}</td><td class="r mono">${brl2(o.valor)}${+o.valor === menor && vals.length > 1 ? '<div class="s" style="color:var(--ok)">menor preço</div>' : menor && +o.valor > menor ? `<div class="s muted">+${pctTxt(pctF(+o.valor - menor, menor))}%</div>` : ''}</td><td>${o.prazo ? fdy(o.prazo) : '—'}</td><td>${esc(o.faturamento || '')}</td><td class="s">${esc(o.obs || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Sem cotações registradas.</td></tr>'}</tbody></table></div>
      ${pode ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px"><label class="fld" style="flex:1;min-width:220px;margin:0"><span>Observação (obrigatória para reprovar)</span><input class="f" type="text" data-apobs="${esc(c.id)}" placeholder="Ex.: negociar prazo, pedir mais uma cotação"></label><button type="button" class="btn pri" data-ap="ok" data-id="${esc(c.id)}">${ic('check', 14)} Aprovar a marcada</button><button type="button" class="btn" data-ap="no" data-id="${esc(c.id)}">${ic('x', 14)} Reprovar</button></div>` : ''}</section>`;
  }
  views.aprov = function () {
    const pode = H.edita('aprov'), L = aguardando();
    const dec = S.cotacoes.filter(c => (c.status === 'aprovada' && c.aprovadaSetor) || c.status === 'reprovada').map(c => Object.assign({ _em: c.status === 'aprovada' ? c.aprovadaEm : c.reprovadaEm }, c)).filter(c => (c._em || 0) > Date.now() - 60 * 864e5).sort((a, b) => b._em - a._em).slice(0, 40);
    const tot = L.reduce((a, c) => a + (+((c.opcoes || [])[c.escolhida] || {}).valor || 0), 0);
    return H.cab('Aprovações da Diretoria', 'Cotações que Compras enviou para aprovação. Marque a opção que vale (a sugerida já vem marcada) e aprove: o pedido vira Comprado com esse fornecedor, valor e prazo. Ao reprovar, escreva o motivo: a cotação volta para Compras.', '')
      + `<div class="kpis" style="margin-bottom:16px">${kpi('Aguardando aprovação', L.length, L.length ? 'valor sugerido ' + brlK(tot) : 'nada pendente', L.length ? 'warn' : 'ok')}${kpi('Aprovadas em 60 dias', dec.filter(c => c.status === 'aprovada').length, 'pela Diretoria')}${kpi('Reprovadas em 60 dias', dec.filter(c => c.status === 'reprovada').length, 'voltaram para Compras')}</div>`
      + (L.length ? L.map(c => cartaoAprov(c, pode)).join('') : '<div class="empty-card"><h2>Nenhuma cotação aguardando</h2><p>Quando Compras enviar uma cotação para aprovação, ela aparece aqui e na Home.</p></div>')
      + (dec.length ? `<section class="panel"><div class="sec-h"><h2>Decididas nos últimos 60 dias</h2></div><div class="tablewrap"><table><thead><tr><th>Data</th><th>Pedido</th><th>Decisão</th><th>Fornecedor e valor</th><th>Observação</th></tr></thead><tbody>${dec.map(c => { const o = (c.opcoes || [])[c.escolhida] || {}, R = c.resumo || {}; return `<tr><td class="mono">${fdy(iso(new Date(c._em)))}</td><td><div class="t">${esc(R.item || nm('pedidos', c.pedidoId, ''))}</div><div class="s">${esc(R.obra || '')}</div></td><td>${c.status === 'aprovada' ? `<span class="pill ok">aprovada</span><div class="s">${esc(c.aprovadaPor || '')}${c.aplicada === false ? ' · aguardando Compras aplicar' : ''}</div>` : `<span class="pill bad">reprovada</span><div class="s">${esc(c.reprovadaPor || '')}</div>`}</td><td>${esc(o.fornecedor || nm('fornecedores', o.fornecedorId, ''))}<div class="s mono">${brl2(o.valor)}</div></td><td class="s">${esc(c.status === 'reprovada' ? c.motivo || '' : c.obsDir || '')}</td></tr>`; }).join('')}</tbody></table></div></section>` : '');
  };
  async function decidir(id, ok, box) {
    const c = S.cotacoes.find(x => x.id === id); if (!c || c.status !== 'aguardando') { toast('Esta cotação já foi decidida'); return; }
    const obs = ((box && box.querySelector(`[data-apobs="${CSS.escape(id)}"]`)) || {}).value || '';
    if (!ok) {
      if (!obs.trim()) { toast('Escreva o motivo da reprovação'); const i = box && box.querySelector('[data-apobs]'); if (i) i.focus(); return; }
      await put('cotacoes', Object.assign({}, c, { status: 'reprovada', reprovadaEm: Date.now(), reprovadaPor: FB.nome, motivo: obs.trim() }));
      toast('Cotação reprovada: volta para Compras'); return;
    }
    const r = box && box.querySelector(`input[name="ap_${CSS.escape(id)}"]:checked`), i = r ? +r.value : c.escolhida, o = (c.opcoes || [])[i];
    if (!o) { toast('Marque a opção que vai aprovar'); return; }
    if (!o.fornecedorId) { toast('Esse fornecedor ainda não está cadastrado. Peça a Compras para cadastrar antes de aprovar.'); return; }
    if (!confirm(`Aprovar ${o.fornecedor || nm('fornecedores', o.fornecedorId)} por ${brl2(o.valor)}?`)) return;
    const doc = Object.assign({}, c, { escolhida: i, status: 'aprovada', aprovadaEm: Date.now(), aprovadaPor: FB.nome, aprovadaSetor: FB.setor === 'admin' ? 'admin' : 'diretoria', obsDir: obs.trim(), aplicada: false });
    await put('cotacoes', doc);
    let ap = false; if (by('pedidos', c.pedidoId)) { try { ap = await aplicarAprovacao(doc); } catch (e) {} }
    if (ap) await put('cotacoes', Object.assign({}, doc, { aplicada: true, aplicadaEm: Date.now(), aplicadaPor: FB.nome }), true);
    toast(ap ? 'Aprovada: o pedido virou Comprado' : 'Aprovada. Compras aplica no pedido ao abrir o Pyro');
  }
  /* aviso na Home e no Painel da Diretoria */
  function avisoAprov() {
    if (!FB.pagOk('aprov') || !H.edita('aprov')) return '';
    const n = aguardando().length; if (!n) return '';
    return `<div class="banner" style="margin-bottom:14px"><span><b>${n} cotação(ões) aguardando a sua aprovação.</b></span><button type="button" class="btn sm pri" data-y="goaprov">Abrir aprovações</button></div>`;
  }
  if (views.dir) { const dirOrig = views.dir; views.dir = function () { return avisoAprov() + dirOrig(); }; }
  /* ---------- e-mail da cotação (Diretoria ou obra) ---------- */
  const MODELO_PADRAO = { assunto: 'Cotação para aprovação · {pedido} · {obra}', corpo: 'Olá,\n\nSegue o comparativo de cotações do pedido {pedido} ({pc}), obra {obra}, para aprovação.\n\n{tabela}\n\nCotação sugerida: {escolhida}\n\nFico no aguardo da aprovação para seguir com a compra.\n\nObrigado,\n{meu_nome}\nCompras' };
  const modeloAtual = () => { try { const m = JSON.parse(localStorage.getItem('pyro_cot_modelo') || 'null'); if (m && m.assunto != null && m.corpo != null) return m; } catch (e) {} return Object.assign({}, MODELO_PADRAO); };
  function camposCot(p, c) {
    const op = (c.opcoes || []).filter(o => o.fornecedor || o.fornecedorId || o.valor);
    const lin = (o, i) => `${i + 1}) ${o.fornecedor || nm('fornecedores', o.fornecedorId, 'Fornecedor')} — ${brl2(o.valor)}${o.prazo ? ' — entrega ' + fdy(o.prazo) : ''}${o.faturamento ? ' — ' + o.faturamento : ''}${o.obs ? ' — ' + o.obs : ''}${i === c.escolhida ? '  (escolhida)' : ''}`;
    const e = c.opcoes && c.opcoes[c.escolhida];
    return { pedido: p.item || 'pedido', pc: [p.pc, p.op, p.erpPedido ? 'ERP ' + p.erpPedido : ''].filter(Boolean).join(' · ') || 's/ nº', obra: nm('obras', p.obraId, ''), tabela: op.map(lin).join('\n') || '(sem cotações)', escolhida: e ? `${e.fornecedor || nm('fornecedores', e.fornecedorId, '')} — ${brl2(e.valor)}${e.prazo ? ', entrega ' + fdy(e.prazo) : ''}${e.faturamento ? ', ' + e.faturamento : ''}` : 'a definir', meu_nome: FB.nome || '', setor: FB.NOMES_SETOR[FB.setor] || '', data: fdy(today()) };
  }
  const preencher = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);
  function abrirEmail(pid) {
    const p = by('pedidos', pid), c = cotDe(pid); if (!p || !c) { toast('Salve as cotações antes de enviar'); return; }
    const o = by('obras', p.obraId) || {}, v = camposCot(p, c);
    const dir = EQUIPE.filter(x => x.setor === 'diretoria' && x.email).map(x => x.email);
    const obra = (o.responsaveis || []).filter(x => x.email).map(x => x.email);
    let M = modeloAtual();
    const f = modal('Enviar cotação por e-mail', `<div class="full"><span class="muted">Para</span><div class="filters" style="margin-top:6px"><button type="button" class="chip" data-para="diretoria" aria-pressed="true">Diretoria</button><button type="button" class="chip" data-para="obra" aria-pressed="false">Obra (${esc(H.curtoObra(o))})</button><button type="button" class="chip" data-para="outro" aria-pressed="false">Outra pessoa</button></div></div>
      ${fld('E-mail(s) de destino', 'para', dir.join(', '), 'text', 'placeholder="nome@empresa.com.br, separe por vírgula"', 'full')}
      <div class="full s muted" id="emDica">${dir.length ? '' : 'Nenhum e-mail da Diretoria cadastrado em Usuários: digite o e-mail acima.'}</div>
      ${fld('Assunto', 'assunto', preencher(M.assunto, v), 'text', '', 'full')}
      <label class="fld full"><span>Mensagem</span><textarea name="corpo" rows="12" style="font:13px/1.5 var(--f-mono,monospace)">${esc(preencher(M.corpo, v))}</textarea></label>
      <details class="full"><summary style="cursor:pointer;font-weight:600">Editar o modelo padrão (vale para as próximas cotações)</summary>
        <p class="s muted" style="margin:8px 0">Campos automáticos: {pedido} {pc} {obra} {tabela} {escolhida} {meu_nome} {setor} {data}. O modelo fica salvo neste navegador.</p>
        ${fld('Assunto do modelo', 'mAssunto', M.assunto, 'text', '', 'full')}
        <label class="fld full"><span>Texto do modelo</span><textarea name="mCorpo" rows="10" style="font:13px/1.5 var(--f-mono,monospace)">${esc(M.corpo)}</textarea></label>
        <div class="badges" style="margin-top:8px"><button type="button" class="btn sm pri" data-mod="salvar">Salvar modelo e aplicar</button><button type="button" class="btn sm" data-mod="padrao">Voltar ao modelo padrão</button></div></details>`,
      { submit: 'Abrir no e-mail', extra: `<button type="button" class="btn" data-emcopy style="margin-right:auto">${ic('copy', 14)} Copiar texto</button>`, wide: true, onSubmit: async f => {
        const para = val(f, 'para'); if (!para) { toast('Informe o e-mail de destino'); return false; }
        const a = document.createElement('a'); a.href = 'mailto:' + para.replace(/[\s;]+/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '') + '?subject=' + encodeURIComponent(val(f, 'assunto')) + '&body=' + encodeURIComponent(f.elements.corpo.value);
        document.body.appendChild(a); a.click(); a.remove();
        if (H.edita('cot')) await put('cotacoes', Object.assign({}, c, { enviadaPara: f._para || 'diretoria', enviadaPara_email: para, enviadaEm: Date.now(), enviadaPor: FB.nome, status: c.status === 'aprovada' ? 'aprovada' : 'enviada' }), true);
        toast('E-mail aberto no seu programa de e-mail');
      } });
    f._para = 'diretoria';
    f.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-para]');
      if (b) { f._para = b.dataset.para; f.querySelectorAll('[data-para]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); const lst = f._para === 'diretoria' ? dir : f._para === 'obra' ? obra : []; f.elements.para.value = lst.join(', '); f.querySelector('#emDica').textContent = f._para !== 'outro' && !lst.length ? (f._para === 'obra' ? 'A obra não tem e-mail de responsável cadastrado: digite o e-mail acima.' : 'Nenhum e-mail da Diretoria cadastrado em Usuários: digite o e-mail acima.') : ''; if (f._para === 'outro') f.elements.para.focus(); return; }
      const m = ev.target.closest('[data-mod]');
      if (m) { M = m.dataset.mod === 'padrao' ? Object.assign({}, MODELO_PADRAO) : { assunto: f.elements.mAssunto.value, corpo: f.elements.mCorpo.value };
        try { if (m.dataset.mod === 'padrao') localStorage.removeItem('pyro_cot_modelo'); else localStorage.setItem('pyro_cot_modelo', JSON.stringify(M)); } catch (e) {}
        f.elements.mAssunto.value = M.assunto; f.elements.mCorpo.value = M.corpo; f.elements.assunto.value = preencher(M.assunto, v); f.elements.corpo.value = preencher(M.corpo, v); toast(m.dataset.mod === 'padrao' ? 'Modelo padrão restaurado' : 'Modelo salvo'); return; }
      if (ev.target.closest('[data-emcopy]')) { try { await navigator.clipboard.writeText('Assunto: ' + val(f, 'assunto') + '\n\n' + f.elements.corpo.value); toast('Texto copiado'); } catch (e) { f.elements.corpo.select(); toast('Selecione e copie o texto'); } }
    });
  }

  /* ================= Indicadores de compras ================= */
  const refCompra = p => p.cotacaoAprovadaEm || p.inicioCotacao || (p.createdAt ? iso(new Date(p.createdAt)) : '');
  views.ind = function () {
    const ano = Y.ano, seg = Y.iseg, mesF = +Y.imes || 0; /* v0.16.1: mês escolhido (0 = o ano todo) */
    const okP = p => !p.demo && (p.status === 'comprado' || p.status === 'recebido') && (!seg || (seg === 'uc') === ehUC(p));
    const okN = n => !nfDup(n) && !n.semFinanceiro && (!seg || (seg === 'uc') === usoConsumo(by('obras', n.obraId)));
    const ps = S.pedidos.filter(p => okP(p) && refCompra(p).slice(0, 4) === ano);
    const ns = S.nfs.filter(n => okN(n) && (n.emissao || n.chegada || '').slice(0, 4) === ano);
    const M = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, comp: 0, n: 0, fat: 0, nfs: 0, uc: 0, ob: 0 }));
    ps.forEach(p => { const m = M[+refCompra(p).slice(5, 7) - 1]; if (!m) return; const v = valPed(p); m.comp += v; m.n++; if (ehUC(p)) m.uc += v; else m.ob += v; });
    ns.forEach(n => { const m = M[+(n.emissao || n.chegada).slice(5, 7) - 1]; if (!m) return; m.fat += +n.valor || 0; m.nfs++; });
    const totAno = k => M.reduce((a, x) => a + x[k], 0), tot = k => mesF ? M[mesF - 1][k] : totAno(k), noPer = d => !mesF || +String(d || '').slice(5, 7) === mesF, perTxt = mesF ? mesNome(mesF) + '/' + ano : ano, noQ = mesF ? 'no mês' : 'no ano';
    const psP = ps.filter(p => noPer(refCompra(p))), nsP = ns.filter(n => noPer(n.emissao || n.chegada));
    const mesAt = ano === today().slice(0, 4) ? +today().slice(5, 7) : 12;
    const cur = M[(mesF || mesAt) - 1], ant = M[(mesF || mesAt) - 2];
    const varPct = ant && ant.comp ? Math.round((cur.comp - ant.comp) / ant.comp * 100) : null;
    const entAno = S.entregas.filter(e => e.status === 'recebido' && (e.dataChegada || '').slice(0, 4) === ano && noPer(e.dataChegada) && (() => { const p = by('pedidos', e.pedidoId); return p && (!seg || (seg === 'uc') === ehUC(p)); })());
    const noPrazo = entAno.filter(e => !(e.reagend || []).length && (!e.dataPrevista || e.dataChegada <= e.dataPrevista)).length;
    const mx = Math.max(1, ...M.map(x => Math.max(x.comp, x.fat)));
    const porObra = {}; psP.forEach(p => { const k = p.obraId || '-'; const x = porObra[k] = porObra[k] || { id: k, nome: nm('obras', k, 'Sem obra'), comp: 0, n: 0, fat: 0 }; x.comp += valPed(p); x.n++; });
    nsP.forEach(n => { const k = n.obraId || '-'; const x = porObra[k] = porObra[k] || { id: k, nome: nm('obras', k, 'Sem obra'), comp: 0, n: 0, fat: 0 }; x.fat += +n.valor || 0; });
    const porForn = {}; psP.forEach(p => { const k = p.fornecedorId || '-'; const x = porForn[k] = porForn[k] || { nome: nm('fornecedores', k, 'Sem fornecedor'), comp: 0, n: 0 }; x.comp += valPed(p); x.n++; });
    const anos = [...new Set(S.pedidos.map(p => refCompra(p).slice(0, 4)).concat(S.nfs.map(n => (n.emissao || n.chegada || '').slice(0, 4))).filter(a => /^\d{4}$/.test(a)).concat([today().slice(0, 4)]))].sort().reverse();
    const grafico = `<div class="ind-chart" role="img" aria-label="Comprado e faturado por mês em ${ano}">${M.map(x => `<div class="ic-col${mesF === x.m ? ' on' : ''}${mesF && mesF !== x.m ? ' off' : ''}" data-y="imes" data-v="${mesF === x.m ? '' : x.m}" role="button" tabindex="0" style="cursor:pointer" title="${mesF === x.m ? 'Clique para voltar ao ano todo · ' : 'Clique para filtrar · '}${mesNome(x.m)}: comprado ${brl2(x.comp)} (${x.n} pedidos) · faturado ${brl2(x.fat)} (${x.nfs} notas)"><div class="ic-bars"><i class="c1" style="height:${x.comp / mx * 100}%"></i><i class="c2" style="height:${x.fat / mx * 100}%"></i></div><span>${mesNome(x.m)}</span></div>`).join('')}</div>
      <div class="ic-leg"><span><i class="c1"></i>Comprado (pedidos)</span><span><i class="c2"></i>Faturado (notas fiscais)</span></div>`;
    SX.h.tabela('ind_obra', [{ l: 'Obra', v: x => x.nome }, { l: 'Pedidos', v: x => x.n }, { l: 'Comprado', v: x => r2(x.comp) }, { l: 'Faturado', v: x => r2(x.fat) }], Object.values(porObra), '');
    return H.cab('Indicadores de compras', 'Quanto foi comprado e faturado por mês e no ano, separando obras e uso e consumo. Comprado = pedidos que viraram compra (data da aprovação da cotação ou do início da cotação). Faturado = notas fiscais pela data de emissão.', `${H.btnXls('ind', 'Compras por mês')}${H.btnPrint()}`)
      + `<div class="filters" style="margin-bottom:14px"><select class="f" data-yf="ano" aria-label="Ano">${opts(anos.map(a => [a, a]), ano)}</select><select class="f" data-yf="imes" aria-label="Mês">${opts(Array.from({ length: 12 }, (_, i) => [String(i + 1), mesNome(i + 1).replace(/^./, c => c.toUpperCase())]), String(mesF || ''), 'Todos os meses')}</select>
        <button class="chip" data-y="iseg" data-v="" aria-pressed="${!seg}">Tudo</button><button class="chip" data-y="iseg" data-v="ob" aria-pressed="${seg === 'ob'}">Obras</button><button class="chip" data-y="iseg" data-v="uc" aria-pressed="${seg === 'uc'}">Uso e consumo</button></div>
      <div class="kpis" style="margin-bottom:18px">${kpi('Comprado ' + noQ, brlK(tot('comp')), `${tot('n')} pedido(s)${mesF ? ' · ' + perTxt : ''}`)}${kpi('Faturado ' + noQ, brlK(tot('fat')), `${tot('nfs')} nota(s)`)}${kpi(mesF ? 'Comprado no ano' : 'Comprado em ' + mesNome(mesAt), mesF ? brlK(totAno('comp')) : brlK(cur.comp), mesF ? (varPct === null ? `${totAno('n')} pedido(s) em ${ano}` : `${perTxt}: ${varPct >= 0 ? '+' : ''}${varPct}% sobre ${mesNome(mesF - 1)}`) : varPct === null ? `${cur.n} pedido(s)` : `${varPct >= 0 ? '+' : ''}${varPct}% sobre ${mesNome(mesAt - 1)}`, !mesF && varPct > 30 ? 'warn' : '')}${kpi('Ticket médio', tot('n') ? brlK(tot('comp') / tot('n')) : '—', 'por pedido ' + noQ)}${kpi('Obras x uso e consumo', tot('comp') ? Math.round(tot('ob') / tot('comp') * 100) + '% / ' + Math.round(tot('uc') / tot('comp') * 100) + '%' : '—', brlK(tot('ob')) + ' / ' + brlK(tot('uc')))}${kpi('Entregas no prazo', entAno.length ? pct(noPrazo, entAno.length) + '%' : '—', `${noPrazo} de ${entAno.length} recebidas ${noQ}`)}</div>
      <section class="panel" style="margin-bottom:18px"><div class="sec-h"><h2>Por mês · ${ano}</h2><span class="sub">clique num mês para filtrar</span></div><div style="padding:0 16px 16px">${grafico}</div>
      ${H.tabela('ind', [{ l: 'Mês', v: x => mesNome(x.m) + '/' + ano }, { l: 'Pedidos', v: x => x.n, r: 1 }, { l: 'Comprado', h: x => brl2(x.comp), v: x => r2(x.comp), r: 1 }, { l: 'Obras', h: x => brl2(x.ob), v: x => r2(x.ob), r: 1 }, { l: 'Uso e consumo', h: x => brl2(x.uc), v: x => r2(x.uc), r: 1 }, { l: 'Notas', v: x => x.nfs, r: 1 }, { l: 'Faturado', h: x => brl2(x.fat), v: x => r2(x.fat), r: 1 }], M.filter(x => x.n || x.nfs || x.m <= mesAt), '')}</section>
      <div class="two"><section class="panel"><div class="sec-h"><h2>Por obra · ${perTxt}</h2>${H.btnXls('ind_obra', 'Compras por obra')}</div><div class="rows">${Object.values(porObra).sort((a, b) => b.comp - a.comp).map(x => `<div class="rrow"><div class="rt"><b>${esc(x.nome)}</b><span class="mono muted">${brl2(x.comp)} · ${x.n} ped. · fat. ${brl2(x.fat)}</span></div>${bar(tot('comp') ? x.comp / tot('comp') * 100 : 0)}</div>`).join('') || `<p class="muted" style="margin:0">Sem compras ${noQ}.</p>`}</div></section>
      <section class="panel"><div class="sec-h"><h2>Maiores fornecedores · ${perTxt}</h2></div><div class="rows">${Object.values(porForn).sort((a, b) => b.comp - a.comp).slice(0, 10).map(x => `<div class="rrow"><div class="rt"><b>${esc(x.nome)}</b><span class="mono muted">${brl2(x.comp)} · ${x.n} ped.</span></div>${bar(tot('comp') ? x.comp / tot('comp') * 100 : 0)}</div>`).join('') || `<p class="muted" style="margin:0">Sem compras ${noQ}.</p>`}</div></section></div>`;
  };

  /* ================= Pedidos do ERP (administrador) ================= */
  const KN = v => String(v ?? '').replace(/\D/g, '').replace(/^0+/, '');
  function notasDoErp(num) {
    const k = KN(num); if (!k) return [];
    const peds = S.pedidos.filter(p => String(p.erpPedido || '').split(/[^0-9]+/).map(KN).includes(k)).map(p => p.id);
    const vistos = new Set();
    return S.nfs.filter(n => (String(n.erpPedido || '').split(/[^0-9]+/).map(KN).includes(k) || peds.includes(n.pedidoId)))
      .filter(n => { const c = (n.fornecedorId || '') + '|' + KN(n.numero); if (vistos.has(c)) return false; vistos.add(c); return true; });
  }
  SX.notasDoErp = notasDoErp;
  /* nome fantasia do fornecedor: coluna da planilha, apelido anotado, cadastro do Pyro ou a razão social encurtada */
  const KF = t => H.fz(t).replace(/[^a-z0-9]/g, '');
  const DESCR = /^(ltda|eireli|me|epp|s\/?a|sa|cia|comercio|comercial|industria|industrial|distribuidora|distribuicao|importadora|importacao|exportacao|esquadrias|aluminio|aluminios|vidros|vidracaria|metais|metalurgica|projetos|solucoes|servicos|acessorios|representacoes|materiais|construcao|ferragens|tintas|plasticos|borrachas|e|de|do|da|dos|das|em)$/;
  function fantasiaDe(m) {
    if (m.fantasia) return m.fantasia;
    const raz = m.fornecedor || ''; if (!raz) return '';
    const kr = KF(raz), cad = S.fornecedores.find(f => { const k = KF(f.nome); if (k.length >= 4 && kr.startsWith(k)) return true; const p = KF(String(f.nome || '').split(/[\s(]/)[0]); return p.length >= 5 && kr.startsWith(p); });
    if (cad) return cad.nome;
    const ws = raz.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean), out = [];
    for (const w of ws) { if (DESCR.test(H.fz(w)) && out.length) break; out.push(w); }
    const t = (out.length ? out : ws.slice(0, 2)).join(' ');
    return t.toLowerCase().replace(/(^|\s)(\S)/g, (a, b, c) => b + c.toUpperCase());
  }
  SX.fantasiaErp = fantasiaDe;
  views.erp = function () {
    if (!FB.pagOk('erp')) return '<p class="muted">Seu setor não tem acesso a esta página.</p>';
    const adm = FB.setor === 'admin';
    let L = S.erp_pedidos.slice();
    if (Y.mq) L = L.filter(m => matchQ(H.fz([m.numero, m.fornecedor, fantasiaDe(m), m.codAgente, m.status, m.obs, notasDoErp(m.numero).map(n => n.numero).join(' ')].join(' ')), Y.mq));
    if (Y.mst) L = L.filter(m => (m.status || '') === Y.mst);
    if (Y.mmes) L = L.filter(m => (m.data || '').slice(0, 7) === Y.mmes);
    if (Y.msem) L = L.filter(m => !notasDoErp(m.numero).length);
    L.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || (+KN(b.numero) - +KN(a.numero)));
    const total = S.erp_pedidos.length, com = S.erp_pedidos.filter(m => notasDoErp(m.numero).length).length;
    const sts = [...new Set(S.erp_pedidos.map(m => m.status || '').filter(Boolean))].sort();
    const tab = H.tabela('erp', [
      { l: 'Nº pedido ERP', h: m => `<b class="mono">${esc(m.numero)}</b>`, v: m => m.numero },
      { l: 'Fornecedor (cód. agente)', h: m => { const fa = fantasiaDe(m); return `<div class="t">${esc(fa || '—')}${adm && m.fornecedor ? ` <button type="button" class="btn sm ghost" data-erpfan="${esc(m.id)}" title="Corrigir o nome fantasia deste fornecedor" aria-label="Corrigir o nome fantasia">${ic('edit', 12)}</button>` : ''}</div>${m.fornecedor && KF(m.fornecedor) !== KF(fa) ? `<div class="s muted" title="Razão social no ERP">${esc(m.fornecedor)}</div>` : ''}${m.codAgente ? `<div class="s mono">agente ${esc(m.codAgente)}</div>` : ''}`; }, v: m => fantasiaDe(m) || '', x: m => fantasiaDe(m) + (m.codAgente ? ' (' + m.codAgente + ')' : '') + (m.fornecedor && m.fornecedor !== fantasiaDe(m) ? ' · ' + m.fornecedor : '') },
      { l: 'Nota(s) atrelada(s)', h: m => { const ns = notasDoErp(m.numero); return ns.length ? ns.map(n => `<span class="pill ok" title="${esc(nm('fornecedores', n.fornecedorId, '') + ' · ' + brl2(n.valor))}">NF ${esc(n.numero || 's/n')}</span>`).join(' ') : '<span class="pill warn">sem nota</span>'; }, v: m => notasDoErp(m.numero).map(n => n.numero).join(', ') },
      { l: 'Data do pedido', v: m => m.data ? fdy(m.data) : '—' },
      { l: 'Status', h: m => esc(m.status || '—'), v: m => m.status || '' },
      { l: 'Observação', h: m => !adm ? esc(m.obs || '—') : `<input class="f" data-erpobs="${esc(m.id)}" value="${esc(m.obs || '')}" placeholder="Anotar…" aria-label="Observação do pedido ${esc(m.numero)}" style="min-width:160px;width:100%">`, v: m => m.obs || '' }
    ], L, total ? 'Nenhum pedido com esses filtros.' : 'Nenhum pedido importado ainda. Use “Importar planilha do ERP”.', 120);
    return H.cab('Pedidos do ERP', 'Importe a planilha de pedidos exportada do ERP (de outubro em diante). Cada pedido é ligado às notas fiscais cadastradas pelo campo “Pedido do ERP” da nota ou pelo pedido de compra do Pyro.' + (adm ? ' Compras consulta esta página; só o administrador importa e anota.' : ' Somente consulta.'),
      `${H.btnXls('erp', 'Pedidos do ERP')}${adm ? `<label class="btn pri w" style="cursor:pointer">${ic('upload', 15)} Importar planilha do ERP<input type="file" data-erpimp accept=".xlsx,.xls,.xlsm,.csv" style="display:none"></label>` : ''}`)
      + `<div class="kpis" style="margin-bottom:16px">${kpi('Pedidos importados', total, '')}${kpi('Com nota atrelada', com, total ? pct(com, total) + '%' : '', 'ok')}${kpi('Sem nota', total - com, '', total - com ? 'warn' : 'ok')}</div>
      <section class="panel"><div class="sec-h"><h2>${L.length} pedido(s)</h2><div class="filters"><input class="f" type="search" data-yf="mq" placeholder="Buscar pedido, fornecedor, NF" value="${esc(Y.mq)}" aria-label="Buscar">
        <select class="f" data-yf="mst" aria-label="Status">${opts(sts.map(x => [x, x]), Y.mst, 'Todos os status')}</select>
        <label class="f" style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px"><span class="muted" style="font-size:12.5px">Mês</span><input type="month" data-yf="mmes" value="${esc(Y.mmes)}" style="border:0;background:transparent;font:inherit;color:inherit"></label>
        <button class="toggle" data-y="msem" aria-pressed="${Y.msem}"><span class="sw"></span>Só sem nota</button></div></div>${tab}</section>`;
  };
  async function importarErp(file) {
    let wb; try { wb = await lerExcel(file); } catch (e) { toast('Não foi possível abrir a planilha'); return; }
    const F = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    let rows = null, c = {};
    for (const nome of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[nome], { header: 1, raw: true, defval: '' });
      for (let r = 0; r < Math.min(aoa.length, 30); r++) {
        const hs = aoa[r].map(F), find = (re, not) => hs.findIndex(h => re.test(h) && !(not && not.test(h)));
        const ped = find(/(^|\b)(n[oº°]?\.?\s*(do )?pedido|pedido|num(ero)?\s*ped)/, /item|qtd|valor|data|tipo/);
        if (ped < 0) continue;
        const c2 = { ped, forn: find(/fornecedor|razao|nome (do )?agente|agente nome|^nome/, /cod|fantasia|apelido|reduzido|curto/), fan: find(/fantasia|apelido|nome reduzido|nome curto|abreviado/), cod: find(/cod.*(agente|fornec)|^agente$|cd\.? ?agente/), data: find(/data|dt\.? ?(ped|emiss)|emissao/), st: find(/status|situa/) };
        if ([c2.forn, c2.cod, c2.data, c2.st].filter(x => x >= 0).length < 1) continue; /* título da planilha, não é o cabeçalho */
        c = c2;
        rows = aoa.slice(r + 1); break;
      }
      if (rows) break;
    }
    if (!rows) { toast('Não encontrei a coluna do número do pedido na planilha'); return; }
    const dt = v => { if (v instanceof Date) return iso(v); if (typeof v === 'number' && v > 20000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); } const m = String(v || '').match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; const m2 = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m2 ? m2[0] : ''; };
    const novos = new Map();
    rows.forEach(row => {
      const numero = KN(row[c.ped]); if (!numero) return;
      const data = c.data >= 0 ? dt(row[c.data]) : '';
      if (data && data < '2026-10-01') return;
      const x = novos.get(numero) || { id: 'm' + numero, numero };
      if (c.forn >= 0 && row[c.forn]) x.fornecedor = String(row[c.forn]).trim();
      if (c.cod >= 0 && row[c.cod]) x.codAgente = String(row[c.cod]).trim();
      if (c.fan >= 0 && row[c.fan]) x.fantasia = String(row[c.fan]).trim();
      if (data) x.data = data;
      if (c.st >= 0 && row[c.st]) x.status = String(row[c.st]).trim();
      novos.set(numero, x);
    });
    if (!novos.size) { toast('Nenhum pedido de outubro em diante encontrado na planilha'); return; }
    toast(`Importando ${novos.size} pedido(s)…`);
    const arr = [...novos.values()]; let i = 0;
    while (i < arr.length) { const b = FB.fs.batch(), fim = Math.min(arr.length, i + 400); for (; i < fim; i++) { const x = arr[i]; b.set(FB.fs.collection('erp_pedidos').doc(x.id), Object.assign({}, x, { importadoEm: Date.now() }), { merge: true }); } await b.commit(); }
    toast(`${arr.length} pedido(s) do ERP importados (as observações já anotadas foram mantidas)`);
  }

  /* ================= Home da Diretoria: indicadores das obras liberadas ================= */
  function donut(p, cor, rot) {
    const r = 34, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, p));
    return `<svg viewBox="0 0 90 90" class="pbi-donut" role="img" aria-label="${esc(rot)}: ${v}%"><circle cx="45" cy="45" r="${r}" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="45" cy="45" r="${r}" fill="none" stroke="${cor}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C * v / 100} ${C}" transform="rotate(-90 45 45)"/><text x="45" y="50" text-anchor="middle" class="pbi-dv">${Math.round(p)}%</text></svg>`;
  }
  function kpiHome() {
    const ids = FB.obrasLib().ids, obras = S.obras.filter(o => ids.includes(o.id));
    if (!obras.length) return '';
    const blocos = obras.map(o => {
      const st = obraStats(o), rows = H.linhasObra(o), ok = rows.filter(rowDone).length, venc = rows.filter(r => H.situacaoLinha(r).k === 'atr').length;
      const mat = rows.length ? pct(ok, rows.length) : st.pct, bp = st.orc ? pctF(st.fat, st.orc) : 0;
      const cats = {}; rows.forEach(r => { const k = r.categoria || 'Outros', x = cats[k] = cats[k] || { n: 0, ok: 0 }; x.n++; if (rowDone(r)) x.ok++; });
      const risco = st.atrasos >= 3 || bp > 100 || venc >= 20 ? 'bad' : st.atrasos || venc || bp > 90 ? 'warn' : 'ok';
      return `<div class="pbi-obra"><div class="pbi-h"><b>${esc(o.nome)}</b><span class="pill ${risco}">${{ ok: 'Risco baixo', warn: 'Atenção', bad: 'Risco alto' }[risco]}</span></div>
        <div class="pbi-row">
          <div class="pbi-t">${donut(mat, 'var(--ok)', 'Material recebido')}<div><div class="pbi-l">Material recebido</div><div class="pbi-s">${ok} de ${rows.length} itens</div></div></div>
          <div class="pbi-t">${donut(bp, bp > 100 ? 'var(--bad)' : bp > 90 ? 'var(--warn)' : 'var(--accent)', 'Budget consumido')}<div><div class="pbi-l">Budget consumido</div><div class="pbi-s">${st.orc ? brlK(st.fat) + ' de ' + brlK(st.orc) : 'sem budget'}</div></div></div>
          <div class="pbi-t pbi-n"><div class="pbi-l">Notas fiscais lançadas</div><div class="pbi-v">${brlK(S.nfs.filter(n => !nfDup(n) && !n.semFinanceiro && !n.foraBudget && (n.obraId === o.id || st.ps.some(p => p.id === n.pedidoId))).reduce((a, n) => a + (+n.valor || 0), 0))}</div><div class="pbi-s">${st.ps.length} pedido(s) · aprovado ${brlK(st.comp)}</div></div>
          <div class="pbi-t pbi-n"><div class="pbi-l">Entregas atrasadas</div><div class="pbi-v" style="color:${st.atrasos ? 'var(--bad)' : 'var(--ok)'}">${st.atrasos}</div><div class="pbi-s">${st.reag} reprogramação(ões)</div></div>
          <div class="pbi-t pbi-n"><div class="pbi-l">Itens com previsão vencida</div><div class="pbi-v" style="color:${venc ? 'var(--warn)' : 'var(--ok)'}">${venc}</div><div class="pbi-s">no Recebimento</div></div>
        </div>
        <div class="pbi-cats">${Object.entries(cats).map(([k, x]) => `<div class="rrow"><div class="rt"><b>${esc(k)}</b><span class="mono muted">${x.ok}/${x.n} · ${pct(x.ok, x.n)}%</span></div>${bar(pct(x.ok, x.n), x.ok === x.n ? 'ok' : '')}</div>`).join('')}</div></div>`;
    }).join('');
    return `<section class="pbi" aria-label="Indicadores das obras"><div class="sec-h"><h2>Indicadores · ${esc(obras.map(H.curtoObra).join(' e '))}</h2><span class="sub">atualizado ao vivo</span></div>${blocos}
      <div class="pbi-obra pbi-uc"><div class="pbi-h"><b>Uso e consumo</b><span class="pill muted">a partir de novembro</span></div><p class="muted" style="margin:0">O indicador de uso e consumo entra aqui a partir de novembro.</p></div></section>`;
  }
  const homeOrig = views.home;
  views.home = function () { const h = homeOrig(); return avisoAprov() + (['diretoria', 'admin', 'compras'].includes(FB.setor) && S.obras.length ? kpiHome() + h : h); };


  /* ================= Conferir a obra com a planilha de controle (faturamento) ================= */
  const CAT_N = { perfis: 'Perfis (alumínio)', vidros: 'Vidros', acessorios: 'Acessórios', outros: 'Serviços e industrialização' };
  const catDoRotulo = t => { t = H.fz(t).replace(/[:\s]+$/, ''); if (/^(alumin|perfi)/.test(t)) return 'perfis'; if (/^vidr/.test(t)) return 'vidros'; if (/^acess/.test(t)) return 'acessorios'; return ''; };
  const catDoMaterial = t => { t = H.fz(t); if (/vidro|laminad|temperad/.test(t)) return 'vidros'; if (/perfi|alumin/.test(t)) return 'perfis'; return 'acessorios'; };
  function lerControle(wb) {
    const F = v => H.fz(v).replace(/\s+/g, ' ').trim(), linhas = [], budget = {}, rotulos = {};
    let contrato = 0;
    wb.SheetNames.forEach(nome => {
      const ws = wb.Sheets[nome], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
      const servico = /servi|industrial/.test(F(nome));
      const org = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0;
      let hr = -1, cF = -1, cM = -1, cN = -1, cV = -1, cD = -1;
      for (let r = 0; r < Math.min(aoa.length, 40) && hr < 0; r++) {
        const hs = aoa[r].map(F), f = hs.findIndex(h => /^fornecedor/.test(h)), v = hs.findIndex(h => /faturamento direto|^valor/.test(h));
        if (f >= 0 && v >= 0) { hr = r; cF = f; cV = v; cM = hs.findIndex(h => /^materia/.test(h)); cN = hs.findIndex(h => /orcamento|nota|^n[ºo°]/.test(h)); cD = hs.findIndex(h => /data do faturamento/.test(h)); }
      }
      /* rótulos de budget (Alumínio:, Vidro:, Acessório:) e as somas que dizem o que é de cada categoria */
      Object.keys(ws).forEach(ref => {
        if (ref[0] === '!') return; const cell = ws[ref]; if (!cell || typeof cell.v !== 'string') return;
        const t = F(cell.v), m = XLSX.utils.decode_cell(ref);
        if (/^total contrato/.test(t)) { for (let c = m.c + 1; c < m.c + 6; c++) { const x = ws[XLSX.utils.encode_cell({ r: m.r, c })]; if (x && typeof x.v === 'number') { contrato = contrato || x.v; break; } } return; }
        const cat = catDoRotulo(cell.v); if (!cat || t.length > 14 || servico) return;
        const nums = []; for (let c = m.c + 1; c < m.c + 6; c++) { const x = ws[XLSX.utils.encode_cell({ r: m.r, c })]; if (x && (typeof x.v === 'number' || x.f)) nums.push(x); }
        if (nums[0] && typeof nums[0].v === 'number' && !nums[0].f) budget[cat] = nums[0].v;
        const fx = nums.find(x => x.f && /sum/i.test(x.f));
        if (fx) { const rows = new Set(); String(fx.f).replace(/\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?/g, (mm, c1, r1, c2, r2) => { const a = +r1, b = r2 ? +r2 : +r1; for (let k = Math.min(a, b); k <= Math.max(a, b); k++) rows.add(k); return mm; }); rotulos[nome] = rotulos[nome] || {}; rows.forEach(k => rotulos[nome][k] = cat); }
      });
      if (hr < 0) return;
      for (let r = hr + 1; r < aoa.length; r++) {
        const row = aoa[r], val = typeof row[cV] === 'number' ? row[cV] : num(row[cV]);
        const forn = String(row[cF] || '').trim(); if (!forn || !val || /^total/.test(F(forn))) continue;
        const mat = cM >= 0 ? String(row[cM] || '').replace(/\s+/g, ' ').trim() : '', nr = cN >= 0 ? String(row[cN] ?? '').trim() : '';
        const cat = servico ? 'outros' : ((rotulos[nome] || {})[r + org + 1] || catDoMaterial(mat));
        linhas.push({ aba: nome, linha: r + org + 1, forn, mat, num: nr, valor: Math.round(val * 100) / 100, cat, faturado: cD >= 0 && row[cD] && row[cD] !== '-' });
      }
    });
    return { linhas, budget, contrato };
  }
  const KD = v => String(v ?? '').replace(/\D/g, '').replace(/^0+/, '');
  function comparar(o, P) {
    const st = obraStats(o), peds = st.ps.filter(p => p.status === 'comprado' || p.status === 'recebido');
    const nfsO = S.nfs.filter(n => !nfDup(n) && !n.semFinanceiro && !n.foraBudget && (n.obraId === o.id || peds.some(p => p.id === n.pedidoId)));
    const fk = t => H.fz(t).replace(/[^a-z0-9]/g, '');
    const mesmoForn = (p, g) => { const a = fk(nm('fornecedores', p.fornecedorId, '')), b = fk(g.forn); return !!a && !!b && (a.slice(0, 4) === b.slice(0, 4) || a.includes(b) || b.includes(a)); };
    const tokens = p => hay(p.item, p.justificativa, p.erpPedido, p.pc, p.op).replace(/\D+/g, ' ').trim().split(' ').map(KD).filter(Boolean);
    /* agrupa as linhas da planilha pelo nº da nota/orçamento (uma nota pode ter várias linhas) */
    const G = new Map();
    P.linhas.forEach(l => { const k = KD(l.num), key = k ? l.aba + '|' + k : 'L' + l.aba + l.linha; const g = G.get(key) || { key, k, aba: l.aba, linha: l.linha, linhas: [], valor: 0, cats: {}, forn: l.forn, num: l.num, mats: [] };
      g.linhas.push(l); g.valor = r2(g.valor + l.valor); g.cats[l.cat] = (g.cats[l.cat] || 0) + l.valor; if (l.mat && !g.mats.includes(l.mat)) g.mats.push(l.mat); G.set(key, g); });
    const grupos = [...G.values()].map(g => Object.assign(g, { cat: Object.entries(g.cats).sort((a, b) => b[1] - a[1])[0][0], mat: g.mats.slice(0, 2).join(' · ') + (g.mats.length > 2 ? ` (+${g.mats.length - 2})` : ''), tipo: '', pv: 0, pid: '', nfs: [] }));
    const acc = new Map(), liga = (p, g, tipo) => { g.tipo = tipo; g.pid = p.id; g.pcat = p.categoria; const a = acc.get(p.id) || { p, soma: 0, grupos: [], porNF: false }; a.soma = r2(a.soma + g.valor); a.grupos.push(g); if (tipo === 'nf') a.porNF = true; acc.set(p.id, a); };
    const livre = () => grupos.filter(g => !g.tipo);
    /* 1) pela nota fiscal */
    const nfUsada = new Set();
    grupos.forEach(g => { if (!g.k || g.k.length < 3) return; const ns = nfsO.filter(n => !nfUsada.has(n.id) && KD(n.numero) === g.k); if (!ns.length) return; ns.forEach(n => nfUsada.add(n.id)); g.nfs = ns; g.pv = r2(ns.reduce((a, n) => a + (+n.valor || 0), 0)); const pp = by('pedidos', ns[0].pedidoId); if (pp && peds.includes(pp)) liga(pp, g, 'nf'); else { g.tipo = 'nf'; g.pcat = pp ? pp.categoria : ''; } });
    /* 2) pelo nº do orçamento/nota escrito no pedido */
    livre().forEach(g => { if (!g.k) return; const c = peds.find(p => tokens(p).includes(g.k) && (g.k.length >= 4 || mesmoForn(p, g))); if (c) liga(c, g, 'ped'); });
    /* 3) o que falta para fechar um pedido já ligado (pedido que junta mais de uma linha) */
    livre().forEach(g => { const a = [...acc.values()].find(a => mesmoForn(a.p, g) && Math.abs(valPed(a.p) - a.soma - g.valor) < 1); if (a) liga(a.p, g, 'resto'); });
    /* 4) mesmo fornecedor e mesmo valor; 5) só o valor, na mesma categoria, quando é único */
    livre().forEach(g => { const c = peds.filter(p => !acc.has(p.id) && mesmoForn(p, g) && Math.abs(valPed(p) - g.valor) < 1); if (c.length) liga(c[0], g, 'forn'); });
    livre().forEach(g => { const c = peds.filter(p => !acc.has(p.id) && p.categoria === g.cat && Math.abs(valPed(p) - g.valor) < 1); if (c.length === 1) liga(c[0], g, 'valor'); });
    grupos.forEach(g => { if (g.tipo && g.tipo !== 'nf') g.pv = g.valor; });
    const difPed = [...acc.values()].filter(a => !a.porNF && Math.abs(valPed(a.p) - a.soma) >= 1);
    const extras = peds.filter(p => !acc.has(p.id) && valPed(p) > 0.009 && !S.nfs.some(n => n.pedidoId === p.id && nfUsada.has(n.id)));
    /* notas sem pedido: entram na categoria do fornecedor (quando ele só tem uma categoria na obra), como no painel da obra */
    const idsP = new Set(st.ps.map(p => p.id)), catForn = {};
    st.ps.forEach(p => { if (p.fornecedorId) (catForn[p.fornecedorId] = catForn[p.fornecedorId] || new Set()).add(p.categoria); });
    const soltas = S.nfs.filter(n => !nfDup(n) && !n.semFinanceiro && !n.foraBudget && n.obraId === o.id && !idsP.has(n.pedidoId));
    const solCat = {}; soltas.forEach(n => { const sc = catForn[n.fornecedorId], c = sc && sc.size === 1 ? [...sc][0] : 'sem'; solCat[c] = (solCat[c] || 0) + (+n.valor || 0); });
    CAT_N.sem = 'Notas sem pedido (sem categoria)';
    const cats = ['perfis', 'vidros', 'acessorios', 'outros', 'sem'].map(c => {
      const pl = r2(P.linhas.filter(l => l.cat === c).reduce((a, l) => a + l.valor, 0)), py = r2(((st.cat[c] || {}).comp || 0) + (solCat[c] || 0));
      return { c, bPl: P.budget[c] || 0, bPy: +((o.budgetCat || {})[c]) || 0, pl, py };
    }).filter(x => x.pl || x.py || x.bPl || x.bPy);
    return { st, grupos, difPed, extras, cats, soltas, catForn };
  }
  function relatorioConf(o, P) {
    const R = comparar(o, P), adm = FB.setor === 'admin';
    const falta = R.grupos.filter(x => !x.tipo), difV = R.grupos.filter(x => x.tipo === 'nf' && Math.abs(x.pv - x.valor) >= 1), difC = R.grupos.filter(x => x.tipo && x.pcat && x.pcat !== x.cat), soValor = R.grupos.filter(x => x.tipo === 'valor');
    const pc = (a, b) => b ? pctTxt(pctF(a, b)) + '%' : '—';
    const bate = new Set(R.cats.filter(x => Math.abs(x.py - x.pl) < 1).map(x => x.c)), lancaveis = falta.filter(x => !bate.has(x.cat));
    const totPl = R.cats.reduce((a, x) => a + x.pl, 0), totPy = R.cats.reduce((a, x) => a + x.py, 0);
    const bSomaPl = ['perfis', 'vidros', 'acessorios'].reduce((a, c) => a + (P.budget[c] || 0), 0);
    const matPl = R.cats.filter(x => x.c !== 'outros').reduce((a, x) => a + x.pl, 0), matPy = R.cats.filter(x => x.c !== 'outros').reduce((a, x) => a + x.py, 0); /* materiais = tudo menos serviços (inclui notas sem pedido) */
    const tabCat = `<div class="tablewrap"><table><thead><tr><th>Categoria</th><th class="r">Budget planilha</th><th class="r">Budget Pyro</th><th class="r">Consumido planilha</th><th class="r">Consumido Pyro</th><th class="r">% planilha</th><th class="r">% Pyro</th><th class="r">Diferença</th></tr></thead><tbody>${R.cats.map(x => { const d = r2(x.py - x.pl); return `<tr><td class="t">${CAT_N[x.c]}</td><td class="r mono">${x.bPl ? brl2(x.bPl) : '—'}</td><td class="r mono" style="${x.bPl && Math.abs(x.bPl - x.bPy) >= 1 ? 'color:var(--warn)' : ''}">${x.bPy ? brl2(x.bPy) : '—'}</td><td class="r mono">${brl2(x.pl)}</td><td class="r mono">${brl2(x.py)}</td><td class="r mono">${pc(x.pl, x.bPl)}</td><td class="r mono">${pc(x.py, x.bPy)}</td><td class="r mono" style="color:${Math.abs(d) < 1 ? 'var(--ok)' : 'var(--bad)'}">${Math.abs(d) < 1 ? 'bate' : (d > 0 ? '+' : '') + brl2(d)}</td></tr>`; }).join('')}
      <tr><td class="t">Materiais${R.cats.some(x => x.c === 'sem') ? ' (com as notas sem pedido)' : ' (perfis + vidros + acessórios)'}</td><td class="r mono">${bSomaPl ? brl2(bSomaPl) : '—'}</td><td class="r mono">${brl2(['perfis', 'vidros', 'acessorios'].reduce((a, c) => a + (+((o.budgetCat || {})[c]) || 0), 0))}</td><td class="r mono"><b>${brl2(matPl)}</b></td><td class="r mono"><b>${brl2(matPy)}</b></td><td class="r mono">${pc(matPl, bSomaPl)}</td><td class="r mono">${pc(matPy, ['perfis', 'vidros', 'acessorios'].reduce((a, c) => a + (+((o.budgetCat || {})[c]) || 0), 0))}</td><td class="r mono" style="color:${Math.abs(matPy - matPl) < 1 ? 'var(--ok)' : 'var(--bad)'}">${Math.abs(matPy - matPl) < 1 ? 'bate' : brl2(matPy - matPl)}</td></tr></tbody></table></div>`;
    const lin = (x, extra) => `<tr><td class="mono">${esc(x.aba.slice(0, 12))} · ${x.linha}${x.linhas && x.linhas.length > 1 ? ` <span class="s">(${x.linhas.length} linhas)</span>` : ''}</td><td>${esc(x.forn)}<div class="s">${esc(x.mat)}</div></td><td class="mono">${esc(x.num)}</td><td>${CAT_N[x.cat]}</td><td class="r mono">${brl2(x.valor)}</td>${extra || ''}</tr>`;
    const secFalta = falta.length ? `<h3 style="margin:16px 0 6px">Na planilha e não no Pyro (${falta.length}) · ${brl2(falta.reduce((a, x) => a + x.valor, 0))}</h3><div class="tablewrap"><table><thead><tr><th>Linha</th><th>Fornecedor</th><th>Nº orç./NF</th><th>Categoria</th><th class="r">Valor</th>${adm ? '<th></th>' : ''}</tr></thead><tbody>${falta.map((x, i) => lin(x, adm ? `<td class="r">${bate.has(x.cat) ? '<span class="s muted" title="O total desta categoria já bate com a planilha: este valor deve estar dentro de outro lançamento do Pyro">categoria já bate · não lançar</span>' : `<button type="button" class="btn sm" data-conflanca="${i}">Lançar no Pyro</button>`}</td>` : '')).join('')}</tbody></table></div>${adm && lancaveis.length > 1 ? `<div style="margin-top:8px"><button type="button" class="btn sm pri" data-conflanca="todos">Lançar os ${lancaveis.length} que faltam como pedido aprovado</button> <span class="s muted">Cria pedidos Comprados só para o budget (fora do Recebimento e das entregas), com o fornecedor, a categoria e o valor da planilha. Confira antes a lista “No Pyro e não na planilha”: pode ser o mesmo valor com outro número.</span></div>` : ''}` : '<p style="color:var(--ok);margin:12px 0 0">Todas as linhas da planilha foram encontradas no Pyro.</p>';
    const secDifV = difV.length ? `<h3 style="margin:16px 0 6px">Valor diferente (${difV.length})</h3><div class="tablewrap"><table><thead><tr><th>Linha</th><th>Fornecedor</th><th>Nº orç./NF</th><th>Categoria</th><th class="r">Planilha</th><th class="r">Pyro</th><th></th></tr></thead><tbody>${difV.map(x => lin(x, `<td class="r mono" style="color:var(--bad)">${brl2(x.pv)}</td><td class="r">${x.pid ? `<button type="button" class="btn sm" data-act="edit-ped" data-id="${esc(x.pid)}">Abrir pedido</button>` : ''}</td>`)).join('')}</tbody></table></div>` : '';
    const secDifC = difC.length ? `<h3 style="margin:16px 0 6px">Categoria diferente (${difC.length})</h3><div class="tablewrap"><table><thead><tr><th>Linha</th><th>Fornecedor</th><th>Nº orç./NF</th><th>Na planilha</th><th class="r">Valor</th><th>No Pyro</th>${adm ? '<th></th>' : ''}</tr></thead><tbody>${difC.map((x, i) => lin(x, `<td style="color:var(--warn)">${CAT_N[x.pcat] || x.pcat}</td>${adm ? `<td class="r"><button type="button" class="btn sm" data-confcat="${i}">Mudar no Pyro para ${CAT_N[x.cat]}</button></td>` : ''}`)).join('')}</tbody></table></div>` : '';
    const secPed = R.difPed.length ? `<h3 style="margin:16px 0 6px">Pedido com valor diferente da soma da planilha (${R.difPed.length})</h3><div class="tablewrap"><table><thead><tr><th>Pedido no Pyro</th><th>Linhas da planilha</th><th class="r">Planilha</th><th class="r">Pyro</th><th></th></tr></thead><tbody>${R.difPed.map(a => `<tr><td><div class="t">${esc(a.p.item)}</div><div class="s">${esc(nm('fornecedores', a.p.fornecedorId, ''))}</div></td><td class="s">${a.grupos.map(g => esc(g.forn + ' ' + g.num)).join('<br>')}</td><td class="r mono">${brl2(a.soma)}</td><td class="r mono" style="color:var(--bad)">${brl2(valPed(a.p))}</td><td class="r"><button type="button" class="btn sm" data-act="edit-ped" data-id="${esc(a.p.id)}">Abrir pedido</button></td></tr>`).join('')}</tbody></table></div>` : '';
    const secVal = soValor.length ? `<h3 style="margin:16px 0 6px">Ligados só pelo valor · confira o fornecedor (${soValor.length})</h3><div class="tablewrap"><table><thead><tr><th>Linha</th><th>Fornecedor na planilha</th><th>Nº orç./NF</th><th>Categoria</th><th class="r">Valor</th><th>No Pyro</th></tr></thead><tbody>${soValor.map(x => lin(x, `<td>${esc(nm('fornecedores', (by('pedidos', x.pid) || {}).fornecedorId, '—'))}<div class="s">${esc((by('pedidos', x.pid) || {}).item || '')}</div></td>`)).join('')}</tbody></table></div>` : '';
    const podeLig = typeof okw === 'function' && okw('nf'), nSug = podeLig ? R.soltas.filter(n => sugerirPed(n).id).length : 0;
    const secSol = R.soltas.length ? `<h3 style="margin:16px 0 6px">Notas sem pedido ligado (${R.soltas.length}) · ${brl2(R.soltas.reduce((a, n) => a + (+n.valor || 0), 0))}</h3><p class="s muted" style="margin:0 0 6px">Elas entram no consumo da obra além do valor dos pedidos. Se a nota é de um pedido que já está no Pyro, ligue a nota ao pedido: assim ela deixa de ser contada duas vezes.</p>${podeLig ? tabLigar(R.soltas, false) + (nSug > 1 ? `<div style="margin-top:8px"><button type="button" class="btn sm" data-ligartodas>Ligar as ${nSug} sugeridas</button></div>` : '') : `<div class="tablewrap"><table><thead><tr><th>Nota</th><th>Fornecedor</th><th>Emissão</th><th class="r">Valor</th><th></th></tr></thead><tbody>${R.soltas.map(n => `<tr><td class="mono"><b>${esc(n.numero || 's/n')}</b></td><td>${esc(nm('fornecedores', n.fornecedorId, '—'))}</td><td>${n.emissao ? fdy(n.emissao) : '—'}</td><td class="r mono">${brl2(n.valor)}</td><td class="r"><button type="button" class="btn sm" data-act="edit-nf" data-id="${esc(n.id)}">Abrir nota</button></td></tr>`).join('')}</tbody></table></div>`}` : '';
    const secExt = R.extras.length ? `<h3 style="margin:16px 0 6px">No Pyro e não na planilha (${R.extras.length}) · ${brl2(R.extras.reduce((a, p) => a + valPed(p), 0))}</h3><p class="s muted" style="margin:0 0 6px">Pode ser pedido lançado em dobro, nota com número diferente ou compra que ainda não entrou na planilha.</p><div class="tablewrap"><table><thead><tr><th>Pedido</th><th>Fornecedor</th><th>Categoria</th><th class="r">Valor</th><th></th></tr></thead><tbody>${R.extras.map(p => `<tr><td><div class="t">${esc(p.item)}</div><div class="s">${esc([p.pc, p.op, S.nfs.filter(n => n.pedidoId === p.id).map(n => 'NF ' + n.numero).join(', ')].filter(Boolean).join(' · '))}</div></td><td>${esc(nm('fornecedores', p.fornecedorId, '—'))}</td><td>${CAT_N[p.categoria] || p.categoria}</td><td class="r mono">${brl2(valPed(p))}</td><td class="r"><button type="button" class="btn sm" data-act="edit-ped" data-id="${esc(p.id)}">Abrir</button></td></tr>`).join('')}</tbody></table></div>` : '';
    const precisaBudget = bSomaPl && ['perfis', 'vidros', 'acessorios'].some(c => Math.abs((P.budget[c] || 0) - (+((o.budgetCat || {})[c]) || 0)) >= 1 || Math.abs((+o.budgetTotal || 0) - bSomaPl) >= 1);
    const f = modal('Conferência com a planilha · ' + H.curtoObra(o), `<div class="full">
      <div class="kpis" style="margin-bottom:12px">${kpi('Materiais na planilha', brlK(matPl), bSomaPl ? pc(matPl, bSomaPl) + ' do budget de ' + brlK(bSomaPl) : '')}${kpi('Materiais no Pyro', brlK(matPy), Math.abs(matPy - matPl) < 1 ? 'bate com a planilha' : 'diferença ' + brl2(matPy - matPl), Math.abs(matPy - matPl) < 1 ? 'ok' : 'warn')}${kpi('Linhas da planilha', P.linhas.length, `${P.linhas.length - falta.length} encontradas no Pyro`)}${P.contrato ? kpi('Contrato', brlK(P.contrato), 'materiais + serviços: ' + pc(totPl, P.contrato)) : ''}</div>
      ${tabCat}
      ${precisaBudget ? `<div class="banner" style="margin-top:10px"><span>O budget do Pyro está diferente do budget inicial da planilha (soma das categorias: ${brl2(bSomaPl)}).</span>${adm ? '<button type="button" class="btn sm pri" data-confbudget>Usar o budget da planilha</button>' : ''}</div>` : ''}
      ${secFalta}${secDifV}${secPed}${secDifC}${secVal}${secSol}${secExt}
      <p class="s muted" style="margin:14px 0 0">A conferência liga cada nota ou orçamento da planilha ao Pyro pelo número (na nota ou escrito no pedido); se não achar, pelo fornecedor e pelo valor, e por último só pelo valor (esses aparecem para conferir). “Consumido Pyro” é o valor dos pedidos comprados e recebidos de cada categoria (o mesmo do painel da obra). Nada é alterado sem você clicar.</p></div>`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true });
    f.closest('.sheet') && f.closest('.sheet').classList.add('xl');
    ouvirLigar(f, () => { clearTimeout(f._rel); f._rel = setTimeout(() => relatorioConf(by('obras', o.id), P), 500); });
    f.addEventListener('click', async ev => {
      const bl = ev.target.closest('[data-conflanca]'), bc = ev.target.closest('[data-confcat]'), bb = ev.target.closest('[data-confbudget]');
      if (bl) {
        const lst = bl.dataset.conflanca === 'todos' ? lancaveis : [falta[+bl.dataset.conflanca]];
        if (lst.length > 1 && !confirm(`Criar ${lst.length} pedidos aprovados no Pyro, somando ${brl2(lst.reduce((a, x) => a + x.valor, 0))}? Confira antes se nenhum deles já existe com outro número.`)) return;
        bl.disabled = true;
        for (const x of lst) {
          const fz0 = H.fz(x.forn).replace(/[^a-z0-9]/g, ''), fo = S.fornecedores.find(f => { const k = H.fz(f.nome).replace(/[^a-z0-9]/g, ''); return k && fz0 && (k === fz0 || k.startsWith(fz0) || fz0.startsWith(k)); });
          await put('pedidos', { id: 'pc' + uid(), obraId: o.id, categoria: x.cat, fornecedorId: fo ? fo.id : '', item: `${x.mat || CAT_N[x.cat]} · ${x.forn} nº ${x.num} (planilha de controle)`, valor: x.valor, justificativa: 'Lançado pela conferência com a planilha de controle (' + x.aba + ', linha ' + x.linha + ')', status: 'comprado', semReceb: true, origem: 'planilha_controle', itens: [], createdAt: Date.now(), updatedAt: Date.now() }, true);
        }
        toast(lst.length + ' lançamento(s) criado(s)'); setTimeout(() => relatorioConf(by('obras', o.id), P), 400);
      } else if (bc) {
        const x = difC[+bc.dataset.confcat], p = by('pedidos', x.pid); if (p) { await put('pedidos', Object.assign({}, p, { categoria: x.cat, updatedAt: Date.now() })); toast('Categoria alterada'); setTimeout(() => relatorioConf(by('obras', o.id), P), 400); }
      } else if (bb) {
        const bc2 = Object.assign({}, o.budgetCat || {}, { perfis: P.budget.perfis || 0, vidros: P.budget.vidros || 0, acessorios: P.budget.acessorios || 0 });
        await put('obras', Object.assign({}, o, { budgetCat: bc2, budgetTotal: bSomaPl + (+bc2.outros || 0) }));
        toast('Budget atualizado com o da planilha'); setTimeout(() => relatorioConf(by('obras', o.id), P), 400);
      }
    });
  }
  async function conferirPlanilha(oid, file) {
    const o = by('obras', oid); if (!o) return;
    let wb; try { wb = await lerExcel(file); } catch (e) { toast('Não foi possível abrir a planilha'); return; }
    const P = lerControle(wb);
    if (!P.linhas.length) { toast('Não encontrei as linhas de faturamento (colunas Fornecedor e Faturamento Direto / Valor)'); return; }
    relatorioConf(o, P);
  }
  SX.lerControle = lerControle; SX.compararControle = comparar;
  const obraOrig = views.obra;
  views.obra = function () {
    const h = obraOrig(); if (UI.view !== 'obra') return h;
    const btn = `<label class="btn" style="cursor:pointer" title="Compara o budget e o consumido de cada categoria com a planilha de controle de pedidos (faturamento) da obra">${ic('upload', 15)} Conferir com a planilha<input type="file" data-conf="${esc(UI.detail)}" accept=".xlsx,.xls,.xlsm" style="display:none"></label>`;
    return h.replace('<div class="badges"><button class="toggle" data-act="urg"', '<div class="badges">' + btn + '<button class="toggle" data-act="urg"');
  };

  /* ================= Ligar nota ao pedido + itens do XML ================= */
  const KC = t => H.fz(t).replace(/[^a-z0-9]/g, '');
  /* pedido da obra que tem os mesmos códigos de item da nota (XML) */
  window.pedidoPorItens = function (obraId, fornId, itens) {
    if (!obraId || !(itens || []).length) return '';
    const cods = new Set(itens.map(i => KC(i.cod)).filter(x => x.length >= 3)); if (!cods.size) return '';
    const cs = S.pedidos.filter(p => p.obraId === obraId && p.status !== 'cancelado' && !p.demo && (!fornId || fornId === '__new' || !p.fornecedorId || p.fornecedorId === fornId));
    let best = '', bn = 0, empate = false;
    cs.forEach(p => { const n = (p.itens || []).filter(i => cods.has(KC(i.cod))).length; if (n > bn) { bn = n; best = p.id; empate = false; } else if (n && n === bn) empate = true; });
    return bn && !empate ? best : '';
  };
  const semPedido = n => !nfDup(n) && !n.pedidoId && !!n.obraId;
  function sugerirPed(n) {
    const doErp = n.erpPedido && S.pedidos.filter(p => p.obraId === n.obraId && p.status !== 'cancelado' && KD(p.erpPedido) && KD(p.erpPedido) === KD(n.erpPedido));
    if (doErp && doErp.length === 1) return { id: doErp[0].id, por: 'nº do ERP' };
    const txt = [n.obsTxt, n.obs, n.erpPedido ? 'PEDIDO ' + n.erpPedido : '', (n.xPed || []).map(x => 'PEDIDO ' + x).join(' ')].filter(Boolean).join(' ');
    if (txt && n.fornecedorId && typeof pedidoSugerido === 'function') { const id = pedidoSugerido(n.obraId, n.fornecedorId, txt); if (id) return { id, por: 'nº do pedido na nota' }; }
    const pi = pedidoPorItens(n.obraId, n.fornecedorId, n.itens); if (pi) return { id: pi, por: 'itens do XML' };
    const cs = S.pedidos.filter(p => p.obraId === n.obraId && p.status !== 'cancelado' && !p.demo && n.fornecedorId && p.fornecedorId === n.fornecedorId);
    const v = cs.filter(p => Math.abs(valPed(p) - (+n.valor || 0)) < 1); if (v.length === 1) return { id: v[0].id, por: 'mesmo valor' };
    const ab = cs.filter(p => p.status === 'comprado'); if (ab.length === 1) return { id: ab[0].id, por: 'único pedido em aberto do fornecedor' };
    return { id: '', por: '' };
  }
  const rotP = p => typeof pedLabel === 'function' ? pedLabel(p) : (p.item || p.id);
  function selPedidos(n, sel) {
    const ps = S.pedidos.filter(p => p.obraId === n.obraId && p.status !== 'cancelado' && !p.demo);
    const mesmo = ps.filter(p => n.fornecedorId && p.fornecedorId === n.fornecedorId), outros = ps.filter(p => !mesmo.includes(p));
    const o = l => l.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(rotP(p))}</option>`).join('');
    return `<select class="f" data-ligsel="${esc(n.id)}" aria-label="Pedido para a nota ${esc(n.numero || '')}" style="max-width:340px"><option value="">Escolha o pedido…</option>${mesmo.length ? `<optgroup label="Mesmo fornecedor">${o(mesmo)}</optgroup>` : ''}${outros.length ? `<optgroup label="Outros pedidos da obra">${o(outros)}</optgroup>` : ''}</select>`;
  }
  /* tabela de notas sem pedido com a sugestão já marcada */
  function tabLigar(lista, comObra) {
    return `<div class="tablewrap"><table><thead><tr><th>Nota</th>${comObra ? '<th>Obra</th>' : ''}<th>Fornecedor</th><th>Emissão</th><th class="r">Valor</th><th>Ligar ao pedido</th><th></th></tr></thead><tbody>${lista.map(n => { const sg = sugerirPed(n); return `<tr data-ligrow="${esc(n.id)}"><td class="mono"><b>${esc(n.numero || 's/n')}</b>${(n.itens || []).length ? `<div class="s">${n.itens.length} item(ns) no XML</div>` : ''}</td>${comObra ? `<td>${esc(H.curtoObra(by('obras', n.obraId) || { nome: '—' }))}</td>` : ''}<td>${esc(nm('fornecedores', n.fornecedorId, '—'))}</td><td>${n.emissao ? fdy(n.emissao) : '—'}</td><td class="r mono">${brl2(n.valor)}</td><td>${selPedidos(n, sg.id)}${sg.id ? `<div class="s" style="color:var(--ok)" data-sug="1">sugerido pelo ${esc(sg.por)}</div>` : ''}</td><td class="r" style="white-space:nowrap"><button type="button" class="btn sm pri" data-ligar="${esc(n.id)}">Ligar</button> <button type="button" class="btn sm ghost" data-act="edit-nf" data-id="${esc(n.id)}" title="Abrir a nota">${ic('eye', 13)}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  async function ligarNota(nid, pid) {
    const n = by('nfs', nid), p = by('pedidos', pid); if (!n || !p) return false;
    await put('nfs', Object.assign({}, n, { pedidoId: p.id, obraId: n.obraId || p.obraId, erpPedido: n.erpPedido || p.erpPedido || '', ligadaEm: Date.now(), ligadaPor: FB.nome, updatedAt: Date.now() }));
    return true;
  }
  /* liga os eventos (botão Ligar e Ligar todas as sugeridas) dentro de um container */
  function ouvirLigar(box, depois) {
    box.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-ligar]'), t = ev.target.closest('[data-ligartodas]');
      if (b) { const s = box.querySelector(`[data-ligsel="${CSS.escape(b.dataset.ligar)}"]`); if (!s || !s.value) { toast('Escolha o pedido'); return; }
        b.disabled = true; if (await ligarNota(b.dataset.ligar, s.value)) { toast('Nota ligada ao pedido'); const tr = b.closest('tr'); if (tr) tr.remove(); if (depois) depois(); } b.disabled = false; return; }
      if (t) { const rows = [...box.querySelectorAll('[data-ligrow]')].filter(r => r.querySelector('[data-sug]') && r.querySelector('[data-ligsel]').value);
        if (!rows.length) { toast('Nenhuma nota com sugestão'); return; }
        if (!confirm(`Ligar ${rows.length} nota(s) aos pedidos sugeridos?`)) return;
        t.disabled = true; for (const r of rows) { await ligarNota(r.dataset.ligrow, r.querySelector('[data-ligsel]').value); r.remove(); } toast(rows.length + ' nota(s) ligada(s)'); t.disabled = false; if (depois) depois(); }
    });
  }
  function modalLigar(obraId) {
    const L = S.nfs.filter(n => semPedido(n) && (!obraId || n.obraId === obraId)).sort((a, b) => String(b.emissao || '').localeCompare(String(a.emissao || '')));
    const nSug = L.filter(n => sugerirPed(n).id).length;
    const f = modal('Ligar notas ao pedido', `<div class="full"><p class="muted" style="margin:0 0 8px">Notas sem pedido entram no consumo da obra por fora dos pedidos e não aparecem no Recebimento. Ligue cada uma ao seu pedido: o Pyro sugere pelo nº do ERP, pelo nº do pedido escrito na nota, pelos itens do XML ou pelo valor.</p>
      ${L.length ? tabLigar(L, !obraId) : '<p style="color:var(--ok)">Todas as notas estão ligadas a um pedido.</p>'}
      ${nSug > 1 ? `<div style="margin-top:8px"><button type="button" class="btn sm" data-ligartodas>Ligar as ${nSug} sugeridas</button></div>` : ''}</div>`, { submit: 'Fechar', onSubmit: () => {}, wide: true });
    ouvirLigar(f);
  }
  SX.sugerirPed = sugerirPed;
  const nfsOrig = views.nfs;
  views.nfs = function () {
    const h = nfsOrig(); if (UI.view !== 'nfs' || typeof okw !== 'function' || !okw('nf')) return h;
    const n = S.nfs.filter(semPedido).length; if (!n) return h;
    const ban = `<div class="banner" style="margin-bottom:14px"><span><b>${n} nota(s) sem pedido ligado.</b> Ligue ao pedido para a nota contar certo no budget e aparecer no Recebimento.</span><button type="button" class="btn sm pri" data-y="ligar">Ligar ao pedido</button></div>`;
    const i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + ban + h.slice(i) : ban + h;
  };

  /* itens da nota lidos do XML, conferidos com o pedido */
  if (typeof formNF === 'function') {
    const formNFOrig = formNF;
    formNF = function (n) {
      const r = formNFOrig.apply(this, arguments);
      try {
        if (n && (n.itens || []).length) {
          const f = document.getElementById('mform'), a = f && f.querySelector('.fld'); if (!a) return r;
          const p = n.pedidoId && by('pedidos', n.pedidoId), pi = {}; ((p && p.itens) || []).forEach(i => { const k = KC(i.cod); if (k) pi[k] = (pi[k] || 0) + (+i.qtd || 0); });
          const tem = p && Object.keys(pi).length;
          a.parentNode.insertAdjacentHTML('beforeend', `<details class="full"><summary style="cursor:pointer;font-weight:600">Itens da nota (XML) · ${n.itens.length}${(n.xPed || []).length ? ' · pedido na nota: ' + esc(n.xPed.join(', ')) : ''}</summary><div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>Código</th><th>Descrição</th><th class="r">Qtd. na nota</th>${tem ? '<th class="r">No pedido</th><th></th>' : ''}<th class="r">Valor</th></tr></thead><tbody>${n.itens.map(i => { const q = pi[KC(i.cod)]; return `<tr><td class="mono">${esc(i.cod || '')}</td><td>${esc(i.desc || '')}</td><td class="r mono">${esc(String(i.qtd || 0).replace('.', ','))} ${esc(i.un || '')}</td>${tem ? `<td class="r mono">${q != null ? esc(String(q).replace('.', ',')) : '—'}</td><td>${q == null ? '<span class="pill warn">não está no pedido</span>' : Math.abs(q - (+i.qtd || 0)) < 0.001 ? '<span class="pill ok">confere</span>' : '<span class="pill warn">qtd. diferente</span>'}</td>` : ''}<td class="r mono">${brl2(i.valor)}</td></tr>`; }).join('')}</tbody></table></div></details>`);
        }
      } catch (e) { console.warn('[pyro] itens da nota', e); }
      return r;
    };
  }

  /* ================= Relatórios: comprados sem previsão ================= */
  const relOrig = views.relatorios;
  views.relatorios = function () {
    const h = relOrig(); if (UI.view !== 'relatorios') return h;
    const pode = typeof okw === 'function' && okw('ent'), ids = UI.R && UI.R.obra ? [UI.R.obra] : visibleObras().map(o => o.id);
    const L = S.pedidos.filter(p => ids.includes(p.obraId) && p.status === 'comprado' && !p.demo && !p.semReceb && !(p.fornecs && p.fornecs.length > 1)).filter(p => { const e = entOf(p.id); return !e || (!e.dataPrevista && e.status !== 'recebido'); })
      .sort((a, b) => nm('obras', a.obraId, '').localeCompare(nm('obras', b.obraId, '')) || nm('fornecedores', a.fornecedorId, '').localeCompare(nm('fornecedores', b.fornecedorId, '')));
    if (!L.length) return h;
    const box = `<section class="panel"><details${L.length <= 4 ? ' open' : ''}><summary style="cursor:pointer;list-style:revert"><h2 style="display:inline;font-size:inherit">Comprados sem previsão de entrega <span class="n mono">${L.length}</span></h2> <span class="sub">· ${pode ? 'clique para informar a data combinada: o relatório do dia já sai com a previsão' : 'quem cuida das entregas informa a data aqui'}</span></summary><div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Obra</th><th>Pedido</th><th>Fornecedor</th><th>Previsão</th></tr></thead><tbody>${L.map(p => `<tr><td>${esc(H.curtoObra(by('obras', p.obraId) || { nome: '—' }))}</td><td><div class="t">${esc([pcCod(p), itemLimpo(p)].filter(Boolean).join(' · ') || p.item || '')}</div><div class="s">${esc(catNome(p.categoria))}${p.op ? ' · ' + esc(rdOp(p.op)) : ''}</div></td><td>${esc(nm('fornecedores', p.fornecedorId, '—'))}</td><td>${pode ? `<input class="f" type="date" data-prevset="${esc(p.id)}" aria-label="Previsão de entrega" style="max-width:170px">` : '<span class="muted">a confirmar</span>'}</td></tr>`).join('')}</tbody></table></div></details></section>`;
    const k = '<section class="panel"><div class="sec-h"><h2>Relatório diário por obra</h2>', i = h.indexOf(k);
    return i >= 0 ? h.slice(0, i) + box + h.slice(i) : h + box;
  };
  async function definirPrevisao(pid, d) {
    const p = by('pedidos', pid); if (!p || !d) return;
    const e = entOf(pid);
    if (e) await put('entregas', Object.assign({}, e, { dataPrevista: d }));
    else await put('entregas', { id: 'rce_' + pid, pedidoId: pid, obraId: p.obraId, tipo: 'entrega', status: 'aguardando', dataPrevista: d, reagend: [], criadoEm: Date.now() });
    toast('Previsão salva: ' + fdy(d));
  }

  /* ================= eventos ================= */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-y]'); if (!b) return;
    const a = b.dataset.y;
    if (a === 'enttab') { Y.entTab = b.dataset.v; render(); }
    else if (a === 'cot') abrirCotacoes(b.dataset.id);
    else if (a === 'cotmail') abrirEmail(b.dataset.id);
    else if (a === 'iseg') { Y.iseg = b.dataset.v; render(); }
    else if (a === 'imes') { Y.imes = b.dataset.v || ''; render(); }
    else if (a === 'msem') { Y.msem = !Y.msem; render(); }
    else if (a === 'goaprov') nav('aprov');
    else if (a === 'ligar') modalLigar((UI.N && UI.N.obra) || '');
  });
  document.addEventListener('click', async ev => {
    const b = ev.target.closest && ev.target.closest('[data-erpfan]'); if (!b) return;
    const m = S.erp_pedidos.find(x => x.id === b.dataset.erpfan); if (!m) return;
    const v = prompt('Nome fantasia de ' + (m.fornecedor || 'fornecedor') + ' (vale para todos os pedidos dele):', fantasiaDe(m)); if (v == null) return;
    const lst = S.erp_pedidos.filter(x => (m.codAgente && x.codAgente === m.codAgente) || (!m.codAgente && x.fornecedor === m.fornecedor));
    for (const x of lst) await put('erp_pedidos', Object.assign({}, x, { fantasia: v.trim() }), true);
    toast('Nome fantasia salvo em ' + lst.length + ' pedido(s)');
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-ap]'); if (!b) return;
    b.disabled = true; decidir(b.dataset.id, b.dataset.ap === 'ok', b.closest('[data-aprovcard]')).finally(() => { b.disabled = false; });
  });
  let tq = null;
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t.dataset) return;
    if (t.dataset.yf) { Y[t.dataset.yf] = t.value; if (t.tagName === 'SELECT' || t.type === 'month') { render(); return; } clearTimeout(tq); tq = setTimeout(() => { const k = t.dataset.yf; render(); const n = document.querySelector(`[data-yf="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } }, 250); return; }
    if (t.dataset.n === 'item' || t.dataset.n === 'ped') { UI.N[t.dataset.n] = t.value; clearTimeout(tq); tq = setTimeout(() => { const k = t.dataset.n; render(); const n = document.querySelector(`[data-n="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } }, 250); }
  });
  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches && t.matches('[data-conf]')) { const f = t.files && t.files[0], id = t.dataset.conf; t.value = ''; if (f) conferirPlanilha(id, f); return; }
    if (t.dataset && t.dataset.prevset && t.value) { definirPrevisao(t.dataset.prevset, t.value); return; }
    if (t.matches && t.matches('[data-erpimp]')) { const f = t.files && t.files[0]; t.value = ''; if (f) importarErp(f); return; }
    if (t.dataset && t.dataset.erpobs) { const m = S.erp_pedidos.find(x => x.id === t.dataset.erpobs); if (m) put('erp_pedidos', Object.assign({}, m, { obs: t.value })).then(() => toast('Observação salva')); }
  });

  const st = document.createElement('style');
  st.textContent = `.ind-chart{display:grid;grid-template-columns:repeat(12,1fr);gap:8px;align-items:end;height:200px;padding-top:8px}
  .ic-col.off .ic-bars{opacity:.35}.ic-col.on span{color:var(--accent);font-weight:700}.ic-col:hover .ic-bars{opacity:1}
  .ic-col{display:flex;flex-direction:column;align-items:center;gap:6px;height:100%}.ic-col span{font:500 11px var(--f-mono,monospace);color:var(--muted)}
  .ic-bars{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:3px}.ic-bars i{display:block;width:40%;max-width:22px;min-height:2px;border-radius:4px 4px 0 0}
  .ind-chart .c1,.ic-leg .c1{background:var(--accent)}.ind-chart .c2,.ic-leg .c2{background:var(--info,#0B8A80)}
  .ic-leg{display:flex;gap:16px;font-size:12px;color:var(--muted);margin:8px 0 12px}.ic-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
  .pbi{display:flex;flex-direction:column;gap:14px}.pbi>.sec-h{margin:0}
  .pbi-obra{background:var(--surface);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:14px 16px;display:flex;flex-direction:column;gap:12px}
  .pbi-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.pbi-h b{font:700 15px var(--f-disp,inherit)}
  .pbi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
  .pbi-t{display:flex;align-items:center;gap:10px;background:var(--surface2);border-radius:14px;padding:10px 12px;min-width:0}
  .pbi-n{flex-direction:column;align-items:flex-start;justify-content:center;gap:2px}
  .pbi-donut{width:70px;height:70px;flex:none}.pbi-dv{font:700 17px var(--f-mono,monospace);fill:var(--fg)}
  .pbi-l{font-size:12px;color:var(--muted)}.pbi-s{font-size:11.5px;color:var(--muted)}.pbi-v{font:600 24px/1.1 var(--f-mono,monospace)}
  .pbi-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
  .pbi-uc{border-style:dashed;box-shadow:none}`;
  document.head.appendChild(st);

  FB.ready.then(() => {
    const ouvir = (c, depois) => FB.db.collection(c).onSnapshot(s => { S[c] = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); scheduleRender(); if (depois) setTimeout(depois, 400); }, () => {});
    if (FB.colOk('cotacoes')) ouvir('cotacoes', aplicarPendentes);
    if (FB.colOk('erp_pedidos')) ouvir('erp_pedidos');
    FB.ouvirEquipe(l => { EQUIPE = l || []; });
  });
})();
