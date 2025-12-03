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

export interface AlertDocForInsight {
  'service.name'?: string;
  'service.environment'?: string;
  'transaction.type'?: string;
  'transaction.name'?: string;
  'kibana.alert.start'?: string | number;
  [key: string]: unknown;
}

interface GetAlertAiInsightParams {
  alertDoc: AlertDocForInsight | undefined;
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
  const context = await fetchAlertContext({ alertDoc, dataRegistry, request, logger });
  const summary = await generateAlertSummary({ inferenceClient, connectorId, context });

  return { summary, context };
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
  const alertStartedAt = alertDoc?.['kibana.alert.start'];

  const alertTime = alertStartedAt ? new Date(String(alertStartedAt)).getTime() : Date.now();
  const alertEnd = new Date(alertTime).toISOString();

  // Time ranges for different data providers
  const serviceSummaryStart = new Date(alertTime - 5 * 60 * 1000).toISOString(); // 5 min before
  const downstreamStart = new Date(alertTime - 24 * 60 * 60 * 1000).toISOString(); // 24 hours before
  const errorsStart = new Date(alertTime - 15 * 60 * 1000).toISOString(); // 15 min before
  const changePointsStart = new Date(alertTime - 6 * 60 * 60 * 1000).toISOString(); // 6 hours before

  const contextParts: string[] = [];

  if (serviceName) {
    // APM Service Summary
    try {
      const summary = await dataRegistry.getData('apmServiceSummary', {
        request,
        serviceName,
        serviceEnvironment,
        start: serviceSummaryStart,
        end: alertEnd,
        transactionType,
      });
      if (summary) {
        contextParts.push(`Service Summary:\n${JSON.stringify(summary, null, 2)}`);
      }
    } catch (err) {
      logger.debug(`AI insight: apmServiceSummary failed: ${err}`);
    }

    // APM Downstream Dependencies
    try {
      const downstream = await dataRegistry.getData('apmDownstreamDependencies', {
        request,
        serviceName,
        serviceEnvironment,
        start: downstreamStart,
        end: alertEnd,
      });
      if (downstream && downstream.length > 0) {
        contextParts.push(`Downstream Dependencies:\n${JSON.stringify(downstream, null, 2)}`);
      }
    } catch (err) {
      logger.debug(`AI insight: apmDownstreamDependencies failed: ${err}`);
    }

    // APM Errors
    try {
      const errors = await dataRegistry.getData('apmErrors', {
        request,
        serviceName,
        serviceEnvironment,
        start: errorsStart,
        end: alertEnd,
      });
      if (errors && errors.length > 0) {
        contextParts.push(`APM Errors:\n${JSON.stringify(errors, null, 2)}`);
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
        end: alertEnd,
      });
      if (serviceChangePoints && serviceChangePoints.length > 0) {
        contextParts.push(
          `Service Change Points:\n${JSON.stringify(serviceChangePoints, null, 2)}`
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
        end: alertEnd,
      });
      if (exitSpanChangePoints && exitSpanChangePoints.length > 0) {
        contextParts.push(
          `Exit Span Change Points:\n${JSON.stringify(exitSpanChangePoints, null, 2)}`
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
  context,
}: {
  inferenceClient: InferenceClient;
  connectorId: string | undefined;
  context: string;
}): Promise<string> {
  const system = dedent(`
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

  const prompt = dedent(`
    Context:
    ${context}

    Task:
    Summarize likely cause, impact, and immediate next checks for this alert using the format above. Tie related signals to the alert scope; ignore unrelated noise. If signals are weak or conflicting, mark Assessment "Inconclusive" and propose the safest next diagnostic step.
  `);

  const completion = await inferenceClient.chatComplete({
    connectorId: connectorId ?? '',
    system,
    messages: [{ role: MessageRole.User, content: prompt }],
  });

  return completion.content ?? '';
}
