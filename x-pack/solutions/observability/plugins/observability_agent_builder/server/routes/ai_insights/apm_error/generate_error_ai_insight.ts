/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { MessageRole } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import dedent from 'dedent';
import type { ObservabilityAgentBuilderDataRegistry } from '../../../data_registry/data_registry';
import type {
  ObservabilityAgentBuilderCoreSetup,
  ObservabilityAgentBuilderPluginSetupDependencies,
} from '../../../types';
import { fetchApmErrorContext } from './fetch_apm_error_context';
import { getEntityLinkingInstructions } from '../../../agent/register_observability_agent';
import { createAiInsightResult, type AiInsightResult } from '../types';

function getErrorAiInsightSystemPrompt({ urlPrefix }: { urlPrefix: string }) {
  return dedent(`
    You are an expert SRE Assistant within Elastic Observability. Your job is to analyze an APM error using ONLY the provided context (APM trace items, related errors, downstream dependencies, and log categories).

    Output structure (concise, Markdown):
    - Error summary (1-2 sentences): What is observed and why it matters.
    - Failure pinpoint: Whether failure is in application code vs dependency. Name the likely failing component/endpoint. Reference specific fields or key frames if available.
    - Impact: Scope and severity (services/endpoints and the extent of the error if evident).
    - Immediate actions (2-4): Ordered, concrete steps (config/network checks, retries/backoff, circuit breakers, targeted tracing/logging).
    - Open questions: Short list of unknowns and the quickest queries to resolve them, if any (this is strictly optional and should not be present if there are no open questions).

    Guardrails:
    - Strict Factuality: Only mention signals present in the JSON. If a signal is missing, do not mention it.
    - Only assert a cause if multiple signals support it. Otherwise mark Assessment "Inconclusive".
    - Prefer corroborated explanations. If only one source supports it, state that support is limited.
    - Do NOT repeat raw stacks verbatim (reference only key frames/fields).
    - Conciseness: Use bullet points. Avoid flowery language. Be direct and technical.

    Available context tags:
    - <ErrorDetails>: Full error document (exception, message, stacktrace, labels)
    - <TransactionDetails>: Transaction linked to the error (if present)
    - <DownstreamDependencies>: Downstream dependencies for the erroring service
    - <TraceItems>: Span/transaction samples with service, name, type, eventOutcome, statusCode, duration, httpUrl, downstreamServiceResource
    - <TraceErrors>: Related errors within the trace (type, message, culprit, spanId, timestampUs)
    - <TraceServices>: Service aggregates for the trace (serviceName, count, errorCount)
    - <TraceLogCategories>: Categorized log patterns tied to the trace (errorCategory, docCount, sampleMessage)

    ${getEntityLinkingInstructions({ urlPrefix })}
  `);
}

const buildUserPrompt = (errorContext: string) => {
  return dedent(`
    <ErrorContext>
    ${errorContext}
    </ErrorContext>

    I am investigating an error and have retrieved related signals (logs, metrics, and traces) leading up to this error.
    Please analyze this error context and generate a summary of the error.

    Follow your system instructions. Ensure the analysis is specific to error investigation, grounded in the provided context, and concise.
  `);
};

export interface GenerateErrorAiInsightParams {
  core: ObservabilityAgentBuilderCoreSetup;
  plugins: ObservabilityAgentBuilderPluginSetupDependencies;
  errorId: string;
  serviceName: string;
  environment?: string;
  traceId?: string;
  start: string;
  end: string;
  logger: Logger;
  request: KibanaRequest;
  inferenceClient: BoundInferenceClient;
  dataRegistry: ObservabilityAgentBuilderDataRegistry;
}

export async function generateErrorAiInsight({
  core,
  plugins,
  errorId,
  serviceName,
  environment,
  start,
  end,
  logger,
  request,
  inferenceClient,
  dataRegistry,
}: GenerateErrorAiInsightParams): Promise<AiInsightResult> {
  const urlPrefix = core.http.basePath.get(request);

  const errorContext = await fetchApmErrorContext({
    core,
    plugins,
    dataRegistry,
    request,
    serviceName,
    environment: environment ?? '',
    start,
    end,
    errorId,
    logger,
  });

  const userPrompt = buildUserPrompt(errorContext);

  const events$ = inferenceClient.chatComplete({
    system: getErrorAiInsightSystemPrompt({ urlPrefix }),
    messages: [
      {
        role: MessageRole.User,
        content: userPrompt,
      },
    ],
    stream: true,
  });

  return createAiInsightResult(errorContext, events$);
}
