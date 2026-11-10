/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import { ENTITY_CASE_COUNTS_INTERNAL_URL } from '../../../../common/entity_analytics/entity_analytics/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { fetchEntityCaseCounts, isCasesForbiddenError } from './fetch_entity_case_counts';
import { fetchGroupMemberIds } from './fetch_group_member_ids';

export const registerEntityCaseCountsRoute = ({
  router,
  logger: rootLogger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  const logger = rootLogger.get('entityAnalytics.entityCaseCounts');
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_CASE_COUNTS_INTERNAL_URL,
      security: {
        authz: { requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`] },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(
              z.object({
                // An id is at most as long as an entity attachment's `attachmentId`.
                entity_ids: z.array(z.string().max(1000)).max(100),
                // Counts the cases of the entities resolved to each entity with its own.
                include_members: z.boolean().optional(),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [, { cases }] = await getStartServices();
          if (!cases) throw new Error('The cases plugin is not available');
          const spaceId = (await context.securitySolution).getSpaceId();
          const { entity_ids: entityIds, include_members: includeMembers } = request.body;
          const memberIds = includeMembers
            ? await fetchGroupMemberIds(
                (
                  await context.core
                ).elasticsearch.client.asCurrentUser,
                spaceId,
                entityIds
              )
            : {};
          const counts = await fetchEntityCaseCounts(
            await cases.getCasesClientWithRequest(request),
            entityIds,
            memberIds
          );
          return response.ok({ body: Object.fromEntries(counts) });
        } catch (err) {
          if (isCasesForbiddenError(err)) {
            return response.forbidden({
              body: { message: 'User is not authorized to read Security cases.' },
            });
          }
          logger.error(`Failed to count cases of entities: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
