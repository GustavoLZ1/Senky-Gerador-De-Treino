const gruposNomes = {};   // chave -> nome, para a lista de cadastrados

function opcao(select, valor, texto) {
  const o = document.createElement("option");
  o.value = valor;
  o.textContent = texto;
  select.append(o);
}

async function carregarBase() {
  try {
    const [g, e] = await Promise.all([api("/api/grupamentos"), api("/api/esquemas")]);
    if (!g.ok || !e.ok) throw new Error("base");

    const sel = $("grupamento");
    sel.replaceChildren();
    opcao(sel, "", "Escolha o grupamento");
    g.corpo.forEach(x => { gruposNomes[x.chave] = x.nome; opcao(sel, x.chave, x.nome); });

    const area = $("esquemas");
    e.corpo.forEach(x => {
      const label = document.createElement("label");
      label.className = "opcao";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "esquema";
      input.value = x.chave;
      const texto = document.createElement("span");
      texto.textContent = infoObjetivo(x.chave).nome;
      label.append(input, texto);
      area.append(label);
    });

    $("salvar").disabled = false;
  } catch (err) {
    if (err.message !== "sessao") aviso($("status"), "Não foi possível carregar grupamentos e esquemas. Recarregue a página.", "erro");
  }
}

async function carregarMusculos() {
  const sel = $("musculo");
  const chave = $("grupamento").value;
  sel.replaceChildren();
  if (!chave) {
    opcao(sel, "", "Escolha o grupamento primeiro");
    sel.disabled = true;
    return;
  }
  opcao(sel, "", "Não especificar");
  sel.disabled = false;
  try {
    const r = await api("/api/musculos?grupos=" + encodeURIComponent(chave));
    if (r.ok) r.corpo.forEach(m => opcao(sel, m.id, m.nome));
  } catch (_) { /* segue só com "Não especificar" */ }
}

function validar() {
  const nome = $("nome").value.trim().replace(/\s+/g, " ");
  const marcados = [...document.querySelectorAll('input[name="esquema"]:checked')].map(i => i.value);

  $("nome").removeAttribute("aria-invalid");
  $("grupamento").removeAttribute("aria-invalid");

  if (nome.length < 3 || nome.length > 100) {
    $("nome").setAttribute("aria-invalid", "true");
    $("nome").focus();
    return { erro: "Informe um nome com 3 a 100 caracteres." };
  }
  if (!$("grupamento").value) {
    $("grupamento").setAttribute("aria-invalid", "true");
    $("grupamento").focus();
    return { erro: "Escolha o grupamento." };
  }
  if (!marcados.length) return { erro: "Selecione ao menos um esquema." };

  return {
    dados: {
      nome,
      grupamento: $("grupamento").value,
      musculoId: $("musculo").value ? Number($("musculo").value) : null,
      esquemas: marcados
    }
  };
}

function registrarRecente(dados) {
  const li = document.createElement("li");
  const nome = document.createElement("strong");
  nome.textContent = dados.nome;
  const detalhe = document.createElement("span");
  const musculo = $("musculo").selectedOptions[0];
  const partes = [gruposNomes[dados.grupamento]];
  if (dados.musculoId) partes.push(musculo.textContent);
  partes.push(dados.esquemas.map(e => infoObjetivo(e).nome).join(", "));
  detalhe.textContent = partes.join(" | ");
  li.append(nome, detalhe);
  $("lista-recentes").prepend(li);
  $("recentes").hidden = false;
}

$("grupamento").addEventListener("change", carregarMusculos);

$("form-ex").addEventListener("submit", async e => {
  e.preventDefault();
  const status = $("status");
  const v = validar();
  if (v.erro) { aviso(status, v.erro, "erro"); return; }

  $("salvar").disabled = true;
  aviso(status, "Salvando…");
  try {
    const r = await post("/api/exercicios", v.dados);
    if (r.ok) {
      aviso(status, `Exercício "${v.dados.nome}" cadastrado.`, "ok");
      registrarRecente(v.dados);
      $("nome").value = "";   // mantém grupamento, músculo e esquemas para cadastrar o próximo
      $("nome").focus();
    } else {
      aviso(status, (r.corpo && r.corpo.erro) || "Não foi possível cadastrar o exercício.", "erro");
    }
  } catch (err) {
    if (err.message !== "sessao") aviso(status, "Sem conexão com o servidor. Tente novamente.", "erro");
  } finally {
    $("salvar").disabled = false;
  }
});

carregarBase();

// Ao voltar pelo botão do navegador, recarrega: sem sessão, o servidor manda para o login
addEventListener("pageshow", e => { if (e.persisted) window.location.reload(); });
