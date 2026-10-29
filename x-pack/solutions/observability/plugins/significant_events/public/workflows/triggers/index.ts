/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';

/**
 * Registers the significant-events custom workflow triggers on the public side using async loaders,
 * so the trigger definition module (and its zod schemas) stays out of the plugin's main bundle.
 */
export const registerSignificantEventsWorkflowTriggers = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup | undefined
): void => {
  if (!workflowsExtensions) {
    return;
  }

  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (module) => module.eventCreatedTriggerCommonDefinition
    )
  );
  workflowsExtensions.registerTriggerDefinition(() =>
    import('../../../common/workflows/triggers').then(
      (module) => module.eventStatusChangedTriggerCommonDefinition
    )
  );
};
