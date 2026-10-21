/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import {
  alertStatusChangedTriggerDef,
  alertTagsChangedTriggerDef,
  alertAssigneesChangedTriggerDef,
  attackStatusChangedTriggerDef,
  attackTagsChangedTriggerDef,
  attackAssigneesChangedTriggerDef,
  noteCreatedTriggerDef,
  noteUpdatedTriggerDef,
} from '../../../common/workflows/triggers';

export const registerSecurityWorkflowTriggers = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup
): void => {
  workflowsExtensions.registerTriggerDefinition(alertStatusChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(alertTagsChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(alertAssigneesChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(attackStatusChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(attackTagsChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(attackAssigneesChangedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(noteCreatedTriggerDef);
  workflowsExtensions.registerTriggerDefinition(noteUpdatedTriggerDef);
};
