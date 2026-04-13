/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  INITIALIZATION_FLOW_INIT_DETECTION_ENGINE_RULE_MONITORING,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from '../../types';
import type { InstallDetectionEngineRuleMonitoringAssetsProvisionContext } from './types';

export const initDetectionEngineRuleMonitoringFlow: InitializationFlowDefinition<InstallDetectionEngineRuleMonitoringAssetsProvisionContext> =
  {
    id: INITIALIZATION_FLOW_INIT_DETECTION_ENGINE_RULE_MONITORING,
    resolveProvisionContext: async (
      context: InitializationFlowContext
    ): Promise<InstallDetectionEngineRuleMonitoringAssetsProvisionContext> => {
      const securityContext = await context.requestHandlerContext.securitySolution;

      // The health client internally creates an importer backed by
      // coreStart.savedObjects.createInternalRepository(), which uses the
      // system ES client (asInternalUser). This ensures asset installation
      // works regardless of the request user's saved-object privileges.
      return {
        healthClient: securityContext.getDetectionEngineHealthClient(),
      };
    },
    provision: async ({ healthClient }, logger: Logger) => {
      await healthClient.installAssetsForMonitoringHealth();

      logger.info('Detection engine rule monitoring assets initialized');

      return { status: INITIALIZATION_FLOW_STATUS_READY };
    },
  };
