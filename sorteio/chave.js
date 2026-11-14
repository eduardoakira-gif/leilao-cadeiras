// Prévia da chave do X1 montada pela ordem de inscrição (1x2, 3x4, 5x6, 7x8).
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function vaga(j, n) {
    return j
      ? `<div class="cv-slot cheio"><span class="cv-n">${n}</span><span><b>${esc(j.nick)}</b><small>${esc(j.nome)}</small></span></div>`
      : `<div class="cv-slot"><span class="cv-n">${n}</span><span class="cv-aberta">Vaga aberta</span></div>`;
  }
  function placeholder(txt) { return `<div class="cv-slot futuro"><span class="cv-aberta">${txt}</span></div>`; }

  window.desenharChaveX1 = function (el, x1, modo) {
    if (!el || !x1) return;
    const vagas = x1.vagas || 8;
    const conf = (x1.inscritos || []).slice(0, vagas);
    const jogos = [];
    for (let m = 0; m < vagas / 2; m++) jogos.push([conf[2 * m], conf[2 * m + 1]]);

    if (modo === 'compacto') {
      el.innerHTML = '<div class="cv-grade">' + jogos.map((j, m) =>
        `<div class="cv-jogo"><div class="cv-rot">Jogo ${m + 1}</div>${vaga(j[0], 2 * m + 1)}<div class="cv-x">x</div>${vaga(j[1], 2 * m + 2)}</div>`
      ).join('') + '</div>';
      return;
    }
    let html = '<div class="cv-col"><h3>Quartas</h3><div class="cv-jogos">' + jogos.map((j, m) =>
      `<div class="cv-jogo"><div class="cv-rot">Jogo ${m + 1}</div>${vaga(j[0], 2 * m + 1)}${vaga(j[1], 2 * m + 2)}</div>`).join('') + '</div></div>';
    html += '<div class="cv-col"><h3>Semifinal</h3><div class="cv-jogos">' +
      `<div class="cv-jogo"><div class="cv-rot">Semi 1</div>${placeholder('Vencedor do Jogo 1')}${placeholder('Vencedor do Jogo 2')}</div>` +
      `<div class="cv-jogo"><div class="cv-rot">Semi 2</div>${placeholder('Vencedor do Jogo 3')}${placeholder('Vencedor do Jogo 4')}</div>` +
      '</div></div>';
    html += '<div class="cv-col"><h3>Final</h3><div class="cv-jogos">' +
      `<div class="cv-jogo"><div class="cv-rot">Final</div>${placeholder('Vencedor da Semi 1')}${placeholder('Vencedor da Semi 2')}</div></div></div>`;
    el.innerHTML = '<div class="cv-chave">' + html + '</div>';
  };
})();
