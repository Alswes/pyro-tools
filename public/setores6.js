/* ============================================================
   Pyro Tools (Firebase) · v0.16
   A1 Juntar fornecedores duplicados      A2 Dados do fornecedor pelo CNPJ (BrasilAPI)
   A4 Resumo do dia pronto (Relatórios)   F1 Inativar fornecedor
   F2 Fases (lote) editáveis              F4 Lixeira (30 dias, com Restaurar)
   S2 Backup semanal (lembrete ou automático)
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || !window.PYRO_SX || PYRO_FB.claude) return;
  const FB = window.PYRO_FB, SX = window.PYRO_SX;
  const admin = () => FB.setor === 'admin';
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const semAcento = v => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const dig = v => String(v == null ? '' : v).replace(/\D/g, '');
  const modalAberto = () => { const m = document.getElementById('modal'); return !!m && m.classList.contains('open'); };
  const quando = ms => { if (!ms) return ''; const d = new Date(ms); return d.toLocaleDateString('pt-BR') + ' ' + d.toTimeString().slice(0, 5); };

  /* ================= F1 · fornecedor inativo ================= */
  const inativos = () => new Set(S.fornecedores.filter(f => f.inativo).map(f => f.id));
  async function alternarInativo(id) {
    if (!admin()) { toast('Só o administrador inativa fornecedores'); return; }
    const x = by('fornecedores', id); if (!x) return;
    const o = Object.assign({}, x); if (x.inativo) { delete o.inativo; delete o.inativoEm; } else { o.inativo = true; o.inativoEm = Date.now(); }
    if (typeof closeModal === 'function') closeModal();
    await put('fornecedores', o);
    toast(x.inativo ? 'Fornecedor reativado' : 'Fornecedor inativado: sai das listas de escolha, o histórico e a avaliação continuam.');
  }
  /* tira os inativos das listas de escolha (menos dos filtros e de onde já está escolhido) */
  let limpando = false;
  function limparSelects() {
    limpando = false; const I = inativos(); if (!I.size) return;
    document.querySelectorAll('#modal select, #main select').forEach(sel => {
      if (sel.dataset.h !== undefined || sel.dataset.zf !== undefined || sel.dataset.r !== undefined || sel.name === 'para6') return;
      [...sel.options].forEach(o => { if (!I.has(o.value)) return; if (o.selected) { if (!/\(inativo\)$/.test(o.textContent)) o.textContent += ' (inativo)'; } else o.remove(); });
    });
  }
  new MutationObserver(() => { if (!limpando) { limpando = true; requestAnimationFrame(limparSelects); } }).observe(document.body, { childList: true, subtree: true });

  /* ================= A2 · dados pelo CNPJ ================= */
  async function buscarCnpj(f) {
    const box = f.querySelector('#z6-cnpj'), c = dig(f.elements.cnpj.value);
    const msg = (t, bad) => { box.hidden = false; box.style.color = bad ? 'var(--bad)' : ''; box.innerHTML = t; };
    if (c.length !== 14) { msg('Digite o CNPJ completo (14 números).', true); return; }
    msg('Consultando o CNPJ…');
    let d; try {
      const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + c, { headers: { Accept: 'application/json' } });
      if (r.status === 404 || r.status === 400) { msg('CNPJ não encontrado na Receita.', true); return; }
      if (!r.ok) throw new Error('HTTP ' + r.status); d = await r.json();
    } catch (e) { msg('Não consegui consultar agora (sem internet ou o site da consulta está fora). Preencha à mão.', true); return; }
    const fant = String(d.nome_fantasia || '').trim(), raz = String(d.razao_social || '').trim(), nome = fant || raz;
    const tel = dig(d.ddd_telefone_1 || ''), telF = tel.length >= 10 ? `(${tel.slice(0, 2)}) ${tel.slice(2, tel.length - 4)}-${tel.slice(-4)}` : '';
    const set = (n, v, forca) => { const el = f.elements[n]; if (el && v && (forca || !el.value.trim())) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
    const atual = f.elements.nome.value.trim(), codigo = /^[\d\s./-]*$/.test(atual);
    set('nome', nome, codigo); set('telefone', telF); set('email', String(d.email || '').toLowerCase());
    f.elements.cnpj.value = c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    const sit = String(d.descricao_situacao_cadastral || '').toUpperCase(), ok = !sit || sit === 'ATIVA';
    msg(`<b>${esc(raz || nome)}</b>${fant && fant !== raz ? ' · fantasia: ' + esc(fant) : ''}<br>${esc([d.municipio, d.uf].filter(Boolean).join(' / '))}${sit ? ` · situação na Receita: <b style="color:var(${ok ? '--ok' : '--bad'})">${esc(sit)}</b>` : ''}`
      + (!codigo && atual && nome && semAcento(atual) !== semAcento(nome) ? `<br><button type="button" class="btn sm" data-z6="usar-nome" data-nome="${esc(nome)}">Usar o nome “${esc(nome)}”</button>` : ''));
  }

  /* botões dentro do Editar fornecedor: Buscar pelo CNPJ e Inativar */
  if (typeof formForn === 'function') {
    const ffOrig = formForn;
    formForn = function (x) {
      const r = ffOrig.apply(this, arguments);
      try {
        const f = document.getElementById('mform'); if (!f || !f.elements.cnpj) return r;
        const lab = f.elements.cnpj.closest('label');
        if (lab && !f.querySelector('[data-z6="cnpj"]')) {
          lab.insertAdjacentHTML('beforeend', `<button type="button" class="btn sm" data-z6="cnpj" style="margin-top:6px;align-self:flex-start" title="Preenche nome, telefone e e-mail pela consulta pública do CNPJ">Buscar dados pelo CNPJ</button>`);
          f.querySelector('.badges').closest('.full').insertAdjacentHTML('beforebegin', '<div class="full s muted" id="z6-cnpj" hidden></div>');
        }
        if (x && x.id && admin()) {
          const sub = f.querySelector('button[type=submit]');
          if (sub && !f.querySelector('[data-z6="inativar"]')) {
            const b = `<button type="button" class="btn" data-z6="inativar" data-id="${esc(x.id)}" title="${x.inativo ? 'Volta a aparecer nas listas de escolha' : 'Sai das listas de escolha; o histórico e a avaliação ficam guardados'}">${x.inativo ? 'Reativar' : 'Inativar'}</button>`;
            const del = f.querySelector('[data-z5="del-forn"]'); if (del) del.insertAdjacentHTML('afterend', b); else sub.parentNode.insertAdjacentHTML('afterbegin', b);
            const d2 = f.querySelector('[data-z5="del-forn"]'); if (d2) { d2.style.marginRight = '0'; f.querySelector('[data-z6="inativar"]').style.marginRight = 'auto'; } else f.querySelector('[data-z6="inativar"]').style.marginRight = 'auto';
          }
        }
      } catch (e) {}
      return r;
    };
  }

  /* ================= A1 · fornecedores duplicados ================= */
  const chaveNome = n => semAcento(n).replace(/\b(ltda|eireli|epp|me|s\/?a|sa|cia|comercio|industria|ind|com|de|do|da|dos|das|e)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const usos = id => { const U = SX.fornUsos(id); return U.pedidos.length + U.nfs.length + U.entregas.length + U.cotacoes.length; };
  function gruposDuplicados() {
    const F = S.fornecedores.filter(f => !f.demo), pai = {}; F.forEach(f => pai[f.id] = f.id);
    const raiz = a => { while (pai[a] !== a) a = pai[a] = pai[pai[a]]; return a; }, une = (a, b) => { pai[raiz(a)] = raiz(b); };
    const motivo = {};
    for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
      const a = F[i], b = F[j], ca = dig(a.cnpj), cb = dig(b.cnpj), ka = chaveNome(a.nome), kb = chaveNome(b.nome);
      let m = '';
      if (ca.length === 14 && ca === cb) m = 'mesmo CNPJ';
      else if (ca.length === 14 && cb.length === 14 && ca.slice(0, 8) !== cb.slice(0, 8)) m = ''; /* empresas diferentes */
      else if (ka && ka === kb) m = 'mesmo nome';
      else if (ka.length >= 6 && kb.length >= 6 && !/^\d+$/.test(ka) && !/^\d+$/.test(kb) && (ka.startsWith(kb + ' ') || kb.startsWith(ka + ' '))) m = 'nome parecido';
      if (m) { une(a.id, b.id); motivo[a.id] = motivo[a.id] || m; motivo[b.id] = motivo[b.id] || m; }
    }
    const G = {}; F.forEach(f => { const r = raiz(f.id); (G[r] = G[r] || []).push(f); });
    const grupos = Object.values(G).filter(g => g.length > 1).map(g => ({ itens: g.sort((a, b) => (dig(b.cnpj).length === 14) - (dig(a.cnpj).length === 14) || usos(b.id) - usos(a.id)), motivo: motivo[g[0].id] || 'parecidos' }));
    const emGrupo = new Set(grupos.flatMap(g => g.itens.map(f => f.id)));
    const codigos = F.filter(f => !emGrupo.has(f.id) && /^[\d\s./-]+$/.test(String(f.nome || '').trim()));
    return { grupos, codigos };
  }
  async function juntar(fica, saem) {
    const alvo = by('fornecedores', fica); if (!alvo) return 0; let n = 0; const o = Object.assign({}, alvo);
    for (const id of saem) {
      const x = by('fornecedores', id); if (!x || id === fica) continue;
      n += await SX.moverFornecedor(id, fica);
      ['cnpj', 'contato', 'email', 'telefone'].forEach(k => { if (!o[k] && x[k]) o[k] = x[k]; });
      o.cats = [...new Set((o.cats || []).concat(x.cats || []))];
      await del('fornecedores', id, true);
    }
    await put('fornecedores', o, true); return n;
  }
  function abrirDuplicados() {
    if (!admin()) return;
    const D = gruposDuplicados();
    const linha = (f, g, i) => `<label style="display:flex;gap:8px;align-items:flex-start;padding:4px 0"><input type="radio" name="g_${g}" value="${esc(f.id)}" ${i === 0 ? 'checked' : ''}><span><b>${esc(f.nome)}</b>${f.inativo ? ' <span class="pill muted">inativo</span>' : ''}<span class="s muted" style="display:block">${esc(f.cnpj || 'sem CNPJ')} · ${usos(f.id)} uso(s)</span></span></label>`;
    const outros = id => sortNome(S.fornecedores.filter(f => f.id !== id && !f.inativo)).map(f => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('');
    const corpo = (D.grupos.length ? D.grupos.map((g, gi) => `<div class="full" style="border:1px solid var(--line);border-radius:12px;padding:10px 12px"><div class="s muted" style="margin-bottom:4px">${esc(g.motivo)} · marque o que fica</div>${g.itens.map((f, i) => linha(f, gi, i)).join('')}<button type="button" class="btn sm pri" data-z6="juntar" data-g="${gi}" style="margin-top:6px">Juntar estes ${g.itens.length} num só</button></div>`).join('') : '<div class="full muted">Nenhum fornecedor repetido encontrado (mesmo CNPJ ou nome igual ou parecido).</div>')
      + (D.codigos.length ? `<div class="full"><b>Nomes que parecem código</b><div class="s muted">Corrija o nome no Editar ou junte com o fornecedor certo.</div>${D.codigos.map(f => `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid var(--line)"><span style="min-width:120px"><b>${esc(f.nome)}</b><span class="s muted" style="display:block">${usos(f.id)} uso(s)</span></span><select class="f" name="para6" data-de="${esc(f.id)}" aria-label="Juntar ${esc(f.nome)} com"><option value="">Juntar com…</option>${outros(f.id)}</select><button type="button" class="btn sm" data-z6="juntar1" data-id="${esc(f.id)}">Juntar</button><button type="button" class="btn sm ghost" data-act="edit-forn" data-id="${esc(f.id)}">Editar</button></div>`).join('')}</div>` : '');
    modal('Fornecedores duplicados', corpo, { submit: 'Fechar', onSubmit: () => {}, wide: true });
    const f = document.getElementById('mform'); if (f) f._dup = D;
  }
  SX.duplicados = gruposDuplicados; SX.juntarFornecedores = juntar;

  /* ================= F2 · fases (lote) editáveis ================= */
  const PADRAO_FASES = FASES.slice();
  let fasesCfg = null;
  function aplicarFases() {
    const base = (fasesCfg && fasesCfg.length ? fasesCfg : PADRAO_FASES).slice();
    const emUso = [...new Set(S.pedidos.map(p => String(p.fase || '').trim()).filter(Boolean))].filter(x => !base.some(b => semAcento(b) === semAcento(x)));
    const nova = base.concat(emUso.sort());
    if (nova.join('|') === FASES.join('|')) return false;
    FASES.splice(0, FASES.length, ...nova); return true;
  }
  function abrirFases() {
    if (!admin()) return;
    const base = (fasesCfg && fasesCfg.length ? fasesCfg : PADRAO_FASES), usoDe = x => S.pedidos.filter(p => semAcento(p.fase) === semAcento(x)).length;
    modal('Fases (lote) dos pedidos', `<div class="full s muted">Uma fase por linha, na ordem em que deve aparecer nas listas. Uma fase que ainda está em algum pedido continua aparecendo no fim da lista até você trocar a fase desses pedidos.</div>
      <label class="fld full"><span>Fases</span><textarea name="fases" rows="10" spellcheck="false">${esc(base.join('\n'))}</textarea></label>
      <div class="full s muted">Em uso agora: ${esc(FASES.map(x => x + ' (' + usoDe(x) + ')').join(' · '))}</div>`,
      { submit: 'Salvar fases', extra: `<button type="button" class="btn" data-z6="fases-padrao" style="margin-right:auto">Voltar ao padrão</button>`, onSubmit: async f => {
        const mp = new Map(); f.elements.fases.value.split('\n').map(x => x.trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean).forEach(x => { if (!mp.has(semAcento(x))) mp.set(semAcento(x), x); }); const L = [...mp.values()];
        if (!L.length) { if (typeof fail === 'function') return fail(f.elements.fases, 'Escreva pelo menos uma fase'); return false; }
        if (L.length > 30) { if (typeof fail === 'function') return fail(f.elements.fases, 'No máximo 30 fases'); return false; }
        try { await FB.fs.collection('config').doc('fases').set({ lista: L, atualizadoEm: Date.now(), por: FB.nome }); } catch (e) { toast('Não foi possível salvar: ' + (e.code || e.message)); return false; }
        fasesCfg = L; aplicarFases(); toast('Fases salvas'); render();
      } });
  }

  /* ================= F4 · lixeira (30 dias) ================= */
  const COLS_LIX = { pedidos: 'Pedido', fornecedores: 'Fornecedor', obras: 'Obra', entregas: 'Entrega', nfs: 'Nota fiscal', cotacoes: 'Cotação', colaboradores: 'Colaborador' };
  const desfeitos = () => { try { return new Set(JSON.parse(LS.get('pyro_aud_desfeitos') || '[]')); } catch (e) { return new Set(); } };
  function lixeira() {
    const ini = Date.now() - 30 * 864e5, ds = desfeitos(), vistos = new Set();
    return (S.auditoria || []).filter(a => a.acao === 'excluiu' && COLS_LIX[a.col] && !a.massa && (a.em || 0) >= ini && !ds.has(a.id) && a.antes && !(Array.isArray(S[a.col]) && S[a.col].some(x => x.id === a.docId)))
      .sort((a, b) => b.em - a.em).filter(a => { const k = a.col + '/' + a.docId; if (vistos.has(k)) return false; vistos.add(k); return true; });
  }
  function abrirLixeira() {
    if (!admin()) return;
    const L = lixeira();
    modal('Lixeira', `<div class="full s muted">O que foi excluído nos últimos 30 dias. Restaurar recria o registro como estava. Fornecedor que foi juntado com outro volta sem os pedidos (eles ficaram com o fornecedor que recebeu).</div>
      ${L.length ? `<div class="full tablewrap" style="max-height:56vh;overflow:auto"><table><thead><tr><th>O que</th><th>Registro</th><th>Excluído por</th><th></th></tr></thead><tbody>${L.map(a => `<tr><td>${esc(COLS_LIX[a.col])}</td><td class="t">${esc(a.rotulo || (a.antes && (a.antes.nome || a.antes.item)) || a.docId)}</td><td>${esc(a.nome || '')}<div class="s muted">${esc(quando(a.em))} · faltam ${Math.max(0, 30 - Math.floor((Date.now() - a.em) / 864e5))} dia(s)</div></td><td class="r"><button type="button" class="btn sm" data-z="undo" data-id="${esc(a.id)}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="full muted">A lixeira está vazia.</div>'}`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true });
  }
  SX.lixeira = lixeira;

  /* ================= S2 · backup semanal ================= */
  const LS_BK = 'pyro_last_backup_v1';
  const diasSemBackup = () => { const lb = LS.get(LS_BK) || ''; if (!lb) return 999; const d = new Date(lb.slice(0, 10) + 'T00:00:00'); return Math.floor((Date.now() - d.getTime()) / 864e5); };
  if (typeof backupNow === 'function') {
    const bkOrig = backupNow;
    backupNow = async function () {
      const antes = LS.get(LS_BK); const r = await bkOrig.apply(this, arguments);
      /* registra no banco quando foi o último backup, para valer em qualquer computador do administrador */
      setTimeout(() => { const depois = LS.get(LS_BK); if (depois && depois !== antes && admin()) FB.fs.collection('config').doc('backup').set({ em: depois, por: FB.nome, ts: Date.now() }).catch(() => {}); }, 1500);
      return r;
    };
  }
  /* aviso na Home do administrador (não abre janela por cima do que a pessoa está fazendo) */
  const backupDevido = () => admin() && diasSemBackup() >= 7;
  function bannerBackup() {
    if (!backupDevido() || LS.get('pyro_bk_adiado') === today() || LS.get('pyro_bk_auto') === '1') return '';
    const dias = diasSemBackup();
    return `<div class="banner" id="z6-bk" style="margin-bottom:14px"><span><b>Backup semanal:</b> ${dias >= 999 ? 'ainda não foi feito nenhum backup neste computador.' : `o último foi há ${dias} dia(s).`}</span><button type="button" class="btn sm pri" data-z6="bk-agora">Fazer backup agora</button><button type="button" class="btn sm" data-z6="bk-auto" title="Neste computador, o Pyro baixa o backup sozinho quando passar de 7 dias">Baixar sozinho toda semana</button><button type="button" class="btn sm ghost" data-z6="bk-depois">Lembrar amanhã</button></div>`;
  }
  function lembrarBackup() {
    if (!backupDevido()) return;
    if (LS.get('pyro_bk_auto') === '1') { toast('Backup semanal automático: baixando o arquivo…'); backupNow(); return; }
    if (UI.view === 'home') scheduleRender();
  }
  SX.lembrarBackup = lembrarBackup;

  /* ================= A4 · resumo do dia ================= */
  function resumoDia() {
    const t = today(), d1 = new Date(Date.now() + 864e5), am = iso(d1);
    const ped = id => by('pedidos', id), rot = p => `${p.item || 'Pedido'} (${nm('obras', p.obraId, '—')}${p.fornecedorId ? ' · ' + nm('fornecedores', p.fornecedorId, '') : ''}${p.pc ? ' · PC ' + p.pc : ''})`;
    const vivos = S.entregas.map(e => ({ e, p: ped(e.pedidoId) })).filter(x => x.p && !x.p.demo && x.p.status !== 'cancelado');
    const chegou = []; vivos.forEach(({ e, p }) => (e.recebimentos || []).filter(r => r.data === t).forEach(r => chegou.push(`${rot(p)}${r.nf ? ' · NF ' + r.nf : ''}${e.status === 'recebido' ? ' · completo' : ' · parcial' + (r.pct ? ' ' + r.pct + '%' : '')}`)));
    const atras = vivos.filter(x => isLate(x.e)).sort((a, b) => a.e.dataPrevista.localeCompare(b.e.dataPrevista)).map(({ e, p }) => `${rot(p)} · previsto para ${fdy(e.dataPrevista)} (${dayDiff(t, e.dataPrevista)} dia(s))`);
    const amanha = vivos.filter(x => x.e.status !== 'recebido' && x.e.dataPrevista === am).map(x => rot(x.p));
    const canc = S.pedidos.filter(p => !p.demo && p.status === 'cancelado' && p.canceladoEm && iso(new Date(p.canceladoEm)) === t).map(p => `${rot(p)} · motivo: ${p.motivoCancelamento || '—'}`);
    const semPrev = vivos.filter(x => x.p.status === 'comprado' && x.e.status !== 'recebido' && !x.e.dataPrevista).length;
    return { dia: t, chegou, atras, amanha, canc, semPrev };
  }
  function resumoTexto(R) {
    const sec = (t, L, vazio, max) => `${t} (${L.length})\n` + (L.length ? L.slice(0, max || 40).map(x => '- ' + x).join('\n') + (L.length > (max || 40) ? `\n- … e mais ${L.length - (max || 40)}` : '') : '- ' + vazio);
    return [`Resumo de compras · ${fdy(R.dia)}`, sec('CHEGOU HOJE', R.chegou, 'Nenhuma chegada registrada hoje'), sec('ATRASADOS', R.atras, 'Nenhum pedido atrasado', 25), sec('PREVISTO PARA AMANHÃ', R.amanha, 'Nada previsto'), sec('CANCELADOS HOJE', R.canc, 'Nenhum'), `COMPRADOS SEM PREVISÃO: ${R.semPrev}`].join('\n\n');
  }
  function resumoHtml() {
    const R = resumoDia(), bl = (t, L, cor, max) => `<div class="repsec"><h3${cor && L.length ? ` style="color:var(${cor})"` : ''}>${t} <span class="n mono">${L.length}</span></h3>${L.length ? `<ul>${L.slice(0, max || 12).map(x => `<li>${esc(x)}</li>`).join('')}${L.length > (max || 12) ? `<li class="muted">… e mais ${L.length - (max || 12)} (o texto copiado traz mais)</li>` : ''}</ul>` : '<p class="muted" style="margin:0">Nada hoje.</p>'}</div>`;
    return `<section class="panel" id="z6-resumo"><div class="sec-h"><h2>Resumo do dia</h2><span class="sub">montado sozinho · ${fdy(R.dia)}</span></div>
      <div class="rows"><div class="badges" style="margin-bottom:10px"><button type="button" class="btn pri" data-z6="res-copy">${ic('copy', 15)} Copiar resumo</button><button type="button" class="btn" data-z6="res-mail">${ic('mail', 15)} Abrir no e-mail</button><span class="muted s">Comprados sem previsão: <b>${R.semPrev}</b></span></div>
      ${bl('Chegou hoje', R.chegou, '--ok')}${bl('Atrasados', R.atras, '--bad')}${bl('Previsto para amanhã', R.amanha)}${bl('Cancelados hoje', R.canc)}</div></section>`;
  }
  SX.resumoDia = resumoDia; SX.resumoDiaTexto = () => resumoTexto(resumoDia());

  /* ================= telas ================= */
  if (views.relatorios) { const o = views.relatorios; views.relatorios = function () {
    const h = o(); if (UI.view !== 'relatorios') return h;
    const alvo = '<section class="panel"><div class="sec-h"><h2>Relatório diário por obra</h2>', i = h.indexOf(alvo);
    try { return i >= 0 ? h.slice(0, i) + resumoHtml() + h.slice(i) : h + resumoHtml(); } catch (e) { return h; }
  }; }
  if (views.home) { const o = views.home; views.home = function () {
    let h = o(); if (UI.view !== 'home') return h;
    try { h = bannerBackup() + h; } catch (e) {}
    try {
      if (!(admin() || FB.setor === 'compras') || !FB.pagOk('relatorios') || new Date().getHours() < 16 || LS.get('pyro_res_visto') === today()) return h;
      const R = resumoDia();
      return `<div class="banner" style="margin-bottom:14px"><span><b>Resumo do dia pronto:</b> ${R.chegou.length} chegada(s), ${R.atras.length} atrasado(s), ${R.canc.length} cancelado(s).</span><button type="button" class="btn sm pri" data-z6="res-abrir">Abrir resumo</button></div>` + h;
    } catch (e) { return h; }
  }; }
  if (views.config) { const o = views.config; views.config = function () {
    let h = o(); if (UI.view !== 'config' || !admin()) return h;
    try {
      if (UI.set === 'fornecedores') {
        const D = gruposDuplicados(), nd = D.grupos.length + D.codigos.length, nl = lixeira().filter(a => a.col === 'fornecedores').length;
        h = h.replace('<button class="btn pri w" data-act="new-forn">', `<button type="button" class="btn w" data-z6="dup">Procurar duplicados${nd ? ` <span class="pill warn">${nd}</span>` : ''}</button><button type="button" class="btn w" data-z6="lixeira">Lixeira${nl ? ` <span class="pill muted">${nl}</span>` : ''}</button><button class="btn pri w" data-act="new-forn">`);
        S.fornecedores.filter(f => f.inativo).forEach(f => { h = h.replace(`<button class="btn sm w" data-act="edit-forn" data-id="${f.id}">`, `<span class="pill muted" style="margin-right:8px">inativo</span><button class="btn sm w" data-act="edit-forn" data-id="${f.id}">`); });
      }
      if (UI.set === 'obras') h = h.replace('<button class="btn pri w" data-act="new-obra">', `<button type="button" class="btn w" data-z6="fases">Fases (lote)</button><button type="button" class="btn w" data-z6="lixeira">Lixeira</button><button class="btn pri w" data-act="new-obra">`);
    } catch (e) {}
    return h;
  }; }
  if (views.audit) { const o = views.audit; views.audit = function () {
    const h = o(); if (UI.view !== 'audit' || !admin()) return h;
    const n = lixeira().length;
    return `<div class="badges" style="margin-bottom:10px"><button type="button" class="btn" data-z6="lixeira">Lixeira${n ? ` <span class="pill muted">${n}</span>` : ''}</button></div>` + h;
  }; }

  /* ================= eventos ================= */
  document.addEventListener('click', async ev => {
    const u = ev.target.closest && ev.target.closest('#modal [data-z="undo"]'); if (u) setTimeout(() => { if (document.querySelector('#mform [data-z="undo"]')) abrirLixeira(); }, 900);
    const b = ev.target.closest && ev.target.closest('[data-z6]'); if (!b) return;
    ev.preventDefault(); const a = b.dataset.z6, f = b.closest('form');
    if (a === 'cnpj') buscarCnpj(f);
    else if (a === 'usar-nome') { f.elements.nome.value = b.dataset.nome; b.remove(); }
    else if (a === 'inativar') alternarInativo(b.dataset.id);
    else if (a === 'dup') abrirDuplicados();
    else if (a === 'juntar') {
      const g = f._dup.grupos[+b.dataset.g], fica = (f.querySelector(`input[name="g_${b.dataset.g}"]:checked`) || {}).value; if (!g || !fica) return;
      const saem = g.itens.map(x => x.id).filter(id => id !== fica);
      if (!confirm(`Juntar ${g.itens.length} fornecedores em ${by('fornecedores', fica).nome}? Os pedidos, notas, entregas e cotações dos outros passam para ele.`)) return;
      b.disabled = true; const n = await juntar(fica, saem); toast(`Fornecedores juntados. ${n} registro(s) passaram para ${by('fornecedores', fica).nome}.`); abrirDuplicados();
    }
    else if (a === 'juntar1') {
      const sel = f.querySelector(`select[data-de="${b.dataset.id}"]`), para = sel && sel.value; if (!para) { toast('Escolha com qual fornecedor juntar'); return; }
      if (!confirm(`Juntar ${by('fornecedores', b.dataset.id).nome} com ${by('fornecedores', para).nome}?`)) return;
      b.disabled = true; const n = await juntar(para, [b.dataset.id]); toast(`Juntado. ${n} registro(s) passaram para ${by('fornecedores', para).nome}.`); abrirDuplicados();
    }
    else if (a === 'fases') abrirFases();
    else if (a === 'fases-padrao') { f.elements.fases.value = PADRAO_FASES.join('\n'); }
    else if (a === 'lixeira') abrirLixeira();
    else if (a === 'bk-depois') { LS.set('pyro_bk_adiado', today()); render(); }
    else if (a === 'bk-agora') { await backupNow(); }
    else if (a === 'bk-auto') { LS.set('pyro_bk_auto', '1'); toast('Combinado: neste computador o backup baixa sozinho toda semana.'); await backupNow(); }
    else if (a === 'res-copy') { const t = resumoTexto(resumoDia()); LS.set('pyro_res_visto', today()); try { await navigator.clipboard.writeText(t); toast('Resumo copiado. Cole no e-mail'); } catch (e) { if (typeof copyText === 'function') copyText(t); } }
    else if (a === 'res-mail') { LS.set('pyro_res_visto', today()); location.href = 'mailto:?subject=' + encodeURIComponent('Resumo de compras · ' + fdy(today())) + '&body=' + encodeURIComponent(resumoTexto(resumoDia()).slice(0, 1800)); }
    else if (a === 'res-abrir') { LS.set('pyro_res_visto', today()); nav('relatorios'); setTimeout(() => { const el = document.getElementById('z6-resumo'); if (el) el.scrollIntoView({ block: 'start' }); }, 400); }
  });

  FB.ready.then(() => {
    try { FB.fs.collection('config').doc('fases').onSnapshot(d => { const x = d.exists ? d.data() : null; fasesCfg = x && Array.isArray(x.lista) ? x.lista.filter(v => typeof v === 'string' && v.trim()).slice(0, 30) : null; if (aplicarFases()) scheduleRender(); }, () => {}); } catch (e) {}
    setInterval(() => { try { if (aplicarFases()) scheduleRender(); } catch (e) {} }, 20000);
    if (admin()) {
      FB.fs.collection('config').doc('backup').get().then(d => { const x = d.exists ? d.data() : null; if (x && typeof x.em === 'string' && x.em > (LS.get(LS_BK) || '')) LS.set(LS_BK, x.em); }).catch(() => {}).then(() => setTimeout(lembrarBackup, 9000));
    }
  });
})();
