// Ilustração do corpo (frente e costas) que acende o músculo escolhido e explica onde ele fica.
const SVG_NS = "http://www.w3.org/2000/svg";
const arred = n => Math.round(n * 10) / 10;

// Curva suave (Catmull-Rom) passando por todos os pontos.
// aberta = true: o primeiro e o último ponto ficam na linha central do corpo e a forma fecha em linha reta.
function suave(pts, aberta = false) {
  const n = pts.length;
  const P = i => (aberta ? pts[Math.max(0, Math.min(n - 1, i))] : pts[(i + n) % n]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < (aberta ? n - 1 : n); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += ` C${arred(p1[0] + (p2[0] - p0[0]) / 6)} ${arred(p1[1] + (p2[1] - p0[1]) / 6)}` +
         ` ${arred(p2[0] - (p3[0] - p1[0]) / 6)} ${arred(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  return d + " Z";
}

// Metade esquerda do corpo (a direita é espelhada). Tela de 220 x 440, linha central em x = 110.
const TRONCO = { aberta: true, pts: [[110,64],[96,64],[82,70],[72,78],[73,96],[75,118],[76,140],[77,170],[79,200],[77,230],[92,242],[110,248]] };
const BRACO = { pts: [[62,76],[74,80],[80,96],[76,118],[68,140],[60,158],[56,176],[52,198],[48,216],[46,236],[36,238],[34,222],[38,200],[40,176],[42,158],[46,138],[46,112],[50,86]] };
const PERNA = { pts: [[78,242],[92,240],[108,248],[107,272],[104,300],[101,326],[100,346],[98,372],[96,400],[98,418],[102,430],[104,436],[80,436],[82,426],[86,414],[86,388],[84,362],[82,344],[80,326],[78,296],[76,268]] };
const CABECA = "M92 30a18 18 0 1 0 36 0a18 18 0 1 0-36 0Z";
const PESCOCO = "M102 46L102 63Q110 68 118 63L118 46Z";

const CORPO = {
  frente: {
    centro: [CABECA, PESCOCO],
    fundo: [TRONCO, { aberta: true, pts: [[110,150],[100,150],[95,166],[95,190],[98,214],[110,224]] }, BRACO, PERNA],
    zonas: {
      "peitoral-superior": { aberta: true, pts: [[110,86],[94,87],[82,91],[76,98],[75,106],[88,106],[110,105]] },
      "peitoral-medio":    { aberta: true, pts: [[110,107],[90,108],[75,108],[75,117],[90,122],[110,124]] },
      "peitoral-inferior": { aberta: true, pts: [[110,126],[90,124],[76,119],[77,127],[86,137],[98,143],[110,145]] },
      "deltoide-anterior": { pts: [[70,76],[78,84],[79,96],[75,108],[68,112],[62,100],[62,86]] },
      "deltoide-lateral":  { pts: [[60,76],[66,78],[62,88],[62,100],[66,112],[56,116],[48,106],[47,92],[52,81]] },
      "biceps":            { pts: [[62,118],[70,124],[68,140],[62,152],[55,158],[50,150],[52,134],[56,122]] },
      "braquial":          { pts: [[50,150],[46,160],[42,180],[40,196],[45,194],[50,178],[54,162],[56,152]] },
      "quadriceps":        { pts: [[78,242],[92,240],[106,248],[105,270],[102,300],[100,326],[90,334],[82,326],[80,300],[77,270]] }
    }
  },
  costas: {
    centro: [CABECA, PESCOCO],
    fundo: [TRONCO, BRACO, PERNA],
    zonas: {
      "trapezio":          { aberta: true, pts: [[110,62],[98,62],[84,70],[72,78],[78,92],[92,108],[104,126],[110,136]] },
      "romboides":         { aberta: true, pts: [[110,98],[100,100],[90,106],[86,118],[92,128],[110,134]] },
      "grande-dorsal":     { pts: [[76,114],[84,122],[94,138],[102,156],[102,176],[92,184],[84,176],[78,156],[75,136]] },
      "lombar":            { aberta: true, pts: [[110,172],[104,174],[98,184],[97,200],[100,214],[110,220]] },
      "deltoide-posterior":{ pts: [[62,76],[72,78],[79,90],[77,104],[68,112],[56,110],[48,98],[50,84]] },
      "triceps-longa":     { pts: [[62,114],[72,118],[71,134],[65,150],[58,156],[57,142],[59,126]] },
      "triceps-lateral":   { pts: [[52,114],[60,114],[58,130],[57,144],[56,156],[48,154],[47,138],[49,124]] },
      "gluteos":           { aberta: true, pts: [[110,224],[96,222],[84,226],[78,238],[82,252],[96,258],[110,256]] },
      "posteriores":       { pts: [[78,262],[94,262],[106,264],[104,290],[101,316],[96,334],[86,334],[82,316],[79,290]] },
      "panturrilhas":      { pts: [[82,346],[98,346],[100,362],[97,382],[93,396],[89,396],[85,382],[81,362]] }
    }
  }
};

// Nome do músculo no banco (grupamento|nome sem acento) -> zona do desenho
const ZONA_POR_NOME = {
  "costas|grande dorsal": "grande-dorsal", "costas|trapezio": "trapezio",
  "costas|romboides": "romboides", "costas|lombar": "lombar",
  "peito|peitoral superior": "peitoral-superior", "peito|peitoral medio": "peitoral-medio", "peito|peitoral inferior": "peitoral-inferior",
  "ombro|deltoide anterior": "deltoide-anterior", "ombro|deltoide lateral": "deltoide-lateral", "ombro|deltoide posterior": "deltoide-posterior",
  "pernas|quadriceps": "quadriceps", "pernas|posteriores de coxa": "posteriores",
  "pernas|gluteos": "gluteos", "pernas|panturrilhas": "panturrilhas",
  "biceps|biceps braquial": "biceps", "biceps|braquial e braquiorradial": "braquial",
  "triceps|cabeca longa": "triceps-longa", "triceps|cabeca lateral e medial": "triceps-lateral"
};

// Explicação em linguagem simples: onde fica e que movimento faz
const DESCRICOES = {
  "grande-dorsal": "Músculo largo que cobre as laterais das costas, do sovaco até a cintura. Dá o formato em V e trabalha nas puxadas e remadas.",
  "trapezio": "Vai do pescoço até o meio das costas, passando pelo topo dos ombros. Sobe os ombros e os aproxima, como nos encolhimentos.",
  "romboides": "Ficam entre as escápulas, abaixo do trapézio. Puxam as escápulas uma contra a outra, como nas remadas.",
  "lombar": "Parte de baixo das costas, ao lado da coluna. Mantém o tronco firme e ereto.",
  "peitoral-superior": "Parte de cima do peito, perto da clavícula. Trabalha no supino inclinado.",
  "peitoral-medio": "Região central do peito. Trabalha no supino reto e nos crucifixos.",
  "peitoral-inferior": "Parte de baixo do peito. Trabalha no supino declinado e nas paralelas.",
  "deltoide-anterior": "Frente do ombro. Trabalha nos desenvolvimentos e nas elevações frontais.",
  "deltoide-lateral": "Lateral do ombro, responsável pela largura. Trabalha nas elevações laterais.",
  "deltoide-posterior": "Parte de trás do ombro. Trabalha no crucifixo inverso e nas remadas altas.",
  "quadriceps": "Frente da coxa. Estende o joelho; trabalha no agachamento, no leg press e na cadeira extensora.",
  "posteriores": "Parte de trás da coxa. Dobra o joelho; trabalha na mesa flexora e no stiff.",
  "gluteos": "Músculos do bumbum. Estendem o quadril; trabalham no agachamento e na elevação pélvica.",
  "panturrilhas": "Parte de trás da perna, abaixo do joelho. Levantam o calcanhar, como nas elevações de panturrilha.",
  "biceps": "Frente do braço. Dobra o cotovelo; trabalha em todas as roscas.",
  "braquial": "Fica sob o bíceps e na parte de cima do antebraço. Ajuda a dobrar o cotovelo, principalmente na rosca martelo.",
  "triceps-longa": "Parte de trás do braço, do lado de dentro. Trabalha no tríceps francês e no tríceps testa.",
  "triceps-lateral": "Parte de trás do braço, do lado de fora e do meio. Trabalha no tríceps na polia e nas extensões."
};

const DESC_TODOS = "Treina o grupamento inteiro, com todos os músculos destacados no desenho.";
const TEXTO_PADRAO = "Passe o mouse ou toque em um músculo para ver onde ele fica no corpo.";
const semAcento = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function elSvg(tag, atributos = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  Object.entries(atributos).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

// Desenha a forma e a cópia espelhada (lado direito do corpo)
function lado(pai, forma) {
  const d = suave(forma.pts, forma.aberta);
  pai.append(elSvg("path", { d }), elSvg("path", { d, transform: "matrix(-1 0 0 1 220 0)" }));
}

function criarCorpo(vista) {
  const v = CORPO[vista];
  const svg = elSvg("svg", { viewBox: "0 0 220 440", class: "corpo", "aria-hidden": "true", focusable: "false" });

  const fundo = elSvg("g", { class: "fundo" });
  v.centro.forEach(d => fundo.append(elSvg("path", { d })));
  v.fundo.forEach(f => lado(fundo, f));
  svg.append(fundo);

  const zonas = elSvg("g", { class: "zonas" });
  Object.entries(v.zonas).forEach(([chave, forma]) => {
    const g = elSvg("g", { class: "zona", "data-zona": chave });
    lado(g, forma);
    zonas.append(g);
  });
  svg.append(zonas);

  svg.append(elSvg("rect", { class: "varredura", x: 0, y: 0, width: 220, height: 3 }));
  return svg;
}

// Monta o painel do corpo de um grupamento e liga os cartões de músculo a ele.
// itens: [{ nome, input, label }]; todos: { input, label }. Devolve null se nenhum músculo tiver desenho.
function montarPainelCorpo(grupo, itens, todos) {
  const info = itens.map(it => {
    const zona = ZONA_POR_NOME[grupo + "|" + semAcento(it.nome)] || null;
    return { ...it, zona, desc: zona ? DESCRICOES[zona] : "" };
  });
  const vistas = ["frente", "costas"].filter(v => info.some(i => i.zona && CORPO[v].zonas[i.zona]));
  if (!vistas.length) return null;

  const painel = document.createElement("div");
  painel.className = "corpo-painel";

  const figuras = document.createElement("div");
  figuras.className = "corpo-figuras" + (vistas.length === 1 ? " uma" : "");
  vistas.forEach(v => {
    const fig = document.createElement("figure");
    fig.className = "corpo-fig";
    const legendaFig = document.createElement("figcaption");
    legendaFig.textContent = v === "frente" ? "Frente" : "Costas";
    fig.append(criarCorpo(v), legendaFig);
    figuras.append(fig);
  });

  const legenda = document.createElement("div");
  legenda.className = "corpo-legenda";
  legenda.setAttribute("aria-hidden", "true");   // a descrição acessível está dentro de cada cartão
  const titulo = document.createElement("strong");
  const texto = document.createElement("p");
  legenda.append(titulo, texto);
  painel.append(figuras, legenda);

  const itemTodos = { nome: "Todos", input: todos.input, label: todos.label, zona: null, desc: DESC_TODOS };
  const zonasDe = it => (it === itemTodos ? info : [it]).flatMap(i =>
    i.zona ? [...painel.querySelectorAll(`.zona[data-zona="${i.zona}"]`)] : []);

  let ultimo = null;
  const mostrar = it => {
    titulo.textContent = it ? it.nome : "";
    texto.textContent = it ? it.desc : TEXTO_PADRAO;
  };
  const atualizar = () => {
    painel.querySelectorAll(".zona").forEach(g => g.classList.remove("sel", "todos"));
    if (todos.input.checked) zonasDe(itemTodos).forEach(g => g.classList.add("todos"));
    else info.filter(i => i.input.checked).forEach(i => zonasDe(i).forEach(g => g.classList.add("sel")));
  };

  [itemTodos, ...info].forEach(it => {
    const entrar = () => { zonasDe(it).forEach(g => g.classList.add("foco")); mostrar(it); };
    const sair = () => { zonasDe(it).forEach(g => g.classList.remove("foco")); mostrar(ultimo); };

    it.label.addEventListener("mouseenter", entrar);
    it.label.addEventListener("mouseleave", sair);
    it.input.addEventListener("focus", entrar);
    it.input.addEventListener("blur", sair);
    it.input.addEventListener("change", () => { ultimo = it; atualizar(); mostrar(it); });

    // Descrição para leitores de tela, junto do nome do cartão
    if (it.desc) {
      const oculto = document.createElement("span");
      oculto.className = "sr-only";
      oculto.textContent = ". " + it.desc;
      it.label.querySelector(".face").append(oculto);
    }

    // Tocar ou passar o mouse no próprio desenho também funciona
    if (it !== itemTodos) {
      zonasDe(it).forEach(g => {
        g.addEventListener("mouseenter", entrar);
        g.addEventListener("mouseleave", sair);
        g.addEventListener("click", () => {
          it.input.checked = !it.input.checked;
          it.input.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    }
  });

  mostrar(null);
  atualizar();
  return painel;
}
