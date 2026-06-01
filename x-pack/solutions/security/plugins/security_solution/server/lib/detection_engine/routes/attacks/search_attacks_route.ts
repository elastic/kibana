/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ADHOC_ALERTS_INDEX_PREFIX,
  ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTS_API_READ } from '@kbn/security-solution-features/constants';

import { SearchAttacksRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { DETECTION_ENGINE_ATTACKS_SEARCH_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { searchAlertsHandler } from '../common/search_alerts_handler';

export const searchAttacksRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ATTACKS_SEARCH_URL,
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
            body: buildRouteValidationWithZod(SearchAttacksRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const getIndexPattern = async () => {
          const spaceId = (await context.securitySolution).getSpaceId();
          return [
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, // scheduled attack index
            `${ATTACK_DISCOVERY_ADHOC_ALERTS_INDEX_PREFIX}-${spaceId}`, // adhoc attack index
          ];
        };

        return searchAlertsHandler({ context, request, response, getIndexPattern });
      }
    );
};
