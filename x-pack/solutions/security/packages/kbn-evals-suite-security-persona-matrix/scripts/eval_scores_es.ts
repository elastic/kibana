/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

// ES-live source for report data: query the golden-cluster .evaluation-scores
// (via the Kibana evals API) for a single run and project each example into the
// AgentEvalRow / AttackDiscoveryRow shape the report renderers consume.
//
// This mirrors how the weekly matrix pipeline reads scores (run_id -> per-example
// evaluator scores + trace metrics). It is imported dynamically by
// load_eval_scores.ts ONLY when --scores es:<run_id> is used, so the default
// committed-fixture path carries no network dependency.

import type { AgentEvalRow, AttackDiscoveryRow } from './load_eval_scores';

interface EvalRunApiRow {
  model_id?: string;
  model_name?: string;
  example_id?: string;
  category?: string;
  prompt_id?: string;
  scores?: Record<string, number | null>;
  input_tokens?: number | null;
  output_tokens?: number | null;
  latency_ms?: number | null;
  status?: string;
  error?: string;
  output_text?: string;
  steps?: Array<Record<string, unknown>>;
}

function authHeader(): Record<string, string> {
  const apiKey = process.env.EVALUATIONS_KBN_API_KEY || process.env.KIBANA_API_KEY;
  if (apiKey) return { Authorization: `ApiKey ${apiKey}` };
  const user = process.env.KIBANA_USERNAME || 'elastic';
  const pass = process.env.KIBANA_PASSWORD;
  if (pass) {
    return { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
  }
  throw new Error(
    'ES scores source needs auth: set EVALUATIONS_KBN_API_KEY (or KIBANA_USERNAME/KIBANA_PASSWORD).'
  );
}

async function apiGet(kbnUrl: string, path: string): Promise<unknown> {
  const url = `${kbnUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    headers: { 'kbn-xsrf': 'true', 'content-type': 'application/json', ...authHeader() },
  });
  if (!res.ok) {
    throw new Error(`evals API ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

/**
 * Fetch every example row for a run and split into agent-eval vs attack-discovery.
 * The evals API returns per-(example x evaluator) score docs; we group by example
 * and flatten the named evaluators (Criteria, Trajectory, Skill Invoked) into the
 * per-row score fields the renderers expect.
 */
export async function fetchEvalRunRows(
  kbnUrl: string,
  runId: string
): Promise<{ agentEval: AgentEvalRow[]; attackDiscovery: AttackDiscoveryRow[] }> {
  console.log(`[scores] querying eval run ${runId} from ${kbnUrl}`);
  const payload = (await apiGet(
    kbnUrl,
    `/internal/evaluations/runs/${encodeURIComponent(runId)}/examples`
  )) as { rows?: EvalRunApiRow[]; examples?: EvalRunApiRow[] };
  const apiRows: EvalRunApiRow[] = payload?.rows ?? payload?.examples ?? [];

  const agentEval: AgentEvalRow[] = [];
  const attackDiscovery: AttackDiscoveryRow[] = [];

  for (const r of apiRows) {
    const scores = r.scores ?? {};
    const isAd =
      (r.category ?? '').toUpperCase() === 'C6' || /attack.?discovery/i.test(r.prompt_id ?? '');
    if (isAd) {
      attackDiscovery.push({
        model_id: r.model_id,
        model_name: r.model_name,
        status: r.status,
        latency_ms: r.latency_ms,
        error: r.error,
        discoveries: [],
      });
    } else {
      agentEval.push({
        model_id: r.model_id,
        model_name: r.model_name,
        category: r.category,
        prompt_id: r.prompt_id,
        criteria_score: scores.Criteria ?? scores.criteria_score ?? null,
        trajectory_score: scores.Trajectory ?? scores.trajectory_score ?? null,
        skill_invoked: scores['Skill Invoked'] ?? scores.skill_invoked ?? null,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
        latency_ms: r.latency_ms,
        status: r.status,
        error: r.error,
        response_message: r.output_text,
        steps: (r.steps ?? []) as AgentEvalRow['steps'],
      });
    }
  }

  if (!agentEval.length && !attackDiscovery.length) {
    throw new Error(`eval run ${runId} returned no example rows from ${kbnUrl}`);
  }
  return { agentEval, attackDiscovery };
}
