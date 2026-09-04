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
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_OPERATION,
} from '../../../../../common/workflows/triggers';
import { prefetchChangedListFieldIds } from '../common/operations/prefetch_previous_statuses';

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

        const allValidTagsToAdd = tags.tags_to_add.filter((t) => t.length <= MAX_TAG_LENGTH);
        const allValidTagsToRemove = tags.tags_to_remove.filter((t) => t.length <= MAX_TAG_LENGTH);
        const cappedTagsToAdd = allValidTagsToAdd.slice(0, MAX_TAGS_PER_OPERATION);
        const cappedTagsToRemove = allValidTagsToRemove.slice(0, MAX_TAGS_PER_OPERATION);
        const operationTruncated =
          allValidTagsToAdd.length !== tags.tags_to_add.length ||
          allValidTagsToRemove.length !== tags.tags_to_remove.length ||
          allValidTagsToAdd.length > MAX_TAGS_PER_OPERATION ||
          allValidTagsToRemove.length > MAX_TAGS_PER_OPERATION;
        // Suppress the event if the prefetch fails: the delta is unknown and emitting
        // request intent as an observed fact violates the fact-style payload contract.
        let changedAlertIds: string[] = [];
        let tagsActuallyAdded = cappedTagsToAdd;
        let tagsActuallyRemoved = cappedTagsToRemove;
        if (eventBus) {
          try {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            ({
              changedIds: changedAlertIds,
              actualAdded: tagsActuallyAdded,
              actualRemoved: tagsActuallyRemoved,
            } = await prefetchChangedListFieldIds(
              esClient,
              index,
              ids,
              ALERT_WORKFLOW_TAGS,
              tags.tags_to_add,
              tags.tags_to_remove,
              cappedTagsToAdd,
              cappedTagsToRemove
            ));
          } catch {
            // prefetch failure is non-blocking; changedAlertIds stays empty, suppressing the event
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
