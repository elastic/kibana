/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import type { Logger } from '@kbn/core/server';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';

import { SetUnifiedAlertsTagsRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertTagsArrays } from '../common/validators/validate_alert_arrays';
import { updateAlertsTags } from '../common/operations/update_alerts_tags';
import { getUnifiedAlertsIndex } from '../common/index_patterns/get_unified_alerts_index';
import { withSiemErrorHandling } from '../with_siem_error_handling';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import {
  fetchAllAlertIdIndexWithSource,
  collectChangedIdsByFamily,
} from '../common/operations/prefetch_previous_statuses';

export const setUnifiedAlertsTagsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  logger: Logger,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            { anyRequired: [ALERTS_API_ALL, ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE] },
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetUnifiedAlertsTagsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { ids, tags } = request.body;

        const validationErrors = validateAlertTagsArrays(tags, ids);
        if (validationErrors.length) {
          return buildSiemResponse(response).error({ statusCode: 400, body: validationErrors });
        }

        const index = await getUnifiedAlertsIndex({ context, ruleDataClient });

        let alertIds: string[] = [];
        let attackIds: string[] = [];

        // All length-valid tags — used for no-op detection so that tags beyond the payload cap
        // still trigger an emit when they would actually change a document.
        const allValidTagsToAdd = tags.tags_to_add.filter((t) => t.length <= MAX_TAG_LENGTH);
        const allValidTagsToRemove = tags.tags_to_remove.filter((t) => t.length <= MAX_TAG_LENGTH);
        // Payload arrays are capped to MAX_TAGS_PER_OPERATION; when the full arrays are larger
        // the mutation applied more than the event reports, so truncated is set below.
        const validTagsToAdd = allValidTagsToAdd.slice(0, MAX_TAGS_PER_OPERATION);
        const validTagsToRemove = allValidTagsToRemove.slice(0, MAX_TAGS_PER_OPERATION);
        const operationTruncated =
          allValidTagsToAdd.length > MAX_TAGS_PER_OPERATION ||
          allValidTagsToRemove.length > MAX_TAGS_PER_OPERATION;

        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            // The helper reserves one hit per index family in `index`, so an _id present
            // in several of them (detection alerts, scheduled and adhoc attack discovery)
            // is fully retrieved and cannot push another ID out of the result window.
            const hits = await fetchAllAlertIdIndexWithSource(esClient, index, ids, [
              ALERT_WORKFLOW_TAGS,
            ]);
            ({ alertIds, attackIds } = collectChangedIdsByFamily(hits, (source) => {
              const currentTags = new Set<string>(
                Array.isArray(source[ALERT_WORKFLOW_TAGS])
                  ? (source[ALERT_WORKFLOW_TAGS] as string[])
                  : []
              );
              // Use allValid* (not the capped arrays) so a tag beyond position 100 that would
              // actually change the document still triggers the event.
              return (
                allValidTagsToAdd.some((t) => !currentTags.has(t)) ||
                allValidTagsToRemove.some((t) => currentTags.has(t))
              );
            }));
          } catch {
            logger.warn('Failed to pre-fetch alert indices for workflow trigger (tags)');
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsTags({ context, index, ids, tags });
          if (eventBus) {
            if (attackIds.length > 0) {
              void eventBus.emitAttackTagsChanged(request, {
                attackIds: attackIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                tagsToAdd: validTagsToAdd,
                tagsToRemove: validTagsToRemove,
                truncated: attackIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
            if (alertIds.length > 0) {
              void eventBus.emitAlertTagsChanged(request, {
                alertIds: alertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
                tagsToAdd: validTagsToAdd,
                tagsToRemove: validTagsToRemove,
                truncated: alertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
              });
            }
          }
          return result;
        });
      }
    );
};
