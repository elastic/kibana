/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console, import/no-nodejs-modules, no-process-exit */

// Orchestrator for the eval HTML reports.
//
// Report data comes ONLY from evaluation results, resolved by load_eval_scores:
//   --scores es:<run_id>   query the golden-cluster .evaluation-scores (real source)
//   --scores <path.json>   read a committed scores JSON
//   (omitted)              committed CI-safe sample fixture (fixtures/sample_eval_scores.json)
// Prompt text + attachments come from the committed dataset
// (src/datasets/persona_matrix_prompts.ts). No uncommitted handoff files are read.
//
// Usage:
//   node generate_reports.js                          -> all models, writes next to scripts/
//   node generate_reports.js --model <name-or-id>     -> single model -> <MATRIX_OUTPUT_DIR>/<slug>/
//   node generate_reports.js --scores es:<run_id>     -> live golden-cluster scores
//   TASK_MODEL=<name-or-id> node generate_reports.js  (env fallback for --model)

import { mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { loadEvalScores } from './load_eval_scores';
import type { AgentEvalRow, AttackDiscoveryRow } from './load_eval_scores';
import { renderPersonaFromMatrix, renderTokenFromMatrix } from './render_from_matrix';
import { generateAgentEvalFull, listAgentEvalModels } from './render_agent_eval';
import { generateAttackDiscovery } from './render_attack_discovery';
import { fetchAttackDiscoveryRowsFromTraces } from './attack_discovery_from_traces';
import { generateTokenUsageOverviewMatrix } from './render_token_usage_overview';
import { generatePersonaMatrix } from './render_persona_matrix';

const SCRIPTS_DIR = join(__dirname, '..');

function parseModelArg(): string | undefined {
  const idx = process.argv.indexOf('--model');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.TASK_MODEL || undefined;
}

function slugify(model: string): string {
  return model
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function matrixOutputBase(): string {
  return (
    process.env.MATRIX_OUTPUT_DIR ||
    join(homedir(), 'Projects', 'agent-builder-skill-dev-cursor-plugin', 'matrix-output')
  );
}

interface ReportSpec {
  name: string;
  file: string;
  run: (
    agentRows: AgentEvalRow[],
    adRows: AttackDiscoveryRow[],
    model?: string
  ) => {
    html: string;
    rowCount: number;
  };
}

const REPORTS: ReportSpec[] = [
  {
    name: 'agent_eval_full',
    file: 'agent_eval_full.html',
    run: (agentRows, _ad, model) => generateAgentEvalFull(agentRows, model),
  },
  {
    // Score-doc-sourced AD summary. Eval score docs do NOT carry the model's
    // discoveries (those live only on the OTLP `generate` tool-call span), so
    // this view is a status/roll-up. The discovery-rich report is written to
    // `attack_discovery_results.html` by the `--traces` path — keep the two on
    // distinct filenames so a `--scores` run can never clobber real trace data.
    name: 'attack_discovery_scores',
    file: 'attack_discovery_scores.html',
    run: (_agent, adRows) => generateAttackDiscovery(adRows),
  },
  {
    name: 'token_usage_overview_matrix',
    file: 'token_usage_overview_matrix.html',
    run: (agentRows) => generateTokenUsageOverviewMatrix(agentRows),
  },
  {
    name: 'llm_persona_matrix',
    file: 'llm_persona_matrix.html',
    run: (agentRows) => generatePersonaMatrix(agentRows),
  },
];

async function main(): Promise<void> {
  const model = parseModelArg();

  // --matrix <path>: render persona + token reports from a REAL merged Security-LLM
  // matrix JSON (weekly golden-cluster pipeline output). agent_eval_full and
  // attack_discovery need per-example conversation traces, which the aggregated
  // matrix does not carry, so they are skipped in this mode.
  const matrixIdx = process.argv.indexOf('--matrix');
  const matrixPath = matrixIdx !== -1 ? process.argv[matrixIdx + 1] : process.env.MATRIX_JSON;
  if (matrixPath) {
    console.log(`[matrix] rendering persona + token from real matrix: ${matrixPath}`);
    const outputDir = SCRIPTS_DIR;
    let failures = 0;
    const matrixReports: Array<{ file: string; run: () => { html: string; rowCount: number } }> = [
      { file: 'llm_persona_matrix.html', run: () => renderPersonaFromMatrix(matrixPath) },
      { file: 'token_usage_overview_matrix.html', run: () => renderTokenFromMatrix(matrixPath) },
    ];
    for (const rep of matrixReports) {
      try {
        console.log(`\nGenerating ${rep.file} (from real matrix)...`);
        const { html, rowCount } = rep.run();
        const outPath = join(outputDir, rep.file);
        writeFileSync(outPath, html);
        console.log(`  Wrote ${outPath} (${html.length} bytes, ${rowCount} models)`);
      } catch (err) {
        failures += 1;
        console.error(`  FAILED ${rep.file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(
      `\n\u2139 agent_eval_full + attack_discovery skipped: the merged matrix has no per-example traces.\n` +
        `  Run with --scores es:<run_id> against the golden cluster for those two reports.`
    );
    if (failures > 0) {
      console.error(`\n\u274C ${failures} report(s) failed.`);
      process.exit(1);
    }
    console.log('\n\u2705 Matrix report generation complete.');
    return;
  }

  const scores = await loadEvalScores();
  console.log(
    `[scores] source=${scores.source} agentEval=${scores.agentEval.length} attackDiscovery=${scores.attackDiscovery.length}`
  );

  // --traces es:<run_id>: build the Attack Discovery report from a REAL run + its
  // OTLP traces (the discoveries live on the `generate` tool-call span as
  // gen_ai.tool.call.arguments.insights[], not in the score docs). This renders
  // attack_discovery_results.html "exactly as Chrysalis's original" from live data.
  const tracesIdx = process.argv.indexOf('--traces');
  const tracesArg = tracesIdx !== -1 ? process.argv[tracesIdx + 1] : process.env.TRACES_RUN;
  if (tracesArg) {
    const runId = tracesArg.startsWith('es:') ? tracesArg.slice(3) : tracesArg;
    const { loadTracingEsAuth, listExampleTraceIds } = await import('./trace_run_source');
    const auth = loadTracingEsAuth();
    console.log(`[traces] run ${runId} -> discoveries from OTLP (${auth.url})`);
    const traceIds = await listExampleTraceIds(runId);
    console.log(`[traces] ${traceIds.length} example trace(s) found`);
    const adRows = await fetchAttackDiscoveryRowsFromTraces(
      auth,
      traceIds,
      model ?? runId.split('::').pop() ?? 'model'
    );
    const html = generateAttackDiscovery(adRows).html;
    const outPath = join(SCRIPTS_DIR, 'attack_discovery_results.html');
    writeFileSync(outPath, html);
    const totalDisc = adRows.reduce((a, r) => a + (r.discovery_count ?? 0), 0);
    console.log(
      `\n\u2705 attack_discovery_results.html written (${html.length} bytes, ${adRows.length} examples, ${totalDisc} discoveries).`
    );
    return;
  }

  let outputDir = SCRIPTS_DIR;
  if (model) {
    const slug = slugify(model);
    outputDir = join(matrixOutputBase(), slug);
    mkdirSync(outputDir, { recursive: true });
    const known = listAgentEvalModels(scores.agentEval);
    console.log(`Scoping reports to model "${model}" (slug: ${slug})`);
    console.log(`  Output dir: ${outputDir}`);
    if (!known.some((k) => k.name === model || k.id === model)) {
      console.warn(
        `  \u26A0 model "${model}" not found in scores. Known models:\n${known
          .map((k) => `    - ${k.name}  (${k.id})`)
          .join('\n')}`
      );
    }
  }

  let failures = 0;
  for (const report of REPORTS) {
    try {
      console.log(`\nGenerating ${report.file}...`);
      const { html, rowCount } = report.run(scores.agentEval, scores.attackDiscovery, model);
      const outPath = join(outputDir, report.file);
      writeFileSync(outPath, html);
      console.log(`  Wrote ${outPath} (${html.length} bytes, ${rowCount} rows)`);
    } catch (err) {
      failures += 1;
      console.error(`  FAILED ${report.file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failures > 0) {
    console.error(`\n\u274C ${failures} report(s) failed.`);
    process.exit(1);
  }
  console.log('\n\u2705 Report generation complete.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
