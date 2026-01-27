/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

import { SearchAlertsRequestBody } from '../../../../../common/api/detection_engine/signals';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { searchAlertsHandler } from '../common/search_alerts_handler';

export const querySignalsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [ALERTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchAlertsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const getIndexPattern = async () => {
          const spaceId = (await context.securitySolution).getSpaceId();
          const indexPattern = ruleDataClient?.indexNameWithNamespace(spaceId);
          return indexPattern;
        };

        return searchAlertsHandler({ context, request, response, getIndexPattern });
      }
    );
};
