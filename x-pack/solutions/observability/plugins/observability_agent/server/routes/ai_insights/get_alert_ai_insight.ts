/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import dedent from 'dedent';
import type { ObservabilityAgentDataRegistry } from '../../data_registry/data_registry';

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
  connectorId: string | undefined;
  dataRegistry: ObservabilityAgentDataRegistry;
  request: KibanaRequest;
  logger: Logger;
}

interface AlertAiInsightResult {
  summary: string;
  context: string;
}

export async function getAlertAiInsight({
  alertDoc,
  inferenceClient,
  connectorId,
  dataRegistry,
  request,
  logger,
}: GetAlertAiInsightParams): Promise<AlertAiInsightResult> {
  const relatedContext = await fetchAlertContext({ alertDoc, dataRegistry, request, logger });
  const summary = await generateAlertSummary({
    inferenceClient,
    connectorId,
    alertDoc,
    context: relatedContext,
  });

  return { summary, context: relatedContext };
}

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

  const alertTime = new Date(String(alertDoc?.['kibana.alert.start'])).getTime();
  const alertStart = new Date(alertTime).toISOString();

  // Time ranges for different data providers
  const serviceSummaryStart = new Date(alertTime - 5 * 60 * 1000).toISOString(); // 5 min before
  const downstreamStart = new Date(alertTime - 24 * 60 * 60 * 1000).toISOString(); // 24 hours before
  const errorsStart = new Date(alertTime - 15 * 60 * 1000).toISOString(); // 15 min before
  const changePointsStart = new Date(alertTime - 6 * 60 * 60 * 1000).toISOString(); // 6 hours before

  const contextParts: string[] = [];

  if (serviceName) {
    // APM Service Summary
    try {
      const apmServiceSummary = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName,
        serviceEnvironment,
        start: serviceSummaryStart,
        end: alertStart,
        transactionType,
      });
      if (apmServiceSummary) {
        contextParts.push(
          `<APMServiceSummary>
Time window: ${serviceSummaryStart} to ${alertStart}
${JSON.stringify(apmServiceSummary, null, 2)}
</APMServiceSummary>`
        );
      }
    } catch (err) {
      logger.debug(`AI insight: apmServiceSummary failed: ${err}`);
    }

    // APM Downstream Dependencies
    try {
      const apmDownstreamDependencies = await dataRegistry.getData('apmDownstreamDependencies', {
        request,
        serviceName,
        serviceEnvironment,
        start: downstreamStart,
        end: alertStart,
      });
      if (apmDownstreamDependencies && apmDownstreamDependencies.length > 0) {
        contextParts.push(
          `<APMDownstreamDependencies>
Time window: ${downstreamStart} to ${alertStart}
${JSON.stringify(apmDownstreamDependencies, null, 2)}
</APMDownstreamDependencies>`
        );
      }
    } catch (err) {
      logger.debug(`AI insight: apmDownstreamDependencies failed: ${err}`);
    }

    // APM Errors
    try {
      const apmErrors = await dataRegistry.getData('apmErrors', {
        request,
        serviceName,
        serviceEnvironment,
        start: errorsStart,
        end: alertStart,
      });
      if (apmErrors && apmErrors.length > 0) {
        contextParts.push(
          `<APMErrors>
Time window: ${errorsStart} to ${alertStart}
${JSON.stringify(apmErrors, null, 2)}
</APMErrors>`
        );
      }
    } catch (err) {
      logger.debug(`AI insight: apmErrors failed: ${err}`);
    }

    // APM Service Change Points
    try {
      const serviceChangePoints = await dataRegistry.getData('apmServiceChangePoints', {
        request,
        serviceName,
        serviceEnvironment,
        transactionType,
        transactionName,
        start: changePointsStart,
        end: alertStart,
      });
      if (serviceChangePoints && serviceChangePoints.length > 0) {
        contextParts.push(
          `<ServiceChangePoints>
Time window: ${changePointsStart} to ${alertStart}
${JSON.stringify(serviceChangePoints, null, 2)}
</ServiceChangePoints>`
        );
      }
    } catch (err) {
      logger.debug(`AI insight: apmServiceChangePoints failed: ${err}`);
    }

    // APM Exit Span Change Points
    try {
      const exitSpanChangePoints = await dataRegistry.getData('apmExitSpanChangePoints', {
        request,
        serviceName,
        serviceEnvironment,
        start: changePointsStart,
        end: alertStart,
      });
      if (exitSpanChangePoints && exitSpanChangePoints.length > 0) {
        contextParts.push(
          `<ExitSpanChangePoints>
Time window: ${changePointsStart} to ${alertStart}
${JSON.stringify(exitSpanChangePoints, null, 2)}
</ExitSpanChangePoints>`
        );
      }
    } catch (err) {
      logger.debug(`AI insight: apmExitSpanChangePoints failed: ${err}`);
    }
  }

  return contextParts.length > 0 ? contextParts.join('\n\n') : 'No related signals available.';
}

async function generateAlertSummary({
  inferenceClient,
  connectorId,
  alertDoc,
  context,
}: {
  inferenceClient: InferenceClient;
  connectorId: string | undefined;
  alertDoc: AlertDocForInsight;
  context: string;
}): Promise<string> {
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

  const alertDetails = JSON.stringify(alertDoc, null, 2);

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

  const completion = await inferenceClient.chatComplete({
    connectorId: connectorId ?? '',
    system: systemPrompt,
    messages: [{ role: MessageRole.User, content: userPrompt }],
  });

  return completion.content;
}
