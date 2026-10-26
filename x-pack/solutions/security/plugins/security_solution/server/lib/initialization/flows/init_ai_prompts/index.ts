/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInstallReadyResult } from '../../../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import { SECURITY_AI_PROMPTS_PACKAGE_NAME } from '../../../../../common/detection_engine/constants';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';
import { installSecurityAiPromptsPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_ai_prompts';

export const initAiPromptsFlow: InitializationFlowDefinition<PackageInstallReadyResult['payload']> =
  {
    id: INITIALIZATION_FLOW_INIT_AI_PROMPTS,
    runFlow: async (
      context: InitializationFlowContext
    ): Promise<InitializationFlowResult<PackageInstallReadyResult['payload']>> => {
      const securityContext = await context.requestHandlerContext.securitySolution;
      const result = await installSecurityAiPromptsPackage(securityContext, context.logger);

      if (result === null) {
        context.logger.debug('AI prompts package installation skipped: package is not available');
        return {
          status: INITIALIZATION_FLOW_STATUS_READY,
          payload: {
            name: SECURITY_AI_PROMPTS_PACKAGE_NAME,
            version: '',
            install_status: 'skipped',
          },
        };
      }

      context.logger.info(
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
