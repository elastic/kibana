/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentEvalRow } from './load_eval_scores';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Faithful 1:1 TypeScript port of generate_token_usage_overview.py (matrix page).
// Reads agent_eval.jsonl and renders "Tokens per Model per Category": seven
// category cards, models sorted heaviest-first, each cell shows the average with
// the min-max range beneath.

const SHARED_CSS = `
  :root { color-scheme: dark; }
  body { font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    margin:0; background:#0e1014; color:#e8ebf2; padding:40px 20px 80px; text-align:center; }
  .wrap { max-width:1180px; margin:0 auto; }
  h1 { font-size:24px; font-weight:700; margin:0 0 6px; letter-spacing:-.01em; }
  h2 { font-size:17px; font-weight:600; margin:44px 0 12px; color:#e8ebf2; }
  .lead { color:#aeb6c4; margin:0 auto 4px; font-size:14px; max-width:760px; }
  p.sub { color:#9aa4b2; margin:0 auto 8px; font-size:13px; max-width:900px; }

  .cat-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:22px; margin:20px auto 0; max-width:1180px; }
  .cat-card { background:#14171e; border:1px solid #232a36; border-radius:12px; overflow:hidden; }
  .cat-card h3 { margin:0; padding:13px 16px; font-size:14px; font-weight:600; text-align:left;
    background:#1c212c; color:#e8ebf2; border-bottom:1px solid #2a3140; }
  table { border-collapse:separate; border-spacing:0; width:100%; font-size:13px; margin:0; }
  th,td { padding:9px 12px; vertical-align:middle; }
  thead th { color:#8b94a3; font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:.05em;
    border-bottom:1px solid #2a3140; }
  thead th.col-model { text-align:left; }
  thead th.col-num { text-align:right; }
  tbody td { border-top:1px solid #1d232e; }
  tbody tr:nth-child(even) { background:#171b22; }
  tbody tr:hover { background:#1f2530; }
  td.model { font-weight:600; text-align:left; white-space:nowrap; }
  td.num { font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }
  td.num.total-col { background:rgba(124,176,255,.06); }
  thead th.total-col { color:#9bb6e0; }
  .avgval { color:#e8ebf2; }
  .rangeval { color:#8b94a3; font-size:11px; display:block; }
  .err { color:#ffb066; }

  .cats { list-style:none; padding:0; margin:16px auto 0; max-width:920px; text-align:left;
    display:grid; grid-template-columns:1fr 1fr; gap:10px 28px; }
  .cats li { font-size:13px; line-height:1.5; color:#c7cedb; padding:12px 14px;
    background:#14171e; border:1px solid #232a36; border-radius:10px; }
  .cats b { color:#e8ebf2; display:block; margin-bottom:2px; font-size:13.5px; }
  .legend { color:#9aa4b2; font-size:12px; max-width:960px; margin:0 auto; text-align:left; }
  .legend code { color:#ffd9a8; background:rgba(255,255,255,.06); padding:1px 4px; border-radius:4px; }
  .legend p { line-height:1.7; }
  .note { color:#9aa4b2; font-size:12px; max-width:900px; margin:18px auto 0; }
  .keyrow { display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin:14px auto 0;
    color:#9aa4b2; font-size:12px; }
  .keyrow .avgval, .keyrow .rangeval { font-size:12px; display:inline; }
  @media (max-width:820px) { .cat-grid { grid-template-columns:1fr; } }
`;
const CATS_HTML = `<ul class="cats">
  <li><b>Alert Analysis</b>Triage an alert, reach the correct disposition, pull related alerts, and enrich with threat intel.</li>
  <li><b>Entity Analytics</b>Investigate hosts and users using purpose-built entity lookups and risk context.</li>
  <li><b>Threat Hunting</b>Generate and run queries against process, file, and network telemetry to find specific hunt artifacts.</li>
  <li><b>Detection Rules</b>Author a working detection rule, grounded in research where requested.</li>
  <li><b>Workflow Authoring</b>Produce a valid, executable automation workflow (verified by creating, enabling, and running it).</li>
  <li><b>Triggering Workflows</b>Call the correct backed action for the task &mdash; e.g. hash lookup, on-call schedule, case creation.</li>
  <li><b>Multi-Step Executions</b>Chain several steps in the right order, carrying findings forward, without skipping or fabricating steps.</li>
</ul>`;

const CAT_LABEL: Record<string, string> = {
  'alert-analysis': 'Alert Analysis',
  'entity-analytics': 'Entity Analytics',
  'threat-hunting': 'Threat Hunting',
  'detection-rule-edit': 'Detection Rules',
  'workflow-authoring': 'Workflow Authoring',
  'workflow-execution': 'Triggering Workflows',
  'multi-step': 'Multi-Step Executions',
};
const CAT_ORDER = Object.keys(CAT_LABEL);

// The eval JSONL tags each row with a coarse category code (C1..C5) in `category`
// and the precise capability in `prompt_id` (e.g. "alert-analysis-a"). The token
// overview groups by capability, so derive the capability key from prompt_id.
function capabilityKey(row: any): string {
  const pid = String(row.prompt_id || '').toLowerCase();
  for (const key of CAT_ORDER) {
    if (pid.startsWith(key)) return key;
  }
  return '';
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function fmt(v: number | null): string {
  return v !== null && v !== undefined ? Math.round(v).toLocaleString('en-US') : '\u2014';
}

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

interface Stat {
  min: number | null;
  max: number | null;
  med: number | null;
  avg: number | null;
  n: number;
}

function stats(vals: number[]): Stat {
  if (!vals.length) return { min: null, max: null, med: null, avg: null, n: 0 };
  return {
    min: Math.min(...vals),
    max: Math.max(...vals),
    med: median(vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    n: vals.length,
  };
}

function ok(r: any): boolean {
  return !r.error && typeof r.input_tokens === 'number' && typeof r.output_tokens === 'number';
}

interface Bucket {
  input: number[];
  output: number[];
  total: number[];
}
type ModelCategory = Map<string, Map<string, Bucket>>;

function buildModelCategory(rows: any[]): ModelCategory {
  const mc: ModelCategory = new Map();
  for (const r of rows.filter((row) => ok(row) && capabilityKey(row))) {
    const cap = capabilityKey(r);
    const i = r.input_tokens;
    const o = r.output_tokens;
    let cats = mc.get(r.model_name);
    if (!cats) {
      cats = new Map();
      mc.set(r.model_name, cats);
    }
    let b = cats.get(cap);
    if (!b) {
      b = { input: [], output: [], total: [] };
      cats.set(cap, b);
    }
    b.input.push(i);
    b.output.push(o);
    b.total.push(i + o);
  }
  return mc;
}

function numCell(s: Stat, extraCls = ''): string {
  const cls = `num ${extraCls}`.trim();
  if (s.n === 0) return `<td class="${cls} err">\u2014</td>`;
  return (
    `<td class="${cls}"><span class="avgval">${fmt(s.avg)}</span>` +
    `<span class="rangeval">${fmt(s.min)}&ndash;${fmt(s.max)}</span></td>`
  );
}

function categoryCard(mc: ModelCategory, ckey: string): string {
  const entries = [...mc.entries()]
    .map(([model, cats]) => ({ model, bucket: cats.get(ckey) }))
    .filter((e): e is { model: string; bucket: Bucket } => e.bucket !== undefined)
    .sort((a, b) => (stats(b.bucket.total).avg || 0) - (stats(a.bucket.total).avg || 0));
  const rows = entries
    .map(
      ({ model, bucket }) =>
        `<tr><td class="model">${escapeHtml(model)}</td>` +
        `${numCell(stats(bucket.input))}` +
        `${numCell(stats(bucket.output))}` +
        `${numCell(stats(bucket.total), 'total-col')}</tr>`
    )
    .join('');
  return (
    `<div class="cat-card"><h3>${escapeHtml(CAT_LABEL[ckey])}</h3>` +
    '<table><thead><tr>' +
    '<th class="col-model">Model</th>' +
    '<th class="col-num">Input</th><th class="col-num">Output</th>' +
    '<th class="col-num total-col">Total</th></tr></thead>' +
    `<tbody>${rows}</tbody></table></div>`
  );
}

function categoryGrid(mc: ModelCategory): string {
  const cards = CAT_ORDER.filter((c) => [...mc.values()].some((cats) => cats.has(c)))
    .map((c) => categoryCard(mc, c))
    .join('');
  return `<div class="cat-grid">${cards}</div>`;
}

const MATRIX_KEY = `<div class="keyrow">
  <span><span class="avgval">456,789</span> = average tokens for the task</span>
  <span><span class="rangeval">123,456&ndash;789,012</span> = range across the category&rsquo;s prompts</span>
  <span>Each category is its own table &middot; Input / Output / Total &middot; models sorted heaviest first</span>
</div>`;

export function renderTokenUsageOverviewMatrix(rows: any[]): string {
  const mc = buildModelCategory(rows);
  const nModels = mc.size;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Agent Builder \u2014 Tokens per Model per Category</title>
<style>${SHARED_CSS}</style></head><body>
<div class="wrap">
<h1>Agent Builder \u2014 Tokens per Model per Category</h1>
<p class="lead">Approximate token usage for completing a real task in each Security capability,
measured across ${nModels} model${nModels === 1 ? '' : 's'} in our Agent Builder evaluations.</p>
${CATS_HTML}

<h2>Tokens per model per category</h2>
${MATRIX_KEY}
${categoryGrid(mc)}
</div>
</body></html>`;
}

export function generateTokenUsageOverviewMatrix(rows: AgentEvalRow[]): {
  html: string;
  rowCount: number;
} {
  const html = renderTokenUsageOverviewMatrix(rows);
  return { html, rowCount: rows.length };
}
