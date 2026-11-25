const express = require("express");
const rateLimit = require("express-rate-limit");
const { sql, getPool } = require("../db");
const { apiLogado, exigirAdmin } = require("../middleware/auth");
const { CHAVE, inParams } = require("../util");

const router = express.Router();

const limitarCadastro = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde alguns minutos." }
});

// Cadastro de exercício (só administrador)
router.post("/exercicios", apiLogado, exigirAdmin, limitarCadastro, async (req, res) => {
  const b = req.body || {};
  const nome = String(b.nome ?? "").trim().replace(/\s+/g, " ");
  const grupamento = String(b.grupamento ?? "").trim();
  const musculoId = b.musculoId == null || b.musculoId === "" ? null : Number(b.musculoId);
  const esquemas = [...new Set((Array.isArray(b.esquemas) ? b.esquemas : []).map(e => String(e).trim()))];

  if (nome.length < 3 || nome.length > 100) {
    return res.status(400).json({ erro: "Informe um nome com 3 a 100 caracteres." });
  }
  if (!CHAVE.test(grupamento)) return res.status(400).json({ erro: "Escolha o grupamento." });
  if (musculoId !== null && !(Number.isInteger(musculoId) && musculoId > 0)) {
    return res.status(400).json({ erro: "Músculo inválido." });
  }
  if (!esquemas.length || esquemas.length > 10 || !esquemas.every(e => CHAVE.test(e))) {
    return res.status(400).json({ erro: "Selecione ao menos um esquema." });
  }

  const pool = await getPool();

  const g = await pool.request().input("c", sql.VarChar(30), grupamento)
    .query("SELECT ID FROM dbo.grupamentos WHERE CHAVE = @c");
  if (!g.recordset.length) return res.status(400).json({ erro: "Grupamento inválido." });
  const grupoId = g.recordset[0].ID;

  if (musculoId !== null) {
    const m = await pool.request().input("m", sql.Int, musculoId).input("g", sql.Int, grupoId)
      .query("SELECT 1 AS ok FROM dbo.musculos WHERE ID = @m AND GRUPAMENTO_ID = @g");
    if (!m.recordset.length) {
      return res.status(400).json({ erro: "Esse músculo não pertence ao grupamento escolhido." });
    }
  }

  const rqE = pool.request();
  const inE = inParams(rqE, "e", esquemas, sql.VarChar(50));
  const es = await rqE.query(`SELECT ID FROM dbo.esquemas WHERE OBJETIVO IN (${inE})`);
  if (es.recordset.length !== esquemas.length) {
    return res.status(400).json({ erro: "Esquema inválido." });
  }

  const dup = await pool.request().input("g", sql.Int, grupoId).input("n", sql.NVarChar(100), nome)
    .query("SELECT 1 AS ok FROM dbo.exercicios WHERE GRUPAMENTO_ID = @g AND NOME = @n");
  if (dup.recordset.length) {
    return res.status(409).json({ erro: "Já existe um exercício com esse nome neste grupamento." });
  }

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const o = await new sql.Request(tx).input("g", sql.Int, grupoId).query(
      `SELECT ISNULL(MAX(ORDEM), 0) + 1 AS prox
       FROM dbo.exercicios WITH (UPDLOCK, HOLDLOCK) WHERE GRUPAMENTO_ID = @g`);
    const ins = await new sql.Request(tx)
      .input("g", sql.Int, grupoId)
      .input("n", sql.NVarChar(100), nome)
      .input("o", sql.Int, o.recordset[0].prox)
      .input("m", sql.Int, musculoId)
      .query(`INSERT INTO dbo.exercicios (GRUPAMENTO_ID, NOME, ORDEM, ATIVO, MUSCULO_ID)
              OUTPUT INSERTED.ID AS id
              VALUES (@g, @n, @o, 1, @m)`);
    const id = ins.recordset[0].id;

    for (const e of es.recordset) {
      await new sql.Request(tx).input("ex", sql.Int, id).input("es", sql.Int, e.ID)
        .query("INSERT INTO dbo.exercicio_esquema (EXERCICIO_ID, ESQUEMA_ID) VALUES (@ex, @es)");
    }

    await tx.commit();
    res.status(201).json({ id, mensagem: "Exercício cadastrado." });
  } catch (err) {
    try { await tx.rollback(); } catch (_) {}
    throw err;
  }
});

module.exports = router;
