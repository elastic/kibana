/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';

export const initDetectionRuleMonitoringFlow: InitializationFlowDefinition<null> = {
  id: INITIALIZATION_FLOW_INIT_DETECTION_RULE_MONITORING,
  spaceAware: true,
  runFlow: async (context: InitializationFlowContext): Promise<InitializationFlowResult<null>> => {
    const securityContext = await context.requestHandlerContext.securitySolution;

    // The health client internally creates an importer backed by
    // coreStart.savedObjects.createInternalRepository(), which uses the
    // system ES client (asInternalUser). This ensures asset installation
    // works regardless of the request user's saved-object privileges.
    const healthClient = securityContext.getDetectionEngineHealthClient();

    await healthClient.installAssetsForMonitoringHealth();

    context.logger.info('Detection rule monitoring assets initialized');

    return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
  },
};
