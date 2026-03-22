/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsPluginSetup } from '@kbn/workflows-extensions/server';

import { alertCreatedTriggerCommonDefinition } from '../../../common/workflows/triggers/alert_created';

/**
 * Register Elastic Assistant workflow triggers
 *
 * Currently registers:
 * - Alert Created (High Risk) trigger
 */
export function registerElasticAssistantWorkflowTriggers({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions?: WorkflowsExtensionsPluginSetup;
  logger: Logger;
}) {
  if (!workflowsExtensions) {
    logger.debug(
      '[Workflows] workflows_extensions plugin not available, skipping trigger registration'
    );
    return;
  }

  // Register Alert Created trigger
  workflowsExtensions.registerTriggerDefinition(alertCreatedTriggerCommonDefinition);

  logger.info('[Workflows] Registered Alert Created (High Risk) trigger');
}
