/**
 * Sorteio do brinde + X1 de Free Fire — Fluxo W7M
 * Backend em Google Apps Script ligado à planilha de leads.
 *
 * Para atualizar (mantém a mesma URL):
 * 1. Na planilha: Extensões > Apps Script. Apague tudo e cole este arquivo.
 * 2. Implantar > Gerenciar implantações > lápis (editar) > Versão: "Nova versão" > Implantar.
 */

const PIN = '2026';                                  // libera o botão "Sortear" no painel
const FUSO = 'America/Sao_Paulo';
const SORTEIO_FECHA = '2026-11-14T19:00:00-03:00';   // cadastros do sorteio fecham aqui
const X1_FECHA = '2026-11-14T18:00:00-03:00';        // inscrições do X1 fecham aqui
const X1_VAGAS = 8;                                  // confirmados; o resto vai para lista de espera
const ABA_LEADS = 'Leads';
const ABA_SORTEIOS = 'Sorteios';
const ABA_X1 = 'X1';

function doGet(e) {
  const acao = (e && e.parameter && e.parameter.acao) || 'stats';
  if (acao === 'stats') return json(stats_());
  return json({ ok: false, erro: 'Ação inválida' });
}

function doPost(e) {
  let dados = {};
  try { dados = JSON.parse(e.postData.contents || '{}'); } catch (err) {}
  if (dados.acao === 'cadastro') return json(cadastrar_(dados));
  if (dados.acao === 'x1') return json(inscreverX1_(dados));
  if (dados.acao === 'sortear') return json(sortear_(dados));
  return json({ ok: false, erro: 'Ação inválida' });
}

/* ---------- Cadastro do sorteio ---------- */
function cadastrar_(d) {
  if (Date.now() >= new Date(SORTEIO_FECHA).getTime()) return { ok: false, erro: 'Inscrições encerradas.' };
  const nome = limparNome_(d.nome);
  const digitos = String(d.telefone || '').replace(/\D/g, '');
  if (nome.length < 3) return { ok: false, erro: 'Informe o nome completo.' };
  if (digitos.length < 10 || digitos.length > 11) return { ok: false, erro: 'Telefone inválido. Use DDD + número.' };
  if (!d.aceite) return { ok: false, erro: 'É preciso aceitar os termos para participar.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const aba = aba_(ABA_LEADS, ['Data/Hora', 'Nome', 'Telefone', 'Aceite LGPD', 'Origem']);
    if (posicaoFone_(aba, 3, digitos)) return { ok: true, duplicado: true };
    aba.appendRow([new Date(), nome, formatar_(digitos), 'Sim', String(d.origem || '').slice(0, 40)]);
    return { ok: true, duplicado: false };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Inscrição do X1 ---------- */
function inscreverX1_(d) {
  if (Date.now() >= new Date(X1_FECHA).getTime()) return { ok: false, erro: 'Inscrições do X1 encerradas.' };
  const nome = limparNome_(d.nome);
  const nick = String(d.nick || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  const digitos = String(d.telefone || '').replace(/\D/g, '');
  if (nome.length < 3) return { ok: false, erro: 'Informe o nome completo.' };
  if (nick.length < 2) return { ok: false, erro: 'Informe seu nick no Free Fire.' };
  if (digitos.length < 10 || digitos.length > 11) return { ok: false, erro: 'Telefone inválido. Use DDD + número.' };
  if (!d.aceite) return { ok: false, erro: 'É preciso aceitar os termos para participar.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const aba = aba_(ABA_X1, ['Data/Hora', 'Nome', 'Nick', 'Telefone', 'Aceite LGPD', 'Origem']);
    const ja = posicaoFone_(aba, 4, digitos);
    if (ja) return { ok: true, duplicado: true, posicao: ja, confirmado: ja <= X1_VAGAS, vagas: X1_VAGAS };
    aba.appendRow([new Date(), nome, nick, formatar_(digitos), 'Sim', String(d.origem || '').slice(0, 40)]);
    const pos = aba.getLastRow() - 1;
    return { ok: true, duplicado: false, posicao: pos, confirmado: pos <= X1_VAGAS, vagas: X1_VAGAS };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Painel ---------- */
function stats_() {
  const leads = linhas_(ABA_LEADS);
  const sorteios = linhas_(ABA_SORTEIOS);
  const x1 = linhas_(ABA_X1);
  const hoje = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
  const porHora = {}, porOrigem = {};
  let totalHoje = 0;
  leads.forEach(r => {
    const o = String(r[4] || 'link'); porOrigem[o] = (porOrigem[o] || 0) + 1;
    if (!(r[0] instanceof Date)) return;
    if (Utilities.formatDate(r[0], FUSO, 'yyyy-MM-dd') !== hoje) return;
    totalHoje++;
    const h = Utilities.formatDate(r[0], FUSO, 'HH');
    porHora[h] = (porHora[h] || 0) + 1;
  });
  const hora = r => r[0] instanceof Date ? Utilities.formatDate(r[0], FUSO, 'HH:mm') : '';
  const ultimos = leads.slice(-8).reverse().map(r => ({ nome: primeiroNome_(r[1]), telefone: mascarar_(r[2]), hora: hora(r) }));
  const ganhadores = sorteios.slice(-5).reverse().map(r => ({
    nome: primeiroNome_(r[1]), telefone: mascarar_(r[2]),
    hora: r[0] instanceof Date ? Utilities.formatDate(r[0], FUSO, 'dd/MM HH:mm') : ''
  }));
  const nomes = leads.slice(-60).map(r => primeiroNome_(r[1]));
  const x1Lista = x1.map((r, i) => ({ posicao: i + 1, nome: primeiroNome_(r[1]), nick: String(r[2]), telefone: mascarar_(r[3]), hora: hora(r) }));
  return {
    ok: true, total: leads.length, totalHoje, porHora, porOrigem, ultimos, ganhadores, nomes,
    x1: { total: x1.length, vagas: X1_VAGAS, inscritos: x1Lista },
    atualizado: new Date().toISOString()
  };
}

/* ---------- Sorteio ---------- */
function sortear_(d) {
  if (String(d.pin || '') !== PIN) return { ok: false, erro: 'PIN incorreto.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const leads = linhas_(ABA_LEADS);
    const jaGanharam = new Set(linhas_(ABA_SORTEIOS).map(r => String(r[2]).replace(/\D/g, '')));
    const aptos = leads.filter(r => !jaGanharam.has(String(r[2]).replace(/\D/g, '')));
    if (!aptos.length) return { ok: false, erro: 'Nenhum participante apto para sortear.' };
    const g = aptos[Math.floor(Math.random() * aptos.length)];
    aba_(ABA_SORTEIOS, ['Data/Hora', 'Nome', 'Telefone', 'Total de participantes']).appendRow([new Date(), g[1], g[2], aptos.length]);
    return { ok: true, nome: g[1], telefone: g[2], participantes: aptos.length };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Utilitários ---------- */
function aba_(nome, cabecalho) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.appendRow(cabecalho);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, cabecalho.length).setFontWeight('bold');
  }
  return aba;
}
function linhas_(nome) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!aba || aba.getLastRow() < 2) return [];
  return aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();
}
// posição (1, 2, 3...) do telefone na aba, ou 0 se não existir
function posicaoFone_(aba, coluna, digitos) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return 0;
  const fones = aba.getRange(2, coluna, ultima - 1, 1).getDisplayValues();
  const i = fones.findIndex(r => String(r[0]).replace(/\D/g, '') === digitos);
  return i + 1;
}
function limparNome_(n) { return String(n || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
function formatar_(d) {
  return d.length === 11
    ? '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7)
    : '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
}
function mascarar_(fone) {
  const d = String(fone).replace(/\D/g, '');
  return d.length >= 10 ? '(' + d.slice(0, 2) + ') •••••-' + d.slice(-4) : '';
}
function primeiroNome_(n) {
  const p = String(n || '').trim().split(' ');
  return p.length > 1 ? p[0] + ' ' + p[p.length - 1].charAt(0) + '.' : p[0];
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
