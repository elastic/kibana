/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { EntityType } from '@kbn/entity-store/common';
import type { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { withLicense } from '../../../siem_migrations/common/api/util/with_license';

const AiSummaryHighlightItem = z.object({
  title: z.string(),
  text: z.string(),
});

const SaveAiSummaryRequestBody = z.object({
  entityId: z.string(),
  entityType: EntityType,
  summary: z.object({
    highlights: z.array(AiSummaryHighlightItem),
    recommendedActions: z.array(z.string()).nullable().optional(),
    generated_at: z.number(),
    // generated_by is intentionally excluded from the request body —
    // it is derived server-side from the authenticated user to prevent spoofing.
    risk_level_at_generation: z.string().nullable().optional(),
    anomaly_job_ids_at_generation: z.array(z.string()).nullable().optional(),
    rule_names_at_generation: z.array(z.string()).nullable().optional(),
  }),
});

type SaveAiSummaryRequestBody = z.infer<typeof SaveAiSummaryRequestBody>;

export const entityDetailsAiSummaryRoute = ({
  router,
  getStartServices,
  logger,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL,
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
            body: buildRouteValidationWithZod(SaveAiSummaryRequestBody),
          },
        },
      },
      withLicense(async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entityId, entityType, summary } = request.body;

          const [coreStart, { entityStore }] = await getStartServices();
          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const spaceId = securitySolution.getSpaceId();

          // Derive the author server-side — never trust the client-supplied value.
          const generatedBy =
            coreContext.security.authc.getCurrentUser()?.username ?? 'unknown';

          const crudClient = entityStore.createCRUDClient(esClient, spaceId);

          // force=true bypasses field-level validation — required because
          // entity.attributes.summary is not in getEntityFieldsDescriptions()
          // (it is a purely API-written field, never present in source logs).
          await crudClient.updateEntity(
            entityType,
            {
              entity: {
                id: entityId,
                attributes: {
                  summary: { ...summary, generated_by: generatedBy },
                },
              },
            } as Entity,
            true
          );

          return response.ok({ body: { updated: true } });
        } catch (e) {
          const error = transformError(e);
          logger.error(`[EntityAiSummary] Failed to persist AI summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      })
    );
};
