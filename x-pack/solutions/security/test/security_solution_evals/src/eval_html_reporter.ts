/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

interface EvaluationEntry {
  evaluator: string;
  score?: number | null;
  label?: string | null;
  explanation?: string;
  metadata?: Record<string, unknown> | null;
}

interface ConversationAttachment {
  input: { question?: string };
  expected?: { expected?: string } | string;
  metadata?: Record<string, unknown>;
  response: string | null;
  steps: Array<Record<string, unknown>>;
  errors: unknown[];
  evaluations: EvaluationEntry[];
}

interface ExampleRow {
  testTitle: string;
  dataset: string;
  exampleIndex: string;
  question: string;
  expected: string;
  actualResponse: string;
  toolsCalled: string[];
  evaluations: EvaluationEntry[];
  errors: unknown[];
}

/**
 * Custom Playwright reporter that generates a rich, tabular HTML report
 * for security solution evals. Presents evaluator scores, expected vs actual
 * values, and evaluator reasoning in an easy-to-read format.
 */
export default class EvalHtmlReporter implements Reporter {
  private outputDir: string;
  private examples: ExampleRow[] = [];

  constructor(options: { outputFolder?: string } = {}) {
    this.outputDir =
      options.outputFolder ?? path.join(process.cwd(), 'playwright-report');
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.examples = [];
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    for (const attachment of result.attachments) {
      if (attachment.contentType !== 'application/json' || !attachment.body) {
        continue;
      }

      let data: ConversationAttachment;
      try {
        data = JSON.parse(attachment.body.toString('utf-8'));
      } catch {
        continue;
      }

      // Only process eval attachments (they have evaluations array)
      if (!Array.isArray(data.evaluations)) {
        continue;
      }

      const nameMatch = attachment.name.match(
        /\[([^\]]+)\]\s*#(\d+)\s*"(.+)"/
      );
      const dataset = nameMatch?.[1] ?? 'unknown';
      const exampleIndex = nameMatch?.[2] ?? '?';
      const question =
        data.input?.question ?? nameMatch?.[3] ?? 'unknown question';

      const expected =
        typeof data.expected === 'string'
          ? data.expected
          : (data.expected as { expected?: string })?.expected ?? '';

      const toolsCalled = (data.steps ?? [])
        .filter((s: Record<string, unknown>) => s.type === 'tool_call')
        .map(
          (s: Record<string, unknown>) => (s.tool_id as string) ?? 'unknown'
        );

      this.examples.push({
        testTitle: test.title,
        dataset,
        exampleIndex,
        question,
        expected,
        actualResponse: data.response ?? '(no response)',
        toolsCalled,
        evaluations: data.evaluations,
        errors: data.errors ?? [],
      });
    }
  }

  onEnd(_result: FullResult): void {
    if (this.examples.length === 0) {
      return;
    }

    fs.mkdirSync(this.outputDir, { recursive: true });
    const html = this.buildHtml();
    const outputPath = path.join(this.outputDir, 'eval-report.html');
    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private buildHtml(): string {
    // Group by dataset
    const byDataset = new Map<string, ExampleRow[]>();
    for (const ex of this.examples) {
      const group = byDataset.get(ex.dataset) ?? [];
      group.push(ex);
      byDataset.set(ex.dataset, group);
    }

    // Collect all unique evaluator names
    const allEvaluators = new Set<string>();
    for (const ex of this.examples) {
      for (const ev of ex.evaluations) {
        allEvaluators.add(ev.evaluator);
      }
    }
    const evaluatorNames = [...allEvaluators].sort();

    // Build summary table and detail sections
    const summaryRows = this.buildSummaryRows(byDataset, evaluatorNames);
    const detailSections = this.buildDetailSections(byDataset, evaluatorNames);
    const aggregateTable = this.buildAggregateTable(
      byDataset,
      evaluatorNames
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Evaluation Report</title>
<style>
  :root {
    --bg: #0d1117;
    --surface: #161b22;
    --border: #30363d;
    --text: #c9d1d9;
    --text-muted: #8b949e;
    --accent: #58a6ff;
    --green: #3fb950;
    --yellow: #d29922;
    --red: #f85149;
    --orange: #db6d28;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    padding: 24px;
  }
  h1 { font-size: 24px; margin-bottom: 8px; color: #fff; }
  h2 { font-size: 20px; margin: 32px 0 12px; color: #fff; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  h3 { font-size: 16px; margin: 24px 0 8px; color: var(--accent); }
  .subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 24px;
    font-size: 13px;
  }
  th, td {
    padding: 8px 12px;
    text-align: left;
    border: 1px solid var(--border);
  }
  th {
    background: var(--surface);
    color: #fff;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  tr:nth-child(even) td { background: rgba(22, 27, 34, 0.5); }
  tr:hover td { background: rgba(88, 166, 255, 0.08); }
  .score-cell { text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }
  .score-1   { color: var(--green); }
  .score-high { color: var(--green); }
  .score-mid  { color: var(--yellow); }
  .score-low  { color: var(--orange); }
  .score-0    { color: var(--red); }
  .score-na   { color: var(--text-muted); }
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .pill-pass { background: rgba(63, 185, 80, 0.15); color: var(--green); }
  .pill-fail { background: rgba(248, 81, 73, 0.15); color: var(--red); }
  .pill-partial { background: rgba(210, 153, 34, 0.15); color: var(--yellow); }
  .detail-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
  }
  .detail-card summary {
    cursor: pointer;
    font-weight: 600;
    color: #fff;
    padding: 4px 0;
  }
  .detail-card summary:hover { color: var(--accent); }
  .label { color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .value { margin-bottom: 12px; white-space: pre-wrap; word-break: break-word; }
  .value-expected { background: rgba(63, 185, 80, 0.06); border-left: 3px solid var(--green); padding: 8px 12px; border-radius: 4px; }
  .value-actual   { background: rgba(88, 166, 255, 0.06); border-left: 3px solid var(--accent); padding: 8px 12px; border-radius: 4px; }
  .eval-row {
    display: grid;
    grid-template-columns: 140px 70px 1fr;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    align-items: start;
  }
  .eval-row:last-child { border-bottom: none; }
  .eval-name { font-weight: 600; color: #fff; }
  .eval-explanation { color: var(--text-muted); font-size: 12px; }
  .tools-list { display: flex; gap: 4px; flex-wrap: wrap; }
  .tool-tag {
    background: rgba(88, 166, 255, 0.1);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
  }
  .aggregate-table th { text-align: center; }
  .aggregate-table td:not(:first-child) { text-align: center; }
  .nav { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .nav a {
    color: var(--accent);
    text-decoration: none;
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
  }
  .nav a:hover { background: rgba(88, 166, 255, 0.1); }
  .error-badge {
    background: rgba(248, 81, 73, 0.15);
    color: var(--red);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
  }
</style>
</head>
<body>

<h1>Evaluation Report</h1>
<p class="subtitle">Generated ${new Date().toLocaleString()} &middot; ${this.examples.length} examples across ${byDataset.size} dataset(s)</p>

<nav class="nav">
  <a href="#aggregate">Aggregate Scores</a>
  <a href="#summary">Per-Example Summary</a>
  <a href="#details">Detailed Results</a>
</nav>

<h2 id="aggregate">Aggregate Scores by Dataset</h2>
${aggregateTable}

<h2 id="summary">Per-Example Score Summary</h2>
<table>
<thead>
<tr>
  <th>#</th>
  <th>Dataset</th>
  <th>Question</th>
  ${evaluatorNames.map((n) => `<th class="score-cell">${this.escHtml(n)}</th>`).join('\n  ')}
</tr>
</thead>
<tbody>
${summaryRows}
</tbody>
</table>

<h2 id="details">Detailed Results</h2>
${detailSections}

</body>
</html>`;
  }

  private buildAggregateTable(
    byDataset: Map<string, ExampleRow[]>,
    evaluatorNames: string[]
  ): string {
    const rows: string[] = [];

    for (const [dataset, examples] of byDataset) {
      const avgScores = evaluatorNames.map((evalName) => {
        const scores = examples
          .flatMap((ex) => ex.evaluations)
          .filter(
            (ev) =>
              ev.evaluator === evalName &&
              ev.score !== null &&
              ev.score !== undefined
          )
          .map((ev) => ev.score as number);

        if (scores.length === 0) return null;
        return scores.reduce((a, b) => a + b, 0) / scores.length;
      });

      rows.push(
        `<tr>
  <td>${this.escHtml(dataset)}</td>
  ${avgScores
    .map((avg) => {
      if (avg === null)
        return '<td class="score-cell score-na">N/A</td>';
      return `<td class="score-cell ${this.scoreClass(avg)}">${avg.toFixed(2)}</td>`;
    })
    .join('\n  ')}
</tr>`
      );
    }

    return `<table class="aggregate-table">
<thead>
<tr>
  <th>Dataset</th>
  ${evaluatorNames.map((n) => `<th>${this.escHtml(n)}</th>`).join('\n  ')}
</tr>
</thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>`;
  }

  private buildSummaryRows(
    byDataset: Map<string, ExampleRow[]>,
    evaluatorNames: string[]
  ): string {
    const rows: string[] = [];

    for (const [, examples] of byDataset) {
      for (const ex of examples) {
        const scoreMap = new Map<string, EvaluationEntry>();
        for (const ev of ex.evaluations) {
          scoreMap.set(ev.evaluator, ev);
        }

        const errorBadge =
          ex.errors.length > 0
            ? ` <span class="error-badge">${ex.errors.length} error(s)</span>`
            : '';

        const shortQuestion =
          ex.question.length > 80
            ? `${ex.question.slice(0, 77)}...`
            : ex.question;

        rows.push(
          `<tr>
  <td>${this.escHtml(ex.exampleIndex)}</td>
  <td>${this.escHtml(ex.dataset)}</td>
  <td><a href="#detail-${ex.dataset}-${ex.exampleIndex}">${this.escHtml(shortQuestion)}</a>${errorBadge}</td>
  ${evaluatorNames
    .map((name) => {
      const ev = scoreMap.get(name);
      if (!ev || ev.score === null || ev.score === undefined) {
        return '<td class="score-cell score-na">\u2014</td>';
      }
      const display =
        ev.score > 10 ? ev.score.toLocaleString() : ev.score.toFixed(2);
      return `<td class="score-cell ${this.scoreClass(ev.score)}" title="${this.escHtml(ev.explanation ?? '')}">${display}</td>`;
    })
    .join('\n  ')}
</tr>`
        );
      }
    }

    return rows.join('\n');
  }

  private buildDetailSections(
    byDataset: Map<string, ExampleRow[]>,
    evaluatorNames: string[]
  ): string {
    const sections: string[] = [];

    for (const [dataset, examples] of byDataset) {
      sections.push(`<h3>${this.escHtml(dataset)}</h3>`);

      for (const ex of examples) {
        const scoreMap = new Map<string, EvaluationEntry>();
        for (const ev of ex.evaluations) {
          scoreMap.set(ev.evaluator, ev);
        }

        const overallPill = this.getOverallPill(ex.evaluations);

        sections.push(`
<details class="detail-card" id="detail-${ex.dataset}-${ex.exampleIndex}">
<summary>#${this.escHtml(ex.exampleIndex)} \u2014 ${this.escHtml(ex.question)} ${overallPill}</summary>

<div style="margin-top: 12px;">
  <div class="label">Question (Input)</div>
  <div class="value">${this.escHtml(ex.question)}</div>

  <div class="label">Expected Output</div>
  <div class="value value-expected">${this.escHtml(ex.expected || '(none)')}</div>

  <div class="label">Actual Response</div>
  <div class="value value-actual">${this.escHtml(ex.actualResponse)}</div>

  <div class="label">Tools Called</div>
  <div class="value">
    <div class="tools-list">
      ${ex.toolsCalled.length > 0 ? ex.toolsCalled.map((t) => `<span class="tool-tag">${this.escHtml(t)}</span>`).join('') : '<span class="score-na">No tools called</span>'}
    </div>
  </div>

  ${ex.errors.length > 0 ? `<div class="label">Errors</div><div class="value" style="color: var(--red);">${this.escHtml(JSON.stringify(ex.errors, null, 2))}</div>` : ''}

  <div class="label">Evaluator Scores &amp; Reasoning</div>
  <div style="margin-top: 4px;">
    ${evaluatorNames
      .map((name) => {
        const ev = scoreMap.get(name);
        if (!ev) return '';

        const scoreDisplay =
          ev.score === null || ev.score === undefined
            ? '<span class="score-na">N/A</span>'
            : ev.score > 10
              ? `<span class="${this.scoreClass(ev.score)}">${ev.score.toLocaleString()}</span>`
              : `<span class="${this.scoreClass(ev.score)}">${ev.score.toFixed(2)}</span>`;

        const explanation = ev.explanation
          ? `<div class="eval-explanation">${this.escHtml(ev.explanation)}</div>`
          : '<div class="eval-explanation" style="font-style: italic;">No explanation provided</div>';

        const metadataHtml =
          ev.metadata && Object.keys(ev.metadata).length > 0
            ? `<details style="margin-top: 4px;"><summary style="font-size: 11px; color: var(--text-muted); cursor: pointer;">Show evaluator metadata</summary><pre style="font-size: 11px; color: var(--text-muted); margin-top: 4px; white-space: pre-wrap; word-break: break-word;">${this.escHtml(JSON.stringify(ev.metadata, null, 2))}</pre></details>`
            : '';

        return `<div class="eval-row">
      <div class="eval-name">${this.escHtml(name)}</div>
      <div class="score-cell">${scoreDisplay}</div>
      <div>${explanation}${metadataHtml}</div>
    </div>`;
      })
      .filter(Boolean)
      .join('\n    ')}
  </div>
</div>
</details>`);
      }
    }

    return sections.join('\n');
  }

  private scoreClass(score: number): string {
    if (score > 10) return ''; // Token counts or large numbers
    if (score >= 1) return 'score-1';
    if (score >= 0.8) return 'score-high';
    if (score >= 0.5) return 'score-mid';
    if (score > 0) return 'score-low';
    return 'score-0';
  }

  private getOverallPill(evaluations: EvaluationEntry[]): string {
    const meaningful = evaluations.filter(
      (ev) =>
        ev.score !== null &&
        ev.score !== undefined &&
        ev.evaluator !== 'TokenUsage' &&
        ev.score <= 1
    );
    if (meaningful.length === 0) return '';

    const avg =
      meaningful.reduce((a, b) => a + (b.score ?? 0), 0) / meaningful.length;
    if (avg >= 0.9)
      return '<span class="pill pill-pass">PASS</span>';
    if (avg >= 0.5)
      return '<span class="pill pill-partial">PARTIAL</span>';
    return '<span class="pill pill-fail">NEEDS WORK</span>';
  }

  private escHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
