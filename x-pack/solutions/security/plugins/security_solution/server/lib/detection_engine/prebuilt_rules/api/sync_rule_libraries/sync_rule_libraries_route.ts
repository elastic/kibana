/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import {
  SYNC_RULE_LIBRARIES_URL,
  SyncRuleLibrariesRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';
import { syncRuleLibrariesHandler } from './sync_rule_libraries_handler';

export const syncRuleLibrariesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: SYNC_RULE_LIBRARIES_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
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
        validate: {
          request: {
            body: buildRouteValidationWithZod(SyncRuleLibrariesRequestBody),
          },
        },
      },
      (context, request, response) => syncRuleLibrariesHandler(context, request, response, logger)
    );
};
