/* ============================================================
   Pyro Tools (Firebase) · v0.9
   - Recebimento por arquivo: romaneio em PDF ou XML da NF-e preenche a chegada
   - Conferência antes de salvar: chegou tudo? foi conferido? divergências e não conformidades
   - Versão debaixo do mascote e novidades da versão para o administrador
   ============================================================ */
(function () {
  'use strict';
  if (!window.PYRO_FB || !window.PYRO_SX || PYRO_FB.claude) return;
  const FB = window.PYRO_FB, SX = window.PYRO_SX, H = SX.h;
  const VER = window.PYRO_FB_VER || '';

  /* ================= Novidades da versão ================= */
  const NOVIDADES = [
    { v: '0.16.1', data: '2026-11-12', itens: ['Indicadores de compras: filtro por mês ao lado do ano (ou clique na barra do mês no gráfico). Os cartões, Por obra e Maiores fornecedores passam a mostrar só aquele mês.', 'Painel da obra: além de 30 d, 90 d, 6 m e Tudo, dá para escolher um mês (Por mês…). O painel mostra as notas, pedidos e recebimentos daquele mês, comparando com o período anterior.'] },
    { v: '0.16.0', data: '2026-11-12', itens: [
      'Fornecedores duplicados (Configurações > Fornecedores > Procurar duplicados): o Pyro acha os repetidos (mesmo CNPJ, nome igual ou parecido, nome que é só um número) e junta num só, passando pedidos, notas, entregas e cotações.',
      'Editar fornecedor: Buscar dados pelo CNPJ preenche nome, telefone e e-mail pela consulta pública e mostra a situação na Receita. Botão Inativar: o fornecedor sai das listas de escolha, mas o histórico e a avaliação ficam.',
      'Fases (lote) editáveis: Configurações > Obras > Fases (lote). O administrador cria, tira e ordena as fases.',
      'Lixeira (Configurações e Auditoria): o que foi excluído nos últimos 30 dias, com Restaurar.',
      'Relatórios: Resumo do dia já montado (chegou hoje, atrasados, previsto para amanhã, cancelados hoje), com Copiar e Abrir no e-mail. Depois das 16h, a Home avisa que está pronto.',
      'Pedidos e Recebimento: arraste o romaneio (PDF) ou o XML da nota em cima do card do pedido para abrir o Registrar chegada preenchido.',
      'Backup semanal: o Pyro lembra o administrador quando passa de 7 dias sem backup (ou baixa sozinho, se você marcar).',
      'Deploy: bash publicar.sh confere o pacote antes de publicar e para se achar algo errado.'] },
    { v: '0.15.2', data: '2026-11-12', itens: ['Configurações > Fornecedores: botão Excluir fornecedor dentro do Editar (só o administrador). Se o fornecedor tem pedidos, notas, entregas ou cotações, o Pyro pede o fornecedor que fica no lugar e passa tudo para ele antes de excluir.', 'Fase (lote) do pedido: nova opção Interno.'] },
    { v: '0.15.1', data: '2026-11-12', itens: ['Celular e tablet: saiu a barra lateral fixa de ícones. O menu abre só pelo ☰ no canto de cima, por cima da página, com os nomes, favoritos e grupos. Toque num item ou fora do menu para fechar. A tela fica inteira para o conteúdo.'] },
    { v: '0.15.0', data: '2026-11-11', itens: ['Pyro como aplicativo: no celular, toque em Instalar app no menu (ou menu do Chrome > Instalar app; no iPhone, Compartilhar > Adicionar à Tela de Início). Abre em tela cheia com o ícone do Pyro.', 'Menu com favoritos: passe o mouse num item e clique na estrela ☆ para levá-lo ao topo. Clique no nome de um grupo (Principal, Setores, Sistema) para recolher ou mostrar.', 'Medidas dos vidros: no Editar pedido, o botão 📐 Medidas dos vidros lê o romaneio (PDF) ou o relatório de vidros (Excel/CSV) e propõe largura x altura para os vidros sem medida. Você confere antes de gravar. Depois disso, o romaneio é lido peça por peça.', 'Segurança: o banco só aceita cancelar ou reativar pedido de quem pode cancelar, e exige o motivo também no servidor.'] },
    { v: '0.14.2', data: '2026-11-11', itens: ['Celular e tablet: o menu lateral fica sempre visível como uma coluna de ícones (no lugar da barra de baixo) e o botão ☰ abre o menu com os nomes. No computador, o mesmo botão recolhe ou abre o menu (fica salvo). O menu rola quando a tela é baixa.', 'Saiu o botão flutuante Receber por arquivo, que ficava por cima do chat no celular. Receber por arquivo continua no Editar pedido e no Registrar chegada.', 'No celular, o chat fica no menu (Conversas), sem botão por cima do conteúdo.', 'Correção: quando um setor sem gravação no Recebimento cancelava um pedido, os itens continuavam em Pedidos e Recebimento. Agora o Pyro avisa e tira os itens assim que o administrador ou o Recebimento abre o sistema.'] },
    { v: '0.14.1', data: '2026-11-11', itens: ['Ler romaneio ou XML: vidros com código genérico (COMUM-LA…) e sem medida cadastrada agora são lidos pelo tipo do vidro (LM INCOLOR 3+3 = VIDRO LAMINADO 06MM 3+3; TP 8MM = TEMPERADO 8MM). Nota em m² marca as peças daquele vidro e avisa. Quando nada bate, o Pyro mostra o que o arquivo trouxe (medidas, tipo de vidro, OP) e o que falta no pedido.'] },
    { v: '0.14.0', data: '2026-11-09', itens: ['Obras > Pedidos de compra: botão Cancelar (✕) ao lado do lápis. Pede o motivo; o pedido não é apagado, continua na obra com a etiqueta Cancelado e o 👁 para ver o motivo. Os itens dele saem de Pedidos e Recebimento e o valor deixa de contar no budget. O administrador pode reativar pelo 👁.'] },
    { v: '0.13.2', data: '2026-11-09', itens: ['Receber por arquivo: romaneio de vidros agora é lido pela medida LARGURA x ALTURA de cada peça, mesmo quando o nome do produto vem só no cabeçalho. O Pyro avisa as medidas do romaneio que não estão no pedido e quando o romaneio cita uma OP diferente do pedido encontrado.'] },
    { v: '0.13.1', data: '2026-11-09', itens: ['Correções de QA: proteção contra código escondido em textos (XSS) no Pedidos e Recebimento, no Roteiro e no Pyro; anexos do chat só abrem na aba quando são imagem ou PDF de verdade (o resto é baixado); ninguém consegue gravar nome ou setor falso no chat, na auditoria ou no online; o histórico antigo do chat não aparece como mensagem nova na primeira vez; menu de baixo do celular sem nomes encavalados (dá para rolar para o lado).'] },
    { v: '0.13.0', data: '2026-11-09', itens: ['Tema Noturno (Configurações > Aparência): preto e amarelo, com o Pyro de máscara, capa e a chama no peito. Nas Entregas e Coletas, o fogo vira um enxame de morcegos: ao clicar e ao concluir uma entrega ou coleta, os morcegos cobrem o card, consomem e levam para Finalizados.'] },
    { v: '0.12.1', data: '2026-11-06', itens: ['Pedidos e Recebimento: campo Tipo (tipo de material: Ferragem, Vedação, Perfil…) no cadastro, na janela de detalhes e no editor do item, com sugestões dos tipos já usados. O Tipo é puxado da coluna TIPO das planilhas (Controle Recebimento e Lista de Pedido de Compra) e, num item novo de um pedido que já existe, dos outros itens do pedido. Aparece ao lado da descrição e no Excel.'] },
    { v: '0.12.0', data: '2026-11-05', itens: [
      'Editor do card (Pedidos e Recebimento > Editar pedido): botão Receber por arquivo (romaneio ou XML do pedido abre o Registrar chegada já preenchido) e botão Excluir pedido, com confirmação e Desfazer.',
      'Chat: som quando chega mensagem (🔔 liga e desliga) e anexos: clipe para arquivo ou imagem, colar um print com Ctrl+V ou arrastar. Imagens aparecem na conversa; arquivos até 8 MB.'] },
    { v: '0.11.1', data: '2026-11-05', itens: ['Chat e painel ao vivo também em redes de empresa (proxy/antivírus): o Pyro troca sozinho para um modo de conexão compatível. Botão ↻ no chat para buscar mensagens novas na hora, e o texto não se perde enquanto você digita.'] },
    { v: '0.11.0', data: '2026-11-05', itens: [
      'Auditoria (só o administrador): terminal estilo Git com cada alteração (quem, quando, onde, antes e depois de cada campo), logins e botão [desfazer]. Filtros por pessoa, ação, lugar, dia e busca.',
      'Alertas: exclusões, mais de 30 alterações em 10 minutos, login fora do horário ou no fim de semana, valor, budget ou cancelamento alterados. Aviso na Home do administrador.',
      'Chat entre os usuários (botão redondo no canto): sala Geral e conversa direta, com quem está online (bolinha verde) e mensagens não lidas.'] },
    { v: '0.10.0', data: '2026-11-05', itens: [
      'Avaliação de fornecedores (Compras, Diretoria e administrador): IQF de 0 a 100 no padrão da ISO 9001 (prazo, não conformidades, pedido completo numa entrega, faturado x aprovado) e classe A, B ou C.',
      'Gráficos: ranking do IQF, entregas por mês no prazo e atrasadas, peças com não conformidade por motivo. Resumo automático com pontos positivos, negativos e recomendação, para copiar.'] },
    { v: '0.9.1', data: '2026-11-04', itens: ['Pedidos do ERP: o fornecedor aparece pelo nome fantasia (do cadastro do Pyro, da coluna de nome fantasia da planilha ou a razão social encurtada), com a razão social embaixo. O administrador corrige o nome no lápis e vale para todos os pedidos daquele agente.'] },
    { v: '0.9.0', data: '2026-11-04', itens: [
      'Recebimento por arquivo: arraste o romaneio (PDF) ou o XML da nota no botão “Receber por arquivo” (Pedidos e Recebimento e Entregas) ou dentro do Registrar chegada. O Pyro acha o pedido, lê os itens e preenche o que chegou.',
      'Antes de salvar a chegada, o Pyro pergunta se chegou tudo e se foi conferido. Se não, você marca os itens com problema, a quantidade e o motivo (riscado, trocado, quebrado, não veio o físico, quantidade a menos ou a mais).',
      'Cada divergência vira uma não conformidade do fornecedor (em Ocorrências da obra) e uma pendência para Compras. As peças com problema não são abatidas: o pedido continua aberto para elas.',
      'A versão do Pyro aparece debaixo do mascote. Clique nela para ver as novidades.'] },
    { v: '0.8.0', data: '2026-11-04', itens: [
      'Aprovações da Diretoria: Compras envia a cotação, a Diretoria aprova ou reprova com motivo.',
      'XML da NF-e: itens e nº do pedido (xPed) guardados na nota e conferidos com o pedido.',
      'Ligar nota ao pedido, com sugestão automática.',
      'Relatório diário sem PC e categoria repetidos, com resumo da obra e quadro de comprados sem previsão.'] },
    { v: '0.7.0', data: '2026-10-29', itens: [
      'Tema Alumínio padrão; todos trocam o tema.',
      'Conferir com a planilha de controle; consumo do budget como na planilha.',
      'Cotações por e-mail com modelo editável; Compras edita o Hoje do setor.'] }
  ];
  const cmpV = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  function abrirNovidades(desde) {
    const L = NOVIDADES.filter(n => desde == null ? true : cmpV(n.v, desde) > 0);
    const lista = (L.length ? L : NOVIDADES.slice(0, 1)).map(n => `<div class="nov-v"><div class="nov-h"><b>v${esc(n.v)}</b><span class="s muted">${fdy(n.data)}</span>${n.v === VER ? '<span class="pill ok">instalada</span>' : ''}</div><ul>${n.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');
    modal('Novidades do Pyro' + (VER ? ' · v' + VER : ''), `<div class="full nov">${lista}</div>`, { submit: 'Entendi', onSubmit: () => { LS.set('pyro_fb_ver_visto', VER); } });
  }
  SX.novidades = abrirNovidades;
  document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-novidades]'); if (b) { ev.preventDefault(); ev.stopPropagation(); abrirNovidades(null); } }, true);

  /* ================= Leitura do romaneio (PDF) e do XML ================= */
  const F = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const K = v => F(v).replace(/[^a-z0-9]/g, '');
  const faltaDe = x => Math.max(0, (+x.qtdePedida || 0) - rowQtdRec(x));
  const dimsDe = x => { const L = +x.larguraMm || 0, A = +x.alturaMm || 0; return L && A ? [L, A] : null; };
  const numBR = t => { t = String(t).trim(); if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return +t.replace(/\./g, '').replace(',', '.'); if (/^\d+,\d+$/.test(t)) return +t.replace(',', '.'); if (/^\d+\.\d+$/.test(t)) return +t; return +t.replace(/\D/g, '') || 0; };
  const UNID = 'UN|UND|UNID|PC|PÇ|PCS|PEÇA|PECA|PECAS|PEÇAS|BR|BARRA|BARRAS|CJ|CONJ|KG|M2|M²|MT|ML|PAR|CX|RL|JG|M';
  function qtdDaLinha(L, x, pres) {
    const u1 = L.match(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*(?:' + UNID + ')\\b', 'i')), u2 = L.match(new RegExp('\\b(?:' + UNID + ')\\s+(\\d+(?:[.,]\\d+)?)', 'i'));
    const ign = new Set((pres || []).map(String));
    if (u2 && !ign.has(String(numBR(u2[1])))) return numBR(u2[1]);
    if (u1 && !ign.has(String(numBR(u1[1])))) return numBR(u1[1]);
    const nums = (L.match(/\d+(?:[.,]\d+)*/g) || []).filter(t => !/,\d{2}$/.test(t) || numBR(t) < 100).map(numBR).filter(n => n > 0 && n < 10000 && !ign.has(String(n)));
    if (!nums.length) return 0;
    const fa = faltaDe(x); if (nums.includes(fa)) return fa;
    const ok = nums.filter(n => Number.isInteger(n) && n <= Math.max(fa * 2, 1)); return ok.length ? ok[ok.length - 1] : 0;
  }
  /* soma a quantidade num item; se houver vários itens iguais, enche um de cada vez até o que falta */
  function distribuir(cand, q, soma) {
    if (cand.length === 1) { soma.set(cand[0].id, (soma.get(cand[0].id) || 0) + q); return; }
    let resto = q; for (const x of cand) { if (resto <= 0) break; const cap = Math.max(0, faltaDe(x) - (soma.get(x.id) || 0)); const v = Math.min(cap, resto); if (v > 0) { soma.set(x.id, (soma.get(x.id) || 0) + v); resto -= v; } }
    if (resto > 0) { const u = cand[cand.length - 1]; soma.set(u.id, (soma.get(u.id) || 0) + resto); }
  }
  const temDims = (txt, d) => { const ns = (String(txt).match(/\d{3,4}/g) || []).map(Number); return ns.includes(d[0]) && ns.includes(d[1]); };
  /* linhas com código/descrição/quantidade (XML) */
  function casarItens(rows, pend) {
    const soma = new Map(), sem = [], avisos = [];
    rows.forEach(r => {
      if (!r.q) return; let cand = [];
      if (r.c) { const kc = K(r.c); if (kc.length >= 2) cand = pend.filter(x => x.codigo && K(x.codigo) === kc); }
      if (!cand.length && r.d) { const fd = F(r.d); cand = pend.filter(x => F(x.descricao) === fd); if (!cand.length) cand = pend.filter(x => { const a = F(x.descricao); return a.length >= 6 && (fd.includes(a) || a.includes(fd)); }); }
      if (!cand.length && r.c) { const kc = K(r.c); if (kc.length >= 3) cand = pend.filter(x => K(x.descricao).includes(kc)); }
      if (cand.length > 1) { const m = cand.filter(x => dimsDe(x) && temDims(r.d + ' ' + (r.c || ''), dimsDe(x))); if (m.length) cand = m; }
      /* vidro pelo tipo (nota do fornecedor usa o código dele): LM INCOLOR 3+3 = VIDRO LAMINADO 06MM (03MM + 03MM) */
      let tipo = false;
      if (!cand.length && specVidro(r.d)) { const sp = specVidro(r.d); cand = pend.filter(x => specVidro(x.descricao) === sp); tipo = cand.length > 0; }
      if (cand.length && tipo && /^m2|m²|mq|m\^?2$/i.test(String(r.un || '').trim()) && !cand.some(x => /m2|m²/i.test(x.unidade || ''))) {
        /* nota em m² e pedido em peças: não dá para converter; marca as peças daquele vidro como chegadas e avisa */
        cand.forEach(x => soma.set(x.id, Math.max(soma.get(x.id) || 0, faltaDe(x)))); avisos.push(`a nota traz ${fmtQ(r.q)} m² de ${r.d}; marquei as ${cand.length} peça(s) desse vidro como chegadas — confira com o romaneio`); return;
      }
      if (cand.length) distribuir(cand, r.q, soma); else sem.push(r.c || r.d);
    });
    return { soma, sem, lidas: rows.filter(r => r.q).length, avisos };
  }
  /* romaneio em PDF: cada linha de texto que traz o código (ou as medidas, nos vidros) de um item pendente */
  /* medidas escritas como "1447 x 1010" (em qualquer ordem): pares da linha */
  const paresMedida = L => [...String(L).matchAll(/(\d{2,4})\s*[xX×*]\s*(\d{2,4})/g)].map(m => [+m[1], +m[2]]);
  const mesmoPar = (p, d) => (p[0] === d[0] && p[1] === d[1]) || (p[0] === d[1] && p[1] === d[0]);
  /* tipo de vidro: "VIDRO LAMINADO 06MM (03MM + 03MM)" e "LM INCOLOR 3+3" viram L3+3; "TEMPERADO 8MM" e "TP 8MM" viram T8 */
  function specVidro(t) {
    const f = F(t); if (!/vidro|lamin|\blm\b|\blam\b|temper|\btp\b|incolor|fume|verde|refletiv|espelho/.test(f)) return '';
    const m = f.match(/(\d{1,2})\s*(?:mm)?\s*\+\s*(\d{1,2})(?!\d)/); if (m) return 'L' + [+m[1], +m[2]].sort((a, b) => a - b).join('+');
    const e = f.match(/(\d{1,2})\s*mm\b/); if (e && /temper|\btp\b/.test(f)) return 'T' + (+e[1]);
    return '';
  }
  const ehVidro = x => /vidro|lamin|temper/.test(F(x.descricao));
  /* quantidade logo depois da medida: "1390 x 351   1   0,56" -> 1 */
  const qtdAposMedida = L => { const ms = [...String(L).matchAll(/(\d{2,4})\s*[xX×*]\s*(\d{2,4})/g)]; if (!ms.length) return 0; const u = ms[ms.length - 1], m = String(L).slice(u.index + u[0].length).match(/^\s*(\d{1,4})(?![.,]\d{3})(?:\s|$|,\d{1,2}\b)/); return m ? +m[1] : 0; };
  function casarLinhas(linhas, pend) {
    const soma = new Map(), usadas = [], sem = [], porTipo = new Set();
    const vidrosSemMedida = pend.filter(x => !dimsDe(x) && ehVidro(x)), specsPend = [...new Set(vidrosSemMedida.map(x => specVidro(x.descricao)).filter(Boolean))];
    let specAtual = '';
    linhas.forEach(L => {
      const toks = L.split(/[\s;|]+/).map(K).filter(Boolean), fl = F(L), pares = paresMedida(L);
      const spL = specVidro(L); if (spL && !pares.some(p => p[0] >= 100 && p[1] >= 100)) { specAtual = spL; }
      let cand = pend.filter(x => { const k = K(x.codigo); return k.length >= 3 && toks.includes(k); });
      /* vidros: a linha do romaneio traz a medida LARGURA x ALTURA; o nome do produto costuma vir só no cabeçalho */
      if (!cand.length && pares.length) cand = pend.filter(x => dimsDe(x) && pares.some(p => mesmoPar(p, dimsDe(x))));
      /* vidros sem medida no cadastro (código genérico COMUM-LA…): casa pelo tipo de vidro do romaneio (L3+3, L4+4, T8…) */
      if (!cand.length && vidrosSemMedida.length && pares.some(p => p[0] >= 100 && p[1] >= 100)) {
        const sp = spL || specAtual;
        cand = sp ? vidrosSemMedida.filter(x => specVidro(x.descricao) === sp && faltaDe(x) - (soma.get(x.id) || 0) > 0) : [];
        if (!cand.length && sp) cand = vidrosSemMedida.filter(x => specVidro(x.descricao) === sp);
        if (!cand.length && !sp && specsPend.length <= 1) cand = vidrosSemMedida.filter(x => faltaDe(x) - (soma.get(x.id) || 0) > 0);
        if (cand.length) { const q = qtdAposMedida(L) || 1; distribuir(cand, q, soma); cand.forEach(x => porTipo.add(x.id)); usadas.push(L); return; }
      }
      if (!cand.length) cand = pend.filter(x => dimsDe(x) && temDims(L, dimsDe(x)) && (!x.descricao || F(x.descricao).split(' ').filter(w => w.length > 3).some(w => fl.includes(w))));
      if (!cand.length && pares.length && pares.some(p => p[0] >= 100 && p[1] >= 100)) { sem.push(pares.map(p => p.join('x')).join(', ') + (L.match(/\b(AL|GC|PJ|V)\s*\d+/i) ? ' (' + L.match(/\b(AL|GC|PJ|V)\s*\d+[^\d]*/i)[0].trim().slice(0, 30) + ')' : '')); return; }
      if (!cand.length) cand = pend.filter(x => { const d = F(x.descricao); return d.length >= 15 && d.split(' ').length >= 3 && fl.includes(d); });
      if (!cand.length) return;
      if (cand.length > 1) { const m = cand.filter(x => dimsDe(x) && temDims(L, dimsDe(x))); if (m.length) cand = m; }
      const x = cand[0], pres = [].concat(String(x.codigo || '').match(/\d+/g) || [], dimsDe(x) || []).map(Number);
      const q = qtdDaLinha(L, x, pres); if (!q) return;
      distribuir(cand, q, soma); usadas.push(L);
    });
    return { soma, sem, lidas: usadas.length, porTipo: [...porTipo].filter(id => soma.has(id)).length };
  }
  async function lerArquivoReceb(file) {
    const nome = (file.name || '').toLowerCase();
    if (nome.endsWith('.xml') || /xml/.test(file.type || '')) {
      const r = lerXml(await file.text()); if (!r) throw new Error('XML sem nota fiscal');
      return { tipo: 'XML', nf: r.numero || '', serie: r.serie || '', romaneio: '', valor: +r.valor || 0, data: r.emissao || '', cnpj: r.fornCnpj || '', fornNome: r.fornNome || '', xPed: r.xPed || [], rows: (r.itens || []).map(i => ({ c: i.cod, d: i.desc, q: +i.qtd || 0, un: i.un || '' })), linhas: [] };
    }
    if (nome.endsWith('.pdf') || file.type === 'application/pdf') {
      const pages = await pdfPages(new Uint8Array(await file.arrayBuffer()));
      if (!pages.some(p => p.items.length)) throw new Error('PDF sem texto (digitalizado). Use o XML ou a planilha.');
      const text = pages.map(p => p.text).join('\n'), flat = F(text);
      const out = { tipo: 'PDF', nf: '', romaneio: '', valor: 0, data: '', cnpj: '', fornNome: '', xPed: [], rows: [], linhas: text.split('\n').map(s => s.trim()).filter(Boolean) };
      if (/danfe|nota fiscal eletronica|chave de acesso/.test(flat) && typeof lerDanfe === 'function') { try { const d = lerDanfe(pages); out.nf = d.numero || ''; out.valor = +num(d.valor || 0) || 0; out.data = d.emissao || ''; out.cnpj = d.fornCnpj || ''; out.fornNome = d.fornNome || ''; } catch (e) {} }
      const m = text.match(/romaneio\s*(?:de\s*\w+\s*)?(?:n[ºo°.]*|numero|nº)?\s*[:#-]?\s*(\d{2,})/i); if (m) out.romaneio = m[1];
      const pm = text.match(/(?:pedido|ped\.?|pc|ordem de compra|oc)\s*(?:n[ºo°.]*)?\s*[:#-]?\s*(\d{2,})/i); if (pm) out.xPed.push(pm[1]);
      out.ops = [...new Set([...text.matchAll(/\bOP\s*-?\s*(\d{1,4})\b/gi)].map(m => String(+m[1])))];
      return out;
    }
    throw new Error('Formato não lido: use PDF do romaneio ou XML da nota (para planilha, use “Ler planilha”).');
  }

  /* aplica o arquivo lido no formulário do Registrar chegada */
  function pendDoForm(f) { return [...f.querySelectorAll('.qchg')].map(i => by('painel_pedidos', i.name.slice(2))).filter(Boolean); }
  /* explica por que não bateu: o que o arquivo traz x o que o pedido tem */
  function diagnostico(R, pend) {
    const linhasMed = (R.linhas || []).filter(L => paresMedida(L).some(p => p[0] >= 100 && p[1] >= 100));
    const specArq = [...new Set((R.linhas || []).concat((R.rows || []).map(r => r.d)).map(specVidro).filter(Boolean))];
    const specPed = [...new Set(pend.map(x => specVidro(x.descricao)).filter(Boolean))];
    const semMed = pend.filter(x => ehVidro(x) && !dimsDe(x)).length;
    const nomeSp = s => s[0] === 'L' ? 'laminado ' + s.slice(1) : 'temperado ' + s.slice(1) + 'mm';
    const d = [];
    if (R.rows && R.rows.length) d.push(`O arquivo tem ${R.rows.length} item(ns), ex.: ${esc(R.rows.slice(0, 2).map(r => (r.c ? r.c + ' ' : '') + r.d).join('; '))}.`);
    else d.push(`O arquivo tem ${(R.linhas || []).length} linha(s) de texto${linhasMed.length ? `, ${linhasMed.length} com medida (ex.: ${esc(paresMedida(linhasMed[0]).map(p => p.join('x')).join(', '))})` : ', nenhuma com medida LARGURA x ALTURA'}.`);
    if (specArq.length) d.push(`Vidro no arquivo: ${esc(specArq.map(nomeSp).join(', '))}; no pedido: ${specPed.length ? esc(specPed.map(nomeSp).join(', ')) : 'nenhum tipo reconhecido'}.`);
    if (semMed) d.push(`${semMed} item(ns) de vidro deste pedido não têm medida cadastrada (largura x altura).`);
    if ((R.ops || []).length) d.push(`O arquivo cita ${esc(R.ops.map(o => 'OP' + o).join(', '))}.`);
    return '<div class="s" style="color:var(--muted);margin-top:6px">' + d.join(' ') + '</div>';
  }
  function aplicarNoForm(f, R, nomeArq) {
    const pend = pendDoForm(f), box = f.querySelector('#q-arq');
    const msg = (t, bad) => { if (box) { box.hidden = false; box.innerHTML = t; box.style.color = bad ? 'var(--bad)' : ''; } };
    const res = R.rows.length ? casarItens(R.rows, pend) : casarLinhas(R.linhas, pend);
    if (!res.soma.size) { msg(`Li o arquivo ${esc(nomeArq)}, mas nenhum item bateu com os itens pendentes deste pedido (pelo código, pela descrição ou pelas medidas). Confira se é o pedido certo ou preencha à mão.` + diagnostico(R, pend), true); return false; }
    const mais = [];
    pend.forEach(x => { const i = f.elements['q_' + x.id]; if (!i) return; const v = Math.round((res.soma.get(x.id) || 0) * 1000) / 1000; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); if (v > faltaDe(x) + 1e-9) mais.push(`${x.codigo || x.descricao} (veio ${fmtQ(v)}, faltava ${fmtQ(faltaDe(x))})`); });
    f._lido = true; f._arq = { nome: nomeArq, tipo: R.tipo, itens: res.soma.size };
    /* nº da nota, romaneio e valor: no primeiro documento se estiver vazio; se ele já tem outra nota, entra como novo documento */
    if (R.nf || R.romaneio || R.valor) {
      const rows = [...f.querySelectorAll('.docrow')], nfN = v => String(v || '').replace(/\D/g, '').replace(/^0+/, '');
      let row = rows.find(x => R.nf && nfN(x.querySelector('.d-nf').value) === nfN(R.nf)) || rows.find(x => R.nf ? !x.querySelector('.d-nf').value : (!x.querySelector('.d-rom').value || x.querySelector('.d-rom').value === R.romaneio));
      if (!row && f._addDoc) row = f._addDoc({});
      if (row) { const s = (c, v, forca) => { const el = row.querySelector(c); if (el && v && (forca || !el.value || el.dataset.auto)) { el.value = v; delete el.dataset.auto; el.dispatchEvent(new Event('input', { bubbles: true })); } }; s('.d-nf', R.nf); s('.d-rom', R.romaneio); s('.d-val', R.valor, true); }
    }
    const e0 = f._ent, p0 = e0 && by('pedidos', e0.pedidoId), opsP = p0 ? [...String([p0.pc, p0.op, p0.item].join(' ')).matchAll(/OP\s*-?\s*(\d{1,4})/gi)].map(m => String(+m[1])) : [];
    const avisoOP = (R.ops || []).length && opsP.length && !(R.ops || []).some(o => opsP.includes(o)) ? `<br><span style="color:var(--warn)">O romaneio cita ${R.ops.map(o => 'OP' + o).join(', ')}, mas os itens batem com este pedido (${esc(p0.pc || p0.item || '')}). Confira se é o pedido certo.</span>` : '';
    msg(`<b>${R.tipo === 'XML' ? 'XML da nota' : 'Romaneio'} lido (${esc(nomeArq)}):</b> ${res.soma.size} de ${pend.length} item(ns) preenchido(s); os que não estão no arquivo ficaram com 0.` +
      (mais.length ? `<br><span style="color:var(--warn)">Acima do que faltava: ${esc(mais.slice(0, 5).join('; '))}${mais.length > 5 ? '…' : ''}</span>` : '') +
      (res.porTipo ? `<br><span style="color:var(--warn)">${res.porTipo} item(ns) de vidro sem medida no cadastro foram preenchidos pelo tipo do vidro (ex.: laminado 3+3), na ordem do que falta. Confira as peças.</span>` : '') +
      ((res.avisos || []).length ? `<br><span style="color:var(--warn)">${esc(res.avisos.join('; '))}</span>` : '') +
      (res.sem.length ? `<br><span style="color:var(--warn)">${res.sem.length} linha(s) do arquivo sem item correspondente neste pedido: ${esc(res.sem.slice(0, 5).join('; '))}${res.sem.length > 5 ? '…' : ''}</span>` : '') + avisoOP + '<br>Confira as quantidades antes de confirmar.');
    return true;
  }
  async function lerNoForm(f, file) {
    const box = f.querySelector('#q-arq'); if (box) { box.hidden = false; box.style.color = ''; box.textContent = 'Lendo ' + file.name + '…'; }
    let R; try { R = await lerArquivoReceb(file); } catch (e) { if (box) { box.innerHTML = esc(e.message || 'Não foi possível ler o arquivo'); box.style.color = 'var(--bad)'; } return; }
    aplicarNoForm(f, R, file.name);
    /* guarda o arquivo como anexo da chegada */
    try { const inp = f.elements.arquivos; if (inp && inp.type === 'file') { const dt = new DataTransfer(); [...(inp.files || [])].forEach(x => dt.items.add(x)); if (![...(inp.files || [])].some(x => x.name === file.name)) dt.items.add(file); inp.files = dt.files; } } catch (e) {}
  }

  /* ================= Registrar chegada: botão, arrastar e conferência ================= */
  const MOTIVOS = ['Riscado', 'Trocado (item errado)', 'Quebrado ou trincado', 'Não veio o físico', 'Quantidade a menos', 'Quantidade a mais', 'Medida errada', 'Outro'];
  if (typeof formChegada === 'function') {
    const fcOrig = formChegada;
    formChegada = function (e, edit, rid) {
      const r = fcOrig.apply(this, arguments);
      try {
        const f = document.getElementById('mform'); if (!f || !f.querySelector('.qchg')) return r;
        f.dataset.chg = '1'; f._ent = e;
        const bar = f.querySelector('[data-q="none"]'), alvo = bar ? bar.parentNode : null;
        const html = `<label class="btn sm pri" style="cursor:pointer" title="Romaneio em PDF ou XML da nota: o Pyro lê e preenche o que chegou">${ic('upload', 13)} Ler romaneio ou XML<input type="file" data-qarq accept=".pdf,.xml,application/pdf,text/xml" style="display:none"></label>`;
        if (alvo) alvo.insertAdjacentHTML('afterbegin', html); else f.querySelector('.chg').insertAdjacentHTML('beforebegin', `<div class="full badges">${html}</div>`);
        (f.querySelector('#q-xls') || f.querySelector('.chg').closest('.tablewrap')).insertAdjacentHTML('afterend', '<div class="full s muted" id="q-arq" hidden></div>');
        f.addEventListener('change', ev => { if (ev.target.matches && ev.target.matches('[data-qarq]')) { const fl = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (fl) lerNoForm(f, fl); } });
        const sheet = f.closest('.sheet') || f;
        sheet.addEventListener('dragover', ev => { if (ev.dataTransfer && [...ev.dataTransfer.types].includes('Files')) { ev.preventDefault(); sheet.classList.add('drop-on'); } });
        sheet.addEventListener('dragleave', ev => { if (ev.target === sheet) sheet.classList.remove('drop-on'); });
        sheet.addEventListener('drop', ev => { sheet.classList.remove('drop-on'); const fl = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!fl || !/\.(pdf|xml)$/i.test(fl.name)) return; ev.preventDefault(); ev.stopPropagation(); lerNoForm(f, fl); });
        if (SX._arqPendente) { const a = SX._arqPendente; SX._arqPendente = null; aplicarNoForm(f, a.R, a.nome); try { const inp = f.elements.arquivos; if (inp && a.file) { const dt = new DataTransfer(); dt.items.add(a.file); inp.files = dt.files; } } catch (er) {} }
      } catch (er) { console.warn('[pyro] chegada por arquivo', er); }
      return r;
    };
  }

  /* pergunta antes de salvar: chegou tudo? foi conferido? */
  document.addEventListener('submit', ev => {
    const f = ev.target; if (!f || f.id !== 'mform' || f.dataset.chg !== '1' || f._conf) return;
    const chegada = f.elements.chegada && f.elements.chegada.value; if (!chegada) return;
    const pend = pendDoForm(f), qs = pend.map(x => ({ x, q: Math.max(0, +(f.elements['q_' + x.id] || {}).value || 0) })).filter(o => o.q > 0);
    if (!qs.length) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    conferir(f, pend, qs);
  }, true);

  function conferir(f, pend, qs) {
    const e = f._ent, p = e && by('pedidos', e.pedidoId), ls = p ? linhasDoPedido(p.id) : pend;
    const fica = ls.filter(x => { const o = qs.find(y => y.x.id === x.id); return (+x.qtdePedida || 0) - rowQtdRec(x) - (o ? o.q : 0) > 1e-9; }).length;
    const pecas = qs.reduce((a, o) => a + o.q, 0);
    const ov = document.createElement('div'); ov.className = 'conf-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Conferência do recebimento');
    const passo1 = `<div class="conf-box"><h2>Conferência do recebimento</h2>
      <p>${qs.length} item(ns) · ${fmtQ(pecas)} peça(s) nesta chegada${f._arq ? ` · lido do ${f._arq.tipo === 'XML' ? 'XML' : 'romaneio'} <b>${esc(f._arq.nome)}</b>` : ''}.</p>
      <p class="s ${fica ? '' : 'ok'}">${fica ? `Depois desta chegada ainda faltam ${fica} item(ns) do pedido: ele continua aberto (chegada parcial).` : 'Com esta chegada o pedido fica completo e será finalizado.'}</p>
      <p style="font-weight:600;margin-top:14px">Chegou tudo o que está no ${f._arq ? 'arquivo' : 'formulário'} e foi conferido?</p>
      <div class="conf-acts"><button type="button" class="btn pri" data-cf="sim">${ic('check', 15)} Sim, chegou tudo e conferi</button><button type="button" class="btn" data-cf="nao">${ic('alert', 15)} Não, tem divergência</button><button type="button" class="btn ghost" data-cf="voltar">Voltar</button></div></div>`;
    const passo2 = () => `<div class="conf-box wide"><h2>O que veio diferente?</h2><p class="s muted">Marque os itens com problema, a quantidade e o motivo. As peças com problema não são abatidas do pedido (exceto “Quantidade a mais”) e viram não conformidade do fornecedor.</p>
      <div class="tablewrap" style="max-height:46vh;overflow:auto"><table><thead><tr><th></th><th>Item</th><th class="r">No arquivo</th><th class="r">Qtd. com problema</th><th>Motivo</th><th>Observação</th></tr></thead><tbody>${qs.map(({ x, q }, i) => `<tr data-dv="${i}"><td><input type="checkbox" class="dv-on" aria-label="Item com problema" style="width:17px;height:17px;accent-color:var(--accent)"></td><td><div class="t mono">${esc(x.codigo || '—')}</div><div class="s">${esc(x.descricao || '')}${dimsDe(x) ? ' · ' + dimsDe(x).join('x') : ''}</div></td><td class="r mono">${fmtQ(q)}</td><td class="r"><input class="f dv-q" type="number" min="0" step="any" value="${q}" style="width:90px" aria-label="Quantidade com problema"></td><td><select class="f dv-m" aria-label="Motivo">${MOTIVOS.map(m => `<option>${esc(m)}</option>`).join('')}</select></td><td><input class="f dv-o" type="text" placeholder="Ex.: 2 vidros com risco na borda" aria-label="Observação"></td></tr>`).join('')}</tbody></table></div>
      <div class="conf-acts"><button type="button" class="btn pri" data-cf="salvardv">Salvar com divergência</button><button type="button" class="btn ghost" data-cf="p1">Voltar</button></div></div>`;
    ov.innerHTML = passo1; document.body.appendChild(ov);
    const fechar = () => ov.remove();
    const enviar = () => { fechar(); f._conf = true; if (f.requestSubmit) f.requestSubmit(); else f.querySelector('button[type=submit]').click(); };
    const obsAdd = t => { const o = f.elements.obs; if (o) o.value = (o.value ? o.value.replace(/\s+$/, '') + '\n' : '') + t; };
    ov.addEventListener('click', ev => {
      const b = ev.target.closest('[data-cf]'); if (!b) return; const a = b.dataset.cf;
      if (a === 'voltar') fechar();
      else if (a === 'p1') ov.innerHTML = passo1;
      else if (a === 'nao') ov.innerHTML = passo2();
      else if (a === 'sim') { obsAdd(`Conferido por ${FB.nome} em ${fdy(today())}: chegou tudo conforme ${f._arq ? 'o ' + (f._arq.tipo === 'XML' ? 'XML da nota' : 'romaneio') : 'o informado'}.`); f._ncs = []; enviar(); }
      else if (a === 'salvardv') {
        const marc = [...ov.querySelectorAll('[data-dv]')].filter(tr => tr.querySelector('.dv-on').checked);
        if (!marc.length) { toast('Marque pelo menos um item com problema'); return; }
        const ncs = [];
        for (const tr of marc) {
          const { x, q } = qs[+tr.dataset.dv], qd = Math.max(0, +tr.querySelector('.dv-q').value || 0), mot = tr.querySelector('.dv-m').value, ob = tr.querySelector('.dv-o').value.trim();
          if (!qd) { toast('Informe a quantidade com problema de ' + (x.codigo || x.descricao)); tr.querySelector('.dv-q').focus(); return; }
          if (mot !== 'Quantidade a mais') { const inp = f.elements['q_' + x.id]; inp.value = Math.max(0, Math.round((q - qd) * 1000) / 1000); inp.dispatchEvent(new Event('input', { bubbles: true })); }
          ncs.push({ x, qd, q, mot, ob });
        }
        obsAdd(`Conferido por ${FB.nome} em ${fdy(today())} com divergência: ` + ncs.map(n => `${n.x.codigo || n.x.descricao}: ${fmtQ(n.qd)} ${n.mot.toLowerCase()}${n.ob ? ' (' + n.ob + ')' : ''}`).join('; ') + '.');
        f._ncs = ncs;
        const algum = pend.some(x => +(f.elements['q_' + x.id] || {}).value > 0);
        if (!algum) { fechar(); toast('Nada a abater: todas as peças desta chegada estão com problema. Registre como ocorrência ou ajuste as quantidades.'); f._conf = false; gravarNCs(f, f._ncs); f._ncs = []; return; }
        enviar();
      }
    });
    ov.addEventListener('keydown', ev => { if (ev.key === 'Escape') fechar(); });
    setTimeout(() => { const b = ov.querySelector('[data-cf="sim"]'); if (b) b.focus(); }, 30);
    /* grava as não conformidades só depois que a chegada foi salva (o formulário fechou) */
    const t0 = Date.now(), espera = () => { if (!f._conf) return; if (!document.body.contains(f) || !document.getElementById('modal').classList.contains('open') || document.getElementById('mform') !== f) { gravarNCs(f, f._ncs || []); return; } if (Date.now() - t0 < 60000) setTimeout(espera, 400); else f._conf = false; };
    const iv = setInterval(() => { if (!document.body.contains(ov)) { clearInterval(iv); if (f._conf) setTimeout(espera, 300); } }, 200);
  }
  async function gravarNCs(f, ncs) {
    if (!ncs || !ncs.length) return;
    const e = f._ent, p = e && by('pedidos', e.pedidoId); if (!p) return;
    const data = (f.elements.chegada && f.elements.chegada.value) || today(), doc = f.querySelector('.docrow .d-nf'), rom = f.querySelector('.docrow .d-rom');
    for (const n of ncs) {
      const o = { id: 'nc' + uid(), nc: true, obraId: p.obraId, pedidoId: p.id, entregaId: e.id, fornecedorId: p.fornecedorId || '', itemId: n.x.id, codigo: n.x.codigo || '', descricao: n.x.descricao || '', qtd: n.qd, qtdArquivo: n.q, motivo: n.mot, tipo: 'Não conformidade · ' + n.mot, desc: `${n.x.codigo ? n.x.codigo + ' · ' : ''}${n.x.descricao || ''}: ${fmtQ(n.qd)} de ${fmtQ(n.q)} ${n.mot.toLowerCase()}${n.ob ? ' · ' + n.ob : ''} (${nm('fornecedores', p.fornecedorId, 'fornecedor')}, ${p.item})`, obs: n.ob, nf: doc ? doc.value : '', romaneio: rom ? rom.value : '', dataChegada: data, urg: /quebrad|trocad|nao veio|não veio/i.test(n.mot), anexos: [], status: 'aberta', por: FB.nome, setor: FB.setor, criadoEm: Date.now() };
      await put('ocorrencias', o, true);
      if (FB.colOk('pendencias')) await put('pendencias', { id: 'oc_' + o.id, titulo: `Não conformidade: ${o.desc.slice(0, 90)}`, detalhe: 'Registrada na conferência do recebimento por ' + FB.nome + '. Combine com o fornecedor a troca ou a reposição.', obraId: o.obraId, setor: 'compras', dono: '', prazo: o.urg ? today() : addDays(today(), 2), urg: o.urg, status: 'aberta', tipo: 'Não conformidade', origem: 'nao_conformidade', ocorrenciaId: o.id, pedidoId: p.id, criadoEm: Date.now(), criadoPor: FB.nome, historico: [{ em: Date.now(), por: FB.nome, txt: 'Criada na conferência do recebimento' }] }, true);
    }
    toast(ncs.length + ' não conformidade(s) registrada(s) para ' + nm('fornecedores', p.fornecedorId, 'o fornecedor'));
  }
  SX.receb = { lerArquivoReceb, casarItens, casarLinhas, qtdDaLinha, aplicarNoForm, specVidro, diagnostico };

  /* ================= Receber por arquivo (acha o pedido sozinho) ================= */
  const podeReceber = () => FB.setor === 'admin' || FB.modo('entregas') === 'edita' || FB.modo('receb') === 'edita';
  function candidatos(R) {
    const forn = (R.cnpj || R.fornNome) && typeof fornDe === 'function' ? fornDe(R.cnpj, R.fornNome) : '';
    const ped = (R.xPed || []).map(x => String(x).replace(/\D/g, '').replace(/^0+/, '')).filter(Boolean);
    return S.entregas.filter(e => e.status !== 'recebido').map(e => {
      const p = by('pedidos', e.pedidoId); if (!p || p.status === 'cancelado' || p.status === 'recebido') return null;
      const pend = linhasDoPedido(p.id).filter(x => faltaDe(x) > 0); if (!pend.length) return null;
      const res = R.rows.length ? casarItens(R.rows, pend) : casarLinhas(R.linhas, pend);
      let sc = res.soma.size * 2; if (forn && p.fornecedorId === forn) sc += 3;
      const opsP = [...String([p.pc, p.op, p.item].join(' ')).matchAll(/OP\s*-?\s*(\d{1,4})/gi)].map(m => String(+m[1]));
      if ((R.ops || []).some(o => opsP.includes(o))) sc += 1;
      const pk = [p.erpPedido, p.pc].map(x => String(x || '').replace(/\D/g, '').replace(/^0+/, '')).filter(x => x.length >= 1);
      if (ped.some(x => pk.includes(x))) sc += 5;
      return res.soma.size ? { e, p, sc, n: res.soma.size, pend: pend.length } : null;
    }).filter(Boolean).sort((a, b) => b.sc - a.sc);
  }
  async function receberArquivo(file) {
    toast('Lendo ' + file.name + '…');
    let R; try { R = await lerArquivoReceb(file); } catch (e) { toast(e.message || 'Não foi possível ler o arquivo'); return; }
    const C = candidatos(R);
    const abrir = c => { SX._arqPendente = { R, nome: file.name, file }; formChegada(c.e); };
    if (C.length === 1 || (C.length > 1 && C[0].sc >= C[1].sc + 3)) { abrir(C[0]); return; }
    modal('De qual pedido é este arquivo?', `<div class="full"><p class="muted" style="margin:0 0 8px">${esc(file.name)} · ${R.tipo}${R.nf ? ' · NF ' + esc(R.nf) : ''}${R.romaneio ? ' · romaneio ' + esc(R.romaneio) : ''}${R.fornNome ? ' · ' + esc(R.fornNome) : ''}. ${C.length ? 'Estes pedidos em aberto têm itens do arquivo:' : 'Nenhum pedido em aberto tem itens deste arquivo. Abra o pedido em Entregas e preencha à mão.'}</p>
      ${C.length ? `<div class="tablewrap"><table><thead><tr><th>Pedido</th><th>Obra</th><th>Fornecedor</th><th class="r">Itens que batem</th><th></th></tr></thead><tbody>${C.slice(0, 10).map((c, i) => `<tr><td><div class="t">${esc(c.p.item || '')}</div><div class="s">${esc([c.p.pc, c.p.erpPedido ? 'ERP ' + c.p.erpPedido : ''].filter(Boolean).join(' · '))}</div></td><td>${esc(H.curtoObra(by('obras', c.p.obraId) || { nome: '—' }))}</td><td>${esc(nm('fornecedores', c.p.fornecedorId, '—'))}</td><td class="r mono">${c.n} de ${c.pend}</td><td class="r"><button type="button" class="btn sm pri" data-rcand="${i}">Registrar chegada</button></td></tr>`).join('')}</tbody></table></div>` : ''}</div>`, { submit: 'Fechar', onSubmit: () => {}, wide: true });
    const f = document.getElementById('mform');
    if (f) f.addEventListener('click', ev => { const b = ev.target.closest('[data-rcand]'); if (b) abrir(C[+b.dataset.rcand]); });
  }
  SX.receberArquivo = receberArquivo;
  /* v0.14.2: o botão flutuante "Receber por arquivo" saiu (cobria o chat e o conteúdo no celular).
     Receber por arquivo continua no editor do card (Editar pedido) e no Registrar chegada (Ler romaneio ou XML). */
  let FAB = null;
  function fab() { const v = document.querySelector('.rec-fab'); if (v) v.remove(); }
  function fabAntigo() {
    const on =['receb', 'entregas'].includes(UI.view) && podeReceber() && !(UI.view === 'entregas' && document.getElementById('rotSlot'));
    if (!FAB) {
      FAB = document.createElement('label'); FAB.className = 'rec-fab'; FAB.title = 'Arraste aqui o romaneio (PDF) ou o XML da nota, ou clique para escolher';
      FAB.innerHTML = `${ic('upload', 16)}<span>Receber por arquivo</span><input type="file" accept=".pdf,.xml,application/pdf,text/xml" style="display:none">`;
      FAB.querySelector('input').addEventListener('change', ev => { const fl = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (fl) receberArquivo(fl); });
      FAB.addEventListener('dragover', ev => { ev.preventDefault(); FAB.classList.add('drop-on'); });
      FAB.addEventListener('dragleave', () => FAB.classList.remove('drop-on'));
      FAB.addEventListener('drop', ev => { ev.preventDefault(); FAB.classList.remove('drop-on'); const fl = ev.dataTransfer.files && ev.dataTransfer.files[0]; if (fl) receberArquivo(fl); });
      document.body.appendChild(FAB);
    }
    FAB.style.display = on ? '' : 'none';
  }
  if (typeof recHost === 'function') { const rh = recHost; recHost = function () { rh(); try { fab(); } catch (e) {} }; }

  /* ================= Editor de card do Pedidos e Recebimento: Receber por arquivo e Excluir pedido ================= */
  const recWin = () => { const f = document.querySelector('#recHost iframe'); try { return f && f.contentWindow && f.contentDocument ? f.contentWindow : null; } catch (e) { return null; } };
  const grupoAberto = W => { try { const g = W.eval('grpEdit'); return g ? { num: g.num, ids: g.ids.slice() } : null; } catch (e) { return null; } };
  async function receberNoGrupo(file, ids) {
    let R; try { R = await lerArquivoReceb(file); } catch (e) { toast(e.message || 'Não foi possível ler o arquivo'); return; }
    const pids = [...new Set(S.painel_pedidos.filter(r => ids.includes(r.id)).map(r => r.pyPedidoId).filter(Boolean))];
    const es = pids.map(id => entOf(id)).filter(e => e && e.status !== 'recebido');
    if (es.length === 1) { SX._arqPendente = { R, nome: file.name, file }; formChegada(es[0]); return; }
    if (!pids.length) toast('Estes itens ainda não estão ligados a um pedido do Pyro: procurando o pedido pelo arquivo…');
    receberArquivo(file);
  }
  async function excluirGrupo(W, g) {
    const pedidosRec = W.eval('pedidos'), itens = pedidosRec.filter(p => g.ids.includes(p.id)).map(p => JSON.parse(JSON.stringify(p)));
    if (!itens.length) return;
    const comRec = itens.filter(p => (p.recebimentos || []).length).length;
    const pids = [...new Set(itens.map(p => p.pyPedidoId).filter(Boolean))];
    /* o pedido do Pyro só sai junto quando todos os itens dele estão neste card */
    const pyro = pids.map(id => by('pedidos', id)).filter(Boolean).filter(p => S.painel_pedidos.filter(r => r.pyPedidoId === p.id).every(r => g.ids.includes(r.id)));
    const msg = `Excluir o pedido ${g.num} (${itens.length} item(ns))?${comRec ? ` ${comRec} item(ns) já têm recebimento registrado.` : ''}${pyro.length ? ' Também sai do Pyro: o pedido, a entrega e o vínculo das notas fiscais (as notas ficam).' : ''} Dá para desfazer logo em seguida ou pela Auditoria.`;
    if (!(await W.confirmarAcao(msg))) return;
    try { W.eval('fecharEdicaoGrupo()'); } catch (e) {}
    W.__pyIds = g.ids; W.eval('pedidos = pedidos.filter(p => !window.__pyIds.includes(p.id))');
    await W.deletePedidoDocs(g.ids);
    const bk = { ped: [], ent: [], nfs: [] };
    for (const p of pyro) {
      const e = entOf(p.id), ns = S.nfs.filter(n => n.pedidoId === p.id);
      bk.ped.push(JSON.parse(JSON.stringify(p))); if (e) bk.ent.push(JSON.parse(JSON.stringify(e))); ns.forEach(n => bk.nfs.push(JSON.parse(JSON.stringify(n))));
      for (const n of ns) await put('nfs', Object.assign({}, n, { pedidoId: '', updatedAt: Date.now() }), true);
      if (e) await del('entregas', e.id, true);
      await del('pedidos', p.id, true);
    }
    try { W.atualizarTudoAposFornecedor(); } catch (e) {}
    W.mostrarDesfazer(`Pedido ${g.num} excluído (${itens.length} item(ns))${pyro.length ? ' do Recebimento e do Pyro' : ''}.`, async () => {
      W.__pyVolta = itens; W.eval('pedidos = pedidos.concat(window.__pyVolta)');
      await W.salvarColecao('painel_pedidos', itens);
      for (const p of bk.ped) await put('pedidos', p, true);
      for (const e of bk.ent) await put('entregas', e, true);
      for (const n of bk.nfs) await put('nfs', n, true);
      try { W.atualizarTudoAposFornecedor(); } catch (e) {}
      toast('Pedido restaurado');
    });
  }
  function botoesNoCard() {
    const W = recWin(); if (!W) return; const d = W.document, ov = d.getElementById('grpEditOverlay'); if (!ov || ov.dataset.py) return;
    const rod = d.getElementById('grpEditSalvar') && d.getElementById('grpEditSalvar').parentNode; if (!rod) return;
    ov.dataset.py = '1';
    const pode = FB.setor === 'admin' || FB.modo('receb') === 'edita';
    const podeReceb = podeReceber();
    const box = d.createElement('div'); box.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-right:auto';
    box.innerHTML = (podeReceb ? `<label class="btn btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="Romaneio (PDF) ou XML da nota deste pedido: abre o Registrar chegada já preenchido">📄 Receber por arquivo<input type="file" id="pyGrpArq" accept=".pdf,.xml,application/pdf,text/xml" style="display:none"></label>` : '')
      + (pode && (() => { const g = grupoAberto(W); return g && S.painel_pedidos.some(r => g.ids.includes(r.id) && ehVidro(r) && !dimsDe(r)); })() ? `<label class="btn btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="Romaneio (PDF) ou relatório de vidros (Excel/CSV): grava largura x altura nos vidros sem medida">📐 Medidas dos vidros<input type="file" id="pyGrpMed" accept=".pdf,.xlsx,.xls,.csv,application/pdf" style="display:none"></label>` : '')
      + (pode ? `<button class="btn btn-ghost" id="pyGrpDel" type="button" style="color:#d64545;border-color:color-mix(in srgb,#d64545 45%,transparent)" title="Excluir este pedido e todos os itens dele">🗑 Excluir pedido</button>` : '');
    if (!box.innerHTML) return;
    rod.style.flexWrap = 'wrap'; rod.insertBefore(box, rod.firstChild);
    const arq = d.getElementById('pyGrpArq');
    if (arq) arq.addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; const g = grupoAberto(W); if (!f || !g) return; try { W.eval('fecharEdicaoGrupo()'); } catch (e) {} receberNoGrupo(f, g.ids); });
    const md = d.getElementById('pyGrpMed');
    if (md) md.addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; const g = grupoAberto(W); if (!f || !g) return; try { W.eval('fecharEdicaoGrupo()'); } catch (e) {} medidasNoGrupo(f, g.ids); });
    const bd = d.getElementById('pyGrpDel');
    if (bd) bd.addEventListener('click', () => { const g = grupoAberto(W); if (g) excluirGrupo(W, g); });
  }

  /* ================= v0.15: medidas dos vidros (M5) =================
     Itens de vidro com código genérico (COMUM-LA…) vêm do ERP sem largura x altura.
     O usuário escolhe o romaneio (PDF) ou o relatório de vidros (Excel/CSV); o Pyro lê as peças
     (tipo do vidro, largura x altura, quantidade, posição AL/V) e propõe a medida de cada item.
     Nada é gravado sem a conferência na tela. */
  const REFRX = /\b(?:AL|GC|PJ|PC|JA|PT|FX)\s*-?\s*\d{1,3}(?:\s*[\/·-]\s*V\s*\d{1,2})?/i;
  async function pecasDoArquivo(file) {
    const nome = (file.name || '').toLowerCase(), pecas = [];
    if (/\.(xlsx|xls|xlsm|csv)$/.test(nome)) {
      if (typeof lerExcel !== 'function') throw new Error('Leitor de planilha indisponível');
      const wb = await lerExcel(file);
      for (const sn of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' });
        const hi = rows.findIndex(r => r.some(c => /largura/i.test(c)) && r.some(c => /altura/i.test(c))); if (hi < 0) continue;
        const H = rows[hi].map(c => F(c)), col = rx => H.findIndex(h => rx.test(h));
        const cL = col(/largura/), cA = col(/altura/), cQ = col(/^(qtd|qtde|quant)/), cD = col(/produto|descri|vidro|composi|espessura/), cR = col(/^ref|posi|tipolog|esquadria|^item|^peca|^vao|^codigo/);
        let spAt = '';
        for (const r of rows.slice(hi + 1)) {
          const L = numBR(r[cL] || 0), A = numBR(r[cA] || 0); const d = cD >= 0 ? String(r[cD] || '') : r.join(' ');
          const sp = specVidro(d); if (sp) spAt = sp;
          if (!(L >= 100 && A >= 100)) continue;
          pecas.push({ sp: sp || spAt, L: Math.round(L), A: Math.round(A), q: cQ >= 0 ? (numBR(r[cQ]) || 1) : 1, ref: cR >= 0 ? String(r[cR] || '').trim().slice(0, 40) : ((r.join(' ').match(REFRX) || [''])[0]) });
        }
      }
      return pecas;
    }
    const R = await lerArquivoReceb(file); let spAt = '', buf = [];
    for (const L of R.linhas || []) {
      const pares = paresMedida(L).filter(p => p[0] >= 100 && p[1] >= 100), sp = specVidro(L);
      if (!pares.length) { if (sp) spAt = sp; buf.push(L); if (buf.length > 4) buf.shift(); continue; }
      const p = pares[pares.length - 1], txt = buf.concat([L]).join(' '), ref = (txt.match(REFRX) || [''])[0].replace(/\s+/g, ' ').trim();
      pecas.push({ sp: sp || spAt, L: p[0], A: p[1], q: qtdAposMedida(L) || 1, ref }); buf = [];
    }
    return pecas;
  }
  const refKey = t => { const m = String(t || '').match(/\b(AL|GC|PJ|PC|JA|PT|FX)\s*-?\s*(\d{1,3})(?:\s*[\/·-]\s*V\s*(\d{1,2}))?/i); return m ? (m[1].toUpperCase() + (+m[2]) + (m[3] ? 'V' + (+m[3]) : '')) : ''; };
  function proporMedidas(itens, pecas) {
    const livres = itens.slice(), pares = [], sobra = [];
    for (const pc of pecas) {
      const okSp = x => !pc.sp || !specVidro(x.descricao) || specVidro(x.descricao) === pc.sp;
      const rk0 = refKey(pc.ref), irk = i => refKey((i.obs || '') + ' ' + (i.descricao || ''));
      /* item que já tem outra posição na observação (ex.: AL83 · V9) não recebe a peça AL86 / V2 */
      const cands = livres.filter(okSp).filter(i => !rk0 || !irk(i) || irk(i) === rk0); if (!cands.length) { sobra.push(pc); continue; }
      /* 1º pela posição (AL24 / V2 no arquivo e AL24 · V2 na observação do item), 2º pela quantidade, 3º na ordem */
      const rk = refKey(pc.ref), x = (rk && cands.find(i => refKey((i.obs || '') + ' ' + (i.descricao || '')) === rk)) || cands.find(i => (+i.qtdePedida || 0) === pc.q) || cands[0];
      livres.splice(livres.indexOf(x), 1); pares.push({ x, pc });
    }
    return { pares, sobra, semMedida: livres };
  }
  async function medidasNoGrupo(file, ids) {
    const itens = S.painel_pedidos.filter(r => ids.includes(r.id) && ehVidro(r) && !dimsDe(r));
    if (!itens.length) { toast('Todos os vidros deste pedido já têm medida.'); return; }
    let pecas; try { pecas = await pecasDoArquivo(file); } catch (e) { toast(e.message || 'Não foi possível ler o arquivo'); return; }
    if (!pecas.length) { toast('Não achei peças com LARGURA x ALTURA neste arquivo.'); return; }
    const P = proporMedidas(itens, pecas);
    const linhas = P.pares.map((p, i) => `<tr><td><input type="checkbox" name="m_${i}" checked aria-label="Gravar esta medida"></td><td>${esc(p.x.descricao || '')}<div class="s muted">${esc(p.x.codigo || '')} · falta ${fmtQ(faltaDe(p.x))} de ${fmtQ(+p.x.qtdePedida || 0)}</div></td><td class="mono">${p.pc.L} x ${p.pc.A}</td><td class="mono">${fmtQ(p.pc.q)}${p.pc.q > (+p.x.qtdePedida || 0) ? ' <span style="color:var(--warn)" title="O arquivo traz mais peças com esta medida do que o item pede">≠</span>' : ''}</td><td class="s">${esc(p.pc.ref || '')}</td></tr>`).join('');
    modal('Medidas dos vidros', `<div class="full s muted">Li ${pecas.length} peça(s) em ${esc(file.name)}. Confira e desmarque o que não estiver certo. A medida é proposta na ordem do arquivo, pelo tipo do vidro e pela quantidade.</div>
      <div class="full tablewrap" style="max-height:52vh;overflow:auto"><table><thead><tr><th></th><th>Item do pedido</th><th>Largura x altura (mm)</th><th>Qtd. no arquivo</th><th>Posição</th></tr></thead><tbody>${linhas || '<tr><td colspan="5">Nenhuma peça combinou com os itens.</td></tr>'}</tbody></table></div>
      ${P.semMedida.length ? `<div class="full s" style="color:var(--warn)">${P.semMedida.length} item(ns) continuam sem medida (o arquivo não tem peças para eles).</div>` : ''}
      ${P.sobra.length ? `<div class="full s" style="color:var(--warn)">${P.sobra.length} peça(s) do arquivo sobraram: ${esc(P.sobra.slice(0, 6).map(p => p.L + 'x' + p.A + (p.ref ? ' ' + p.ref : '')).join('; '))}${P.sobra.length > 6 ? '…' : ''}</div>` : ''}`,
      { submit: 'Gravar medidas', onSubmit: async f => {
        let n = 0;
        for (let i = 0; i < P.pares.length; i++) {
          if (!f.elements['m_' + i] || !f.elements['m_' + i].checked) continue;
          const { x, pc } = P.pares[i], obs = [x.obs, pc.ref && refKey(x.obs) !== refKey(pc.ref) && !(x.obs || '').includes(pc.ref) ? pc.ref : ''].filter(Boolean).join(' · ');
          await put('painel_pedidos', Object.assign({}, x, { larguraMm: String(pc.L), alturaMm: String(pc.A), obs, medidaDe: file.name, medidaEm: Date.now() }), true); n++;
        }
        toast(n ? `${n} medida(s) gravada(s). A leitura do romaneio agora casa peça por peça.` : 'Nenhuma medida marcada');
      } });
  }
  SX.medidas = { pecasDoArquivo, proporMedidas, medidasNoGrupo };
  /* v0.16 (F3): arrastar o romaneio (PDF) ou o XML direto em cima do card do pedido */
  function arrastarNoCard() {
    const W = recWin(); if (!W || !podeReceber()) return; const d = W.document; if (!d.body || d.body.dataset.pyDrop) return;
    d.body.dataset.pyDrop = '1';
    const st = d.createElement('style'); st.textContent = '[data-pedidoabrir].py-drop{outline:3px dashed #E8590C!important;outline-offset:3px;transform:scale(1.01)}'; d.head.appendChild(st);
    const cardDe = ev => ev.target && ev.target.closest ? ev.target.closest('[data-pedidoabrir]') : null;
    const temArq = ev => ev.dataTransfer && [...(ev.dataTransfer.types || [])].includes('Files');
    const limpa = () => d.querySelectorAll('.py-drop').forEach(x => x.classList.remove('py-drop'));
    d.addEventListener('dragover', ev => { if (!temArq(ev)) return; ev.preventDefault(); const c = cardDe(ev); limpa(); if (c) { c.classList.add('py-drop'); ev.dataTransfer.dropEffect = 'copy'; } else ev.dataTransfer.dropEffect = 'none'; });
    d.addEventListener('dragleave', ev => { if (!ev.relatedTarget) limpa(); });
    d.addEventListener('drop', ev => {
      if (!temArq(ev)) return; ev.preventDefault(); const c = cardDe(ev); limpa(); if (!c) return;
      const fl = ev.dataTransfer.files && ev.dataTransfer.files[0]; if (!fl) return;
      let ids = []; try { ids = W.itensDoGrupo(c.dataset.pedidoabrir).map(p => p.id); } catch (e) {}
      if (!ids.length) { toast('Não achei os itens deste card'); return; }
      receberNoGrupo(fl, ids);
    });
  }
  setInterval(() => { try { arrastarNoCard(); } catch (e) {} }, 1500);
  SX.receberNoGrupo = receberNoGrupo;
  setInterval(() => { try { botoesNoCard(); } catch (e) {} }, 1500);
  SX.excluirGrupoRec = () => { const W = recWin(), g = W && grupoAberto(W); return g ? excluirGrupo(W, g) : null; };

  /* ================= estilos ================= */
  const st = document.createElement('style');
  st.textContent = `.brand-m{display:inline-flex;flex-direction:column;align-items:center;gap:2px;flex:none}.brand-v{font:600 9.5px/1 var(--f-mono,monospace);color:var(--muted);font-style:normal;letter-spacing:.02em;cursor:pointer;background:none;border:0;padding:2px 4px;border-radius:6px}.brand-v:hover{color:var(--accent);background:var(--surface2)}
  .nov{display:flex;flex-direction:column;gap:14px}.nov-h{display:flex;gap:10px;align-items:center;margin-bottom:4px}.nov ul{margin:0;padding-left:18px;line-height:1.5}.nov-v+.nov-v{border-top:1px solid var(--line);padding-top:12px}
  .conf-ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
  .conf-box{background:var(--surface);color:var(--fg);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:20px 22px;max-width:520px;width:100%}.conf-box.wide{max-width:980px}.conf-box h2{margin:0 0 8px;font-size:19px}.conf-box p{margin:6px 0}.conf-box .ok{color:var(--ok)}
  .conf-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
  .rec-fab{position:fixed;right:22px;bottom:22px;z-index:40;display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:999px;background:var(--accent);color:#fff;font-weight:600;font-size:13.5px;box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;border:2px dashed transparent}
  .rec-fab.drop-on,.sheet.drop-on{border:2px dashed var(--accent);outline:3px solid color-mix(in srgb,var(--accent) 25%,transparent)}
  @media(max-width:760px){.rec-fab{bottom:84px;right:14px}.rec-fab span{display:none}}`;
  document.head.appendChild(st);

  FB.ready.then(() => {
    setTimeout(() => { try { fab(); } catch (e) {} }, 500);
    if (FB.setor === 'admin' && VER) {
      const visto = LS.get('pyro_fb_ver_visto');
      if (visto !== VER) setTimeout(() => { if (!document.getElementById('modal').classList.contains('open')) abrirNovidades(visto); }, 1800);
    }
  });
})();
