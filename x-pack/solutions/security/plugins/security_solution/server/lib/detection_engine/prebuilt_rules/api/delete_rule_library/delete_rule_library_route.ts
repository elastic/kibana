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
  DELETE_RULE_LIBRARY_URL,
  DeleteRuleLibraryRequestParams,
  DeleteRuleLibraryRequestQuery,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { deleteRuleLibraryHandler } from './delete_rule_library_handler';

export const deleteRuleLibraryRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .delete({
      access: 'internal',
      path: DELETE_RULE_LIBRARY_URL,
      security: {
        authz: {
          // Placeholder until the RFC defines the privilege for managing libraries, shared ones in particular.
          requiredPrivileges: [RULES_API_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteRuleLibraryRequestParams),
            query: buildRouteValidationWithZod(DeleteRuleLibraryRequestQuery),
          },
        },
      },
      (context, request, response) => deleteRuleLibraryHandler(context, request, response, logger)
    );
};
