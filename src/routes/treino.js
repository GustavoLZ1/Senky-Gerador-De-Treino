const express = require("express");
const { sql, getPool } = require("../db");
const { apiLogado } = require("../middleware/auth");
const { CHAVE, lista, inParams } = require("../util");

const router = express.Router();

// Esquemas: objetivo, séries, repetições e descanso
router.get("/esquemas", apiLogado, async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().query(
    "SELECT OBJETIVO AS chave, SERIES AS series, REPETICOES AS reps, DESCANSO AS descanso FROM dbo.esquemas ORDER BY ID");
  res.json(r.recordset);
});

// Grupamentos com os nomes dos músculos de cada um
router.get("/grupamentos", apiLogado, async (req, res) => {
  const pool = await getPool();
  const [g, m] = await Promise.all([
    pool.request().query("SELECT ID, CHAVE, NOME FROM dbo.grupamentos ORDER BY ID"),
    pool.request().query("SELECT GRUPAMENTO_ID, NOME FROM dbo.musculos ORDER BY ID")
  ]);
  res.json(g.recordset.map(x => ({
    chave: x.CHAVE,
    nome: x.NOME,
    musculos: m.recordset.filter(y => y.GRUPAMENTO_ID === x.ID).map(y => y.NOME)
  })));
});

// Músculos dos grupamentos pedidos. Com ?objetivo=..., só os que têm exercício nesse esquema.
router.get("/musculos", apiLogado, async (req, res) => {
  const grupos = lista(req.query.grupos).filter(g => CHAVE.test(g));
  const objetivo = String(req.query.objetivo ?? "").trim();
  if (!grupos.length) return res.status(400).json({ erro: "Informe ao menos um grupamento." });
  if (objetivo && !CHAVE.test(objetivo)) return res.status(400).json({ erro: "Objetivo inválido." });

  const pool = await getPool();
  const rq = pool.request();
  const inG = inParams(rq, "g", grupos, sql.VarChar(30));

  let filtro = "";
  if (objetivo) {
    rq.input("obj", sql.VarChar(50), objetivo);
    filtro = `AND EXISTS (
      SELECT 1 FROM dbo.exercicios e
      JOIN dbo.exercicio_esquema ee ON ee.EXERCICIO_ID = e.ID
      JOIN dbo.esquemas s ON s.ID = ee.ESQUEMA_ID
      WHERE e.MUSCULO_ID = m.ID AND e.ATIVO = 1 AND s.OBJETIVO = @obj)`;
  }

  const r = await rq.query(`
    SELECT m.ID AS id, m.NOME AS nome, g.CHAVE AS grupo
    FROM dbo.musculos m
    JOIN dbo.grupamentos g ON g.ID = m.GRUPAMENTO_ID
    WHERE g.CHAVE IN (${inG}) ${filtro}
    ORDER BY g.ID, m.ID`);
  res.json(r.recordset);
});

// Monta o treino: esquema (séries, repetições, descanso) + grupamentos + músculos.
// Em cada grupamento: se algum músculo dele foi escolhido, filtra por eles; senão traz o grupamento todo.
router.get("/treino", apiLogado, async (req, res) => {
  const objetivo = String(req.query.objetivo ?? "").trim();
  const grupos = lista(req.query.grupos).filter(g => CHAVE.test(g));
  const musculos = lista(req.query.musculos, 60).map(Number).filter(n => Number.isInteger(n) && n > 0);
  if (!CHAVE.test(objetivo) || !grupos.length) {
    return res.status(400).json({ erro: "Informe o objetivo e ao menos um grupamento." });
  }

  const pool = await getPool();
  const esq = await pool.request()
    .input("o", sql.VarChar(50), objetivo)
    .query("SELECT ID, SERIES, REPETICOES, DESCANSO FROM dbo.esquemas WHERE OBJETIVO = @o");
  if (!esq.recordset.length) return res.status(404).json({ erro: "Objetivo não encontrado." });
  const esquema = esq.recordset[0];

  const rq = pool.request().input("esq", sql.Int, esquema.ID);
  const inG = inParams(rq, "g", grupos, sql.VarChar(30));
  let filtroMusculo = "";
  if (musculos.length) {
    const inM = inParams(rq, "m", musculos, sql.Int);
    filtroMusculo = `AND (e.MUSCULO_ID IN (${inM})
      OR NOT EXISTS (SELECT 1 FROM dbo.musculos f
                     WHERE f.GRUPAMENTO_ID = e.GRUPAMENTO_ID AND f.ID IN (${inM})))`;
  }

  const r = await rq.query(`
    SELECT e.ID AS id, e.NOME AS nome, g.CHAVE AS grupo, g.NOME AS grupoNome, mu.NOME AS musculo
    FROM dbo.exercicios e
    JOIN dbo.grupamentos g ON g.ID = e.GRUPAMENTO_ID
    JOIN dbo.exercicio_esquema ee ON ee.EXERCICIO_ID = e.ID AND ee.ESQUEMA_ID = @esq
    LEFT JOIN dbo.musculos mu ON mu.ID = e.MUSCULO_ID
    WHERE e.ATIVO = 1 AND g.CHAVE IN (${inG}) ${filtroMusculo}
    ORDER BY e.ORDEM, e.ID`);

  // Mantém a ordem em que os grupamentos foram escolhidos (a ordenação é estável)
  const exercicios = r.recordset
    .sort((a, b) => grupos.indexOf(a.grupo) - grupos.indexOf(b.grupo))
    .map(x => ({
      id: x.id,
      nome: x.nome,
      grupo: x.grupoNome,
      musculo: x.musculo,
      series: esquema.SERIES,
      reps: esquema.REPETICOES,
      descanso: esquema.DESCANSO
    }));

  res.json({ objetivo, exercicios });
});

module.exports = router;
