/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import { LIST_RULE_LIBRARIES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { listRuleLibrariesHandler } from './list_rule_libraries_handler';

export const listRuleLibrariesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: LIST_RULE_LIBRARIES_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      (context, request, response) => listRuleLibrariesHandler(context, request, response, logger)
    );
};
