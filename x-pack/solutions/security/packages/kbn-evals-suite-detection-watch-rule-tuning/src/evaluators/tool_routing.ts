/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { DIAGNOSE_STEP_ID, RULE_TUNING_INVESTIGATE_TOOL_ID } from '../constants';
import type { AgentBuilderCatalog } from '../agent_builder_catalog';
import { readAgentBuilderCatalog } from '../agent_builder_catalog';
import type { RuleTuningVerdict } from '../workflow_task';

const TOOL_KIND = 'attributes.elastic.inference.span.kind == "TOOL"';

interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: Array<Array<number | string | null>>;
}

/**
 * Tool Routing (trace-based, direction: maximize).
 *
 * Ported from `kbn-evals-suite-detection-watch-rule-creation` (decision 7 of the
 * OpenSpec reconciliation: #284701 is merged, so the trace evaluators are
 * unblocked). Adapted to the tuning review's investigate path: the review's
 * `diagnose_rule` step is instructed to retrieve the harvested false positives
 * with the `investigate-rule.get_alerts_by_ids` tool (rule_tuning_review.yaml),
 * so a model that diagnoses from the prompt alone — plausible prose with no
 * investigation behind it — never invokes it. This evaluator scores 1 when at
 * least one TOOL span invoking that tool is found for the run.
 *
 * Span lookup is two-stage (#284725 not required):
 *  1. workflow trace id — direct join when agent spans share the review
 *     execution's root span;
 *  2. the diagnose step's persisted `conversation_id` via
 *     `gen_ai.conversation.id` — Agent Builder conversations can fork their own
 *     root trace (`create-conversation: true` on the step), which leaves stage 1
 *     with zero TOOL spans (measured: every run of builds 455/457 in the sibling
 *     suite, whose step forks the same way).
 *
 * Zero TOOL spans across BOTH stages is NOT a score: it means neither join
 * reached the agent's spans, so the run is scored N/A rather than a false 0
 * (STATS COUNT(*) always returns a row — an unmeasured trace otherwise reads
 * as a confident zero).
 *
 * Two further ways a 0 would be dishonest, both reported as N/A instead:
 *  - the stack's Agent Builder catalog does not carry the graded tool (or its
 *    skill), so the review could not call it at all — an environment defect,
 *    read from `/api/agent_builder/skills` via `readAgentBuilderCatalog`;
 *  - the graded tool id is missing from this cluster's spans *and* the catalog
 *    was unreadable, so the 0 is flagged as unverified in its explanation.
 *
 * Span identity for skill tools, measured on the AZ-3e n=3 baseline (105 cells,
 * 244 `custom` tool spans): every tool call is exported twice — once under
 * `data_stream.dataset: agent_builder.otel`, where tool ids outside
 * AGENT_BUILDER_BUILTIN_TOOLS are anonymized to `custom`, and once under
 * `generic.otel`, where the real id is kept. The 244 `custom` spans are exactly
 * the six non-allow-listed tools of that run (`security.find_rules`,
 * `security.discover_rule_tags`, `natural_language_search`, `list_tools`,
 * `list_skills`, `relevance_search`), each also present raw in `generic.otel`.
 * So a `FROM traces-*` predicate on `attributes.gen_ai.tool.name` DOES see a
 * skill tool's real id — do NOT narrow this query to `agent_builder.otel`, and
 * do not "fix" a 0 by adding tool ids to the platform allow-list.
 */
/**
 * The diagnose step's Agent Builder conversation id, when the step persisted one
 * (`create-conversation: true` in rule_tuning_review.yaml). Exported so the
 * suite's setup probe joins spans exactly the way the evaluator does — a probe
 * that proves reachability on a different key would arm the evaluators
 * dishonestly.
 */
export const extractConversationId = (
  output: RuleTuningVerdict | undefined
): string | undefined => {
  const diagnose = (output?.stepExecutions ?? []).find(
    (s) => s.stepId === DIAGNOSE_STEP_ID && s.output != null
  );
  const id = (diagnose?.output as { conversation_id?: unknown } | null)?.conversation_id;
  return typeof id === 'string' ? id : undefined;
};

/** Join clauses tried, in order, to reach a run's agent tool spans. */
export const toolSpanJoinClauses = ({
  traceId,
  conversationId,
}: {
  traceId?: string;
  conversationId?: string;
}): Array<{ name: string; where: string }> => [
  ...(traceId ? [{ name: 'workflow trace id', where: `trace.id == "${traceId}"` }] : []),
  ...(conversationId
    ? [
        {
          name: 'gen_ai.conversation.id',
          where: `attributes.gen_ai.conversation.id == "${conversationId}"`,
        },
      ]
    : []),
];

export function createToolRoutingEvaluator({
  traceEsClient,
  log,
  fetch,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
  /**
   * Kibana HTTP handler, used to read the stack's Agent Builder catalog so a 0
   * can be told apart from "the graded tool does not exist here" (UNMEASURED).
   * Omitted in unit tests that only exercise the span counting.
   */
  fetch?: HttpHandler;
}): Evaluator {
  let catalogPromise: Promise<AgentBuilderCatalog> | undefined;
  /** Memoized: the catalog is a property of the stack, not of the example. */
  const readCatalog = async (): Promise<AgentBuilderCatalog | undefined> => {
    if (!fetch) return undefined;
    catalogPromise = catalogPromise ?? readAgentBuilderCatalog({ fetch, log });
    try {
      return await catalogPromise;
    } catch (error) {
      log.debug(`catalog probe failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  };

  const countToolSpans = async (
    where: string
  ): Promise<{ total: number; required: number } | undefined> => {
    const response = (await traceEsClient.esql.query({
      query: `FROM traces-*\n| WHERE ${where} AND ${TOOL_KIND}\n| STATS tool_calls = COUNT(*),\n  required_tool_calls = COUNT(CASE(attributes.gen_ai.tool.name == "${RULE_TUNING_INVESTIGATE_TOOL_ID}", 1, NULL))`,
    })) as unknown as EsqlResponse;
    const row = response.values?.[0];
    if (!row) return undefined;
    const totalIdx = response.columns.findIndex((c) => c.name === 'tool_calls');
    const reqIdx = response.columns.findIndex((c) => c.name === 'required_tool_calls');
    if (totalIdx === -1 || reqIdx === -1) return undefined;
    const total = row[totalIdx] as number | null | undefined;
    const required = row[reqIdx] as number | null | undefined;
    if (total == null) return undefined;
    if (total === 0) return undefined; // not reported on this join key
    return { total, required: required ?? 0 };
  };

  return {
    direction: 'maximize',
    name: 'Tool Routing',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const result = output as RuleTuningVerdict | undefined;
      const traceId = result?.traceId;
      const conversationId = extractConversationId(result);
      if (!traceId && !conversationId) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No traceId and no diagnose conversation_id to join tool spans on',
          metadata: undefined,
        };
      }

      // Stages, in order, using the shared join clauses.
      for (const clause of toolSpanJoinClauses({ traceId, conversationId })) {
        try {
          const counts = await countToolSpans(clause.where);
          if (counts && counts.required > 0) {
            return {
              score: 1,
              label: undefined,
              explanation: `joined on ${clause.name}`,
              metadata: undefined,
            };
          }

          if (counts) {
            // The graded tool was not called. Before reporting 0, ask whether this
            // stack's catalog even carries it: a stack without the skill scores 0 on
            // every example for an environment reason, which is UNMEASURED, not a
            // routing failure (and the suite's own kill rule fires on 0s).
            const catalog = await readCatalog();
            if (catalog?.readable && !catalog.investigateRuleReachable) {
              log.warning(
                `Tool Routing unmeasured: ${RULE_TUNING_INVESTIGATE_TOOL_ID} is not in this ` +
                  `stack's Agent Builder catalog (${catalog.evidence})`
              );
              return {
                score: null,
                label: 'unavailable',
                explanation:
                  `The graded tool ${RULE_TUNING_INVESTIGATE_TOOL_ID} is absent from this stack's ` +
                  `Agent Builder catalog, so the review could not call it: ${catalog.evidence}. ` +
                  `Reported as UNMEASURED — a 0 here would be an environment defect, not a ` +
                  `routing failure.`,
                metadata: undefined,
              };
            }

            return {
              score: 0,
              label: undefined,
              explanation:
                `joined on ${clause.name}; ${RULE_TUNING_INVESTIGATE_TOOL_ID} was not called in ` +
                `${counts.total} TOOL span(s)${
                  catalog?.readable
                    ? `, and the catalog carries it (${catalog.evidence}) — a real 0`
                    : ` (catalog not checked, so treat this 0 as unverified)`
                }`,
              metadata: undefined,
            };
          }
        } catch (error) {
          log.debug(
            `Tool Routing ${clause.name} join failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Neither key matched. Distinguish "this cluster holds no agent tool spans at all"
      // (export/config problem) from "spans exist but carry different join keys" (attribute
      // drift) — otherwise every future N/A costs another round of manual trace archaeology.
      let diagnosis = 'probe did not run';
      try {
        const probe = (await traceEsClient.esql.query({
          query: `FROM traces-*
| WHERE attributes.elastic.inference.span.kind == "TOOL"
| STATS tool_spans = COUNT(*)`,
        })) as unknown as EsqlResponse;
        const total = Number(probe.values?.[0]?.[0] ?? 0);
        diagnosis =
          total > 0
            ? `the cluster holds ${total} TOOL span(s) but none match this run's join keys — ` +
              'attribute drift, compare gen_ai.conversation.id / trace.id on a recent span'
            : 'the cluster holds NO TOOL spans at all — agent spans are not exported to the ' +
              'tracing ES this suite queries (check TRACING_ES_URL and EDOT export)';
      } catch (error) {
        diagnosis = `probe failed: ${error instanceof Error ? error.message : String(error)}`;
      }

      log.warning(`Tool Routing unavailable — ${diagnosis}`);
      return {
        score: null,
        label: 'unavailable',
        explanation: `No TOOL spans reachable via the workflow trace id or the diagnose conversation_id. ${diagnosis}`,
        metadata: undefined,
      };
    },
  };
}

/**
 * Setup-time assertion that a run's agent tool spans are actually reachable in the tracing
 * cluster, using the SAME join clauses the Tool Routing evaluator scores with.
 *
 * A traceId on the execution document only proves the workflow was traced; it says nothing
 * about whether Agent Builder exported the tool spans the evaluator counts. Asserting the
 * weaker property armed the evaluators on a run that had no agent output at all
 * (measured in the sibling suite: build 459, where 6 of 25 runs produced no rule yet setup
 * passed). Here the probe is a real tuning run (seed → sweep → review), so a probe that
 * carried no join keys at all would fail this assertion rather than silently N/A every
 * trace evaluator.
 */
export const assertToolSpansReachable = async ({
  traceEsClient,
  probe,
  log,
}: {
  traceEsClient: EsClient;
  probe: RuleTuningVerdict;
  log: ToolingLog;
}): Promise<void> => {
  const clauses = toolSpanJoinClauses({
    traceId: probe.traceId,
    conversationId: extractConversationId(probe),
  });

  for (const clause of clauses) {
    try {
      const response = (await traceEsClient.esql.query({
        query: `FROM traces-*\n| WHERE ${clause.where} AND ${TOOL_KIND}\n| STATS tool_spans = COUNT(*)`,
      })) as unknown as EsqlResponse;
      if (Number(response.values?.[0]?.[0] ?? 0) > 0) {
        log.info(`Tool spans reachable via ${clause.name}`);
        return;
      }
    } catch (error) {
      log.debug(
        `Reachability probe on ${clause.name} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  throw new Error(
    `No agent TOOL spans are reachable for the setup probe (tried: ${
      clauses.map((c) => c.name).join(', ') || 'no join keys at all'
    }). Trace-based evaluators would score N/A on every example and the suite would still ` +
      'report a pass. Check that Agent Builder spans are exported to TRACING_ES_URL.'
  );
};
