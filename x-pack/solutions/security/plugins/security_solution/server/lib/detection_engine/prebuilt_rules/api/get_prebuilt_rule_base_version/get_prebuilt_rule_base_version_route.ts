/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  GET_PREBUILT_RULES_BASE_VERSION_URL,
  GetPrebuiltRuleBaseVersionRequest,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { getPrebuiltRuleBaseVersionHandler } from './get_prebuilt_rule_base_version_handler';

export const getPrebuiltRuleBaseVersion = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_PREBUILT_RULES_BASE_VERSION_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetPrebuiltRuleBaseVersionRequest),
          },
        },
      },
      getPrebuiltRuleBaseVersionHandler
    );
};
