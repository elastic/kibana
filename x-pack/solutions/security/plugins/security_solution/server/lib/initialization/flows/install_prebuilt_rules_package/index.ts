/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from '../../types';
import type { InstallPrebuiltRulesPackageProvisionContext } from './types';
import { installPrebuiltRulesPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_prebuilt_rules_package';

export const installPrebuiltRulesPackageFlow: InitializationFlowDefinition<InstallPrebuiltRulesPackageProvisionContext> =
  {
    id: INITIALIZATION_FLOW_INSTALL_PREBUILT_RULES_PACKAGE,
    runFirst: true,
    resolveProvisionContext: async (
      context: InitializationFlowContext
    ): Promise<InstallPrebuiltRulesPackageProvisionContext> => {
      const securityContext = await context.requestHandlerContext.securitySolution;
      return { securityContext };
    },
    provision: async ({ securityContext }, logger: Logger) => {
      const result = await installPrebuiltRulesPackage(securityContext, logger);

      logger.info(
        `Prebuilt rules package initialized: "${result.package.name}" v${result.package.version}`
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
