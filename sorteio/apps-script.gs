/**
 * Sorteio do manguito — Fluxo W7M
 * Backend em Google Apps Script ligado à planilha de leads.
 *
 * Como publicar (uma vez só):
 * 1. Na planilha: Extensões > Apps Script. Apague o que tiver e cole este arquivo.
 * 2. Troque o PIN abaixo (é o que libera o botão "Sortear" no painel).
 * 3. Implantar > Nova implantação > tipo "App da Web"
 *    - Executar como: Eu
 *    - Quem pode acessar: Qualquer pessoa
 * 4. Autorize e copie a URL que termina em /exec.
 */

const PIN = '2026';             // troque antes de publicar
const FUSO = 'America/Sao_Paulo';
const ABA_LEADS = 'Leads';
const ABA_SORTEIOS = 'Sorteios';

function doGet(e) {
  const acao = (e && e.parameter && e.parameter.acao) || 'stats';
  if (acao === 'stats') return json(stats_());
  return json({ ok: false, erro: 'Ação inválida' });
}

function doPost(e) {
  let dados = {};
  try { dados = JSON.parse(e.postData.contents || '{}'); } catch (err) {}
  if (dados.acao === 'cadastro') return json(cadastrar_(dados));
  if (dados.acao === 'sortear') return json(sortear_(dados));
  return json({ ok: false, erro: 'Ação inválida' });
}

/* ---------- Cadastro ---------- */
function cadastrar_(d) {
  const nome = String(d.nome || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const digitos = String(d.telefone || '').replace(/\D/g, '');
  if (nome.length < 3) return { ok: false, erro: 'Informe o nome completo.' };
  if (digitos.length < 10 || digitos.length > 11) return { ok: false, erro: 'Telefone inválido. Use DDD + número.' };
  if (!d.aceite) return { ok: false, erro: 'É preciso aceitar os termos para participar.' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const aba = aba_(ABA_LEADS, ['Data/Hora', 'Nome', 'Telefone', 'Aceite LGPD', 'Origem']);
    const ultima = aba.getLastRow();
    if (ultima > 1) {
      const fones = aba.getRange(2, 3, ultima - 1, 1).getDisplayValues();
      const existe = fones.some(r => String(r[0]).replace(/\D/g, '') === digitos);
      if (existe) return { ok: true, duplicado: true };
    }
    aba.appendRow([new Date(), nome, formatar_(digitos), 'Sim', String(d.origem || '').slice(0, 40)]);
    return { ok: true, duplicado: false };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Painel ---------- */
function stats_() {
  const leads = linhas_(ABA_LEADS);
  const sorteios = linhas_(ABA_SORTEIOS);
  const hoje = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
  const porHora = {};
  let totalHoje = 0;
  leads.forEach(r => {
    if (!(r[0] instanceof Date)) return;
    if (Utilities.formatDate(r[0], FUSO, 'yyyy-MM-dd') !== hoje) return;
    totalHoje++;
    const h = Utilities.formatDate(r[0], FUSO, 'HH');
    porHora[h] = (porHora[h] || 0) + 1;
  });
  const ultimos = leads.slice(-8).reverse().map(r => ({
    nome: primeiroNome_(r[1]),
    telefone: mascarar_(r[2]),
    hora: r[0] instanceof Date ? Utilities.formatDate(r[0], FUSO, 'HH:mm') : ''
  }));
  const ganhadores = sorteios.slice(-5).reverse().map(r => ({
    nome: primeiroNome_(r[1]),
    telefone: mascarar_(r[2]),
    hora: r[0] instanceof Date ? Utilities.formatDate(r[0], FUSO, 'dd/MM HH:mm') : ''
  }));
  const nomes = leads.slice(-60).map(r => primeiroNome_(r[1]));
  return { ok: true, total: leads.length, totalHoje, porHora, ultimos, ganhadores, nomes, atualizado: new Date().toISOString() };
}

/* ---------- Sorteio ---------- */
function sortear_(d) {
  if (String(d.pin || '') !== PIN) return { ok: false, erro: 'PIN incorreto.' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
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
