const ler = chave => { try { return sessionStorage.getItem(chave); } catch (_) { return null; } };

const rotulo = t => (t.musculo ? `${t.grupo} – ${t.musculo}` : t.grupo);

// Usa a área de "fim" para avisar quando não há treino para mostrar
function mostrarAviso(titulo, texto) {
  $("workout").hidden = true;
  $("fim-titulo").textContent = titulo;
  $("fim-resumo").textContent = texto;
  $("fim").hidden = false;
}

function iniciar(info, treino) {
  aplicarAccent(info);
  $("obj").textContent = info.nome;

  const total = treino.length;
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ex = $("ex"), botao = $("concluir"), lista = $("lista");
  let atual = 0, ocupado = false;

  // Lista lateral (texto inserido como texto, nunca como HTML)
  treino.forEach((t, i) => {
    const li = document.createElement("li");

    const n = document.createElement("span");
    n.className = "n";
    n.textContent = i + 1;

    const nome = document.createElement("span");
    nome.className = "nome";
    nome.append(t.nome);
    const small = document.createElement("small");
    small.textContent = rotulo(t);
    nome.append(small);

    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${t.series} × ${t.reps}`;

    li.append(n, nome, meta);
    lista.appendChild(li);
  });
  const itens = [...lista.children];

  function mostrar() {
    const t = treino[atual];
    $("ex-grupo").textContent = rotulo(t);
    $("ex-nome").textContent = t.nome;
    $("ex-series").textContent = t.series;
    $("ex-reps").textContent = t.reps;
    $("ex-desc").textContent = t.descanso;
    $("prog-txt").textContent = `Exercício ${atual + 1} de ${total}`;
    $("barra").style.width = (atual / total * 100) + "%";

    itens.forEach((li, i) => li.classList.toggle("atual", i === atual));
    lista.scrollTo({ top: Math.max(itens[atual].offsetTop - 60, 0), behavior: reduzido ? "auto" : "smooth" });
  }

  function finalizar() {
    $("barra").style.width = "100%";
    $("prog-txt").textContent = `${total} de ${total} concluídos`;
    $("workout").hidden = true;
    $("fim").hidden = false;
    const nomes = [...new Set(treino.map(t => t.grupo))].join(", ");
    $("fim-resumo").textContent = `Você concluiu ${total} exercícios de ${nomes}. Bom trabalho!`;
    $("fim-titulo").focus();
  }

  botao.addEventListener("click", () => {
    if (ocupado) return;
    ocupado = true;
    botao.disabled = true;

    // Marca o exercício atual como concluído na lista
    itens[atual].classList.remove("atual");
    itens[atual].classList.add("feito");
    itens[atual].querySelector(".n").textContent = "✓";

    ex.classList.add("sai");
    setTimeout(() => {
      ex.classList.remove("sai");
      atual++;
      if (atual >= total) { finalizar(); return; }

      mostrar();
      ex.classList.add("entra");
      ex.addEventListener("animationend", () => {
        ex.classList.remove("entra");
        ocupado = false;
        botao.disabled = false;
        botao.focus();
      }, { once: true });
      if (reduzido) { ex.classList.remove("entra"); ocupado = false; botao.disabled = false; }
    }, reduzido ? 0 : 500);
  });

  mostrar();
}

// Lê as escolhas do assistente, busca o treino no servidor e inicia
(async function carregar() {
  let grupos = [];
  try { grupos = JSON.parse(ler("grupos") || "[]"); } catch (_) {}
  grupos = grupos.filter(g => /^[a-z_]+$/.test(g));

  let musculos = [];
  try { musculos = JSON.parse(ler("musculos") || "[]"); } catch (_) {}
  musculos = musculos.filter(Number.isInteger);

  const objetivo = ler("objetivo");
  if (!objetivo || !/^[a-z_]+$/.test(objetivo) || !grupos.length) {
    window.location.replace("objetivo.html");
    return;
  }

  $("workout").hidden = true;

  const url = "/api/treino?objetivo=" + encodeURIComponent(objetivo) +
    "&grupos=" + encodeURIComponent(grupos.join(",")) +
    "&musculos=" + encodeURIComponent(musculos.join(","));

  let dados;
  try {
    const r = await api(url);
    if (!r.ok) throw new Error("http " + r.status);
    dados = r.corpo;
  } catch (err) {
    if (err.message !== "sessao") {
      mostrarAviso("Não foi possível montar o treino", "Houve um problema ao buscar os exercícios. Tente novamente em instantes.");
    }
    return;
  }

  if (!dados.exercicios || !dados.exercicios.length) {
    mostrarAviso("Nenhum exercício encontrado", "Não há exercícios cadastrados para essa combinação de objetivo e músculos. Escolha outra combinação.");
    return;
  }

  $("workout").hidden = false;
  iniciar(infoObjetivo(objetivo), dados.exercicios);
})();

// Ao voltar pelo botão do navegador, recarrega: sem sessão, o servidor manda para o login
addEventListener("pageshow", e => { if (e.persisted) window.location.reload(); });
