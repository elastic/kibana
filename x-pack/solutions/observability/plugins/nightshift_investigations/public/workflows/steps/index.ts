/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

export const registerInvestigationsWorkflowSteps = (
  workflowsExtensions:
    | Pick<WorkflowsExtensionsPublicPluginSetup, 'registerStepDefinition'>
    | undefined
): void => {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerStepDefinition(() =>
    import('./trigger_investigation').then(
      (module) => module.triggerInvestigationPublicStepDefinition
    )
  );
};
