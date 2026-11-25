// Utilitários compartilhados por todas as telas
const $ = id => document.getElementById(id);

// Chamada à API. 401 volta para o login (a menos que semRedirect seja true).
async function api(url, opcoes = {}) {
  const { semRedirect, ...resto } = opcoes;
  const r = await fetch(url, { credentials: "same-origin", ...resto });
  if (r.status === 401 && !semRedirect) {
    window.location.replace("/login-cadastro.html");
    throw new Error("sessao");
  }
  let corpo = null;
  try { corpo = await r.json(); } catch (_) {}
  return { ok: r.ok, status: r.status, corpo };
}

const post = (url, dados, extra) => api(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(dados),
  ...extra
});

function aviso(el, texto, tipo) {
  el.textContent = texto;
  el.className = "status" + (tipo ? " " + tipo : "");
}
