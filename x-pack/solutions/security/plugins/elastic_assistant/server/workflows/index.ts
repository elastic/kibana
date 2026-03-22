/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsPluginSetup } from '@kbn/workflows-extensions/server';

import { createAiInvestigationStepDefinition } from './steps';
import { registerElasticAssistantWorkflowTriggers } from './triggers';
import type { ConfigSchema } from '../config_schema';

/**
 * Register Elastic Assistant workflow steps and triggers
 *
 * Steps:
 * - AI Investigation step (wraps LangGraph multi-agent system)
 *
 * Triggers:
 * - Alert Created (High Risk) trigger
 */
export function registerElasticAssistantWorkflowSteps({
  workflowsExtensions,
  getActionsClient,
  config,
  logger,
}: {
  workflowsExtensions?: WorkflowsExtensionsPluginSetup;
  getActionsClient: (request: KibanaRequest) => Promise<ActionsPluginStart['getActionsClientWithRequest']>;
  config: ConfigSchema;
  logger: Logger;
}) {
  if (!workflowsExtensions) {
    logger.debug('[Workflows] workflows_extensions plugin not available, skipping registration');
    return;
  }

  // Register workflow triggers
  registerElasticAssistantWorkflowTriggers({
    workflowsExtensions,
    logger,
  });

  // Register AI Investigation step
  const aiInvestigationStep = createAiInvestigationStepDefinition({
    getActionsClient,
    config,
    logger,
  });

  workflowsExtensions.registerStepDefinition(aiInvestigationStep);

  logger.info('[Workflows] Registered AI Investigation workflow step and triggers');
}
