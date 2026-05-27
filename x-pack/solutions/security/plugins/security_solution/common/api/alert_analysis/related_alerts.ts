/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH =
  '/internal/security_solution/alert_analysis/related_alerts';

// codeql[js/kibana/unbounded-string-in-schema] alert _id validated by findRelatedAlerts; internal authz-protected route
const relatedAlertIdSchema = z.string();
// codeql[js/kibana/unbounded-string-in-schema] ECS entity values; findRelatedAlerts trims and caps list length
const relatedAlertEntityNameSchema = z.string();
// codeql[js/kibana/unbounded-string-in-schema] ECS IP values; findRelatedAlerts trims and caps list length
const relatedAlertIpSchema = z.string();

export const relatedAlertsRequestSchema = z.object({
  alertId: relatedAlertIdSchema.describe('The _id of the alert to correlate'),
  timeWindowHours: z.number().min(1).max(168).default(24),
  maxResults: z.number().min(1).max(100).default(25),
  hostNames: z.array(relatedAlertEntityNameSchema).optional(),
  userNames: z.array(relatedAlertEntityNameSchema).optional(),
  sourceIps: z.array(relatedAlertIpSchema).optional(),
  destIps: z.array(relatedAlertIpSchema).optional(),
});

/** Inline tool omits maxResults; the handler applies RELATED_ALERTS_INLINE_MAX_RESULTS. */
export const relatedAlertsInlineToolSchema = relatedAlertsRequestSchema.omit({
  maxResults: true,
});

export type RelatedAlertsRequest = z.infer<typeof relatedAlertsRequestSchema>;
