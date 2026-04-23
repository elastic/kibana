/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const SECURITY_RULE_CREATED_TRIGGER_ID = 'security_rules.created' as const;

export const securityRuleCreatedEventSchema = z.object({
  rule_id: z.string().describe('The saved-object ID of the created rule.'),
  rule_name: z.string().describe('Human-readable name of the rule.'),
  rule_type: z.string().describe('Detection rule type (e.g. query, eql, esql, threshold).'),
  severity: z.string().describe('Rule severity (low, medium, high, critical).'),
  risk_score: z.number().describe('Rule risk score (0-100).'),
  enabled: z.boolean().describe('Whether the rule was created in an enabled state.'),
});

export type SecurityRuleCreatedEvent = z.infer<typeof securityRuleCreatedEventSchema>;

export const commonSecurityRuleCreatedTriggerDefinition: CommonTriggerDefinition = {
  id: SECURITY_RULE_CREATED_TRIGGER_ID,
  eventSchema: securityRuleCreatedEventSchema,
};
