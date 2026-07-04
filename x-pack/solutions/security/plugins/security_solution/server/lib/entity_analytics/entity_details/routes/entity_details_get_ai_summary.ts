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
import type {
  AiSummaryMetadataDoc,
  GetPersistedAiSummaryResponse,
  PersistedEntityAiSummary,
} from '@kbn/entity-store/common';
import {
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_TYPE_LENGTH,
} from '@kbn/entity-store/common/entity_summary';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { withLicense } from '../../../siem_migrations/common/api/util/with_license';

const GetAiSummaryRequestQuery = z.object({
  entityId: z.string().max(MAX_ENTITY_ID_LENGTH),
  // Not used server-side (the read filters by entity.id); accepted for symmetry with the write route.
  entityType: z.string().max(MAX_ENTITY_TYPE_LENGTH).optional(),
});

/** The discriminator that identifies AI-summary docs in the shared metadata datastream. */
const AI_SUMMARY_EVENT_ACTION = 'ai_summary_generated';

/**
 * Maps a raw metadata datastream doc (ai_summary.* prefixed fields) to the flat
 * shape the flyout renders. Kept here so the datastream envelope stays server-side.
 */
const toPersistedSummary = (doc: AiSummaryMetadataDoc): PersistedEntityAiSummary => ({
  highlights: doc['ai_summary.highlights'],
  recommendedActions: doc['ai_summary.recommendedActions'] ?? null,
  generated_at: doc['ai_summary.generated_at'],
  generated_by: doc['ai_summary.generated_by'],
  staleness: {
    enabled_signals: doc['ai_summary.staleness'].enabled_signals,
    snapshot: doc['ai_summary.staleness'].snapshot,
  },
  ...(doc['ai_summary.anomaly_job_ids'] != null && {
    anomaly_job_ids: doc['ai_summary.anomaly_job_ids'],
  }),
  ...(doc['ai_summary.variant_id'] != null && { variant_id: doc['ai_summary.variant_id'] }),
});

export const entityDetailsGetAiSummaryRoute = ({
  router,
  getStartServices,
  logger,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
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
            query: buildRouteValidationWithZod(GetAiSummaryRequestQuery),
          },
        },
      },
      withLicense(async (context, request, response): Promise<IKibanaResponse> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entityId } = request.query;

          const [coreStart, { entityStore }] = await getStartServices();
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();

          // Read as the current user so their own metadata-index read privilege is
          // honoured. Persistence is written by asInternalUser (see the POST route),
          // but the READ is gated on the user's access — a user without metadata read
          // gets the on-demand fallback rather than someone else's persisted summary.
          const currentUserEsClient =
            coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
          const metadataClient = entityStore.createEntityMetadataClient(
            currentUserEsClient,
            spaceId
          );

          try {
            const doc = await metadataClient.getLatestByEntityId<AiSummaryMetadataDoc>({
              entityId,
              eventAction: AI_SUMMARY_EVENT_ACTION,
            });

            const body: GetPersistedAiSummaryResponse = {
              summary: doc ? toPersistedSummary(doc) : null,
              canRead: true,
            };
            return response.ok({ body });
          } catch (readError) {
            const transformed = transformError(readError);
            // No metadata read access → graceful degradation to on-demand generation.
            if (transformed.statusCode === 403) {
              const body: GetPersistedAiSummaryResponse = { summary: null, canRead: false };
              return response.ok({ body });
            }
            throw readError;
          }
        } catch (e) {
          const error = transformError(e);
          logger.error(`[EntityAiSummary] Failed to read persisted AI summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      })
    );
};
