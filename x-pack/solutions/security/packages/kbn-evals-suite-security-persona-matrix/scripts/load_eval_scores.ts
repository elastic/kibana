/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console, import/no-nodejs-modules */

// Single source of truth for report input data.
//
// Reports must ONLY consume evaluation results. There are two supported sources,
// resolved from the --scores flag / EVAL_SCORES env:
//
//   --scores es:<run_id>     Query the live eval score store (.evaluation-scores
//                            via the Kibana evals API) for a specific run. This is
//                            the REAL source, matching the weekly matrix pipeline.
//   --scores <path.json>     Read a committed scores JSON (same shape as the
//                            sample fixture). Useful for offline regeneration.
//   (omitted)                Fall back to the committed CI-safe sample fixture
//                            (fixtures/sample_eval_scores.json) so the generators
//                            never depend on uncommitted local files.
//
// The uncommitted handoff artifacts (agent_eval.jsonl, agent_prompts.csv,
// attachments_snapshot.json, attack_discovery_results.jsonl) are NEVER read here —
// they are gitignored and absent on CI.

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface EvalStep {
  type?: string;
  tool_id?: string;
  tool_name?: string;
  params?: Record<string, unknown>;
  results?: unknown;
  reasoning?: string;
  [k: string]: unknown;
}

export interface AgentEvalRow {
  model_id?: string;
  model_name?: string;
  category?: string;
  prompt_id?: string;
  criteria_score?: number | null;
  trajectory_score?: number | null;
  skill_invoked?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  latency_ms?: number | null;
  status?: string;
  error?: string;
  response_message?: string;
  steps?: EvalStep[];
  tools_called?: string;
  [k: string]: unknown;
}

export interface AttackDiscoveryRow {
  model_id?: string;
  model_name?: string;
  status?: string;
  discovery_count?: number;
  alerts_context_count?: number;
  latency_ms?: number | null;
  connector_id?: string;
  error?: string;
  discoveries?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}

export interface EvalScores {
  agentEval: AgentEvalRow[];
  attackDiscovery: AttackDiscoveryRow[];
  source: string;
}

const HERE = __dirname;
const SAMPLE_FIXTURE = join(HERE, 'fixtures', 'sample_eval_scores.json');

function resolveSpec(): string {
  const idx = process.argv.indexOf('--scores');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.EVAL_SCORES || '';
}

function loadFromFile(path: string): EvalScores {
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return {
    agentEval: parsed.agentEval ?? [],
    attackDiscovery: parsed.attackDiscovery ?? [],
    source: `file:${path}`,
  };
}

/**
 * Query the live eval score store for a run. Kept behind a dynamic import so the
 * committed-fixture path has zero ES/Kibana dependencies (and CI, which never has
 * a cluster, never loads it). The heavy matrix-query logic lives in the eval
 * pipeline / skill-dev plugin; here we only need the per-example rows for a run.
 */
async function loadFromEs(runId: string): Promise<EvalScores> {
  const kbnUrl = process.env.EVALUATIONS_KBN_URL;
  if (!kbnUrl) {
    throw new Error(
      `--scores es:${runId} requires EVALUATIONS_KBN_URL (golden-cluster Kibana). ` +
        `Set it, or pass a committed scores JSON path instead.`
    );
  }
  const { fetchEvalRunRows } = await import('./eval_scores_es');
  const rows = await fetchEvalRunRows(kbnUrl, runId);
  await enrichAgentEvalSteps(rows.agentEval);
  return { ...rows, source: `es:${runId}` };
}

/**
 * Best-effort: rebuild each agent-eval row's step trace from its OTLP trace so
 * the rendered "Step trace" includes the model's reasoning (THINK) narration,
 * not just tool calls. The `--scores es:` export drops reasoning steps; the raw
 * `gen_ai.output.messages` on the chat spans still carry them. Requires the
 * tracing-ES env (TRACING_ES_URL/API_KEY); silently no-ops when unavailable or
 * when a trace yields no richer trace than we already have.
 */
async function enrichAgentEvalSteps(agentEval: AgentEvalRow[]): Promise<void> {
  if (!process.env.TRACING_ES_URL) return;
  let auth;
  try {
    const mod = await import('./enrich_steps_from_traces');
    auth = mod.loadTracingEsAuth();
    for (const row of agentEval) {
      const traceId = (row as { trace_id?: string }).trace_id;
      if (traceId) {
        try {
          const steps = await mod.enrichStepsFromTrace(auth, traceId, row.model_id);
          // Only replace when the trace gives us a richer view (i.e. it actually
          // recovered reasoning steps the export dropped).
          const hasReasoning = steps.some((s) => s.type === 'reasoning');
          if (hasReasoning && steps.length >= (row.steps?.length ?? 0)) {
            row.steps = steps as AgentEvalRow['steps'];
            (row as { num_steps?: number }).num_steps = steps.length;
          }
        } catch {
          // per-row failure is non-fatal; keep the export's steps.
        }
      }
    }
  } catch {
    // tracing ES not reachable / module load failed -> leave steps untouched.
  }
}

export async function loadEvalScores(): Promise<EvalScores> {
  const spec = resolveSpec();

  if (spec.startsWith('es:')) {
    return loadFromEs(spec.slice(3));
  }
  if (spec) {
    if (!existsSync(spec)) {
      throw new Error(`--scores path does not exist: ${spec}`);
    }
    return loadFromFile(spec);
  }

  // Default: committed CI-safe sample fixture.
  if (!existsSync(SAMPLE_FIXTURE)) {
    throw new Error(
      `No --scores given and sample fixture missing at ${SAMPLE_FIXTURE}. ` +
        `Pass --scores es:<run_id> or a committed scores JSON.`
    );
  }
  console.log(`[scores] using committed sample fixture: ${SAMPLE_FIXTURE}`);
  return loadFromFile(SAMPLE_FIXTURE);
}
