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
import {
  CASE_ATTACHMENT_TYPE,
  canReadSecurityCases,
  fetchEntityCaseCounts,
} from './fetch_entity_case_counts';

/** Most member ids a request lists: the cases of all of them are read in one query. */
const MAX_MEMBER_IDS = 2000;

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
                // The members of the group of an entity id, which count their cases with its own.
                member_ids: z
                  .record(z.string().max(1000), z.array(z.string().max(1000)).max(MAX_MEMBER_IDS))
                  .refine(
                    (members) =>
                      Object.keys(members).length <= 100 &&
                      Object.values(members).flat().length <= MAX_MEMBER_IDS,
                    { message: `At most ${MAX_MEMBER_IDS} member ids of at most 100 entities` }
                  )
                  .optional(),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [coreStart, { security, cases }] = await getStartServices();
          if (!cases) throw new Error('The cases plugin is not available');
          if (!(await canReadSecurityCases(security, request))) {
            return response.forbidden({
              body: { message: 'User is not authorized to read Security cases.' },
            });
          }

          const spaceId = (await context.securitySolution).getSpaceId();
          const repository = coreStart.savedObjects.createInternalRepository([
            CASE_ATTACHMENT_TYPE,
          ]);
          const counts = await fetchEntityCaseCounts(
            repository,
            await cases.getCasesClientWithRequest(request),
            spaceId,
            request.body.entity_ids,
            request.body.member_ids
          );
          return response.ok({ body: Object.fromEntries(counts) });
        } catch (err) {
          logger.error(`Failed to count cases of entities: ${err}`);
          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
