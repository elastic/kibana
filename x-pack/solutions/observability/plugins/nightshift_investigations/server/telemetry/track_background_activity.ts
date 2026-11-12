/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ModelUsageCollector } from '../lib/model_usage_collector';
import type { BackgroundActivityType } from './background_activity_event';
import type { NightshiftTelemetryClient } from './client';

/**
 * Runs a background LLM job and reports its duration, outcome and token usage. A job that made
 * no LLM call and did not fail costs nothing, so it reports nothing.
 */
export const trackBackgroundActivity = async <T>(
  {
    telemetry,
    activity,
    workflowExecutionId,
    conversationId,
    roundId,
  }: {
    telemetry: NightshiftTelemetryClient | undefined;
    activity: BackgroundActivityType;
    workflowExecutionId: string;
    conversationId?: string;
    roundId?: string;
  },
  run: (usage: ModelUsageCollector) => Promise<T>
): Promise<T> => {
  const usage = new ModelUsageCollector();
  const startedAt = Date.now();
  let outcome: 'success' | 'failure' = 'failure';
  try {
    const result = await run(usage);
    outcome = 'success';
    return result;
  } finally {
    const summary = usage.summarize();
    if (outcome === 'failure' || summary.llm_calls > 0) {
      telemetry?.reportBackgroundActivity({
        activity,
        outcome,
        workflow_execution_id: workflowExecutionId,
        // Liquid renders an absent workflow input as '', which must not become a grouping key.
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(roundId ? { round_id: roundId } : {}),
        duration_ms: Date.now() - startedAt,
        ...summary,
      });
    }
  }
};
