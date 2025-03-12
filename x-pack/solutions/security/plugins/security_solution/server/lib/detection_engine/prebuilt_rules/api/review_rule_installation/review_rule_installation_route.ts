/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REVIEW_RULE_INSTALLATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import {
  PREBUILT_RULES_OPERATION_CONCURRENCY,
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
} from '../../constants';
import { reviewRuleInstallationHandler } from './review_rule_installation_handler';

export const reviewRuleInstallationRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_INSTALLATION_URL,
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
        validate: {},
      },
      reviewRuleInstallationHandler
    );
};
