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
  // codeql[js/kibana/unbounded-string-in-schema] alert _id validated by findRelatedAlerts; internal authz-protected route
  alertId: z.string().describe('The _id of the alert to correlate'),
  timeWindowHours: z.number().min(1).max(168).default(24),
  maxResults: z.number().min(1).max(100).default(25),
  // codeql[js/kibana/unbounded-string-in-schema] ECS host.name values; service trims and caps entity list length
  hostNames: z.array(z.string()).optional(),
  // codeql[js/kibana/unbounded-string-in-schema] ECS user.name values; service trims and caps entity list length
  userNames: z.array(z.string()).optional(),
  // codeql[js/kibana/unbounded-string-in-schema] ECS source.ip values; service trims and caps entity list length
  sourceIps: z.array(z.string()).optional(),
  // codeql[js/kibana/unbounded-string-in-schema] ECS destination.ip values; service trims and caps entity list length
  destIps: z.array(z.string()).optional(),
});

/** Inline tool omits maxResults; the handler applies RELATED_ALERTS_INLINE_MAX_RESULTS. */
export const relatedAlertsInlineToolSchema = relatedAlertsRequestSchema.omit({
  maxResults: true,
});

export type RelatedAlertsRequest = z.infer<typeof relatedAlertsRequestSchema>;
