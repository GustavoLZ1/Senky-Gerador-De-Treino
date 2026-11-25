// Visual de cada objetivo (nome, texto, cor e ícone). Séries, repetições e descanso vêm do banco.
const OBJETIVOS = {
  hipertrofia: {
    nome: "Hipertrofia",
    desc: "Ganho de massa muscular, com foco em força e volume de treino.",
    cor: "#3d7bff", rgb: "61,123,255",
    icone: "M6 20v8M12 15v18M36 15v18M42 20v8M12 24h24"
  },
  emagrecimento: {
    nome: "Emagrecimento",
    desc: "Queima de gordura com treinos de intensidade alta e gasto calórico elevado.",
    cor: "#ff3d8b", rgb: "255,61,139",
    icone: "M24 6c2 7 11 12 11 22a11 11 0 0 1-22 0c0-5 3-8 5-11 1 3 2 4 4 5 1-5 0-10 2-16z"
  },
  resistencia: {
    nome: "Resistência e condicionamento físico",
    desc: "Mais fôlego, energia e desempenho para o dia a dia e para o esporte.",
    cor: "#22e1ff", rgb: "34,225,255",
    icone: "M4 26h9l4-10 6 20 5-16 3 6h13"
  }
};

// Esquema novo, criado no banco sem visual definido aqui, usa um visual padrão
function infoObjetivo(chave) {
  return OBJETIVOS[chave] || {
    nome: chave.charAt(0).toUpperCase() + chave.slice(1),
    desc: "", cor: "#22e1ff", rgb: "34,225,255",
    icone: "M4 26h9l4-10 6 20 5-16 3 6h13"
  };
}

function aplicarAccent(info) {
  const raiz = document.documentElement.style;
  raiz.setProperty("--accent", info.cor);
  raiz.setProperty("--accent-rgb", info.rgb);
}
