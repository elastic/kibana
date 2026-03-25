/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  INCIDENT_RESPONSE_PLAYBOOK,
  FULL_INVESTIGATION_PLAYBOOK,
  PROACTIVE_THREAT_HUNT_PLAYBOOK,
  DETECTION_COVERAGE_AUDIT_PLAYBOOK,
  SOC_PLAYBOOKS,
} from './playbooks';

export {
  SOC_ALERT_TRIGGER_ID,
  socAlertTriggerEventSchema,
  socAlertTriggerDefinition,
} from '../../common/workflows';

export type { SocAlertTriggerEvent } from '../../common/workflows';
