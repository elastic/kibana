/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const SOC_ALERT_TRIGGER_ID = 'security.alertCreated' as const;

export const socAlertTriggerEventSchema = z.object({
  alert_id: z.string().describe('The ID of the created alert'),
  rule_id: z.string().describe('The ID of the detection rule that fired'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Alert severity'),
  risk_score: z.number().describe('Alert risk score'),
  rule_name: z.string().describe('Name of the detection rule'),
});

export type SocAlertTriggerEvent = z.infer<typeof socAlertTriggerEventSchema>;

export const socAlertTriggerDefinition = {
  id: SOC_ALERT_TRIGGER_ID,
  eventSchema: socAlertTriggerEventSchema,
};
