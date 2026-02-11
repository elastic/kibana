/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { INITIALIZE_SECURITY_SOLUTION } from '@kbn/security-solution-features/constants';
import { BOOTSTRAP_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';
import { bootstrapPrebuiltRulesHandler } from './bootstrap_prebuilt_rules_handler';
import { throttleRequests } from '../../../../../utils/throttle_requests';

export const bootstrapPrebuiltRulesRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: BOOTSTRAP_PREBUILT_RULES_URL,
      security: {
        authz: {
          requiredPrivileges: [INITIALIZE_SECURITY_SOLUTION],
        },
      },
      options: {
        timeout: {
          idleSocket: PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      throttleRequests((context, request, response) => {
        return bootstrapPrebuiltRulesHandler(context, request, response, logger);
      })
    );
};
