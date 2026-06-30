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
import type { AiSummaryMetadataDoc } from '@kbn/entity-store/common';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { withLicense } from '../../../siem_migrations/common/api/util/with_license';

const AiSummaryHighlightItem = z.object({
  title: z.string(),
  text: z.string(),
});

const EntitySummaryStalenessSnapshotSchema = z.object({
  risk_score: z.number().nullable().optional(),
});

const EntitySummaryStalenessSchema = z.object({
  enabled_signals: z.array(z.literal('risk_score')),
  snapshot: EntitySummaryStalenessSnapshotSchema,
});

const SaveAiSummaryRequestBody = z.object({
  entityId: z.string(),
  entityType: z.string(),
  summary: z.object({
    highlights: z.array(AiSummaryHighlightItem),
    recommendedActions: z.array(z.string()).nullable().optional(),
    generated_at: z.number(),
    // generated_by is intentionally excluded from the request body —
    // it is derived server-side from the authenticated user to prevent spoofing.
    anomaly_job_ids: z.array(z.string()).optional(),
    variant_id: z.string().optional(),
    staleness: EntitySummaryStalenessSchema,
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
          const spaceId = securitySolution.getSpaceId();

          // Derive the author server-side — never trust the client-supplied value.
          const generatedBy =
            coreContext.security.authc.getCurrentUser()?.username ?? 'unknown';

          // Write via the internal ES client so the user's own metadata index write
          // privilege is not required. Generation is fully backend-produced; the user
          // cannot supply arbitrary content through this route.
          const internalEsClient = coreStart.elasticsearch.client.asInternalUser;
          const metadataClient = entityStore.createEntityMetadataClient(
            internalEsClient,
            spaceId
          );

          const doc: AiSummaryMetadataDoc = {
            '@timestamp': new Date().toISOString(),
            'event.kind': 'event',
            'event.action': 'ai_summary_generated',
            'entity.id': entityId,
            'entity.type': entityType,
            'ai_summary.generated_by': generatedBy,
            'ai_summary.generated_at': summary.generated_at,
            'ai_summary.highlights': summary.highlights,
            ...(summary.recommendedActions != null && {
              'ai_summary.recommendedActions': summary.recommendedActions,
            }),
            ...(summary.anomaly_job_ids != null && {
              'ai_summary.anomaly_job_ids': summary.anomaly_job_ids,
            }),
            ...(summary.variant_id != null && { 'ai_summary.variant_id': summary.variant_id }),
            'ai_summary.staleness': summary.staleness,
          };

          await metadataClient.bulkAppendMetadata([doc]);

          return response.ok({ body: { created: true } });
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
