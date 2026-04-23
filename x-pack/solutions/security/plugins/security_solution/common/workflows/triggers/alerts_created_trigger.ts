/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const SECURITY_ALERTS_CREATED_TRIGGER_ID = 'security_alerts.created' as const;

export const securityAlertsCreatedEventSchema = z.object({
  rule_id: z.string().describe('The saved-object ID of the rule that generated the alerts.'),
  rule_name: z.string().describe('Human-readable name of the rule.'),
  rule_type: z.string().describe('Detection rule type (e.g. siem.queryRule, siem.eqlRule).'),
  alerts_count: z.number().describe('Number of new alerts created in this execution.'),
  suppressed_alerts_count: z
    .number()
    .optional()
    .describe('Number of alerts suppressed during this execution.'),
});

export type SecurityAlertsCreatedEvent = z.infer<typeof securityAlertsCreatedEventSchema>;

export const commonSecurityAlertsCreatedTriggerDefinition: CommonTriggerDefinition = {
  id: SECURITY_ALERTS_CREATED_TRIGGER_ID,
  eventSchema: securityAlertsCreatedEventSchema,
};
