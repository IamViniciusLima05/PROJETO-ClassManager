/* ClassManager — turmas, chamada por aula (P/F/J), frequência e histórico */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const CORES = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0d9488', '#4f46e5', '#65a30d', '#c026d3', '#0891b2', '#b45309'];
const cor = (n) => CORES[[...n].reduce((s, c) => s + c.charCodeAt(0), 0) % CORES.length];
const iniciais = (n) => n.trim().split(/\s+/).filter(Boolean).map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : '')).join('').toUpperCase();
const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dataBR = (s, op = { day: '2-digit', month: '2-digit', year: 'numeric' }) => new Date(s + 'T12:00').toLocaleDateString('pt-BR', op);

/* ---------- Dados de exemplo ---------- */
function exemplos() {
  const nomes7 = ['Ana Clara Souza', 'Bruno Henrique Lima', 'Carolina Mendes', 'Davi Oliveira', 'Eduarda Costa', 'Felipe Rocha', 'Gabriela Martins', 'Heitor Alves', 'Isabela Ferreira', 'João Pedro Santos', 'Laura Ribeiro', 'Matheus Carvalho', 'Nicole Araújo', 'Pedro Gomes'];
  const nomesI = ['Amanda Silveira', 'Caio Moreira', 'Fernanda Duarte', 'Gustavo Pires', 'Larissa Teixeira', 'Rafael Nunes', 'Sofia Barbosa', 'Thiago Cardoso'];
  let id = 1;
  const mkAlunos = (ns) => ns.map((nome) => ({ id: id++, nome }));
  const t1 = { id: 1, nome: '7º ano B', disc: 'Matemática', horario: 'Seg e Qua, 8h', min: 75, alunos: mkAlunos(nomes7), aulas: [] };
  const t2 = { id: 2, nome: 'Informática Básica', disc: 'Curso livre', horario: 'Sábados, 9h', min: 75, alunos: mkAlunos(nomesI), aulas: [] };
  const conteudos = ['Números inteiros', 'Operações com inteiros', 'Frações', 'Frações equivalentes', 'Comparação de frações', 'Números decimais', 'Porcentagem', 'Exercícios de revisão', 'Avaliação', 'Correção da avaliação', 'Razão e proporção', 'Regra de três'];
  const conteudosI = ['Ligando o computador', 'Mouse e teclado', 'Pastas e arquivos', 'Navegador e internet', 'E-mail', 'Editor de textos'];
  // frequência "realista": alguns alunos faltam mais
  const perfilFalta = { 4: 0.35, 8: 0.3, 12: 0.12 };
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  conteudos.forEach((c, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() - (conteudos.length - i) * 3 - 1);
    t1.aulas.push({ id: 100 + i, data: iso(d), conteudo: c, pres: Object.fromEntries(t1.alunos.map((a) => { const r = rnd(); const pf = perfilFalta[a.id] ?? 0.06; return [a.id, r < pf ? (r < pf * 0.25 ? 'J' : 'F') : 'P']; })) });
  });
  conteudosI.forEach((c, i) => {
    const d = new Date(hoje); d.setDate(d.getDate() - (conteudosI.length - i) * 7);
    t2.aulas.push({ id: 200 + i, data: iso(d), conteudo: c, pres: Object.fromEntries(t2.alunos.map((a) => [a.id, rnd() < 0.1 ? 'F' : 'P'])) });
  });
  return { turmas: [t1, t2], prox: id };
}
let dados = banco.ler('cm_dados', null) ?? exemplos();
let turmaAtual = banco.ler('cm_atual', dados.turmas[0]?.id ?? null);
let aba = 'alunos';
const salvar = () => { banco.salvar('cm_dados', dados); banco.salvar('cm_atual', turmaAtual); };
const turma = () => dados.turmas.find((t) => t.id === turmaAtual);

/* ---------- Cálculos ---------- */
// falta justificada não conta contra a frequência (entra como abonada)
function freqAluno(t, a) {
  const aulas = t.aulas.filter((au) => au.pres[a.id]);
  const p = aulas.filter((au) => au.pres[a.id] === 'P').length;
  const f = aulas.filter((au) => au.pres[a.id] === 'F').length;
  const j = aulas.filter((au) => au.pres[a.id] === 'J').length;
  const total = aulas.length;
  return { p, f, j, total, pct: total ? Math.round(((p + j) / total) * 100) : null };
}
function freqTurma(t) {
  let pres = 0, tot = 0;
  t.aulas.forEach((au) => Object.values(au.pres).forEach((v) => { tot++; if (v !== 'F') pres++; }));
  return tot ? Math.round((pres / tot) * 100) : null;
}

/* ---------- Desenho ---------- */
function desenharTurmas() {
  $('#turmas').innerHTML = dados.turmas.map((t) => {
    const f = freqTurma(t);
    return `<button class="turma-btn" data-turma="${t.id}" aria-current="${t.id === turmaAtual}"><b>${escapar(t.nome)}</b>${f == null ? '<span></span>' : `<span class="freq ${f < t.min ? 'baixa' : ''}">${f}%</span>`}<small>${[t.disc, `${t.alunos.length} alunos`].filter(Boolean).map(escapar).join(' · ')}</small></button>`;
  }).join('');
}
function desenharCabecalho() {
  const t = turma();
  $('#conteudo').querySelectorAll('.cab__acoes .btn, .abas').forEach((el) => { el.hidden = !t; });
  if (!t) { $('#t-nome').textContent = 'Nenhuma turma'; $('#t-info').textContent = 'Crie a primeira turma para começar.'; $('#numeros').innerHTML = ''; return; }
  $('#t-nome').textContent = t.nome;
  $('#t-info').textContent = [t.disc, t.horario, `frequência mínima ${t.min}%`].filter(Boolean).join(' · ');
  const f = freqTurma(t);
  const abaixo = t.alunos.filter((a) => { const x = freqAluno(t, a); return x.pct != null && x.pct < t.min; }).length;
  const circ = 2 * Math.PI * 20;
  $('#numeros').innerHTML = `
    <div class="num anel"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8ef" stroke-width="6"/><circle cx="24" cy="24" r="20" fill="none" stroke="${f != null && f < t.min ? '#dc2626' : '#16a34a'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - (f ?? 0) / 100)}"/></svg><div><small>Frequência da turma</small><b>${f == null ? '—' : f + '%'}</b></div></div>
    <div class="num"><small>Alunos</small><b>${t.alunos.length}</b></div>
    <div class="num"><small>Aulas dadas</small><b>${t.aulas.length}</b></div>
    <div class="num ${abaixo ? 'alerta' : ''}"><small>Abaixo de ${t.min}%</small><b>${abaixo}</b></div>`;
}
function desenharAlunos() {
  const t = turma();
  if (!t) { $('#v-alunos').innerHTML = '<p class="vazio">—</p>'; return; }
  if (!t.alunos.length) { $('#v-alunos').innerHTML = '<p class="vazio">Nenhum aluno. Use “Editar turma” para colar a lista.</p>'; return; }
  const ult = [...t.aulas].sort((a, b) => a.data.localeCompare(b.data)).slice(-8);
  const corV = { P: 'var(--P)', F: 'var(--F)', J: 'var(--J)' };
  $('#v-alunos').innerHTML = `<table class="tabela"><thead><tr><th>Aluno</th><th>Frequência</th><th class="col-faltas">Faltas</th><th class="col-pontos">Últimas aulas</th></tr></thead><tbody>${
    [...t.alunos].sort((a, b) => a.nome.localeCompare(b.nome)).map((a) => {
      const x = freqAluno(t, a), baixa = x.pct != null && x.pct < t.min;
      return `<tr data-aluno="${a.id}" tabindex="0"><td><span class="aluno"><span class="ini" style="background:${cor(a.nome)}">${escapar(iniciais(a.nome))}</span>${escapar(a.nome)}${baixa ? ' <span class="selo">risco</span>' : ''}</span></td>
        <td><span class="barra-freq ${baixa ? 'baixa' : ''}"><span><i style="width:${x.pct ?? 0}%"></i></span><b>${x.pct == null ? '—' : x.pct + '%'}</b></span></td>
        <td class="col-faltas">${x.f}${x.j ? ` <small>(+${x.j} just.)</small>` : ''}</td>
        <td class="col-pontos"><span class="pontos">${ult.map((au) => `<i style="--c:${au.pres[a.id] ? corV[au.pres[a.id]] : '#e2e8ef'}" title="${dataBR(au.data, { day: '2-digit', month: '2-digit' })}: ${au.pres[a.id] ?? '—'}"></i>`).join('')}</span></td></tr>`;
    }).join('')}</tbody></table>`;
}
function desenharHistorico() {
  const t = turma();
  if (!t || !t.aulas.length) { $('#v-historico').innerHTML = '<p class="vazio">Nenhuma aula registrada. Toque em “Fazer chamada”.</p>'; return; }
  $('#v-historico').innerHTML = [...t.aulas].sort((a, b) => b.data.localeCompare(a.data)).map((au) => {
    const v = Object.values(au.pres), n = (k) => v.filter((x) => x === k).length;
    return `<div class="aula" data-aula="${au.id}" tabindex="0"><span class="data">${dataBR(au.data, { day: '2-digit', month: '2-digit' })}<small>${dataBR(au.data, { weekday: 'long' })}</small></span><span class="cont">${escapar(au.conteudo || 'Sem conteúdo registrado')}</span>
      <span class="contagem"><span class="c-P">${n('P')} P</span><span class="c-F">${n('F')} F</span>${n('J') ? `<span class="c-J">${n('J')} J</span>` : ''}</span><span class="chev" aria-hidden="true">›</span></div>`;
  }).join('');
}
function desenhar() { desenharTurmas(); desenharCabecalho(); desenharAlunos(); desenharHistorico(); }

/* ---------- Navegação ---------- */
$('#turmas').addEventListener('click', (e) => { const b = e.target.closest('[data-turma]'); if (b) { turmaAtual = +b.dataset.turma; salvar(); desenhar(); } });
$$('[data-aba]').forEach((b) => b.addEventListener('click', () => {
  aba = b.dataset.aba; $$('[data-aba]').forEach((x) => x.setAttribute('aria-selected', x === b));
  $('#v-alunos').hidden = aba !== 'alunos'; $('#v-historico').hidden = aba !== 'historico';
}));

/* ---------- Chamada ---------- */
let aulaEdit = null, pres = {};
function abrirChamada(aula) {
  const t = turma(); if (!t) return;
  if (!t.alunos.length) { toast('Adicione alunos na turma primeiro'); return; }
  aulaEdit = aula; $('#dlg-chamada').returnValue = '';
  pres = aula ? { ...aula.pres } : Object.fromEntries(t.alunos.map((a) => [a.id, 'P']));
  $('#ch-titulo').textContent = aula ? `Chamada de ${dataBR(aula.data)}` : `Chamada · ${t.nome}`;
  $('#c-data').value = aula?.data ?? iso(new Date());
  $('#c-conteudo').value = aula?.conteudo ?? '';
  const ex = $('#excluir-aula'); ex.hidden = !aula; ex.textContent = 'Excluir aula';
  desenharChamada();
  $('#dlg-chamada').showModal();
}
function desenharChamada() {
  const t = turma();
  $('#c-lista').innerHTML = [...t.alunos].sort((a, b) => a.nome.localeCompare(b.nome)).map((a) => `<li data-id="${a.id}"><span class="ini" style="background:${cor(a.nome)}">${escapar(iniciais(a.nome))}</span><span class="nome">${escapar(a.nome)}</span>
    <span class="pfj" role="group" aria-label="${escapar(a.nome)}">${['P', 'F', 'J'].map((v) => `<button type="button" data-v="${v}" aria-pressed="${pres[a.id] === v}" aria-label="${{ P: 'Presente', F: 'Falta', J: 'Falta justificada' }[v]}">${v}</button>`).join('')}</span></li>`).join('');
  resumoChamada();
}
function resumoChamada() {
  const v = Object.values(pres), n = (k) => v.filter((x) => x === k).length;
  const pl = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
  $('#c-resumo').textContent = `${pl(n('P'), 'presente', 'presentes')} · ${pl(n('F'), 'falta', 'faltas')}${n('J') ? ` · ${pl(n('J'), 'justificada', 'justificadas')}` : ''}`;
}
function marcar(id, v) {
  pres[id] = v;
  const li = $(`#c-lista li[data-id="${id}"]`);
  li.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v));
  resumoChamada();
}
$('#c-lista').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) marcar(+b.closest('li').dataset.id, b.dataset.v); });
$('#c-lista').addEventListener('keydown', (e) => {
  const k = e.key.toUpperCase(); if (!['P', 'F', 'J'].includes(k)) return;
  const li = e.target.closest('li'); if (!li) return;
  e.preventDefault(); marcar(+li.dataset.id, k);
  const prox = li.nextElementSibling?.querySelector(`[data-v="${k}"]`) || li.nextElementSibling?.querySelector('button');
  prox?.focus();
});
$$('[data-todos]').forEach((b) => b.addEventListener('click', () => { turma().alunos.forEach((a) => marcar(a.id, b.dataset.todos)); }));
$('#nova-aula').addEventListener('click', () => abrirChamada(null));
$('#v-historico').addEventListener('click', (e) => { const el = e.target.closest('[data-aula]'); if (el) abrirChamada(turma().aulas.find((a) => a.id === +el.dataset.aula)); });
$('#v-historico').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.aula) abrirChamada(turma().aulas.find((a) => a.id === +e.target.dataset.aula)); });
$('#form-chamada').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'salvar') return;
  const d = $('#c-data').value;
  if (turma().aulas.some((a) => a.data === d && a !== aulaEdit) && !e.submitter.dataset.ok) {
    e.preventDefault(); e.submitter.dataset.ok = '1'; e.submitter.textContent = 'Já existe aula nesse dia — salvar mesmo assim';
  }
});
$('#dlg-chamada').addEventListener('close', () => {
  const bt = $('#form-chamada button[value=salvar]'); delete bt.dataset.ok; bt.textContent = 'Salvar chamada';
  if ($('#dlg-chamada').returnValue !== 'salvar') return;
  const t = turma();
  const reg = { data: $('#c-data').value, conteudo: $('#c-conteudo').value.trim(), pres: { ...pres } };
  if (aulaEdit) Object.assign(aulaEdit, reg); else t.aulas.push({ id: Date.now(), ...reg });
  salvar(); desenhar(); toast(aulaEdit ? 'Chamada atualizada' : 'Chamada salva ✓');
});
$('#excluir-aula').addEventListener('click', (e) => {
  if (e.target.textContent !== 'Confirmar exclusão') { e.target.textContent = 'Confirmar exclusão'; return; }
  const t = turma(); t.aulas = t.aulas.filter((a) => a !== aulaEdit); salvar(); desenhar(); $('#dlg-chamada').close('excluir'); toast('Aula excluída');
});

/* ---------- Turma ---------- */
let turmaEdit = null;
function abrirTurma(t) {
  turmaEdit = t; $('#dlg-turma').returnValue = '';
  $('#tu-titulo').textContent = t ? 'Editar turma' : 'Nova turma';
  $('#tu-nome').value = t?.nome ?? ''; $('#tu-disc').value = t?.disc ?? ''; $('#tu-horario').value = t?.horario ?? ''; $('#tu-min').value = t?.min ?? 75;
  $('#tu-alunos').value = t ? t.alunos.map((a) => a.nome).join('\n') : '';
  $('#tu-nota').textContent = t ? 'Alunos removidos da lista saem da turma e do histórico de presença.' : '';
  const ex = $('#excluir-turma'); ex.hidden = !t; ex.textContent = 'Excluir turma';
  $('#dlg-turma').showModal();
}
$('#nova-turma').addEventListener('click', () => abrirTurma(null));
$('#editar-turma').addEventListener('click', () => abrirTurma(turma()));
$('#dlg-turma').addEventListener('close', () => {
  if ($('#dlg-turma').returnValue !== 'salvar') return;
  const nomes = [...new Set($('#tu-alunos').value.split('\n').map((n) => n.replace(/^\s*\d+[.)-]?\s*/, '').trim()).filter(Boolean))];
  const base = { nome: $('#tu-nome').value.trim(), disc: $('#tu-disc').value.trim(), horario: $('#tu-horario').value.trim(), min: Math.min(100, Math.max(0, +$('#tu-min').value || 75)) };
  if (turmaEdit) {
    // mantém o id (e o histórico) de quem continua na lista
    const antigos = new Map(turmaEdit.alunos.map((a) => [a.nome.toLowerCase(), a]));
    turmaEdit.alunos = nomes.map((n) => antigos.get(n.toLowerCase()) ?? { id: dados.prox++, nome: n });
    const ids = new Set(turmaEdit.alunos.map((a) => a.id));
    turmaEdit.aulas.forEach((au) => Object.keys(au.pres).forEach((k) => { if (!ids.has(+k)) delete au.pres[k]; }));
    Object.assign(turmaEdit, base);
  } else {
    const t = { id: Date.now(), ...base, alunos: nomes.map((n) => ({ id: dados.prox++, nome: n })), aulas: [] };
    dados.turmas.push(t); turmaAtual = t.id;
  }
  salvar(); desenhar(); toast(turmaEdit ? 'Turma atualizada' : `Turma criada com ${nomes.length} alunos`);
});
$('#excluir-turma').addEventListener('click', (e) => {
  if (e.target.textContent !== 'Confirmar exclusão') { e.target.textContent = 'Confirmar exclusão'; return; }
  dados.turmas = dados.turmas.filter((t) => t !== turmaEdit); turmaAtual = dados.turmas[0]?.id ?? null;
  salvar(); desenhar(); $('#dlg-turma').close('excluir'); toast('Turma excluída');
});

/* ---------- Aluno ---------- */
function abrirAluno(id) {
  const t = turma(), a = t.alunos.find((x) => x.id === id), x = freqAluno(t, a);
  $('#al-titulo').textContent = a.nome;
  const rot = { P: '<span class="c-P">Presente</span>', F: '<span class="c-F">Falta</span>', J: '<span class="c-J">Justificada</span>' };
  $('#al-corpo').innerHTML = `<p><b>${x.pct == null ? '—' : x.pct + '%'}</b> de frequência · ${x.p} presenças · ${x.f} faltas${x.j ? ` · ${x.j} justificadas` : ''}${x.pct != null && x.pct < t.min ? ` · <span class="selo">abaixo de ${t.min}%</span>` : ''}</p>
    <ul class="hist-aluno">${[...t.aulas].sort((p, q) => q.data.localeCompare(p.data)).map((au) => `<li><span>${dataBR(au.data, { day: '2-digit', month: '2-digit' })} · ${escapar(au.conteudo || 'Aula')}</span>${au.pres[a.id] ? rot[au.pres[a.id]].replace('<span', '<span style="border-radius:6px;padding:0 7px;font-weight:700;font-size:13px"') : '—'}</li>`).join('')}</ul>`;
  $('#dlg-aluno').showModal();
}
$('#v-alunos').addEventListener('click', (e) => { const tr = e.target.closest('[data-aluno]'); if (tr) abrirAluno(+tr.dataset.aluno); });
$('#v-alunos').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.dataset.aluno) abrirAluno(+e.target.dataset.aluno); });
$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

/* ---------- Exportar ---------- */
$('#exportar').addEventListener('click', () => {
  const t = turma(); if (!t) return;
  const aulas = [...t.aulas].sort((a, b) => a.data.localeCompare(b.data));
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const linhas = [['Aluno', ...aulas.map((a) => dataBR(a.data)), 'Presenças', 'Faltas', 'Justificadas', 'Frequência (%)'].map(q).join(';')];
  [...t.alunos].sort((a, b) => a.nome.localeCompare(b.nome)).forEach((a) => {
    const x = freqAluno(t, a);
    linhas.push([a.nome, ...aulas.map((au) => au.pres[a.id] ?? ''), x.p, x.f, x.j, x.pct ?? ''].map(q).join(';'));
  });
  const blob = new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = `frequencia-${t.nome.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast('Planilha de frequência baixada');
});

let timerToast;
function toast(msg) { const t = $('#toast'); (document.querySelector('dialog[open]') || document.body).append(t); t.textContent = msg; t.hidden = false; clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 2400); }

if (!turma() && dados.turmas[0]) turmaAtual = dados.turmas[0].id;
desenhar();
