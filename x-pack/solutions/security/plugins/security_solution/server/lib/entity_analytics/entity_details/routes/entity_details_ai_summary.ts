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
import { AI_SUMMARY_EVENT_ACTION } from '@kbn/entity-store/common';
import {
  capEntitySummaryContent,
  MAX_ENTITY_ID_LENGTH,
  MAX_ENTITY_TYPE_LENGTH,
  MAX_SUMMARY_HIGHLIGHT_TITLE_LENGTH,
  MAX_SUMMARY_TEXT_LENGTH,
  MAX_SUMMARY_ANOMALY_JOB_ID_LENGTH,
  MAX_SUMMARY_VARIANT_ID_LENGTH,
} from '@kbn/entity-store/common/entity_summary';
import { ENTITY_DETAILS_AI_SUMMARY_INTERNAL_URL } from '../../../../../common/entity_analytics/entity_analytics/constants';
import { APP_ID, API_VERSIONS } from '../../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { withLicense } from '../../../siem_migrations/common/api/util/with_license';
import { ENTITY_AI_SUMMARY_PERSISTED_EVENT } from '../../../telemetry/event_based/events';

const AiSummaryHighlightItem = z.object({
  title: z.string().max(MAX_SUMMARY_HIGHLIGHT_TITLE_LENGTH),
  text: z.string().max(MAX_SUMMARY_TEXT_LENGTH),
});

const EntitySummaryStalenessSnapshotSchema = z.object({
  risk_score: z.number().nullable().optional(),
});

const EntitySummaryStalenessSchema = z.object({
  enabled_signals: z.array(z.literal('risk_score')),
  snapshot: EntitySummaryStalenessSnapshotSchema,
});

const SaveAiSummaryRequestBody = z.object({
  entityId: z.string().max(MAX_ENTITY_ID_LENGTH),
  entityType: z.string().max(MAX_ENTITY_TYPE_LENGTH),
  summary: z.object({
    highlights: z.array(AiSummaryHighlightItem),
    recommended_actions: z.array(z.string().max(MAX_SUMMARY_TEXT_LENGTH)).nullable().optional(),
    generated_at: z.number(),
    // generated_by is intentionally excluded from the request body —
    // it is derived server-side from the authenticated user to prevent spoofing.
    anomaly_job_ids: z.array(z.string().max(MAX_SUMMARY_ANOMALY_JOB_ID_LENGTH)).optional(),
    variant_id: z.string().max(MAX_SUMMARY_VARIANT_ID_LENGTH).optional(),
    staleness: EntitySummaryStalenessSchema,
  }),
  // Raw counts of what the model produced, captured client-side before capping. Used only
  // for overshoot telemetry — the persisted `summary` above is already capped by the client
  // and re-capped here, so the server cannot observe overshoot on its own.
  modelOutputCounts: z
    .object({
      highlights: z.number(),
      recommendedActions: z.number(),
    })
    .optional(),
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
          const { entityId, entityType, summary, modelOutputCounts } = request.body;

          const [coreStart, { entityStore }] = await getStartServices();
          const coreContext = await context.core;
          const securitySolution = await context.securitySolution;
          const spaceId = securitySolution.getSpaceId();

          // Derive the author server-side — never trust the client-supplied value.
          const generatedBy = coreContext.security.authc.getCurrentUser()?.username ?? 'unknown';

          // Enforce the structural caps at the authoritative persistence boundary so every
          // consumer of the datastream (flyout reopen, other users, Agent Builder) sees a
          // bounded summary regardless of how much the model produced. Counts are capped
          // rather than the prose truncated, so nothing is cut mid-sentence.
          const { highlights, recommended_actions: recommendedActions } = capEntitySummaryContent({
            highlights: summary.highlights,
            recommended_actions: summary.recommended_actions,
          });

          // Write via the internal ES client so the user's own metadata index write
          // privilege is not required (access-control point from the design thread: a user
          // who can trigger generation should be able to persist, regardless of their
          // metadata-index write privilege). The summary is model-generated via the
          // assistant inference call and relayed here through the client; `generated_by` is
          // derived server-side (not trusted from the body) and item counts are capped
          // below. Reaching this route already requires the entity-analytics feature
          // privilege + Enterprise license.
          //
          // TODO(follow-up): move generation fully server-side so the content never
          // round-trips through the client. Today the LLM call runs client-side
          // (`inference.output` in the flyout hook) — an inherited pattern from the original
          // Entity Highlights feature (PR #236222 / #245532), not this feature. It stayed
          // client-side because it reuses the assistant's anonymization/replacements context,
          // which lives on the client; relocating that de-anonymization flow to the server is
          // the bulk of the work (server-side inference is otherwise the norm across Security
          // AI — Attack Discovery, Defend Insights, SIEM migrations). Doing so would let us
          // drop the client-supplied `highlights`/`recommended_actions` body entirely.
          const internalEsClient = coreStart.elasticsearch.client.asInternalUser;
          const metadataClient = entityStore.createEntityMetadataClient(internalEsClient, spaceId);

          const doc: AiSummaryMetadataDoc = {
            '@timestamp': new Date().toISOString(),
            'event.kind': 'event',
            'event.action': AI_SUMMARY_EVENT_ACTION,
            'entity.id': entityId,
            'entity.type': entityType,
            'Ai_summary.generated_by': generatedBy,
            'Ai_summary.generated_at': summary.generated_at,
            'Ai_summary.highlights': highlights,
            ...(recommendedActions != null && {
              'Ai_summary.recommended_actions': recommendedActions,
            }),
            ...(summary.anomaly_job_ids != null && {
              'Ai_summary.anomaly_job_ids': summary.anomaly_job_ids,
            }),
            ...(summary.variant_id != null && { 'Ai_summary.variant_id': summary.variant_id }),
            'Ai_summary.staleness': summary.staleness,
          };

          // A dropped doc resolves (not throws) as `failed > 0`; treat it as a hard failure so
          // we don't report success for a summary that was never written.
          const { failed } = await metadataClient.bulkAppendMetadata([doc]);
          if (failed > 0) {
            throw new Error('AI summary document was dropped from the metadata bulk write');
          }

          // Emit the model's raw (pre-cap) output sizes so we can measure how often and by how
          // much it overshoots the caps, and tune the prompt from data. These counts are
          // captured on the client before capping and passed through: the server only ever
          // sees the already-capped `summary`, so it cannot observe overshoot itself. Falls
          // back to the persisted (capped) counts if a caller omits them.
          securitySolution.getAnalytics().reportEvent(ENTITY_AI_SUMMARY_PERSISTED_EVENT.eventType, {
            entityType,
            spaceId,
            highlightsCount: modelOutputCounts?.highlights ?? highlights.length,
            recommendedActionsCount:
              modelOutputCounts?.recommendedActions ?? recommendedActions?.length ?? 0,
          });

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
