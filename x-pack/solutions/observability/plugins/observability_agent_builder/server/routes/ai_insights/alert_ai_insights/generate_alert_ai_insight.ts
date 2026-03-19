/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  InferenceClient,
  ChatCompletionEvent,
  InferenceConnector,
} from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import moment from 'moment';
import type { Observable } from 'rxjs';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import { createAiInsightResult, type AiInsightResult } from '../types';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../../types';
import { getEntityLinkingInstructions } from '../../../agent/register_observability_agent';
import { runSignalFetchers, formatSignalResults } from './signal_fetchers';

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
  'host.name'?: string;
  'kibana.alert.start'?: string | number;
  [key: string]: unknown;
}

interface GetAlertAiInsightParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  alertDoc: AlertDocForInsight;
  inferenceClient: InferenceClient;
  connectorId: string;
  connector: InferenceConnector;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
  request: KibanaRequest;
  logger: Logger;
}

export async function getAlertAiInsight({
  core,
  plugins,
  alertDoc,
  inferenceClient,
  connectorId,
  connector,
  dataRegistry,
  request,
  logger,
}: GetAlertAiInsightParams): Promise<AiInsightResult> {
  const urlPrefix = core.http.basePath.get(request);

  const { context, signalDescriptions } = await fetchAlertContext({
    core,
    plugins,
    alertDoc,
    dataRegistry,
    request,
    logger,
  });

  const events$: Observable<ChatCompletionEvent> = generateAlertSummary({
    inferenceClient,
    connectorId,
    alertDoc,
    urlPrefix,
    context,
    signalDescriptions,
  });

  return createAiInsightResult(context, connector, events$);
}

async function fetchAlertContext({
  core,
  plugins,
  alertDoc,
  dataRegistry,
  request,
  logger,
}: Pick<
  GetAlertAiInsightParams,
  'core' | 'plugins' | 'alertDoc' | 'dataRegistry' | 'request' | 'logger'
>): Promise<{ context: string; signalDescriptions: string[] }> {
  const serviceName = alertDoc?.['service.name'] ?? '';
  const serviceEnvironment = alertDoc?.['service.environment'] ?? '';
  const transactionType = alertDoc?.['transaction.type'];
  const transactionName = alertDoc?.['transaction.name'];
  const hostName = alertDoc?.['host.name'] ?? '';

  if (!serviceName && !hostName) {
    return { context: 'No related signals available.', signalDescriptions: [] };
  }

  const alertStart = moment(alertDoc?.['kibana.alert.start']).toISOString();

  const [coreStart] = await core.getStartServices();
  const esClient = coreStart.elasticsearch.client.asScoped(request);

  const results = await runSignalFetchers(
    {
      core,
      plugins,
      dataRegistry,
      esClient,
      request,
      logger,
      serviceName,
      serviceEnvironment,
      transactionType,
      transactionName,
      hostName,
    },
    alertStart
  );

  return formatSignalResults(results);
}

function generateAlertSummary({
  inferenceClient,
  urlPrefix,
  connectorId,
  alertDoc,
  context,
  signalDescriptions,
}: {
  inferenceClient: InferenceClient;
  urlPrefix: string;
  connectorId: string;
  alertDoc: AlertDocForInsight;
  context: string;
  signalDescriptions: string[];
}): Observable<ChatCompletionEvent> {
  const systemPrompt = dedent(`
    You are an SRE assistant. Help an SRE quickly understand likely cause, impact, and next actions for this alert using the provided context.

    Output format (use **bold** titles, prose paragraphs, minimal bullets):

    **Summary**
    1–2 sentences: What is likely happening and why it matters. If recovered, reduce urgency. If no strong signals, say "Inconclusive" and briefly note why.

    **Assessment**
    Most plausible explanation in prose, citing the signals that support it (e.g., "downstream metrics show...", "logs indicate..."). Say "Inconclusive" if signals do not support a clear cause.

    **Next Steps**
    2–3 numbered actions an SRE can take now.

    Guardrails:
    - Do not repeat the alert reason verbatim.
    - Only give a non-inconclusive Assessment when supported by on-topic signals; otherwise say "Inconclusive" and don't speculate.
    - Keep it concise (~100–150 words total).

    Available signals (use what's relevant and available):
    ${signalDescriptions.length > 0 ? signalDescriptions.join('\n    ') : 'None available.'}

    Note: Numeric values on a 0-1 scale represent percentages (e.g., 0.95 = 95%, 0.3 = 30%).

    ${getEntityLinkingInstructions({ urlPrefix })}
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
