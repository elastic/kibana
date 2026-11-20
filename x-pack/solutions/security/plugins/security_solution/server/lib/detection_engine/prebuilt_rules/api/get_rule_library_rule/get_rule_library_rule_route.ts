/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  GET_RULE_LIBRARY_RULE_URL,
  GetRuleLibraryRuleRequestQuery,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { getRuleLibraryRuleHandler } from './get_rule_library_rule_handler';

export const getRuleLibraryRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_RULE_LIBRARY_RULE_URL,
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
            query: buildRouteValidationWithZod(GetRuleLibraryRuleRequestQuery),
          },
        },
      },
      (context, request, response) => getRuleLibraryRuleHandler(context, request, response, logger)
    );
};
