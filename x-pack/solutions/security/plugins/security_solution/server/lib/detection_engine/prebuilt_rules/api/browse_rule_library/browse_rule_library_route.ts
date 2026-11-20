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
  BROWSE_RULE_LIBRARY_URL,
  BrowseRuleLibraryRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { browseRuleLibraryHandler } from './browse_rule_library_handler';

export const browseRuleLibraryRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: BROWSE_RULE_LIBRARY_URL,
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
            body: buildRouteValidationWithZod(BrowseRuleLibraryRequestBody),
          },
        },
      },
      (context, request, response) => browseRuleLibraryHandler(context, request, response, logger)
    );
};
