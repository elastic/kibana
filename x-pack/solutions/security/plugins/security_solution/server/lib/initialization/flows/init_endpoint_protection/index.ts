/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { ProductFeatureRulesKey } from '@kbn/security-solution-features/keys';
import {
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from '../../types';
import type { InstallEndpointPackageProvisionContext } from './types';
import { installEndpointPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_endpoint_package';

export const initEndpointProtectionFlow: InitializationFlowDefinition<InstallEndpointPackageProvisionContext> =
  {
    id: INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
    resolveProvisionContext: async (
      context: InitializationFlowContext
    ): Promise<InstallEndpointPackageProvisionContext> => {
      const securityContext = await context.requestHandlerContext.securitySolution;
      const productFeatureService = securityContext.getProductFeatureService();
      const isExternalDetectionsEnabled = productFeatureService.isEnabled(
        ProductFeatureRulesKey.externalDetections
      );
      return { securityContext, isExternalDetectionsEnabled };
    },
    provision: async ({ securityContext, isExternalDetectionsEnabled }, logger: Logger) => {
      if (isExternalDetectionsEnabled) {
        logger.debug('Endpoint package installation skipped: external detections is enabled');
        return {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: {
            name: 'endpoint',
            version: '',
            install_status: 'skipped',
          },
        };
      }

      const result = await installEndpointPackage(securityContext, logger);

      logger.info(
        `Endpoint package initialized: "${result.package.name}" v${result.package.version}`
      );

      return {
        status: INITIALIZATION_FLOW_STATUS_READY,
        payload: {
          name: result.package.name,
          version: result.package.version,
          install_status: result.status,
        },
      };
    },
  };
