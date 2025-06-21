/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  REVERT_PREBUILT_RULES_URL,
  RevertPrebuiltRulesRequest,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import {
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
  PREBUILT_RULES_OPERATION_CONCURRENCY,
} from '../../constants';
import { revertPrebuiltRuleHandler } from './revert_prebuilt_rule_handler';

export const revertPrebuiltRule = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVERT_PREBUILT_RULES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: {
        tags: [routeLimitedConcurrencyTag(PREBUILT_RULES_OPERATION_CONCURRENCY)],
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
            body: buildRouteValidationWithZod(RevertPrebuiltRulesRequest),
          },
        },
      },
      revertPrebuiltRuleHandler
    );
};
