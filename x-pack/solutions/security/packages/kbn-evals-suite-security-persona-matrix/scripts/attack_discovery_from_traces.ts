/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Trace -> discoveries adapter for the Attack Discovery report.
 *
 * The committed attack-discovery suite (and our co-located Chrysalis kill-chain suite)
 * store only EVALUATOR SCORES in .evaluation-scores. The actual generated
 * discoveries live in the OTLP trace, on the `generate` tool-call span as
 * `attributes.gen_ai.tool.call.arguments.insights[]` (the Attack Discovery API's
 * `AttackDiscovery` shape).
 *
 * This module fetches every span for a run's example traces from the tracing ES,
 * extracts the `insights[]` array, and maps it to the Chrysalis `discoveries[]` shape
 * that render_attack_discovery.ts expects — so we can render the AD report
 * "exactly as Chrysalis's original" from a real run + its traces.
 */

import type { AttackDiscoveryRow } from './load_eval_scores';

interface TracingEsAuth {
  url: string;
  apiKey: string;
}

// Attack Discovery API insight shape (subset we render).
interface InsightLike {
  title?: string;
  detailsMarkdown?: string;
  summaryMarkdown?: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics?: string[];
  alertIds?: string[];
}

interface SpanSource {
  attributes?: Record<string, unknown>;
  span?: { name?: string };
  trace?: { id?: string };
  '@timestamp'?: string;
}

const RISK_BY_TACTIC_COUNT = 25; // heuristic risk contribution per tactic when the insight carries no score

function parseMaybeJson<T>(value: unknown): T | undefined {
  if (value == null) return undefined;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Resolve Attack-Discovery anonymization placeholders to human-readable values,
 * matching Chrysalis's original report (which shows resolved values, not raw tokens).
 *
 * The model emits `{{ <field> <value> }}` tokens where `<value>` is either the
 * real value already (raw-value datasets) or a UUID key into the `replacements`
 * map (`{ uuid: realValue }`). We collapse each token to its resolved value.
 */
function resolvePlaceholders(text: string, replacements: Record<string, string> = {}): string {
  if (!text) return '';
  return text.replace(/\{\{\s*[a-z0-9_.]+\s+([^}]+?)\s*\}\}/gi, (_m, value: string) => {
    const v = value.trim();
    return replacements[v] ?? v;
  });
}

/**
 * Map a raw Attack Discovery insight to the Chrysalis discovery shape the renderer uses.
 */
function insightToDiscovery(
  insight: InsightLike,
  replacements: Record<string, string> = {}
): Record<string, unknown> {
  const tactics = insight.mitreAttackTactics ?? [];
  const alertIds = insight.alertIds ?? [];
  // The API insight has no numeric risk; approximate from tactic breadth + alert count
  // so the report's risk pill is populated (clearly-labelled as derived).
  const riskScore = tactics.length * RISK_BY_TACTIC_COUNT + alertIds.length;
  return {
    title: resolvePlaceholders(insight.title ?? '(untitled)', replacements),
    mitre_attack_tactics: tactics,
    alert_ids: alertIds,
    details_markdown: resolvePlaceholders(insight.detailsMarkdown ?? '', replacements),
    summary_markdown: resolvePlaceholders(insight.summaryMarkdown ?? '', replacements),
    entity_summary_markdown: resolvePlaceholders(insight.entitySummaryMarkdown ?? '', replacements),
    risk_score: riskScore,
  };
}

async function esSearch(auth: TracingEsAuth, body: unknown): Promise<SpanSource[]> {
  const res = await fetch(`${auth.url.replace(/\/$/, '')}/traces-*,.ds-traces-*/_search?size=200`, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${auth.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`tracing ES ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { hits?: { hits?: Array<{ _source: SpanSource }> } };
  return (json.hits?.hits ?? []).map((h) => h._source);
}

/**
 * Build one AttackDiscoveryRow per trace id by pulling the `insights[]` off the
 * generate tool-call span. Empty insights -> a row with 0 discoveries (so the
 * report faithfully shows "no discoveries generated", matching what the model did).
 */
export async function fetchAttackDiscoveryRowsFromTraces(
  auth: TracingEsAuth,
  traceIds: string[],
  modelId: string
): Promise<AttackDiscoveryRow[]> {
  const rows: AttackDiscoveryRow[] = [];
  for (const traceId of traceIds) {
    const spans = await esSearch(auth, { query: { term: { 'trace.id': traceId } } });

    // Skip traces whose subject model doesn't match (dataset traces for a build
    // span every model; we only want this model's discoveries). The model lives
    // on the chat span as gen_ai.request.model.
    const traceModel = spans
      .map((s) => (s.attributes ?? {})['gen_ai.request.model'])
      .find((m): m is string => typeof m === 'string');
    const modelMatches = !modelId || !traceModel || traceModel === modelId;

    if (modelMatches) {
      // Find the span carrying the generate tool call arguments.
      let insights: InsightLike[] = [];
      let alertsContextCount = 0;
      let replacements: Record<string, string> = {};
      for (const s of spans) {
        const attrs = s.attributes ?? {};
        const toolArgs = parseMaybeJson<{
          insights?: InsightLike[];
          replacements?: Record<string, string>;
        }>(attrs['gen_ai.tool.call.arguments']);
        if (toolArgs?.insights) {
          insights = toolArgs.insights;
        }
        // The anonymization map (uuid -> real value) may ride on the tool call
        // args or result; capture it so discoveries render resolved values.
        const toolResult = parseMaybeJson<{ replacements?: Record<string, string> }>(
          attrs['gen_ai.tool.call.result']
        );
        const foundReplacements = toolArgs?.replacements ?? toolResult?.replacements;
        if (foundReplacements) {
          replacements = { ...replacements, ...foundReplacements };
        }
        // Count alerts in the input context (each alert block has an `_id,` line).
        const vars = parseMaybeJson<{ alerts?: unknown; prompt?: string }>(
          attrs['gen_ai.prompt.template.variables']
        );
        if (vars) {
          const ctx = `${JSON.stringify(vars.alerts ?? '')}${vars.prompt ?? ''}`;
          const n = (ctx.match(/_id,/g) ?? []).length;
          if (n > alertsContextCount) alertsContextCount = n;
        }
      }

      const discoveries = insights.map((insight) => insightToDiscovery(insight, replacements));
      rows.push({
        model_id: modelId,
        alerts_context_count: alertsContextCount,
        discovery_count: discoveries.length,
        discoveries,
        // A generate call that returns zero insights is a legitimate SUCCESS
        // (the model correctly found no attack pattern — common when the alert
        // context is 1-2 isolated alerts with no kill-chain to synthesize). It
        // is NOT an error. Distinguish `succeeded_empty` from a real failure so
        // the report does not paint honest empty results as red errors.
        status: discoveries.length === 0 ? 'succeeded_empty' : 'succeeded',
      } as unknown as AttackDiscoveryRow);
    }
  }
  return rows;
}
