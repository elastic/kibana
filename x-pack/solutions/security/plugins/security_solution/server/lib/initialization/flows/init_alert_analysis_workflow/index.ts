/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import {
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
  MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT,
} from '@kbn/workflows/common/alert_analysis_workflow';
import {
  INITIALIZATION_FLOW_INIT_ALERT_ANALYSIS_WORKFLOW,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';
import type { StartPlugins } from '../../../../plugin';
import {
  ensureSecurityAlertAnalysisWorkflowInstalled,
  initSecurityManagedWorkflowsClient,
  readSecurityAlertAnalysisWorkflowSettings,
} from '../../../../workflows/managed_workflows';

// Initialization flows are static objects with no access to the plugin's start-time
// dependencies, so `setup()` hands this flow `core.getStartServices` once, the same way
// `registerWorkflowSteps` captures it for step definitions.
let getStartServices: CoreSetup<StartPlugins>['getStartServices'] | undefined;

export const registerInitAlertAnalysisWorkflowFlowDependencies = (
  core: CoreSetup<StartPlugins>
): void => {
  getStartServices = core.getStartServices;
};

export const initAlertAnalysisWorkflowFlow: InitializationFlowDefinition<null> = {
  id: INITIALIZATION_FLOW_INIT_ALERT_ANALYSIS_WORKFLOW,
  spaceAware: true,
  runFlow: async (context: InitializationFlowContext): Promise<InitializationFlowResult<null>> => {
    if (!getStartServices) {
      return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
    }

    const [coreStart, pluginsStart] = await getStartServices();
    const { workflowsExtensions } = pluginsStart;
    if (!workflowsExtensions) {
      return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
    }

    const isEnabled = await coreStart.featureFlags.getBooleanValue(
      MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG,
      MANAGED_ALERT_ANALYSIS_WORKFLOW_FEATURE_FLAG_DEFAULT
    );
    if (!isEnabled) {
      return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
    }

    const securitySolution = await context.requestHandlerContext.securitySolution;
    const spaceId = securitySolution.getSpaceId();
    const uiSettingsClient = (await context.requestHandlerContext.core).uiSettings.client;

    const settings = await readSecurityAlertAnalysisWorkflowSettings(uiSettingsClient);
    const managedWorkflowsClient = await initSecurityManagedWorkflowsClient(workflowsExtensions);

    await ensureSecurityAlertAnalysisWorkflowInstalled({
      managedWorkflowsClient,
      spaceId,
      settings,
    });

    context.logger.debug(`Alert analysis workflow ensured for space '${spaceId}'`);

    return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
  },
};
