require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const { logado, paginaAdmin } = require("./src/middleware/auth");
const authRoutes = require("./src/routes/auth");
const treinoRoutes = require("./src/routes/treino");
const exerciciosRoutes = require("./src/routes/exercicios");

const app = express();
const PORT = process.env.PORT || 3000;
const producao = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  console.error("Defina SESSION_SECRET no arquivo .env (copie o .env.example).");
  process.exit(1);
}

app.disable("x-powered-by");
if (producao) app.set("trust proxy", 1);

app.use(express.json({ limit: "10kb" }));
app.use(session({
  name: "senky.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: producao, maxAge: 1000 * 60 * 60 * 8 }
}));

// Páginas protegidas ficam em /views (fora da pasta pública)
const pagina = (arquivo, ...antes) => [
  ...antes,
  (req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(__dirname, "views", arquivo));
  }
];

app.get("/", (req, res) =>
  res.redirect(req.session.user ? "/objetivo.html" : "/login-cadastro.html"));

// Quem já está logado não precisa ver o login de novo
app.get("/login-cadastro.html", (req, res, next) =>
  req.session.user ? res.redirect("/objetivo.html") : next());

app.get("/objetivo.html", ...pagina("objetivo.html", logado));
app.get("/treino.html", ...pagina("treino.html", logado));
app.get("/exercicios.html", ...pagina("exercicios.html", logado, paginaAdmin));

app.use("/api", authRoutes);
app.use("/api", treinoRoutes);
app.use("/api", exerciciosRoutes);
app.use("/api", (req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.use(express.static(path.join(__dirname, "public")));

// Erros inesperados: registra no terminal e responde sem expor detalhes
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "Requisição inválida." });
  console.error(err);
  if (req.path.startsWith("/api")) return res.status(500).json({ erro: "Erro interno. Tente novamente em instantes." });
  res.status(500).send("Erro interno.");
});

app.listen(PORT, err => {
  if (err) {
    console.error(
      err.code === "EADDRINUSE"
        ? `\nA porta ${PORT} já está em uso. Provavelmente o servidor já está rodando em outro terminal.\nEncerre-o (Ctrl+C nesse terminal) e rode npm start de novo.\n`
        : `\nNão foi possível iniciar o servidor: ${err.message}\n`
    );
    process.exit(1);
  }
  console.log(`SENKY 2.0 rodando em http://localhost:${PORT}`);
});
