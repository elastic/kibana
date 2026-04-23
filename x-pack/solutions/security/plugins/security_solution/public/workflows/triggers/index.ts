/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerWorkflowTriggerDefinitions = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./alerts_created_trigger').then((m) => m.securityAlertsCreatedPublicDefinition)
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('./rule_created_trigger').then((m) => m.securityRuleCreatedPublicDefinition)
  );
};
