/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { initSecurityManagedWorkflowsClient } from './managed_workflows';
import { installSecurityAlertAnalysisWorkflow } from './alert_analysis_workflow/install';
import { installSecurityInvestigateRulesWorkflow } from './investigate_rules_workflow/install';

/**
 * Plugin-start entry point: install every security-owned managed workflow, then mark managed
 * workflows ready. `ready()` must run only after all installs resolve (it closes the startup
 * window and triggers reconciliation), so this awaits the installs first, reusing a single
 * client, in one try/catch. Intended to be called once, fire-and-forget, from the plugin's
 * `start()`.
 */
export const installSecurityManagedWorkflowsAndMarkReady = async ({
  workflowsExtensions,
  logger,
  experimentalFeatures,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
  experimentalFeatures: ExperimentalFeatures;
}): Promise<void> => {
  try {
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    await installSecurityAlertAnalysisWorkflow({ managedWorkflowsClient });
    if (experimentalFeatures.investigateRuleSkill) {
      // PoC companion of the investigate-rule skill; only useful when the skill is registered.
      await installSecurityInvestigateRulesWorkflow({ managedWorkflowsClient });
    }
    await managedWorkflowsClient.ready();
  } catch (error) {
    logger.warn('Failed to install security managed workflows', { error });
  }
};
