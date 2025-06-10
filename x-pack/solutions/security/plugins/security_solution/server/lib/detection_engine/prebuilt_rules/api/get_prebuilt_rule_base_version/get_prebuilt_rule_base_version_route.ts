/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  GET_PREBUILT_RULES_BASE_VERSION_URL,
  GetPrebuiltRuleBaseVersionRequest,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import {
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
  PREBUILT_RULES_OPERATION_CONCURRENCY,
} from '../../constants';
import { getPrebuiltRuleBaseVersionHandler } from './get_prebuilt_rule_base_version_handler';

export const getPrebuiltRuleBaseVersion = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: GET_PREBUILT_RULES_BASE_VERSION_URL,
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
            body: buildRouteValidationWithZod(GetPrebuiltRuleBaseVersionRequest),
          },
        },
      },
      getPrebuiltRuleBaseVersionHandler
    );
};
