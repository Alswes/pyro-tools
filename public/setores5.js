/* ============================================================
   Pyro Tools (Firebase) · v0.14 (v0.14.2: cancelar e reativar conferem a permissão também quando chamados direto)
   - Cancelar pedido de compra (com motivo), na página da obra
   - Pedido cancelado continua visível na obra, sem ações, com a etiqueta "Cancelado" e o olho para ver o motivo
   - Itens de pedido cancelado saem de Pedidos e Recebimento
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || !window.PYRO_SX || PYRO_FB.claude) return;
  const FB = window.PYRO_FB, SX = window.PYRO_SX;
  const pode = () => FB.setor === 'admin' || (typeof FB.podeCancelar === 'function' ? FB.podeCancelar() : (typeof okw === 'function' && okw('ped')));
  const PODE_CANCELAR = ['cotacao', 'analise', 'aprov_obra', 'aprov_int', 'comprado'];
  const quando = ms => { if (!ms) return ''; const d = new Date(ms); return d.toLocaleDateString('pt-BR') + ' ' + d.toTimeString().slice(0, 5); };

  /* ---------- linhas dos cancelados na tabela da obra ---------- */
  function canceladosDaObra() {
    const o = UI.detail; if (!o) return [];
    if (UI.st && UI.st !== 'cancelado') return [];
    return S.pedidos.filter(p => p.obraId === o && p.status === 'cancelado' && !p.demo)
      .filter(p => (!UI.cat || p.categoria === UI.cat) && (!UI.of || p.fornecedorId === UI.of) && (!UI.oq || (typeof pedHay === 'function' ? matchQ(pedHay(p), UI.oq) : true)) && (!UI.fase || typeof faseOk !== 'function' || faseOk(p, UI.fase)))
      .sort((a, b) => (b.canceladoEm || 0) - (a.canceladoEm || 0));
  }
  function linhaCancelada(p) {
    return `<tr class="ped-canc" data-canc="${esc(p.id)}">
      <td><div class="t">${esc(p.item || '')}</div><div class="s">${esc(p.fase || '—')} · ${esc(catNome(p.categoria))}</div></td>
      <td class="mono"><div>${p.op ? 'OP ' + esc(p.op) : ''}</div><div class="s">${p.pc ? 'PC ' + esc(p.pc) : ''}</div>${p.erpPedido ? `<div class="s">ERP ${esc(p.erpPedido)}</div>` : ''}</td>
      <td><span class="pill bad">Cancelado</span><div class="s">${esc(p.canceladoPor || '')}${p.canceladoEm ? ' · ' + esc(quando(p.canceladoEm)) : ''}</div></td>
      <td class="mono">—</td>
      <td class="r mono">${p.valor ? brl(p.valor) : '—'}</td>
      <td class="r"><button type="button" class="btn sm ghost" data-z5="ver" data-id="${esc(p.id)}" title="Ver o motivo do cancelamento" aria-label="Ver o motivo do cancelamento de ${esc(p.item || 'pedido')}">👁</button></td></tr>`;
  }
  const btnCancelar = id => `<button class="btn sm w ped-cancel-btn" data-z5="cancelar" data-id="${esc(id)}" title="Cancelar este pedido (pede o motivo)" aria-label="Cancelar pedido">${ic('x', 13)}</button>`;

  const obraOrig = views.obra;
  views.obra = function () {
    let h = obraOrig(); if (UI.view !== 'obra') return h;
    /* botão Cancelar ao lado do lápis, só nos pedidos que ainda podem ser cancelados */
    if (pode()) h = h.replace(/<button class="btn sm w" data-act="edit-ped" data-id="([^"]+)" aria-label="Editar pedido">/g, (m, id) => { const p = by('pedidos', id); return p && PODE_CANCELAR.includes(p.status) ? btnCancelar(id) + m : m; });
    const C = canceladosDaObra(); if (!C.length) return h;
    const linhas = C.map(linhaCancelada).join('');
    const fim = '</tbody></table></div>', i = h.lastIndexOf(fim);
    const vazio = '<div style="padding:24px 16px;color:var(--muted)">Nenhum pedido para este filtro.</div>';
    if (UI.st === 'cancelado' && h.includes(vazio)) return h.replace(vazio, `<div class="tablewrap"><table><thead><tr><th>Item</th><th>OP / PC</th><th>Status e responsável</th><th>Previsão</th><th class="r">Valor</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`);
    if (i >= 0) return h.slice(0, i) + linhas + h.slice(i);
    return h.replace(vazio, `<div class="tablewrap"><table><tbody>${linhas}</tbody></table></div>`);
  };

  /* ---------- cancelar ---------- */
  function cancelar(id) {
    if (!pode()) { toast('Seu setor não pode cancelar pedidos'); return; }
    const p = by('pedidos', id); if (!p) return;
    if (!PODE_CANCELAR.includes(p.status)) { toast('Este pedido não pode ser cancelado (' + (PSTAT[p.status] || p.status) + ')'); return; }
    const e = entOf(p.id), itens = linhasDoPedido(p.id), recebeu = itens.some(r => (r.recebimentos || []).length) || (e && (e.recebimentos || []).length);
    modal('Cancelar pedido', `<div class="full"><b>${esc(p.item || 'Pedido')}</b><div class="muted">${esc(nm('obras', p.obraId))} · ${esc([p.pc ? 'PC ' + p.pc : '', p.op ? 'OP ' + p.op : '', p.erpPedido ? 'ERP ' + p.erpPedido : ''].filter(Boolean).join(' · '))} · ${esc(PSTAT[p.status] || p.status)}${p.valor ? ' · ' + brl2(p.valor) : ''}</div></div>
      <div class="full s muted">O pedido não é apagado: continua na obra com a etiqueta Cancelado e o motivo. Os ${itens.length} item(ns) dele saem de Pedidos e Recebimento e o valor deixa de contar no budget.</div>
      ${recebeu ? '<div class="full banner" style="margin:0"><span>Este pedido já tem recebimento registrado. Confira antes de cancelar.</span></div>' : ''}
      <label class="fld full"><span>Motivo do cancelamento (obrigatório)</span><textarea name="motivo" rows="4" required placeholder="Ex.: obra mudou o projeto; fornecedor não conseguiu atender; pedido lançado em duplicidade"></textarea></label>`,
      { submit: 'Cancelar pedido', onSubmit: async f => {
        const motivo = f.elements.motivo.value.trim();
        if (motivo.length < 5) { if (typeof fail === 'function') return fail(f.elements.motivo, 'Escreva o motivo do cancelamento'); toast('Escreva o motivo do cancelamento'); return false; }
        const agora = Date.now();
        await put('pedidos', Object.assign({}, p, { status: 'cancelado', statusAntes: p.status, canceladoEm: agora, canceladoPor: FB.nome, motivoCancelamento: motivo, cancelamentos: (p.cancelamentos || []).concat([{ em: agora, por: FB.nome, motivo, statusAntes: p.status }]), updatedAt: agora }));
        const falhas = await marcarItens(itens, agora);
        S.painel_pedidos = S.painel_pedidos.filter(r => !itens.includes(r));
        toast(falhas ? `Pedido cancelado. ${falhas} item(ns) saem do Recebimento quando o administrador ou o Recebimento abrir o Pyro (seu setor não grava no Recebimento).` : 'Pedido cancelado. Ele continua na obra com o motivo.');
      } });
  }
  /* marca os itens do Recebimento como cancelados; devolve quantos o setor não conseguiu gravar */
  async function marcarItens(itens, agora) {
    let falhas = 0;
    for (const r of itens) {
      const o = Object.assign({}, r, { cancelado: true, canceladoEm: agora || Date.now() });
      try { await FB.fs.collection('painel_pedidos').doc(r.id).set(JSON.parse(JSON.stringify(o))); } catch (e) { falhas++; }
    }
    return falhas;
  }
  /* autocorreção: itens de pedido cancelado que ainda aparecem (cancelado por um setor sem gravação no Recebimento) */
  let curando = false;
  async function curar() {
    if (curando || !Array.isArray(S.pedidos) || !Array.isArray(S.painel_pedidos)) return;
    const canc = new Set(S.pedidos.filter(p => p.status === 'cancelado').map(p => p.id)); if (!canc.size) return;
    const sobra = S.painel_pedidos.filter(r => canc.has(r.pyPedidoId)); if (!sobra.length) return;
    S.painel_pedidos = S.painel_pedidos.filter(r => !canc.has(r.pyPedidoId));
    if (!(FB.setor === 'admin' || (FB.recEdita && FB.recEdita()))) return;
    curando = true; try { await marcarItens(sobra); } finally { curando = false; }
  }
  FB.ready.then(() => { setTimeout(curar, 4000); setInterval(curar, 60000); });
  SX.curarCancelados = curar;

  /* ---------- ver motivo (e reativar) ---------- */
  function verMotivo(id) {
    const p = by('pedidos', id); if (!p) return;
    const hist = (p.cancelamentos || []).slice().reverse();
    const f = modal('Pedido cancelado', `<div class="full"><b>${esc(p.item || 'Pedido')}</b><div class="muted">${esc(nm('obras', p.obraId))} · ${esc([p.pc ? 'PC ' + p.pc : '', p.op ? 'OP ' + p.op : ''].filter(Boolean).join(' · '))}${p.valor ? ' · ' + brl2(p.valor) : ''}</div></div>
      <div class="full canc-box"><div class="s muted">Cancelado por <b>${esc(p.canceladoPor || '—')}</b>${p.canceladoEm ? ' em ' + esc(quando(p.canceladoEm)) : ''}${p.statusAntes ? ' · estava ' + esc(PSTAT[p.statusAntes] || p.statusAntes) : ''}</div>
        <p style="margin:8px 0 0;white-space:pre-wrap">${esc(p.motivoCancelamento || 'Sem motivo registrado.')}</p></div>
      ${hist.length > 1 ? `<div class="full s muted">Histórico: ${hist.map(x => esc(quando(x.em) + ' · ' + x.por + ': ' + x.motivo)).join('<br>')}</div>` : ''}`,
      { submit: 'Fechar', onSubmit: () => {}, extra: pode() ? `<button type="button" class="btn" data-z5="reativar" data-id="${esc(p.id)}" style="margin-right:auto">${ic('back', 14)} Reativar pedido</button>` : '' });
    return f;
  }
  async function reativar(id) {
    if (!pode()) { toast('Seu setor não pode reativar pedidos'); return; }
    const p = by('pedidos', id); if (!p || p.status !== 'cancelado') return;
    if (!confirm(`Reativar o pedido ${p.item || ''}? Ele volta como ${PSTAT[p.statusAntes || 'cotacao'] || 'Em cotação'} e os itens voltam para Pedidos e Recebimento.`)) return;
    const { status, canceladoEm, canceladoPor, motivoCancelamento, ...resto } = p;
    await put('pedidos', Object.assign({}, resto, { status: p.statusAntes || 'cotacao', reativadoEm: Date.now(), reativadoPor: FB.nome, updatedAt: Date.now() }));
    try {
      const snap = await FB.fs.collection('painel_pedidos').where('pyPedidoId', '==', p.id).get();
      for (const d of snap.docs) { const r = d.data(); if (r.cancelado) { const { cancelado, canceladoEm: ce, ...rr } = r; await FB.fs.collection('painel_pedidos').doc(d.id).set(Object.assign(rr, { reativadoEm: Date.now() })); } }
    } catch (e) { toast('Pedido reativado, mas não consegui devolver os itens ao Recebimento: ' + (e.code || e.message)); }
    if (typeof closeModal === 'function') closeModal();
    toast('Pedido reativado');
  }

  /* ================= v0.15.2: excluir fornecedor (só o administrador) =================
     Sem uso: confirma e exclui. Com pedidos, notas, entregas ou cotações: pede o fornecedor que fica no lugar,
     passa tudo para ele e só então exclui (nada fica sem fornecedor). */
  const usosForn = id => ({
    pedidos: S.pedidos.filter(p => p.fornecedorId === id || (p.fornecs || []).some(x => x.fornecedorId === id)),
    nfs: (S.nfs || []).filter(n => n.fornecedorId === id),
    entregas: (S.entregas || []).filter(e => e.fornecedorId === id),
    cotacoes: (S.cotacoes || []).filter(c => (c.opcoes || []).some(o => o.fornecedorId === id))
  });
  /* passa pedidos, notas, entregas e cotações de um fornecedor para outro (usado no Excluir e no Juntar duplicados) */
  async function moverForn(id, para) {
    const U = usosForn(id), agora = Date.now();
    for (const p of U.pedidos) await put('pedidos', Object.assign({}, p, { fornecedorId: p.fornecedorId === id ? para : p.fornecedorId, fornecs: p.fornecs ? p.fornecs.map(z => z.fornecedorId === id ? Object.assign({}, z, { fornecedorId: para }) : z) : p.fornecs, updatedAt: agora }), true);
    for (const nf of U.nfs) await put('nfs', Object.assign({}, nf, { fornecedorId: para }), true);
    for (const e of U.entregas) await put('entregas', Object.assign({}, e, { fornecedorId: para }), true);
    for (const c of U.cotacoes) await put('cotacoes', Object.assign({}, c, { opcoes: c.opcoes.map(o => o.fornecedorId === id ? Object.assign({}, o, { fornecedorId: para }) : o) }), true);
    return U.pedidos.length + U.nfs.length + U.entregas.length + U.cotacoes.length;
  }
  SX.fornUsos = usosForn; SX.moverFornecedor = moverForn;
  async function excluirForn(id) {
    if (FB.setor !== 'admin') { toast('Só o administrador exclui fornecedores'); return; }
    const x = by('fornecedores', id); if (!x) return;
    const U = usosForn(id), n = U.pedidos.length + U.nfs.length + U.entregas.length + U.cotacoes.length;
    if (!n) {
      if (!confirm(`Excluir o fornecedor ${x.nome}? Ele não tem pedidos, notas, entregas nem cotações.`)) return;
      if (typeof closeModal === 'function') closeModal();
      await del('fornecedores', id); toast('Fornecedor excluído'); return;
    }
    const outros = sortNome(S.fornecedores.filter(f => f.id !== id));
    const partes = [[U.pedidos.length, 'pedido(s)'], [U.nfs.length, 'nota(s) fiscal(is)'], [U.entregas.length, 'entrega(s)'], [U.cotacoes.length, 'cotação(ões)']].filter(a => a[0]).map(a => a[0] + ' ' + a[1]).join(', ');
    modal('Excluir fornecedor', `<div class="full"><b>${esc(x.nome)}</b><div class="muted">${esc(x.cnpj || 'sem CNPJ')}</div></div>
      <div class="full banner" style="margin:0"><span>Este fornecedor está em ${esc(partes)}. Escolha o fornecedor que fica no lugar: tudo passa para ele antes de excluir.</span></div>
      <label class="fld full"><span>Passar tudo para (obrigatório)</span><select name="para" required><option value="">Selecione…</option>${outros.map(f => `<option value="${esc(f.id)}">${esc(f.nome)}${f.cnpj ? ' · ' + esc(f.cnpj) : ''}</option>`).join('')}</select></label>`,
      { submit: 'Passar e excluir', onSubmit: async f => {
        const para = f.elements.para.value; if (!para || !by('fornecedores', para)) { if (typeof fail === 'function') return fail(f.elements.para, 'Escolha o fornecedor que fica no lugar'); toast('Escolha o fornecedor que fica no lugar'); return false; }
        await moverForn(id, para);
        await del('fornecedores', id);
        toast(`Fornecedor excluído. ${partes} passaram para ${by('fornecedores', para).nome}.`);
      } });
  }
  SX.excluirFornecedor = excluirForn;
  if (typeof formForn === 'function') {
    const ffOrig = formForn;
    formForn = function (x) {
      const r = ffOrig.apply(this, arguments);
      try {
        if (x && x.id && FB.setor === 'admin') {
          const f = document.getElementById('mform'), sub = f && f.querySelector('button[type=submit]');
          if (sub && !f.querySelector('[data-z5="del-forn"]')) sub.parentNode.insertAdjacentHTML('afterbegin', `<button type="button" class="btn" data-z5="del-forn" data-id="${esc(x.id)}" style="margin-right:auto;color:var(--bad);border-color:color-mix(in srgb,var(--bad) 45%,transparent)">${ic('x', 14)} Excluir fornecedor</button>`);
        }
      } catch (e) {}
      return r;
    };
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-z5]'); if (!b) return;
    ev.preventDefault(); const a = b.dataset.z5;
    if (a === 'cancelar') cancelar(b.dataset.id);
    else if (a === 'ver') verMotivo(b.dataset.id);
    else if (a === 'reativar') reativar(b.dataset.id);
    else if (a === 'del-forn') excluirForn(b.dataset.id);
  });
  SX.cancelarPedido = cancelar; SX.verCancelamento = verMotivo;

  const st = document.createElement('style');
  st.textContent = `.ped-canc td{opacity:.62}.ped-canc td:last-child{opacity:1}.ped-canc .t{text-decoration:line-through;text-decoration-thickness:1px}
  .ped-cancel-btn:hover{color:var(--bad)!important;border-color:var(--bad)!important}
  .canc-box{background:var(--bad-soft,rgba(220,60,60,.1));border:1px solid color-mix(in srgb,var(--bad) 35%,transparent);border-radius:12px;padding:12px 14px}`;
  document.head.appendChild(st);
})();
