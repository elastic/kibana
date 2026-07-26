/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, complexity, no-continue */

// Faithful 1:1 TypeScript port of render_agent_eval_html.py (canonical renderer
// shipped with the eis-benchmark handoff). Produces a self-contained HTML report
// organised per model: summary matrix, per-prompt cards with prompt text,
// auto-attached alert/rule context, rendered-markdown answer, workflow validation,
// and a collapsible reasoning + tool-call trace.

import { PERSONA_MATRIX_EXAMPLES } from '../src/datasets/persona_matrix_prompts';
import type { AgentEvalRow } from './load_eval_scores';
const AGENT_EVAL_CSS = `:root {
    --bg:#0f1115; --panel:#171a21; --panel2:#1f2430; --border:#2a3140;
    --text:#e6e9ef; --muted:#9aa4b2; --accent:#6ea8fe;
    --ok:#5fd0a0; --err:#ff5d6c; --warn:#ffd166;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text);
    font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1120px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:24px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:13px; }
  a { color:var(--accent); }
  table { width:100%; border-collapse:collapse; background:var(--panel);
    border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:14px; }
  th,td { padding:10px 13px; text-align:left; border-bottom:1px solid var(--border);
    vertical-align:top; }
  th { background:var(--panel2); color:var(--muted); font-size:12px;
    text-transform:uppercase; letter-spacing:.04em; }
  tr:last-child td { border-bottom:none; }
  td.num { text-align:center; color:var(--muted); }
  td.model { font-weight:600; min-width:160px; }
  .model-id { color:var(--muted); font-weight:400; font-size:12px; font-family:ui-monospace,monospace; }
  td.cell { font-size:13px; }
  td.cell.ok { color:var(--text); }
  td.cell.err { color:var(--err); font-weight:600; }
  .ok-dot { color:var(--ok); font-weight:700; }
  .sub-num { color:var(--muted); font-size:11px; }
  .legend { color:var(--muted); font-size:12px; margin:4px 0 30px; }
  .status { padding:2px 9px; border-radius:20px; font-size:12px; font-weight:600; flex:none; }
  .status.ok { background:rgba(95,208,160,.15); color:var(--ok); }
  .status.err { background:rgba(255,93,108,.15); color:var(--err); }
  .status.warn { background:rgba(255,209,102,.15); color:var(--warn); }
  .card { background:var(--panel); border:1px solid var(--border);
    border-radius:12px; padding:18px 20px; margin-bottom:22px; }
  .card-head { display:flex; align-items:baseline; justify-content:space-between;
    gap:12px; flex-wrap:wrap; margin-bottom:6px; }
  .card-head h2 { font-size:18px; margin:0; }
  .meta { color:var(--muted); font-size:13px; display:flex; gap:8px; flex-wrap:wrap; }
  details.prompt { border:1px solid var(--border); border-radius:9px;
    margin-top:10px; background:var(--panel2); }
  details.prompt > summary { list-style:none; cursor:pointer; padding:11px 14px;
    display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  details.prompt > summary::-webkit-details-marker { display:none; }
  .prompt-id { font-weight:600; font-family:ui-monospace,monospace; font-size:13px; }
  .skill-chip { font-size:11px; background:rgba(110,168,254,.14); color:var(--accent);
    border:1px solid rgba(110,168,254,.25); padding:2px 9px; border-radius:20px; flex:none; }
  .cat-chip { font-size:11px; background:rgba(255,209,102,.13); color:var(--warn);
    border:1px solid rgba(255,209,102,.28); padding:2px 9px; border-radius:20px; flex:none;
    font-family:ui-monospace,monospace; }
  .p-meta { color:var(--muted); font-size:12px; margin-left:auto; flex:none; }
  .prompt-body { padding:4px 16px 16px; border-top:1px solid var(--border); }
  .prompt-text { margin:12px 0 8px; font-size:13px; }
  .prompt-text > strong { display:block; color:var(--muted); font-size:11px;
    text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .prompt-text blockquote { margin:0; padding:10px 14px; background:var(--panel);
    border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:8px;
    color:var(--text); }
  .prompt-text blockquote p { margin:6px 0; }
  .prompt-text blockquote p:first-child { margin-top:0; }
  .prompt-text blockquote p:last-child { margin-bottom:0; }
  details.attach { margin:8px 0 2px; }
  details.attach > summary { cursor:pointer; color:var(--accent); font-size:12.5px;
    padding:6px 0; font-weight:600; }
  details.attach .attach-meta { color:var(--muted); font-family:ui-monospace,monospace;
    font-size:11px; margin:4px 0 6px; word-break:break-all; }
  details.attach pre { background:#0b0d12; border:1px solid var(--border); border-radius:7px;
    padding:11px 13px; overflow:auto; max-height:420px; }
  details.attach pre code { background:none; padding:0; color:#cdd3dd; font-size:12px; }
  .tool-trail { font-size:12px; color:var(--muted); margin:10px 0; }
  .tool-trail code { white-space:normal; }
  .cleanup-trail { font-size:12px; color:var(--muted); margin:6px 0; }
  .cleanup-trail code { white-space:normal; color:var(--ok); }
  .answer { background:var(--panel); border:1px solid var(--border); border-radius:8px;
    padding:4px 16px; margin:8px 0; }
  .answer h3 { font-size:17px; } .answer h4 { font-size:15px; } .answer h5,.answer h6 { font-size:13px; }
  .answer table.md { margin:10px 0; font-size:13px; }
  .answer table.md th { text-transform:none; letter-spacing:0; }
  .answer pre { background:#0b0d12; border:1px solid var(--border); border-radius:7px;
    padding:11px 13px; overflow:auto; }
  .answer pre code { background:none; padding:0; color:#cdd3dd; }
  .answer hr { border:none; border-top:1px solid var(--border); margin:14px 0; }
  details.trace { margin:8px 0 4px; }
  details.trace summary { cursor:pointer; color:var(--muted); font-size:13px; padding:6px 0; }
  .trace-body { border-left:2px solid var(--border); padding-left:12px; margin:6px 0 6px 4px; }
  .step { font-size:12.5px; margin:5px 0; display:flex; gap:8px; align-items:baseline; }
  .step-tag { flex:none; font-size:10px; text-transform:uppercase; letter-spacing:.05em;
    color:var(--muted); width:16px; }
  .step.reasoning { color:#bcc4d2; }
  .reason-body { min-width:0; flex:1; }
  .reason-body > :first-child { margin-top:0; }
  .reason-body > :last-child { margin-bottom:0; }
  .reason-body h2, .reason-body h3, .reason-body h4, .reason-body h5 { font-size:12.5px; margin:6px 0 3px; color:#d7dce6; }
  .reason-body p { margin:3px 0; }
  .reason-body ul { margin:3px 0 3px 16px; padding:0; }
  .reason-body table.md { margin:5px 0; }
  .step.tool { color:var(--text); }
  .tool-tag { width:18px; height:18px; border-radius:50%; background:var(--border);
    color:var(--text); display:inline-grid; place-items:center; font-size:10px; font-weight:700; }
  .tool-id { color:#ffd9a8; }
  .tool-params { color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; }
  code { background:rgba(255,255,255,.07); padding:1px 5px; border-radius:5px;
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#ffd9a8; }
  .empty { color:var(--muted); font-style:italic; padding:8px 0; }
  .wf-badge { display:inline-block; font-size:10.5px; padding:1px 7px; border-radius:20px;
    margin-top:3px; font-weight:600; }
  .wf-badge.ok { background:rgba(95,208,160,.15); color:var(--ok); }
  .wf-badge.err { background:rgba(255,93,108,.15); color:var(--err); }
  .wf-badge.warn { background:rgba(255,209,102,.15); color:var(--warn); }
  .wf-val { background:var(--panel); border:1px solid var(--border); border-left:3px solid var(--accent);
    border-radius:8px; padding:6px 16px 10px; margin:10px 0; }
  .wf-head { font-size:13.5px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:8px 0; }
  .wf-stages { color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; }
  .wf-err { color:var(--err); font-family:ui-monospace,monospace; font-size:12px;
    background:rgba(255,93,108,.08); border-radius:6px; padding:6px 10px; margin:6px 0;
    white-space:pre-wrap; word-break:break-word; }`;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function escapeHtml(text: string): string {
  // Mirrors Python html.escape(quote=True)
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
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  return escaped;
}

function short(v: any, n = 160): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length <= n ? s : `${s.slice(0, n - 1)}\u2026`;
}

function mdBlock(text: string): string {
  if (!text) return '<p class="empty">(empty response)</p>';
  // Strip internal `<render_attachment id="..."/>` placeholders that the agent
  // emits inline; they are not user-visible content and otherwise leak as
  // escaped literals into the rendered markdown.
  const source = text.replace(/<render_attachment\b[^>]*\/?>/g, '');
  const lines = source.split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  let codeBuf: string[] = [];
  let tableBuf: string[] = [];

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const cells = (line: string): string[] =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.filter((r) => r.trim());
    tableBuf = [];
    if (rows.length < 2) {
      for (const r of rows) out.push(`<p>${mdInline(r)}</p>`);
      return;
    }
    const header = cells(rows[0]);
    const body = rows.slice(2); // rows[1] is the --- separator
    out.push('<table class="md">');
    out.push(`<thead><tr>${header.map((c) => `<th>${mdInline(c)}</th>`).join('')}</tr></thead>`);
    out.push('<tbody>');
    for (const br of body) {
      out.push(
        `<tr>${cells(br)
          .map((c) => `<td>${mdInline(c)}</td>`)
          .join('')}</tr>`
      );
    }
    out.push('</tbody></table>');
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const stripped = line.trim();

    if (stripped.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        flushList();
        flushTable();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    if (stripped.startsWith('|') && stripped.endsWith('|')) {
      flushList();
      tableBuf.push(stripped);
      continue;
    } else {
      flushTable();
    }

    if (!stripped) {
      flushList();
      continue;
    }

    const h = stripped.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushList();
      const level = Math.min(h[1].length + 2, 6);
      out.push(`<h${level}>${mdInline(h[2])}</h${level}>`);
      continue;
    }

    if (/^([-*]{3,}|_{3,})$/.test(stripped)) {
      flushList();
      out.push('<hr>');
      continue;
    }

    const isBullet =
      stripped.startsWith('- ') || stripped.startsWith('* ') || /^\d+\.\s/.test(stripped);
    if (isBullet) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      const content = stripped.replace(/^([-*]\s|\d+\.\s)/, '');
      out.push(`<li>${mdInline(content)}</li>`);
    } else {
      flushList();
      out.push(`<p>${mdInline(stripped)}</p>`);
    }
  }

  flushList();
  flushTable();
  if (inCode && codeBuf.length) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }
  return out.join('\n');
}

/**
 * Derive the displayed step count. Prefer an explicit positive `num_steps`, but
 * fall back to the length of the captured `steps[]` array. ES-sourced rows
 * (`--scores es:<run>`) do not populate `num_steps`, so trusting it blindly
 * renders "0 steps" even when steps[] holds real reasoning + tool_call entries.
 */
function stepCount(r: any): number {
  const declared = typeof r?.num_steps === 'number' ? r.num_steps : 0;
  const captured = Array.isArray(r?.steps) ? r.steps.length : 0;
  return declared > 0 ? declared : captured;
}

/**
 * Render a reasoning ("thinking") step. Model reasoning frequently contains
 * full block markdown — headings, bullet lists, `---` separators, tables — and
 * internal `<render_attachment id="..."/>` placeholders that must not leak as
 * escaped literals. Strip the placeholder tags, then render with the full block
 * markdown renderer (mdBlock) rather than the inline-only mdInline, which left
 * headings/lists/separators as raw text.
 */
function renderReasoning(text: string): string {
  const cleaned = (text || '').replace(/<render_attachment\b[^>]*\/?>/g, '').trim();
  if (!cleaned) return '';
  return `<div class="step reasoning"><span class="step-tag">think</span><div class="reason-body">${mdBlock(
    cleaned
  )}</div></div>`;
}

function renderSteps(steps: any[]): string {
  if (!steps || steps.length === 0) return '<p class="empty">No steps recorded.</p>';
  const out: string[] = [];
  let nTool = 0;
  for (const s of steps) {
    const t = s.type;
    if (t === 'reasoning') {
      const txt = s.reasoning || '';
      const rendered = renderReasoning(txt);
      if (rendered) {
        out.push(rendered);
      }
    } else if (t === 'tool_call') {
      nTool += 1;
      const tool = s.tool_id ?? '?';
      const params = s.params || {};
      const paramStr = Object.keys(params).length
        ? Object.entries(params)
            .map(([k, v]) => `${k}=${short(v, 80)}`)
            .join(', ')
        : '';
      out.push(
        `<div class="step tool"><span class="step-tag tool-tag">${nTool}</span>` +
          `<code class="tool-id">${escapeHtml(tool)}</code>` +
          `<span class="tool-params">${escapeHtml(paramStr)}</span></div>`
      );
    }
  }
  return out.join('\n');
}

const STATUS_CLS: Record<string, string> = { completed: 'ok' };
const WF_OUTCOME_CLS: Record<string, string> = {
  completed: 'ok',
  failed: 'err',
  run_failed: 'err',
  create_failed: 'err',
  timed_out: 'warn',
  no_yaml: 'warn',
};

function renderWfValidation(v: any): string {
  if (!v) return '';
  const outcome = v.outcome || '';
  const cls = WF_OUTCOME_CLS[outcome] || 'warn';
  const yamlText = v.authored_yaml || '';
  const stageBits: string[] = [];
  stageBits.push(`create_valid=${v.create_valid}`);
  if (v.workflow_id) stageBits.push(`workflow_id=${v.workflow_id}`);
  if (v.execution_id) stageBits.push(`execution_id=${v.execution_id}`);
  if (v.exec_status) stageBits.push(`exec_status=${v.exec_status}`);
  const errs: string[] = [];
  if (v.create_error) errs.push(`create_error: ${v.create_error}`);
  if (v.exec_error) errs.push(`exec_error: ${v.exec_error}`);

  const steps = v.step_statuses || [];
  let stepRows = '';
  if (steps.length) {
    stepRows = `<table class='md'><thead><tr><th>step</th><th>status</th></tr></thead><tbody>${steps
      .map(
        (s: any) =>
          `<tr><td><code>${escapeHtml(String(s.step ?? ''))}</code></td>` +
          `<td>${escapeHtml(String(s.status ?? ''))}</td></tr>`
      )
      .join('')}</tbody></table>`;
  }

  const yamlBlock = yamlText
    ? `<details class='trace' open><summary>\u{1F4C4} Authored workflow YAML</summary>` +
      `<pre><code>${escapeHtml(yamlText)}</code></pre></details>`
    : "<p class='empty'>No workflow YAML was extracted from the response.</p>";
  const errBlock = errs.length
    ? `<p class='wf-err'>${errs.map((e) => escapeHtml(e)).join('<br>')}</p>`
    : '';
  return `
    <div class="wf-val">
      <p class="wf-head">\u2699\uFE0F Workflow validation:
        <span class="status ${cls}">${escapeHtml(outcome || '\u2014')}</span>
        <span class="wf-stages">${escapeHtml(stageBits.join(' \u00b7 '))}</span>
      </p>
      ${errBlock}
      ${stepRows}
      ${yamlBlock}
    </div>`;
}

function renderAttachment(snapshot: any, kind: 'alert' | 'rule'): string {
  if (!snapshot) return '';
  const data = snapshot[kind];
  if (!data) return '';
  const meta = snapshot[`${kind}_meta`] || {};
  let label: string;
  const metaBits: string[] = [];
  if (kind === 'alert') {
    label = 'Attached alert (auto-attached, most recent)';
    if (meta._id) metaBits.push(`_id=${meta._id}`);
    if (meta['@timestamp']) metaBits.push(`@timestamp=${meta['@timestamp']}`);
    if (meta.rule_name) metaBits.push(`rule=${meta.rule_name}`);
  } else {
    label = 'Attached detection rule (auto-attached)';
    if (meta.name) metaBits.push(`name=${meta.name}`);
    if (meta.id) metaBits.push(`id=${meta.id}`);
    if (meta.type) metaBits.push(`type=${meta.type}`);
  }
  const metaLine = metaBits.length
    ? `<p class="attach-meta">${escapeHtml(metaBits.join(' \u00b7 '))}</p>`
    : '';
  const pretty = JSON.stringify(data, null, 2);
  return `<details class="attach" open><summary>\u{1F4CE} ${escapeHtml(
    label
  )}</summary>${metaLine}<pre><code>${escapeHtml(pretty)}</code></pre></details>`;
}

/**
 * Render the inline attachment text carried by a committed dataset example
 * (input.attachment). Unlike renderAttachment (which pretty-prints a shared
 * alert/rule snapshot object), this shows the exact attachment content that was
 * sent to converse alongside the question.
 */
function renderInlineAttachment(text: string): string {
  if (!text) return '';
  return `<details class="attach" open><summary>\u{1F4CE} ${escapeHtml(
    'Attached content (sent with the prompt)'
  )}</summary><pre><code>${escapeHtml(text)}</code></pre></details>`;
}

// ---------------------------------------------------------------------------
// data loaders
// ---------------------------------------------------------------------------

interface PromptMeta {
  prompt: string;
  attachAlert: boolean;
  attachRule: boolean;
  /** Inline attachment content from the committed dataset (per-prompt). */
  attachmentText?: string;
  category: string;
  targetSkill: string;
}

// ---------------------------------------------------------------------------
// main render
// ---------------------------------------------------------------------------

export function renderAgentEvalFull(
  rows: any[],
  promptsMap: Map<string, PromptMeta>,
  attachments: any
): string {
  const generatedAt = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

  const models: string[] = [];
  const byModel = new Map<string, any[]>();
  for (const r of rows) {
    const m = r.model_name ?? '?';
    if (!byModel.has(m)) {
      byModel.set(m, []);
      models.push(m);
    }
    (byModel.get(m) ?? []).push(r);
  }

  const prompts: string[] = [];
  for (const r of rows) {
    if (!prompts.includes(r.prompt_id)) prompts.push(r.prompt_id);
  }

  // ---- summary matrix ----
  const headCells = prompts.map((p) => `<th>${escapeHtml(p)}</th>`).join('');
  const matrixRows: string[] = [];
  for (const m of models) {
    const mr = byModel.get(m) ?? [];
    const cells: string[] = [
      `<td class="model">${escapeHtml(m)}<br><span class="model-id">${escapeHtml(
        mr[0].model_id ?? ''
      )}</span></td>`,
    ];
    for (const p of prompts) {
      const r = mr.find((x) => x.prompt_id === p);
      if (!r) {
        cells.push('<td class="num">\u2014</td>');
        continue;
      }
      const pmeta = promptsMap.get(String(p).toLowerCase());
      const ptext = pmeta?.prompt || '';
      const ptip = escapeHtml(ptext ? `${p}: ${ptext}` : String(p));
      const err = r.error || '';
      if (err) {
        cells.push(`<td class="cell err" title="${escapeHtml(err)}">\u26D4 error</td>`);
      } else {
        const lat = (r.latency_ms || 0) / 1000.0;
        const wf = r.wf_validation_detail || {};
        let wfBadge = '';
        if (wf && Object.keys(wf).length) {
          const oc = wf.outcome || '';
          const wfCls = WF_OUTCOME_CLS[oc] || 'warn';
          wfBadge = `<br><span class="wf-badge ${wfCls}" title="authored workflow validation">\u2699\uFE0F ${escapeHtml(
            oc || '\u2014'
          )}</span>`;
        }
        cells.push(
          `<td class="cell ok" title="${ptip}"><span class="ok-dot">\u2713</span> ${stepCount(
            r
          )} steps` +
            `<br><span class="sub-num">${lat.toFixed(0)}s \u00b7 ${r.input_tokens ?? '?'}/${
              r.output_tokens ?? '?'
            } tok</span>${wfBadge}</td>`
        );
      }
    }
    matrixRows.push(`<tr>${cells.join('')}</tr>`);
  }

  // ---- per-model detail cards ----
  const cards: string[] = [];
  for (const m of models) {
    const mr = byModel.get(m) ?? [];
    const promptBlocks: string[] = [];
    for (const r of mr) {
      const err = r.error || '';
      const status = r.status || (err ? 'error' : '\u2014');
      const statusCls = err ? 'err' : STATUS_CLS[status] || 'warn';
      const lat = (r.latency_ms || 0) / 1000.0;
      const pmeta = promptsMap.get(String(r.prompt_id ?? '').toLowerCase());

      // tools: derive from steps (JSONL tools_called is a placeholder), else field
      const stepTools = (r.steps || [])
        .filter((s: any) => s.type === 'tool_call')
        .map((s: any) => s.tool_id)
        .filter(Boolean);
      const tools = stepTools.length ? stepTools.join(', ') : r.tools_called || '';

      const category = r.category || pmeta?.targetSkill || '';
      const wfDetail = r.wf_validation_detail || null;

      const attachAlert = pmeta?.attachAlert ?? false;
      const attachRule = pmeta?.attachRule ?? false;
      const attachList: string[] = [];
      if (pmeta?.attachmentText) attachList.push('content');
      if (attachAlert) attachList.push('alert');
      if (attachRule) attachList.push('rule');
      const attachStr = attachList.length ? ` \u00b7 attach: ${attachList.join(', ')}` : '';

      let body: string;
      if (err) {
        body = `<div class="answer"><p class="empty">\u26D4 ${escapeHtml(err)}</p></div>`;
      } else {
        const nToolCalls = (r.steps || []).filter((s: any) => s.type === 'tool_call').length;
        body = `
                <div class="answer">${mdBlock(r.response_message || '')}</div>
                ${renderWfValidation(wfDetail)}
                <details class="trace" open>
                  <summary>\u{1F50D} Step trace \u2014 ${stepCount(
                    r
                  )} steps (${nToolCalls} tool calls)</summary>
                  <div class="trace-body">${renderSteps(r.steps || [])}</div>
                </details>`;
      }

      const catChip = category
        ? `<span class="cat-chip" title="eval category">${escapeHtml(category)}</span>`
        : '';
      const promptText = pmeta?.prompt || '';
      let attachBlocks = '';
      if (pmeta?.attachmentText) attachBlocks += renderInlineAttachment(pmeta.attachmentText);
      if (attachAlert) attachBlocks += renderAttachment(attachments, 'alert');
      if (attachRule) attachBlocks += renderAttachment(attachments, 'rule');
      const promptHtml =
        promptText || attachBlocks
          ? `<div class="prompt-text"><strong>Prompt sent</strong>` +
            `<blockquote>${mdBlock(promptText)}</blockquote>` +
            `${attachBlocks}</div>`
          : '';

      promptBlocks.push(`
                <details class="prompt" open>
                  <summary>
                    <span class="status ${statusCls}">${escapeHtml(status)}</span>
                    <span class="prompt-id">${escapeHtml(r.prompt_id ?? '')}</span>
                    ${catChip}
                    <span class="p-meta">${stepCount(r)} steps \u00b7 ${lat.toFixed(
        0
      )}s${escapeHtml(attachStr)}</span>
                  </summary>
                  <div class="prompt-body">
                    ${promptHtml}
                    <p class="tool-trail"><strong>Tools called:</strong> <code>${
                      escapeHtml(tools) || '\u2014'
                    }</code></p>
                    ${
                      r.cleanup
                        ? `<p class="cleanup-trail"><strong>Cleanup:</strong> <code>${escapeHtml(
                            r.cleanup
                          )}</code></p>`
                        : ''
                    }
                    ${body}
                  </div>
                </details>`);
    }

    const ok = mr.filter((r) => !r.error).length;
    const total = mr.length;
    cards.push(`
            <section class="card" id="${escapeHtml(m.replace(/ /g, '-'))}">
              <header class="card-head">
                <h2>${escapeHtml(m)}</h2>
                <div class="meta">
                  <span class="model-id">${escapeHtml(mr[0].model_id ?? '')}</span>
                  <span>\u00b7</span>
                  <span>${ok}/${total} completed</span>
                </div>
              </header>
              ${promptBlocks.join('')}
            </section>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Agent Builder Skill Eval \u00b7 EIS Models</title>
<style>
${AGENT_EVAL_CSS}
</style>
</head>
<body>
<div class="wrap">
  <h1>Agent Builder Skill Eval \u2014 EIS Models</h1>
  <p class="sub">Each prompt sent to the <code>chrysalis-hunting-agent</code> via
  <code>/api/agent_builder/converse</code>, switching only the connector's <code>connector_id</code> per model.
  Real calls against the live deployment. Rendered verbatim from the run's JSONL (no post-hoc analysis). Generated ${escapeHtml(
    generatedAt
  )}.</p>

  <table>
    <thead><tr><th>Model</th>${headCells}</tr></thead>
    <tbody>${matrixRows.join('')}</tbody>
  </table>
  <p class="legend">Each cell shows step count, latency, and input/output tokens. Expand a prompt below to read the model's full answer and its reasoning + tool-call trace.</p>

  ${cards.join('')}
</div>
</body>
</html>`;
}

/**
 * Build the prompt/attachment metadata map from the COMMITTED dataset
 * (src/datasets/persona_matrix_prompts.ts) — never from uncommitted CSV/JSON.
 * The dataset carries the question text and the inline attachment content that
 * was sent to converse, so it is the source of truth for the prompt-text and
 * attachment blocks.
 */
function buildPromptsFromDataset(): Map<string, PromptMeta> {
  const map = new Map<string, PromptMeta>();
  for (const ex of PERSONA_MATRIX_EXAMPLES) {
    const pid = (ex.id || '').trim().toLowerCase();
    if (!pid) continue;
    map.set(pid, {
      prompt: ex.input?.question ?? '',
      attachmentText: ex.input?.attachment,
      attachAlert: false,
      attachRule: false,
      category: ex.category ?? '',
      targetSkill: ex.metadata?.expectedSkill ?? '',
    });
  }
  return map;
}

export function generateAgentEvalFull(
  rows: AgentEvalRow[],
  modelFilter?: string
): { html: string; rowCount: number } {
  let filtered = rows;
  if (modelFilter) {
    // Match against model_name OR model_id (task.model in the score docs), so a
    // caller can pass either the display name or the raw HF id.
    filtered = rows.filter((r) => r.model_name === modelFilter || r.model_id === modelFilter);
  }
  const promptsMap = buildPromptsFromDataset();
  // Attachment snapshot is sourced per-prompt from the committed dataset
  // (promptsMap.attachmentText); no shared snapshot object is needed.
  const html = renderAgentEvalFull(filtered, promptsMap, {});
  return { html, rowCount: filtered.length };
}

/** Distinct model identifiers present in the loaded run (name + id pairs). */
export function listAgentEvalModels(rows: AgentEvalRow[]): Array<{ name: string; id: string }> {
  const seen = new Map<string, string>();
  for (const r of rows) {
    const name = r.model_name ?? '?';
    if (!seen.has(name)) seen.set(name, r.model_id ?? '');
  }
  return [...seen.entries()].map(([name, id]) => ({ name, id }));
}
