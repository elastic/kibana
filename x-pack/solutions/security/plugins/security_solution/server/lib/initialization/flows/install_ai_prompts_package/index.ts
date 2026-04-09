/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from '../../types';
import type { InstallAiPromptsPackageProvisionContext } from './types';
import { installSecurityAiPromptsPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts';

export const installAiPromptsPackageFlow: InitializationFlowDefinition<InstallAiPromptsPackageProvisionContext> =
  {
    id: INITIALIZATION_FLOW_INSTALL_AI_PROMPTS_PACKAGE,
    resolveProvisionContext: async (
      context: InitializationFlowContext
    ): Promise<InstallAiPromptsPackageProvisionContext> => {
      const securityContext = await context.requestHandlerContext.securitySolution;
      return { securityContext };
    },
    provision: async ({ securityContext }, logger: Logger) => {
      const result = await installSecurityAiPromptsPackage(securityContext, logger);

      if (result === null) {
        logger.debug('AI prompts package installation skipped: package is not available');
        return {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: {
            name: 'security_ai_prompts',
            version: '',
            install_status: 'skipped',
          },
        };
      }

      logger.info(
        `AI prompts package initialized: "${result.package.name}" v${result.package.version}`
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
