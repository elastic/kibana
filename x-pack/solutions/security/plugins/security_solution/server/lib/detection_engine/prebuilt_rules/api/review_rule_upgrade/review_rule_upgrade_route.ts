/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';
import {
  REVIEW_RULE_UPGRADE_URL,
  ReviewRuleUpgradeRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import {
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
  PREBUILT_RULES_UPGRADE_REVIEW_CONCURRENCY,
} from '../../constants';
import { reviewRuleUpgradeHandler } from './review_rule_upgrade_handler';

export const reviewRuleUpgradeRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: REVIEW_RULE_UPGRADE_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_READ],
        },
      },
      options: {
        tags: [routeLimitedConcurrencyTag(PREBUILT_RULES_UPGRADE_REVIEW_CONCURRENCY)],
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
            body: buildRouteValidationWithZod(ReviewRuleUpgradeRequestBody),
          },
        },
      },
      reviewRuleUpgradeHandler
    );
};
