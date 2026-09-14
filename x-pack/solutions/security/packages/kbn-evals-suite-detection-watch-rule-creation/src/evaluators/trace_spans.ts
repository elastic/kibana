/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { DRAFT_STEP_ID } from '../constants';
import type { RuleCreationResult } from '../rule_creation_client';

export const TOOL_KIND = 'attributes.elastic.inference.span.kind == "TOOL"';

export interface EsqlResponse {
  columns: Array<{ name: string; type: string }>;
  values: Array<Array<number | string | null>>;
}

/**
 * The draft step's Agent Builder conversation id, when the step persisted one. Exported so
 * the suite's setup probe joins spans exactly the way the evaluators do — a probe that
 * proves reachability on a different key would arm the evaluators dishonestly.
 */
export const extractConversationId = (
  output: RuleCreationResult | undefined
): string | undefined => {
  const draft = (output?.stepExecutions ?? []).find(
    (s) => s.stepId === DRAFT_STEP_ID && s.output != null
  );
  const id = (draft?.output as { conversation_id?: unknown } | null)?.conversation_id;
  return typeof id === 'string' ? id : undefined;
};

/**
 * Join clauses tried, in order, to reach a run's agent tool spans.
 *  1. workflow trace id — direct join when agent spans share the workflow root span;
 *  2. the draft step's persisted `conversation_id` via `gen_ai.conversation.id` — Agent
 *     Builder conversations can fork their own root trace, leaving stage 1 with zero
 *     TOOL spans (measured: every run of builds 455/457).
 */
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

// Separates "no TOOL spans exported at all" from "spans exist under other join keys".
export const diagnoseUnreachableToolSpans = async (traceEsClient: EsClient): Promise<string> => {
  try {
    const probe = (await traceEsClient.esql.query({
      query: `FROM traces-*\n| WHERE ${TOOL_KIND}\n| STATS tool_spans = COUNT(*)`,
    })) as unknown as EsqlResponse;
    const total = Number(probe.values?.[0]?.[0] ?? 0);
    return total > 0
      ? `the cluster holds ${total} TOOL span(s) but none match this run's join keys — ` +
          'attribute drift, compare gen_ai.conversation.id / trace.id on a recent span'
      : 'the cluster holds NO TOOL spans at all — agent spans are not exported to the ' +
          'tracing ES this suite queries (check TRACING_ES_URL and EDOT export)';
  } catch (error) {
    return `probe failed: ${error instanceof Error ? error.message : String(error)}`;
  }
};
