/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface StageUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Extracts token-usage counts from a LangChain AIMessage `response_metadata`
 * object in a best-effort, provider-agnostic way.
 *
 * Different connectors/providers surface token counts under different keys:
 *  - Anthropic (via Kibana inference plugin): `{ usage: { input_tokens, output_tokens } }`
 *  - OpenAI-compat: `{ tokenUsage: { promptTokens, completionTokens, totalTokens } }`
 *
 * Returns zero counts when the connector does not emit usage data so callers
 * can unconditionally accumulate without null checks.
 */
export const extractUsageFromMetadata = (metadata: Record<string, unknown>): StageUsage => {
  const usage = metadata?.usage as Record<string, unknown> | undefined;
  const tokenUsage = metadata?.tokenUsage as Record<string, unknown> | undefined;

  const input = Number(usage?.input_tokens ?? tokenUsage?.promptTokens ?? 0);
  const output = Number(usage?.output_tokens ?? tokenUsage?.completionTokens ?? 0);
  const total = Number(tokenUsage?.totalTokens ?? input + output);

  return { inputTokens: input, outputTokens: output, totalTokens: total };
};

/**
 * Logs per-call token usage at INFO level tagged by stage and connector so
 * cost can be queried from Kibana logs or forwarded to a metering system.
 *
 * Format (one line per call):
 *   [ti:cost] stage=<stage> connector=<connectorId>
 *             input_tokens=<n> output_tokens=<n> total_tokens=<n>
 */
export const logStageUsage = (
  logger: Logger,
  stage: string,
  connectorId: string,
  metadata: Record<string, unknown>
): void => {
  const { inputTokens, outputTokens, totalTokens } = extractUsageFromMetadata(metadata);
  logger.info(
    `[ti:cost] stage=${stage} connector=${connectorId} ` +
      `input_tokens=${inputTokens} output_tokens=${outputTokens} total_tokens=${totalTokens}`
  );
};
