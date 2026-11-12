# Histórico de versões · Pyro Tools

O projeto usa versionamento semântico (vMAIOR.MENOR.CORREÇÃO). Cada versão publicada entra aqui.
As mesmas novidades aparecem dentro do sistema, em **Novidades do Pyro**.

## Versão de portfólio (baseada na v0.16.1)

- Modo demonstração (`public/demo-local.js`): abre sem login e sem Firebase, com dados fictícios guardados só no navegador.
- Seletor **Ver como**, para mostrar o que cada setor enxerga, e botão **Reiniciar**.
- Retirados o nome, o logotipo, as obras, os fornecedores e a configuração do ambiente real.

## v0.16.1

- Filtro por mês nos Indicadores de compras e no Painel da obra.

## v0.16.0

- Fornecedores: Procurar duplicados (juntar), Buscar dados pelo CNPJ, Inativar.
- Fases (lote) editáveis em Configurações > Obras.
- Lixeira de 30 dias com Restaurar (Configurações e Auditoria).
- Resumo do dia em Relatórios (copiar ou abrir no e-mail).
- Arrastar romaneio ou XML em cima do card do pedido.
- Backup semanal com lembrete (ou automático).
- `bash publicar.sh`: confere o pacote e publica. `bash conferir.sh`: só confere.

## v0.15.2

- Excluir fornecedor (dentro do Editar fornecedor, só o administrador). Com uso, pede o fornecedor que fica no lugar.
- Fase (lote): opção Interno.

## v0.15.1

- Celular e tablet: sem barra lateral fixa; o menu abre pelo ☰ no topo (por cima da página) e fecha ao tocar num item ou fora.

## v0.15.0

- Pyro como aplicativo (Instalar app no menu).
- Menu com favoritos (estrela) e grupos que recolhem.
- 📐 Medidas dos vidros no Editar pedido (romaneio PDF ou relatório Excel/CSV), com conferência antes de gravar.
- Regras do banco: cancelar/reativar pedido só por quem pode cancelar; motivo obrigatório no servidor. O administrador precisa entrar primeiro depois do deploy (atualiza a lista de quem pode cancelar).

## v0.14.2

- Menu lateral sempre visível no celular e no tablet (coluna de ícones; ☰ abre com os nomes). No computador, recolhe e abre (fica salvo).
- Saiu o botão flutuante Receber por arquivo (está no Editar pedido e no Registrar chegada).
- Chat no menu do celular.
- Correção: itens de pedido cancelado por setor sem gravação no Recebimento agora saem do Recebimento.

## v0.14.1

- Ler romaneio ou XML: vidros com código genérico (COMUM-LA…) e sem medida cadastrada são lidos pelo tipo do vidro (laminado 3+3, 4+4, temperado 8mm…).
- Nota em m² marca as peças daquele vidro como chegadas e avisa para conferir.
- Quando nada bate, o Pyro mostra o que o arquivo trouxe e o que falta no pedido.

## v0.14

- **Cancelar pedido** (Obras > obra > Pedidos de compra): botão ✕ ao lado do lápis nos pedidos em cotação, análise, aprovação ou comprados. O motivo é obrigatório. O pedido continua na lista da obra, apagado, com a etiqueta **Cancelado** e o 👁 para ver quem cancelou, quando e por quê (filtro Status > Cancelado mostra só eles). Os itens saem de Pedidos e Recebimento e o valor sai do budget. O administrador pode **reativar** pelo 👁. Tudo fica na Auditoria.

## v0.13.2

- **Romaneio de vidros**: leitura pela medida (LARGURA x ALTURA, em qualquer ordem) de cada linha, sem exigir o nome do produto na mesma linha. Avisa as medidas que não estão no pedido e quando a OP citada no romaneio é diferente da do pedido encontrado.

## v0.13.1 (correções do QA)

- **Segurança**: textos com código escondido (ex.: descrição de item, nome de fornecedor ou planilha importada com `<img onerror=…>`) não executam mais nada (arquivo `sanitiza.js`, também dentro do Pedidos e Recebimento e do Roteiro).
- **Chat**: anexo só abre na aba quando é imagem ou PDF de verdade; qualquer outro tipo é baixado. As regras do banco exigem que nome e setor gravados no chat, na auditoria e no online sejam os do cadastro.
- **Chat**: na primeira vez, o histórico antigo não conta como mensagem não lida.
- **Celular**: menu de baixo com itens de largura mínima e rolagem lateral; abas das Entregas sem corte.

## v0.13

- **Tema Noturno** (Configurações > Aparência): preto e amarelo no Pyro, no Roteiro de entregas e no Pedidos e Recebimento. O mascote Pyro ganha máscara, capa e a chama no peito.
- **Enxame de morcegos** no lugar do fogo quando o tema Noturno está ligado: ao clicar em botões aparece uma revoada; ao concluir uma entrega ou coleta, os morcegos cobrem o card, consomem e levam para Finalizados. Nos outros temas continua o fogo.

## v0.12.1

- **Campo Tipo** (tipo de material: Ferragem, Vedação, Perfil, Vidro…) em Pedidos e Recebimento: no Novo item, na edição do item e na janela de detalhes, com sugestões dos tipos já usados. É puxado da coluna **TIPO** das planilhas (Controle Recebimento e Lista de Pedido de Compra) e, num item novo de um pedido que já existe, dos outros itens do mesmo pedido. Aparece ao lado da descrição e vai para o Excel.

## v0.12

- **Editar pedido** (card em Pedidos e Recebimento): botão **Receber por arquivo** (romaneio PDF ou XML deste pedido abre o Registrar chegada já preenchido, com a conferência) e botão **Excluir pedido** (apaga os itens do card; se o pedido do Pyro for só desses itens, apaga também o pedido e a entrega e solta as notas fiscais). Pede confirmação e tem Desfazer; tudo fica na Auditoria.
- **Chat**: som quando chega mensagem (🔔 no topo do chat liga e desliga) e anexos: clipe para arquivo ou imagem, Ctrl+V para colar um print ou arrastar para a conversa. Imagens aparecem na conversa (reduzidas automaticamente); outros arquivos até 8 MB, clique para abrir ou baixar.

## v0.11.1

- Conexão ao vivo também em redes de empresa (proxy ou antivírus que seguram a conexão): o Firestore detecta e troca sozinho de modo. Chat com botão ↻ e busca das mensagens ao abrir; o texto não se perde enquanto digita.

## v0.11

- **Auditoria** (menu Setores > Auditoria, só o administrador): terminal estilo Git com cada alteração feita no Pyro (quem, quando, em qual página, o antes e o depois de cada campo), os logins (navegador e sistema) e o botão **[desfazer]**. Filtros por pessoa, ação, lugar, dia e busca. Gravações automáticas do próprio Pyro ficam escondidas (botão *Mostrar automáticas*). Ninguém consegue alterar nem apagar a auditoria, nem o administrador.
- **Alertas** (últimos 7 dias, com aviso na Home do administrador): exclusões; mais de 30 alterações em 10 minutos; login antes das 6h, depois das 21h ou no fim de semana; valor, budget ou cancelamento alterados.
- **Chat**: botão redondo no canto de baixo. Sala *Geral* para todos e conversa direta, com a bolinha verde de quem está online, mensagens não lidas e aviso de mensagem nova. Mensagem direta só é lida por quem mandou e quem recebeu.

## v0.10

- **Avaliação de fornecedores** (Compras, Diretoria e administrador): IQF de 0 a 100 como na avaliação de fornecedores da ISO 9001: prazo combinado (40%), entregas sem não conformidade (30%), pedido completo numa entrega só (15%) e faturado igual ao aprovado (15%). Classe **A** (≥ 85, aprovado), **B** (70 a 84, com ressalvas) e **C** (< 70, plano de ação).
- Gráficos: ranking do IQF, entregas por mês no prazo e atrasadas, peças com não conformidade por motivo. Filtros por período, obra e categoria; Excel e impressão.
- Em cada fornecedor: entregas com o motivo de ter precisado de mais de uma (chegada parcial, reprogramação, não conformidade), não conformidades e **resumo automático** com pontos positivos, negativos e recomendação (botão *Copiar resumo*).

## v0.9.1

- **Pedidos do ERP**: fornecedor pelo nome fantasia (cadastro do Pyro, coluna "Nome fantasia" da planilha, se houver, ou a razão social encurtada), com a razão social embaixo. O administrador corrige no lápis ao lado do nome.

## v0.9

- **Receber por arquivo**: botão laranja em Pedidos e Recebimento e em Entregas (para quem registra chegada). Arraste o romaneio em PDF ou o XML da nota: o Pyro acha o pedido (pelo código dos itens, fornecedor e nº do pedido) e abre o Registrar chegada já preenchido. Dentro do Registrar chegada também há o botão *Ler romaneio ou XML* e dá para arrastar o arquivo na janela. O arquivo fica como anexo da chegada.
- **Conferência antes de salvar**: o Pyro pergunta se chegou tudo e se foi conferido. *Sim* registra quem conferiu. *Não* abre a lista dos itens para marcar quantidade e motivo (riscado, trocado, quebrado, não veio o físico, quantidade a menos ou a mais, medida errada). As peças com problema não são abatidas e cada divergência vira não conformidade (Ocorrências da obra) e pendência para Compras.
- **Versão debaixo do mascote**; ao entrar depois de um deploy, o administrador vê as novidades.
- PDF escaneado (foto) não tem texto: use o XML ou a planilha.

## v0.8

- **Aprovações da Diretoria** (página nova, já liberada para a Diretoria): em Cotações, Compras escolhe *Enviar para aprovação da Diretoria*. A Diretoria vê o aviso na Home e no Painel, compara as opções (menor preço, % acima), marca a que vale e **aprova** (o pedido vira Comprado com fornecedor, valor e prazo) ou **reprova** com motivo (volta para Compras). Uso e consumo só vira compra depois da aprovação da Diretoria. Quando a obra não está liberada para a Diretoria, Compras aplica a aprovação no pedido automaticamente ao abrir o Pyro.
- **XML da NF-e**: ao importar o XML (Notas Fiscais > arrastar os arquivos), o Pyro guarda os itens da nota (código, descrição, quantidade, valor) e o nº do pedido (xPed). Usa isso para sugerir o pedido. Na nota aberta, *Itens da nota (XML)* confere item a item com o pedido.
- **Ligar nota ao pedido**: aviso em Notas Fiscais com as notas sem pedido e botão *Ligar ao pedido* (sugestão pelo nº do ERP, nº do pedido na nota, itens do XML ou valor; dá para ligar todas as sugeridas). Também na Conferência com a planilha, em *Notas sem pedido ligado*.
- **Relatório diário**: sem repetir o PC e a categoria ("Perfis - SC01 · LINHA SLIM", "PC05 · 11 itens"), resumo da obra no topo (em andamento, atrasados, chegam em 7 dias, previsão a confirmar, em cotação), *previsão a confirmar com o fornecedor* no lugar de "sem previsão" e ATRASADO em negrito. Novo quadro *Comprados sem previsão de entrega* para informar a data direto no Relatórios. O relatório semanal ganhou a seção *Comprados sem previsão de entrega*.

## v0.7

- **Tema Alumínio** como padrão para todos. Qualquer pessoa troca o tema em **Configurações > Aparência** (o ícone de engrenagem agora aparece para todos, só com Aparência e Versão).
- **Indicadores da Home** (obras liberadas) também para Compras.
- **Consumo do budget como na planilha de controle**: conta os pedidos aprovados (comprado e recebido). Quando o budget da obra é só a soma de perfis + vidros + acessórios, os serviços ficam fora da conta.
- **Conferir com a planilha** (botão na página da obra): sobe a CONTROLE DE PEDIDOS e o Pyro compara categoria por categoria (budget, consumido e %), lista o que está na planilha e não no Pyro, valores e categorias diferentes, notas sem pedido e o que está no Pyro e não na planilha. O administrador pode lançar o que falta e usar o budget da planilha.
- **Hoje do setor**: Compras edita (assume e conclui pendências).
- **Cotações**: botão **Enviar por e-mail** para a Diretoria ou para a obra, com modelo de texto padrão que cada um pode editar.
- **Pedidos do ERP**: Compras consulta (só o administrador importa e anota).

## v0.6

- **Entregas e Coletas** agora tem duas abas: *Pedidos em entrega e coleta* e *Roteiro semanal* (o roteiro da Logística dentro do Pyro). No roteiro, finalizados têm o botão de olho para ver os detalhes sem reabrir.
- **Todos os setores** consultam Pedidos e Recebimento.
- **Registrar chegada**: coluna *Do estoque* para itens que saíram do estoque do almoxarifado (entram sem nota fiscal).
- **Compras**: só consulta (Home, Obras, Pedidos e Recebimento, Notas, Relatórios…) e ganha **Cotações** (3 ou mais por pedido, com preço, prazo e faturamento; ao aprovar, o pedido vira Comprado com fornecedor, valor e previsão) e **Indicadores de compras** (mês e ano, obras e uso e consumo).
- **Notas fiscais**: campo *Pedido do ERP* e filtros por item, pedido (PC/OP/ERP) e mês.
- **Pedidos do ERP** (só administrador): importa a planilha do ERP (de outubro em diante) e liga cada pedido às notas.
- **Diretoria**: indicadores das obras liberadas no topo da Home.
- Sem o pop-up "resumo do dia" ao abrir.

## v0.5

- **Roteiro de entregas e coletas** (o painel da Logística que estava no Claude) agora fica no mesmo site: **/entregas.html**, com o mesmo login. No Pyro aparece no menu como **Roteiro de entregas**.
- Quem vê: Compras e Recebimento / Logística editam; Obras e Diretoria só veem. Muda em **Páginas por setor > Roteiro de entregas (Logística)**.
- **Trazer os dados do Claude (uma vez só):** entre como administrador em entregas.html. Aparece um aviso "Roteiro vazio no Firebase": escolha o arquivo **roteiro-do-claude.json**. Depois disso, a Logística passa a usar só o link do Firebase.
- **Backup do roteiro**: "Fazer backup agora" baixa um backup completo (.json). O botão **Subir backup** (no Início do roteiro e em Configurações > Dados) restaura esse arquivo, mesclando ou substituindo tudo. O arquivo roteiro-do-claude.json também pode ser subido por ali.
- Troca de página mais rápida e dados guardados no navegador (abre mais rápido da segunda vez em diante).

## v0.4

- **Páginas dos setores**, calculadas com os dados reais do Pyro: Hoje do setor, Pendências (com dono e prazo; as automáticas nascem de atrasos, previsões vencidas, divergências e aprovações), Material por obra, Gargalos, Divergências, Fornecedores, Painel da Diretoria e Ocorrências da obra (com foto).
- **Liberar obras**: em **Configurações > Páginas por setor > Obras liberadas para os setores** (ou no botão dentro de cada obra). Compras e o administrador veem todas; os outros setores só recebem do servidor os dados das obras liberadas.
- Excel e Imprimir em todas as páginas novas.
