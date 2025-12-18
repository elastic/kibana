/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { REVIEW_RULE_INSTALLATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { ReviewRuleInstallationRequestBody as ReviewRuleInstallationRequestBodySchema } from '../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import { PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS } from '../../constants';
import { reviewRuleInstallationHandler } from './review_rule_installation_handler';

export const reviewRuleInstallationRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_INSTALLATION_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
      options: {
        tags: [routeLimitedConcurrencyTag(3)],
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
            body: buildRouteValidationWithZod(ReviewRuleInstallationRequestBodySchema),
          },
        },
      },
      reviewRuleInstallationHandler
    );
};
