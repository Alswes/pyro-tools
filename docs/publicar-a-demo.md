# Publicar a demonstração (Google Cloud Shell)

A demonstração roda em modo fictício (`PYRO_DEMO = true`), então só precisa do **Hosting**. Não precisa de banco nem de login.

> ⚠️ **Use um projeto Firebase NOVO, só para a demonstração.**
> Nunca publique esta pasta no projeto usado pela empresa: o site de verdade seria trocado pela demonstração.
> Por segurança, o `.firebaserc` vem com `SEU-PROJETO` e o `conferir.sh` bloqueia a publicação enquanto ele não for trocado.

## 1. Criar o projeto de demonstração (uma vez)

1. Acesse **console.firebase.google.com** e clique em **Criar projeto**.
2. Dê um nome diferente do projeto real, por exemplo `pyro-tools-demo`. Pode desligar o Google Analytics.
3. Anote o **ID do projeto** (aparece embaixo do nome, algo como `pyro-tools-demo-1a2b3`).

## 2. Enviar a pasta para o Cloud Shell

1. Abra **shell.cloud.google.com**.
2. No menu de três pontos, clique em **Fazer upload** e envie o arquivo `pyro-tools-portfolio.zip`.
3. Descompacte em uma pasta **nova**, separada da pasta do Pyro real:

```bash
cd ~
unzip -o pyro-tools-portfolio.zip -d ~/pyro-portfolio
cd ~/pyro-portfolio/pyro-tools
```

## 3. Apontar para o projeto de demonstração

Troque `SEU-ID-DO-PROJETO` pelo ID anotado no passo 1:

```bash
echo '{ "projects": { "default": "SEU-ID-DO-PROJETO" } }' > .firebaserc
cat .firebaserc
```

Confira se o ID que apareceu é o do projeto de **demonstração**.

## 4. Conferir e publicar

```bash
firebase login --no-localhost     # só na primeira vez
bash conferir.sh                  # confere o pacote; não publica nada
firebase deploy --only hosting    # publica só o site (sem banco e sem regras)
```

No fim aparece o endereço, algo como `https://pyro-tools-demo-1a2b3.web.app`. Esse é o link da demonstração: coloque no README (linha **Demo online**) e no LinkedIn.

## 5. Conferir no ar

1. Abra o link em uma janela anônima.
2. Deve abrir direto, sem pedir login, com a faixa **Demonstração** embaixo.
3. Troque o setor em **Ver como** e confira se as páginas mudam.

## Atualizar a demonstração depois

Envie o zip novo, descompacte por cima e repita o passo 4:

```bash
cd ~
unzip -o pyro-tools-portfolio.zip -d ~/pyro-portfolio
cd ~/pyro-portfolio/pyro-tools
cat .firebaserc                   # o unzip volta para SEU-PROJETO: refaça o passo 3
bash conferir.sh && firebase deploy --only hosting
```
