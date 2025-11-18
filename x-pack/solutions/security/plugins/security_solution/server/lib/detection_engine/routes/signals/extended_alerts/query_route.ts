/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX } from '@kbn/elastic-assistant-common';
import { SearchExtendedAlertsRequestBody } from '../../../../../../common/api/detection_engine/extended_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { DETECTION_ENGINE_QUERY_EXTENDED_ALERTS_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../utils';
import { searchAlerts } from '../utils/search_alerts';

export const queryExtendedAlertsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_QUERY_EXTENDED_ALERTS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchExtendedAlertsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        const {
          query,
          aggs,
          _source,
          fields,
          track_total_hits: trackTotalHits,
          size,
          sort,
        } = request.body;
        const siemResponse = buildSiemResponse(response);
        if (
          query == null &&
          aggs == null &&
          _source == null &&
          fields == null &&
          trackTotalHits == null &&
          size == null &&
          sort == null
        ) {
          return siemResponse.error({
            statusCode: 400,
            body: '"value" must have at least 1 children',
          });
        }
        try {
          const spaceId = (await context.securitySolution).getSpaceId();
          const alertsIndex = ruleDataClient?.indexNameWithNamespace(spaceId);
          const indexPattern = [
            ...(alertsIndex ? [alertsIndex] : []), // Detection alerts
            `${ATTACK_DISCOVERY_ALERTS_COMMON_INDEX_PREFIX}-${spaceId}`, // Attack alerts
          ];

          const result = await searchAlerts({ esClient, queryParams: request.body, indexPattern });

          return response.ok({ body: result });
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
