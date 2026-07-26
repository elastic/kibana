/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentEvalRow } from './load_eval_scores';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

// Local port of the skill-dev plugin's matrix_persona_html.ts (Chrysalis-style
// "LLM performance by your role" report). The rendering logic is reproduced 1:1;
// a thin adapter builds the minimal report shape from agent_eval.jsonl per-row
// scores. NOTE: the canonical generator will move to the skill-dev plugin /
// elastic/kibana#273827 later — this local copy exists so the report renders
// end-to-end from the eval scripts today.

const PERSONA_CSS = `
:root {
  --ink:#1c1e23; --muted:#6a717d; --line:#e3e6eb; --bg:#f7f8fa;
  --card:#ffffff; --accent:#0b64dd; --accent-soft:#e7f0fd;
  --good:#16876a; --good-bg:#e3f5ee; --mid:#b06a00; --mid-bg:#fbf0dc;
  --bad:#b42f2f; --bad-bg:#fbe5e5; --na:#8a909c; --na-bg:#eef0f3;
  --radius:10px;
  --shadow: 0 1px 2px rgba(20,30,50,.06), 0 4px 16px rgba(20,30,50,.05);
}
* { box-sizing: border-box; }
body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  color:var(--ink); background:var(--bg); line-height:1.55; -webkit-font-smoothing:antialiased; }
.wrap { max-width:1080px; margin:0 auto; padding:40px 28px 96px; }
.eyebrow { color:var(--accent); font-weight:600; font-size:13px; letter-spacing:.04em; text-transform:uppercase; margin:0 0 6px; }
h1 { font-size:32px; line-height:1.2; margin:0 0 10px; letter-spacing:-.01em; }
h2 { font-size:22px; margin:48px 0 12px; letter-spacing:-.01em; padding-top:8px; }
p { margin:0 0 14px; }
.lede { font-size:17px; color:#3a3f48; max-width:780px; }
a { color:var(--accent); text-decoration:none; }
a:hover { text-decoration:underline; }
.meta { display:flex; flex-wrap:wrap; gap:10px; margin:18px 0 8px; }
.pill { background:var(--card); border:1px solid var(--line); border-radius:999px;
  padding:5px 12px; font-size:12.5px; color:var(--muted); box-shadow:var(--shadow); }
.pill b { color:var(--ink); font-weight:600; }

/* Tables */
table { border-collapse:collapse; width:100%; font-size:14px; }
.tablewrap { overflow-x:auto; }
thead th { text-align:center; font-size:12px; text-transform:uppercase; letter-spacing:.03em;
  color:var(--muted); font-weight:600; padding:11px 10px; border-bottom:2px solid var(--line);
  white-space:nowrap; background:var(--card); }
thead th.left, tbody td.left { text-align:left; }
tbody td { padding:10px 10px; border-bottom:1px solid var(--line); text-align:center;
  vertical-align:middle; font-variant-numeric:tabular-nums; }
tbody tr:hover { background:#fafbfd; }
tbody td.overall { font-weight:700; }

/* Matrix-specific */
table.matrix { font-size:13px; width:100%; }
table.matrix thead th { padding:9px 5px; font-size:10.5px; line-height:1.2; white-space:normal; }
table.matrix tbody td { padding:8px 5px; font-size:12px; }
table.matrix col.c-rank { width:34px; }
table.matrix col.c-model { width:160px; }
table.matrix col.c-num { width:60px; }
table.matrix td.left { font-size:12.5px; white-space:nowrap; }

/* Column groups */
thead tr.groups th { border-bottom:1px solid var(--line); padding-bottom:6px; }
th.group { text-transform:none; letter-spacing:0; font-size:12.5px; color:var(--ink); font-weight:700; }
th.group.ab { background:var(--accent-soft); color:var(--accent); border-radius:6px 6px 0 0; }
.ab-col { background:#f4f8fe; }
thead th.ab-col { background:#eaf2fd; }
.grouptag { display:block; font-size:10.5px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
td.sep-left, th.sep-left { border-left:2px solid #cfe0fa; }
td.sep-right, th.sep-right { border-right:2px solid #cfe0fa; }

/* Score shading */
td.sc { position:relative; }
td.low { color:var(--bad); background:var(--bad-bg); font-weight:600; }
td.mid { color:var(--mid); background:var(--mid-bg); }
td.high { color:var(--good); background:var(--good-bg); }

/* Vendor badges */
.vendor { display:inline-flex; align-items:center; justify-content:center; min-width:22px; height:22px;
  border-radius:6px; font-size:11px; font-weight:700; color:#fff; margin-right:6px; }
table.matrix .vendor { min-width:18px; height:18px; font-size:10px; }
.v-anthropic { background:#d97757; }
.v-openai { background:#10a37f; }
.v-google { background:#4285f4; }
.v-oss { background:#5a5f6b; }
.v-deepseek { background:#4d6bfe; }
.v-mistral { background:#fa5310; }
.v-moonshot { background:#1f2a44; }

/* Token tiers */
.tier { display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.tier .n { font-weight:500; opacity:.75; font-size:10.5px; }
.tier-lean { background:var(--good-bg); color:var(--good); }
.tier-mod { background:var(--mid-bg); color:var(--mid); }
.tier-heavy { background:var(--bad-bg); color:var(--bad); }
.toklegend { display:flex; flex-wrap:wrap; gap:10px; margin:4px 0 0; }

/* Card wrapper used around tables */
.card { background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
  box-shadow:var(--shadow); padding:20px 22px; margin:16px 0; }
.bleed { width:100vw; position:relative; left:50%; right:50%; margin-left:-50vw; margin-right:-50vw; padding:0 28px; }

/* Persona picker */
.personas { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:8px 0 4px; }
.pbtn { text-align:left; background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
  padding:12px 14px; box-shadow:var(--shadow); cursor:pointer; font:inherit; color:var(--ink);
  transition:border-color .12s, box-shadow .12s, transform .06s; }
.pbtn:hover { border-color:#bcd2f2; }
.pbtn .role { font-weight:700; font-size:14px; display:block; }
.pbtn .sub { color:var(--muted); font-size:12px; }

/* Persona detail cards */
.pdetail { margin-top:14px; }
.pcard { background:var(--card); border:1px solid var(--line); border-radius:var(--radius);
  box-shadow:var(--shadow); padding:18px 20px; }
.pcard.hidden { display:none; }
.pcard h3 { margin:0 0 4px; font-size:18px; }
.pcard .who { color:var(--muted); font-size:13px; margin:0 0 12px; }
.pgrid { display:grid; grid-template-columns:1.2fr 1fr; gap:18px; }
.pgrid .label { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin:0 0 4px; font-weight:600; }
.pick-big { font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px; margin:0 0 2px; }
.pick-score { color:var(--good); font-weight:700; }
.runner { color:var(--ink); font-size:13.5px; margin:8px 0 0; }
.avoid { color:var(--bad); font-size:13px; margin:10px 0 0; }
.matters { background:var(--accent-soft); border-radius:8px; padding:10px 12px; font-size:13px; color:#143e78; }
.matters b { color:#0b3a72; }

/* Footer / misc */
.foot { color:var(--muted); font-size:12.5px; border-top:1px solid var(--line); margin-top:40px; padding-top:16px; }
.hint { color:var(--muted); font-size:13px; margin:2px 0 14px; }

@media (max-width:900px) { .personas { grid-template-columns:repeat(2,1fr); } .pgrid { grid-template-columns:1fr; } }
`;
const PERSONA_JS = `
  (function () {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.pbtn'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('.pcard'));
    var tables = Array.prototype.slice.call(document.querySelectorAll('table.matrix'));

    function clearFocus() {
      tables.forEach(function (t) {
        t.querySelectorAll('.focuscol').forEach(function (el) { el.classList.remove('focuscol'); });
        t.querySelectorAll('col.focus').forEach(function (el) { el.classList.remove('focus'); });
      });
    }

    function applyFocus(colKeys) {
      clearFocus();
      if (!colKeys || !colKeys.length) return;
      tables.forEach(function (t) {
        colKeys.forEach(function (key) {
          t.querySelectorAll('[data-col="' + key + '"]').forEach(function (el) {
            if (el.tagName === 'COL') { el.classList.add('focus'); }
            else { el.classList.add('focuscol'); }
          });
        });
      });
    }

    function select(persona, scroll) {
      buttons.forEach(function (b) { b.classList.toggle('active', b.dataset.persona === persona); });
      cards.forEach(function (c) { c.classList.toggle('hidden', c.dataset.persona !== persona); });
      var btn = buttons.filter(function (b) { return b.dataset.persona === persona; })[0];
      var cols = btn && btn.dataset.cols ? btn.dataset.cols.split(',') : [];
      applyFocus(cols);
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { select(b.dataset.persona, false); });
    });

    // initialize with the first (CISO) persona focus
    var first = buttons[0];
    if (first) { applyFocus(first.dataset.cols ? first.dataset.cols.split(',') : []); }
  })();
`;

// -------------------------------------------------------------------------
// minimal report shape (subset of MatrixReportJson actually read here)
// -------------------------------------------------------------------------
interface CellScore {
  score10?: number | null;
}
interface ModelReport {
  modelId: string;
  cells?: Record<string, Record<string, CellScore | null>>;
  compositeScores?: { internalScore?: number | null; externalScore?: number | null };
}
interface TokenModel {
  modelId: string;
  medianTotalTokens: number | null;
  cells?: Array<{ category: string; totalTokens: number | null }>;
}
interface MatrixReport {
  models: ModelReport[];
  tokenCost?: { models: TokenModel[] };
  metadata: { generatedAt: string };
}

const PERSONA_COLUMNS = [
  { id: 'overall', label: 'Overall', short: 'Overall', cat: null },
  { id: 'ab', label: 'Agent\u00a0Builder', short: 'AB', cat: 'agent_builder' },
  { id: 'alert', label: 'Alert\u00a0Analysis', short: 'Alert', cat: 'C1' },
  { id: 'entity', label: 'Entity\u00a0Analytics', short: 'Entity', cat: 'C3' },
  { id: 'hunt', label: 'Threat\u00a0Hunting', short: 'Hunt', cat: 'C3' },
  { id: 'detrules', label: 'Detection\u00a0Rules', short: 'Rules', cat: 'C2' },
  { id: 'wfauth', label: 'Workflow\u00a0Authoring', short: 'Wf Auth', cat: 'C4' },
  { id: 'wftrig', label: 'Triggering\u00a0Workflows', short: 'Wf Trig', cat: 'C4' },
  { id: 'multistep', label: 'Multi-Step\u00a0Exec.', short: 'Multi', cat: 'C5' },
  { id: 'ad', label: 'Attack\u00a0Discovery', short: 'Attack D', cat: 'C6' },
  { id: 'migration', label: 'Automatic\u00a0Migration', short: 'Migration', cat: 'C7' },
  { id: 'tokens', label: 'Tokens\u00a0/\u00a0task', short: 'Tokens', cat: null },
];

interface ColumnData {
  id: string;
  score: number | null;
}
interface ModelRow {
  rank: number;
  modelName: string;
  modelId: string;
  vendorCls: string;
  vendor: string;
  overallScore: number | null;
  agentBuilderScore: number | null;
  columns: ColumnData[];
  tokenTier: { tier: string; label: string; avgTokens: number | null };
  isOss: boolean;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function vendorClass(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes('anthropic') || id.includes('claude')) return 'v-anthropic';
  if (id.includes('openai') || id.includes('gpt')) return 'v-openai';
  if (id.includes('gemini') || id.includes('google')) return 'v-google';
  if (id.includes('deepseek')) return 'v-deepseek';
  if (id.includes('mistral')) return 'v-mistral';
  if (id.includes('kimi')) return 'v-moonshot';
  if (id.includes('llama') || id.includes('qwen')) return 'v-oss';
  return 'v-oss';
}

function vendorLabel(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes('anthropic') || id.includes('claude')) return 'A';
  if (id.includes('openai') || id.includes('gpt')) return 'O';
  if (id.includes('gemini') || id.includes('google')) return 'G';
  if (id.includes('deepseek')) return 'D';
  if (id.includes('mistral')) return 'M';
  if (id.includes('kimi')) return 'K';
  return '?';
}

function formatScore10(v: number | null): string {
  return v == null ? '\u2014' : v.toFixed(2);
}

function scoreBandClass(v: number | null): string {
  if (v == null) return '';
  if (v >= 7) return 'high';
  if (v >= 5) return 'mid';
  return 'low';
}

function isOssModel(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.includes('llama') || id.includes('qwen') || id.includes('mistral') || id.includes('deepseek')
  );
}

function makeTokenTier(
  model: ModelReport,
  tokenModels: Array<{ modelId: string; medianTotalTokens: number | null }>
): { tier: string; label: string; avgTokens: number | null } {
  const tc = tokenModels.find((t) => t.modelId === model.modelId);
  if (!tc) return { tier: 'na', label: '\u2014', avgTokens: null };
  const medianTokens = tc.medianTotalTokens;
  if (medianTokens == null) return { tier: 'na', label: '\u2014', avgTokens: null };
  if (medianTokens < 150000) {
    return {
      tier: 'lean',
      label: `Lean <span class="n">${(medianTokens / 1000).toFixed(0)}K</span>`,
      avgTokens: medianTokens,
    };
  }
  if (medianTokens < 350000) {
    return {
      tier: 'mod',
      label: `Moderate <span class="n">${(medianTokens / 1000).toFixed(0)}K</span>`,
      avgTokens: medianTokens,
    };
  }
  return {
    tier: 'heavy',
    label: `Heavy <span class="n">${(medianTokens / 1000).toFixed(0)}K</span>`,
    avgTokens: medianTokens,
  };
}

function shortModelName(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes('claude-opus'))
    return modelId.replace(/.*claude-opus/i, 'Claude Opus').replace(/-/g, ' ');
  if (id.includes('claude-sonnet'))
    return modelId.replace(/.*claude-sonnet/i, 'Claude Sonnet').replace(/-/g, ' ');
  if (id.includes('claude-haiku'))
    return modelId.replace(/.*claude-haiku/i, 'Claude Haiku').replace(/-/g, ' ');
  if (id.includes('gpt-')) return modelId.replace(/.*gpt-/i, 'GPT-').replace(/-/g, '.');
  if (id.includes('gemini')) return modelId.replace(/.*gemini/i, 'Gemini').replace(/-/g, ' ');
  return modelId.replace(/_/g, ' ').replace(/-/g, ' ');
}

function getScore(
  cells: Record<string, Record<string, CellScore | null>> | undefined,
  category: string,
  layer: string
): number | null {
  if (!cells) return null;
  const cat = cells[category];
  if (!cat) return null;
  const val = cat[layer];
  if (!val) return null;
  return val.score10 ?? null;
}

function buildRows(report: MatrixReport): ModelRow[] {
  const tokenModels = report.tokenCost?.models ?? [];
  const rows: ModelRow[] = report.models.map((m) => {
    const cells = m.cells ?? {};
    const colScores: Record<string, number | null> = {
      alert: getScore(cells, 'C1', 'L3'),
      entity: getScore(cells, 'C3', 'L3'),
      hunt: getScore(cells, 'C3', 'L3'),
      detrules: getScore(cells, 'C2', 'L3'),
      wfauth: getScore(cells, 'C4', 'L3'),
      wftrig: getScore(cells, 'C4', 'L3'),
      multistep: getScore(cells, 'C5', 'L3'),
      ad: getScore(cells, 'C6', 'L3'),
      migration: getScore(cells, 'C7', 'L3'),
    };

    const abScores = [
      colScores.alert,
      colScores.entity,
      colScores.hunt,
      colScores.detrules,
      colScores.wfauth,
      colScores.wftrig,
      colScores.multistep,
    ].filter((s): s is number => s != null);
    const agentBuilderScore =
      abScores.length > 0 ? abScores.reduce((a, b) => a + b, 0) / abScores.length : null;

    const overallScores = [...abScores, colScores.ad, colScores.migration].filter(
      (s): s is number => s != null
    );
    let overallScore =
      overallScores.length > 0
        ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
        : null;

    if (m.compositeScores?.externalScore != null) {
      overallScore = m.compositeScores.externalScore;
    } else if (m.compositeScores?.internalScore != null) {
      overallScore = m.compositeScores.internalScore;
    }

    const columns: ColumnData[] = [
      { id: 'overall', score: overallScore },
      { id: 'ab', score: agentBuilderScore },
      { id: 'alert', score: colScores.alert },
      { id: 'entity', score: colScores.entity },
      { id: 'hunt', score: colScores.hunt },
      { id: 'detrules', score: colScores.detrules },
      { id: 'wfauth', score: colScores.wfauth },
      { id: 'wftrig', score: colScores.wftrig },
      { id: 'multistep', score: colScores.multistep },
      { id: 'ad', score: colScores.ad },
      { id: 'migration', score: colScores.migration },
      { id: 'tokens', score: null },
    ];

    return {
      rank: 0,
      modelName: shortModelName(m.modelId),
      modelId: m.modelId,
      vendorCls: vendorClass(m.modelId),
      vendor: vendorLabel(m.modelId),
      overallScore,
      agentBuilderScore,
      columns,
      tokenTier: makeTokenTier(m, tokenModels),
      isOss: isOssModel(m.modelId),
    };
  });

  rows.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

const TOKEN_TABLE_COLUMNS = [
  { key: 'C1', label: 'Alert' },
  { key: 'C2', label: 'Det. Rules' },
  { key: 'C3', label: 'Investigation' },
  { key: 'C4', label: 'WF Exec' },
  { key: 'C6', label: 'Attack Discovery' },
];

interface TokenCell {
  category: string;
  totalTokens: number | null;
}
interface TokenRow {
  modelName: string;
  cells: TokenCell[];
}

function buildTokenRows(report: MatrixReport): TokenRow[] {
  const tc = report.tokenCost;
  if (!tc) return [];
  return tc.models.map((m) => {
    const cells: TokenCell[] = TOKEN_TABLE_COLUMNS.map((col) => {
      const cell = m.cells?.find((c) => c.category === col.key);
      return { category: col.label, totalTokens: cell?.totalTokens ?? null };
    });
    return { modelName: shortModelName(m.modelId), cells };
  });
}

function tokenTierFor(
  value: number | null,
  allValues: (number | null)[]
): { tier: 'lean' | 'mod' | 'heavy'; label: string } {
  const valid = allValues.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (value == null || valid.length === 0) return { tier: 'lean', label: '\u2014' };
  const rank = valid.filter((v) => v < value).length;
  const tertile = Math.min(2, Math.floor((rank / valid.length) * 3));
  const label = `${Math.round(value / 1000)}K`;
  if (tertile === 0) return { tier: 'lean', label };
  if (tertile === 1) return { tier: 'mod', label };
  return { tier: 'heavy', label };
}

function renderTokenTable(report: MatrixReport): string {
  const rows = buildTokenRows(report);
  if (!rows.length) return '';
  const colTokens: Record<string, (number | null)[]> = {};
  for (const col of TOKEN_TABLE_COLUMNS) {
    colTokens[col.label] = rows.map((r) => {
      const cell = r.cells.find((c) => c.category === col.label);
      return cell?.totalTokens ?? null;
    });
  }
  const blendedValues = rows.map((r) => {
    const valid = r.cells.map((c) => c.totalTokens).filter((v): v is number => v != null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  });
  const colgroup = `<col class="c-model" style="width:210px;" />${TOKEN_TABLE_COLUMNS.map(
    () => '<col class="c-num" />'
  ).join('')}<col class="c-num" />`;
  const headerCells = `${TOKEN_TABLE_COLUMNS.map((c) => `<th>${escapeHtml(c.label)}</th>`).join(
    ''
  )}<th>Blended</th>`;
  const bodyRows = rows.map((r, i) => {
    const cellHtml = r.cells
      .map((c) => {
        const tier = tokenTierFor(c.totalTokens, colTokens[c.category] ?? []);
        return `<td class="tokcell"><span class="tier tier-${tier.tier}">${tier.label}</span></td>`;
      })
      .join('');
    const blendedTier = tokenTierFor(blendedValues[i] ?? null, blendedValues);
    const blendedLabel =
      blendedValues[i] != null ? `${Math.round(blendedValues[i]! / 1000)}K` : '\u2014';
    return `<tr><td class="left">${escapeHtml(
      r.modelName
    )}</td>${cellHtml}<td class="tokcell"><span class="tier tier-${
      blendedTier.tier
    }">${blendedLabel}</span></td></tr>`;
  });
  return `<table class="matrix">
    <colgroup>${colgroup}</colgroup>
    <thead><tr><th class="left">Model</th>${headerCells}</tr></thead>
    <tbody>${bodyRows.join('')}</tbody>
  </table>`;
}

function renderMatrixTable(rows: ModelRow[], id: string): string {
  const colgroup = PERSONA_COLUMNS.map((c) => {
    if (c.id === 'tokens') return '<col style="width:110px;" />';
    return '<col class="c-num" />';
  }).join('');

  const groupRow = `
    <tr class="groups">
      <th class="rank"></th>
      <th class="left"></th>
      <th></th>
      <th class="group ab sep-left sep-right" colspan="8">Agent Builder <span class="grouptag">overall + 7 sub-capabilities</span></th>
      <th class="group">Attack&nbsp;Discovery</th>
      <th class="group">Automatic&nbsp;Migration</th>
      <th class="group">Efficiency</th>
    </tr>`;

  const headerCells = PERSONA_COLUMNS.map((c) => {
    const clsParts: string[] = [];
    if (c.id === 'overall') clsParts.push('overall');
    if (c.id === 'ab') clsParts.push('ab-col', 'sep-left');
    if (['alert', 'entity', 'hunt', 'detrules', 'wfauth', 'wftrig'].includes(c.id))
      clsParts.push('ab-col');
    if (c.id === 'multistep') clsParts.push('ab-col', 'sep-right');
    if (c.id === 'tokens') clsParts.push('left');
    const cls = clsParts.length ? ` class="${clsParts.join(' ')}"` : '';
    return `<th${cls}>${c.label.replace(/\u00a0/g, '&nbsp;')}</th>`;
  }).join('');

  const bodyRows = rows
    .map((r) => {
      const modelCell = `<td class="left"><span class="model"><span class="vendor ${r.vendorCls}">${
        r.vendor
      }</span>${escapeHtml(r.modelName)}</span></td>`;
      const colCells = r.columns
        .map((c) => {
          if (c.id === 'overall') {
            return `<td class="overall sc ${scoreBandClass(
              c.score
            )}" data-col="overall">${formatScore10(c.score)}</td>`;
          }
          if (c.id === 'ab') {
            return `<td class="ab-col sep-left sc ${scoreBandClass(
              c.score
            )}" data-col="ab">${formatScore10(c.score)}</td>`;
          }
          if (c.id === 'tokens') {
            return `<td class="tokcell" data-col="tokens"><span class="tier tier-${r.tokenTier.tier}">${r.tokenTier.label}</span></td>`;
          }
          const clsParts: string[] = ['sc'];
          if (scoreBandClass(c.score)) clsParts.push(scoreBandClass(c.score));
          if (['alert', 'entity', 'hunt', 'detrules', 'wfauth', 'wftrig'].includes(c.id))
            clsParts.push('ab-col');
          if (c.id === 'multistep') clsParts.push('ab-col', 'sep-right');
          return `<td class="${clsParts.join(' ')}" data-col="${c.id}">${formatScore10(
            c.score
          )}</td>`;
        })
        .join('');
      return `<tr>
      <td class="rank">${r.rank}</td>
      ${modelCell}
      ${colCells}
    </tr>`;
    })
    .join('');

  return `
    <table class="matrix" id="${id}">
      <colgroup>${colgroup}</colgroup>
      <thead>
        ${groupRow}
        <tr><th class="rank">#</th><th class="left">Model</th>${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
}

const PERSONAS: Array<{ id: string; label: string; sub: string; cols: string[] }> = [
  {
    id: 'ciso',
    label: 'CISO / Leadership',
    sub: 'One defensible number, and how we know',
    cols: ['overall', 'tokens'],
  },
  {
    id: 'socmgr',
    label: 'SOC Manager',
    sub: 'Day-to-day triage throughput',
    cols: ['alert', 'ab', 'tokens'],
  },
  {
    id: 'hunter',
    label: 'Threat Hunter',
    sub: 'Querying telemetry, chaining findings',
    cols: ['hunt', 'multistep'],
  },
  {
    id: 'deteng',
    label: 'Detection Engineer',
    sub: 'Authoring & migrating rules',
    cols: ['detrules', 'migration'],
  },
  {
    id: 'soar',
    label: 'Automation / SOAR',
    sub: 'Building & triggering workflows',
    cols: ['wfauth', 'wftrig', 'multistep'],
  },
  { id: 'ir', label: 'Incident Response', sub: 'Correlating attacks at scale', cols: ['ad'] },
  {
    id: 'platform',
    label: 'Self-managed / Air-gapped',
    sub: 'Running the model yourself',
    cols: ['ab', 'overall', 'tokens'],
  },
];

function pickTopModel(
  rows: ModelRow[],
  colId: string
): { row: ModelRow; score: number | null } | null {
  const scored = rows
    .map((r) => ({ row: r, score: r.columns.find((c) => c.id === colId)?.score ?? r.overallScore }))
    .filter((x) => x.score != null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return scored[0] ?? null;
}

function pickRunnerUp(
  rows: ModelRow[],
  winnerId: string,
  colId: string
): { row: ModelRow; score: number | null } | null {
  const scored = rows
    .map((r) => ({ row: r, score: r.columns.find((c) => c.id === colId)?.score ?? r.overallScore }))
    .filter((x) => x.score != null && x.row.modelId !== winnerId)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return scored[0] ?? null;
}

function renderPersonaCards(rows: ModelRow[]): string {
  const buttons = PERSONAS.map((p, i) => {
    const active = i === 0 ? ' active' : '';
    return `<button class="pbtn${active}" data-persona="${p.id}" data-cols="${p.cols.join(',')}">
      <span class="role">${escapeHtml(p.label)}</span>
      <span class="sub">${escapeHtml(p.sub)}</span>
    </button>`;
  }).join('');

  const cards = PERSONAS.map((p, i) => {
    const primaryCol = p.cols[0] ?? 'overall';
    const top = pickTopModel(rows, primaryCol);
    const runner = top ? pickRunnerUp(rows, top.row.modelId, primaryCol) : null;
    const topScore = top?.score ?? null;
    const topHtml = top
      ? `<p class="pick-big"><span class="vendor ${top.row.vendorCls}">${
          top.row.vendor
        }</span>${escapeHtml(top.row.modelName)} <span class="pick-score">${formatScore10(
          topScore
        )}</span></p>`
      : `<p class="pick-big">\u2014</p>`;
    const runnerHtml = runner
      ? `<p class="runner"><b>Runner-up:</b> ${escapeHtml(runner.row.modelName)} (${formatScore10(
          runner.score
        )}).</p>`
      : '';
    const hidden = i === 0 ? '' : ' hidden';
    return `<div class="pcard${hidden}" data-persona="${p.id}">
      <h3>${escapeHtml(p.label)}</h3>
      <p class="who">${escapeHtml(p.sub)}</p>
      <div class="pgrid">
        <div>
          <p class="label">Top pick \u2014 by ${escapeHtml(
            PERSONA_COLUMNS.find((c) => c.id === primaryCol)?.short ?? primaryCol
          )} score</p>
          ${topHtml}
          ${runnerHtml}
          <p class="avoid"><b>Avoid relying on:</b> models below ~5 Overall \u2014 they failed one or more capability areas.</p>
        </div>
        <div class="matters">
          <p style="margin:0 0 6px;"><b>The number that matters to you:</b> <b>${escapeHtml(
            PERSONA_COLUMNS.find((c) => c.id === primaryCol)?.label.replace(/\u00a0/g, ' ') ??
              primaryCol
          )}</b> \u2014 ${escapeHtml(p.sub)}.</p>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<h2 id="roles">Find the model for your role</h2>
<p class="hint">Pick a role. We surface the score that matters most for that job, the top model, a runner-up, and what to steer clear of.</p>
<div class="personas" role="tablist" aria-label="Security roles">${buttons}</div>
<div class="pdetail">${cards}</div>`;
}

export function renderPersonaMatrixHtml(report: MatrixReport): string {
  const rows = buildRows(report);
  const meta = report.metadata;
  const generated = new Date(meta.generatedAt).toISOString().slice(0, 10);
  const count = rows.length;
  const propRows = rows.filter((r) => !r.isOss);
  const ossRows = rows.filter((r) => r.isOss);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LLM performance for Elastic Security \u2014 by your role</title>
<style>${PERSONA_CSS}</style>
</head>
<body>
<div class="wrap">
  <p class="eyebrow">Elastic Security \u00b7 AI</p>
  <h1>Which model should you use? Start with your role.</h1>
  <p class="lede">
    We evaluated large language models across the Security work your team actually does \u2014 alert triage,
    entity analytics, threat hunting, detection-rule authoring, workflow automation, multi-step response,
    Attack Discovery, and automatic migration. Pick your role below to see the model that fits your job,
    then drop into the full matrix for the detail.
  </p>

  <div class="meta">
    <span class="pill">Evaluated on <b>${escapeHtml(generated)}</b></span>
    <span class="pill">Models tested <b>${count}</b></span>
    <span class="pill"><a href="#matrix">Full matrix \u2192</a></span>
    <span class="pill"><a href="#tokens">Token efficiency \u2192</a></span>
  </div>

  ${renderPersonaCards(rows)}

  <h2 id="matrix">Full matrix</h2>
  <div class="card" style="padding:0; overflow:hidden;">
    <div class="tablewrap">
      ${renderMatrixTable(propRows, 'matrix-prop')}
    </div>
  </div>

  ${
    ossRows.length > 0
      ? `<h3>Open-source models</h3><div class="card" style="padding:0; overflow:hidden;"><div class="tablewrap">${renderMatrixTable(
          ossRows,
          'matrix-oss'
        )}</div></div>`
      : ''
  }

  ${
    report.tokenCost?.models?.length
      ? `<h2 id="tokens">Token efficiency</h2>
  <div class="toklegend" style="margin:0 0 14px;">
    <span class="tier tier-lean">Lean <span class="n">lightest third</span></span>
    <span class="tier tier-mod">Moderate <span class="n">middle third</span></span>
    <span class="tier tier-heavy">Heavy <span class="n">heaviest third</span></span>
  </div>
  <div class="bleed"><div class="card" style="padding:0; overflow:hidden;"><div class="tablewrap">
    ${renderTokenTable(report)}
  </div></div></div>
  <p class="hint" style="margin-top:10px;">Cells with &ldquo;&mdash;&rdquo; indicate missing data for that model &times; category.</p>`
      : ''
  }

  <div class="foot">
    Generated ${escapeHtml(
      generated
    )} \u00b7 ${count} models \u00b7 scores 0\u201310 \u00b7 higher is better.
  </div>
</div>
<script>${PERSONA_JS}</script>
</body>
</html>`;
}

// -------------------------------------------------------------------------
// adapter: build the minimal report from agent_eval.jsonl per-row scores
// -------------------------------------------------------------------------
function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function buildReportFromEvalRows(rows: any[]): MatrixReport {
  // Group rows by model, then by coarse category (C1..C5 in this dataset).
  const byModel = new Map<string, any[]>();
  for (const r of rows) {
    const key = r.model_id || r.model_name;
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(r);
  }

  const models: ModelReport[] = [];
  const tokenModels: TokenModel[] = [];

  for (const [modelId, mrows] of byModel) {
    // Per-category criteria_score mean -> 0-10 score10 under layer L3.
    const cells: Record<string, Record<string, CellScore | null>> = {};
    const catScores = new Map<string, number[]>();
    const catTokens = new Map<string, number[]>();
    const allTokens: number[] = [];
    for (const r of mrows) {
      const cat = r.category;
      const cs = typeof r.criteria_score === 'number' ? r.criteria_score : null;
      if (cat && cs != null) {
        if (!catScores.has(cat)) catScores.set(cat, []);
        catScores.get(cat)!.push(cs);
      }
      const tot = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
      if (tot > 0) {
        if (cat) {
          if (!catTokens.has(cat)) catTokens.set(cat, []);
          catTokens.get(cat)!.push(tot);
        }
        allTokens.push(tot);
      }
    }
    for (const [cat, scores] of catScores) {
      const mean10 = (scores.reduce((a, b) => a + b, 0) / scores.length) * 10;
      cells[cat] = { L3: { score10: mean10 } };
    }
    models.push({ modelId, cells });

    tokenModels.push({
      modelId,
      medianTotalTokens: allTokens.length ? median(allTokens) : null,
      cells: [...catTokens.entries()].map(([category, toks]) => ({
        category,
        totalTokens: toks.length ? median(toks) : null,
      })),
    });
  }

  return {
    models,
    tokenCost: { models: tokenModels },
    metadata: { generatedAt: new Date().toISOString() },
  };
}

export function generatePersonaMatrix(rows: AgentEvalRow[]): { html: string; rowCount: number } {
  const report = buildReportFromEvalRows(rows);
  const html = renderPersonaMatrixHtml(report);
  return { html, rowCount: rows.length };
}
