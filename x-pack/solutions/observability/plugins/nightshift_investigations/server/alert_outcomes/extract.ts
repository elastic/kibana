/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolSchema } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import { renderToolCalls } from '../wiki/optimize';
import {
  ALERT_OUTCOME_SOURCES,
  identityProposalSchema,
  LOCAL_CONNECTOR_ID,
  type IdentityProposal,
} from './types';

const MAX_POST_CHARS = 8_000;

/** Non-secret connector metadata: enough to match a link's host to the connector that reaches it. */
export interface ConnectorMetadata {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface ExtractionInput {
  postText: string;
  postPermalink?: string;
  postReceivedAt: string;
  connectors: ConnectorMetadata[];
  toolCalls: InvestigationToolCall[];
}

export const EXTRACTION_SYSTEM_PROMPT = `You identify the single monitoring alert that a message reports, so a deterministic checker can later read whether that alert recovered.

You get the message that started an investigation (often a Slack post from an alerting tool), the connectors this deployment has (id, name, type and, for Elasticsearch connectors, the cluster URL), and the tool calls the investigator made, with their results.

Rules:
- Copy identifiers verbatim from the message, its links, or tool results. Never invent, complete, or reformat an identifier. Leave a field empty when you did not see it.
- source: "elastic" for a Kibana alerting rule or alert (links to /app/observability/alerts, /app/management/insightsAndAlerting/triggersActions/rule/<id>, or kibana.alert.* fields). Use the tool's name for other alerting tools (pagerduty, servicenow, grafana, datadog, newrelic, rootly, alertmanager, opsgenie), "other" for a tool not listed, and "unknown" when the message does not come from an alerting tool.
- connector_id: for an elastic alert, the id of the Elasticsearch connector that reaches the cluster holding the alert: match the link's deployment host to the connector URL or name (Elastic Cloud Kibana and Elasticsearch hosts share the deployment alias, for example "prod.kb.us-east-1.aws.elastic.cloud" and "prod.es.us-east-1.aws.elastic.cloud"). Use "${LOCAL_CONNECTOR_ID}" when the investigator found the alert in this deployment's own .alerts-* indices. Leave it empty when no connector clearly matches.
- alert_id: the alert's UUID (kibana.alert.uuid), for example from an /app/observability/alerts/<uuid> link or a tool result.
- rule_id: the rule's id (kibana.alert.rule.uuid), for example from a /rule/<id> link.
- instance_key: the alert instance id (kibana.alert.instance.id), such as the group-by value of the alert. Only when you saw it.
- evidence: where each identifier came from (post_link, post_text, or tool_call), quoting the link, text or tool call briefly.
- If the message reports that an alert recovered or resolved rather than fired, still identify it.`;

/** Empty strings stand for unknown, since tool schemas cannot express nullable fields. */
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    source: { type: 'string', enum: [...ALERT_OUTCOME_SOURCES] },
    connector_id: { type: 'string', description: 'Empty when unknown.' },
    alert_id: { type: 'string', description: 'Empty when unknown.' },
    rule_id: { type: 'string', description: 'Empty when unknown.' },
    instance_key: { type: 'string', description: 'Empty when unknown.' },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['post_link', 'post_text', 'tool_call'] },
          value: { type: 'string' },
        },
        required: ['kind', 'value'],
      },
    },
  },
  required: ['source', 'connector_id', 'alert_id', 'rule_id', 'instance_key', 'evidence'],
} as const satisfies ToolSchema;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const renderExtractionInput = ({
  postText,
  postPermalink,
  postReceivedAt,
  connectors,
  toolCalls,
}: ExtractionInput): string =>
  [
    `Message received at ${postReceivedAt}${postPermalink ? ` (${postPermalink})` : ''}:`,
    '<message>',
    truncate(postText, MAX_POST_CHARS),
    '</message>',
    '',
    'Connectors:',
    connectors.length > 0
      ? connectors
          .map(
            ({ id, name, type, url }) =>
              `- id=${id} type=${type} name=${JSON.stringify(name)}${url ? ` url=${url}` : ''}`
          )
          .join('\n')
      : '(none)',
    '',
    "Investigator's tool calls:",
    renderToolCalls(toolCalls),
  ].join('\n');

const emptyToNull = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** Normalizes the model's output; throws when it does not match the proposal schema. */
export const parseIdentityProposal = (output: unknown): IdentityProposal => {
  const raw = (output ?? {}) as Record<string, unknown>;
  const parsed = identityProposalSchema.safeParse({
    source: raw.source,
    connector_id: emptyToNull(raw.connector_id),
    alert_id: emptyToNull(raw.alert_id),
    rule_id: emptyToNull(raw.rule_id),
    instance_key: emptyToNull(raw.instance_key),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.slice(0, 10).map((item) => ({
          kind: item?.kind,
          value: typeof item?.value === 'string' ? truncate(item.value, 2_000) : item?.value,
        }))
      : [],
  });
  if (!parsed.success) {
    throw new Error(`Invalid identity proposal: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};

/** Proposes the alert's identity. The proposal is only a guess until an adapter verifies it. */
export const extractIdentityProposal = async ({
  inferenceClient,
  input,
  abortSignal,
}: {
  inferenceClient: BoundInferenceClient;
  input: ExtractionInput;
  abortSignal?: AbortSignal;
}): Promise<IdentityProposal> => {
  const response = await inferenceClient.output({
    id: 'nightshift_alert_outcome_identity',
    system: EXTRACTION_SYSTEM_PROMPT,
    input: renderExtractionInput(input),
    schema: OUTPUT_SCHEMA,
    abortSignal,
  });
  return parseIdentityProposal(response.output);
};
