/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTS_API_ALL,
  ALERTS_API_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import { SetAlertTagsRequestBody } from '../../../../../common/api/detection_engine/alert_tags';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_TAGS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertTagsArrays } from '../common/validators/validate_alert_arrays';
import { updateAlertsTags } from '../common/operations/update_alerts_tags';
import { withSiemErrorHandling } from '../with_siem_error_handling';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_TAGS_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import {
  fetchAllAlertIdIndexWithSource,
  computeActualDelta,
} from '../common/operations/prefetch_previous_statuses';

export const setAlertTagsRoute = (
  router: SecuritySolutionPluginRouter,
  eventBus?: SecuritySolutionEventBus
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_TAGS_URL,
      access: 'public',
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
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertTagsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { ids, tags } = request.body;

        const validationErrors = validateAlertTagsArrays(tags, ids);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        const securitySolution = await context.securitySolution;
        if (securitySolution?.getAppClient() == null) {
          return siemResponse.error({ statusCode: 404 });
        }

        const spaceId = securitySolution.getSpaceId() ?? 'default';
        const index = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

        const operationTruncated =
          tags.tags_to_add.length > MAX_TAGS_PER_OPERATION ||
          tags.tags_to_remove.length > MAX_TAGS_PER_OPERATION;

        const cappedTagsToAdd = tags.tags_to_add.slice(0, MAX_TAGS_PER_OPERATION);
        const cappedTagsToRemove = tags.tags_to_remove.slice(0, MAX_TAGS_PER_OPERATION);
        // Falls back to the full requested IDs/arrays if the prefetch fails.
        let changedAlertIds = ids;
        let tagsActuallyAdded = cappedTagsToAdd;
        let tagsActuallyRemoved = cappedTagsToRemove;
        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            const hits = await fetchAllAlertIdIndexWithSource(esClient, index, ids, [
              ALERT_WORKFLOW_TAGS,
            ]);
            // Emit only IDs whose source would actually change; unknown/no-op IDs are excluded.
            changedAlertIds = hits
              .filter((h) => {
                const current = new Set<string>(
                  Array.isArray(h.source[ALERT_WORKFLOW_TAGS])
                    ? (h.source[ALERT_WORKFLOW_TAGS] as string[])
                    : []
                );
                return (
                  cappedTagsToAdd.some((t) => !current.has(t)) ||
                  cappedTagsToRemove.some((t) => current.has(t))
                );
              })
              .map((h) => h.id);
            const delta = computeActualDelta(
              hits.map((h) => h.source),
              cappedTagsToAdd,
              cappedTagsToRemove,
              ALERT_WORKFLOW_TAGS
            );
            tagsActuallyAdded = delta.actualAdded;
            tagsActuallyRemoved = delta.actualRemoved;
          } catch {
            // prefetch failure is non-blocking; emit with requested arrays as fallback
          }
        }

        return withSiemErrorHandling(response, async () => {
          const result = await updateAlertsTags({ context, index, ids, tags });
          if (eventBus && changedAlertIds.length > 0) {
            void eventBus.emitAlertTagsChanged(request, {
              alertIds: changedAlertIds.slice(0, MAX_ALERTS_PER_TRIGGER),
              tagsAdded: tagsActuallyAdded,
              tagsRemoved: tagsActuallyRemoved,
              truncated: changedAlertIds.length > MAX_ALERTS_PER_TRIGGER || operationTruncated,
            });
          }
          return result;
        });
      }
    );
};
