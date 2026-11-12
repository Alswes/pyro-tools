/* ============================================================
   CONFIGURAÇÃO DO PYRO TOOLS

   1) MODO DEMONSTRAÇÃO (padrão deste repositório)
      Com PYRO_DEMO = true o Pyro abre direto, sem login e sem Firebase,
      com dados FICTÍCIOS guardados só no navegador de quem está vendo.
      Nada é enviado para servidor nenhum.

   2) USO REAL (Firebase)
      Troque PYRO_DEMO para false e preencha FIREBASE_CONFIG com os dados do
      SEU projeto (Console do Firebase > Configurações do projeto > Seus apps > app Web).
      Esses dados só identificam o projeto; quem protege os dados é o firestore.rules.
   ============================================================ */
window.PYRO_DEMO = true;

window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.firebasestorage.app",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

/* E-mail do administrador (o mesmo que está em firestore.rules). */
window.PYRO_ADMIN_EMAIL = "admin@exemplo.com";
