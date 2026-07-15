/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript port of Dhrumil's `render_agent_eval_html.py`.
 *
 * Produces a self-contained dark-theme HTML report from Agent Builder eval
 * JSONL rows. The row schema ({@link AgentEvalRow}) is the contract — any
 * system producing matching rows gets the same visual output.
 */

import type {
  AgentEvalAttachments,
  AgentEvalPromptsMap,
  AgentEvalRow,
  AgentEvalStep,
  RenderAgentEvalHtmlOptions,
  WorkflowValidationDetail,
} from './agent_eval_types';

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const mdInline = (text: string): string => {
  let out = escapeHtml(text ?? '');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );
  return out;
};

const mdBlock = (text: string): string => {
  if (!text) return '<p class="empty">(empty response)</p>';

  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;
  let inCode = false;
  const codeBuf: string[] = [];
  const tableBuf: string[] = [];

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.filter((r) => r.trim());
    tableBuf.length = 0;
    if (rows.length < 2) {
      rows.forEach((r) => out.push(`<p>${mdInline(r)}</p>`));
      return;
    }
    const cells = (line: string): string[] =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim());

    const header = cells(rows[0]);
    const body = rows.slice(2);
    out.push('<table class="md">');
    out.push(`<thead><tr>${header.map((c) => `<th>${mdInline(c)}</th>`).join('')}</tr></thead>`);
    out.push('<tbody>');
    body.forEach((br) => {
      out.push(
        `<tr>${cells(br)
          .map((c) => `<td>${mdInline(c)}</td>`)
          .join('')}</tr>`
      );
    });
    out.push('</tbody></table>');
  };

  /**
   * Process a single line. Returns true if the line was "consumed" by a
   * special construct (code fence, table row, heading, etc.) and should
   * skip the default paragraph/bullet fallback.
   */
  const processLine = (raw: string): boolean => {
    const line = raw.replace(/\s+$/, '');
    const stripped = line.trim();

    if (stripped.startsWith('```')) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
        codeBuf.length = 0;
        inCode = false;
      } else {
        flushList();
        flushTable();
        inCode = true;
      }
      return true;
    }

    if (inCode) {
      codeBuf.push(raw);
      return true;
    }

    if (stripped.startsWith('|') && stripped.endsWith('|')) {
      flushList();
      tableBuf.push(stripped);
      return true;
    }

    flushTable();

    if (!stripped) {
      flushList();
      return true;
    }

    const headingMatch = stripped.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = Math.min(headingMatch[1].length + 2, 6);
      out.push(`<h${level}>${mdInline(headingMatch[2])}</h${level}>`);
      return true;
    }

    if (/^([-*]{3,}|_{3,})$/.test(stripped)) {
      flushList();
      out.push('<hr>');
      return true;
    }

    return false;
  };

  for (const raw of lines) {
    if (processLine(raw)) {
      // line consumed by a special construct
    } else {
      const stripped = raw.trim();
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
  }

  flushList();
  flushTable();
  if (inCode && codeBuf.length > 0) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
  }

  return out.join('\n');
};

const shorten = (value: unknown, max = 160): string => {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
};

const WF_OUTCOME_CLS: Record<string, string> = {
  completed: 'ok',
  succeeded: 'ok',
  failed: 'err',
  run_failed: 'err',
  create_failed: 'err',
  timed_out: 'warn',
  no_yaml: 'warn',
};

const renderSteps = (steps: readonly AgentEvalStep[]): string => {
  if (!steps || steps.length === 0) return '<p class="empty">No steps recorded.</p>';

  const out: string[] = [];
  let toolNum = 0;
  for (const s of steps) {
    if (s.type === 'reasoning') {
      const txt = s.reasoning ?? '';
      if (txt.trim()) {
        out.push(
          `<div class="step reasoning"><span class="step-tag">think</span>${mdInline(txt)}</div>`
        );
      }
    } else if (s.type === 'tool_call') {
      toolNum++;
      const tool = s.tool_id ?? '?';
      const params = s.params ?? {};
      const paramStr =
        Object.keys(params).length > 0
          ? Object.entries(params)
              .map(([k, v]) => `${k}=${shorten(v, 80)}`)
              .join(', ')
          : '';
      out.push(
        `<div class="step tool"><span class="step-tag tool-tag">${toolNum}</span>` +
          `<code class="tool-id">${escapeHtml(tool)}</code>` +
          `<span class="tool-params">${escapeHtml(paramStr)}</span></div>`
      );
    }
  }
  return out.join('\n');
};

const renderWfValidation = (v: WorkflowValidationDetail | undefined): string => {
  if (!v) return '';

  const outcome = v.outcome ?? '';
  const cls = WF_OUTCOME_CLS[outcome] ?? 'warn';
  const yamlText = v.authored_yaml ?? '';

  const stageBits: string[] = [];
  stageBits.push(`create_valid=${v.create_valid ?? '—'}`);
  if (v.workflow_id) stageBits.push(`workflow_id=${v.workflow_id}`);
  if (v.execution_id) stageBits.push(`execution_id=${v.execution_id}`);
  if (v.exec_status) stageBits.push(`exec_status=${v.exec_status}`);

  const errs: string[] = [];
  if (v.create_error) errs.push(`create_error: ${v.create_error}`);
  if (v.exec_error) errs.push(`exec_error: ${v.exec_error}`);

  const steps = v.step_statuses ?? [];
  let stepRows = '';
  if (steps.length > 0) {
    stepRows = `<table class='md'><thead><tr><th>step</th><th>status</th></tr></thead><tbody>${steps
      .map(
        (s) =>
          `<tr><td><code>${escapeHtml(s.step ?? '')}</code></td><td>${escapeHtml(
            s.status ?? ''
          )}</td></tr>`
      )
      .join('')}</tbody></table>`;
  }

  const yamlBlock = yamlText
    ? `<details class='trace' open><summary>Authored workflow YAML</summary><pre><code>${escapeHtml(
        yamlText
      )}</code></pre></details>`
    : "<p class='empty'>No workflow YAML was extracted from the response.</p>";

  const errBlock = errs.length
    ? `<p class='wf-err'>${errs.map((e) => escapeHtml(e)).join('<br>')}</p>`
    : '';

  return `
    <div class="wf-val">
      <p class="wf-head">Workflow validation:
        <span class="status ${cls}">${escapeHtml(outcome || '—')}</span>
        <span class="wf-stages">${escapeHtml(stageBits.join(' · '))}</span>
      </p>
      ${errBlock}
      ${stepRows}
      ${yamlBlock}
    </div>`;
};

const renderAttachment = (
  attachments: AgentEvalAttachments | undefined,
  kind: 'alert' | 'rule'
): string => {
  if (!attachments) return '';
  const data = kind === 'alert' ? attachments.alert : attachments.rule;
  if (!data) return '';

  const meta = kind === 'alert' ? attachments.alert_meta : attachments.rule_meta;
  const label =
    kind === 'alert'
      ? 'Attached alert (auto-attached, most recent)'
      : 'Attached detection rule (auto-attached)';

  const metaBits: string[] = [];
  if (meta) {
    if (meta._id) metaBits.push(`_id=${meta._id}`);
    if (meta['@timestamp']) metaBits.push(`@timestamp=${meta['@timestamp']}`);
    if (meta.rule_name) metaBits.push(`rule=${meta.rule_name}`);
    if (meta.name) metaBits.push(`name=${meta.name}`);
    if (meta.id) metaBits.push(`id=${meta.id}`);
    if (meta.type) metaBits.push(`type=${meta.type}`);
  }

  const metaLine = metaBits.length
    ? `<p class="attach-meta">${escapeHtml(metaBits.join(' · '))}</p>`
    : '';
  const pretty = JSON.stringify(data, null, 2);

  return `<details class="attach" open><summary>${escapeHtml(
    label
  )}</summary>${metaLine}<pre><code>${escapeHtml(pretty)}</code></pre></details>`;
};

const STATUS_CLS: Record<string, string> = { completed: 'ok', succeeded: 'ok' };

const renderMatrix = (
  models: readonly string[],
  prompts: readonly string[],
  byModel: ReadonlyMap<string, readonly AgentEvalRow[]>,
  promptsMap: AgentEvalPromptsMap
): string => {
  const headCells = prompts.map((p) => `<th>${escapeHtml(p)}</th>`).join('');

  const matrixRows = models
    .map((m) => {
      const rows = byModel.get(m) ?? [];
      const cells: string[] = [
        `<td class="model">${escapeHtml(m)}<br><span class="model-id">${escapeHtml(
          rows[0]?.model_id ?? ''
        )}</span></td>`,
      ];

      for (const p of prompts) {
        const r = rows.find((x) => x.prompt_id === p);
        if (!r) {
          cells.push('<td class="num">—</td>');
        } else {
          const ptext = promptsMap[p] ?? '';
          const ptip = escapeHtml(ptext ? `${p}: ${ptext}` : p);
          const err = r.error ?? '';

          if (err) {
            cells.push(`<td class="cell err" title="${escapeHtml(err)}">error</td>`);
          } else {
            const lat = (r.latency_ms ?? 0) / 1000;
            const wf = r.wf_validation_detail ?? r.wf_validation;
            let wfBadge = '';
            if (wf?.outcome) {
              const wfCls = WF_OUTCOME_CLS[wf.outcome] ?? 'warn';
              wfBadge = `<br><span class="wf-badge ${wfCls}" title="workflow validation">${escapeHtml(
                wf.outcome
              )}</span>`;
            }
            cells.push(
              `<td class="cell ok" title="${ptip}"><span class="ok-dot">✓</span> ${
                r.num_steps ?? 0
              } steps` +
                `<br><span class="sub-num">${lat.toFixed(0)}s · ${r.input_tokens ?? '?'}/${
                  r.output_tokens ?? '?'
                } tok</span>${wfBadge}</td>`
            );
          }
        }
      }

      return `<tr>${cells.join('')}</tr>`;
    })
    .join('\n');

  return `<table><thead><tr><th>Model</th>${headCells}</tr></thead><tbody>${matrixRows}</tbody></table>`;
};

const renderCard = (
  model: string,
  rows: readonly AgentEvalRow[],
  promptsMap: AgentEvalPromptsMap,
  attachments: AgentEvalAttachments | undefined
): string => {
  const promptBlocks = rows
    .map((r) => {
      const err = r.error ?? '';
      const status = r.status ?? (err ? 'error' : '—');
      const statusCls = err ? 'err' : STATUS_CLS[status] ?? 'warn';
      const lat = (r.latency_ms ?? 0) / 1000;
      const tools: string = Array.isArray(r.tools_called)
        ? r.tools_called.join(', ')
        : String(r.tools_called ?? '');
      const category = r.category ?? r.target_skill ?? '';
      const wfDetail = r.wf_validation_detail ?? r.wf_validation;

      const attach: string[] = [];
      if (r.attached_alert) attach.push('alert');
      if (r.attached_rule) attach.push('rule');
      const attachStr = attach.length ? ` · attach: ${attach.join(', ')}` : '';

      const body = err
        ? `<div class="answer"><p class="empty">${escapeHtml(err)}</p></div>`
        : `<div class="answer">${mdBlock(r.response_message ?? '')}</div>
           ${renderWfValidation(wfDetail)}
           <details class="trace" open>
             <summary>Step trace — ${r.num_steps ?? 0} steps (${
            (r.steps ?? []).filter((s) => s.type === 'tool_call').length
          } tool calls)</summary>
             <div class="trace-body">${renderSteps(r.steps ?? [])}</div>
           </details>`;

      const catChip = category
        ? `<span class="cat-chip" title="eval category">${escapeHtml(category)}</span>`
        : '';

      const promptText = promptsMap[r.prompt_id] ?? '';
      let attachBlocks = '';
      if (r.attached_alert) attachBlocks += renderAttachment(attachments, 'alert');
      if (r.attached_rule) attachBlocks += renderAttachment(attachments, 'rule');
      const promptHtml =
        promptText || attachBlocks
          ? `<div class="prompt-text"><strong>Prompt sent</strong><blockquote>${mdBlock(
              promptText
            )}</blockquote>${attachBlocks}</div>`
          : '';

      return `
        <details class="prompt" open>
          <summary>
            <span class="status ${statusCls}">${escapeHtml(status)}</span>
            <span class="prompt-id">${escapeHtml(r.prompt_id)}</span>
            ${catChip}
            <span class="p-meta">${r.num_steps ?? 0} steps · ${lat.toFixed(0)}s${escapeHtml(
        attachStr
      )}</span>
          </summary>
          <div class="prompt-body">
            ${promptHtml}
            <p class="tool-trail"><strong>Tools called:</strong> <code>${
              escapeHtml(tools) || '—'
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
        </details>`;
    })
    .join('\n');

  const ok = rows.filter((r) => !r.error).length;
  const total = rows.length;

  return `
    <section class="card" id="${escapeHtml(model.replace(/\s/g, '-'))}">
      <header class="card-head">
        <h2>${escapeHtml(model)}</h2>
        <div class="meta">
          <span class="model-id">${escapeHtml(rows[0]?.model_id ?? '')}</span>
          <span>·</span>
          <span>${ok}/${total} completed</span>
        </div>
      </header>
      ${promptBlocks}
    </section>`;
};

const CSS = `
  :root { --bg:#0f1115; --panel:#171a21; --panel2:#1f2430; --border:#2a3140; --text:#e6e9ef; --muted:#9aa4b2; --accent:#6ea8fe; --ok:#5fd0a0; --err:#ff5d6c; --warn:#ffd166; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:1120px; margin:0 auto; padding:32px 20px 64px; }
  h1 { font-size:24px; margin:0 0 4px; }
  .sub { color:var(--muted); margin:0 0 24px; font-size:13px; }
  a { color:var(--accent); }
  table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:14px; }
  th,td { padding:10px 13px; text-align:left; border-bottom:1px solid var(--border); vertical-align:top; }
  th { background:var(--panel2); color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
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
  .card { background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:18px 20px; margin-bottom:22px; }
  .card-head { display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:6px; }
  .card-head h2 { font-size:18px; margin:0; }
  .meta { color:var(--muted); font-size:13px; display:flex; gap:8px; flex-wrap:wrap; }
  details.prompt { border:1px solid var(--border); border-radius:9px; margin-top:10px; background:var(--panel2); }
  details.prompt > summary { list-style:none; cursor:pointer; padding:11px 14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  details.prompt > summary::-webkit-details-marker { display:none; }
  .prompt-id { font-weight:600; font-family:ui-monospace,monospace; font-size:13px; }
  .cat-chip { font-size:11px; background:rgba(255,209,102,.13); color:var(--warn); border:1px solid rgba(255,209,102,.28); padding:2px 9px; border-radius:20px; flex:none; font-family:ui-monospace,monospace; }
  .p-meta { color:var(--muted); font-size:12px; margin-left:auto; flex:none; }
  .prompt-body { padding:4px 16px 16px; border-top:1px solid var(--border); }
  .prompt-text { margin:12px 0 8px; font-size:13px; }
  .prompt-text > strong { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
  .prompt-text blockquote { margin:0; padding:10px 14px; background:var(--panel); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:8px; color:var(--text); }
  .prompt-text blockquote p { margin:6px 0; }
  details.attach { margin:8px 0 2px; }
  details.attach > summary { cursor:pointer; color:var(--accent); font-size:12.5px; padding:6px 0; font-weight:600; }
  details.attach .attach-meta { color:var(--muted); font-family:ui-monospace,monospace; font-size:11px; margin:4px 0 6px; word-break:break-all; }
  details.attach pre { background:#0b0d12; border:1px solid var(--border); border-radius:7px; padding:11px 13px; overflow:auto; max-height:420px; }
  details.attach pre code { background:none; padding:0; color:#cdd3dd; font-size:12px; }
  .tool-trail { font-size:12px; color:var(--muted); margin:10px 0; }
  .tool-trail code { white-space:normal; }
  .cleanup-trail { font-size:12px; color:var(--muted); margin:6px 0; }
  .cleanup-trail code { white-space:normal; color:var(--ok); }
  .answer { background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:4px 16px; margin:8px 0; }
  .answer pre { background:#0b0d12; border:1px solid var(--border); border-radius:7px; padding:11px 13px; overflow:auto; }
  .answer pre code { background:none; padding:0; color:#cdd3dd; }
  .answer hr { border:none; border-top:1px solid var(--border); margin:14px 0; }
  details.trace { margin:8px 0 4px; }
  details.trace summary { cursor:pointer; color:var(--muted); font-size:13px; padding:6px 0; }
  .trace-body { border-left:2px solid var(--border); padding-left:12px; margin:6px 0 6px 4px; }
  .step { font-size:12.5px; margin:5px 0; display:flex; gap:8px; align-items:baseline; }
  .step-tag { flex:none; font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); width:16px; }
  .step.reasoning { color:#bcc4d2; }
  .step.tool { color:var(--text); }
  .tool-tag { width:18px; height:18px; border-radius:50%; background:var(--border); color:var(--text); display:inline-grid; place-items:center; font-size:10px; font-weight:700; }
  .tool-id { color:#ffd9a8; }
  .tool-params { color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; }
  code { background:rgba(255,255,255,.07); padding:1px 5px; border-radius:5px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; color:#ffd9a8; }
  .empty { color:var(--muted); font-style:italic; padding:8px 0; }
  .wf-badge { display:inline-block; font-size:10.5px; padding:1px 7px; border-radius:20px; margin-top:3px; font-weight:600; }
  .wf-badge.ok { background:rgba(95,208,160,.15); color:var(--ok); }
  .wf-badge.err { background:rgba(255,93,108,.15); color:var(--err); }
  .wf-badge.warn { background:rgba(255,209,102,.15); color:var(--warn); }
  .wf-val { background:var(--panel); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:8px; padding:6px 16px 10px; margin:10px 0; }
  .wf-head { font-size:13.5px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin:8px 0; }
  .wf-stages { color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; }
  .wf-err { color:var(--err); font-family:ui-monospace,monospace; font-size:12px; background:rgba(255,93,108,.08); border-radius:6px; padding:6px 10px; margin:6px 0; white-space:pre-wrap; word-break:break-word; }
`;

const buildHtml = (
  matrixHtml: string,
  cardsHtml: string,
  title: string,
  subtitle: string
): string => {
  const generatedAt = `${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${subtitle}Generated ${generatedAt}.</p>
  ${matrixHtml}
  <p class="legend">Each cell shows step count, latency, and input/output tokens. Expand a prompt below to read the model's full answer and its reasoning + tool-call trace.</p>
  ${cardsHtml}
</div>
</body>
</html>`;
};

export const renderAgentEvalHtml = (options: RenderAgentEvalHtmlOptions): string => {
  const { rows, promptsMap = {}, attachments, title, subtitle } = options;

  const models: string[] = [];
  const byModel = new Map<string, AgentEvalRow[]>();

  for (const r of rows) {
    const m = r.model_name || '?';
    let bucket = byModel.get(m);
    if (!bucket) {
      bucket = [];
      byModel.set(m, bucket);
      models.push(m);
    }
    bucket.push(r);
  }

  const prompts: string[] = [];
  for (const r of rows) {
    if (r.prompt_id && !prompts.includes(r.prompt_id)) {
      prompts.push(r.prompt_id);
    }
  }

  const matrixHtml = renderMatrix(models, prompts, byModel, promptsMap);
  const cardsHtml = models
    .map((m) => renderCard(m, byModel.get(m) ?? [], promptsMap, attachments))
    .join('\n');

  const titleText = title ?? 'Agent Builder Skill Eval';
  const subtitleText =
    subtitle ??
    'Each prompt sent via <code>/api/agent_builder/converse</code>, switching only the connector per model. ';

  return buildHtml(matrixHtml, cardsHtml, titleText, subtitleText);
};
