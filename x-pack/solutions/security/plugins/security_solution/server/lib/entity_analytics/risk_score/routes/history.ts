/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import dateMath from '@kbn/datemath';
import { TimeBuckets } from '@kbn/data-plugin/common';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import { RISK_SCORE_HISTORY_URL } from '../../../../../common/entity_analytics/risk_score/constants';
import type { RiskScoreHistoryResponse } from '../../../../../common/api/entity_analytics';
import { GetRiskScoreHistoryRequestQuery } from '../../../../../common/api/entity_analytics';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { withMinimumLicense } from '../../utils/with_minimum_license';

const DEFAULT_FROM = 'now-90d';
const DEFAULT_TO = 'now';

// Risk scoring runs hourly, so sub-hour buckets carry no extra information. This
// floor also collapses the degenerate `from === to` point-in-time fetch (which
// derives a ~1ms interval) into a single bucket holding that exact document.
const MIN_INTERVAL_MS = 60 * 60 * 1000;

export const riskScoreHistoryRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  router.versioned
    .get({
      path: RISK_SCORE_HISTORY_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetRiskScoreHistoryRequestQuery),
          },
        },
      },
      withMinimumLicense(
        async (context, request, response): Promise<IKibanaResponse<RiskScoreHistoryResponse>> => {
          const siemResponse = buildSiemResponse(response);

          try {
            const {
              entity_type: entityType,
              entity_id: entityId,
              from,
              to,
              score_type: scoreType,
              include_contributions: includeContributions,
            } = request.query;

            const gte = from ?? DEFAULT_FROM;
            const lte = to ?? DEFAULT_TO;

            const min = dateMath.parse(gte);
            const max = dateMath.parse(lte, { roundUp: true });

            if (!min?.isValid() || !max?.isValid()) {
              return siemResponse.error({
                statusCode: 400,
                body: `Unable to parse time range from "${gte}" to "${lte}".`,
              });
            }

            const uiSettingsClient = (await context.core).uiSettings.client;
            const [maxBars, barTarget, dateFormat, dateFormatScaled] = await Promise.all([
              uiSettingsClient.get<number>('histogram:maxBars'),
              uiSettingsClient.get<number>('histogram:barTarget'),
              uiSettingsClient.get<string>('dateFormat'),
              uiSettingsClient.get<string[][]>('dateFormat:scaled'),
            ]);

            const buckets = new TimeBuckets({
              'histogram:maxBars': maxBars,
              'histogram:barTarget': barTarget,
              dateFormat,
              'dateFormat:scaled': dateFormatScaled,
            });
            buckets.setInterval('auto');
            buckets.setBounds({ min, max });

            const bucketInterval = buckets.getInterval();
            const interval =
              bucketInterval.asMilliseconds() < MIN_INTERVAL_MS
                ? { value: 1, unit: 'h' }
                : { value: bucketInterval.esValue, unit: bucketInterval.esUnit };

            const riskScoreDataClient = (await context.securitySolution).getRiskScoreDataClient();

            const entries = await riskScoreDataClient.getRiskScoreHistory({
              entityType,
              entityId,
              range: { gte, lte },
              scoreType,
              interval,
              includeContributions: includeContributions ?? false,
            });

            return response.ok({
              body: {
                entity_id: entityId,
                entity_type: entityType,
                interval: `${interval.value}${interval.unit}`,
                entries,
              },
            });
          } catch (e) {
            const error = transformError(e);

            return siemResponse.error({
              statusCode: error.statusCode,
              body: { message: error.message, full_error: JSON.stringify(e) },
              bypassErrorFormat: true,
            });
          }
        },
        'platinum'
      )
    );
};
