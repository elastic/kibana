/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { significantEventsTriggerCommonDefinitions } from '../../../common/workflows/triggers';

export const registerSignificantEventsWorkflowTriggers = (
  workflowsExtensions: Pick<WorkflowsExtensionsTasksSetup, 'registerTriggerDefinition'> | undefined
): void => {
  if (!workflowsExtensions) {
    return;
  }

  significantEventsTriggerCommonDefinitions.forEach((definition) => {
    workflowsExtensions.registerTriggerDefinition(definition);
  });
};
