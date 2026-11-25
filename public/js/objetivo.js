// Assistente em 3 etapas: objetivo -> grupamentos -> músculos específicos. No fim, abre o treino.
const passos = ["passo-objetivo", "passo-grupos", "passo-musculos"];
const estado = { passo: 0, objetivo: null, grupos: [], musculosProntos: false };
const ORDEM_OBJETIVOS = ["hipertrofia", "emagrecimento", "resistencia"];
let esquemas = [], grupamentos = [];

const gravar = (chave, valor) => { try { sessionStorage.setItem(chave, valor); } catch (_) {} };

function svgIcone(d) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 48 48");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", d);
  svg.append(p);
  return svg;
}

// Cartão de seleção: label > input + .face
function cartao(tipo, nome, valor, titulo, opc = {}) {
  const label = document.createElement("label");
  label.className = "card";
  if (opc.info) {
    label.style.setProperty("--c", opc.info.cor);
    label.style.setProperty("--c-rgb", opc.info.rgb);
  }
  const input = document.createElement("input");
  input.type = tipo;
  input.name = nome;
  input.value = valor;
  const face = document.createElement("span");
  face.className = "face";
  if (opc.icone) face.append(svgIcone(opc.icone));
  if (tipo === "checkbox") {
    const marca = document.createElement("span");
    marca.className = "check";
    marca.setAttribute("aria-hidden", "true");
    face.append(marca);
  }
  const t = document.createElement("strong");
  t.textContent = titulo;
  face.append(t);
  if (opc.desc) {
    const d = document.createElement("span");
    d.className = "desc";
    d.textContent = opc.desc;
    face.append(d);
  }
  if (opc.meta) {
    const m = document.createElement("span");
    m.className = "meta";
    m.textContent = opc.meta;
    face.append(m);
  }
  label.append(input, face);
  return { label, input };
}

function renderObjetivos() {
  const area = $("lista-objetivos");
  esquemas.forEach(x => {
    const info = infoObjetivo(x.chave);
    const c = cartao("radio", "objetivo", x.chave, info.nome, {
      info, icone: info.icone, desc: info.desc,
      meta: `${x.series} séries de ${x.reps} repetições, descanso de ${x.descanso}`
    });
    c.input.addEventListener("change", () => {
      estado.objetivo = x.chave;
      aplicarAccent(info);
      validar();
    });
    area.append(c.label);
  });
}

function renderGrupos() {
  const area = $("lista-grupos");
  grupamentos.forEach(g => {
    const c = cartao("checkbox", "grupo", g.chave, g.nome, { desc: g.musculos.join(", ") });
    c.input.addEventListener("change", () => {
      estado.grupos = [...document.querySelectorAll("#lista-grupos input:checked")].map(i => i.value);
      validar();
    });
    area.append(c.label);
  });
}

const nomeGrupo = chave => (grupamentos.find(g => g.chave === chave) || { nome: chave }).nome;

function atualizarResumo() {
  const resumo = $("resumo");
  resumo.replaceChildren();
  const item = (rotulo, valor) => {
    const s = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = valor;
    s.append(rotulo + ": ", b);
    resumo.append(s);
  };
  if (estado.passo >= 1) item("Objetivo", infoObjetivo(estado.objetivo).nome);
  if (estado.passo >= 2) item("Grupamentos", estado.grupos.map(nomeGrupo).join(", "));
}

function validar() {
  const n = estado.passo;
  const ok = n === 0 ? !!estado.objetivo : n === 1 ? estado.grupos.length > 0 : estado.musculosProntos;
  $("avancar").disabled = !ok;
  if (n === 0) aviso($("status"), ok ? "" : "Escolha uma opção para continuar.");
  if (n === 1) aviso($("status"), ok ? "" : "Escolha ao menos um grupamento.");
}

function ir(n, focar = true) {
  estado.passo = n;
  passos.forEach((id, i) => { $(id).hidden = i !== n; });
  document.querySelectorAll(".passos li").forEach((li, i) => {
    li.classList.toggle("feito", i < n);
    if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
  });
  $("voltar").hidden = n === 0;
  $("avancar").textContent = n === 2 ? "Gerar treino" : "Continuar";
  atualizarResumo();
  validar();
  if (focar) $(passos[n]).querySelector("h1").focus();
  if (n === 2) carregarMusculos();
}

// Etapa 3: só aparecem músculos que têm exercício no objetivo escolhido
async function carregarMusculos() {
  const area = $("blocos");
  area.replaceChildren();
  estado.musculosProntos = false;
  $("avancar").disabled = true;
  aviso($("status"), "Carregando músculos…");

  let musculos;
  try {
    const url = "/api/musculos?grupos=" + encodeURIComponent(estado.grupos.join(",")) +
      "&objetivo=" + encodeURIComponent(estado.objetivo);
    const r = await api(url);
    if (!r.ok) throw new Error("http " + r.status);
    musculos = r.corpo;
  } catch (err) {
    if (err.message !== "sessao") aviso($("status"), "Não foi possível carregar os músculos. Volte e tente de novo.", "erro");
    return;
  }

  let algum = false;
  estado.grupos.forEach(g => {
    const doGrupo = musculos.filter(m => m.grupo === g);
    const bloco = document.createElement("section");
    bloco.className = "bloco";
    const titulo = document.createElement("h2");
    titulo.textContent = nomeGrupo(g);
    bloco.append(titulo);

    if (!doGrupo.length) {
      const vazio = document.createElement("p");
      vazio.className = "vazio";
      vazio.textContent = "Ainda não há músculos específicos para este objetivo. O treino usa o grupamento completo.";
      bloco.append(vazio);
      area.append(bloco);
      return;
    }

    algum = true;
    const grade = document.createElement("div");
    grade.className = "grade musculos";
    grade.setAttribute("role", "group");
    grade.setAttribute("aria-label", "Músculos de " + nomeGrupo(g));

    const todos = cartao("checkbox", "todos-" + g, "todos", "Todos");
    todos.input.dataset.todos = "1";
    todos.input.checked = true;
    const itens = doGrupo.map(m => cartao("checkbox", "musculo", m.id, m.nome));

    todos.input.addEventListener("change", () => {
      if (todos.input.checked) itens.forEach(i => { i.input.checked = false; });
      else todos.input.checked = true; // sempre sobra uma opção marcada
    });
    itens.forEach(i => i.input.addEventListener("change", () => {
      todos.input.checked = !itens.some(x => x.input.checked);
    }));

    grade.append(todos.label, ...itens.map(i => i.label));

    // Ilustração do corpo ao lado dos cartões (se algum músculo tiver desenho)
    const lista = doGrupo.map((m, i) => ({ nome: m.nome, input: itens[i].input, label: itens[i].label }));
    const painel = montarPainelCorpo(g, lista, todos);
    if (painel) {
      const dupla = document.createElement("div");
      dupla.className = "bloco-corpo";
      dupla.append(grade, painel);
      bloco.append(dupla);
    } else {
      bloco.append(grade);
    }
    area.append(bloco);
  });

  estado.musculosProntos = true;
  $("avancar").disabled = false;
  aviso($("status"), algum
    ? "Deixe em Todos ou escolha músculos específicos."
    : "Sem músculos específicos por enquanto. O treino usa os grupamentos completos.");
}

function gerarTreino() {
  const ids = [...document.querySelectorAll('#blocos input[name="musculo"]:checked')].map(i => Number(i.value));
  gravar("objetivo", estado.objetivo);
  gravar("grupos", JSON.stringify(estado.grupos));
  gravar("musculos", JSON.stringify(ids));
  window.location.assign("treino.html");
}

$("avancar").addEventListener("click", () => {
  if (estado.passo < 2) ir(estado.passo + 1); else gerarTreino();
});
$("voltar").addEventListener("click", () => ir(estado.passo - 1));

(async function iniciar() {
  try {
    const [e, g] = await Promise.all([api("/api/esquemas"), api("/api/grupamentos")]);
    if (!e.ok || !g.ok) throw new Error("base");
    const pos = c => { const i = ORDEM_OBJETIVOS.indexOf(c); return i < 0 ? 99 : i; };
    esquemas = e.corpo.slice().sort((a, b) => pos(a.chave) - pos(b.chave));
    grupamentos = g.corpo;
  } catch (err) {
    if (err.message !== "sessao") aviso($("status"), "Não foi possível carregar as opções. Recarregue a página.", "erro");
    return;
  }
  renderObjetivos();
  renderGrupos();
  ir(0, false);
})();

// Ao voltar pelo botão do navegador, recarrega: sem sessão, o servidor manda para o login
addEventListener("pageshow", e => { if (e.persisted) window.location.reload(); });
