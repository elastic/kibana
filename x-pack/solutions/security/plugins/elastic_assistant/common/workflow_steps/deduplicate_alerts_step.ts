/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const DEDUPLICATE_ALERTS_STEP_ID = 'security.deduplicateAlerts';

const LeaderSummarySchema = z.object({
  alertId: z.string(),
  ruleName: z.string().optional(),
  followerCount: z.number(),
  confidence: z.enum(['high', 'llm', 'new']),
});

const MetricsSchema = z.object({
  alertsProcessed: z.number(),
  alertsDeduplicated: z.number(),
  clustersFormed: z.number(),
  llmCalls: z.number(),
  durationMs: z.number(),
});

export const DeduplicateAlertsInputSchema = z.object({
  alerts: z.array(z.record(z.string(), z.unknown())),
  highConfidenceThreshold: z.number().optional(),
  lowConfidenceThreshold: z.number().optional(),
  rankCutoff: z.number().optional(),
  maxLeaders: z.number().optional(),
  maxLeaderAgeHours: z.number().optional(),
});

export const DeduplicateAlertsOutputSchema = z.object({
  leaders: z.array(LeaderSummarySchema),
  metrics: MetricsSchema,
  bulkTagOperations: z.array(z.record(z.string(), z.unknown())),
});

export const DeduplicateAlertsConfigSchema = z.object({
  'connector-id': z.string().optional(),
  'state-index': z.string().optional(),
});

export const deduplicateAlertsStepCommonDefinition = {
  id: DEDUPLICATE_ALERTS_STEP_ID,
  inputSchema: DeduplicateAlertsInputSchema,
  outputSchema: DeduplicateAlertsOutputSchema,
  configSchema: DeduplicateAlertsConfigSchema,
};
