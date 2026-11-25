const abas = {
  entrar: { aba: $("aba-entrar"), form: $("form-entrar") },
  criar:  { aba: $("aba-criar"),  form: $("form-criar") }
};

function mostrarAba(nome) {
  Object.entries(abas).forEach(([chave, a]) => {
    const ativa = chave === nome;
    a.aba.setAttribute("aria-selected", String(ativa));
    a.aba.tabIndex = ativa ? 0 : -1;
    a.form.hidden = !ativa;
  });
}
$("aba-entrar").addEventListener("click", () => mostrarAba("entrar"));
$("aba-criar").addEventListener("click", () => mostrarAba("criar"));
document.querySelector(".abas").addEventListener("keydown", e => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const alvo = e.key === "ArrowRight" ? "criar" : "entrar";
  mostrarAba(alvo);
  abas[alvo].aba.focus();
});

// Máscara (34) 99999-9999 enquanto digita
function mascara(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (!d) return "";
  if (d.length <= 2) return "(" + d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
$("c-tel").addEventListener("input", e => { e.target.value = mascara(e.target.value); });

async function enviar(form, status, url, dados, aguarde) {
  const botao = form.querySelector("button[type=submit]");
  botao.disabled = true;
  aviso(status, aguarde);
  try {
    const r = await post(url, dados, { semRedirect: true });
    if (r.ok) { window.location.replace("/objetivo.html"); return; }
    aviso(status, (r.corpo && r.corpo.erro) || "Não foi possível concluir. Tente novamente.", "erro");
  } catch (_) {
    aviso(status, "Sem conexão com o servidor. Tente novamente.", "erro");
  }
  botao.disabled = false;
}

$("form-entrar").addEventListener("submit", e => {
  e.preventDefault();
  const status = $("status-entrar");
  const email = $("e-email").value.trim();
  const senha = $("e-senha").value;
  if (!email || !senha) return aviso(status, "Informe e-mail e senha.", "erro");
  enviar(e.target, status, "/api/login", { email, senha }, "Entrando…");
});

$("form-criar").addEventListener("submit", e => {
  e.preventDefault();
  const status = $("status-criar");
  const dados = {
    nome: $("c-nome").value.trim(),
    email: $("c-email").value.trim(),
    telefone: $("c-tel").value,
    senha: $("c-senha").value,
    confirmacao: $("c-conf").value
  };
  if (dados.nome.length < 3) return aviso(status, "Informe seu nome completo.", "erro");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return aviso(status, "Informe um e-mail válido.", "erro");
  const digitos = dados.telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 11) return aviso(status, "Informe o telefone com DDD.", "erro");
  if (dados.senha.length < 8) return aviso(status, "A senha precisa ter ao menos 8 caracteres.", "erro");
  if (dados.senha !== dados.confirmacao) return aviso(status, "A confirmação não confere com a senha.", "erro");
  enviar(e.target, status, "/api/cadastro", dados, "Criando sua conta…");
});
