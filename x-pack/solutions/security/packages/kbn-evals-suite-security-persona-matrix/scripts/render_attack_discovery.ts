/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoveryRow } from './load_eval_scores';

/* eslint-disable @typescript-eslint/no-explicit-any, complexity */

// Faithful 1:1 TypeScript port of render_attack_discovery_html.py.
// Renders attack_discovery_results.jsonl into a self-contained dark-theme HTML
// report: per-model summary table + per-discovery cards (title, MITRE tactic
// chips, risk band, alert count, summary + details markdown).

const AD_CSS = `:root {
    --bg:#0f1115; --panel:#171a21; --panel2:#1f2430; --border:#2a3140;
    --text:#e6e9ef; --muted:#9aa4b2; --accent:#6ea8fe;
    --crit:#ff5d6c; --high:#ff9f43; --med:#ffd166; --low:#5fd0a0;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1080px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:24px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:13px; }
  table { width:100%; border-collapse:collapse; background:var(--panel);
    border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:32px; }
  th,td { padding:10px 14px; text-align:left; border-bottom:1px solid var(--border); }
  th { background:var(--panel2); color:var(--muted); font-size:12px;
    text-transform:uppercase; letter-spacing:.04em; }
  tr:last-child td { border-bottom:none; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  td.model { font-weight:600; }
  .model-id { color:var(--muted); font-weight:400; font-size:12px; font-family:ui-monospace,monospace; }
  .status { padding:2px 8px; border-radius:20px; font-size:12px; font-weight:600; }
  .status.ok { background:rgba(95,208,160,.15); color:var(--low); }
  .status.err { background:rgba(255,93,108,.15); color:var(--crit); }
  .status.warn { background:rgba(255,209,102,.15); color:var(--med); }
  .card { background:var(--panel); border:1px solid var(--border);
    border-radius:12px; padding:18px 20px; margin-bottom:22px; }
  .card-head { display:flex; align-items:baseline; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-bottom:10px; }
  .card-head h2 { font-size:18px; margin:0; }
  .meta { color:var(--muted); font-size:13px; display:flex; gap:8px; flex-wrap:wrap; }
  details.disc { border:1px solid var(--border); border-radius:9px;
    margin-top:10px; background:var(--panel2); }
  details.disc summary { list-style:none; cursor:pointer; padding:11px 14px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  details.disc summary::-webkit-details-marker { display:none; }
  .disc-num { width:22px; height:22px; flex:none; border-radius:50%;
    background:var(--border); color:var(--text); display:grid; place-items:center;
    font-size:12px; font-weight:700; }
  .disc-title { font-weight:600; flex:1 1 auto; min-width:200px; }
  .risk { font-size:12px; font-weight:700; padding:2px 9px; border-radius:20px; flex:none; }
  .risk.crit { background:rgba(255,93,108,.18); color:var(--crit); }
  .risk.high { background:rgba(255,159,67,.18); color:var(--high); }
  .risk.med { background:rgba(255,209,102,.18); color:var(--med); }
  .risk.low { background:rgba(95,208,160,.18); color:var(--low); }
  .alert-count { font-size:12px; color:var(--muted); flex:none; }
  .disc-body { padding:0 14px 14px; border-top:1px solid var(--border); }
  .chips { margin:12px 0 8px; display:flex; gap:6px; flex-wrap:wrap; }
  .chip { font-size:11px; background:rgba(110,168,254,.14); color:var(--accent);
    border:1px solid rgba(110,168,254,.25); padding:2px 9px; border-radius:20px; }
  .summary { font-weight:500; margin:6px 0 10px; }
  .details p { margin:6px 0; color:var(--text); }
  .details ul { margin:6px 0; padding-left:20px; }
  .details li { margin:5px 0; color:#cdd3dd; }
  code { background:rgba(255,255,255,.07); padding:1px 5px; border-radius:5px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#ffd9a8; }
  .empty { color:var(--muted); font-style:italic; padding:8px 0; }
  .legend { color:var(--muted); font-size:12px; margin:-12px 0 24px; }`;

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function mdInline(text: string): string {
  let escaped = escapeHtml(text || '');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return escaped;
}

function mdBlock(text: string): string {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const stripped = raw.replace(/\s+$/, '').replace(/^\s+/, '');
    const isBullet = stripped.startsWith('- ') || stripped.startsWith('* ');
    if (isBullet) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${mdInline(stripped.slice(2))}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      if (stripped) out.push(`<p>${mdInline(stripped)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

const SEVERITY_BANDS: Array<[number, string, string]> = [
  [1000, 'crit', 'Critical'],
  [500, 'high', 'High'],
  [250, 'med', 'Medium'],
  [0, 'low', 'Low'],
];

function riskBand(score: number | null | undefined): [string, string] {
  if (score === null || score === undefined) return ['low', 'n/a'];
  for (const [threshold, cls, label] of SEVERITY_BANDS) {
    if (score >= threshold) return [cls, label];
  }
  return ['low', 'Low'];
}

function tacticChips(tactics: string[]): string {
  if (!tactics || tactics.length === 0) return '';
  return tactics.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('');
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

export function renderAttackDiscovery(rows: any[]): string {
  const generatedAt = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

  const summaryRows: string[] = [];
  for (const r of rows) {
    const latencyS = (r.latency_ms || 0) / 1000.0;
    const totalRisk = (r.discoveries || []).reduce(
      (acc: number, d: any) => acc + (d.risk_score || 0),
      0
    );
    const err = r.error || '';
    const rawStatus = r.status || (err ? 'error' : '');
    // succeeded_empty = generate call succeeded but produced no discoveries; a
    // legitimate outcome (not an error). Render it as a neutral "no findings"
    // pill, not the red error pill.
    const isEmpty = rawStatus === 'succeeded_empty';
    const status = isEmpty ? 'no findings' : rawStatus;
    const statusCls =
      rawStatus === 'succeeded'
        ? 'ok'
        : isEmpty
        ? 'warn'
        : err || rawStatus === 'error'
        ? 'err'
        : 'warn';
    summaryRows.push(`
            <tr>
              <td class="model">${escapeHtml(r.model_name || '')}<br>
                <span class="model-id">${escapeHtml(r.model_id || '')}</span></td>
              <td><span class="status ${statusCls}">${escapeHtml(status || '\u2014')}</span></td>
              <td class="num">${r.discovery_count || 0}</td>
              <td class="num">${r.alerts_context_count || '\u2014'}</td>
              <td class="num">${latencyS.toFixed(1)}s</td>
              <td class="num">${fmtInt(totalRisk)}</td>
            </tr>`);
  }

  const cards: string[] = [];
  for (const r of rows) {
    const discoveries = r.discoveries || [];
    const discHtml: string[] = [];
    discoveries.forEach((d: any, idx: number) => {
      const i = idx + 1;
      const score = d.risk_score;
      const [bandCls, bandLabel] = riskBand(score);
      const nAlerts = (d.alert_ids || []).length;
      discHtml.push(`
                <details class="disc" open>
                  <summary>
                    <span class="disc-num">${i}</span>
                    <span class="disc-title">${escapeHtml(d.title || '(untitled)')}</span>
                    <span class="risk ${bandCls}" title="risk score">${bandLabel} \u00b7 ${
        score !== null && score !== undefined ? score : '\u2014'
      }</span>
                    <span class="alert-count">${nAlerts} alert${nAlerts !== 1 ? 's' : ''}</span>
                  </summary>
                  <div class="disc-body">
                    <div class="chips">${tacticChips(d.mitre_attack_tactics || [])}</div>
                    <p class="summary">${mdInline(d.summary_markdown || '')}</p>
                    <div class="details">${mdBlock(d.details_markdown || '')}</div>
                  </div>
                </details>`);
    });
    if (discoveries.length === 0) {
      // Preserve Chrysalis's exact empty-note text for genuine "succeeded but no
      // discoveries" rows so the report reproduces the reference byte-for-byte;
      // a real generation error (r.error) still surfaces its own message.
      const note = escapeHtml(r.error || 'No discoveries generated.');
      discHtml.push(`<p class="empty">${note}</p>`);
    }

    const latencyS = (r.latency_ms || 0) / 1000.0;
    cards.push(`
            <section class="card">
              <header class="card-head">
                <h2>${escapeHtml(r.model_name || '')}</h2>
                <div class="meta">
                  <span>${r.discovery_count || 0} discoveries</span>
                  <span>\u00b7</span>
                  <span>${latencyS.toFixed(1)}s</span>
                  <span>\u00b7</span>
                  <span>${r.alerts_context_count || '\u2014'} alerts in context</span>
                </div>
              </header>
              ${discHtml.join('')}
            </section>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Attack Discovery \u00b7 EIS Model Trial</title>
<style>
  ${AD_CSS}
</style>
</head>
<body>
<div class="wrap">
  <h1>Attack Discovery \u2014 EIS Model Trial</h1>
  <p class="sub">Same alert context (last 24h, <code>.alerts-security.alerts-default</code>) run through each EIS connector via <code>/api/attack_discovery/_generate</code>. Generated ${escapeHtml(
    generatedAt
  )}.</p>

  <table>
    <thead>
      <tr><th>Model</th><th>Status</th><th>Discoveries</th><th>Alerts in context</th><th>Latency</th><th>Total risk</th></tr>
    </thead>
    <tbody>${summaryRows.join('')}</tbody>
  </table>
  <p class="legend">Risk bands: Critical \u2265 1000 \u00b7 High \u2265 500 \u00b7 Medium \u2265 250 \u00b7 Low &lt; 250 (sum of per-discovery risk scores). Click any discovery to expand its evidence chain.</p>

  ${cards.join('')}
</div>
</body>
</html>`;
}

export function generateAttackDiscovery(rows: AttackDiscoveryRow[]): {
  html: string;
  rowCount: number;
} {
  // Order most-thorough first for readability.
  const sorted = [...rows].sort((a, b) => (b.discovery_count || 0) - (a.discovery_count || 0));
  const html = renderAttackDiscovery(sorted);
  return { html, rowCount: sorted.length };
}
