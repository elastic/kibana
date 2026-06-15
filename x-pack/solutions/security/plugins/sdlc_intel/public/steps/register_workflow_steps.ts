/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
import {
  buildEpicPhasesStepDefinition,
  buildRelationshipsStepDefinition,
  listGithubProjectsToSyncStepDefinition,
  seedReferenceDataStepDefinition,
  setupIndicesStepDefinition,
  syncGithubOrgCatalogStepDefinition,
  syncGithubProjectsStepDefinition,
  syncReleaseCalendarSlackStepDefinition,
  syncReleaseCalendarSpreadsheetStepDefinition,
} from './sdlc_steps';

export const registerSdlcWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsPublicPluginSetup
): void => {
  workflowsExtensions.registerStepDefinition(setupIndicesStepDefinition);
  workflowsExtensions.registerStepDefinition(seedReferenceDataStepDefinition);
  workflowsExtensions.registerStepDefinition(listGithubProjectsToSyncStepDefinition);
  workflowsExtensions.registerStepDefinition(syncGithubProjectsStepDefinition);
  workflowsExtensions.registerStepDefinition(syncGithubOrgCatalogStepDefinition);
  workflowsExtensions.registerStepDefinition(buildRelationshipsStepDefinition);
  workflowsExtensions.registerStepDefinition(buildEpicPhasesStepDefinition);
  workflowsExtensions.registerStepDefinition(syncReleaseCalendarSlackStepDefinition);
  workflowsExtensions.registerStepDefinition(syncReleaseCalendarSpreadsheetStepDefinition);
};
