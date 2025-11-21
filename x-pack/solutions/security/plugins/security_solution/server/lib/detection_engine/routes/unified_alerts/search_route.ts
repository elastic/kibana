/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
  UPGRADE_LICENSE_MESSAGE,
  hasAIAssistantLicense,
} from '@kbn/elastic-assistant-common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';

import { SearchUnifiedAlertsRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL } from '../../../../../common/constants';
import { searchAlertsHandler } from '../common/search_alerts_handler';

export const searchUnifiedAlertsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchUnifiedAlertsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        // Accessing attacks requires assistant license
        const license = (await context.licensing).license;
        if (!hasAIAssistantLicense(license)) {
          return response.forbidden({
            body: {
              message: UPGRADE_LICENSE_MESSAGE,
            },
          });
        }

        const getIndexPattern = async () => {
          const spaceId = (await context.securitySolution).getSpaceId();
          const alertsIndex = ruleDataClient?.indexNameWithNamespace(spaceId);
          const indexPattern = [
            ...(alertsIndex ? [alertsIndex] : []), // Detection alerts
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, // Attack alerts
          ];
          return indexPattern;
        };

        return searchAlertsHandler({ context, request, response, getIndexPattern });
      }
    );
};
