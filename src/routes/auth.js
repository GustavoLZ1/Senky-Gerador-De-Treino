const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { sql, getPool } = require("../db");
const { apiLogado, ehAdmin } = require("../middleware/auth");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Usado para gastar o mesmo tempo quando o e-mail não existe (não revela quais e-mails têm conta)
const HASH_FALSO = bcrypt.hashSync("senky-hash-falso", 12);

const limitar = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos." }
});

// Mesmo formato já usado na tabela: (34) 99999-9999
function formatarTelefone(digitos) {
  return digitos.length === 11
    ? `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
    : `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
}

// Cria uma sessão nova (evita reaproveitar sessão antiga) e guarda o aluno nela
const iniciarSessao = (req, cliente) => new Promise((ok, falha) => {
  req.session.regenerate(err => {
    if (err) return falha(err);
    req.session.user = { id: cliente.ID, nome: cliente.NOME, email: cliente.EMAIL };
    req.session.save(e => (e ? falha(e) : ok()));
  });
});

router.post("/cadastro", limitar, async (req, res) => {
  const b = req.body || {};
  const nome = String(b.nome ?? "").trim().replace(/\s+/g, " ");
  const email = String(b.email ?? "").trim().toLowerCase();
  const digitos = String(b.telefone ?? "").replace(/\D/g, "");
  const senha = String(b.senha ?? "");
  const confirmacao = String(b.confirmacao ?? "");

  if (nome.length < 3 || nome.length > 100) return res.status(400).json({ erro: "Informe seu nome completo (3 a 100 caracteres)." });
  if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ erro: "Informe um e-mail válido." });
  if (digitos.length < 10 || digitos.length > 11) return res.status(400).json({ erro: "Informe o telefone com DDD." });
  if (senha.length < 8) return res.status(400).json({ erro: "A senha precisa ter ao menos 8 caracteres." });
  if (Buffer.byteLength(senha) > 72) return res.status(400).json({ erro: "A senha pode ter no máximo 72 caracteres." });
  if (senha !== confirmacao) return res.status(400).json({ erro: "A confirmação não confere com a senha." });

  const pool = await getPool();
  const existe = await pool.request().input("e", sql.VarChar(100), email)
    .query("SELECT 1 AS ok FROM dbo.clientes WHERE EMAIL = @e");
  if (existe.recordset.length) return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });

  const hash = await bcrypt.hash(senha, 12);
  let novo;
  try {
    const r = await pool.request()
      .input("n", sql.VarChar(100), nome)
      .input("e", sql.VarChar(100), email)
      .input("t", sql.VarChar(20), formatarTelefone(digitos))
      .input("s", sql.VarChar(100), hash)
      .query(`INSERT INTO dbo.clientes (NOME, EMAIL, TELEFONE, SENHA)
              OUTPUT INSERTED.ID AS ID, INSERTED.NOME AS NOME, INSERTED.EMAIL AS EMAIL
              VALUES (@n, @e, @t, @s)`);
    novo = r.recordset[0];
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({ erro: "Já existe uma conta com esse e-mail." });
    }
    throw err;
  }

  await iniciarSessao(req, novo);
  res.status(201).json({ ok: true });
});

router.post("/login", limitar, async (req, res) => {
  const b = req.body || {};
  const email = String(b.email ?? "").trim().toLowerCase();
  const senha = String(b.senha ?? "");
  if (!email || !senha) return res.status(400).json({ erro: "Informe e-mail e senha." });

  const pool = await getPool();
  const r = await pool.request().input("e", sql.VarChar(100), email)
    .query("SELECT TOP 1 ID, NOME, EMAIL, SENHA FROM dbo.clientes WHERE EMAIL = @e");
  const cliente = r.recordset[0];

  const confere = await bcrypt.compare(senha, cliente ? cliente.SENHA : HASH_FALSO);
  if (!cliente || !confere) return res.status(401).json({ erro: "E-mail ou senha incorretos." });

  await iniciarSessao(req, cliente);
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("senky.sid");
    res.json({ ok: true });
  });
});

router.get("/me", apiLogado, async (req, res) => {
  const { nome, email } = req.session.user;
  res.json({ nome, email, admin: await ehAdmin(req) });
});

module.exports = router;
