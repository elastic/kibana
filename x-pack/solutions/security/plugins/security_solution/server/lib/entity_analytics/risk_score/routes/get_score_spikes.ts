/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { GetRiskScoreSpikesResponse } from '../../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID, RISK_SCORE_SPIKES_URL } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { buildRiskScoreServiceForRequest } from './helpers';

export const riskScoreSpikesRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: RISK_SCORE_SPIKES_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response): Promise<IKibanaResponse<GetRiskScoreSpikesResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const securityContext = await context.securitySolution;
        const coreContext = await context.core;
        const riskScoreService = buildRiskScoreServiceForRequest(
          securityContext,
          coreContext,
          logger
        );

        // const {
        //   after_keys: userAfterKeys,
        //   data_view_id: dataViewId,
        //   debug,
        //   page_size: userPageSize,
        //   identifier_type: identifierType,
        //   filter,
        //   range: userRange,
        //   weights,
        //   exclude_alert_statuses: excludedStatuses,
        //   exclude_alert_tags: excludedTags,
        // } = request.body;

        try {
          const res = await riskScoreService.getRiskScoreSpikes();

          return response.ok({ body: res });
        } catch (e) {
          const error = transformError(e);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: { message: error.message, full_error: JSON.stringify(e) },
            bypassErrorFormat: true,
          });
        }
      }
    );
};
