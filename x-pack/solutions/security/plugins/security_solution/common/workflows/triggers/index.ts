/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  SECURITY_ALERTS_CREATED_TRIGGER_ID,
  securityAlertsCreatedEventSchema,
  commonSecurityAlertsCreatedTriggerDefinition,
} from './alerts_created_trigger';
export type { SecurityAlertsCreatedEvent } from './alerts_created_trigger';

export {
  SECURITY_RULE_CREATED_TRIGGER_ID,
  securityRuleCreatedEventSchema,
  commonSecurityRuleCreatedTriggerDefinition,
} from './rule_created_trigger';
export type { SecurityRuleCreatedEvent } from './rule_created_trigger';
