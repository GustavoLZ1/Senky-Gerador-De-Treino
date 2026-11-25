const { sql, getPool } = require("../db");

// Páginas: quem não está logado vai para o login
const logado = (req, res, next) =>
  req.session.user ? next() : res.redirect("/login-cadastro.html");

// API: responde 401 em JSON
const apiLogado = (req, res, next) =>
  req.session.user
    ? next()
    : res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });

// Confere no banco se o aluno logado é administrador (clientes.IS_ADMIN)
async function ehAdmin(req) {
  const u = req.session && req.session.user;
  if (!u) return false;
  const pool = await getPool();
  const r = await pool.request()
    .input("id", sql.Int, u.id)
    .query("SELECT TOP 1 IS_ADMIN FROM dbo.clientes WHERE ID = @id");
  return !!(r.recordset[0] && r.recordset[0].IS_ADMIN);
}

const exigirAdmin = async (req, res, next) =>
  (await ehAdmin(req))
    ? next()
    : res.status(403).json({ erro: "Apenas administradores podem cadastrar exercícios." });

const paginaAdmin = async (req, res, next) =>
  (await ehAdmin(req)) ? next() : res.redirect("/objetivo.html");

module.exports = { logado, apiLogado, ehAdmin, exigirAdmin, paginaAdmin };
