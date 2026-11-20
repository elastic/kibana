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
  LIST_RULE_LIBRARY_TAGS_URL,
  ListRuleLibraryTagsRequestQuery,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { listRuleLibraryTagsHandler } from './list_rule_library_tags_handler';

export const listRuleLibraryTagsRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: LIST_RULE_LIBRARY_TAGS_URL,
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
            query: buildRouteValidationWithZod(ListRuleLibraryTagsRequestQuery),
          },
        },
      },
      (context, request, response) => listRuleLibraryTagsHandler(context, request, response, logger)
    );
};
