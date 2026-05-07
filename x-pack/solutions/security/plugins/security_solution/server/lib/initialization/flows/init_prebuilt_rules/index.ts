/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInstallReadyResult } from '../../../../../common/api/initialization';
import {
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';
import { installPrebuiltRulesPackage } from '../../../detection_engine/prebuilt_rules/logic/integrations/install_prebuilt_rules_package';

export const initPrebuiltRulesFlow: InitializationFlowDefinition<
  PackageInstallReadyResult['payload']
> = {
  id: INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  runFirst: true,
  runFlow: async (
    context: InitializationFlowContext
  ): Promise<InitializationFlowResult<PackageInstallReadyResult['payload']>> => {
    const securityContext = await context.requestHandlerContext.securitySolution;
    const result = await installPrebuiltRulesPackage(securityContext, context.logger);

    context.logger.info(
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
