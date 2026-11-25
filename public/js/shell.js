// Cabeçalho das telas logadas: botão Sair, nome do aluno e link de administrador
(async () => {
  const sair = $("sair");
  if (sair) {
    sair.addEventListener("click", async () => {
      try { await api("/api/logout", { method: "POST", semRedirect: true }); } catch (_) {}
      window.location.replace("/login-cadastro.html");
    });
  }
  try {
    const r = await api("/api/me");
    if (!r.ok) return;
    const usuario = $("usuario");
    if (usuario) usuario.textContent = String(r.corpo.nome).split(" ")[0];
    const admin = $("admin-link");
    if (admin && r.corpo.admin) admin.hidden = false;
  } catch (_) { /* sem nome no cabeçalho: o resto da tela segue normal */ }
})();
