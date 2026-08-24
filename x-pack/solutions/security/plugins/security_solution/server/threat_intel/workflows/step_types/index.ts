/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { buildFetchSourceStepDefinition } from './fetch_source/fetch_source_step';

/** Registers threat_intel.fetch_source on the workflowsExtensions contract. */
export const registerThreatIntelWorkflowSteps = ({
  workflowsExtensions,
  logger,
  getActionsStart,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  logger: Logger;
  getActionsStart?: () => Promise<ActionsPluginStartContract | undefined>;
}): void => {
  workflowsExtensions.registerStepDefinition(
    buildFetchSourceStepDefinition({ logger, getActionsStart })
  );
};
