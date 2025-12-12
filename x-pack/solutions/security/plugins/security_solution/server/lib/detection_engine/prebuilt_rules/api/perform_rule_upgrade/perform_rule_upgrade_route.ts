/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import {
  PERFORM_RULE_UPGRADE_URL,
  PerformRuleUpgradeRequestBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { routeLimitedConcurrencyTag } from '../../../../../utils/route_limited_concurrency_tag';
import {
  PREBUILT_RULES_OPERATION_CONCURRENCY,
  PREBUILT_RULES_OPERATION_SOCKET_TIMEOUT_MS,
} from '../../constants';
import { performRuleUpgradeHandler } from './perform_rule_upgrade_handler';

export const performRuleUpgradeRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .post({
      access: 'internal',
      path: PERFORM_RULE_UPGRADE_URL,
      security: {
        authz: {
          requiredPrivileges: [RULES_API_ALL],
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
            body: buildRouteValidationWithZod(PerformRuleUpgradeRequestBody),
          },
        },
      },
      (context, request, response) => performRuleUpgradeHandler(context, request, response, logger)
    );
};
