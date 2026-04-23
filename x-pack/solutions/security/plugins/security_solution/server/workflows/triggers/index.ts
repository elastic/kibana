/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import {
  commonSecurityAlertsCreatedTriggerDefinition,
  commonSecurityRuleCreatedTriggerDefinition,
} from '../../../common/workflows/triggers';

export { createEmitAlertsCreatedEvent } from './emit_alerts_created_event';
export type { EmitAlertsCreatedEvent } from './emit_alerts_created_event';

export const registerWorkflowTriggers = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(commonSecurityAlertsCreatedTriggerDefinition);
  workflowsExtensions.registerTriggerDefinition(commonSecurityRuleCreatedTriggerDefinition);
};
