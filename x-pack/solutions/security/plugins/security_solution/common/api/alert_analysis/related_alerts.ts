/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ALERT_ANALYSIS_GET_RELATED_ALERTS_API_PATH =
  '/internal/security_solution/alert_analysis/related_alerts';

export const RELATED_ALERT_ID_MAX_LENGTH = 512;
export const RELATED_ALERT_ENTITY_VALUE_MAX_LENGTH = 256;
export const RELATED_ALERT_IP_MAX_LENGTH = 45;
export const RELATED_ALERT_ENTITY_LIST_MAX_LENGTH = 100;

export const relatedAlertIdSchema = z.string().max(RELATED_ALERT_ID_MAX_LENGTH);
export const relatedAlertEntityNameSchema = z.string().max(RELATED_ALERT_ENTITY_VALUE_MAX_LENGTH);
export const relatedAlertIpSchema = z.string().max(RELATED_ALERT_IP_MAX_LENGTH);

export const relatedAlertsRequestSchema = z.object({
  alertId: relatedAlertIdSchema.describe('The _id of the alert to correlate'),
  timeWindowHours: z
    .number()
    .min(1)
    .max(168)
    .default(24)
    .describe('Lookback window in hours for related alerts (1–168).'),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe('Maximum number of related alerts to return.'),
  hostNames: z
    .array(relatedAlertEntityNameSchema)
    .max(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH)
    .optional()
    .describe(
      'Optional host.name values. When provided, merged with entities from the source alert for correlation.'
    ),
  userNames: z
    .array(relatedAlertEntityNameSchema)
    .max(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH)
    .optional()
    .describe(
      'Optional user.name values. When provided, merged with entities from the source alert for correlation.'
    ),
  sourceIps: z
    .array(relatedAlertIpSchema)
    .max(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH)
    .optional()
    .describe(
      'Optional source.ip values. When provided, merged with entities from the source alert for correlation.'
    ),
  destIps: z
    .array(relatedAlertIpSchema)
    .max(RELATED_ALERT_ENTITY_LIST_MAX_LENGTH)
    .optional()
    .describe(
      'Optional destination.ip values. When provided, merged with entities from the source alert for correlation.'
    ),
});

/** Inline tool omits maxResults; the handler applies RELATED_ALERTS_INLINE_MAX_RESULTS. */
export const relatedAlertsInlineToolSchema = relatedAlertsRequestSchema.omit({
  maxResults: true,
});

export type RelatedAlertsRequest = z.infer<typeof relatedAlertsRequestSchema>;
