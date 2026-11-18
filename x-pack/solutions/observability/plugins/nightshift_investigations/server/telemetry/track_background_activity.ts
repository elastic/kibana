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
    isFailure,
  }: {
    telemetry: NightshiftTelemetryClient | undefined;
    activity: BackgroundActivityType;
    workflowExecutionId?: string;
    conversationId?: string;
    roundId?: string;
    /** Marks a result the job returned, rather than threw, as a failure. */
    isFailure?: (result: T) => boolean;
  },
  run: (usage: ModelUsageCollector) => Promise<T>
): Promise<T> => {
  const usage = new ModelUsageCollector();
  const startedAt = Date.now();
  let outcome: 'success' | 'failure' = 'failure';
  try {
    const result = await run(usage);
    outcome = isFailure?.(result) ? 'failure' : 'success';
    return result;
  } finally {
    const summary = usage.summarize();
    if (outcome === 'failure' || summary.llm_calls > 0) {
      telemetry?.reportBackgroundActivity({
        activity,
        outcome,
        ...(workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {}),
        // Liquid renders an absent workflow input as '', which must not become a grouping key.
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(roundId ? { round_id: roundId } : {}),
        duration_ms: Date.now() - startedAt,
        // A job that failed before any call returned has unknown usage, which zeros would
        // report as free.
        ...(summary.llm_calls > 0 ? summary : {}),
      });
    }
  }
};
