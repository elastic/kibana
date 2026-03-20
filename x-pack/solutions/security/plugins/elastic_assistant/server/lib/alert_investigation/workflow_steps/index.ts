/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';

import {
  fetchUnprocessedAlertsStep,
  deduplicateAlertsStep,
  extractEntitiesStep,
  tagProcessedAlertsStep,
} from './alert_pipeline_steps';
import { caseMatchingStep } from './case_matching_step';
import { triggerIncrementalAdStep } from './trigger_incremental_ad_step';

export const registerPipelineWorkflowSteps = ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  logger: Logger;
}): void => {
  workflowsExtensions.registerStepDefinition(fetchUnprocessedAlertsStep);
  workflowsExtensions.registerStepDefinition(deduplicateAlertsStep);
  workflowsExtensions.registerStepDefinition(extractEntitiesStep);
  workflowsExtensions.registerStepDefinition(tagProcessedAlertsStep);

  logger.info('Registered 4 alert investigation pipeline workflow steps');
};
