// Chave de texto simples (grupamento, objetivo): letras minúsculas e sublinhado
const CHAVE = /^[a-z_]{1,30}$/;

// "a,b,c" -> ["a","b","c"] (aceita também o parâmetro repetido)
const lista = (valor, max = 20) =>
  String(valor ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, max);

// Monta "@g0, @g1, ..." registrando cada valor como parâmetro (nunca concatena valores no SQL)
function inParams(request, prefixo, valores, tipo) {
  return valores.map((v, i) => {
    request.input(prefixo + i, tipo, v);
    return "@" + prefixo + i;
  }).join(", ");
}

module.exports = { CHAVE, lista, inParams };
