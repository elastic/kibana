/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

/**
 * Trigger ID for high-risk security alert indexed event.
 * Emitted when a security alert with risk_score >= 50 is successfully indexed.
 */
export const HIGH_RISK_ALERT_INDEXED_TRIGGER_ID = 'security-solution.highRiskAlertIndexed' as const;

/**
 * Event schema for high-risk alert indexed trigger.
 * Provides context needed for workflow steps (MITRE mapping, triage, etc.)
 */
export const highRiskAlertIndexedEventSchema = z.object({
  /** Alert document ID */
  alertId: z.string().describe('The ID of the indexed alert'),

  /** Alert risk score (50-100) */
  riskScore: z.number().min(50).max(100).describe('Alert risk score (50-100 range)'),

  /** Index where alert was created */
  index: z.string().describe('Elasticsearch index where alert is stored'),

  /** Space ID where alert belongs */
  spaceId: z.string().describe('Kibana space ID where alert was created'),

  /** Whether rule has existing MITRE tags */
  hasRuleMitreTags: z.boolean().describe('True if rule definition has MITRE ATT&CK tags'),

  /** Alert timestamp */
  alertTimestamp: z.string().describe('Alert @timestamp (ISO 8601)'),

  /** Alert rule name (for logging/debugging) */
  ruleName: z.string().optional().describe('Name of the detection rule that created this alert'),
});

export type HighRiskAlertIndexedEvent = z.infer<typeof highRiskAlertIndexedEventSchema>;

/**
 * Common trigger definition (server + public).
 * Registers the trigger ID and event payload schema.
 */
export const commonHighRiskAlertIndexedTrigger: CommonTriggerDefinition = {
  id: HIGH_RISK_ALERT_INDEXED_TRIGGER_ID,
  eventSchema: highRiskAlertIndexedEventSchema,
};
