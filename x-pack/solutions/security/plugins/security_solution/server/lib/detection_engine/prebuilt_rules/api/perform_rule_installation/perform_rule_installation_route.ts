/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PERFORM_RULE_INSTALLATION_URL,
  PerformRuleInstallationRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import {
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
  PREBUILT_RULES_OPERATION_CONCURRENCY,
} from '../../constants';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import { performRuleInstallationHandler } from './perform_rule_installation_handler';

export const performRuleInstallationRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: PERFORM_RULE_INSTALLATION_URL,
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
            body: buildRouteValidation(PerformRuleInstallationRequestBody),
          },
        },
      },
      performRuleInstallationHandler
    );
};
