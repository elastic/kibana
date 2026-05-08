/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { CRUDClient } from '@kbn/entity-store/server/domain/crud';
import {
  GetBehavioralSummaryRequestParams,
  GetBehavioralSummaryRequestQuery,
} from '../../../../common/api/entity_analytics';
import { API_VERSIONS, APP_ID } from '../../../../common/constants';
import { getBehavioralSummary } from './get_behavioral_summary';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { withMinimumLicense } from '../utils/with_minimum_license';

export const BEHAVIORAL_SUMMARY_URL =
  '/internal/entity_analytics/entities/{entity_id}/behavioral_summary';

export const registerBehavioralSummaryRoutes = ({
  router,
  ml,
  logger,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: BEHAVIORAL_SUMMARY_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: GetBehavioralSummaryRequestParams,
            query: GetBehavioralSummaryRequestQuery,
          },
        },
      },
      withMinimumLicense(async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entity_id: entityId } = request.params;
          const { anomalyThreshold, from, baselineSize } = request.query;

          const secSol = await context.securitySolution;
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          if (!ml) {
            throw new Error('ML plugin is not available');
          }

          const namespace = secSol.getSpaceId();
          const entityStoreClient = new CRUDClient({ logger, esClient, namespace });
          const { mlAnomalySearch } = ml.mlSystemProvider(request, core.savedObjects.client);
          const mlAnomalyDetectors = ml.anomalyDetectorsProvider(request, core.savedObjects.client);

          const { entities } = await entityStoreClient.listEntities({
            filter: [{ term: { 'entity.id': entityId } }],
            size: 1,
          });
          if (entities.length === 0) {
            return siemResponse.error({
              statusCode: 404,
              body: `entity ${entityId} not found`,
            });
          }

          const entity = entities[0];

          const anomalies = await getBehavioralSummary({
            entity,
            anomalyThreshold: anomalyThreshold ?? 0,
            from: from ?? 'now-30d',
            baselineSize: baselineSize ?? 20,
            esClient,
            mlAnomalySearch,
            mlAnomalyDetectors,
            logger,
          });

          return response.ok({
            body: {
              entityId,
              entityType: entity?.entity?.EngineMetadata?.Type,
              anomalies,
            },
          });
        } catch (err) {
          logger.error(`[behavioral_summary] ${err}`);
          return siemResponse.error({
            statusCode: 500,
            body: err instanceof Error ? err.message : String(err),
          });
        }
      }, 'platinum')
    );
};
