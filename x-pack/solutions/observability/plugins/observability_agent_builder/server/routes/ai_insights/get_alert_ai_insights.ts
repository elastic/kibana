/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceClient, ChatCompletionEvent } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import { isEmpty } from 'lodash';
import moment from 'moment';
import type { Observable } from 'rxjs';
import { concat, of } from 'rxjs';
import type { ObservabilityAgentBuilderDataRegistry } from '../../data_registry/data_registry';
import type { AiInsightResult, ContextEvent } from './types';

/**
 * These types are derived from the generated alerts-as-data schemas:
 * - `AlertSchema` in `kbn-alerts-as-data-utils` (see `alert_schema.ts`) which defines
 *   `kibana.alert.start` and other technical fields.
 * - `ObservabilityApmAlertSchema` in `observability_apm_schema.ts`, which adds
 *   the APM-specific fields like `service.*` and `transaction.*`.
 *
 * We only rely on these well-known keys; all other properties are treated as
 * opaque via the index signature below so this type can safely represent any
 * Observability alert document.
 */
export interface AlertDocForInsight {
  'service.name'?: string;
  'service.environment'?: string;
  'transaction.type'?: string;
  'transaction.name'?: string;
  'kibana.alert.start'?: string | number;
  [key: string]: unknown;
}

interface GetAlertAiInsightParams {
  alertDoc: AlertDocForInsight;
  inferenceClient: InferenceClient;
  connectorId: string;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
}

export type AlertAiInsightResult = AiInsightResult;

export async function getAlertAiInsight({
  alertDoc,
  inferenceClient,
  connectorId,
  dataRegistry,
  request,
  logger,
}: GetAlertAiInsightParams): Promise<AlertAiInsightResult> {
  const relatedContext = await fetchAlertContext({ alertDoc, dataRegistry, request, logger });
  const events$: Observable<ChatCompletionEvent> = generateAlertSummary({
    inferenceClient,
    connectorId,
    alertDoc,
    context: relatedContext,
  });

  const streamWithContext$ = concat(
    of<ContextEvent>({ type: 'context', context: relatedContext }),
    events$
  );

  return { events$: streamWithContext$, context: relatedContext };
}

// Time window offsets in minutes before alert start
const TIME_WINDOWS = {
  serviceSummary: 5,
  downstream: 24 * 60, // 24 hours
  errors: 15,
  changePoints: 6 * 60, // 6 hours
} as const;

async function fetchAlertContext({
  alertDoc,
  dataRegistry,
  request,
  logger,
}: Pick<
  GetAlertAiInsightParams,
  'alertDoc' | 'dataRegistry' | 'request' | 'logger'
>): Promise<string> {
  const serviceName = alertDoc?.['service.name'] ?? '';
  const serviceEnvironment = alertDoc?.['service.environment'] ?? '';
  const transactionType = alertDoc?.['transaction.type'];
  const transactionName = alertDoc?.['transaction.name'];

  if (!serviceName) {
    return 'No related signals available.';
  }

  const alertTime = moment(alertDoc?.['kibana.alert.start']);
  const alertStart = alertTime.toISOString();

  const getStart = (minutesBefore: number) =>
    alertTime.clone().subtract(minutesBefore, 'minutes').toISOString();

  // Config-driven fetch definitions
  const fetchConfigs = [
    {
      key: 'apmServiceSummary' as const,
      window: TIME_WINDOWS.serviceSummary,
      params: { serviceName, serviceEnvironment, transactionType },
    },
    {
      key: 'apmDownstreamDependencies' as const,
      window: TIME_WINDOWS.downstream,
      params: { serviceName, serviceEnvironment },
    },
    {
      key: 'apmErrors' as const,
      window: TIME_WINDOWS.errors,
      params: { serviceName, serviceEnvironment },
    },
    {
      key: 'apmServiceChangePoints' as const,
      window: TIME_WINDOWS.changePoints,
      params: { serviceName, serviceEnvironment, transactionType, transactionName },
    },
    {
      key: 'apmExitSpanChangePoints' as const,
      window: TIME_WINDOWS.changePoints,
      params: { serviceName, serviceEnvironment },
    },
  ];

  // Fire all fetches in parallel
  const results = await Promise.allSettled(
    fetchConfigs.map(async (config) => {
      const start = getStart(config.window);
      const data = await dataRegistry.getData(config.key, {
        request,
        ...config.params,
        start,
        end: alertStart,
      });
      return { config, data, start };
    })
  );

  // Collect successful, non-empty results
  const contextParts: string[] = [];

  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      logger.debug(`AI insight: ${fetchConfigs[idx].key} failed: ${result.reason}`);
      return;
    }

    const { config, data, start } = result.value;
    if (isEmpty(data)) {
      return;
    }

    contextParts.push(
      `<${config.key}>
Time window: ${start} to ${alertStart}
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
</${config.key}>`
    );
  });

  return contextParts.length > 0 ? contextParts.join('\n\n') : 'No related signals available.';
}

function generateAlertSummary({
  inferenceClient,
  connectorId,
  alertDoc,
  context,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  alertDoc: AlertDocForInsight;
  context: string;
}): Observable<ChatCompletionEvent> {
  const systemPrompt = dedent(`
    You are an SRE assistant. Help an SRE quickly understand likely cause, impact, and next actions for this alert using the provided context.

    Output shape (plain text):
    - Summary (1–2 sentences): What is likely happening and why it matters. If recovered, acknowledge and reduce urgency. If no strong signals, say "Inconclusive" and briefly note why.
    - Assessment: Most plausible explanation or "Inconclusive" if signals do not support a clear assessment.
    - Related signals (top 3–5, each with provenance and relevance): For each item, include source (change points | errors | log rate | log categories | anomalies | service summary), timeframe near alert start, and relevance to alert scope as Direct | Indirect | Unrelated.
    - Immediate actions (2–3): Concrete next checks or fixes an SRE can take now.

    Guardrails:
    - Do not repeat the alert reason string or rule name verbatim.
    - Only provide a non‑inconclusive Assessment when supported by on‑topic related signals; otherwise set Assessment to "Inconclusive" and do not speculate a cause.
    - Corroboration: prefer assessment supported by multiple independent signal types; if only one source supports it, state that support is limited.
    - If signals are weak or conflicting, state that clearly and recommend the safest next diagnostic step.
    - Do not list raw alert fields as bullet points. Bullets are allowed only for Related signals and Immediate actions.
    - Keep it concise (~150–200 words).

    Related signals hierarchy (use what exists, skip what doesn't):
    1) Change points (service and exit‑span): sudden shifts in throughput/latency/failure; name impacted downstream services verbatim when present and whether propagation is likely.
    2) Errors: signatures enriched with downstream resource/name; summarize patterns without long stacks; tie to alert scope.
    3) Logs: strongest log‑rate significant items and top categories; very short examples and implications; tie to alert scope.
    4) Anomalies: note ML anomalies around alert time; multiple affected services may imply systemic issues.
    5) Service summary: only details that materially change interpretation (avoid re‑listing fields).

    Recovery / false positives:
    - If recovered or normalizing, recommend light‑weight validation and watchful follow‑up.
    - If inconclusive or signals skew Indirect/Unrelated, state that the alert may be unrelated/noisy and suggest targeted traces/logging for the suspected path.
  `);

  const alertDetails = `\`\`\`json\n${JSON.stringify(alertDoc, null, 2)}\n\`\`\``;

  const userPrompt = dedent(`
    <AlertDetails>
    ${alertDetails}
    </AlertDetails>
    <RelatedAlertContext>
    ${context}
    </RelatedAlertContext>
    Task:
    Summarize likely cause, impact, and immediate next checks for this alert using the format above. Tie related signals to the alert scope; ignore unrelated noise. If signals are weak or conflicting, mark Assessment "Inconclusive" and propose the safest next diagnostic step.
  `);

  return inferenceClient.chatComplete({
    connectorId,
    system: systemPrompt,
    messages: [{ role: MessageRole.User, content: userPrompt }],
    stream: true,
  });
}
