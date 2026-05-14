/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import { APP_ID } from '../../../../../../common';
import { API_VERSIONS } from '../../../../../../common/entity_analytics/constants';
import type { ITelemetryEventsSender } from '../../../../telemetry/sender';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { RelationshipHistoryClient } from '../../relationship_history/relationship_history_client';

export const getRelationshipHistoryRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  telemetry: ITelemetryEventsSender,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/entity_store/entities/{entityId}/relationship_history',
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
            params: schema.object({ entityId: schema.string() }),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entityId } = request.params;
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const historyClient = new RelationshipHistoryClient(esClient, logger);
          const records = await historyClient.getHistoryForEntity(entityId);
          return response.ok({ body: { records } });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
