/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { GET_SIEM_READINESS_MITRE_DATA_INDICES_DOCS_COUNT_API_PATH } from '@kbn/siem-readiness';
import * as rt from 'io-ts';
import { buildRouteValidationWithExcess } from '../../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchIndicesDocCounts } from '../fetchers';
import { assertSiemReadinessEnabled } from '../assert_siem_readiness_enabled';

export const getMitreDataIndicesDocsCountRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .post({
      path: GET_SIEM_READINESS_MITRE_DATA_INDICES_DOCS_COUNT_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: buildRouteValidationWithExcess(
              rt.type({
                indices: rt.array(rt.string),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { indices } = request.body;

          const core = await context.core;

          const disabledResponse = await assertSiemReadinessEnabled(
            core.uiSettings.client,
            response
          );
          if (disabledResponse) {
            return disabledResponse;
          }

          const esClient = core.elasticsearch.client.asCurrentUser;

          const indexDocCounts = await fetchIndicesDocCounts({ esClient, indices: indices || [] });

          return response.ok({
            body: {
              indices: indexDocCounts,
            },
          });
        } catch (error) {
          return siemResponse.error({
            statusCode: 500,
            body: {
              message: `Failed to get document counts: ${error.message || 'Unknown error'}`,
            },
          });
        }
      }
    );
};
