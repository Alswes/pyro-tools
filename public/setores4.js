/* ============================================================
   Pyro Tools (Firebase) · v0.10 e v0.11
   - v0.10 Avaliação de fornecedores (IQF): prazo, entregas por pedido, não conformidades, orçado x faturado
   - v0.11 Auditoria estilo Git com alertas (administrador), quem está online e chat entre usuários
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || !window.PYRO_SX || PYRO_FB.claude) return;
  const FB = window.PYRO_FB, SX = window.PYRO_SX, H = SX.h;
  const Z = { per: '12m', obra: '', cat: '', q: '', au: '', ac: '', col: '', dia: '', aq: '', soAl: false, lim: 80 };
  S.auditoria = S.auditoria || []; S.presenca = S.presenca || []; S.chat = S.chat || []; S.ocorrencias = S.ocorrencias || [];
  Object.assign(ICONS, {
    medal: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13 7 21l5-3 5 3-1.5-8"/>',
    term: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>'
  });
  Object.assign(TITLES, { avf: 'Avaliação de fornecedores', audit: 'Auditoria' });
  SX.extra.push(
    { v: 'avf', ic: 'medal', nome: 'Avaliação de fornecedores', curto: '', ok: () => FB.pagOk('avf') },
    { v: 'audit', ic: 'term', nome: 'Auditoria', curto: '', ok: () => FB.setor === 'admin' }
  );
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const fmtN = (n, d) => (+n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d == null ? 1 : d });
  const hora = ms => { const d = new Date(ms); return d.toLocaleDateString('pt-BR').slice(0, 5) + ' ' + d.toTimeString().slice(0, 5); };

  /* =====================================================================
     v0.10 · AVALIAÇÃO DE FORNECEDORES
     ===================================================================== */
  const CLASSE = s => s == null ? { k: '—', tone: 'muted', txt: 'Sem entregas' } : s >= 85 ? { k: 'A', tone: 'ok', txt: 'A · Aprovado' } : s >= 70 ? { k: 'B', tone: 'warn', txt: 'B · Aprovado com ressalvas' } : { k: 'C', tone: 'bad', txt: 'C · Plano de ação' };
  const COR = { A: 'var(--ok)', B: 'var(--warn)', C: 'var(--bad)', '—': 'var(--muted)' };
  function desde() {
    const t = today();
    return { '3m': addDays(t, -91), '6m': addDays(t, -182), '12m': addDays(t, -365), ano: t.slice(0, 4) + '-01-01', tudo: '' }[Z.per] || '';
  }
  const dataRef = p => p.cotacaoAprovadaEm || p.inicioCotacao || (p.createdAt ? iso(new Date(p.createdAt)) : '');
  /* uma linha por entrega (por fornecedor, quando o pedido tem vários) */
  function registros() {
    const ini = desde(), t = today(), out = [];
    S.pedidos.forEach(p => {
      if (p.demo || p.status === 'cancelado' || !['comprado', 'recebido'].includes(p.status)) return;
      if (Z.obra && p.obraId !== Z.obra) return; if (Z.cat && p.categoria !== Z.cat) return;
      const e = entOf(p.id), multi = p.fornecs && p.fornecs.length > 1;
      if (multi) {
        p.fornecs.forEach(x => { if (!x.fornecedorId || x.status === 'cancelado') return; const ok = x.recebido || x.status === 'recebido', ch = x.dataRec || '', ref = ch || x.dataPrevista || '';
          if (ini && ref && ref < ini) return;
          out.push({ forn: x.fornecedorId, p, e, recebido: ok, chegou: ch, prevista: x.dataPrevista || '', base: x.dataPrevista || '', n: 1, reag: 0, motivos: [], aberto: !ok, late: !ok && x.dataPrevista && x.dataPrevista < t }); });
        return;
      }
      if (!p.fornecedorId || p.semReceb) return;
      const ok = p.status === 'recebido' || (e && e.status === 'recebido');
      const ch = (e && e.dataChegada) || '', base = e ? ((e.reagend && e.reagend.length && e.reagend[0].de) || e.dataPrevista || '') : '';
      const ref = ok ? ch : ((e && e.dataPrevista) || dataRef(p));
      if (ini && ref && ref < ini) return;
      const recs = (e && e.recebimentos) || [], motivos = [];
      recs.filter(r => !r.final).forEach(r => motivos.push('chegada parcial' + (r.obs ? ': ' + String(r.obs).slice(0, 80) : '')));
      ((e && e.reagend) || []).forEach(r => r.motivo && motivos.push('reprogramou: ' + r.motivo));
      out.push({ forn: p.fornecedorId, p, e, recebido: ok, chegou: ch, prevista: (e && e.dataPrevista) || '', base, n: Math.max(1, recs.length), reag: reagN(e), motivos, aberto: !ok, late: !ok && !!e && isLate(e) });
    });
    return out;
  }
  function ncsDe(fid) {
    const ini = desde();
    return S.ocorrencias.filter(o => o.nc && o.fornecedorId === fid && (!Z.obra || o.obraId === Z.obra) && (!ini || iso(new Date(o.criadoEm || 0)) >= ini) && (!Z.cat || ((by('pedidos', o.pedidoId) || {}).categoria === Z.cat)));
  }
  function avaliar(fid, R) {
    const regs = R.filter(r => r.forn === fid); if (!regs.length) return null;
    const rec = regs.filter(r => r.recebido && r.chegou), comBase = rec.filter(r => r.base);
    const noPrazo = comBase.filter(r => r.chegou <= r.base), atras = comBase.filter(r => r.chegou > r.base);
    const diasAtr = atras.length ? atras.reduce((a, r) => a + dayDiff(r.chegou, r.base), 0) / atras.length : 0;
    const ncs = ncsDe(fid), pecasNc = ncs.reduce((a, o) => a + (+o.qtd || 0), 0);
    const pedComNc = new Set(ncs.map(o => o.pedidoId));
    const entregasPorPed = rec.length ? rec.reduce((a, r) => a + r.n, 0) / rec.length : 0, deUma = rec.filter(r => r.n === 1).length;
    /* orçado x faturado: só pedidos que já têm nota */
    const pids = new Set(regs.map(r => r.p.id)), nfs = S.nfs.filter(n => pids.has(n.pedidoId) && !nfDup(n) && !n.semFinanceiro);
    const comNota = [...pids].filter(id => nfs.some(n => n.pedidoId === id)).map(id => by('pedidos', id)).filter(Boolean);
    const orcado = comNota.reduce((a, p) => a + valPed(p), 0), faturado = nfs.reduce((a, n) => a + (+n.valor || 0), 0), dif = orcado ? (faturado - orcado) / orcado * 100 : null;
    const pecasRec = [...pids].reduce((a, id) => a + linhasDoPedido(id).reduce((b, x) => b + (x.recebimentos || []).reduce((c, y) => c + (+y.qtd || 0), 0), 0), 0);
    /* IQF: prazo 40, qualidade 30, entrega completa 15, preço 15 (só entram as partes com dados) */
    const partes = [];
    if (comBase.length) partes.push([40, noPrazo.length / comBase.length * 100]);
    if (rec.length) partes.push([30, (rec.length - rec.filter(r => pedComNc.has(r.p.id)).length) / rec.length * 100]);
    if (rec.length) partes.push([15, deUma / rec.length * 100]);
    if (dif != null) partes.push([15, Math.max(0, Math.min(100, 100 - Math.max(0, dif - 1) * 10))]);
    const peso = partes.reduce((a, x) => a + x[0], 0), iqf = peso ? Math.round(partes.reduce((a, x) => a + x[0] * x[1], 0) / peso) : null;
    return { fid, nome: nm('fornecedores', fid, 'Fornecedor'), regs, rec, comBase, noPrazo, atras, diasAtr, ncs, pecasNc, pecasRec, entregasPorPed, deUma, orcado, faturado, dif, comNota, iqf: rec.length ? iqf : null, classe: CLASSE(rec.length ? iqf : null), abertos: regs.filter(r => r.aberto), lateAgora: regs.filter(r => r.late), reag: regs.reduce((a, r) => a + r.reag, 0) };
  }
  function avaliarTodos() {
    const R = registros(), ids = [...new Set(R.map(r => r.forn))];
    let L = ids.map(id => avaliar(id, R)).filter(Boolean);
    if (Z.q) L = L.filter(a => matchQ(H.fz(a.nome), Z.q));
    return L.sort((a, b) => (b.iqf ?? -1) - (a.iqf ?? -1) || b.rec.length - a.rec.length);
  }
  /* resumo automático: pontos positivos e negativos, a partir das ocorrências */
  function resumo(a) {
    const pos = [], neg = [], pc = (x, y) => y ? Math.round(x / y * 100) : 0;
    if (a.comBase.length) { const p = pc(a.noPrazo.length, a.comBase.length); (p >= 85 ? pos : p < 70 ? neg : (p >= 75 ? pos : neg)).push(`Entregou ${p}% no prazo combinado (${a.noPrazo.length} de ${a.comBase.length}).`); }
    if (a.atras.length) neg.push(`${a.atras.length} entrega(s) depois do prazo, em média ${fmtN(a.diasAtr)} dia(s) de atraso.`);
    if (a.reag) neg.push(`Reprogramou a data ${a.reag} vez(es).`);
    if (a.lateAgora.length) neg.push(`${a.lateAgora.length} entrega(s) atrasada(s) em aberto agora.`);
    if (a.rec.length) { if (!a.ncs.length) pos.push(`Nenhuma não conformidade${a.pecasRec ? ` em ${fmtN(a.pecasRec, 0)} peças recebidas` : ''}.`);
      else { const mot = {}; a.ncs.forEach(o => { mot[o.motivo || 'Outro'] = (mot[o.motivo || 'Outro'] || 0) + 1; }); neg.push(`${a.ncs.length} não conformidade(s), ${fmtN(a.pecasNc, 0)} peça(s): ${Object.entries(mot).sort((x, y) => y[1] - x[1]).map(([k, v]) => k.toLowerCase() + ' (' + v + ')').join(', ')}.`); } }
    if (a.rec.length) { if (a.deUma === a.rec.length) pos.push('Completou todos os pedidos em uma entrega só.'); else if (a.entregasPorPed > 1.3) { const mot = [...new Set(a.rec.filter(r => r.n > 1).flatMap(r => r.motivos.map(m => m.split(':')[0])))]; neg.push(`Precisou em média ${fmtN(a.entregasPorPed)} entregas por pedido${mot.length ? ' (' + mot.join(', ') + ')' : ''}.`); } }
    if (a.dif != null) { if (Math.abs(a.dif) <= 1) pos.push('Faturou igual ao orçado/aprovado.'); else if (a.dif > 1) neg.push(`Faturou ${fmtN(a.dif)}% acima do aprovado (${brl2(a.faturado - a.orcado)}).`); else pos.push(`Faturou ${fmtN(-a.dif)}% abaixo do aprovado.`); }
    const rec = !a.rec.length ? 'Ainda sem entregas recebidas no período para avaliar.' : a.classe.k === 'A' ? 'Manter como fornecedor aprovado.' : a.classe.k === 'B' ? 'Aprovado com ressalvas: alinhar com o fornecedor os pontos negativos e acompanhar as próximas entregas.' : 'Abrir plano de ação com o fornecedor (prazo para resposta) e reavaliar no próximo período; considerar fornecedor alternativo.';
    return { pos, neg, rec };
  }
  /* ---- gráficos (svg simples, cores do tema) ---- */
  function grRanking(L) {
    const D = L.filter(a => a.iqf != null).slice(0, 15); if (!D.length) return '';
    const W = 760, lh = 26, top = 30, h = top + D.length * lh + 26, x0 = 220, wx = W - x0 - 60, X = v => x0 + v / 100 * wx;
    return `<svg viewBox="0 0 ${W} ${h}" class="avf-svg" role="img" aria-label="Ranking do IQF por fornecedor">
      <text x="0" y="16" class="g-t">IQF por fornecedor (0 a 100)</text>
      ${[70, 85].map(v => `<line x1="${X(v)}" x2="${X(v)}" y1="${top - 6}" y2="${h - 22}" class="g-ref"/><text x="${X(v)}" y="${h - 8}" text-anchor="middle" class="g-s">${v}</text>`).join('')}
      ${D.map((a, i) => { const y = top + i * lh; return `<g><text x="${x0 - 10}" y="${y + 13}" text-anchor="end" class="g-l">${esc(String(a.nome).slice(0, 30))}</text><rect x="${x0}" y="${y + 2}" width="${Math.max(2, X(a.iqf) - x0)}" height="15" rx="4" fill="${COR[a.classe.k]}" fill-opacity=".85"/><text x="${X(a.iqf) + 6}" y="${y + 14}" class="g-v">${a.iqf} · ${a.classe.k}</text></g>`; }).join('')}
      <text x="${X(77.5)}" y="${h - 8}" text-anchor="middle" class="g-s">B</text><text x="${X(92.5)}" y="${h - 8}" text-anchor="middle" class="g-s">A</text><text x="${X(35)}" y="${h - 8}" text-anchor="middle" class="g-s">C · plano de ação</text></svg>`;
  }
  function grMeses(R) {
    const t = today(), meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(t.slice(0, 7) + '-01T12:00:00'); d.setMonth(d.getMonth() - 11 + i); return iso(d).slice(0, 7); });
    const M = meses.map(m => { const rs = R.filter(r => r.recebido && r.chegou && r.chegou.slice(0, 7) === m && r.base); return { m, ok: rs.filter(r => r.chegou <= r.base).length, at: rs.filter(r => r.chegou > r.base).length }; });
    const mx = Math.max(1, ...M.map(x => x.ok + x.at)); if (M.every(x => !x.ok && !x.at)) return '';
    const W = 760, h = 230, x0 = 34, y0 = 34, ch = 150, bw = (W - x0 - 10) / 12, Y = v => y0 + ch - v / mx * ch;
    const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `<svg viewBox="0 0 ${W} ${h}" class="avf-svg" role="img" aria-label="Entregas por mês: no prazo e atrasadas">
      <text x="0" y="16" class="g-t">Entregas por mês · no prazo e atrasadas</text>
      <rect x="${W - 250}" y="6" width="10" height="10" rx="2" fill="var(--ok)"/><text x="${W - 236}" y="15" class="g-s">no prazo</text><rect x="${W - 160}" y="6" width="10" height="10" rx="2" fill="var(--bad)"/><text x="${W - 146}" y="15" class="g-s">depois do prazo</text>
      <line x1="${x0}" x2="${W - 10}" y1="${y0 + ch}" y2="${y0 + ch}" class="g-ax"/>
      ${M.map((x, i) => { const cx = x0 + i * bw + bw * .2, w = bw * .6, tot = x.ok + x.at, p = tot ? Math.round(x.ok / tot * 100) : null; return `<g><rect x="${cx}" y="${Y(x.ok)}" width="${w}" height="${y0 + ch - Y(x.ok)}" fill="var(--ok)" fill-opacity=".8"/><rect x="${cx}" y="${Y(tot)}" width="${w}" height="${Y(x.ok) - Y(tot)}" fill="var(--bad)" fill-opacity=".8"/>${tot ? `<text x="${cx + w / 2}" y="${Y(tot) - 5}" text-anchor="middle" class="g-v">${p}%</text>` : ''}<text x="${cx + w / 2}" y="${y0 + ch + 16}" text-anchor="middle" class="g-s">${nomes[+x.m.slice(5) - 1]}</text></g>`; }).join('')}</svg>`;
  }
  function grMotivos(L) {
    const mot = {}; L.forEach(a => a.ncs.forEach(o => { mot[o.motivo || 'Outro'] = (mot[o.motivo || 'Outro'] || 0) + (+o.qtd || 0); }));
    const D = Object.entries(mot).sort((a, b) => b[1] - a[1]); if (!D.length) return '';
    const W = 760, lh = 24, top = 30, h = top + D.length * lh + 8, x0 = 200, wx = W - x0 - 70, mx = Math.max(...D.map(x => x[1]));
    return `<svg viewBox="0 0 ${W} ${h}" class="avf-svg" role="img" aria-label="Peças com não conformidade por motivo"><text x="0" y="16" class="g-t">Peças com não conformidade, por motivo</text>
      ${D.map(([k, v], i) => { const y = top + i * lh; return `<g><text x="${x0 - 10}" y="${y + 13}" text-anchor="end" class="g-l">${esc(k)}</text><rect x="${x0}" y="${y + 2}" width="${Math.max(2, v / mx * wx)}" height="14" rx="4" fill="var(--warn)" fill-opacity=".85"/><text x="${x0 + v / mx * wx + 6}" y="${y + 14}" class="g-v">${fmtN(v, 0)}</text></g>`; }).join('')}</svg>`;
  }
  const mini = (p, tone) => `<div class="avf-mini" title="${p}%"><i style="width:${Math.max(0, Math.min(100, p))}%;background:${tone}"></i></div>`;

  views.avf = function () {
    const L = avaliarTodos(), R = registros();
    const recs = L.reduce((a, x) => a + x.rec.length, 0), base = L.reduce((a, x) => a + x.comBase.length, 0), ok = L.reduce((a, x) => a + x.noPrazo.length, 0);
    const ncs = L.reduce((a, x) => a + x.ncs.length, 0), pecasNc = L.reduce((a, x) => a + x.pecasNc, 0), orc = L.reduce((a, x) => a + x.orcado, 0), fat = L.reduce((a, x) => a + x.faturado, 0);
    const cls = { A: L.filter(a => a.classe.k === 'A').length, B: L.filter(a => a.classe.k === 'B').length, C: L.filter(a => a.classe.k === 'C').length };
    const tab = H.tabela('avf', [
      { l: 'Fornecedor', h: a => `<div class="t">${esc(a.nome)}</div><div class="s">${a.regs.length} pedido(s) no período</div>`, v: a => a.nome },
      { l: 'IQF', h: a => a.iqf == null ? '<span class="muted">—</span>' : `<b class="mono">${a.iqf}</b> <span class="pill ${a.classe.tone}">${a.classe.k}</span>`, v: a => a.iqf == null ? '' : a.iqf, x: a => a.iqf == null ? '' : a.iqf + ' (' + a.classe.txt + ')' },
      { l: 'No prazo', h: a => a.comBase.length ? `${mini(Math.round(a.noPrazo.length / a.comBase.length * 100), 'var(--ok)')}<div class="s">${a.noPrazo.length} de ${a.comBase.length}</div>` : '<span class="muted">—</span>', v: a => a.comBase.length ? Math.round(a.noPrazo.length / a.comBase.length * 100) + '%' : '' },
      { l: 'Atraso médio', h: a => a.atras.length ? `<span class="mono" style="color:var(--bad)">${fmtN(a.diasAtr)} d</span>` : '<span class="muted">—</span>', v: a => a.atras.length ? fmtN(a.diasAtr) : '' },
      { l: 'Entregas por pedido', h: a => a.rec.length ? `<span class="mono">${fmtN(a.entregasPorPed)}</span><div class="s">${a.deUma} de ${a.rec.length} em 1 entrega</div>` : '<span class="muted">—</span>', v: a => a.rec.length ? fmtN(a.entregasPorPed) : '' },
      { l: 'Não conformidades', h: a => a.ncs.length ? `<span class="pill warn">${a.ncs.length}</span> <span class="s">${fmtN(a.pecasNc, 0)} peça(s)</span>` : '<span class="pill ok">0</span>', v: a => a.ncs.length, x: a => a.ncs.length + ' (' + a.pecasNc + ' peças)' },
      { l: 'Aprovado x faturado', h: a => a.dif == null ? '<span class="muted">sem nota</span>' : `<div class="mono s">${brlK(a.orcado)} → ${brlK(a.faturado)}</div><span class="mono" style="color:${Math.abs(a.dif) <= 1 ? 'var(--ok)' : a.dif > 0 ? 'var(--bad)' : 'var(--ok)'}">${a.dif > 0 ? '+' : ''}${fmtN(a.dif)}%</span>`, v: a => a.dif == null ? '' : fmtN(a.dif) + '%', x: a => a.dif == null ? '' : `${brl2(a.orcado)} → ${brl2(a.faturado)} (${fmtN(a.dif)}%)` },
      { l: 'Atrasado agora', h: a => a.lateAgora.length ? `<span class="pill bad">${a.lateAgora.length}</span>` : '<span class="muted">0</span>', v: a => a.lateAgora.length },
      { l: '', h: a => `<button class="btn sm" data-z="avf" data-id="${esc(a.fid)}">${ic('eye', 13)} Ver</button>`, v: () => '', noX: true }
    ], L, 'Nenhum fornecedor com pedidos comprados no período.', 60);
    const cats = (typeof CATS !== 'undefined' ? CATS : []).map(c => [c.id, c.nome]);
    return H.cab('Avaliação de fornecedores', 'Índice de Qualidade do Fornecedor (IQF), como na avaliação de fornecedores da ISO 9001: prazo (40%), entregas sem não conformidade (30%), pedido completo numa entrega só (15%) e faturado igual ao aprovado (15%). A ≥ 85 aprovado · B 70 a 84 aprovado com ressalvas · C < 70 plano de ação.', `${H.btnXls('avf', 'Avaliação de fornecedores')}${H.btnPrint()}`)
      + `<div class="filters" style="margin-bottom:12px"><select class="f" data-zf="per" aria-label="Período">${opts([['3m', 'Últimos 3 meses'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], ['ano', 'Este ano'], ['tudo', 'Todo o histórico']], Z.per)}</select>
        <select class="f" data-zf="obra" aria-label="Obra">${opts(sortNome(S.obras).map(o => [o.id, o.nome]), Z.obra, 'Todas as obras')}</select>
        <select class="f" data-zf="cat" aria-label="Categoria">${opts(cats, Z.cat, 'Todas as categorias')}</select>
        <input class="f" type="search" data-zf="q" placeholder="Buscar fornecedor" value="${esc(Z.q)}" aria-label="Buscar fornecedor"></div>`
      + `<div class="kpis" style="margin-bottom:16px">${kpi('Entregas no prazo', base ? Math.round(ok / base * 100) + '%' : '—', `${ok} de ${base} com prazo combinado`, base && ok / base >= .85 ? 'ok' : base ? 'warn' : '')}${kpi('Não conformidades', ncs, fmtN(pecasNc, 0) + ' peça(s) com problema', ncs ? 'warn' : 'ok')}${kpi('Aprovado x faturado', orc ? (fat - orc >= 0 ? '+' : '') + fmtN((fat - orc) / orc * 100) + '%' : '—', orc ? brlK(orc) + ' → ' + brlK(fat) : 'sem notas', orc && Math.abs(fat - orc) / orc > .01 ? 'warn' : '')}${kpi('Fornecedores', L.length, `${cls.A} A · ${cls.B} B · ${cls.C} C`)}</div>`
      + `<section class="panel avf-gr"><div class="avf-grid"><div>${grRanking(L) || '<p class="muted">Sem entregas recebidas no período para calcular o IQF.</p>'}</div><div>${grMeses(R)}${grMotivos(L)}</div></div></section>`
      + `<section class="panel"><div class="sec-h"><h2>${L.length} fornecedor(es)</h2><span class="sub">${recs} entrega(s) recebida(s) no período · clique em Ver para o resumo</span></div>${tab}</section>`
      + `<p class="muted" style="font-size:12.5px;margin:0">Prazo = data combinada na compra (antes de qualquer reprogramação). Entregas por pedido = quantas chegadas foram registradas até completar. Não conformidades = registradas na conferência do recebimento. Aprovado x faturado = pedidos que já têm nota.</p>`;
  };
  function abrirAvf(fid) {
    const a = avaliar(fid, registros()); if (!a) return;
    const rs = resumo(a), f = by('fornecedores', fid) || {};
    const ent = a.regs.slice().sort((x, y) => String(y.chegou || y.prevista).localeCompare(String(x.chegou || x.prevista)));
    modal(a.nome + ' · avaliação', `<div class="full"><div class="avf-h"><div class="avf-nota" style="border-color:${COR[a.classe.k]}"><b>${a.iqf ?? '—'}</b><span>IQF</span></div><div><span class="pill ${a.classe.tone}">${esc(a.classe.txt)}</span><div class="s muted" style="margin-top:6px">${esc([f.cnpj, f.contato, f.email, f.telefone].filter(Boolean).join(' · '))}</div></div></div>
      <div class="kpis" style="margin:12px 0">${kpi('No prazo', a.comBase.length ? Math.round(a.noPrazo.length / a.comBase.length * 100) + '%' : '—', `${a.noPrazo.length} de ${a.comBase.length}`)}${kpi('Atraso médio', a.atras.length ? fmtN(a.diasAtr) + ' d' : '0', a.atras.length + ' atrasada(s)')}${kpi('Entregas por pedido', a.rec.length ? fmtN(a.entregasPorPed) : '—', `${a.deUma} de ${a.rec.length} em 1 entrega`)}${kpi('Não conformidades', a.ncs.length, fmtN(a.pecasNc, 0) + ' peça(s)')}${kpi('Aprovado x faturado', a.dif == null ? '—' : (a.dif > 0 ? '+' : '') + fmtN(a.dif) + '%', a.dif == null ? 'sem nota' : brl2(a.orcado) + ' → ' + brl2(a.faturado))}</div>
      <div class="avf-res"><div><h3>Pontos positivos</h3><ul>${rs.pos.map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Nenhum destaque no período.</li>'}</ul></div><div><h3>Pontos negativos</h3><ul>${rs.neg.map(x => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Nenhum ponto negativo no período.</li>'}</ul></div></div>
      <p style="margin:10px 0 0"><b>Recomendação:</b> ${esc(rs.rec)}</p>
      <h3 style="margin:16px 0 6px">Entregas (${ent.length})</h3><div class="tablewrap" style="max-height:300px;overflow:auto"><table><thead><tr><th>Pedido</th><th>Obra</th><th>Prazo combinado</th><th>Chegou</th><th class="r">Atraso</th><th class="r">Entregas</th><th>Por quê</th></tr></thead><tbody>${ent.map(r => { const d = r.chegou && r.base ? dayDiff(r.chegou, r.base) : r.late ? dayDiff(today(), r.prevista) : 0, nc = a.ncs.filter(o => o.pedidoId === r.p.id); return `<tr><td><div class="t">${esc(r.p.item || '')}</div><div class="s">${esc(r.p.pc || '')}</div></td><td>${esc(H.curtoObra(by('obras', r.p.obraId) || { nome: '—' }))}</td><td class="mono">${r.base ? fdy(r.base) : '—'}</td><td class="mono">${r.chegou ? fdy(r.chegou) : r.late ? '<span style="color:var(--bad)">atrasado</span>' : 'aberto'}</td><td class="r mono" style="color:${d > 0 ? 'var(--bad)' : 'var(--ok)'}">${d > 0 ? d + ' d' : r.chegou ? 'no prazo' : ''}</td><td class="r mono">${r.recebido ? r.n : '—'}</td><td class="s">${esc(r.motivos.concat(nc.map(o => 'NC: ' + (o.motivo || '').toLowerCase())).join(' · ').slice(0, 220))}</td></tr>`; }).join('')}</tbody></table></div>
      ${a.ncs.length ? `<h3 style="margin:16px 0 6px">Não conformidades (${a.ncs.length})</h3><div class="tablewrap"><table><thead><tr><th>Data</th><th>Item</th><th class="r">Peças</th><th>Motivo</th><th>Situação</th></tr></thead><tbody>${a.ncs.map(o => `<tr><td class="mono">${fdy(o.dataChegada || iso(new Date(o.criadoEm)))}</td><td>${esc((o.codigo ? o.codigo + ' · ' : '') + (o.descricao || ''))}<div class="s">${esc(o.obs || '')}</div></td><td class="r mono">${fmtN(o.qtd, 0)}</td><td>${esc(o.motivo || '')}</td><td>${o.status === 'resolvida' ? '<span class="pill ok">resolvida</span>' : '<span class="pill warn">aberta</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`,
      { submit: 'Fechar', onSubmit: () => {}, wide: true, extra: `<button type="button" class="btn" data-z="avfcopy" data-id="${esc(fid)}" style="margin-right:auto">${ic('copy', 14)} Copiar resumo</button>` });
  }
  function textoAvf(fid) {
    const a = avaliar(fid, registros()); if (!a) return ''; const rs = resumo(a);
    return `Avaliação do fornecedor ${a.nome} · ${fdy(today())}\nIQF: ${a.iqf ?? '—'} (${a.classe.txt})\n\nPontos positivos:\n${rs.pos.map(x => '- ' + x).join('\n') || '- nenhum destaque'}\n\nPontos negativos:\n${rs.neg.map(x => '- ' + x).join('\n') || '- nenhum'}\n\nRecomendação: ${rs.rec}`;
  }
  SX.avaliarFornecedores = avaliarTodos; SX.resumoFornecedor = fid => { const a = avaliar(fid, registros()); return a ? resumo(a) : null; };

  /* =====================================================================
     v0.11 · AUDITORIA (estilo Git) + ALERTAS
     ===================================================================== */
  const COLN = { pedidos: 'Pedidos', entregas: 'Entregas', nfs: 'Notas fiscais', painel_pedidos: 'Recebimento (itens)', painel_obras: 'Recebimento (obras)', painel_importacoes: 'Planilhas importadas', painel_meta: 'Recebimento (ajustes)', cotacoes: 'Cotações', ocorrencias: 'Ocorrências', pendencias: 'Pendências', obras: 'Obras', fornecedores: 'Fornecedores', colaboradores: 'Colaboradores', erp_pedidos: 'Pedidos do ERP', config: 'Configuração', usuarios: 'Usuários', anexos: 'Anexos', rot_entregas: 'Roteiro (entregas)', rot_coletas: 'Roteiro (coletas)', rot_config: 'Roteiro (config)' };
  const ACAO = { criou: '+ criou', alterou: '~ alterou', excluiu: '- excluiu', login: '→ entrou' };
  const VALK = /^(valor|valorPedido|budgetTotal|budgetCat|preco|vUn|total)$/;
  const vist = () => { try { return new Set(JSON.parse(LS.get('pyro_alert_vistos') || '[]')); } catch (e) { return new Set(); } };
  function alertas() {
    const ini = Date.now() - 7 * 864e5, L = S.auditoria.filter(a => (a.em || 0) >= ini && !a.auto), out = [];
    /* exclusões, por pessoa e dia */
    const ex = {}; L.filter(a => a.acao === 'excluiu').forEach(a => { const k = a.uid + '|' + iso(new Date(a.em)); (ex[k] = ex[k] || []).push(a); });
    Object.values(ex).forEach(g => out.push({ id: 'ex_' + g[0].id, sev: g.length >= 3 ? 'bad' : 'warn', em: g[0].em, txt: `${g[0].nome} excluiu ${g.length} registro(s)${g.length <= 3 ? ': ' + g.map(a => (COLN[a.col] || a.col) + ' ' + (a.rotulo || a.docId)).join('; ') : ''}`, ids: g.map(a => a.id) }));
    /* muitas alterações em pouco tempo (mais de 30 em 10 minutos) */
    const por = {}; L.filter(a => a.acao !== 'login').forEach(a => (por[a.uid] = por[a.uid] || []).push(a));
    Object.values(por).forEach(g => { g.sort((a, b) => a.em - b.em); let j = 0; const dias = new Set();
      for (let i = 0; i < g.length; i++) { while (g[i].em - g[j].em > 6e5) j++; const n = g.slice(j, i + 1).reduce((s, a) => s + (a.qtd || 1), 0), dia = iso(new Date(g[i].em)); if (n > 30 && !dias.has(dia)) { dias.add(dia); out.push({ id: 'rj_' + g[i].id, sev: 'warn', em: g[i].em, txt: `${g[i].nome} fez ${n} alterações em menos de 10 minutos (${hora(g[j].em)})`, ids: g.slice(j, i + 1).map(a => a.id) }); } } });
    /* login fora do horário (antes das 6h, depois das 21h ou no fim de semana) */
    L.filter(a => a.acao === 'login').forEach(a => { const d = new Date(a.em), h = d.getHours(), fds = d.getDay() === 0 || d.getDay() === 6; if (h < 6 || h >= 21 || fds) out.push({ id: 'lg_' + a.id, sev: 'warn', em: a.em, txt: `Login de ${a.nome} (${FB.NOMES_SETOR[a.setor] || a.setor}) ${fds ? 'no fim de semana' : 'fora do horário'}, ${hora(a.em)} · ${a.rotulo || ''}`, ids: [a.id] }); });
    /* valor, budget ou cancelamento alterados */
    L.filter(a => a.acao === 'alterou' && a.depois).forEach(a => { const ks = Object.keys(a.depois).filter(k => VALK.test(k)), canc = a.depois.status === 'cancelado';
      if (ks.length || canc) out.push({ id: 'vl_' + a.id, sev: /budget/.test(ks.join()) ? 'bad' : 'warn', em: a.em, txt: `${a.nome} ${canc ? 'cancelou' : 'alterou ' + ks.join(', ') + ' de'} ${COLN[a.col] || a.col} ${a.rotulo || ''}${ks.length && typeof a.antes[ks[0]] !== 'object' ? ` (${fmtV(a.antes[ks[0]])} → ${fmtV(a.depois[ks[0]])})` : ''}`, ids: [a.id] }); });
    return out.sort((a, b) => b.em - a.em);
  }
  SX.alertasAuditoria = alertas;
  const fmtV = v => { if (v === '__ausente__' || v == null) return '∅'; if (v && v.__trunc) return v.previa + '…'; if (typeof v === 'object') { const j = JSON.stringify(v); return Array.isArray(v) && j.length > 80 ? `[${v.length} itens]` : j.length > 120 ? j.slice(0, 117) + '…' : j; } const s = String(v); return s.length > 120 ? s.slice(0, 117) + '…' : s; };
  const desfeitos = () => { try { return new Set(JSON.parse(LS.get('pyro_aud_desfeitos') || '[]')); } catch (e) { return new Set(); } };
  function linhaCommit(a, undo) {
    const hash = String(a.id).slice(-7), quem = `<span class="tg-u">● ${esc(a.nome || a.email || '?')}</span> <span class="tg-m">(${esc(FB.NOMES_SETOR[a.setor] || (a.setor === 'admin' ? 'Admin' : a.setor || ''))})</span>`;
    if (a.acao === 'login') return `<div class="tg-c"><div><span class="tg-h">login </span> ${quem} <span class="tg-m">${hora(a.em)}</span> <span class="tg-m">${esc(a.rotulo || '')}</span></div></div>`;
    const dif = a.massa ? `<div class="tg-m">  ${a.qtd} registros de uma vez (importação ou ação em massa)</div>` : Object.keys(a.depois || a.antes || {}).slice(0, 12).map(k => { const x = a.antes ? a.antes[k] : undefined, y = a.depois ? a.depois[k] : undefined; return (a.acao !== 'criou' && x !== undefined && x !== '__ausente__' ? `<div class="tg-del">  - ${esc(k)}: ${esc(fmtV(x))}</div>` : '') + (a.acao !== 'excluiu' && y !== undefined && y !== '__ausente__' ? `<div class="tg-add">  + ${esc(k)}: ${esc(fmtV(y))}</div>` : ''); }).join('') + (Object.keys(a.depois || a.antes || {}).length > 12 ? `<div class="tg-m">  … mais ${Object.keys(a.depois || a.antes).length - 12} campo(s)</div>` : '');
    const ja = desfeitos().has(a.id);
    return `<div class="tg-c${a.auto ? ' tg-auto' : ''}"><div><span class="tg-h">commit ${esc(hash)}</span> ${quem} <span class="tg-m">${hora(a.em)}</span> <span class="tg-a tg-${a.acao}">${ACAO[a.acao] || a.acao}</span>${a.auto ? ' <span class="tg-m" title="Gravado pelo próprio Pyro ao sincronizar, sem clique da pessoa">[automático]</span>' : ''}</div>
      <div class="tg-p">  ${esc(TITLES[a.pag] || a.pag || '')}${a.pag ? ' › ' : ''}${esc(COLN[a.col] || a.col)} › ${esc(a.rotulo || a.docId || '')}</div>${dif}
      ${undo && !a.massa ? (ja ? '<div class="tg-m">  [desfeito]</div>' : `<div><button type="button" class="tg-b" data-z="undo" data-id="${esc(a.id)}">[desfazer]</button></div>`) : ''}</div>`;
  }
  views.audit = function () {
    if (FB.setor !== 'admin') return '<p class="muted">Só o administrador vê a auditoria.</p>';
    const vs = vist(), AL = alertas(), novos = AL.filter(x => !vs.has(x.id));
    let L = S.auditoria.slice().sort((a, b) => (b.em || 0) - (a.em || 0));
    if (Z.au) L = L.filter(a => a.uid === Z.au); if (Z.ac) L = L.filter(a => a.acao === Z.ac); if (Z.col) L = L.filter(a => a.col === Z.col);
    if (Z.dia) L = L.filter(a => iso(new Date(a.em)) === Z.dia);
    if (Z.aq) L = L.filter(a => matchQ(H.fz([a.nome, a.rotulo, a.col, a.docId, JSON.stringify(a.depois || ''), JSON.stringify(a.antes || '')].join(' ')), Z.aq));
    if (!Z.auto) L = L.filter(a => !a.auto);
    if (Z.soAl) { const ids = new Set(AL.flatMap(x => x.ids)); L = L.filter(a => ids.has(a.id)); }
    const pessoas = [...new Map(S.auditoria.map(a => [a.uid, a.nome || a.email])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const cols = [...new Set(S.auditoria.map(a => a.col).filter(Boolean))].sort();
    const on = onlineAgora(), hoje = S.auditoria.filter(a => iso(new Date(a.em)) === today() && !a.auto);
    const cmd = ['pyro log', Z.au ? '--autor "' + (pessoas.find(p => p[0] === Z.au) || [0, ''])[1] + '"' : '', Z.ac ? '--acao ' + Z.ac : '', Z.col ? '--em ' + Z.col : '', Z.dia ? '--dia ' + Z.dia : '', Z.aq ? '--busca "' + Z.aq + '"' : '', Z.soAl ? '--alertas' : ''].filter(Boolean).join(' ');
    return H.cab('Auditoria', 'Quem entrou e o que cada pessoa alterou no Pyro, com o antes e o depois de cada campo. Só o administrador vê esta página; os registros não podem ser alterados nem apagados por ninguém. Use [desfazer] para voltar uma alteração (o desfazer também fica registrado).', '')
      + `<div class="kpis" style="margin-bottom:14px">${kpi('Alertas novos', novos.length, 'nos últimos 7 dias', novos.length ? 'bad' : 'ok')}${kpi('Alterações hoje', hoje.filter(a => a.acao !== 'login').length, hoje.filter(a => a.acao === 'excluiu').length + ' exclusão(ões)')}${kpi('Logins hoje', hoje.filter(a => a.acao === 'login').length, new Set(hoje.filter(a => a.acao === 'login').map(a => a.uid)).size + ' pessoa(s)')}${kpi('Online agora', on.length, on.map(p => p.nome.split(' ')[0]).slice(0, 4).join(', ') || 'ninguém')}</div>`
      + (AL.length ? `<section class="panel"><div class="sec-h"><h2>${ic('alert', 16)} ${novos.length ? novos.length + ' alerta(s) novo(s)' : 'Alertas'}</h2><span class="sub">exclusões, muitas alterações seguidas, login fora do horário, valor ou budget alterado</span>${novos.length ? '<button type="button" class="btn sm" data-z="alvisto">Marcar todos como vistos</button>' : ''}</div><div class="rows">${AL.slice(0, 20).map(x => `<div class="al-row ${vs.has(x.id) ? 'visto' : ''}"><span class="pill ${x.sev}">${x.sev === 'bad' ? 'atenção' : 'aviso'}</span><span>${esc(x.txt)}</span><span class="s muted">${hora(x.em)}</span><button type="button" class="btn sm ghost" data-z="alver" data-id="${esc(x.id)}">ver no log</button></div>`).join('')}</div></section>` : '')
      + `<section class="panel tg"><div class="filters" style="margin-bottom:10px"><select class="f" data-zf="au" aria-label="Pessoa">${opts(pessoas, Z.au, 'Todas as pessoas')}</select><select class="f" data-zf="ac" aria-label="Ação">${opts([['criou', 'Criou'], ['alterou', 'Alterou'], ['excluiu', 'Excluiu'], ['login', 'Login']], Z.ac, 'Todas as ações')}</select><select class="f" data-zf="col" aria-label="Onde">${opts(cols.map(c => [c, COLN[c] || c]), Z.col, 'Todos os lugares')}</select><input class="f" type="date" data-zf="dia" value="${esc(Z.dia)}" aria-label="Dia"><input class="f" type="search" data-zf="aq" placeholder="Buscar (pedido, NF, campo, valor)" value="${esc(Z.aq)}" aria-label="Buscar no log"><button class="toggle" data-z="soal" aria-pressed="${Z.soAl}"><span class="sw"></span>Só alertas</button><button class="toggle" data-z="auto" aria-pressed="${!!Z.auto}" title="Gravações que o próprio Pyro faz ao sincronizar os dados, sem clique de ninguém"><span class="sw"></span>Mostrar automáticas</button></div>
        <div class="tg-box" role="log" aria-label="Registro de alterações"><div class="tg-cmd">$ ${esc(cmd)}</div>${L.slice(0, Z.lim).map(a => linhaCommit(a, true)).join('') || '<div class="tg-m">nada encontrado</div>'}${L.length > Z.lim ? `<div><button type="button" class="tg-b" data-z="audmais">[mostrar mais ${Math.min(100, L.length - Z.lim)} de ${L.length - Z.lim}]</button></div>` : ''}</div>
        <p class="s muted" style="margin:8px 0 0">${S.auditoria.length} registro(s) carregado(s) (os mais recentes). Gravações automáticas do Pyro (sincronização) ficam escondidas: use “Mostrar automáticas”. Importações e ações em massa entram como um registro só e não podem ser desfeitas por aqui: use o backup.</p></section>`;
  };
  async function desfazer(id) {
    const a = S.auditoria.find(x => x.id === id); if (!a || a.massa || a.acao === 'login') return;
    const trunc = o => o && Object.values(o).some(v => v && v.__trunc);
    if (trunc(a.antes) || (a.acao === 'alterou' && trunc(a.depois))) { toast('Este registro é grande demais para desfazer automaticamente. Use o backup.'); return; }
    const txt = a.acao === 'criou' ? `Excluir o registro criado (${a.rotulo || a.docId})?` : a.acao === 'excluiu' ? `Recriar o registro excluído (${a.rotulo || a.docId})?` : `Voltar ${Object.keys(a.antes || {}).length} campo(s) de ${a.rotulo || a.docId} para como estavam?`;
    if (!confirm(txt)) return;
    const naTela = Array.isArray(S[a.col]), ref = FB.db.collection(a.col).doc(a.docId);
    try {
      if (a.acao === 'criou') { if (naTela && typeof del === 'function') await del(a.col, a.docId); else await ref.delete(); }
      else if (a.acao === 'excluiu') { const o = Object.assign({}, a.antes, { id: a.docId }); if (naTela) await put(a.col, o); else await ref.set(o); }
      else {
        let cur = naTela ? by(a.col, a.docId) : null; if (!cur) { const d = await ref.get(); cur = d.exists ? d.data() : {}; }
        const o = Object.assign({}, cur, { id: a.docId }); Object.entries(a.antes || {}).forEach(([k, v]) => { if (v === '__ausente__') delete o[k]; else o[k] = v; });
        if (naTela) await put(a.col, o); else await ref.set(o);
      }
      const ds = desfeitos(); ds.add(id); LS.set('pyro_aud_desfeitos', JSON.stringify([...ds].slice(-500)));
      toast('Alteração desfeita'); render();
    } catch (e) { toast('Não foi possível desfazer: ' + (e.message || e.code || 'erro')); }
  }
  /* aviso na Home do administrador */
  const homeOrig4 = views.home;
  views.home = function () {
    const h = homeOrig4(); if (FB.setor !== 'admin') return h;
    const vs = vist(), n = alertas().filter(x => !vs.has(x.id) && x.em > Date.now() - 864e5).length;
    return (n ? `<div class="banner" style="margin-bottom:14px"><span><b>${n} alerta(s) de auditoria nas últimas 24 horas.</b></span><button type="button" class="btn sm pri" data-z="goaud">Abrir auditoria</button></div>` : '') + h;
  };

  /* =====================================================================
     v0.11 · QUEM ESTÁ ONLINE + CHAT
     ===================================================================== */
  const ONLINE_MS = 4 * 6e4;
  const onlineAgora = () => S.presenca.filter(p => p.id !== FB.uid && Date.now() - (p.visto || 0) < ONLINE_MS && !p.saiu).map(p => ({ id: p.id, nome: p.nome || 'Usuário', setor: p.setor }));
  const ehOnline = id => { const p = S.presenca.find(x => x.id === id); return !!p && !p.saiu && Date.now() - (p.visto || 0) < ONLINE_MS; };
  function marcarPresenca(saiu) {
    if (!FB.uid) return;
    try { FB.fs.collection('presenca').doc(FB.uid).set({ nome: FB.nome || FB.email, setor: FB.setor, visto: Date.now(), pag: (window.UI && UI.view) || '', saiu: !!saiu }).catch(() => {}); } catch (e) {}
  }
  const C = { aberto: false, conv: '', txt: '', inicio: Date.now() };
  const lido = t => { const k = 'pyro_chat_lido_' + FB.uid + '_' + t, v = LS.get(k); if (v == null) { const ini = String(C.inicio); LS.set(k, ini); return +ini; } return +v || 0; };
  const marcarLido = t => LS.set('pyro_chat_lido_' + FB.uid + '_' + t, String(Date.now()));
  const msgsDe = t => S.chat.filter(m => t === 'geral' ? m.para === 'geral' : ((m.de === t && m.para === FB.uid) || (m.de === FB.uid && m.para === t))).sort((a, b) => (a.em || 0) - (b.em || 0));
  const naoLidas = t => msgsDe(t).filter(m => m.de !== FB.uid && (m.em || 0) > lido(t)).length;
  function pessoasChat() {
    const m = new Map();
    S.presenca.filter(p => p.id !== FB.uid).forEach(p => m.set(p.id, { id: p.id, nome: p.nome || 'Usuário', setor: p.setor, visto: p.visto || 0 }));
    S.chat.forEach(x => { const o = x.de === FB.uid ? x.para : x.de; if (o && o !== 'geral' && o !== FB.uid && !m.has(o)) m.set(o, { id: o, nome: x.de === o ? x.nome : 'Usuário', setor: x.de === o ? x.setor : '', visto: 0 }); });
    return [...m.values()].sort((a, b) => ehOnline(b.id) - ehOnline(a.id) || String(a.nome).localeCompare(String(b.nome)));
  }
  /* som de mensagem nova (gerado na hora, sem arquivo) */
  let AC = null;
  const somLigado = () => LS.get('pyro_chat_som') !== '0';
  addEventListener('pointerdown', () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} }, { capture: true });
  function tocar() {
    if (!somLigado()) return;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const t = AC.currentTime;
      [[880, 0], [1318.5, 0.13]].forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + d); g.gain.linearRampToValueAtTime(0.2, t + d + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.32); o.connect(g); g.connect(AC.destination); o.start(t + d); o.stop(t + d + 0.35); }); } catch (e) {}
  }
  SX.somChat = tocar;
  /* anexos do chat: imagem é reduzida no navegador; arquivo vai em partes de ~500 KB (máx. 8 MB) */
  const PARTE = 700000, MAXARQ = 8 * 1024 * 1024, ARQ = new Map();
  const tamTxt = n => n > 1048576 ? fmtN(n / 1048576, 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const b64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = rej; fr.readAsDataURL(blob); });
  async function reduzirImagem(file, max, q) {
    const url = URL.createObjectURL(file);
    try { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      return await new Promise(res => c.toBlob(b => res(b), 'image/jpeg', q)); } finally { URL.revokeObjectURL(url); }
  }
  async function enviarArquivo(file) {
    if (!C.conv || !file) return;
    const img = /^image\/(png|jpe?g|webp|bmp|heic|heif)$/i.test(file.type);
    let blob = file, nome = file.name || 'arquivo', tipo = file.type || 'application/octet-stream', thumb = '';
    try {
      if (img) { blob = await reduzirImagem(file, 1600, 0.8) || file; tipo = 'image/jpeg'; nome = nome.replace(/\.[^.]+$/, '') + '.jpg'; const tb = await reduzirImagem(file, 360, 0.6); thumb = tb ? 'data:image/jpeg;base64,' + await b64(tb) : ''; }
    } catch (e) { blob = file; }
    if (blob.size > MAXARQ) { toast('Arquivo grande demais para o chat (máximo 8 MB).'); return; }
    const aid = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), dados = await b64(blob), n = Math.max(1, Math.ceil(dados.length / PARTE));
    toast(n > 1 ? `Enviando ${nome} (${tamTxt(blob.size)})…` : 'Enviando ' + nome + '…');
    try {
      for (let i = 0; i < n; i++) await FB.fs.collection('chat_arq').doc(aid + '_' + i).set({ de: FB.uid, para: C.conv, arq: aid, i, n, nome, tipo, dados: dados.slice(i * PARTE, (i + 1) * PARTE), em: Date.now() });
      ARQ.set(aid, URL.createObjectURL(blob));
      await enviar({ id: aid, nome, tipo, tam: blob.size, n, img, thumb });
    } catch (e) { toast('Não foi possível enviar o arquivo: ' + (e.code || e.message || 'erro')); }
  }
  const TIPO_IMG = /^image\/(png|jpe?g|webp|gif|bmp)$/i, TIPO_PDF = /^application\/pdf$/i;
  const tipoSeguro = t => TIPO_IMG.test(t || '') || TIPO_PDF.test(t || '') ? t : 'application/octet-stream';
  async function abrirArquivo(m, baixar) {
    const a = m.anexo; if (!a) return;
    let url = ARQ.get(a.id);
    if (!url) {
      toast('Abrindo ' + a.nome + '…');
      try { const ps = await Promise.all(Array.from({ length: a.n || 1 }, (_, i) => FB.fs.collection('chat_arq').doc(a.id + '_' + i).get()));
        if (ps.some(d => !d.exists)) { toast('Arquivo não encontrado (pode ter sido apagado)'); return; }
        const bin = atob(ps.map(d => d.data().dados).join('')), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        url = URL.createObjectURL(new Blob([u8], { type: tipoSeguro(a.tipo) })); ARQ.set(a.id, url);
      } catch (e) { toast('Não foi possível abrir: ' + (e.code || e.message || 'erro')); return; }
    }
    const lk = document.createElement('a'); lk.href = url; if (baixar || !(TIPO_IMG.test(a.tipo || '') || TIPO_PDF.test(a.tipo || ''))) lk.download = a.nome; else lk.target = '_blank'; lk.rel = 'noopener'; document.body.appendChild(lk); lk.click(); lk.remove();
  }
  const anexoHtml = m => { const a = m.anexo; if (!a) return ''; return a.img && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a.thumb || '') ? `<button type="button" class="ch-img" data-charq="${esc(m.id)}" title="Abrir ${esc(a.nome)}"><img src="${esc(a.thumb)}" alt="${esc(a.nome)}"></button>` : `<button type="button" class="ch-file" data-charq="${esc(m.id)}" title="Baixar ${esc(a.nome)}">${ic(/pdf/.test(a.tipo || '') ? 'file' : 'paperclip', 15)}<span><b>${esc(a.nome)}</b><span class="s">${tamTxt(a.tam || 0)}</span></span></button>`; };
  let CH = null;
  function chatUI() {
    if (!CH) {
      CH = document.createElement('div'); CH.className = 'ch-root';
      CH.innerHTML = '<button type="button" class="ch-fab" data-ch="toggle" aria-label="Conversas">' + ic('chat', 20) + '<span class="ch-n" hidden></span></button><div class="ch-pan" role="dialog" aria-label="Conversas" hidden></div>';
      document.body.appendChild(CH);
      CH.addEventListener('click', ev => {
        const b = ev.target.closest('[data-ch]'); if (!b) return; const a = b.dataset.ch;
        if (a === 'toggle') { C.aberto = !C.aberto; if (C.aberto) { marcarPresenca(); buscarChat(); } }
        else if (a === 'conv') { C.conv = b.dataset.id; marcarLido(C.conv); }
        else if (a === 'atualizar') { buscarChat(true); return; }
        else if (a === 'som') { LS.set('pyro_chat_som', somLigado() ? '0' : '1'); if (somLigado()) tocar(); }
        else if (a === 'voltar') C.conv = '';
        else if (a === 'fechar') C.aberto = false;
        desenharChat(true);
      });
      CH.addEventListener('submit', ev => { ev.preventDefault(); enviar(); });
      CH.addEventListener('click', ev => { const b = ev.target.closest('[data-charq]'); if (!b) return; const m = S.chat.find(x => x.id === b.dataset.charq); if (m) abrirArquivo(m); });
      CH.addEventListener('change', ev => { if (ev.target.name === 'arq') { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (f) enviarArquivo(f); } });
      CH.addEventListener('paste', ev => { if (!C.conv) return; const it = [...(ev.clipboardData && ev.clipboardData.items || [])].find(x => x.kind === 'file'); if (it) { ev.preventDefault(); const f = it.getAsFile(); if (f) enviarArquivo(f); } });
      CH.addEventListener('dragover', ev => { if (C.conv && ev.dataTransfer && [...ev.dataTransfer.types].includes('Files')) { ev.preventDefault(); CH.querySelector('.ch-pan').classList.add('drop-on'); } });
      CH.addEventListener('dragleave', ev => { if (ev.target.classList && ev.target.classList.contains('ch-pan')) ev.target.classList.remove('drop-on'); });
      CH.addEventListener('drop', ev => { const f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; CH.querySelector('.ch-pan').classList.remove('drop-on'); if (f && C.conv) { ev.preventDefault(); enviarArquivo(f); } });
      CH.addEventListener('keydown', ev => { if (ev.key === 'Escape') { C.aberto = false; desenharChat(); } });
      CH.addEventListener('input', ev => { if (ev.target.name === 'msg') C.txt = ev.target.value; });
    }
    desenharChat();
  }
  function desenharChat(foco) {
    if (!CH) return;
    const ae = document.activeElement; if (ae && ae.name === 'msg' && CH.contains(ae)) foco = true;
    const tot = ['geral'].concat(pessoasChat().map(p => p.id)).reduce((a, t) => a + naoLidas(t), 0), n = CH.querySelector('.ch-n');
    n.hidden = !tot; n.textContent = tot > 9 ? '9+' : tot;
    const pan = CH.querySelector('.ch-pan'); pan.hidden = !C.aberto; if (!C.aberto) return;
    if (!C.conv) {
      const ps = pessoasChat();
      pan.innerHTML = `<div class="ch-top"><b>Conversas</b><span class="s muted">${onlineAgora().length} online</span><button type="button" class="ch-x" data-ch="som" aria-label="${somLigado() ? 'Desligar o som' : 'Ligar o som'}" title="${somLigado() ? 'Som ligado (clique para desligar)' : 'Som desligado (clique para ligar)'}">${somLigado() ? '🔔' : '🔕'}</button><button type="button" class="ch-x" data-ch="atualizar" aria-label="Buscar mensagens novas" title="Buscar mensagens novas">↻</button><button type="button" class="ch-x" data-ch="fechar" aria-label="Fechar">${ic('x', 15)}</button></div><div class="ch-list">
        <button type="button" class="ch-it" data-ch="conv" data-id="geral"><span class="ch-av">#</span><span class="ch-nm"><b>Geral</b><span class="s muted">todos os setores</span></span>${naoLidas('geral') ? `<span class="ch-b">${naoLidas('geral')}</span>` : ''}</button>
        ${ps.map(p => `<button type="button" class="ch-it" data-ch="conv" data-id="${esc(p.id)}"><span class="ch-av">${esc(String(p.nome).slice(0, 1).toUpperCase())}<i class="ch-dot ${ehOnline(p.id) ? 'on' : ''}" aria-label="${ehOnline(p.id) ? 'online' : 'offline'}"></i></span><span class="ch-nm"><b>${esc(p.nome)}</b><span class="s muted">${esc(FB.NOMES_SETOR[p.setor] || (p.setor === 'admin' ? 'Administrador' : p.setor || ''))} · ${ehOnline(p.id) ? 'online' : p.visto ? 'visto ' + hora(p.visto) : 'offline'}</span></span>${naoLidas(p.id) ? `<span class="ch-b">${naoLidas(p.id)}</span>` : ''}</button>`).join('') || '<p class="s muted" style="padding:10px">Os colegas aparecem aqui quando entrarem no Pyro.</p>'}</div>`;
      return;
    }
    const t = C.conv, p = pessoasChat().find(x => x.id === t), ms = msgsDe(t).slice(-200);
    pan.innerHTML = `<div class="ch-top"><button type="button" class="ch-x" data-ch="voltar" aria-label="Voltar">‹</button><b>${t === 'geral' ? '# Geral' : esc(p ? p.nome : 'Conversa')}</b>${t !== 'geral' ? `<span class="s muted">${ehOnline(t) ? '● online' : 'offline'}</span>` : ''}<button type="button" class="ch-x" data-ch="som" aria-label="${somLigado() ? 'Desligar o som' : 'Ligar o som'}" title="${somLigado() ? 'Som ligado (clique para desligar)' : 'Som desligado (clique para ligar)'}">${somLigado() ? '🔔' : '🔕'}</button><button type="button" class="ch-x" data-ch="atualizar" aria-label="Buscar mensagens novas" title="Buscar mensagens novas">↻</button><button type="button" class="ch-x" data-ch="fechar" aria-label="Fechar">${ic('x', 15)}</button></div>
      <div class="ch-msgs" aria-live="polite">${ms.map(m => `<div class="ch-m ${m.de === FB.uid ? 'eu' : ''}">${t === 'geral' && m.de !== FB.uid ? `<span class="ch-q">${esc(m.nome || '')}</span>` : ''}${anexoHtml(m)}${m.texto ? `<span class="ch-tx">${esc(m.texto)}</span>` : ''}<span class="ch-t">${hora(m.em)}</span></div>`).join('') || '<p class="s muted" style="text-align:center;margin-top:30px">Nenhuma mensagem ainda.</p>'}</div>
      <form class="ch-in"><label class="ch-clip" title="Anexar arquivo ou imagem (também dá para colar um print com Ctrl+V ou arrastar)" aria-label="Anexar arquivo">${ic('paperclip', 17)}<input type="file" name="arq" style="display:none"></label><input name="msg" type="text" maxlength="2000" autocomplete="off" placeholder="Escreva uma mensagem" aria-label="Mensagem" value="${esc(C.txt)}"><button type="submit" class="btn sm pri">Enviar</button></form>`;
    const box = pan.querySelector('.ch-msgs'); box.scrollTop = box.scrollHeight; marcarLido(t);
    if (foco) { const i = pan.querySelector('[name=msg]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
  }
  async function enviar(anexo) {
    const tx = anexo ? '' : String(C.txt || '').trim(); if ((!tx && !anexo) || !C.conv) return;
    const m = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), de: FB.uid, nome: FB.nome || FB.email, setor: FB.setor, para: C.conv, texto: tx.slice(0, 2000), em: Date.now() };
    if (anexo) m.anexo = anexo; else C.txt = '';
    S.chat.push(m); desenharChat(true);
    const { id, ...dados } = m;
    try { await FB.fs.collection('chat').doc(m.id).set(dados); } catch (e) { toast('Mensagem não enviada: ' + (e.code || e.message || 'erro')); S.chat = S.chat.filter(x => x !== m); if (!anexo) C.txt = tx; desenharChat(true); }
  }
  const partes = {}; let juntar = () => {};
  /* busca uma vez no servidor (ao abrir o chat e no ↻): garante as mensagens mesmo se a conexão ao vivo cair */
  async function buscarChat(aviso) {
    const qs = [['g', 'para', 'geral'], ['p', 'para', FB.uid], ['d', 'de', FB.uid]];
    try { await Promise.all(qs.map(([k, c, v]) => FB.fs.collection('chat').where(c, '==', v).get({ source: 'server' }).then(s => { partes[k] = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); }))); juntar(); if (aviso) toast('Mensagens atualizadas'); }
    catch (e) { if (aviso) toast('Sem conexão com o servidor agora'); }
  }
  function ouvirChat() {
    juntar = () => { const m = new Map(); Object.values(partes).forEach(l => l.forEach(x => m.set(x.id, x))); const antes = new Set(S.chat.map(x => x.id)); S.chat = [...m.values()];
      const novas = S.chat.filter(x => !antes.has(x.id) && x.de !== FB.uid && (x.em || 0) > C.inicio);
      if (novas.length) tocar();
      if (novas.length && !(C.aberto && novas.every(x => C.conv === (x.para === 'geral' ? 'geral' : x.de)))) { const u = novas[novas.length - 1]; toast(`${u.nome || 'Mensagem'}${u.para === 'geral' ? ' em #Geral' : ''}: ${u.anexo ? '📎 ' + u.anexo.nome : String(u.texto).slice(0, 60)}`); }
      desenharChat(); };
    const q = (k, campo, v) => { try { FB.fs.collection('chat').where(campo, '==', v).onSnapshot(s => { partes[k] = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); juntar(); }, () => {}); } catch (e) {} };
    q('g', 'para', 'geral'); q('p', 'para', FB.uid); q('d', 'de', FB.uid);
  }

  /* ================= eventos ================= */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-z]'); if (!b) return;
    const a = b.dataset.z;
    if (a === 'avf') abrirAvf(b.dataset.id);
    else if (a === 'avfcopy') { const t = textoAvf(b.dataset.id); navigator.clipboard.writeText(t).then(() => toast('Resumo copiado'), () => toast('Não foi possível copiar')); }
    else if (a === 'undo') desfazer(b.dataset.id);
    else if (a === 'audmais') { Z.lim += 100; render(); }
    else if (a === 'auto') { Z.auto = !Z.auto; Z.lim = 80; render(); }
    else if (a === 'soal') { Z.soAl = !Z.soAl; Z.lim = 80; render(); }
    else if (a === 'alvisto') { const vs = vist(); alertas().forEach(x => vs.add(x.id)); LS.set('pyro_alert_vistos', JSON.stringify([...vs].slice(-1000))); render(); }
    else if (a === 'alver') { const x = alertas().find(y => y.id === b.dataset.id); if (x) { const vs = vist(); vs.add(x.id); LS.set('pyro_alert_vistos', JSON.stringify([...vs].slice(-1000))); Z.soAl = true; Z.aq = ''; Z.au = ''; Z.ac = ''; Z.col = ''; Z.dia = iso(new Date(x.em)); render(); } }
    else if (a === 'goaud') nav('audit');
  });
  let tz = null;
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t.dataset || !t.dataset.zf) return;
    Z[t.dataset.zf] = t.value; Z.lim = 80;
    if (t.tagName === 'SELECT' || t.type === 'date') { render(); return; }
    clearTimeout(tz); tz = setTimeout(() => { const k = t.dataset.zf; render(); const n = document.querySelector(`[data-zf="${k}"]`); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) {} } }, 250);
  });

  const st = document.createElement('style');
  st.textContent = `.avf-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.avf-grid>div{min-width:0}@media(max-width:1100px){.avf-grid{grid-template-columns:1fr}}
  .avf-svg{width:100%;height:auto;display:block;margin-bottom:10px}.avf-svg .g-t{font:600 13px var(--f-body,inherit);fill:var(--fg)}.avf-svg .g-l{font:12px var(--f-body,inherit);fill:var(--fg)}.avf-svg .g-v{font:600 11.5px var(--f-mono,monospace);fill:var(--fg)}.avf-svg .g-s{font:11px var(--f-body,inherit);fill:var(--muted)}.avf-svg .g-ref{stroke:var(--line);stroke-dasharray:3 3}.avf-svg .g-ax{stroke:var(--line)}
  .avf-mini{width:90px;height:7px;border-radius:4px;background:var(--surface2);overflow:hidden}.avf-mini i{display:block;height:100%;border-radius:4px}
  .avf-h{display:flex;gap:14px;align-items:center}.avf-nota{width:70px;height:70px;border-radius:50%;border:5px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}.avf-nota b{font:700 22px/1 var(--f-mono,monospace)}.avf-nota span{font-size:10.5px;color:var(--muted)}
  .avf-res{display:grid;grid-template-columns:1fr 1fr;gap:14px}.avf-res h3{margin:0 0 6px;font-size:14px}.avf-res ul{margin:0;padding-left:18px;line-height:1.5}.avf-res>div:first-child h3{color:var(--ok)}.avf-res>div:last-child h3{color:var(--bad)}@media(max-width:700px){.avf-res{grid-template-columns:1fr}}
  .al-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--line)}.al-row.visto{opacity:.55}
  .tg-box{background:#0f1115;color:#d6deeb;border-radius:12px;padding:14px 16px;font:12.5px/1.55 var(--f-mono,ui-monospace,monospace);max-height:70vh;overflow:auto}
  .tg-cmd{color:#7fdbca;margin-bottom:8px}.tg-c{padding:8px 0;border-bottom:1px dashed #2a2f3a}.tg-h{color:#e2b93d}.tg-u{color:#82aaff}.tg-m{color:#7d8799}.tg-p{color:#c3cee3}.tg-add{color:#8bd49c;white-space:pre-wrap;word-break:break-word}.tg-del{color:#f07178;white-space:pre-wrap;word-break:break-word}
  .tg-auto{opacity:.55}.tg-a{font-weight:700}.tg-criou{color:#8bd49c}.tg-alterou{color:#e2b93d}.tg-excluiu{color:#f07178}.tg-b{background:none;border:0;color:#7fdbca;font:inherit;cursor:pointer;padding:2px 0}.tg-b:hover{text-decoration:underline}
  .ch-root{position:fixed;right:22px;bottom:22px;z-index:46;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
  .ch-fab{width:52px;height:52px;border-radius:50%;border:0;background:var(--accent);color:#fff;display:grid;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;position:relative;order:2}
  .ch-n{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:var(--bad);color:#fff;font:700 11px/20px var(--f-mono,monospace);text-align:center;padding:0 4px}
  .ch-pan{order:1;width:340px;max-width:calc(100vw - 28px);height:460px;max-height:calc(100vh - 120px);background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}
  .ch-pan[hidden]{display:none}.ch-top{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}.ch-top b{flex:1}.ch-x{background:none;border:0;color:inherit;cursor:pointer;font-size:18px;padding:2px 6px;border-radius:6px}.ch-x:hover{background:var(--surface2)}
  .ch-list{overflow:auto;flex:1}.ch-it{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:10px 12px;color:inherit;cursor:pointer;font:inherit}.ch-it:hover{background:var(--surface2)}
  .ch-av{width:32px;height:32px;border-radius:50%;background:var(--surface2);display:grid;place-items:center;font-weight:700;position:relative;flex:none}.ch-dot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;background:#9aa0a6;border:2px solid var(--surface)}.ch-dot.on{background:#22a447}
  .ch-nm{display:flex;flex-direction:column;flex:1;min-width:0}.ch-nm .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ch-b{background:var(--accent);color:#fff;border-radius:10px;font:700 11px/18px var(--f-mono,monospace);min-width:18px;text-align:center;padding:0 5px}
  .ch-msgs{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px}.ch-m{max-width:82%;align-self:flex-start;background:var(--surface2);border-radius:12px 12px 12px 4px;padding:6px 10px;display:flex;flex-direction:column}.ch-m.eu{align-self:flex-end;background:color-mix(in srgb,var(--accent) 18%,var(--surface));border-radius:12px 12px 4px 12px}
  .ch-q{font-size:11px;font-weight:700;color:var(--accent)}.ch-tx{white-space:pre-wrap;word-break:break-word;font-size:13.5px}.ch-t{font-size:10.5px;color:var(--muted);align-self:flex-end}
  .ch-img{display:block;padding:0;border:0;background:none;cursor:zoom-in;margin:2px 0}.ch-img img{display:block;max-width:220px;max-height:220px;border-radius:8px}
  .ch-file{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:inherit;cursor:pointer;font:inherit;text-align:left;margin:2px 0;max-width:230px}.ch-file b{display:block;font-size:12.5px;word-break:break-all}.ch-file .s{font-size:11px;color:var(--muted)}
  .ch-clip{display:grid;place-items:center;width:34px;flex:none;border-radius:10px;cursor:pointer;color:var(--muted)}.ch-clip:hover{background:var(--surface2);color:var(--accent)}
  .ch-pan.drop-on{outline:3px dashed var(--accent);outline-offset:-6px}
  .ch-in{display:flex;gap:6px;padding:8px;border-top:1px solid var(--line)}.ch-in input{flex:1;min-width:0;font:inherit;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface2);color:inherit}
  .rec-fab{bottom:86px!important}
  @media(max-width:760px){.ch-root{bottom:84px;right:14px}.rec-fab{bottom:146px!important}}
  @media print{.ch-root,.rec-fab{display:none!important}}
  @media(max-width:900px){.bottomnav{grid-auto-columns:minmax(66px,1fr)!important;overflow-x:auto!important;overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch}.bottomnav::-webkit-scrollbar{display:none}
   .bottomnav>*{min-width:66px}.bottomnav>* span{display:block;max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
   .tabs{overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap}.tabs::-webkit-scrollbar{display:none}.tabs button{white-space:nowrap;flex:none}
   .ch-fab{width:46px;height:46px}}`;
  document.head.appendChild(st);

  FB.ready.then(() => {
    marcarPresenca(); setInterval(() => { if (document.visibilityState === 'visible') marcarPresenca(); }, 9e4);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') marcarPresenca(); });
    addEventListener('pagehide', () => marcarPresenca(true));
    try { FB.fs.collection('presenca').onSnapshot(s => { S.presenca = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); desenharChat(); if (UI.view === 'audit') scheduleRender(); }, () => {}); } catch (e) {}
    ouvirChat(); chatUI(); setInterval(desenharChat, 6e4);
    /* cliques dentro do Pedidos e Recebimento (iframe) também contam como ação da pessoa */
    const ligaIframes = () => document.querySelectorAll('iframe').forEach(f => { try { const d = f.contentDocument; if (d && !d.__pyG) { d.__pyG = 1; ['pointerdown', 'keydown'].forEach(t => d.addEventListener(t, FB.gesto, true)); } } catch (e) {} });
    setInterval(ligaIframes, 3000);
    if (FB.colOk('ocorrencias') && !S.ocorrencias.length) { try { FB.db.collection('ocorrencias').onSnapshot(s => { S.ocorrencias = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); if (UI.view === 'avf') scheduleRender(); }, () => {}); } catch (e) {} }
    if (FB.setor === 'admin') {
      let q = FB.fs.collection('auditoria'); try { q = q.orderBy('em', 'desc').limit(1500); } catch (e) {}
      q.onSnapshot(s => { S.auditoria = s.docs.map(d => Object.assign({}, d.data(), { id: d.id })); if (['audit', 'home'].includes(UI.view)) scheduleRender(); }, e => console.warn('[pyro] auditoria', e && e.code));
    }
  });
})();
