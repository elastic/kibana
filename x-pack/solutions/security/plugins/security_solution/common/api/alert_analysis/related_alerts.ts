/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH =
  '/internal/security_solution/alert_analysis/related_alerts';

export const relatedAlertsRequestSchema = z.object({
  alertId: z.string().describe('The _id of the alert to correlate'),
  timeWindowHours: z.number().min(1).max(168).default(24),
  maxResults: z.number().min(1).max(100).default(25),
  hostNames: z.array(z.string()).optional(),
  userNames: z.array(z.string()).optional(),
  sourceIps: z.array(z.string()).optional(),
  destIps: z.array(z.string()).optional(),
});

export type RelatedAlertsRequest = z.infer<typeof relatedAlertsRequestSchema>;
